-- Create document_types table for managing custom document types
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_arabic TEXT,
  requires_expiry BOOLEAN DEFAULT true,
  icon TEXT DEFAULT 'file',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Create policy for document_types
CREATE POLICY "Allow all access to document_types" ON public.document_types
  FOR ALL USING (true) WITH CHECK (true);

-- Add expiry_date column to employee_documents
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add document_type_id column to employee_documents
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES public.document_types(id);

-- Insert default system document types
INSERT INTO public.document_types (name, name_arabic, requires_expiry, icon, is_system) VALUES
  ('Passport', 'جواز السفر', true, 'book', true),
  ('Visa', 'تأشيرة', true, 'plane', true),
  ('Emirates ID', 'الهوية الإماراتية', true, 'credit-card', true),
  ('Work Permit', 'تصريح العمل', true, 'briefcase', true),
  ('Labor Card', 'بطاقة العمل', true, 'id-card', true),
  ('Medical Insurance', 'التأمين الصحي', true, 'heart-pulse', true),
  ('Contract', 'العقد', true, 'file-text', true),
  ('Certificate', 'شهادة', false, 'award', false),
  ('License', 'رخصة', true, 'badge', false),
  ('Other', 'أخرى', false, 'file', false);