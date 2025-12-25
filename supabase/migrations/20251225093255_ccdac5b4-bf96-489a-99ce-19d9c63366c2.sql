-- Add renewal tracking columns to employee_documents
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS is_renewed BOOLEAN DEFAULT false;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ;
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS renewed_document_id UUID REFERENCES employee_documents(id);
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS previous_document_id UUID REFERENCES employee_documents(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_documents_renewed ON employee_documents(is_renewed) WHERE is_renewed = true;
CREATE INDEX IF NOT EXISTS idx_employee_documents_previous ON employee_documents(previous_document_id) WHERE previous_document_id IS NOT NULL;