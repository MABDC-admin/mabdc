import { supabase } from '@/integrations/supabase/client';
import { SHIFT_DEFINITIONS, ShiftType } from '@/hooks/useTimeShifts';

// Default shift if none assigned
const DEFAULT_SHIFT = { start: '08:00', end: '17:00' };

export interface ShiftTimes {
  start: string; // HH:MM
  end: string;   // HH:MM
  shiftType: ShiftType | 'default';
}

/**
 * Get the effective shift times for an employee on a specific date.
 * Priority: Override → Permanent Assignment → Default
 */
export async function getEmployeeShiftTimes(employeeId: string, date: string): Promise<ShiftTimes> {
  // Run both queries in parallel instead of sequential for better performance
  const [{ data: override }, { data: shift }] = await Promise.all([
    supabase
      .from('employee_shift_overrides')
      .select('shift_start_time, shift_end_time')
      .eq('employee_id', employeeId)
      .eq('override_date', date)
      .maybeSingle(),
    supabase
      .from('employee_shifts')
      .select('shift_type')
      .eq('employee_id', employeeId)
      .maybeSingle()
  ]);

  // Priority 1: Override
  if (override) {
    return {
      start: override.shift_start_time.substring(0, 5),
      end: override.shift_end_time.substring(0, 5),
      shiftType: 'flexible'
    };
  }

  // Priority 2: Permanent shift
  if (shift?.shift_type) {
    const shiftType = shift.shift_type as ShiftType;
    if (shiftType === 'morning' || shiftType === 'afternoon') {
      const def = SHIFT_DEFINITIONS[shiftType];
      return { start: def.start!, end: def.end!, shiftType };
    }
    if (shiftType === 'flexible') {
      return { ...DEFAULT_SHIFT, shiftType: 'flexible' };
    }
  }

  // Priority 3: Default shift
  return { ...DEFAULT_SHIFT, shiftType: 'default' };
}

/**
 * Check if current time is within the allowed check-in window (before shift end time)
 */
export function isWithinCheckInWindow(currentTime: Date, shiftEndTime: string): boolean {
  const [endHour, endMinute] = shiftEndTime.split(':').map(Number);
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Check-in is blocked if current time is past shift end time
  if (currentHour > endHour) return false;
  if (currentHour === endHour && currentMinute > endMinute) return false;
  
  return true;
}

/**
 * Format shift end time for display in error messages
 */
export function formatShiftEndForDisplay(shiftEndTime: string): string {
  const [hour, minute] = shiftEndTime.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if current time is past the shift start time (for late calculation)
 */
export function isLateForShift(currentTime: Date, shiftStartTime: string): boolean {
  const [startHour, startMinute] = shiftStartTime.split(':').map(Number);
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Late if after shift start time (comparing against actual shift start minute)
  if (currentHour > startHour) return true;
  if (currentHour === startHour && currentMinute > startMinute) return true;
  
  return false;
}

/**
 * Check if current time is before shift end (for undertime calculation)
 */
export function isUndertimeForShift(currentTime: Date, shiftEndTime: string): boolean {
  const [endHour, endMinute] = shiftEndTime.split(':').map(Number);
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Undertime if before shift end time
  if (currentHour < endHour) return true;
  if (currentHour === endHour && currentMinute < endMinute) return true;
  
  return false;
}
