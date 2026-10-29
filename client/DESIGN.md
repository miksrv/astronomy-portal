# «Смотри на звёзды» design system

How the client UI is built and where each piece lives. Read this before adding or changing any
user-facing component.

## 1. Principles

- **Night first.** The site is dark-only: it is used outdoors at night, next to telescopes, where a
  white screen ruins dark adaptation. `data-theme="dark"` is fixed on `<html>`
  (`pages/_document.tsx`); there is no light theme and no theme switch. Large areas stay dark, bright
  colour is reserved for the one action that matters on a screen.
- **Kit first.** Primitives (buttons, inputs, selects, dialogs, containers, tables, popouts,
  tooltips, icons, skeletons) come from `simple-react-ui-kit`. A missing primitive or variant is
  added to the kit (`../simple-react-ui-kit`), not hand-rolled in the app. Never a bare `<button>`,
  `<input>`, `<textarea>`.
- **Tokens, not values.** Colours, radii, spacing, font sizes, durations and z-indexes come from CSS
  variables — the kit's `theme.css` plus the overrides in `styles/theme.css` — and the Sass
  variables in `styles/variables.sass`. No raw hex colours or pixel values for anything a token
  covers (exceptions in section 7).
- **One way to say one thing.** A page title always looks the same, a section heading always looks
  the same, a destructive action is always red. The reader learns the site once.
- **Calm, then clear.** Prefer whitespace over boxes, one primary action per screen, secondary text
  in the secondary colour, never decoration that competes with the photos of the sky.

## 2. Tokens

`pages/_app.tsx` imports, in this order: `simple-react-ui-kit/theme.css` (all kit tokens, the dark
layer), `simple-react-ui-kit/styles.css` (kit component styles), `styles/theme.css` (project
overrides), `styles/globals.sass`. Do not import the kit CSS anywhere else.

`styles/theme.css` holds only:

1. **Project primitives** — layout (`--width-max` 1127px, `--header-height` 50px, `--width-menu`),
   the extra spacing steps `--space-8` (32) / `--space-10` (40), the type scale (section 3).
2. **The night palette** — the colour overrides of the kit's dark theme:

    | Token                               | Value                 | Use                                             |
    | ----------------------------------- | --------------------- | ----------------------------------------------- |
    | `--body-background`                 | `#111318`             | the page                                        |
    | `--surface-1`                       | `#1c1f2a`             | cards (`Container`), dialogs, menus             |
    | `--surface-2`                       | `#242838`             | nested plates, hover rows, chips, table header  |
    | `--surface-3`                       | `#2d3246`             | pressed, progress tracks, skeletons             |
    | `--border` / `--border-strong`      | `#2a2e42` / `#3a3f58` | hairlines and separators / form fields          |
    | `--text-color-primary`              | `#e8e9f0`             | text                                            |
    | `--text-color-secondary`            | `#a3a7b6`             | meta, captions, labels (≥ 6:1 on `--surface-1`) |
    | `--text-color-disabled`             | `#6c7086`             | disabled text, separators in text               |
    | `--color-main` (+ `-hover/-active`) | `#8d8cf0`             | brand periwinkle: links, active states, focus   |
    | `--color-main-background`           | `#262648`             | tinted plates: selected chips, active nav, info |
    | `--button-primary-background`       | `#4b4fb8`             | the filled indigo primary button, white text    |
    | `--input-background-color`          | `#151720`             | fields sit a step below the card they are in    |

    Status colours (`--color-green|orange|red` with `-background`) are the kit's dark tones — use
    them only for status (paid/booked, warning, error/destructive), never for decoration.

3. **Project aliases** — `--overlay-pill-background` / `--overlay-pill-color`, the dark translucent
   pill over photos (credits, durations, counters).

Kit tokens worth knowing: spacing `--space-1…6` (4…24px, 4px grid), radii `--radius-xs|sm|md|lg|xl`
(2/4/6/8/12) — controls `md`, menus and messages `lg`, cards and dialogs `xl`, chips and tooltips
`sm`; shadows `--shadow-sm|md|lg`; motion `--duration-fast|base|slow` + `--ease`; layers
`--z-dropdown|overlay|dialog|tooltip`; focus `--focus-ring` (fields) and `--focus-outline`
(everything else).

`--color-contrast` is **black** in the dark theme: it is the text on a light `--color-main` fill.
Text on a dark plate is `--text-color-primary`; text on the indigo primary button or over a photo
is white.

## 3. Type scale

