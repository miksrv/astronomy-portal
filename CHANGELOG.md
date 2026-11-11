# CHANGELOG

## 4.17.0

Anyone signed in can now send the observatory telescope a target to photograph.

### Minor Changes

- Observatory: telescope jobs — pick a target, a filter set and conditions, and the observatory shoots it on clear nights
- Telescope jobs: a public queue with progress, your own jobs, and e-mails when shooting starts and finishes
- Telescope jobs: find any target in SIMBAD right in the form, with its visibility tonight and a sky map
- Observatory: a "Telescope queue" card with the next jobs on the observatory page
- Observatory: the supernova patrol of nearby galaxies runs between site jobs and is shown in the queue

### Patch Changes

- Star map: small maps are sharp on high-resolution screens
- Star map: the stray "undefined3" label near Eridanus is now υ³ Eri
- Page actions open from a compact "Actions" button next to the page title
- Photo page: equipment and object facts are laid out more cleanly

## 4.16.0

The observatory page shows the telescope live, and objects are filled from the SIMBAD catalog.

### Minor Changes

- Observatory: live status of the mount, cameras, focuser, filters and roof, with a sky map of where the telescope points
- Observatory: a log of the night's events, grouped by day
- Star map: the telescope and its camera field of view, updated live
- Objects: type, angular size and other designations from SIMBAD, with a link to SIMBAD
- Object editor: grouped fields, "Find in SIMBAD", coordinates in degrees or hours, a Markdown editor with preview
- Editors: leaving a form with unsaved changes asks first

### Patch Changes

- Objects: corrected coordinates of M 94, NGC 1961, IC 405 and NGC 7640
- Paging to the next object no longer shows the previous photo while the next one loads
- New objects keep their categories

## 4.15.3

- Star map: layers that are on now stand out as filled buttons, the same as on the photo page
- Star map settings: switches, a sky/horizon toggle, Milky Way and planets in their groups
- Star map settings: Constellations and Grid & lines fold away and show how many layers are on
- Star map: panels, popup and captions match the rest of the site
- Editors: add, edit, statistics and other page actions live in one "⋯" menu in the top right corner of the page; restarting a photo's plate solve is in it too
- Photo gallery: the "Show more" button spans the whole grid right under it, without the photo count line

## 4.15.2

- Before/after slider lines the two photos up by their stars: same rotation, scale and position
- Paging to the next photo no longer shows the previous picture while the next one loads

## 4.15.1

- Faster pages: the home, stargazing and star map pages are cached for guests, every page carries only its own dictionary, the gallery shows 48 photos at a time and loads the rest on demand, the star map scripts are a third of their size
- Pictures: the first-screen image is announced to the browser early, social previews are light JPEGs, the image optimizer gets enough time on the small server and no longer keeps a failed attempt for a year, the deploy checks that it works
- Dates on Russian pages are Russian in the server-rendered HTML, not English until the page hydrates
- Mobile: pinch zoom is allowed again, controls are at least 44 px tall, the star map's bottom strip shows it scrolls
- Search engines: honest sitemap dates, no canonical on pages that are not indexed, valid link attributes
- Views are counted once the page is open, not on every server render or crawler fetch
- Unsubscribing from the mailing asks for a click; the links use random ids
- Fixes: the address of an event without registration is visible on the home page; the lights widget no longer fails when the relay is missing; login return links cannot point off-site
- Housekeeping: editor forms and the date picker are translated, unused code and packages removed

## 4.15.0

- Redesigned objects catalog and object pages: what is visible tonight, exposure by filter, observing log
- Redesigned observatory dashboard: can the telescope shoot now, weather, Sun and Moon, the night ahead
- Redesigned photo gallery and photo page: large viewer, zoom, scale bar, before/after slider, shooting history
- Photos are plate-solved: objects labelled on the picture, RA/Dec grid and compass, measured field and rotation
- Object pages without a photo show the DSS2 sky survey
- Faster and cacheable public pages

## 4.14.0

- Faster first load on every page, lighter images, no content jumps while loading

## 4.13.0

- New night design across the whole site, better on phones and with the keyboard
- Star map and object pages get link previews

## 4.12.1

- Faster loading of pages and photos

## 4.12.0

- Star map becomes an online planetarium: horizon view, any place and time, search, object details, shareable links

## 4.11.0

- Videos in stargazing galleries

## 4.10.0

- Reworked event page; notifications and clearer form errors

## 4.9.1 – 4.9.2

- Redesigned emails and events list; push notifications for guests

## 4.9.0

- Push notifications about stargazing events

## 4.8.0

- Event galleries filtered by photographer; roles and permissions; batch photo upload

## 4.7.0 – 4.7.5

- Events: venue map, calendar file and QR ticket, reviews prompt, refunds, statistics
- Logging out signs you out on all devices; redesigned profile

## 4.6.0 – 4.6.3

- Paid tickets with online payment; sign in by email link
- Privacy policy, FAQ, rules and location pages; redesigned home page

## 4.5.0 – 4.5.5

- Reviews for stargazing events; profile page; newsletters to event participants

## 4.4.0

- Star map settings; photo view counter; users list

## 4.3.0

- Email newsletter about stargazing events

## 4.1.0 – 4.2.0

- Registration for stargazing events with QR check-in; interactive star map; telescope workdays

## 4.0.1 – 4.0.18

- Photo gallery, object categories, observatory overview and weather charts, sitemap, new logo

## 4.0.0

- Fully redesigned site, English version
