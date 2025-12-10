
-- Add foreign key constraints to link tables to employees
ALTER TABLE public.employee_performance 
ADD CONSTRAINT employee_performance_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.employee_corrective_actions 
ADD CONSTRAINT employee_corrective_actions_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

ALTER TABLE public.employee_discipline 
ADD CONSTRAINT employee_discipline_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