One font: the kit's system stack (`--font-family`), antialiased (`styles/globals.sass`), no web
fonts. Text is set by **role**: a mixin of `styles/typography.sass`
(`@use '…/styles/typography' as type`, then `+type.titleBlock`) carries size, weight, line height
and tracking together.

| Role (mixin)   | px (phones) | Token                       | Weight · line height · tracking | Use                                                     |
| -------------- | ----------- | --------------------------- | ------------------------------- | ------------------------------------------------------- |
| `titleDisplay` | 40 (30)     | `--font-size-display`       | 700 · 1.1 · −0.02em             | the home and stargazing heroes only                     |
| `titlePage`    | 26 (22)     | `--font-size-title-page`    | 600 · 1.2 · −0.01em, balanced   | **every page `h1`** (`AppToolbar`, auth, payment, …)    |
| `stat`         | 22          | `--font-size-stat`          | 600 · 1.1, tabular figures      | a number that is the point of its block: stats, weather |
| `lead`         | 18 (16)     | `--font-size-lead`          | 400 · 1.55                      | the first paragraph of a page or hero                   |
| `titleSection` | 18          | `--font-size-title-section` | 600 · 1.3 · −0.01em             | section `h2` (global default), prose `h2`               |
| `prose`        | 16          | `--font-size-prose`         | 400 · 1.7                       | long-form text: FAQ, rules, descriptions, privacy       |
| `titleBlock`   | 16          | `--font-size-large`         | 600 · 1.3                       | card and block titles, `h3` (global default)            |
| `body`         | 14          | `--font-size`               | 400 · 1.5                       | UI text, controls, card text                            |
| `secondary`    | 13          | `--font-size-secondary`     | 400 · 1.45, secondary colour    | bylines, meta lines, values of a card                   |
| `caption`      | 12          | `--font-size-small`         | 400 · 1.4, secondary colour     | breadcrumbs, captions, counters, chart axes             |
| `overline`     | 12          | `--font-size-small`         | 600 · 1.4 · +0.08em, uppercase  | eyebrows over hero titles, group labels                 |
| `micro`        | 11          | `--font-size-micro`         | 400 · 1.35                      | credits and badges over photos                          |

Weights are the kit tokens (`--font-weight-normal|medium|semibold`, 400/500/600); 700 only for the
display titles. Uppercase is always CSS (`text-transform`), never typed in the source text: screen
readers may spell out all-caps words letter by letter. No ad-hoc sizes, no `em` sizes.

## 4. Layout

- **Width.** Content is capped by `--width-max` (1127px), centred, 16px side gutters on phones.
  `AppLayout fullWidth` is for the star map and the hero pages only.
- **App chrome.** `AppHeader` (50px, sticky) is the only global navigation; on phones the menu
  opens as a sidebar (`--width-menu`) over a scrim. `AppFooter` closes every page.
- **Page header.** `AppToolbar` is the one header of every inner page: the breadcrumbs (12px,
  secondary; on phones only "← parent"), the `h1` (`titlePage`), an optional meta line
  (`secondary`) under it and the page actions (`children`) on the right — under the title on
  phones. Hero pages (home, `/stargazing`) and centred pages (auth, payment, unsubscribe, 404) are
  the only pages without it.
- **Rhythm.** The first block is `--container-margin-top` (24px) under the app bar. Sections of a
  page are `--space-8` (32px) apart (a section `h2` carries it as its top margin) and a section
  heading is always `--space-3` (12px) over its content; blocks inside a section `--space-4`; form
  fields `--space-4`; buttons in a row `--space-2`. `<main>` lays its children out with a
  `--space-4` gap, so its direct children carry no outer margins (they would double the gap); an
  `h2` right in `<main>` takes the gap off its margins (`globals.sass`). Text runs the full width
  of the content column.
- **Sections, not containers.** The parts of one page (its description, photos, reviews, history)
  are sections: a bare `h2` and the content on the page background, separated by air.
  `Container` (the kit card: `--surface-1`, 1px ring, `--radius-xl`, 16px padding) is reserved
  for things of another nature than the page: a form, a tool or widget with its own purpose
  (weather, relay control, the upcoming event card), a table. Never a `Container` inside a
  `Container`.
- **Lists of media** (photos, events) are grids of tiles on the page background, never inside a
  `Container`.
- **Breakpoint.** One: `$mobileMaxWidth` (768px) from `styles/variables.sass`. Below it columns
  stack, side actions wrap under the content, touch targets are at least 44px.

## 5. Components

