-- Create leave-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-attachments', 'leave-attachments', true);

-- RLS Policy: Allow authenticated users to upload leave attachments
CREATE POLICY "Users can upload leave attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leave-attachments');

-- RLS Policy: Allow authenticated users to view all leave attachments
CREATE POLICY "Users can view leave attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'leave-attachments');

-- RLS Policy: Allow users to delete their own leave attachments
CREATE POLICY "Users can delete own leave attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leave-attachments');