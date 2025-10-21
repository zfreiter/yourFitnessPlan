import { format } from "date-fns";

export const getCurrentGreetingForHour = (hour: number): string => {
  //const formattedDate = format(new Date(), "k");
  if (hour <= 0 || hour > 24) {
    return "Invalid hour";
  }

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }
  if (hour >= 17 && hour < 21) {
    return "Good evening";
  }
  return "Good night";
};

export const getCurrentGreetingForCurrentTime = (): string => {
  const hour = Number(format(new Date(), "k"));
  return getCurrentGreetingForHour(hour);
};
