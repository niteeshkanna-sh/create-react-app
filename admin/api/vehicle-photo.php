<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/http.php';
require_once __DIR__ . '/../src/vehicle-photos.php';

/**
 * Uploading and removing a vehicle's photograph.
 *
 * Separate from vehicles.php because this one takes multipart form data rather
 * than JSON, and folding a file upload into an endpoint that parses a JSON body
 * would mean the body being read two different ways depending on the request.
 *
 * Same guard as every other write: signed in, permitted, POST, CSRF token.
 * api_guard reads the token from X-CSRF-Token or a csrf_token field, and a
 * multipart form can carry either.
 */

$user = api_guard('vehicle.edit', true);

$vehicleId = (int) ($_POST['vehicle_id'] ?? 0);
if ($vehicleId <= 0) {
    json_error('Which vehicle this belongs to was not sent.', 422);
}

// A clear sentence rather than a SQL error, for the window between a deploy
// adding the column and the migration that creates it having run. Loading the
// dashboard applies it, which is what the message says to do.
if (!table_has_column('vehicles', 'photo_file')) {
    json_error('The database has not been updated for photographs yet. '
             . 'Open the Dashboard tab once and try again.', 503);
}

$vehicle = fetch_one('SELECT id, name, photo_file FROM vehicles WHERE id = ?', [$vehicleId]);
if ($vehicle === null) {
    json_error('That vehicle no longer exists.', 404);
}

$previous = $vehicle['photo_file'] !== null ? (string) $vehicle['photo_file'] : null;

// ------------------------------------------------------------- removal --
if (($_POST['remove'] ?? '') === '1') {
    query('UPDATE vehicles SET photo_file = NULL WHERE id = ?', [$vehicleId]);
    vehicle_photo_delete($previous);

    audit_log('vehicle_photo_removed', 'vehicles', 'vehicle', $vehicleId,
        ['photo_file' => $previous], ['photo_file' => null], null,
        (int) $user['id'], $user['name'], null, null, $vehicleId);

    json_out(['ok' => true, 'photo' => null]);
}

// -------------------------------------------------------------- upload --
$file = $_FILES['photo'] ?? null;
if (!is_array($file)) {
    json_error('No image was attached.', 422);
}

[$extension, $problem] = vehicle_photo_check($file);
if ($problem !== null) {
    json_error($problem, 422);
}

try {
    $stored = vehicle_photo_store($vehicleId, $file, (string) $extension);
} catch (RuntimeException $e) {
    error_log('vehicle photo store failed: ' . $e->getMessage());
    json_error('The image could not be saved on the server.', 500);
}

query('UPDATE vehicles SET photo_file = ? WHERE id = ?', [$stored, $vehicleId]);

// Only after the row points at the new file. The other order would leave a
// vehicle pointing at a file that had just been deleted if the update failed.
vehicle_photo_delete($previous);

audit_log('vehicle_photo_changed', 'vehicles', 'vehicle', $vehicleId,
    ['photo_file' => $previous], ['photo_file' => $stored], null,
    (int) $user['id'], $user['name'], null, null, $vehicleId);

json_out(['ok' => true, 'photo' => vehicle_photo_url($stored)]);
