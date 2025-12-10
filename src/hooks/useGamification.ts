import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GamificationPoints {
  id: string;
  employee_id: string;
  points: number;
  xp: number;
  level: number;
  level_name: string;
  streak_days: number;
  perfect_weeks: number;
  perfect_months: number;
  created_at: string;
  updated_at: string;
  employees?: {
    full_name: string;
    photo_url: string | null;
    department: string;
    job_position: string;
  };
}

export interface GamificationTransaction {
  id: string;
  employee_id: string;
  points: number;
  xp: number;
  action_type: string;
  description: string | null;
  created_at: string;
}

export interface GamificationBadge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  points_required: number;
  condition_type: string | null;
  condition_value: number | null;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeBadge {
  id: string;
  employee_id: string;
  badge_id: string;
  earned_at: string;
  gamification_badges?: GamificationBadge;
}

export interface GamificationConfig {
  id: string;
  action_type: string;
  points: number;
  xp: number;
  description: string | null;
  is_active: boolean;
}

// Level definitions
export const LEVELS = [
  { level: 1, name: 'Starter', minXp: 0 },
  { level: 2, name: 'Rookie', minXp: 100 },
  { level: 3, name: 'Pro', minXp: 300 },
  { level: 4, name: 'Expert', minXp: 600 },
  { level: 5, name: 'Master', minXp: 1000 },
  { level: 6, name: 'Champion', minXp: 1500 },
  { level: 7, name: 'Legend', minXp: 2200 },
  { level: 8, name: 'Elite', minXp: 3000 },
  { level: 9, name: 'Mentor', minXp: 4000 },
  { level: 10, name: 'Grand Master', minXp: 5500 },
];

export function getLevelInfo(xp: number) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }
  
  const xpForCurrentLevel = currentLevel.minXp;
  const xpForNextLevel = nextLevel.minXp;
  const xpProgress = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = xpNeeded > 0 ? Math.min((xpProgress / xpNeeded) * 100, 100) : 100;
  
  return {
    currentLevel,
    nextLevel,
    xpProgress,
    xpNeeded,
    progressPercent,
    isMaxLevel: currentLevel.level === LEVELS[LEVELS.length - 1].level,
  };
}

// Fetch all employee points with leaderboard
export function useGamificationLeaderboard() {
  return useQuery({
    queryKey: ['gamification-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_points')
        .select(`
          *,
          employees (
            full_name,
            photo_url,
            department,
            job_position
          )
        `)
        .order('points', { ascending: false });
      
      if (error) throw error;
      return data as GamificationPoints[];
    },
  });
}

// Fetch single employee points
export function useEmployeeGamification(employeeId: string) {
  return useQuery({
    queryKey: ['gamification-points', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_points')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as GamificationPoints | null;
    },
    enabled: !!employeeId,
  });
}

// Fetch employee transactions
export function useEmployeeTransactions(employeeId: string) {
  return useQuery({
    queryKey: ['gamification-transactions', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_transactions')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as GamificationTransaction[];
    },
    enabled: !!employeeId,
  });
}

// Fetch all badges
export function useGamificationBadges() {
  return useQuery({
    queryKey: ['gamification-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_badges')
        .select('*')
        .eq('is_active', true)
        .order('category');
      
      if (error) throw error;
      return data as GamificationBadge[];
    },
  });
}

// Fetch employee's earned badges
export function useEmployeeBadges(employeeId: string) {
  return useQuery({
    queryKey: ['employee-badges', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_badges')
        .select(`
          *,
          gamification_badges (*)
        `)
        .eq('employee_id', employeeId)
        .order('earned_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeBadge[];
    },
    enabled: !!employeeId,
  });
}

// Fetch gamification config
export function useGamificationConfig() {
  return useQuery({
    queryKey: ['gamification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_config')
        .select('*')
        .order('action_type');
      
      if (error) throw error;
      return data as GamificationConfig[];
    },
  });
}

