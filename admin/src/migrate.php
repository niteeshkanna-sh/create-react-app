<?php
declare(strict_types=1);

/**
 * Applying the files in sql/.
 *
 * This used to live inside install.php, which refuses to run once an account
 * exists -- correctly, since otherwise the file would hand the panel to
 * whoever found it. The side effect was that a migration added after setup had
 * no way of reaching an installed site at all.
 *
 * Kept here so the installer and the signed-in admin can both run it, against
 * one definition rather than two that drift.
 */

require_once __DIR__ . '/db.php';


/**
 * Applies the files in sql/ in order, once each. Which have run is recorded in
 * the database rather than assumed, so re-running the installer on a database
 * that is already half set up does not fail on tables that exist.
 */
function migrate(): array
{
    query('CREATE TABLE IF NOT EXISTS schema_migrations (
             filename   VARCHAR(190) NOT NULL PRIMARY KEY,
             applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

    $already = array_column(fetch_all('SELECT filename FROM schema_migrations'), 'filename');

    $files = glob(dirname(__DIR__) . '/sql/*.sql') ?: [];
    sort($files);

    $applied = [];
    foreach ($files as $file) {
        $name = basename($file);
        if (in_array($name, $already, true)) {
            continue;
        }
        foreach (sql_statements((string) file_get_contents($file)) as $statement) {
            db_handle()->exec($statement);
        }
        query('INSERT INTO schema_migrations (filename) VALUES (?)', [$name]);
        $applied[] = $name;
    }
    return $applied;
}

/**
 * Splits a file into statements on semicolons that are not inside a string or
 * a comment. Naive splitting on ";" would cut a statement in half the first
 * time one appears inside quoted text.
 */
function sql_statements(string $sql): array
{
    $statements = [];
    $current    = '';
    $quote      = null;
    $length     = strlen($sql);

    for ($i = 0; $i < $length; $i++) {
        $char = $sql[$i];
        $next = $sql[$i + 1] ?? '';

        if ($quote === null && $char === '-' && $next === '-') {
            $end = strpos($sql, "\n", $i);
            $i   = $end === false ? $length : $end;
            continue;
        }
        if ($quote === null && $char === '/' && $next === '*') {
            $end = strpos($sql, '*/', $i);
            $i   = $end === false ? $length : $end + 1;
            continue;
        }
        if ($quote !== null && $char === '\\') {
            $current .= $char . $next;
            $i++;
            continue;
        }
        if ($quote === null && ($char === "'" || $char === '"' || $char === '`')) {
            $quote = $char;
        } elseif ($quote === $char) {
            $quote = null;
        }
        if ($quote === null && $char === ';') {
            if (trim($current) !== '') {
                $statements[] = trim($current);
            }
            $current = '';
            continue;
        }
        $current .= $char;
    }
    if (trim($current) !== '') {
        $statements[] = trim($current);
    }
    return $statements;
}
