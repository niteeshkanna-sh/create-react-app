<?php
declare(strict_types=1);

/**
 * Database access.
 *
 * One PDO connection per request, configured to throw on error and to use
 * real prepared statements rather than emulated ones — emulation builds the
 * query string client-side, which is where escaping bugs turn into injection.
 */

/** Lets tests (and the CLI tools) supply configuration without a config.php. */
function config_set(array $values): void
{
    $GLOBALS['__config_override'] = $values;
}

function config(?string $key = null): mixed
{
    static $config = null;

    if (isset($GLOBALS['__config_override'])) {
        $config = $GLOBALS['__config_override'];
    }

    if ($config === null) {
        $path = __DIR__ . '/../config.php';
        if (!is_file($path)) {
            http_response_code(500);
            exit('Not set up yet. Open install.php in your browser to get started.');
        }
        $config = require $path;
    }

    if ($key === null) {
        return $config;
    }

    // Supports dotted lookups such as config('db.host').
    $value = $config;
    foreach (explode('.', $key) as $segment) {
        if (!is_array($value) || !array_key_exists($segment, $value)) {
            return null;
        }
        $value = $value[$segment];
    }
    return $value;
}

/**
 * Opens a connection and lets the caller deal with failure. The installer
 * needs that: someone mistyping a database password there is making an
 * ordinary correction, not hitting a server error.
 */
function db_connect(array $db): PDO
{
    // A socket beats a host when one is configured — some hosts (and local
    // test setups) only accept socket connections.
    $dsn = isset($db['unix_socket']) && $db['unix_socket'] !== ''
        ? sprintf('mysql:unix_socket=%s;dbname=%s;charset=%s',
            $db['unix_socket'], $db['name'], $db['charset'] ?? 'utf8mb4')
        : sprintf('mysql:host=%s;dbname=%s;charset=%s',
            $db['host'] ?? 'localhost', $db['name'], $db['charset'] ?? 'utf8mb4');

    return new PDO($dsn, $db['user'] ?? '', $db['password'] ?? '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    try {
        $pdo = db_connect((array) config('db'));
    } catch (PDOException $e) {
        // The exception message can contain the DSN and username; log it, but
        // never show it to the browser.
        error_log('DB connection failed: ' . $e->getMessage());
        http_response_code(500);
        exit('Database unavailable.');
    }

    return $pdo;
}

/**
 * Lets tests run against their own connection without a config.php.
 * Every helper below reads this override first, falling back to db().
 */
function db_set(PDO $pdo): void
{
    $GLOBALS['__db_override'] = $pdo;
}

function db_handle(): PDO
{
    return $GLOBALS['__db_override'] ?? db();
}

function query(string $sql, array $params = []): PDOStatement
{
    $stmt = db_handle()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function fetch_one(string $sql, array $params = []): ?array
{
    $row = query($sql, $params)->fetch();
    return $row === false ? null : $row;
}

function fetch_all(string $sql, array $params = []): array
{
    return query($sql, $params)->fetchAll();
}

function last_insert_id(): int
{
    return (int) db_handle()->lastInsertId();
}

function transaction(callable $work): mixed
{
    $pdo = db_handle();
    $pdo->beginTransaction();
    try {
        $result = $work();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Allocates the next sequential document number, e.g. NSC-2026-0001.
 *
 * Uses a locking read inside the caller's transaction so two saves landing at
 * the same moment cannot be handed the same number — a plain SELECT MAX()
 * would let both read the same value before either wrote.
 */
function next_number(string $prefix, ?int $year = null): string
{
    $year ??= (int) date('Y');
    $pdo = db_handle();

    $ownTransaction = !$pdo->inTransaction();
    if ($ownTransaction) {
        $pdo->beginTransaction();
    }

    try {
        query(
            'INSERT INTO number_sequences (prefix, year, last_value) VALUES (?, ?, 0)
             ON DUPLICATE KEY UPDATE last_value = last_value',
            [$prefix, $year]
        );
        $row = fetch_one(
            'SELECT last_value FROM number_sequences WHERE prefix = ? AND year = ? FOR UPDATE',
            [$prefix, $year]
        );
        $next = ((int) ($row['last_value'] ?? 0)) + 1;
        query(
            'UPDATE number_sequences SET last_value = ? WHERE prefix = ? AND year = ?',
            [$next, $prefix, $year]
        );

        if ($ownTransaction) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($ownTransaction && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return sprintf('%s-%d-%04d', $prefix, $year, $next);
}
