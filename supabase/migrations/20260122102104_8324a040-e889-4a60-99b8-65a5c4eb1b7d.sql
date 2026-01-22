-- Main visa applications table
CREATE TABLE visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  visa_type TEXT NOT NULL DEFAULT 'Employment',
  current_stage TEXT NOT NULL DEFAULT 'mohre_application',
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- MOHRE Application stage fields
  mohre_status TEXT DEFAULT 'Pending',
  mohre_application_no TEXT,
  mohre_submitted_at TIMESTAMPTZ,
  mohre_approved_at TIMESTAMPTZ,
  
  -- Labour Card Payment stage fields
  labour_card_paid BOOLEAN DEFAULT false,
  labour_card_payment_date DATE,
  labour_card_amount NUMERIC,
  
  -- Immigration Processing stage fields
  immigration_status TEXT DEFAULT 'Pending',
  immigration_submitted_at TIMESTAMPTZ,
  immigration_approved_at TIMESTAMPTZ,
  immigration_expected_date DATE,
  
  -- Tawjeeh stage fields (conditional for non-skilled positions)
  tawjeeh_required BOOLEAN DEFAULT false,
  tawjeeh_completed BOOLEAN DEFAULT false,
  tawjeeh_completed_at TIMESTAMPTZ,
  
  -- Medical Examination stage fields
  medical_status TEXT DEFAULT 'Pending',
  medical_scheduled_date DATE,
  medical_completed_at TIMESTAMPTZ,
  medical_result TEXT,
  
  -- Daman Insurance stage fields
  daman_status TEXT DEFAULT 'Pending',
  daman_policy_no TEXT,
  daman_applied_at TIMESTAMPTZ,
  daman_approved_at TIMESTAMPTZ,
  
  -- Residence Visa & Emirates ID stage fields
  residence_visa_status TEXT DEFAULT 'Pending',
  residence_visa_no TEXT,
  residence_visa_applied_at TIMESTAMPTZ,
  residence_visa_stamped_at TIMESTAMPTZ,
  emirates_id_applied BOOLEAN DEFAULT false,
  emirates_id_ref_no TEXT,
  
  -- Onboarding stage fields
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_checklist JSONB DEFAULT '{}',
  
  -- Metadata
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visa stage history for audit trail
CREATE TABLE visa_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_application_id UUID NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID,
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_visa_applications_employee ON visa_applications(employee_id);
CREATE INDEX idx_visa_applications_stage ON visa_applications(current_stage);
CREATE INDEX idx_visa_stage_history_application ON visa_stage_history(visa_application_id);

-- Enable Row Level Security
ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visa_applications
CREATE POLICY "Allow all access to visa_applications" 
ON visa_applications FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS Policies for visa_stage_history
CREATE POLICY "Allow all access to visa_stage_history" 
ON visa_stage_history FOR ALL 
USING (true) 
WITH CHECK (true);

-- Enable realtime for Kanban updates
ALTER PUBLICATION supabase_realtime ADD TABLE visa_applications;

-- Create trigger for updated_at
CREATE TRIGGER update_visa_applications_updated_at
BEFORE UPDATE ON visa_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();