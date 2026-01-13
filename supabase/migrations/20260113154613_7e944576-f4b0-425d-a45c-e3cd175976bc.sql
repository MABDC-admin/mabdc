-- Add expiry_notification_days column to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS expiry_notification_days integer DEFAULT 30;

-- Add a comment for documentation
COMMENT ON COLUMN public.company_settings.expiry_notification_days IS 'Number of days before expiry to show notifications (default 30)';