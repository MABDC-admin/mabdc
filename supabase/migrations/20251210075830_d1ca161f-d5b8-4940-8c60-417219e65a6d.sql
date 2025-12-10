-- Drop the check constraint on leave_type since we now use dynamic leave types from leave_types table
ALTER TABLE public.leave_records DROP CONSTRAINT IF EXISTS leave_records_leave_type_check;