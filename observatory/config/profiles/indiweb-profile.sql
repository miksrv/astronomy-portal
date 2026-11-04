-- INDI Web Manager profile "AstroLab" (target state).
-- Apply to a fresh ~/.indi/profiles.db (indiweb creates the schema on first start):
--   systemctl stop indiwebmanager
--   sqlite3 ~/.indi/profiles.db < indiweb-profile.sql
--   systemctl start indiwebmanager
-- Labels must match the driver labels listed by indiweb (GET :8624/api/drivers).
-- Note: the live host profile still lists the obsolete "ASI EFW"/"ASI EAF" labels and
-- lacks "Roll Roof" (that is why the filter wheel driver does not start with it).

DELETE FROM driver WHERE profile IN (SELECT id FROM profile WHERE name = 'AstroLab');
DELETE FROM profile WHERE name = 'AstroLab';

INSERT INTO profile (name, port, autostart, autoconnect, scripts)
VALUES ('AstroLab', 7624, 0, 1, NULL);

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
