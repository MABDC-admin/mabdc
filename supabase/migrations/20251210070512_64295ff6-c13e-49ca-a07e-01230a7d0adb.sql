
-- Create employee_performance table
CREATE TABLE public.employee_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  performance_type TEXT NOT NULL CHECK (performance_type IN ('Task', 'Behavioral', 'Competency', 'Result KPI', 'Adaptive/Teamwork')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_period TEXT NOT NULL,
  reviewer TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_corrective_actions table for warnings, PIP etc.
CREATE TABLE public.employee_corrective_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('Verbal Warning', 'Written Warning', 'PIP', 'Final Warning')),
  reason TEXT NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by TEXT,
  document_url TEXT,
  document_name TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Escalated')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_discipline table for misconduct and violations
CREATE TABLE public.employee_discipline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('Misconduct', 'Policy Violation', 'Written Warning', 'Suspension', 'Final Warning', 'Termination')),
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  action_taken TEXT,
  issued_by TEXT,
  document_url TEXT,
  document_name TEXT,
  suspension_start_date DATE,
  suspension_end_date DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved', 'Under Review', 'Appealed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_discipline ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all access to employee_performance" ON public.employee_performance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employee_corrective_actions" ON public.employee_corrective_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employee_discipline" ON public.employee_discipline FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_employee_performance_updated_at
BEFORE UPDATE ON public.employee_performance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
