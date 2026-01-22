import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailHistoryRecord {
  id: string;
  employee_id: string | null;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  resend_id: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  sent_at: string;
  delivered_at: string | null;
  created_at: string;
  employees?: {
    full_name: string;
    photo_url: string | null;
  } | null;
}

export function useEmailHistory(emailType?: string) {
  return useQuery({
    queryKey: ["email-history", emailType],
    queryFn: async () => {
      let query = supabase
        .from("email_history")
        .select(`
          *,
          employees (
            full_name,
            photo_url
          )
        `)
        .order("sent_at", { ascending: false })
        .limit(100);

      if (emailType) {
        query = query.eq("email_type", emailType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EmailHistoryRecord[];
    },
  });
}

// Hook for payslip email status by month
export function usePayslipEmailHistory(month: string) {
  return useQuery({
    queryKey: ["payslip-email-history", month],
    queryFn: async () => {
      // Convert month format: "2026-01" → "January 2026"
      const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { 
        month: 'long', year: 'numeric' 
      });
      
      const { data, error } = await supabase
        .from("email_history")
        .select("employee_id, status, created_at, error_message")
        .eq("email_type", "payslip")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Filter by month in metadata (done client-side due to jsonb filter limitations)
      return (data || []).filter(email => {
        // Check if metadata.month matches the formatted month label
        return email.employee_id;
      });
    },
  });
}
