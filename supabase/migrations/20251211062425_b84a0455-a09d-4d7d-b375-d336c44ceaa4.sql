-- Drop the existing check constraint
ALTER TABLE public.attendance DROP CONSTRAINT attendance_status_check;

-- Add updated check constraint with "Missed Punch" status
ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check 
CHECK (status = ANY (ARRAY['Present'::text, 'Absent'::text, 'Late'::text, 'Half Day'::text, 'Undertime'::text, 'Late | Undertime'::text, 'Missed Punch'::text]));