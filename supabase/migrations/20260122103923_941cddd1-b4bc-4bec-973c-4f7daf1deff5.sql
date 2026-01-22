-- Add cost fields for each visa processing stage
ALTER TABLE visa_applications 
ADD COLUMN IF NOT EXISTS mohre_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS immigration_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tawjeeh_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS medical_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS daman_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS residence_visa_cost NUMERIC DEFAULT 0;

-- Add "not required" flags for optional stages
ALTER TABLE visa_applications
ADD COLUMN IF NOT EXISTS medical_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS daman_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS immigration_required BOOLEAN DEFAULT true;