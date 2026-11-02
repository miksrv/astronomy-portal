# CHANGELOG

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
