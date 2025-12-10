-- Create company_folders table
CREATE TABLE public.company_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.company_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_files table
CREATE TABLE public.company_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size TEXT,
  folder_id UUID REFERENCES public.company_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_files ENABLE ROW LEVEL SECURITY;

-- Create policies for company_folders
CREATE POLICY "Allow all access to company_folders" 
ON public.company_folders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for company_files
CREATE POLICY "Allow all access to company_files" 
ON public.company_files 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', true);

-- Create storage policies for company-documents bucket
CREATE POLICY "Company documents are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'company-documents');

CREATE POLICY "Authenticated users can upload company documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'company-documents');

CREATE POLICY "Authenticated users can update company documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'company-documents');

CREATE POLICY "Authenticated users can delete company documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'company-documents');