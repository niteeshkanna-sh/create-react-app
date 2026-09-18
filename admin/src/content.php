<?php
declare(strict_types=1);

/**
 * Editable page content.
 *
 * The database stores overrides only. Every section has a default shipped with
 * the site, and a section nobody has edited has no row at all -- so the table
 * starts empty, "reset to default" is a DELETE, and the public site still
 * builds when this server cannot be reached.
 *
 * content-defaults.json is a copy of my-app/src/content/defaults.json. The
 * site build refuses to run if the two differ, so the copy cannot drift
 * quietly; it exists because this server never receives the site's repository.
 */

require_once __DIR__ . '/db.php';

/**
 * Describes what is editable, and how to render a field for it.
 *
 * Kept as a declaration rather than a hand-written form so that adding a field
 * is one entry here, not an edit in the form, the save handler and the
 * validator -- three places that drift apart the first time someone is in a
 * hurry.
 *
 * Types: text, textarea, list (lines of text), repeater (repeated group).
 */
function content_schema(): array
{
    return [
        'home' => [
            'label'    => 'Home page',
            'sections' => [
                'hero' => [
                    'label'  => 'Hero',
                    'note'   => 'The first thing a visitor reads. The accent line is the gold one.',
                    'fields' => [
                        'eyebrow'        => ['label' => 'Eyebrow', 'type' => 'text'],
                        'headingLead'    => ['label' => 'Heading', 'type' => 'text'],
                        'headingAccent'  => ['label' => 'Heading, gold line', 'type' => 'text'],
                        'tagline'        => ['label' => 'Tagline', 'type' => 'text'],
                        'intro'          => ['label' => 'Intro paragraph', 'type' => 'textarea'],
                        'primaryLabel'   => ['label' => 'Main button', 'type' => 'text'],
                        'primaryHref'    => ['label' => 'Main button link', 'type' => 'text'],
                        'secondaryLabel' => ['label' => 'Second button', 'type' => 'text'],
                        'secondaryHref'  => ['label' => 'Second button link', 'type' => 'text'],
                        'points'         => ['label' => 'Tick points', 'type' => 'list'],
                    ],
                ],
                'services' => [
                    'label'  => 'What we hire',
                    'fields' => [
                        'heading' => ['label' => 'Heading', 'type' => 'text'],
                        'items'   => [
                            'label'  => 'Services',
                            'type'   => 'repeater',
                            'fields' => [
                                'title' => ['label' => 'Title', 'type' => 'text'],
                                'body'  => ['label' => 'Description', 'type' => 'textarea'],
                                'to'    => ['label' => 'Links to', 'type' => 'text'],
                            ],
                        ],
                    ],
                ],
                'highlights' => [
                    'label'  => 'Highlight bands',
                    'note'   => 'The three dark bands for the bookings worth the most.',
                    'fields' => [
                        'items' => [
                            'label'  => 'Bands',
                            'type'   => 'repeater',
                            'fields' => [
                                'icon'       => ['label' => 'Icon', 'type' => 'text'],
                                'eyebrow'    => ['label' => 'Eyebrow', 'type' => 'text'],
                                'title'      => ['label' => 'Title', 'type' => 'text'],
                                'body'       => ['label' => 'Description', 'type' => 'textarea'],
                                'panelTitle' => ['label' => 'Panel heading', 'type' => 'text'],
                                'points'     => ['label' => 'Panel points', 'type' => 'list'],
                                'cta'        => ['label' => 'Link text', 'type' => 'text'],
                                'to'         => ['label' => 'Links to', 'type' => 'text'],
                            ],
                        ],
                    ],
                ],
                'whyUs' => [
                    'label'  => 'Why hire from us',
                    'fields' => [
                        'badge'   => ['label' => 'Badge', 'type' => 'text'],
                        'heading' => ['label' => 'Heading', 'type' => 'text'],
                        'intro'   => ['label' => 'Intro paragraph', 'type' => 'textarea'],
                        'items'   => [
                            'label'  => 'Accordion entries',
                            'type'   => 'repeater',
                            'fields' => [
                                'title' => ['label' => 'Question', 'type' => 'text'],
                                'body'  => ['label' => 'Answer', 'type' => 'textarea'],
                            ],
                        ],
                    ],
                ],
                'howItWorks' => [
                    'label'  => 'How it works',
                    'fields' => [
                        'heading'  => ['label' => 'Heading', 'type' => 'text'],
                        'steps'    => [
                            'label'  => 'Steps',
                            'type'   => 'repeater',
                            'fields' => [
                                'n'     => ['label' => 'Number', 'type' => 'text'],
                                'title' => ['label' => 'Title', 'type' => 'text'],
                                'body'  => ['label' => 'Description', 'type' => 'textarea'],
                            ],
                        ],
                        'noteLead' => ['label' => 'Note, bold start', 'type' => 'text'],
                        'noteBody' => ['label' => 'Note', 'type' => 'textarea'],
                    ],
                ],
                'openRoad' => [
                    'label'  => 'Open road band',
                    'fields' => [
                        'eyebrow'        => ['label' => 'Eyebrow', 'type' => 'text'],
                        'headingLead'    => ['label' => 'Heading', 'type' => 'text'],
                        'headingAccent'  => ['label' => 'Heading, gold line', 'type' => 'text'],
                        'body'           => ['label' => 'Paragraph', 'type' => 'textarea'],
                        'primaryLabel'   => ['label' => 'Main button', 'type' => 'text'],
                        'primaryHref'    => ['label' => 'Main button link', 'type' => 'text'],
                        'secondaryLabel' => ['label' => 'Second button', 'type' => 'text'],
                        'secondaryHref'  => ['label' => 'Second button link', 'type' => 'text'],
                    ],
                ],
                'areasServed' => [
                    'label'  => 'Where we hire',
                    'note'   => 'The town names themselves come from the site\'s SEO data, so they stay in step with the structured data Google reads.',
                    'fields' => [
                        'heading'           => ['label' => 'Heading', 'type' => 'text'],
                        'intro'             => ['label' => 'Intro paragraph', 'type' => 'textarea'],
                        'footnoteLead'      => ['label' => 'Footnote, before the link', 'type' => 'text'],
                        'footnoteLinkLabel' => ['label' => 'Footnote link text', 'type' => 'text'],
                        'footnoteTail'      => ['label' => 'Footnote, after the link', 'type' => 'text'],
                    ],
                ],
                'closingCta' => [
                    'label'  => 'Closing call to action',
                    'fields' => [
                        'heading'        => ['label' => 'Heading', 'type' => 'text'],
                        'body'           => ['label' => 'Paragraph', 'type' => 'textarea'],
                        'primaryLabel'   => ['label' => 'Main button', 'type' => 'text'],
                        'primaryHref'    => ['label' => 'Main button link', 'type' => 'text'],
                        'secondaryLabel' => ['label' => 'Second button', 'type' => 'text'],
                        'secondaryHref'  => ['label' => 'Second button link', 'type' => 'text'],
                    ],
                ],
                'footer' => [
                    'label'  => 'Footer',
                    'note'   => 'The band at the bottom of every page. The map is built from what you type in "Where the map should point" -- a place name or an address is enough, the same thing you would type into Google Maps.',
                    'fields' => [
                        'blurb'           => ['label' => 'Line under the business name', 'type' => 'textarea'],
                        'locationHeading' => ['label' => 'Heading above the map', 'type' => 'text'],
                        'address'         => ['label' => 'Address', 'type' => 'list'],
                        'mapQuery'        => ['label' => 'Where the map should point', 'type' => 'text'],
                        'directionsLabel' => ['label' => 'Directions link text', 'type' => 'text'],
                    ],
                ],
                'social' => [
                    'label'  => 'Social media',
                    'note'   => 'Paste the address of each page you have. Leave a box empty and that icon is simply not shown -- an icon linking nowhere is worse than no icon. A named box per network rather than a list you add to, so the icon always matches the link.',
                    'fields' => [
                        'heading'   => ['label' => 'Heading above the icons', 'type' => 'text'],
                        'whatsapp'  => ['label' => 'WhatsApp', 'type' => 'text'],
                        'instagram' => ['label' => 'Instagram', 'type' => 'text'],
                        'facebook'  => ['label' => 'Facebook', 'type' => 'text'],
                    ],
                ],
            ],
        ],
    ];
}

