-- Create gamification points table
CREATE TABLE public.gamification_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  level_name text NOT NULL DEFAULT 'Starter',
  streak_days integer NOT NULL DEFAULT 0,
  perfect_weeks integer NOT NULL DEFAULT 0,
  perfect_months integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id)
);

-- Create points history/transactions table
CREATE TABLE public.gamification_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  points integer NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  action_type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create badges table
CREATE TABLE public.gamification_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  category text NOT NULL DEFAULT 'general',
  points_required integer DEFAULT 0,
  condition_type text,
  condition_value integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create employee badges (earned badges)
CREATE TABLE public.employee_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.gamification_badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, badge_id)
);

-- Create points configuration table
CREATE TABLE public.gamification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL UNIQUE,
  points integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to gamification_points" ON public.gamification_points FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gamification_transactions" ON public.gamification_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gamification_badges" ON public.gamification_badges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to employee_badges" ON public.employee_badges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gamification_config" ON public.gamification_config FOR ALL USING (true) WITH CHECK (true);

-- Insert default configuration
INSERT INTO public.gamification_config (action_type, points, xp, description) VALUES
('on_time_attendance', 10, 5, 'Check-in on time'),
('perfect_attendance_day', 15, 10, 'Present full day with no issues'),
('perfect_week', 100, 50, 'Perfect attendance for a week'),
('perfect_month', 500, 250, 'Perfect attendance for a month'),
('no_late_week', 50, 25, 'No late arrivals this week'),
('streak_7_days', 75, 40, '7-day attendance streak'),
('streak_30_days', 300, 150, '30-day attendance streak'),
('early_arrival', 5, 3, 'Arrived before shift start');

-- Insert default badges
INSERT INTO public.gamification_badges (name, description, icon, category, condition_type, condition_value) VALUES
('Punctuality Star', 'No late arrivals for 7 consecutive days', 'star', 'attendance', 'no_late_streak', 7),
('Perfect Week', 'Perfect attendance for one week', 'calendar-check', 'attendance', 'perfect_week', 1),
('Perfect Month', 'Perfect attendance for one month', 'trophy', 'attendance', 'perfect_month', 1),
('Early Bird', 'Arrived early 10 times', 'sunrise', 'attendance', 'early_arrival_count', 10),
('Streak Master', '30-day attendance streak', 'flame', 'attendance', 'streak_days', 30),
('Rising Star', 'Reached Level 5', 'trending-up', 'progression', 'level', 5),
('Champion', 'Reached Level 10', 'crown', 'progression', 'level', 10),
('Point Collector', 'Earned 1000 points', 'coins', 'points', 'total_points', 1000),
('XP Hunter', 'Earned 500 XP', 'zap', 'progression', 'total_xp', 500);

-- Create updated_at trigger
CREATE TRIGGER update_gamification_points_updated_at
  BEFORE UPDATE ON public.gamification_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gamification_config_updated_at
  BEFORE UPDATE ON public.gamification_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();