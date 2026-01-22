-- Step 1: Remove duplicate attendance records, keeping the most recent one
DELETE FROM attendance a
USING attendance b
WHERE a.employee_id = b.employee_id 
  AND a.date = b.date 
  AND a.created_at < b.created_at;

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE attendance ADD CONSTRAINT attendance_employee_date_unique UNIQUE (employee_id, date);

-- Step 3: Bulk insert/update attendance records for Jan 5-20, 2026
INSERT INTO attendance (employee_id, date, check_in, check_out, status, admin_remarks, modified_by, modified_at)
SELECT 
  e.id as employee_id,
  d.date,
  '08:00:00'::time as check_in,
  '17:00:00'::time as check_out,
  'Present' as status,
  'Bulk override by admin' as admin_remarks,
  'System Admin' as modified_by,
  NOW() as modified_at
FROM employees e
CROSS JOIN (
  SELECT generate_series('2026-01-05'::date, '2026-01-20'::date, '1 day'::interval)::date as date
) d
WHERE e.status = 'Active'
  AND EXTRACT(DOW FROM d.date) NOT IN (5, 6)
ON CONFLICT (employee_id, date) 
DO UPDATE SET 
  check_in = EXCLUDED.check_in,
  check_out = EXCLUDED.check_out,
  status = EXCLUDED.status,
  admin_remarks = EXCLUDED.admin_remarks,
  modified_by = EXCLUDED.modified_by,
  modified_at = EXCLUDED.modified_at;