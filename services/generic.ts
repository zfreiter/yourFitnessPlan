import type * as SQLite from "expo-sqlite";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export const getCurrentStreak = async (
  db: SQLite.SQLiteDatabase | null
): Promise<{ workoutsMonth: number; workoutsWeek: number }> => {
  if (!db) {
    return { workoutsMonth: 0, workoutsWeek: 0 };
  }
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const startMonth = format(startOfMonth(now), "yyyy-MM-dd");
  const startWeek = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  // const endWeek = format(endOfWeek(now), "yyyy-MM-dd");
  // const endMonth = format(endOfMonth(now), "yyyy-MM-dd");

  type Result = {
    scheduled_datetime: string;
  };
  const workoutsInCurrentMonth: Result[] = await db.getAllAsync(
    `
    SELECT DISTINCT DATE(scheduled_datetime) AS scheduled_datetime
    FROM workouts 
    WHERE is_completed = 1 AND DATE(scheduled_datetime)
    BETWEEN DATE(?) AND DATE(?)
    ORDER BY DATE(scheduled_datetime) DESC
    `,
    [`${startMonth}`, `${todayStr}`]
  );

  const work = await db.getAllAsync(
    `
    SELECT *
    FROM workouts
    WHERE id = 30
    `
  );

  const workoutsInCurrentWeek = workoutsInCurrentMonth.filter(
    (element) => element.scheduled_datetime >= startWeek
  );

  return {
    workoutsMonth: workoutsInCurrentMonth.length,
    workoutsWeek: workoutsInCurrentWeek.length,
  };
};
