-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', true);

-- Create storage policies for employee documents
CREATE POLICY "Anyone can view employee documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-documents');

CREATE POLICY "Anyone can upload employee documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-documents');

CREATE POLICY "Anyone can update employee documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-documents');

CREATE POLICY "Anyone can delete employee documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-documents');

-- Create employee_documents table to track uploaded files
CREATE TABLE public.employee_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT,
    category TEXT DEFAULT 'Other',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Create policy for full access
CREATE POLICY "Allow all access to employee_documents"
ON public.employee_documents
FOR ALL
USING (true)
WITH CHECK (true);

-- Add photo_url column to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url TEXT;