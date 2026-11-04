# FEAT-31 — Deep-sky catalog (OpenNGC) and object aliases

**Status:** Planned for 4.16.0
**Priority:** High (the telescope job form of [FEAT-30](observatory-agent.md) depends on it)
**Affects:** Backend (CodeIgniter 4: tables, import command, API) + Frontend (search component)

---

## Overview

Import the **OpenNGC** catalog (NGC + IC + addendum, ~14 000 objects, CSV, CC BY-SA 4.0,
<https://github.com/mattiaverga/OpenNGC>) into our database, plus a table of **aliases** keyed by a
normalised designation. One source of truth for "what is this object and where is it":

1. **Telescope job form** — search "M 31", "Андромеда", "NGC 224" → exact J2000 coordinates, type,
   size, magnitude (size drives the "does it fit the field" hint).
2. **Aliases** — `M33` = `NGC598` = `Triangulum`: per-object statistics from observatory-api and our
   own `objects` / FITS data are joined by the normalised name, whatever name the FITS header used.
3. **Object pages** — type, size, magnitude and constellation as a fallback when the editor hasn't
   filled them in.
4. Later: suggest photo ↔ object links from the plate-solve WCS (catalog objects inside the frame),
   for the editor to confirm.

---

## Business Rules

1. The catalog is **reference data**, read-only on the site; our `objects` table stays the curated
   list of what the observatory has shot. An `objects` row links to a catalog row when they match.
2. **Normalised designation** is the join key everywhere: upper-case, no spaces/underscores, leading
   zeros removed (`M 31`, `m_31` → `M31`; `NGC 0224` → `NGC224`; `IC 0434` → `IC434`). Same rules as
   the observatory pipeline's `normalize_object_name()`, so names match across the systems.
3. Re-import is idempotent (upsert by OpenNGC name) — a new OpenNGC release is applied by running
   the command again.
4. License: CC BY-SA 4.0 → attribution "Catalog data: OpenNGC (CC BY-SA 4.0)" wherever catalog
   data is shown (job form, object page).

---

## Backend Tasks

### BE-1 — Migration: `catalog`
| Column | Type | Notes |
|---|---|---|
| `id` | INT PK | |
| `name` | VARCHAR(20) UNIQUE | OpenNGC name, e.g. `NGC0224`, `IC0434` |
| `designation` | VARCHAR(20) UNIQUE | normalised (`NGC224`) |
| `type` | VARCHAR(10) | OpenNGC type code (`G`, `GCl`, `OCl`, `PN`, `HII`, `Neb`, `SNR`, `*Ass`, …) |
| `ra`, `dec` | DOUBLE | J2000 degrees |
| `constellation` | CHAR(3) | |
| `maj_axis`, `min_axis` | FLOAT NULL | arcmin |
| `pos_angle` | SMALLINT NULL | deg |
| `mag_b`, `mag_v` | FLOAT NULL | |
| `surf_brightness` | FLOAT NULL | mag/arcsec² |
| `hubble` | VARCHAR(10) NULL | galaxy morphology |
| `messier` | SMALLINT NULL | M number |
| `common_names` | VARCHAR(255) NULL | as in OpenNGC (EN) |
| `name_ru` | VARCHAR(255) NULL | filled by hand / later for well-known objects |
| `identifiers` | TEXT NULL | other designations (UGC, PGC, Caldwell, …) |

Indexes: `designation`, `messier`, (`ra`, `dec`) for cone searches.

### BE-2 — Migration: `catalog_aliases`
`alias` (VARCHAR(40), normalised, PK) → `catalog_id`. Filled by the import: the OpenNGC name, the
`M`/`NGC`/`IC` cross ids, Caldwell, UGC/PGC from `identifiers`, and the common names (normalised
lower-case words for search). One alias may point to one object only (duplicates are logged).

### BE-3 — `objects.catalog_id`
Nullable FK to `catalog`, filled by the import for existing `objects` rows whose `catalog_name`
normalises to a known alias; unmatched names (comets, planets, variable stars) stay NULL.

### BE-4 — Import command `php spark catalog:import [--file path]`
Downloads (or reads) `NGC.csv` + `addendum.csv` (`;`-separated, sexagesimal RA/Dec), converts,
upserts `catalog`, rebuilds `catalog_aliases`, links `objects.catalog_id`; prints counts. A
`CatalogLibrary::normalize()` helper with unit tests shares the normalisation rules.

### BE-5 — API
- `GET /catalog/search?q=&limit=` — public, cached: matches the alias table (prefix) and common
  names, returns `{name, designation, messier, type, ra, dec, magnitude, size, commonNames, objectId?}`
  sorted by Messier first, then brightness. Rate-limited.
- `GET /catalog/:designation` — one object + all its aliases + our `objects` row if any.
- `GET /objects/:name` gains `catalog` (type, size, magnitudes, constellation) when linked.

## Frontend Tasks

### FE-1 — `CatalogSearch` component
Autocomplete input (kit `Input` + dropdown) over `/catalog/search`: shows designation, common name,
type, magnitude. Used by the job form (FEAT-30) and the object editor ("link to catalog").

### FE-2 — Object page facts
Type / size / magnitude / constellation from the catalog when the editor fields are empty, with the
OpenNGC attribution. i18n for type names (RU/EN).

---

## Acceptance Criteria

- `catalog:import` loads all OpenNGC rows; re-running changes nothing.
- `M31`, `m 31`, `NGC 224`, `Andromeda` all resolve to the same catalog row; `M33` = `NGC598`.
- Existing `objects` rows with NGC/IC/Messier names get `catalog_id`.
- `/catalog/search?q=M3` returns M3 first, then M31, M33, … with coordinates.
- Normalisation has unit tests and gives the same result as the pipeline for the archive's object names.
