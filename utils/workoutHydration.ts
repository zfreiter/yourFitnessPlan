// Limit fan-out within a hydration operation; never acquire transaction locks here.
export async function mapSequential<T, R>(items: readonly T[], read: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (const item of items) results.push(await read(item));
  return results;
}

export function traceHydration(workoutId: string, operation: string, phase: "start" | "complete" | "failed") {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.debug("[workout-hydration]", { workoutId, operation, phase });
  }
}

export async function hydrationRead<T>(workoutId: string, operation: string, read: () => Promise<T>): Promise<T> {
  traceHydration(workoutId, operation, "start");
  try {
    const result = await read();
    traceHydration(workoutId, operation, "complete");
    return result;
  } catch (error) {
    traceHydration(workoutId, operation, "failed");
    throw error;
  }
}
