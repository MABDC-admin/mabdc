-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Create new policy that allows both admin and HR to manage roles
-- Admin can manage any role, HR can only create employee roles
CREATE POLICY "Admins and HR can manage employee roles" 
ON user_roles 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'hr'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'hr'::app_role) AND role = 'employee')
);