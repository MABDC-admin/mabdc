import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VISA_STAGES, getNextStage, isNonSkilledPosition } from '@/constants/visaStages';

export interface VisaApplication {
  id: string;
  employee_id: string;
  visa_type: string;
  current_stage: string;
  stage_entered_at: string;
  
  // MOHRE
  mohre_status: string | null;
  mohre_application_no: string | null;
  mohre_submitted_at: string | null;
  mohre_approved_at: string | null;
  
  // Labour Card
  labour_card_paid: boolean | null;
  labour_card_payment_date: string | null;
  labour_card_amount: number | null;
  
  // Immigration
  immigration_status: string | null;
  immigration_submitted_at: string | null;
  immigration_approved_at: string | null;
  immigration_expected_date: string | null;
  
  // Tawjeeh
  tawjeeh_required: boolean | null;
  tawjeeh_completed: boolean | null;
  tawjeeh_completed_at: string | null;
  
  // Medical
  medical_status: string | null;
  medical_scheduled_date: string | null;
  medical_completed_at: string | null;
  medical_result: string | null;
  
  // Daman
  daman_status: string | null;
  daman_policy_no: string | null;
  daman_applied_at: string | null;
  daman_approved_at: string | null;
  
  // Residence Visa
  residence_visa_status: string | null;
  residence_visa_no: string | null;
  residence_visa_applied_at: string | null;
  residence_visa_stamped_at: string | null;
  emirates_id_applied: boolean | null;
  emirates_id_ref_no: string | null;
  
  // Onboarding
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  onboarding_checklist: Record<string, boolean> | null;
  
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  employees?: {
    id: string;
    full_name: string;
    job_position: string;
    department: string;
    photo_url: string | null;
    nationality: string | null;
  };
}

export interface VisaStageHistory {
  id: string;
  visa_application_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export const useVisaApplications = () => {
  return useQuery({
    queryKey: ['visa-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visa_applications')
        .select(`
          *,
          employees (
            id,
            full_name,
            job_position,
            department,
            photo_url,
            nationality
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VisaApplication[];
    }
  });
};

export const useVisaApplication = (id: string) => {
  return useQuery({
    queryKey: ['visa-application', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visa_applications')
        .select(`
          *,
          employees (
            id,
            full_name,
            job_position,
            department,
            photo_url,
            nationality
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as VisaApplication;
    },
    enabled: !!id
  });
};

export const useVisaStageHistory = (applicationId: string) => {
  return useQuery({
    queryKey: ['visa-stage-history', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visa_stage_history')
        .select('*')
        .eq('visa_application_id', applicationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as VisaStageHistory[];
    },
    enabled: !!applicationId
  });
};

export const useCreateVisaApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      employee_id: string;
      visa_type: string;
      tawjeeh_required?: boolean;
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('visa_applications')
        .insert({
          employee_id: data.employee_id,
          visa_type: data.visa_type,
          tawjeeh_required: data.tawjeeh_required ?? false,
          notes: data.notes,
          current_stage: 'mohre_application',
          stage_entered_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create initial history entry
      await supabase.from('visa_stage_history').insert({
        visa_application_id: result.id,
        from_stage: null,
        to_stage: 'mohre_application',
        notes: 'Visa application created'
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visa-applications'] });
      toast.success('Visa application created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create visa application: ${error.message}`);
    }
  });
};

export const useUpdateVisaApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<VisaApplication> & { id: string }) => {
      const { error } = await supabase
        .from('visa_applications')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visa-applications'] });
      toast.success('Visa application updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update visa application: ${error.message}`);
    }
  });
};

export const useMoveToNextStage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      applicationId, 
      currentStage, 
      notes,
      skipTawjeeh = false 
    }: { 
      applicationId: string; 
      currentStage: string; 
      notes?: string;
      skipTawjeeh?: boolean;
    }) => {
      let nextStage = getNextStage(currentStage);
      
      // Skip tawjeeh if not required
      if (nextStage?.id === 'tawjeeh' && skipTawjeeh) {
        nextStage = getNextStage('tawjeeh');
      }
      
      if (!nextStage) {
        throw new Error('No next stage available');
      }
      
      const { error } = await supabase
        .from('visa_applications')
        .update({
          current_stage: nextStage.id,
          stage_entered_at: new Date().toISOString()
        })
        .eq('id', applicationId);
      
      if (error) throw error;
      
      // Record history
      await supabase.from('visa_stage_history').insert({
        visa_application_id: applicationId,
        from_stage: currentStage,
        to_stage: nextStage.id,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visa-applications'] });
      toast.success('Moved to next stage');
    },
    onError: (error: Error) => {
      toast.error(`Failed to move to next stage: ${error.message}`);
    }
  });
};

export const useDeleteVisaApplication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('visa_applications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visa-applications'] });
      toast.success('Visa application deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete visa application: ${error.message}`);
    }
  });
};

// Helper to check if stage requirements are met
export const canMoveToNextStage = (application: VisaApplication): { canMove: boolean; reason?: string } => {
  const { current_stage } = application;
  
  switch (current_stage) {
    case 'mohre_application':
      if (application.mohre_status !== 'Approved') {
        return { canMove: false, reason: 'MOHRE application must be approved' };
      }
      break;
    case 'labour_card_payment':
      if (!application.labour_card_paid) {
        return { canMove: false, reason: 'Labour card payment must be completed' };
      }
      break;
    case 'immigration_processing':
      if (application.immigration_status !== 'Approved') {
        return { canMove: false, reason: 'Immigration must be approved' };
      }
      break;
    case 'tawjeeh':
      if (application.tawjeeh_required && !application.tawjeeh_completed) {
        return { canMove: false, reason: 'Tawjeeh must be completed' };
      }
      break;
    case 'medical_examination':
      if (application.medical_status !== 'Passed') {
        return { canMove: false, reason: 'Medical examination must be passed' };
      }
      break;
    case 'daman_insurance':
      if (application.daman_status !== 'Approved') {
        return { canMove: false, reason: 'Daman insurance must be approved' };
      }
      break;
    case 'residence_visa':
      if (application.residence_visa_status !== 'Stamped' || !application.emirates_id_applied) {
        return { canMove: false, reason: 'Residence visa must be stamped and Emirates ID applied' };
      }
      break;
    case 'onboarding':
      return { canMove: false, reason: 'This is the final stage' };
  }
  
  return { canMove: true };
};

// Calculate days in current stage
export const getDaysInStage = (stageEnteredAt: string): number => {
  const entered = new Date(stageEnteredAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - entered.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Get delay status for immigration stage
export const getDelayStatus = (application: VisaApplication): 'normal' | 'warning' | 'critical' | null => {
  if (application.current_stage !== 'immigration_processing') return null;
  
  const days = getDaysInStage(application.stage_entered_at);
  if (days > 60) return 'critical';
  if (days > 45) return 'warning';
  return 'normal';
};
