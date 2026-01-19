-- ============================================
-- FUNCTION 1: Enhanced Leave Status Notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
  v_employee_name TEXT;
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('Approved', 'Rejected') THEN
    SELECT e.user_id, e.full_name
    INTO v_employee_user_id, v_employee_name
    FROM public.employees e
    WHERE e.id = NEW.employee_id;
    
    IF v_employee_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    INSERT INTO public.notifications (user_id, title, body, type, data, read, sent_at)
    VALUES (
      v_employee_user_id,
      CASE WHEN NEW.status = 'Approved' 
           THEN 'Leave Request Approved ✅' 
           ELSE 'Leave Request Rejected ❌' END,
      'Your ' || NEW.leave_type || ' leave from ' || 
      TO_CHAR(NEW.start_date, 'DD Mon YYYY') || ' to ' || 
      TO_CHAR(NEW.end_date, 'DD Mon YYYY') || ' has been ' || 
      LOWER(NEW.status) || COALESCE('. Reason: ' || NEW.rejection_reason, ''),
      'leave_' || LOWER(NEW.status),
      jsonb_build_object(
        'leave_id', NEW.id,
        'leave_type', NEW.leave_type,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'status', NEW.status
      ),
      false,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- FUNCTION 2: Document Expiry Notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_document_expiry()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
  v_days_until_expiry INTEGER;
  v_notification_title TEXT;
  v_notification_body TEXT;
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.employee_id IS NOT NULL THEN
    v_days_until_expiry := (NEW.expiry_date::DATE - CURRENT_DATE);
    
    IF v_days_until_expiry <= 30 THEN
      SELECT e.user_id INTO v_employee_user_id
      FROM public.employees e WHERE e.id = NEW.employee_id;
      
      IF v_employee_user_id IS NULL THEN RETURN NEW; END IF;
      
      IF v_days_until_expiry < 0 THEN
        v_notification_title := 'Document Expired ⚠️';
        v_notification_body := 'Your ' || NEW.name || ' expired ' || 
                              ABS(v_days_until_expiry) || ' days ago.';
      ELSIF v_days_until_expiry <= 7 THEN
        v_notification_title := 'Document Expiring Soon ⚠️';
        v_notification_body := 'Your ' || NEW.name || ' expires in ' || 
                              v_days_until_expiry || ' days.';
      ELSE
        v_notification_title := 'Document Expiring';
        v_notification_body := 'Your ' || NEW.name || ' expires on ' || 
                              TO_CHAR(NEW.expiry_date, 'DD Mon YYYY');
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = v_employee_user_id
          AND type = 'document_expiry'
          AND data->>'document_id' = NEW.id::TEXT
          AND sent_at > NOW() - INTERVAL '7 days'
      ) THEN
        INSERT INTO public.notifications 
        (user_id, title, body, type, data, read, sent_at)
        VALUES (v_employee_user_id, v_notification_title, v_notification_body,
                'document_expiry',
                jsonb_build_object('document_id', NEW.id, 'document_name', NEW.name,
                                   'expiry_date', NEW.expiry_date,
                                   'days_until_expiry', v_days_until_expiry),
                false, NOW());
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- FUNCTION 3: Attendance Appeal Notification
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_attendance_appeal_status()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('Approved', 'Rejected') THEN
    SELECT e.user_id INTO v_employee_user_id
    FROM public.employees e WHERE e.id = NEW.employee_id;
    
    IF v_employee_user_id IS NULL THEN RETURN NEW; END IF;
    
    INSERT INTO public.notifications 
    (user_id, title, body, type, data, read, sent_at)
    VALUES (
      v_employee_user_id,
      CASE WHEN NEW.status = 'Approved' 
           THEN 'Attendance Appeal Approved ✅' 
           ELSE 'Attendance Appeal Rejected ❌' END,
      'Your attendance appeal for ' || TO_CHAR(NEW.appeal_date, 'DD Mon YYYY') || 
      ' has been ' || LOWER(NEW.status) || 
      COALESCE('. Reason: ' || NEW.rejection_reason, ''),
      'attendance_appeal',
      jsonb_build_object(
        'appeal_id', NEW.id,
        'appeal_date', NEW.appeal_date,
        'status', NEW.status
      ),
      false,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Leave Status Trigger (replace simple version)
DROP TRIGGER IF EXISTS trigger_leave_status_notification ON public.leave_records;
DROP TRIGGER IF EXISTS leave_status_notification ON public.leave_records;
CREATE TRIGGER trigger_leave_status_notification
  AFTER UPDATE ON public.leave_records
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.notify_leave_status_change();

-- Document Expiry Triggers
DROP TRIGGER IF EXISTS trigger_document_expiry_insert ON public.employee_documents;
CREATE TRIGGER trigger_document_expiry_insert
  AFTER INSERT ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_expiry();

DROP TRIGGER IF EXISTS trigger_document_expiry_update ON public.employee_documents;
CREATE TRIGGER trigger_document_expiry_update
  AFTER UPDATE ON public.employee_documents
  FOR EACH ROW
  WHEN (NEW.expiry_date IS DISTINCT FROM OLD.expiry_date)
  EXECUTE FUNCTION public.notify_document_expiry();

-- Attendance Appeal Trigger
DROP TRIGGER IF EXISTS trigger_attendance_appeal_notification ON public.attendance_appeals;
CREATE TRIGGER trigger_attendance_appeal_notification
  AFTER UPDATE ON public.attendance_appeals
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.notify_attendance_appeal_status();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.notify_leave_status_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_document_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_attendance_appeal_status() TO authenticated;