| Where                     | What                                                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simple-react-ui-kit`     | primitives: `Button`, `Input`, `TextArea`, `Select`, `Checkbox`, `Dialog`, `Container`, `Message`, `Table`, `Popout`, `Tooltip`, `Badge`, `Skeleton`, `Spinner`, `Icon`, … |
| `components/ui`           | project primitives that are kit candidates: `Breadcrumbs`, `Carousel`, `Counter`, `Pagination`, `ShowMore`, `UserAvatar`, `DateTimeInput`                                  |
| `components/common`       | domain components shared by several sections: layout chrome, `LoginForm`, `PhotoGallery`, `PhotoLightbox`, `ReviewCard`, `ReviewForm`, `EventMap`, `StarMap`, charts       |
| `components/pages/<area>` | section-specific composition (`stargazing`, `observatory`, `photos`, `objects`, …)                                                                                         |
| `pages`                   | routes; they compose sections and set the SEO props of `AppLayout`                                                                                                         |

## 6. Patterns

- **Buttons.** `mode="primary"` — the filled indigo button — at most one per screen or form, for the
  action the screen exists for (book a ticket, save, send). `mode="secondary"` for the other
  actions, `mode="outline"` for cancel / neutral alternatives next to a primary, `mode="link"` for
  inline text actions, `variant="negative"` for destructive ones (always confirmed in a dialog that
  names what is deleted). Icon-only buttons are square and always carry an `aria-label` or a
  `tooltip`. Sizes: `medium` (36px) by default, `small` (28px) inside dense rows and tables,
  `large` (44px) for the main call to action on phones.
- **Forms.** Kit fields, label above (13px/500 secondary, the kit default), hint or error under the
  field (12px). Fields `--space-4` apart, a form column at most 680px wide, or a two-column grid
  (`repeat(auto-fit, minmax(280px, 1fr))`) on wide screens. Actions at the end, right-aligned,
  cancel first and the primary last; full width on phones. Server errors go on their fields via
  `useApiFormError`; a form-level error is a `Message type="error"` above the actions.
- **Dialogs.** Kit `Dialog` with a `title`; body; actions row right-aligned (secondary first,
  primary last). Destructive confirmations name the object.
- **Messages.** `Message` for inline status (`info`, `success`, `warning`, `error`). Toasts
  (`SnackbarStack`) for the result of an action the user just took; never toast background work.
- **Floating cards.** Prompts that are not part of the page (`CookieConsent` bottom-left,
  `PushSubscribeBanner` bottom-right, full width at the bottom on phones) are `--surface-1` cards
  with a 1px ring and `--shadow-lg`, never over the page header or title. Only one is shown at a
  time: the push prompt waits until the cookie card is closed; bottom UI that must stay visible
  reads `--cookie-consent-height`.
- **Empty states.** One line of text (and at most one action) in place of the content, never an
  empty box or an empty table.
- **Loading.** Skeletons of the final shape for content, a spinner only inside a button or a
  dialog. Layout never jumps when data arrives.
- **Links vs buttons.** Navigation is a link (`next/link`, works with a new tab), an action in
  place is a `Button`. A clickable card is one link stretched over the card, not nested links.
- **Focus.** Every interactive element has a visible `:focus-visible` state: kit controls draw
  their own; links and custom controls get `--focus-outline` from `globals.sass`. `:hover` and
  `:focus` never share a rule.
- **Motion.** Kit durations and `--ease`; everything that moves is turned off under
  `prefers-reduced-motion: reduce`.
- **Photos.** Rounded `--radius-lg` (tiles) or `--radius-xl` (covers), `object-fit: cover`, text over
  a photo only on `--overlay-pill-background` or a gradient scrim, always white.
- **Prose.** Long text (FAQ, rules, descriptions, privacy) uses the `prose` mixin: 16px, 1.7 line
  height, on the full width of the content column (the hero leads are the only
  narrower text).

## 7. Exceptions to "tokens, not values"

- ECharts options (`utils/charts.ts`, weather and statistics charts) and Leaflet paths take colours
  in JS; keep them in one place per library and match the palette above.
- The star map (`components/common/star-map`, Celestial.js) has its own sky palette.
- White text over photos and the indigo button is `#fff`.

## 8. Adding a component — checklist

1. Is it a primitive? Add it to `simple-react-ui-kit` first.
2. Does a domain component already exist? Extend it with a prop instead of a copy.
3. Tokens and type roles only; check the phone layout at 375px.
4. Keyboard: reachable, visible focus, Escape closes, labels on icon buttons.
5. i18n: Russian fallback in `t('key', 'Текст')`, both locale files updated.
6. Add it to section 5 of this file if it is shared.
