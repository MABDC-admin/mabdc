-- Add housing and transportation allowance fields to contracts table
ALTER TABLE public.contracts 
ADD COLUMN housing_allowance numeric DEFAULT 0,
ADD COLUMN transportation_allowance numeric DEFAULT 0;