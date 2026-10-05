-- Takes the dump and the fingerprint from one frozen snapshot, so the
-- fingerprint describes exactly the rows inside the dump even while the app
-- keeps writing. Expects fingerprint.sql next to it in /tmp of the container.
\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT pg_export_snapshot() AS snap \gset
\setenv SNAP :snap
\! pg_dump -U "$PGUSER" -d "$PGDATABASE" -Fc --snapshot="$SNAP" -f /tmp/backup.dump
\o /tmp/backup.fingerprint
\i /tmp/fingerprint.sql
\o
COMMIT;
