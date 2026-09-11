#!/usr/bin/env bash
#
# A local copy of the panel to click through and point the tests at.
#
#   bash tools/test-site.sh          start it (setting it up the first time)
#   bash tools/test-site.sh reset    throw the data away and seed it again
#   bash tools/test-site.sh test     reseed, then run every suite against it
#   bash tools/test-site.sh stop     stop the server
#   bash tools/test-site.sh status   is it running, and on what
#
# It never reads or writes config.php. The test instance keeps its own
# settings in tools/.test-site/config.php and is handed to the panel through
# NITESHA_CONFIG, so nothing here can reach the live database.

set -euo pipefail

ADMIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ADMIN_DIR/tools/.test-site"
CONFIG="$RUN_DIR/config.php"
PID_FILE="$RUN_DIR/php-server.pid"
LOG_FILE="$RUN_DIR/php-server.log"

PORT="${TEST_PORT:-8080}"
HOST="${TEST_HOST:-127.0.0.1}"
DB_NAME="${TEST_DB:-niteshacars_test}"
DB_USER="${TEST_DB_USER:-nitesha_test}"
DB_PASS="${TEST_DB_PASS:-nitesha_test_pw}"

ADMIN_EMAIL="${TEST_ADMIN_EMAIL:-admin@niteshacars.test}"
ADMIN_PASS="${TEST_ADMIN_PASSWORD:-TestAdmin2026!}"