// Award points to employee
export function useAwardPoints() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      employeeId, 
      points, 
      xp, 
      actionType, 
      description 
    }: { 
      employeeId: string; 
      points: number; 
      xp: number; 
      actionType: string; 
      description: string;
    }) => {
      // First, get or create employee gamification record
      const { data: existing } = await supabase
        .from('gamification_points')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      
      const newPoints = (existing?.points || 0) + points;
      const newXp = (existing?.xp || 0) + xp;
      const levelInfo = getLevelInfo(newXp);
      
      // Upsert points record
      const { error: pointsError } = await supabase
        .from('gamification_points')
        .upsert({
          employee_id: employeeId,
          points: newPoints,
          xp: newXp,
          level: levelInfo.currentLevel.level,
          level_name: levelInfo.currentLevel.name,
          streak_days: existing?.streak_days || 0,
          perfect_weeks: existing?.perfect_weeks || 0,
          perfect_months: existing?.perfect_months || 0,
        }, {
          onConflict: 'employee_id',
        });
      
      if (pointsError) throw pointsError;
      
      // Add transaction record
      const { error: transError } = await supabase
        .from('gamification_transactions')
        .insert({
          employee_id: employeeId,
          points,
          xp,
          action_type: actionType,
          description,
        });
      
      if (transError) throw transError;
      
      return { newPoints, newXp, levelInfo };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-points'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-transactions'] });
    },
  });
}

// Process attendance for gamification
export function useProcessAttendanceGamification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Get config
      const { data: config } = await supabase
        .from('gamification_config')
        .select('*')
        .eq('is_active', true);
      
      if (!config) return { processed: 0 };
      
      const configMap = Object.fromEntries(config.map(c => [c.action_type, c]));
      
      // Get today's attendance records
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today);
      
      if (!attendance || attendance.length === 0) return { processed: 0 };
      
      let processed = 0;
      
      for (const record of attendance) {
        // Check if already processed today for this employee
        const { data: existingTrans } = await supabase
          .from('gamification_transactions')
          .select('id')
          .eq('employee_id', record.employee_id)
          .gte('created_at', today)
          .limit(1);
        
        if (existingTrans && existingTrans.length > 0) continue;
        
        let totalPoints = 0;
        let totalXp = 0;
        const actions: string[] = [];
        
        // On-time attendance
        if (record.status === 'Present' && record.check_in) {
          const onTimeConfig = configMap['on_time_attendance'];
          if (onTimeConfig) {
            totalPoints += onTimeConfig.points;
            totalXp += onTimeConfig.xp;
            actions.push('On-time check-in');
          }
        }
        
        // Perfect attendance day (Present with check-in and check-out)
        if (record.status === 'Present' && record.check_in && record.check_out) {
          const perfectConfig = configMap['perfect_attendance_day'];
          if (perfectConfig) {
            totalPoints += perfectConfig.points;
            totalXp += perfectConfig.xp;
            actions.push('Perfect attendance day');
          }
        }
        
        if (totalPoints > 0) {
          // Get or create employee gamification record
          const { data: existing } = await supabase
            .from('gamification_points')
            .select('*')
            .eq('employee_id', record.employee_id)
            .maybeSingle();
          
          const newPoints = (existing?.points || 0) + totalPoints;
          const newXp = (existing?.xp || 0) + totalXp;
          const levelInfo = getLevelInfo(newXp);
          const newStreak = (existing?.streak_days || 0) + 1;
          
          // Upsert points
          await supabase
            .from('gamification_points')
            .upsert({
              employee_id: record.employee_id,
              points: newPoints,
              xp: newXp,
              level: levelInfo.currentLevel.level,
              level_name: levelInfo.currentLevel.name,
              streak_days: newStreak,
              perfect_weeks: existing?.perfect_weeks || 0,
              perfect_months: existing?.perfect_months || 0,
            }, {
              onConflict: 'employee_id',
            });
          
          // Add transaction
          await supabase
            .from('gamification_transactions')
            .insert({
              employee_id: record.employee_id,
              points: totalPoints,
              xp: totalXp,
              action_type: 'attendance',
              description: actions.join(', '),
            });
          
          processed++;
        }
      }
      
      return { processed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-points'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-transactions'] });
      if (data.processed > 0) {
        toast.success(`Processed ${data.processed} attendance records for gamification`);
      }
    },
    onError: (error) => {
      toast.error('Failed to process attendance gamification');
      console.error(error);
    },
  });
}

// Update gamification config
export function useUpdateGamificationConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, points, xp }: { id: string; points: number; xp: number }) => {
      const { error } = await supabase
        .from('gamification_config')
        .update({ points, xp })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-config'] });
      toast.success('Configuration updated');
    },
    onError: () => {
      toast.error('Failed to update configuration');
    },
  });
}
