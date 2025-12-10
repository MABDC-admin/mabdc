import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Star, Zap, Flame, Award, Crown, TrendingUp, Medal, Gift
} from 'lucide-react';
import {
  useEmployeeGamification,
  useEmployeeBadges,
  useEmployeeTransactions,
  getLevelInfo,
} from '@/hooks/useGamification';
import { format, parseISO } from 'date-fns';

interface EmployeeGamificationCardProps {
  employeeId: string;
}

const getIconComponent = (iconName: string, className: string = "w-4 h-4") => {
  const icons: Record<string, React.ReactNode> = {
    'star': <Star className={className} />,
    'trophy': <Trophy className={className} />,
    'flame': <Flame className={className} />,
    'crown': <Crown className={className} />,
    'award': <Award className={className} />,
    'zap': <Zap className={className} />,
    'trending-up': <TrendingUp className={className} />,
    'calendar-check': <Trophy className={className} />,
    'sunrise': <Star className={className} />,
    'coins': <Gift className={className} />,
  };
  return icons[iconName] || <Award className={className} />;
};

export function EmployeeGamificationCard({ employeeId }: EmployeeGamificationCardProps) {
  const { data: gamification } = useEmployeeGamification(employeeId);
  const { data: badges } = useEmployeeBadges(employeeId);
  const { data: transactions } = useEmployeeTransactions(employeeId);

  const levelInfo = gamification ? getLevelInfo(gamification.xp) : null;

  if (!gamification) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No gamification data yet</p>
          <p className="text-sm">Points will be awarded for attendance</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{gamification.points.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground">Total Points</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className="text-lg px-3 py-1">
                Level {gamification.level}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">{gamification.level_name}</p>
            </div>
          </div>

          {/* XP Progress */}
          {levelInfo && !levelInfo.isMaxLevel && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress to Level {levelInfo.nextLevel.level}</span>
                <span className="font-medium">{gamification.xp} / {levelInfo.nextLevel.minXp} XP</span>
              </div>
              <Progress value={levelInfo.progressPercent} className="h-3" />
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-500">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{gamification.xp}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500">
                <Flame className="w-4 h-4" />
                <span className="font-bold">{gamification.streak_days}</span>
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-500">
                <Award className="w-4 h-4" />
                <span className="font-bold">{badges?.length || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Card */}
      {badges && badges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-4 h-4 text-primary" />
              Earned Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/50 border"
                  title={badge.gamification_badges?.description || ''}
                >
                  <span className="text-primary">
                    {getIconComponent(badge.gamification_badges?.icon || 'award')}
                  </span>
                  <span className="text-sm font-medium">{badge.gamification_badges?.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Recent Points Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions.slice(0, 10).map((trans) => (
                <div
                  key={trans.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">{trans.description || trans.action_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-500 font-medium">+{trans.points}</span>
                    <span className="text-muted-foreground">
                      {format(parseISO(trans.created_at), 'MMM dd')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
