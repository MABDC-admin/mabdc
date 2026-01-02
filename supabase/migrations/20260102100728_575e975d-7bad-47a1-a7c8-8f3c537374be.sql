-- Drop old constraint and add new one with additional status values
ALTER TABLE public.attendance DROP CONSTRAINT attendance_status_check;

ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check CHECK (
  status = ANY (ARRAY[
    'Present'::text, 
    'Absent'::text, 
    'Late'::text, 
    'Half Day'::text, 
    'On Leave'::text, 
    'Holiday'::text, 
    'Undertime'::text, 
    'Late | Undertime'::text, 
    'on_time'::text, 
    'late_entry'::text, 
    'early_out'::text, 
    'late_exit'::text, 
    'miss_punch_in'::text, 
    'miss_punch_out'::text, 
    'early_in'::text, 
    'Missed Punch'::text, 
    'Appealed'::text,
    'Miss Punch In'::text,
    'Miss Punch In | Undertime'::text
  ])
);