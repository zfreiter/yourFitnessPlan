import { getDB } from "@/services/database";

export const META_KEYS = {
  EXERCISES_SYNCED_AT: "exercises_synced_at",
  WORKOUTS_SYNCED_AT: "workouts_synced_at",
  SCHEMA_VERSION: "schema_version",
  USER_ID: "last_known_user_id",
} as const;

export const getMeta = async (key: string): Promise<string | null> => {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
};

export const setMeta = async (key: string, value: string): Promise<void> => {
  const db = await getDB();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    [key, value],
  );
};

export const deleteMeta = async (key: string): Promise<void> => {
  const db = await getDB();
  await db.runAsync("DELETE FROM app_meta WHERE key = ?", [key]);
};

const CURRENT_SCHEMA_VERSION = "1";

export const runMigrations = async () => {
  const raw = await getMeta(META_KEYS.SCHEMA_VERSION);
  let version = raw ? parseInt(raw) : 0;

  if (version === 0) {
    version = 1;
  }

  await setMeta(META_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
};
