-- Add bank details columns for WPS
ALTER TABLE public.employees
ADD COLUMN bank_name text,
ADD COLUMN iban text,
ADD COLUMN bank_account_no text;