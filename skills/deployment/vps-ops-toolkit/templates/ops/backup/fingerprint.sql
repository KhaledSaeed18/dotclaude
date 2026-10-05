-- Row count and content hash for every table, plus every sequence position.
-- Two databases with identical output hold identical data. Run with
-- psql -tA -F '|' so the output can be compared with diff.
\pset footer off
SELECT format(
  'SELECT %L AS tbl, count(*) AS rows, md5(coalesce(string_agg(t::text, E''\n'' ORDER BY t::text), '''')) AS hash FROM %I.%I t',
  schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename
\gexec
SELECT 'seq:' || sequencename, coalesce(last_value, 0), '' FROM pg_sequences ORDER BY 1;
