<?php
declare(strict_types=1);

require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/migrate.php';

/**
 * Shared plumbing for the JSON endpoints.
 *
 * Every endpoint checks the session and the caller's role on the server. The
 * browser hiding a button is a convenience, not a control — requests arrive
 * however the caller chooses to send them.
 */

function json_out(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400, array $extra = []): never
{
    json_out(['error' => $message] + $extra, $status);
}

/** Reads a JSON request body, falling back to form-encoded input. */
function json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST;
}

/**
 * Guards a state-changing endpoint: correct method, valid CSRF token, signed
 * in, and permitted. Returns the acting user.
 */
function api_guard(string $ability, bool $writes = false): array
{
    session_start_secure();

    if ($writes) {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_error('Method not allowed', 405);
        }
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? null);
        if (!csrf_valid(is_string($token) ? $token : null)) {
            json_error('Session expired. Reload the page and try again.', 419);
        }
    }

    $user = current_user();
    if ($user === null) {
        json_error('Not signed in', 401);
    }

    // Bring the schema up to date here rather than relying on someone loading
    // a particular page. Every endpoint in the panel comes through this, so a
    // deploy that adds a column has it created by the first action taken after
    // it, whatever that action is.
    migrate_if_needed();

    if (!role_can((string) $user['role_slug'], $ability)) {
        audit_log('permission_denied', 'api', null, null, null, null, $ability,
            (int) $user['id'], $user['name']);
        json_error('You do not have permission to do that.', 403);
    }
    return $user;
}

// ------------------------------------------------------------ validation --

/**
 * Validation that returns every problem at once rather than stopping at the
 * first, so a form can show all of its errors in one pass.
 */
final class Validator
{
    private array $errors = [];
    private array $clean  = [];

    public function __construct(private array $input) {}

    public function required(string $field, string $label): self
    {
        $value = trim((string) ($this->input[$field] ?? ''));
        if ($value === '') {
            $this->errors[$field] = "{$label} is required.";
        } else {
            $this->clean[$field] = $value;
        }
        return $this;
    }

    public function optional(string $field, ?int $maxLength = null): self
    {
        $value = trim((string) ($this->input[$field] ?? ''));
        $this->clean[$field] = $value === '' ? null
            : ($maxLength !== null ? mb_substr($value, 0, $maxLength) : $value);
        return $this;
    }

    public function money(string $field, string $label, bool $required = true): self
    {
        $raw = $this->input[$field] ?? null;
        if ($raw === null || $raw === '') {
            if ($required) {
                $this->errors[$field] = "{$label} is required.";
            } else {
                $this->clean[$field] = null;
            }
            return $this;
        }
        if (!is_numeric($raw)) {
            $this->errors[$field] = "{$label} must be a number.";
            return $this;
        }
        $value = round((float) $raw, 2);
        if ($value < 0) {
            $this->errors[$field] = "{$label} cannot be negative.";
            return $this;
        }
        if ($value > 99999999.99) {
            $this->errors[$field] = "{$label} is unrealistically large.";
            return $this;
        }
        // Kept as a string so it reaches DECIMAL without a float round-trip.
        $this->clean[$field] = number_format($value, 2, '.', '');
        return $this;
    }

    public function integer(string $field, string $label, int $min = 0, ?int $max = null, bool $required = true): self
    {
        $raw = $this->input[$field] ?? null;
        if ($raw === null || $raw === '') {
            if ($required) {
                $this->errors[$field] = "{$label} is required.";
            } else {
                $this->clean[$field] = null;
            }
            return $this;
        }
        if (!is_numeric($raw) || (int) $raw != $raw) {
            $this->errors[$field] = "{$label} must be a whole number.";
            return $this;
        }
        $value = (int) $raw;
        if ($value < $min) {
            $this->errors[$field] = "{$label} cannot be less than {$min}.";
        } elseif ($max !== null && $value > $max) {
            $this->errors[$field] = "{$label} cannot be more than {$max}.";
        } else {
            $this->clean[$field] = $value;
        }
        return $this;
    }

    public function inList(string $field, string $label, array $allowed, bool $required = true): self
    {
        $value = trim((string) ($this->input[$field] ?? ''));
        if ($value === '') {
            if ($required) {
                $this->errors[$field] = "{$label} is required.";
            } else {
                $this->clean[$field] = null;
            }
            return $this;
        }
        if (!in_array($value, $allowed, true)) {
            $this->errors[$field] = "{$label} is not a recognised value.";
            return $this;
        }
        $this->clean[$field] = $value;
        return $this;
    }

    public function hexColour(string $field, string $label): self
    {
        $value = trim((string) ($this->input[$field] ?? ''));
        if ($value === '') {
            $this->clean[$field] = '#5B6472';
            return $this;
        }
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
            $this->errors[$field] = "{$label} must be a colour like #5B6472.";
            return $this;
        }
        $this->clean[$field] = strtoupper($value);
        return $this;
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    public function errors(): array
    {
        return $this->errors;
    }

    public function clean(): array
    {
        return $this->clean;
    }

    /** Ends the request with a 422 and every field error, if any failed. */
    public function orFail(): array
    {
        if ($this->fails()) {
            json_error('Please correct the highlighted fields.', 422, ['fields' => $this->errors]);
        }
        return $this->clean;
    }
}
