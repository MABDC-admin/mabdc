-- Drop the existing status check constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

-- Add new status check constraint with Undertime status
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
CHECK (status = ANY (ARRAY['Present', 'Absent', 'Late', 'Half Day', 'Undertime', 'Late | Undertime']));