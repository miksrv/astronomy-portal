# FEAT-32 — Observatory section: the summary page split into Equipment and Nights

**Status:** Discussion (2026-11-10), nothing implemented yet; to be continued on `release/4.17.0`
**Priority:** Medium
**Affects:** Frontend (Next.js) only — no new endpoints; `docs/permissions.md` (a new public page with controls under `RELAY_CONTROL`)

---

## Overview

`/observatory` has grown into seven different things on one page: the conditions verdict, weather + sky + forecast, the telescope job queue, the full equipment status with its event log, two cameras, the power relays with the observing sessions, and the nights heat-map. The jobs (`/observatory/jobs`) and the weather (`/observatory/weather`) already have their own pages.

The goal: `/observatory` stays a **summary dashboard** that answers four questions — *can we shoot now*, *what is the telescope doing now*, *what is next*, *what happened last night* — and everything detailed moves to two new pages:

- **`/observatory/equipment`** — the live state of every device, the event log, the relays and the camera: the operator's page, **public** for everyone.
- **`/observatory/nights`** — the archive of observing nights (heat-map + sessions list).

---

## Decisions taken

1. **The equipment page is public.** Any guest sees the full state of the equipment — it builds trust and makes the site feel alive. Control stays behind the existing privilege: relays need `RELAY_CONTROL`, the light stays the one button anyone can press (rate-limited `relay/light`, cooldown). No new privilege.
2. **Cameras are on both pages.** On the summary as the live "hook" for visitors; on the equipment page so that after switching a relay or opening the roof the result is visible right next to the controls.
3. **The light button goes onto the camera card** ("Обсерватория") on the summary — the light exists to see something on that camera, so it is one action: press and look. On the equipment page it also stays in the relay list.
4. **The camera interval stays 6 s** (camera 2) / 30 s (all-sky). No "fast mode" while operating: for real work the owner opens the camera directly; the site's camera goes through the hosting proxy on purpose (the observatory's network address is not exposed), so faster refresh would only load the proxy.
5. **The summary keeps a very short "Состояние оборудования" widget** instead of the full `ObservatoryStatus`.

---

## Target layout

### `/observatory` (summary)

Order of blocks:

1. `ConditionsVerdict` — unchanged.
2. Bento: `WeatherCard`, `SkyCard`, `ForecastCard` (see open question 3).
3. **Equipment status widget** (new, short):
   - one line of overall state — «Идёт съёмка: M 31, кадр 14/40», «Отдыхает, крыша закрыта», «Ждёт условий», «Нет связи · 12 мин» (reuse the logic of `resting-panel` and `getMinutesAgo` from `observatory-status/utils.ts`);
   - a row of device indicators — roof, mount, camera, focuser, filter wheel, guider, WatchDog: icon + tone dot (`StatusBadge`) + tooltip, no numbers;
   - "Подробнее →" to `/observatory/equipment`.
   - Data: the same `useObservatoryGetStatusQuery` the page already polls — no extra request.
4. Cameras (both) — the "Обсерватория" one with the light button on its card.
5. `TelescopeWidget` — the job queue.
6. **"Последняя ночь" card** (new, short): date, duration, objects shot, frames → link to `/observatory/nights`.

Leaves the summary: `ObservatoryStatus` (device cards, sky map), `ObservatoryEvents` and its 40-event polling query, `RelayList`, `ObservingSessions`, `TelescopeActivity`. The `statisticGetTelescope` SSR request either moves to the nights page entirely or is reduced to what the "last night" card needs.

### `/observatory/equipment`

The main scenario is "press a control → see the result", so the camera sits next to the controls, not at the bottom:

- **Desktop:** two columns. Left — roof + mount, the device grid (`ObservatoryStatus` cards), `RelayList`, `ObservatoryEvents`. Right — the camera(s) in `position: sticky`, staying in view while scrolling and pressing buttons.
- **Mobile:** the observatory camera on top (compact, with the light), below it the roof and the relays, then everything else.
- Polling as today (status + events every 60 s, relays at `RELAY_POLLING_MS`).

### `/observatory/nights`

- `TelescopeActivity` (heat-map) + `ObservingSessions`.
- SSR as today on the summary: the nights with links to the objects shot are worth indexing; the page description already promises a «календарь работы телескопа». Public HTML cache like the summary (`s-maxage=60, stale-while-revalidate=240`) — or longer, the archive changes once a night.
- Not `/observatory/history`: that route is the observatory build history (chapters; its menu item is commented out).

---

## Tasks

### FE-1 — Extract the light control from `RelayList`
The light logic (optimistic on, cooldown countdown, error state, `useRelayToggleLightMutation`) lives inside `client/components/pages/observatory/relay-list/RelayList.tsx`. Extract it into a hook `useLightToggle` + a `LightButton` component; use it in `RelayList` and on the camera card. Keep `RelayList.test.tsx` green, add a test for the button.

### FE-2 — Camera card with an optional action
`Camera` (`camera/Camera.tsx`) takes an optional slot for an action (the light button) so the summary's camera shows it; the equipment page reuses the same component.

### FE-3 — Equipment status widget
New component (e.g. `observatory-status/EquipmentSummary.tsx`) built on `buildDeviceCards` / the resting-state logic; tone per device, overall line, link. Tests next to `ObservatoryStatus.test.tsx`.

### FE-4 — `/observatory/equipment` page
`client/pages/observatory/equipment.tsx`: layout above, `initSSRLocale(..., ['translation', 'observatory', 'starmap'])` (the sky map), canonical, SEO description, JSON-LD if it makes sense.

### FE-5 — `/observatory/nights` page
`client/pages/observatory/nights.tsx`: moves the `statisticGetTelescope` SSR + `toTelescopeNights` from the summary.

### FE-6 — "Last night" card + slimmer summary
Remove the moved blocks from `client/pages/observatory/index.tsx`, add the card, reorder as above; update the page lead/description if needed.

### FE-7 — Menu, sitemap, i18n
- Menu "Обсерватория" (`components/common/app-layout/Menu.tsx`): Об обсерватории, Задания телескопа, **Оборудование**, **Ночи съёмки**, Погода.
- Add both pages to the sitemap.
- New keys via `yarn locales:build`, EN filled by hand, RU defaults in code.

### DOC-1 — `docs/permissions.md`
No privilege changes, but add the new public page `/observatory/equipment` with its `RELAY_CONTROL`-gated relay controls (and the public light button) to the page table in the same change. Note: `TELESCOPE_MANAGE` lists "the full observatory status (power, disk, errors)" as planned — decide whether those details stay out of the public equipment page (open question 4).

### Release
`CHANGELOG.md` entry (user-facing), delete this spec once shipped, remove the ROADMAP row.

---

## Open questions

1. **Cameras on the equipment page:** both, or only "Обсерватория" (all-sky stays on the summary)?
2. **Routes:** `equipment` vs `status`; `nights` vs `log`.
3. **Forecast on the summary:** keep the full `ForecastCard` or shrink it to the coming night (details are on `/observatory/weather`).
4. **What is public on the equipment page:** today's `ObservatoryStatus` is already public on the summary, so moving it changes nothing; but the planned power/disk/errors details (`TELESCOPE_MANAGE`) — hidden for guests, or shown?
