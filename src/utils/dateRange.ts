export type DateRange = "all" | "day" | "week" | "month" | "year";

export function getDateRangeStart(
  range: string,
  referenceDate: Date = new Date(),
): Date | null {
  const start = new Date(referenceDate);

  switch (range) {
    case "day":
    case "1d":
      start.setHours(0, 0, 0, 0);
      return start;
    case "week":
    case "1w":
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      start.setHours(0, 0, 0, 0);
      return start;
    case "month":
    case "1m":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return start;
    case "year":
    case "1y":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return start;
    default:
      return null;
  }
}
