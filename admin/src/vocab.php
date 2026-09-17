<?php
declare(strict_types=1);

/**
 * The values a vehicle may have, in one place.
 *
 * These existed three times: as an ENUM in the schema, as constants the API
 * validates against, and as hand-written <option> tags in the form. The form's
 * copy had fallen behind -- it offered Hatchback, Sedan and SUV, while the
 * database and the API both accepted MUV and Other as well. So a seven-seater
 * could not be recorded as one, and an Innova is currently filed as a
 * hatchback on the live site.
 *
 * Nothing warned about it. The form simply did not offer the choice, and a
 * choice you are not offered is not a bug anyone reports.
 *
 * The form now renders from here, and the API validates against here. The
 * schema's ENUM is still its own declaration -- changing these means a
 * migration -- but two of the three copies are now one.
 */

const BODY_TYPES       = ['Hatchback', 'Sedan', 'SUV', 'MUV', 'Other'];
const FUEL_TYPES       = ['Petrol', 'Diesel', 'Electric', 'CNG'];
const TRANSMISSIONS    = ['Manual', 'Automatic'];
const VEHICLE_STATUSES = ['Available', 'Booked', 'On Rental', 'Maintenance', 'Inactive'];

/** <option> tags for a select, with one marked selected. */
function options_for(array $values, ?string $selected = null): string
{
    $html = '';
    foreach ($values as $value) {
        $html .= '<option value="' . htmlspecialchars($value, ENT_QUOTES, 'UTF-8') . '"'
               . ($value === $selected ? ' selected' : '') . '>'
               . htmlspecialchars($value, ENT_QUOTES, 'UTF-8') . '</option>';
    }
    return $html;
}
