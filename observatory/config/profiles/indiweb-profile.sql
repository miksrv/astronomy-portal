-- INDI Web Manager profile "AstroLab" (target state).
-- Apply to a fresh ~/.indi/profiles.db (indiweb creates the schema on first start):
--   systemctl stop indiwebmanager
--   sqlite3 ~/.indi/profiles.db < indiweb-profile.sql
--   systemctl start indiwebmanager
-- Labels must match the driver labels listed by indiweb (GET :8624/api/drivers).
-- Host state (2026-11-04): this profile as below — labels "ZWO EFW"/"ZWO EAF", "Roll Roof" in it,
-- autostart = 1, so all drivers start with indiweb after a reboot (autoconnect connects the
-- powered devices; one powered on later is connected from Ekos or with
-- `indi_setprop "<device>.CONNECTION.CONNECT=On"`).
-- WatchDog: PARK_DOME is Off in its config (it parks the mount but never closes the roof) until the
-- safety chain is tested on site. Note: at autostart without Ekos the WatchDog driver runs on its
-- defaults (triggers off) — its saved config is applied only when Ekos connects and loads configs.
-- Before working on the roof on site, stop INDI.

DELETE FROM driver WHERE profile IN (SELECT id FROM profile WHERE name = 'AstroLab');
DELETE FROM profile WHERE name = 'AstroLab';

INSERT INTO profile (name, port, autostart, autoconnect, scripts)
VALUES ('AstroLab', 7624, 1, 1, NULL);

INSERT INTO driver (label, profile)
SELECT label, (SELECT id FROM profile WHERE name = 'AstroLab')
FROM (
    SELECT 'Astrometry'      AS label UNION ALL
    SELECT 'WatchDog'                 UNION ALL
    SELECT 'ZWO CCD'                  UNION ALL
    SELECT 'QHY CCD'                  UNION ALL
    SELECT 'ZWO EFW'                  UNION ALL
    SELECT 'ZWO EAF'                  UNION ALL
    SELECT 'EQMod Mount'              UNION ALL
    SELECT 'Roll Roof'                UNION ALL
    SELECT 'Weather Watcher'
);