/** The shipped copy, as the site would render it with nothing overridden. */
function content_defaults(): array
{
    static $defaults = null;
    if ($defaults === null) {
        $raw      = @file_get_contents(dirname(__DIR__) . '/content-defaults.json');
        $decoded  = $raw === false ? null : json_decode($raw, true);
        $defaults = is_array($decoded) ? $decoded : [];
    }
    return $defaults;
}

/** Overrides, as [page][section] => data. */
function content_overrides(): array
{
    // The table only exists once 003_content.sql has run. Treating a missing
    // table as "no overrides" keeps the public endpoint serving defaults
    // rather than returning a 500 while an install waits to be migrated.
    try {
        $rows = fetch_all('SELECT page, section, data FROM content_sections');
    } catch (Throwable $e) {
        return [];
    }

    $out = [];
    foreach ($rows as $row) {
        $decoded = json_decode((string) $row['data'], true);
        if (is_array($decoded)) {
            $out[$row['page']][$row['section']] = $decoded;
        }
    }
    return $out;
}

/**
 * Defaults with any overrides laid on top, section by section.
 *
 * Whole sections are replaced rather than merged field by field. A half-merged
 * section is the worse failure: remove an item from a list in the admin and a
 * deep merge would quietly put it back.
 */
function content_all(): array
{
    $content   = content_defaults();
    $overrides = content_overrides();

    foreach ($overrides as $page => $sections) {
        foreach ($sections as $section => $data) {
            // Ignore anything the schema no longer knows about, so a removed
            // section cannot be resurrected by a stale row.
            if (isset(content_schema()[$page]['sections'][$section])) {
                $content[$page][$section] = $data;
            }
        }
    }
    return $content;
}

