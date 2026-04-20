/**
 * Returns today's date in the given timezone as a UTC midnight Date.
 * This ensures consistent DB querying of @db.Date fields regardless
 * of where the server process is running.
 *
 * Default timezone: America/Mexico_City
 */
export function fechaUTC(tz = "America/Mexico_City"): Date {
  const localStr = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  return parseFechaUTC(localStr);
}

/**
 * Returns today's date as a 'yyyy-MM-dd' string in the given timezone.
 * Use this for display and for passing to client components.
 */
export function fechaStr(tz = "America/Mexico_City"): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

/** Convert a 'yyyy-MM-dd' string to UTC midnight Date */
export function parseFechaUTC(str: string): Date {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
