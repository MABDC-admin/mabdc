-- Create company_settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'MABDC',
  company_name_arabic TEXT,
  trade_license_no TEXT,
  tax_registration_no TEXT,
  establishment_id TEXT,
  mol_id TEXT,
  address TEXT,
  city TEXT DEFAULT 'Dubai',
  emirate TEXT DEFAULT 'Dubai',
  country TEXT DEFAULT 'UAE',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  work_week_start TEXT DEFAULT 'Sunday',
  work_week_end TEXT DEFAULT 'Thursday',
  work_hours_per_day NUMERIC(4,2) DEFAULT 8,
  overtime_rate NUMERIC(4,2) DEFAULT 1.25,
  leave_year_start TEXT DEFAULT '01-01',
  currency TEXT DEFAULT 'AED',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table for calendar
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'General' CHECK (event_type IN ('General', 'Meeting', 'Training', 'Holiday', 'Company')),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#7c3aed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to company_settings" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to events" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- Insert default company settings
INSERT INTO public.company_settings (company_name, company_name_arabic, city, emirate) 
VALUES ('MABDC', 'م.أ.ب.د.س', 'Dubai', 'Dubai');

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();