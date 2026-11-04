-- KStars/Ekos equipment profile "AstroLab" and optical trains (target state).
-- File: ~/kstars-desktop/config/.local/share/kstars/userdb.sqlite
-- Stop the container first (`docker compose stop`), back the file up, apply, start again:
--   sqlite3 userdb.sqlite < ekos-profile.sql
-- City/province/country are site placeholders: set the real site in KStars
-- (Settings → Geographic) — it is also written to kstarsrc [Location].
-- Note: the live host profile has no "Roll Roof" (Dome) yet.

DELETE FROM driver WHERE profile IN (SELECT id FROM profile WHERE name = 'AstroLab');
DELETE FROM opticaltrains WHERE profile IN (SELECT id FROM profile WHERE name = 'AstroLab');
DELETE FROM profile WHERE name = 'AstroLab';

-- Ekos runs in the container with host networking, so the INDI server is on localhost.
-- guidertype 0 = internal guider; primaryscope/guidescope are telescope ids below.
INSERT INTO profile (name, host, port, city, province, country, indiwebmanagerport,
                     autoconnect, guidertype, primaryscope, guidescope, indihub,
                     portselector, scripts, driversource)
VALUES ('AstroLab', 'localhost', 7624, 'City', 'Region', 'Country', 8624,
        1, 0, 3, 4, 0, 0, '[]', 'system');

INSERT INTO driver (label, role, profile)
SELECT label, role, (SELECT id FROM profile WHERE name = 'AstroLab')
FROM (
    SELECT 'Astrometry'      AS label, 'Aux1'     AS role UNION ALL
    SELECT 'WatchDog',                 'Aux2'             UNION ALL
    SELECT 'ZWO CCD',                  'CCD'              UNION ALL
    SELECT 'ZWO EFW',                  'Filter'           UNION ALL
    SELECT 'ZWO EAF',                  'Focuser'          UNION ALL
    SELECT 'QHY CCD',                  'Guider'           UNION ALL
    SELECT 'EQMod Mount',              'Mount'            UNION ALL
    SELECT 'Roll Roof',                'Dome'             UNION ALL
    SELECT 'Weather Watcher',          'Weather'
);

-- Telescopes referenced by the optical trains (ids 3 and 4 in the profile above).
INSERT OR REPLACE INTO telescope (id, Vendor, Aperture, Model, Driver, Type, FocalLength) VALUES
    (3, 'SkyWatcher', 200.0, 'BK2001P', 'None', 'Newtonian', 1000.0),
    (4, 'SVBony',      60.0, 'Guide',   'None', 'Refractor',  240.0);

INSERT INTO opticaltrains (profile, name, mount, dustcap, lightbox, scope, reducer,
                           rotator, focuser, filterwheel, camera, guider)
SELECT id, 'Primary', 'EQMod Mount', '--', '--', 'SkyWatcher BK2001P 1000@F/5.0', 1.0,
       '--', 'ZWO EAF', 'ZWO EFW', 'ZWO CCD ASI6200MM Pro', 'QHY CCD QHY5II-M'
FROM profile WHERE name = 'AstroLab';

INSERT INTO opticaltrains (profile, name, mount, dustcap, lightbox, scope, reducer,
                           rotator, focuser, filterwheel, camera, guider)
SELECT id, 'Guide', 'EQMod Mount', '--', '--', 'SVBony Guide 240@F/4.0', 1.0,
       '--', '--', '--', 'QHY CCD QHY5II-M', 'QHY CCD QHY5II-M'
FROM profile WHERE name = 'AstroLab';
