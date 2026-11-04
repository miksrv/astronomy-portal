# FEAT-31 — Objects filled from SIMBAD (replaces the OpenNGC catalog)

**Status:** 4.16.0 — decisions 1–5 implemented (2026-11-04); 6 (archive names in the object form) and 7 (jobs) to do
**Affects:** Backend (CodeIgniter 4) + Frontend (object form, object page) + observatory-api (read-only key)

Keep it simple and reliable: no local deep-sky catalog, no new admin screens, no typeahead.

---

## Decisions

1. **Remove the OpenNGC catalog** added earlier in this release: the `catalog` / `catalog_aliases`
   tables, `objects.catalog_id`, `catalog:import`, `/catalog/*`, `CatalogLibrary`/`CatalogModel`,
   the `CatalogSearch` component, the catalog facts block on the object page and the
   "Найти в каталоге" helper in the object form (a migration drops the tables and the column).
2. **Extend `objects`** with what SIMBAD knows: object type, angular size (major/minor axis,
   arcmin), magnitude (the column exists), the SIMBAD main identifier and the list of aliases
   (M 33 = NGC 598 = PGC 5818 = "Triangulum Galaxy" — what joins our objects with the FITS /
   observatory-api names).
3. **Filled automatically, never by a button:**
   - once, by a spark command for all existing objects;
   - on every new object, when it is created (a rare event). A failed lookup never blocks saving.
4. **Coordinates** come from SIMBAD as well. The one-off run fixes the obviously wrong ones found
   on 2026-11-03 (M 94: RA entered in hours; NGC 7640, NGC 1961, IC 405: 7–98° off) and reports
   the rest — small offsets (< ~1°, e.g. NGC 7000, IC 434, M 51) may be deliberate frame centers.
5. **Service:** CDS (Sesame name resolver + SIMBAD), called server-side, results stored in our DB —
   the site never depends on CDS at view time.
6. **New objects from the observatory archive:** no new screen. The existing "create object" form
   gets a drop-down of object names that observatory-api has frames for but the portal has no
   object yet (portal backend → observatory-api with its own read-only key, cached). Picking one
   fills the name; SIMBAD fills the rest on save.
7. **Telescope jobs (FEAT-30 phase 2):** a job needs only the target's **name and coordinates** —
   no other details. Two ways to set them:
   - **pick on the star map** (its UI already shows the objects of the map's own catalog): the map
     gives the name and exact coordinates;
   - **search**: suggestions from our own objects at once, and in the background a CDS (Sesame)
     lookup by the typed name — it may take a few seconds; when it answers, its result (name +
     coordinates) joins the suggestions. If CDS doesn't answer, our objects and the map remain.
   Comets/asteroids later, separately (ephemerides per night).

## Implemented (1–5)

- Migration `AddObjectsSimbad` (the OpenNGC one never reached production and was replaced in place):
  `objects.simbad_id`, `object_type` (SIMBAD's short code), `maj_axis`/`min_axis` (arcmin),
  `aliases` (JSON), `simbad_checked_at`.
- `SimbadClient`: Sesame (`-oxpI`) for the name → main id, position, type, aliases; SIMBAD TAP
  (`basic` + `flux` V) for the size and the magnitude. The CDS mirrors at Harvard by default — the
  Strasbourg hosts did not answer from here; `.env` can switch (`simbad.sesameUrl`, `simbad.tapUrl`).
  Aliases kept: M, NGC, IC, UGC, PGC/LEDA, MCG, Arp, HCG, Mrk, ACO/Abell, LBN, LDN, B, Ced, vdB, RCW,
  Gum, Sh 2, Cl …, PN A66, SN, Stock, Tr, Berkeley and the common names (`NAME …`).
- `ObjectSimbadLibrary` decides: within **2°** of our position → type, size, aliases, magnitude when
  empty (not for nebulae: SIMBAD's V of a planetary is its central star's), our coordinates kept;
  farther → stored only when a person accepts it, coordinates included; comets/asteroids/planets
  (categories 8, 9, 10, 12) are not looked up.
- `php spark objects:simbad` prints a report (object, status, offset, SIMBAD id, type, size, mag);
  `--apply` stores, `--accept M_94,IC_405,…` takes the far ones. The dry run on 2026-11-04: 84 match,
  far = M 94, NGC 1961, IC 405, NGC 7640 (our coordinates wrong) and Abell 74 (resolves to the galaxy
  cluster ACO 74, not the planetary — don't accept); not found: a Canis Minoris, IC 4015.
  `--skip NGC_6888,…` leaves out a name SIMBAD resolves to a close neighbour (it stays unchecked,
  so the next run needs the same `--skip`). On prod after the migration:
  `objects:simbad --apply --accept M_94,NGC_1961,IC_405,NGC_7640 --skip NGC_6888`.
- The object form has "Найти в SIMBAD" (`GET /objects/simbad/:name`, a lookup only): it fills the
  empty coordinates and magnitude, offers SIMBAD's coordinates when they are more than 0.1° off,
  shows the type/size/aliases, and the form saves them with the object (`simbad` in the body).
  `POST /objects` without them looks the new object up itself (8 s); a failure is logged and never
  fails the create. The editor's magnitude always wins; the distance is never from SIMBAD.
- Object page: the type and size in the hero, "Другие обозначения" (aliases) with a SIMBAD link.

## Open points

- SIMBAD calls some objects by a neighbour (NGC 6888 → the WR star HD 192163, NGC 5907 → NGC 5906,
  NGC 2239 → NGC 2244): the type label then is the neighbour's. Fine for now; an editor override
  would be a new field.
- observatory-api: read-only client API keys (today every key is a pipeline with write access) —
  a change in that repository (needed for 6).
