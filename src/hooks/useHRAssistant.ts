import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HRAssistantRequest {
  query: string;
  conversationHistory?: ChatMessage[];
}

export interface HRAssistantResponse {
  success: boolean;
  response: string;
  timestamp: string;
  error?: string;
}

export function useHRAssistant() {
  return useMutation({
    mutationFn: async ({ query, conversationHistory = [] }: HRAssistantRequest): Promise<HRAssistantResponse> => {
      const { data, error } = await supabase.functions.invoke('qwen-hr-assistant', {
        body: {
          query,
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      if (!data.success) {
        throw new Error(data.error || 'AI request failed');
      }

      return data;
    },
  });
}