/**
 * Whether 003_content.sql has been applied yet.
 *
 * content_overrides() treats a missing table as "nothing overridden" so the
 * public endpoint keeps serving defaults rather than 500-ing. That is right
 * for visitors and useless for the editor, who needs to be told the storage
 * is not there yet -- hence a check that distinguishes the two.
 */
function content_storage_ready(): bool
{
    try {
        fetch_one('SELECT id FROM content_sections LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/** One section, defaults or override, ready to fill a form. */
function content_section(string $page, string $section): array
{
    return content_all()[$page][$section] ?? [];
}

/** True when this section has been edited, so the form can offer a reset. */
function content_is_overridden(string $page, string $section): bool
{
    try {
        return fetch_one(
            'SELECT id FROM content_sections WHERE page = ? AND section = ?',
            [$page, $section]
        ) !== null;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Reads one section out of submitted form input, shaped by the schema.
 *
 * Driven by the schema rather than by what the browser sent, so a crafted post
 * cannot introduce keys the site does not expect. Empty repeater rows are
 * dropped: a blank row is how someone cancels an addition.
 */
function content_from_input(array $fields, array $input): array
{
    $out = [];

    foreach ($fields as $key => $spec) {
        $value = $input[$key] ?? null;

        switch ($spec['type']) {
            case 'list':
                $lines = preg_split('/\r\n|\r|\n/', (string) $value) ?: [];
                $out[$key] = array_values(array_filter(array_map('trim', $lines), fn($l) => $l !== ''));
                break;

            case 'repeater':
                $rows = [];
                foreach (is_array($value) ? $value : [] as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $built = content_from_input($spec['fields'], $row);
                    $empty = true;
                    foreach ($built as $v) {
                        if ($v !== '' && $v !== []) {
                            $empty = false;
                            break;
                        }
                    }
                    if (!$empty) {
                        $rows[] = $built;
                    }
                }
                $out[$key] = $rows;
                break;

            default:
                $out[$key] = trim((string) $value);
        }
    }

    return $out;
}

/** Writes an override. */
function content_save(string $page, string $section, array $data, ?int $userId): void
{
    query(
        'INSERT INTO content_sections (page, section, data, updated_by)
              VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by)',
        [$page, $section, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $userId]
    );
}

/** Drops an override, so the section goes back to the shipped copy. */
function content_reset(string $page, string $section): void
{
    query('DELETE FROM content_sections WHERE page = ? AND section = ?', [$page, $section]);
}
