-- Create HR letters table for employee communications
CREATE TABLE public.hr_letters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    letter_type TEXT NOT NULL DEFAULT 'General',
    content TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'Issued',
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_letters ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (since this is accessed via unique link, not auth)
CREATE POLICY "Allow all access to hr_letters"
ON public.hr_letters
FOR ALL
USING (true)
WITH CHECK (true);