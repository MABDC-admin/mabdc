-- Create time_shifts table for managing shift definitions
CREATE TABLE IF NOT EXISTS time_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shift_key TEXT NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE time_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for time_shifts
CREATE POLICY "Anyone can view time_shifts"
  ON time_shifts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage time_shifts"
  ON time_shifts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default shifts with correct times
INSERT INTO time_shifts (name, shift_key, start_time, end_time, is_active)
VALUES 
  ('Morning Shift', 'morning', '08:00', '17:00', true),
  ('Afternoon Shift', 'afternoon', '09:00', '18:00', true)
ON CONFLICT (shift_key) DO UPDATE
SET 
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  updated_at = NOW();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_time_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_shifts_updated_at
  BEFORE UPDATE ON time_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_time_shifts_updated_at();
