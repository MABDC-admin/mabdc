-- Create org chart positions table
CREATE TABLE public.org_chart_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  holder_name text,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.org_chart_positions(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.org_chart_positions ENABLE ROW LEVEL SECURITY;

-- Allow all access (no auth in this app)
CREATE POLICY "Allow all access to org_chart_positions" 
ON public.org_chart_positions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert default hierarchy positions
INSERT INTO public.org_chart_positions (id, title, holder_name, parent_id, sort_order, level) VALUES
  ('11111111-1111-1111-1111-111111111111', 'President', 'To be assigned', NULL, 0, 0),
  ('22222222-2222-2222-2222-222222222222', 'CEO', 'To be assigned', '11111111-1111-1111-1111-111111111111', 0, 1),
  ('33333333-3333-3333-3333-333333333333', 'COO', 'To be assigned', '22222222-2222-2222-2222-222222222222', 0, 2),
  ('44444444-4444-4444-4444-444444444444', 'HR Manager', 'To be assigned', '33333333-3333-3333-3333-333333333333', 0, 3),
  ('55555555-5555-5555-5555-555555555555', 'Finance Manager', 'To be assigned', '33333333-3333-3333-3333-333333333333', 1, 3),
  ('66666666-6666-6666-6666-666666666666', 'IT Manager', 'To be assigned', '33333333-3333-3333-3333-333333333333', 2, 3),
  ('77777777-7777-7777-7777-777777777777', 'Academic Director', 'To be assigned', '33333333-3333-3333-3333-333333333333', 3, 3),
  ('88888888-8888-8888-8888-888888888888', 'Registrar', 'To be assigned', '77777777-7777-7777-7777-777777777777', 0, 4),
  ('99999999-9999-9999-9999-999999999999', 'Faculty', 'To be assigned', '77777777-7777-7777-7777-777777777777', 1, 4),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Non Faculty', 'To be assigned', '77777777-7777-7777-7777-777777777777', 2, 4),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Safety Officer', 'To be assigned', '33333333-3333-3333-3333-333333333333', 4, 3),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Maintenance', 'To be assigned', '33333333-3333-3333-3333-333333333333', 5, 3);