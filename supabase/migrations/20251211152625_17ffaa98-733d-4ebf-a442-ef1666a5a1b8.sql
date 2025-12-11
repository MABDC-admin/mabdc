-- Add 'Appealed' to the attendance status check constraint
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check CHECK (
  status IN (
    'Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday', 
    'Undertime', 'Late | Undertime', 'on_time', 'late_entry', 
    'early_out', 'late_exit', 'miss_punch_in', 'miss_punch_out', 
    'early_in', 'Missed Punch', 'Appealed'
  )
);