say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die()  { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- database --

# Prefers mysql/mariadb over the socket as the system user, which is how a
# freshly installed MariaDB lets root in. MYSQL_ROOT_PASSWORD covers the
# installs that want a password instead.
db_root() {
    if [ -n "${MYSQL_ROOT_PASSWORD:-}" ]; then
        mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$@"
    else
        mysql -u root "$@"
    fi
}

db_test() { mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" "$@"; }

ensure_server() {
    command -v mysql >/dev/null 2>&1 || die \
"No MySQL client found. Install a server first:
    Debian/Ubuntu   sudo apt-get install -y mariadb-server
    macOS           brew install mariadb && brew services start mariadb"

    if mysqladmin ping >/dev/null 2>&1; then
        return
    fi

    step "Starting MariaDB"
    mkdir -p /var/run/mysqld 2>/dev/null && chown mysql:mysql /var/run/mysqld 2>/dev/null || true
    if command -v mysqld_safe >/dev/null 2>&1; then
        nohup mysqld_safe --skip-syslog >"$RUN_DIR/mysqld.log" 2>&1 &
    else
        die "MariaDB is installed but not running, and mysqld_safe was not found. Start it however your system does, then run this again."
    fi

    for _ in $(seq 1 30); do
        mysqladmin ping >/dev/null 2>&1 && { say "  up"; return; }
        sleep 1
    done
    die "MariaDB did not come up. See $RUN_DIR/mysqld.log"
}

ensure_account() {
    db_root <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
}

drop_database() {
    db_root -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;"
}

# Applies sql/*.sql in filename order and records each, the same way
# install.php's migrate() does, so a later migration file lands here too.
migrate() {
    step "Loading the schema"
    db_test <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(190) NOT NULL PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL

    local file name
    for file in "$ADMIN_DIR"/sql/*.sql; do
        name="$(basename "$file")"
        if [ -n "$(db_test -N -B -e "SELECT filename FROM schema_migrations WHERE filename = '$name'")" ]; then
            say "  $name — already applied"
            continue
        fi
        db_test < "$file"
        db_test -e "INSERT INTO schema_migrations (filename) VALUES ('$name')"
        say "  $name"
    done
}

installed() {
    [ -n "$(db_test -N -B -e "SHOW TABLES LIKE 'users'" 2>/dev/null || true)" ] \
    && [ "$(db_test -N -B -e 'SELECT COUNT(*) FROM users' 2>/dev/null || echo 0)" -gt 0 ]
}

write_config() {
    mkdir -p "$RUN_DIR/storage"
    cat > "$CONFIG" <<PHP
<?php
// Written by tools/test-site.sh. This is the local test instance only —
// the live panel reads config.php beside install.php and never this file.

return [
    'db' => [
        'host'     => '127.0.0.1',
        'name'     => '$DB_NAME',
        'user'     => '$DB_USER',
        'password' => '$DB_PASS',
        'charset'  => 'utf8mb4',
    ],
    'storage_path' => __DIR__ . '/storage',

    // The enquiry endpoint's origin allowlist. The test site's own address
    // is what lets tools/test-enquiry-form.html post to it; the live names
    // are here because tools/test-enquiries.sh checks that a post from the
    // real site is accepted, and it has to have something to accept.
    'public_site_origin' => [
        'http://$HOST:$PORT',
        'http://localhost:$PORT',
        'https://niteshacars.in',
        'https://www.niteshacars.in',
    ],

    // Plain HTTP locally, so the session cookie must not be Secure-only or
    // the browser would drop it and sign-in would never stick.
    'https_only' => false,
    'session_idle_minutes' => 120,
];
PHP
}

# ------------------------------------------------------------------ server --

server_pid() {
    [ -f "$PID_FILE" ] || return 1
    local pid; pid="$(cat "$PID_FILE")"
    kill -0 "$pid" 2>/dev/null || return 1
    printf '%s' "$pid"
}

stop_server() {
    local pid
    if pid="$(server_pid)"; then
        kill "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
        say "Stopped the test site (pid $pid)."
    else
        rm -f "$PID_FILE"
        say "The test site was not running."
    fi
}

start_server() {
    if server_pid >/dev/null; then
        say "Already running on http://$HOST:$PORT — restarting it."
        stop_server
    fi

    NITESHA_CONFIG="$CONFIG" nohup php -S "$HOST:$PORT" \
        -t "$ADMIN_DIR" "$ADMIN_DIR/tools/test-router.php" >"$LOG_FILE" 2>&1 &
    printf '%s' "$!" > "$PID_FILE"

    for _ in $(seq 1 20); do
        if curl -fsS -o /dev/null "http://$HOST:$PORT/" 2>/dev/null; then
            return
        fi
        sleep 0.5
    done
    die "The server did not answer on http://$HOST:$PORT. See $LOG_FILE"
}

# ------------------------------------------------------------------- suites --

# Runs everything the README lists, against this instance. NITESHA_CONFIG is
# exported for all of it: some suites shell out to the PHP tools beside them
# (clear-enquiry-throttle.php among them), and without it those would read
# config.php and quietly work on the live database instead.
run_suites() {
    export NITESHA_CONFIG="$CONFIG"

    local failed=0 name
    local -a php_suites=(test-money.php)
    local -a sh_suites=(test-api.sh test-bookings.sh test-ledger.sh test-enquiries.sh test-expenses.sh)
    local -a js_suites=(test-ui.js test-booking-ui.js test-enquiry-ui.js test-finance-ui.js)

    for name in "${php_suites[@]}"; do
        step "php tools/$name"
        php "$ADMIN_DIR/tools/$name" || failed=$((failed + 1))
    done

    step "php tools/test-auth.php"
    php "$ADMIN_DIR/tools/test-auth.php" \
        "mysql:host=127.0.0.1;dbname=$DB_NAME;charset=utf8mb4" "$DB_USER" "$DB_PASS" \
        || failed=$((failed + 1))

    for name in "${sh_suites[@]}"; do
        step "bash tools/$name"
        bash "$ADMIN_DIR/tools/$name" "http://$HOST:$PORT" "$ADMIN_EMAIL" "$ADMIN_PASS" \
            || failed=$((failed + 1))
    done

    for name in "${js_suites[@]}"; do
        step "node tools/$name"
        node "$ADMIN_DIR/tools/$name" "http://$HOST:$PORT" "$ADMIN_EMAIL" "$ADMIN_PASS"
        local status=$?
        # 2 is the resolver saying Playwright is not installed. That is a
        # missing tool, not a failing panel, and should not read as one.
        if [ $status -eq 2 ]; then
            say "  skipped — Playwright is not installed"
        elif [ $status -ne 0 ]; then
            failed=$((failed + 1))
        fi
    done

    step "the installer, from a blank slate"
    run_install_suite || failed=$((failed + 1))

    echo
    if [ $failed -eq 0 ]; then
        say "All suites passed."
    else
        die "$failed suite(s) reported a failure."
    fi
}

# Drives install.php from a blank slate, which it can only do on a database
# with nothing in it and a settings file that does not exist yet. Both are
# throwaway, and NITESHA_CONFIG keeps the installer's write off config.php.
run_install_suite() {
    local port=$((PORT + 1))
    local config="$RUN_DIR/install-config.php"
    local pid_file="$RUN_DIR/install-server.pid"
    local db="${TEST_INSTALL_DB:-nitesha_install}"

    step "Preparing a blank install target"
    # The installer's form has a password field the suite leaves empty, so the
    # account it signs in with has to have no password. It reaches only the
    # throwaway database below, which is dropped either side of the run.
    db_root <<SQL
DROP DATABASE IF EXISTS \`$db\`;
CREATE DATABASE \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$db'@'localhost' IDENTIFIED BY '';
ALTER USER '$db'@'localhost' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON \`$db\`.* TO '$db'@'localhost';
FLUSH PRIVILEGES;
SQL
    rm -f "$config"

    NITESHA_CONFIG="$config" nohup php -S "$HOST:$port" \
        -t "$ADMIN_DIR" "$ADMIN_DIR/tools/test-router.php" \
        >"$RUN_DIR/install-server.log" 2>&1 &
    printf '%s' "$!" > "$pid_file"
    sleep 1

    step "node tools/test-install-ui.js"
    node "$ADMIN_DIR/tools/test-install-ui.js" "http://$HOST:$port" "$db" "$db"
    local status=$?

    kill "$(cat "$pid_file")" 2>/dev/null || true
    rm -f "$pid_file" "$config"
    db_root -e "DROP DATABASE IF EXISTS \`$db\`;"

    if [ $status -eq 2 ]; then
        say "  skipped — Playwright is not installed"
        return 0
    fi
    return $status
}

banner() {
    cat <<TXT

  ─────────────────────────────────────────────
   NiteSha Cars — test site

   Panel      http://$HOST:$PORT/
   Sign in    $ADMIN_EMAIL
              $ADMIN_PASS

   Enquiry form (what the public site posts)
              http://$HOST:$PORT/tools/test-enquiry-form.html

   Database   $DB_NAME
   Log        $LOG_FILE
  ─────────────────────────────────────────────

  Run every suite against it:

    bash tools/test-site.sh test

  Or one at a time (export NITESHA_CONFIG first — the suites shell out to
  the PHP tools beside them, which would otherwise read config.php):

    export NITESHA_CONFIG=$CONFIG

    php  tools/test-money.php
    php  tools/test-auth.php 'mysql:host=127.0.0.1;dbname=$DB_NAME;charset=utf8mb4' '$DB_USER' '$DB_PASS'
    bash tools/test-api.sh       http://$HOST:$PORT '$ADMIN_EMAIL' '$ADMIN_PASS'
    bash tools/test-bookings.sh  http://$HOST:$PORT '$ADMIN_EMAIL' '$ADMIN_PASS'
    bash tools/test-ledger.sh    http://$HOST:$PORT '$ADMIN_EMAIL' '$ADMIN_PASS'
    bash tools/test-enquiries.sh http://$HOST:$PORT '$ADMIN_EMAIL' '$ADMIN_PASS'
    bash tools/test-expenses.sh  http://$HOST:$PORT '$ADMIN_EMAIL' '$ADMIN_PASS'
    node tools/test-ui.js        http://$HOST:$PORT '$ADMIN_EMAIL' '$ADMIN_PASS'

  Stop it with:  bash tools/test-site.sh stop

TXT
}

# ------------------------------------------------------------------- main --

mkdir -p "$RUN_DIR"
command -v php >/dev/null 2>&1 || die "PHP is not installed."

case "${1:-start}" in
    stop)
        stop_server
        ;;

    status)
        if pid="$(server_pid)"; then
            say "Running on http://$HOST:$PORT (pid $pid)."
        else
            say "Not running."
        fi
        ;;

    test|reset|start)
        ensure_server

        # The suites assume they are the only thing writing, and a couple of
        # them are not repeatable against data they have already changed, so a
        # test run always starts from a freshly seeded database.
        if [ "${1:-start}" = "test" ] || [ "${1:-start}" = "reset" ]; then
            step "Dropping $DB_NAME"
            stop_server >/dev/null 2>&1 || true
            drop_database
        fi

        ensure_account
        write_config
        migrate

        if installed && [ "${1:-start}" = "start" ]; then
            say ""
            say "Data is already there — leaving it alone. Use 'reset' to start over."
        else
            step "Seeding demo data"
            NITESHA_CONFIG="$CONFIG" php "$ADMIN_DIR/tools/seed-test-data.php" \
                "$ADMIN_EMAIL" "$ADMIN_PASS"
        fi

        step "Starting the panel"
        start_server

        if [ "${1:-start}" = "test" ]; then
            run_suites
        else
            banner
        fi
        ;;

    *)
        die "Unknown command: $1. Use start, test, reset, stop or status."
        ;;
esac
