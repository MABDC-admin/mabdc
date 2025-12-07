-- Add columns for contract page images
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS page1_url TEXT,
ADD COLUMN IF NOT EXISTS page2_url TEXT;

-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for contract documents
CREATE POLICY "Public can view contract documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can update contract documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contract-documents');

CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contract-documents');