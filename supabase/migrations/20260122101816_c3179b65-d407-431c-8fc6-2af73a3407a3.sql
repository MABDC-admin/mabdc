-- Part 1: Fix Jan Alfred's contract - set newest to Active
UPDATE contracts 
SET status = 'Active', updated_at = NOW()
WHERE id = '5a808e19-487a-496e-b856-a2e9bebc25ad';

-- Part 2: Drop the blocking unique constraint and create partial unique index
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_mohre_contract_no_key;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_mohre_active_unique 
ON contracts(mohre_contract_no) 
WHERE status NOT IN ('Archived', 'Expired', 'Terminated');

-- Part 3: Rescan all employees - ensure newest contract per employee is Active
WITH ranked AS (
  SELECT 
    id, employee_id, end_date, status, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id 
      ORDER BY COALESCE(end_date, '9999-12-31') DESC, created_at DESC
    ) as rn
  FROM contracts
)
UPDATE contracts c
SET status = 'Active', updated_at = NOW()
FROM ranked r
WHERE c.id = r.id 
  AND r.rn = 1 
  AND c.status != 'Active';