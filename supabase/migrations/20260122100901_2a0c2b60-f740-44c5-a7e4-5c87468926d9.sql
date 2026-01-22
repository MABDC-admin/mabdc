-- Step 1: Drop the old constraint and add new one with 'Archived' status
ALTER TABLE contracts DROP CONSTRAINT contracts_status_check;

ALTER TABLE contracts ADD CONSTRAINT contracts_status_check 
CHECK (status = ANY (ARRAY['Draft'::text, 'Submitted'::text, 'Approved'::text, 'Active'::text, 'Expired'::text, 'Terminated'::text, 'Archived'::text]));

-- Step 2: Archive older contracts when an employee has multiple Active contracts
-- Keep only the contract with the latest end_date (or latest created_at if dates equal)
WITH ranked_contracts AS (
  SELECT 
    id,
    employee_id,
    end_date,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id 
      ORDER BY COALESCE(end_date, '9999-12-31') DESC, created_at DESC
    ) as rn
  FROM contracts
  WHERE status = 'Active'
)
UPDATE contracts 
SET status = 'Archived', updated_at = NOW()
WHERE id IN (
  SELECT id FROM ranked_contracts WHERE rn > 1
);