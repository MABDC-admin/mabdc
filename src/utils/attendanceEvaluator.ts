/**
 * Unified Attendance Day Evaluator
 * 
 * Single source of truth for computing attendance status.
 * Used by both MonthlyMatrixView and TimeClockView.
 * 
 * Zero grace period. Shift-aware. Appeal-aware for Missed Punch → Present conversion.
 */

export type AttendancePrimaryCode =
  | 'P' | 'A' | 'L' | 'UT' | 'L+UT' | 'MP' | 'W' | 'PH' | '-'
  | 'SL' | 'VL' | 'M' | 'SB' | 'WB' | 'LOP' | 'DO'
  | 'HDA' | 'HDSL' | 'H';

export type AppealStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface AttendanceFlags {
  late_entry: boolean;
  undertime: boolean;
  miss_punch_in: boolean;
  miss_punch_out: boolean;
  absent: boolean;
  present: boolean;
  early_in: boolean;
}

export interface AttendanceDayResult {
  primaryCode: AttendancePrimaryCode;
  flags: AttendanceFlags;
  appealStatus: AppealStatus;
}

export interface EvaluateAttendanceDayParams {
  checkIn: string | null | undefined;   // HH:MM or HH:MM:SS
  checkOut: string | null | undefined;  // HH:MM or HH:MM:SS
  shiftStart: string;                   // HH:MM
  shiftEnd: string;                     // HH:MM
  dbStatus: string | null | undefined;  // Raw status from attendance table
  appealStatus: AppealStatus;           // From attendance_appeals lookup
  isWeekend: boolean;
  isHoliday: boolean;
  leaveType: string | null | undefined; // Approved leave type string, or null
  isFuture: boolean;
  isBeforeSystemStart: boolean;
}

const DEFAULT_FLAGS: AttendanceFlags = {
  late_entry: false,
  undertime: false,
  miss_punch_in: false,
  miss_punch_out: false,
  absent: false,
  present: false,
  early_in: false,
};

function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time || time.trim() === '') return null;
  const parts = time.substring(0, 5).split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * Map a leave_type string to a primary code.
 */
function leaveTypeToCode(leaveType: string): AttendancePrimaryCode {
  const lt = leaveType.toLowerCase();
  if (lt.includes('sick')) return 'SL';
  if (lt.includes('vacation') || lt.includes('annual')) return 'VL';
  if (lt.includes('maternity')) return 'M';
  if (lt.includes('spring')) return 'SB';
  if (lt.includes('winter')) return 'WB';
  if (lt.includes('loss') || lt.includes('lop')) return 'LOP';
  if (lt.includes('day off')) return 'DO';
  if (lt.includes('half day sick')) return 'HDSL';
  if (lt.includes('half day')) return 'HDA';
  return 'VL'; // Default for any other approved leave
}

/**
 * Core evaluator — determines the attendance primary code and flags
 * for a single employee on a single day.
 * 
 * Priority:
 *   1. Approved Leave
 *   2. Weekend
 *   3. Public Holiday
 *   4. Future / Before system start → '-'
 *   5. No record → Absent
 *   6. Has record → evaluate punch data against shift times
 */
