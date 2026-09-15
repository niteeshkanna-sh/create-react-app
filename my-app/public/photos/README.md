# Photographs

Drop image files in here and the site uses them. Nothing to register.

The filename (without its extension) is the slot. `cars-hero.jpg` fills the
`cars-hero` slot; rename a file and it moves slots. `.avif`, `.webp`, `.jpg`
and `.png` all work, and a slot with several formats prefers them in that
order — so adding `cars-hero.webp` beside `cars-hero.jpg` is an upgrade, not
a conflict.

Any slot with no file falls back to the drawn scene, so a half-finished set
of photographs still gives a complete-looking site.

## Slots the pages look for

| File name                | Where it appears           | What it should show                                   |
| ------------------------ | -------------------------- | ----------------------------------------------------- |
| `cars-hero`              | Cars page banner           | Two or three of your cars together, outdoors           |
| `bikes-hero`             | Bikes page banner          | Scooters and a motorcycle, lined up                    |
| `wedding-hero`           | Wedding cars banner        | A decorated car, flowers visible                       |
| `tourist-hero`           | Tourist vehicles banner    | Your van or a group vehicle, ideally at a landmark     |
| `monthly-hero`           | Monthly rental banner      | A car parked at a home or office                       |
| `nri-hero`               | NRI page banner            | A car at an airport pickup, or with luggage loaded     |
| `tariff-hero`            | Tariff page banner         | Any clean, wide shot of a car                          |
| `about-hero`             | About page banner          | You, your team, or the yard                            |
| `contact-hero`           | Contact page banner        | Your office front, or a recognisable local landmark    |
| `/cars` `/bikes` …       | Home page service cards    | Same subjects, used as the card headers                |
| `coast`                  | Areas-served panel         | Kanyakumari coastline or the lighthouse                |

## Shooting notes

- **Landscape, and wide.** The banners crop to roughly 3:1 on a desktop, so
  anything important near the top or bottom edge gets cut. Leave room.
- **At least 1600px wide.** These stretch the full width of the page; below
  that they go soft on a laptop screen and badly soft on a phone.
- **Daylight, and not midday.** Early morning or an hour before sunset. Hard
  overhead sun blows out a car's bonnet and fills the windows with glare.
- **Clean cars.** Obvious, and the thing most often skipped.
- **No number plates you would rather not publish.** These pages are public
  and get indexed.
- **Keep them under about 500 KB each.** Export as `.webp` at quality 80 if
  you can; a 4 MB phone photo will load slowly on mobile data, which is how
  most of your visitors arrive.
