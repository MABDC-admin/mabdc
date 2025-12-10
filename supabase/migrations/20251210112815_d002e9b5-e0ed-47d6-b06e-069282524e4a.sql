-- Create employee_face_data table to store face descriptors
CREATE TABLE public.employee_face_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  face_descriptor JSONB NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Enable RLS
ALTER TABLE public.employee_face_data ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to employee_face_data" 
ON public.employee_face_data 
FOR ALL 
USING (true)
WITH CHECK (true);