export function evaluateAttendanceDay(params: EvaluateAttendanceDayParams): AttendanceDayResult {
  const {
    checkIn, checkOut, shiftStart, shiftEnd,
    dbStatus, appealStatus, isWeekend, isHoliday,
    leaveType, isFuture, isBeforeSystemStart,
  } = params;

  const flags: AttendanceFlags = { ...DEFAULT_FLAGS };
  const result = (code: AttendancePrimaryCode): AttendanceDayResult => ({
    primaryCode: code, flags, appealStatus,
  });

  // 1. Approved Leave (takes priority over everything including weekends)
  if (leaveType) {
    flags.present = true;
    return result(leaveTypeToCode(leaveType));
  }

  // 2. Weekend
  if (isWeekend) return result('W');

  // 3. Public Holiday
  if (isHoliday) return result('PH');

  // 4. Future / before system start
  if (isFuture || isBeforeSystemStart) return result('-');

  // 5. No attendance record at all
  const hasCheckIn = checkIn && checkIn.trim() !== '';
  const hasCheckOut = checkOut && checkOut.trim() !== '';

  if (!hasCheckIn && !hasCheckOut) {
    // If there IS a db record but both punches are empty, still absent
    flags.absent = true;
    return result('A');
  }

  // 6. Evaluate punch data against shift
  const shiftStartMin = parseTimeToMinutes(shiftStart)!;
  const shiftEndMin = parseTimeToMinutes(shiftEnd)!;
  const checkInMin = parseTimeToMinutes(checkIn);
  const checkOutMin = parseTimeToMinutes(checkOut);

  // --- Missed Punch logic ---
  const isMissingPunchIn = !hasCheckIn && hasCheckOut;
  const isMissingPunchOut = hasCheckIn && !hasCheckOut;

  if (isMissingPunchIn || isMissingPunchOut) {
    if (isMissingPunchIn) flags.miss_punch_in = true;
    if (isMissingPunchOut) flags.miss_punch_out = true;

    // Appeal conversion: MP → P only if approved AND no undertime
    if (appealStatus === 'approved') {
      // Missing punch IN: we have check_out → check for undertime
      if (isMissingPunchIn && checkOutMin !== null && checkOutMin < shiftEndMin) {
        flags.undertime = true;
        flags.present = true;
        return result('UT');
      }
      flags.present = true;
      return result('P');
    }

    return result('MP');
  }

  // --- Both punches present ---
  // Chronological validation: if check_out < check_in, treat as data error → MP
  if (checkInMin !== null && checkOutMin !== null && checkOutMin < checkInMin) {
    flags.miss_punch_in = true;
    return result('MP');
  }

  // Late: check-in strictly after shift start (zero grace)
  if (checkInMin !== null && checkInMin > shiftStartMin) {
    flags.late_entry = true;
  }

  // Early in: check-in more than 60 min before shift start
  if (checkInMin !== null && checkInMin <= shiftStartMin - 60) {
    flags.early_in = true;
  }

  // Undertime: check-out strictly before shift end
  if (checkOutMin !== null && checkOutMin < shiftEndMin) {
    flags.undertime = true;
  }

  // Determine primary code
  if (flags.late_entry && flags.undertime) {
    flags.present = true;
    return result('L+UT');
  }
  if (flags.late_entry) {
    flags.present = true;
    return result('L');
  }
  if (flags.undertime) {
    flags.present = true;
    return result('UT');
  }

  // Full shift, on time
  flags.present = true;
  return result('P');
}

/**
 * Helper to resolve the effective shift times for an employee.
 * Priority: Override → Permanent Assignment → Default (08:00-17:00)
 */
export function resolveShiftTimes(
  employeeId: string,
  dateStr: string,
  shiftsMap: Map<string, string>,               // employee_id → shift_type
  overridesMap: Map<string, { start: string; end: string }>,  // key: employee_id or employee_id_date → {start, end}
  overridesByDate?: Map<string, { start: string; end: string }>,  // employee_id → {start, end} for specific date
): { start: string; end: string } {
  const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
    morning: { start: '08:00', end: '17:00' },
    afternoon: { start: '09:00', end: '18:00' },
    default: { start: '08:00', end: '17:00' },
  };

  // Check override first
  const override = overridesMap.get(employeeId) || overridesByDate?.get(employeeId);
  if (override) return override;

  // Permanent shift
  const shiftType = shiftsMap.get(employeeId);
  if (shiftType && SHIFT_TIMES[shiftType]) {
    return SHIFT_TIMES[shiftType];
  }

  // Flexible with no override → default
  return SHIFT_TIMES.default;
}
