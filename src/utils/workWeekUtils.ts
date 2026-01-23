/**
 * Work Week Utility Functions
 * 
 * Calculates weekend days dynamically based on company settings
 * instead of hardcoded UAE weekends.
 */

const DAY_NAME_TO_NUMBER: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

const DAY_NUMBER_TO_NAME: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

/**
 * Get the weekend days (0-6) based on company work week settings
 * 
 * @param workWeekStart - Start day of work week (e.g., "Monday", "Sunday")
 * @param workWeekEnd - End day of work week (e.g., "Friday", "Thursday")
 * @returns Array of day numbers that are weekends (0=Sunday, 6=Saturday)
 * 
 * Examples:
 * - workWeekStart="Monday", workWeekEnd="Friday" => [0, 6] (Sat, Sun are weekends)
 * - workWeekStart="Sunday", workWeekEnd="Thursday" => [5, 6] (Fri, Sat are weekends)
 */
export function getWeekendDays(
  workWeekStart: string = 'Monday',
  workWeekEnd: string = 'Friday'
): number[] {
  const startDay = DAY_NAME_TO_NUMBER[workWeekStart];
  const endDay = DAY_NAME_TO_NUMBER[workWeekEnd];
  
  // If invalid settings, default to Sat/Sun weekends
  if (startDay === undefined || endDay === undefined) {
    return [0, 6];
  }
  
  // Calculate working days (may wrap around week)
  const workingDays: number[] = [];
  let current = startDay;
  
  // Safety limit to prevent infinite loop
  for (let i = 0; i < 7; i++) {
    workingDays.push(current);
    if (current === endDay) break;
    current = (current + 1) % 7;
  }
  
  // Weekend = all days NOT in working days
  return [0, 1, 2, 3, 4, 5, 6].filter(d => !workingDays.includes(d));
}

/**
 * Check if a given date falls on a weekend day
 * 
 * @param date - The date to check
 * @param workWeekStart - Start day of work week
 * @param workWeekEnd - End day of work week
 * @returns true if the date is a weekend
 */
export function isWeekendDay(
  date: Date,
  workWeekStart: string = 'Monday',
  workWeekEnd: string = 'Friday'
): boolean {
  const weekendDays = getWeekendDays(workWeekStart, workWeekEnd);
  return weekendDays.includes(date.getDay());
}

/**
 * Check if a given date is a working day
 * 
 * @param date - The date to check
 * @param workWeekStart - Start day of work week
 * @param workWeekEnd - End day of work week
 * @returns true if the date is a working day
 */
export function isWorkingDay(
  date: Date,
  workWeekStart: string = 'Monday',
  workWeekEnd: string = 'Friday'
): boolean {
  return !isWeekendDay(date, workWeekStart, workWeekEnd);
}

/**
 * Get formatted weekend label for display
 * 
 * @param workWeekStart - Start day of work week
 * @param workWeekEnd - End day of work week
 * @returns Human-readable weekend description (e.g., "Sat-Sun", "Fri-Sat")
 */
export function getWeekendLabel(
  workWeekStart: string = 'Monday',
  workWeekEnd: string = 'Friday'
): string {
  const weekendDays = getWeekendDays(workWeekStart, workWeekEnd);
  
  if (weekendDays.length === 0) return 'None';
  if (weekendDays.length === 1) return DAY_NUMBER_TO_NAME[weekendDays[0]].slice(0, 3);
  
  // Sort for consistent display
  const sorted = [...weekendDays].sort((a, b) => a - b);
  const labels = sorted.map(d => DAY_NUMBER_TO_NAME[d].slice(0, 3));
  
  return labels.join('-');
}
