# FEAT-22 — Stargazing Index Page Redesign

**Status:** Planned  
**Priority:** Medium  
**Affects:** Frontend (Next.js) only  
**Parallel implementation:** N/A — frontend-only.

---

## Overview

The `/stargazing` index page currently opens with a standard AppToolbar title + breadcrumb, followed by a text description and a plain `<ul>` list of navigation links — more like a Wikipedia article than an event landing page. The redesign improves visual hierarchy and emotional impact without a full rewrite: replace the link list with info cards, move the Telegram banner, and restructure the layout for a better first impression.

---

## Current Layout (top → bottom)

```
AppToolbar (h1 "Астровыезды" + breadcrumb)
EventUpcoming          ← good, keep as first prominent element
Telegram banner        ← intrusive, too high up
Container:
  Text paragraph 1
  Text paragraph 2
  <ul> links (rules, howto, where, faq)
  PhotoGallery (4 random photos)
EventsList (archive grid)
AppFooter
```

## Target Layout

```
AppToolbar (keep — needed for SEO h1 and admin button)
EventUpcoming          ← keep first
Container:
  Text paragraph 1 + 2  ← keep
  InfoCards row (rules, howto, where, faq)  ← replace <ul>
EventsList (archive grid)
PhotoGallery            ← move here, full-width strip above footer
Telegram banner         ← move here, just above footer
AppFooter
```

---

## Frontend Tasks

### FE-1 — Replace `<ul>` links with info cards

**File:** `client/pages/stargazing/index.tsx`

Replace:
```tsx
<ul style={{ marginBottom: '20px' }}>
  <li><Link href="/stargazing/rules">...</Link></li>
  ...
</ul>
```

With a 4-card grid component. Each card:
- Icon (from `simple-react-ui-kit` Icon component)
- Title (existing translated string)
- One-line description (new i18n key)
- Entire card is a `<Link>`

Card definitions:

| Key | Icon | Title | Description (RU) |
|-----|------|-------|-----------------|
| rules | `Shield` | Правила поведения | Что нельзя делать и как уважать других участников |
| howto | `Star` | Как проходят астровыезды | Программа вечера, телескопы и лекции |
| where | `Point` | Где посмотреть в телескоп | Место проведения в Оренбургском районе |
| faq | `Question` | Часто задаваемые вопросы | Ответы на популярные вопросы участников |

**Component:** create `client/components/pages/stargazing/info-cards/InfoCards.tsx`

```tsx
interface InfoCardItem {
    href: string
    icon: string
    title: string
    description: string
}

export const InfoCards: React.FC<{ items: InfoCardItem[] }> = ({ items }) => (
    <div className={styles.grid}>
        {items.map((card) => (
            <Link key={card.href} href={card.href} className={styles.card}>
                <Icon name={card.icon} className={styles.icon} />
                <div>
                    <div className={styles.cardTitle}>{card.title}</div>
                    <div className={styles.cardDesc}>{card.description}</div>
                </div>
            </Link>
        ))}
    </div>
)
```

**Styles** (`styles.module.sass`):
```sass
.grid
    display: grid
    grid-template-columns: repeat(2, 1fr)
    gap: 10px
    margin-bottom: 20px

    @media (max-width: $mobileMaxWidth)
        grid-template-columns: 1fr

.card
    display: flex
    align-items: flex-start
    gap: 12px
    padding: 14px 16px
    border-radius: var(--border-radius)
    background: var(--input-background-color)
    text-decoration: none
    color: var(--text-color-primary)
    transition: background .2s

    &:hover
        background: var(--input-border-color)

.icon
    width: 22px
    height: 22px
    fill: var(--link-color)
    flex-shrink: 0
    margin-top: 2px

.cardTitle
    font-weight: 600
    font-size: 14px
    margin-bottom: 2px

.cardDesc
    font-size: 12px
    opacity: .7
```

### FE-2 — Move Telegram banner below EventsList

In `client/pages/stargazing/index.tsx`, cut the `<Link className="telegram-message">` block and paste it **after** `<EventsList>` and before `<AppFooter>`.

### FE-3 — Move PhotoGallery after EventsList

Move the `<PhotoGallery>` + `<PhotoLightbox>` block (currently inside the `<Container>` with text) to **after** `<EventsList>`, wrapped in its own `<Container>`.

Increase the photo count from `limit: 4` to `limit: 8` for a more impactful strip.

### FE-4 — i18n keys

Add card description keys to both locale files:
```json
"rules_card_desc": "Что нельзя делать и как уважать других участников",
"howto_card_desc": "Программа вечера, телескопы и лекции",
"where_card_desc": "Место проведения в Оренбургском районе",
"faq_card_desc": "Ответы на популярные вопросы участников"
```

---

## Acceptance Criteria

- [x] The plain `<ul>` navigation list is replaced with 4 visual cards in a 2×2 grid
- [x] Each card has an icon, title, and one-line description
- [x] Cards are clickable links navigating to the correct sub-pages
- [x] Grid is responsive: 2 columns on desktop, 1 column on mobile
- [ ] Telegram banner appears below the events archive, not above the description
- [ ] Photo gallery is moved below the events archive with 8 photos
- [ ] No regression in SEO meta (title/description/canonical unchanged)
- [x] All text uses i18n keys
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test` all pass
