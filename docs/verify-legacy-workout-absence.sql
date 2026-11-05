-- READ ONLY. Run in the authorized Supabase SQL Editor for the SAME project
-- as the Android app. No ownership policy, queue, or application data is changed.
-- A normal authenticated client cannot establish global absence through RLS.
BEGIN TRANSACTION READ ONLY;

DO $verification$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = current_user AND (rolsuper OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Authoritative absence check requires an authorized role that bypasses RLS; do not interpret an empty result as absence';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'workouts' AND c.relkind IN ('r', 'p')
  ) THEN
    RAISE EXCEPTION 'public.workouts is not a base/partitioned table; inspect the deployed API relation before interpreting results';
  END IF;
END
$verification$;

SELECT current_database() AS database_name, current_user AS database_role,
       rolsuper, rolbypassrls
FROM pg_catalog.pg_roles WHERE rolname = current_user;

-- Do not add a user_id predicate: that could hide an ownership mismatch.
SELECT id, user_id
FROM public.workouts
WHERE id IN (
  'bf480eef-6ead-4965-a0af-fcd96972a40b',
  '55cd68e8-9616-4c52-8dcc-cfb45cd76e0f'
)
ORDER BY id;

COMMIT;

-- Interpret only if every statement succeeded against the correct project:
-- * No workout rows: global absence established at this read's snapshot.
-- * Owned workout visible: preserve the queue and let normal verified sync delete it.
-- * Different owner: preserve the queue and investigate the mismatch; do not delete it.
-- None of these results automatically authorizes a local mutation. Before any
-- manual cancellation, require sync idle/no in-flight upload, a fresh row preview,
-- explicit confirmation, and transactional revalidation of account, queue IDs,
-- local absence, dependencies, and the authoritative remote evidence.
