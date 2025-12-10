import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trophy, Star, Zap, Flame, Award, Crown, TrendingUp,
  Medal, Target, Calendar, Clock, Users, Settings, Play,
  Gift, Sparkles, ChevronUp, ChevronDown
} from 'lucide-react';
import {
  useGamificationLeaderboard,
  useGamificationBadges,
  useGamificationConfig,
  useProcessAttendanceGamification,
  useUpdateGamificationConfig,
  getLevelInfo,
  LEVELS,
} from '@/hooks/useGamification';
import { useEmployees } from '@/hooks/useEmployees';

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    'star': <Star className="w-5 h-5" />,
    'trophy': <Trophy className="w-5 h-5" />,
    'flame': <Flame className="w-5 h-5" />,
    'crown': <Crown className="w-5 h-5" />,
    'award': <Award className="w-5 h-5" />,
    'zap': <Zap className="w-5 h-5" />,
    'trending-up': <TrendingUp className="w-5 h-5" />,
    'calendar-check': <Calendar className="w-5 h-5" />,
    'sunrise': <Clock className="w-5 h-5" />,
    'coins': <Gift className="w-5 h-5" />,
  };
  return icons[iconName] || <Award className="w-5 h-5" />;
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
};

export function GamificationView() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  const { data: leaderboard, isLoading: loadingLeaderboard } = useGamificationLeaderboard();
  const { data: badges } = useGamificationBadges();
  const { data: config } = useGamificationConfig();
  const { data: employees } = useEmployees();
  const processAttendance = useProcessAttendanceGamification();
  const updateConfig = useUpdateGamificationConfig();

  const departments = [...new Set(employees?.map(e => e.department) || [])];
  
  const filteredLeaderboard = leaderboard?.filter(item => 
    departmentFilter === 'all' || item.employees?.department === departmentFilter
  ) || [];

  const totalPoints = leaderboard?.reduce((sum, item) => sum + item.points, 0) || 0;
  const avgLevel = leaderboard?.length 
    ? Math.round(leaderboard.reduce((sum, item) => sum + item.level, 0) / leaderboard.length * 10) / 10 
    : 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            Gamification
          </h1>
          <p className="text-muted-foreground mt-1">Points, Levels & Leaderboards</p>
        </div>
        <Button 
          onClick={() => processAttendance.mutate()} 
          disabled={processAttendance.isPending}
          className="gap-2"
        >
          <Play className="w-4 h-4" />
          {processAttendance.isPending ? 'Processing...' : 'Process Attendance'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-500/20">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Zap className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Level</p>
                <p className="text-2xl font-bold">{avgLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <Users className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-2xl font-bold">{leaderboard?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-500/20">
                <Award className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badges</p>
                <p className="text-2xl font-bold">{badges?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2">
            <Award className="w-4 h-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Top 3 Podium */}
          {filteredLeaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* 2nd Place */}
              <Card className="mt-8 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-gray-300 dark:border-gray-700">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-16 h-16 border-4 border-gray-400">
                      <AvatarImage src={filteredLeaderboard[1]?.employees?.photo_url || ''} />
                      <AvatarFallback>{filteredLeaderboard[1]?.employees?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-gray-400 rounded-full p-1">
                      <Medal className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{filteredLeaderboard[1]?.employees?.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{filteredLeaderboard[1]?.employees?.department}</p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">{filteredLeaderboard[1]?.points.toLocaleString()}</span>
                  </div>
                  <Badge variant="secondary" className="mt-2">Level {filteredLeaderboard[1]?.level}</Badge>
                </CardContent>
              </Card>

              {/* 1st Place */}
              <Card className="bg-gradient-to-b from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-900/10 border-yellow-400">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-20 h-20 border-4 border-yellow-400">
                      <AvatarImage src={filteredLeaderboard[0]?.employees?.photo_url || ''} />
                      <AvatarFallback>{filteredLeaderboard[0]?.employees?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 rounded-full p-1">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold truncate">{filteredLeaderboard[0]?.employees?.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{filteredLeaderboard[0]?.employees?.department}</p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-lg">{filteredLeaderboard[0]?.points.toLocaleString()}</span>
                  </div>
                  <Badge className="mt-2 bg-yellow-500">Level {filteredLeaderboard[0]?.level}</Badge>
                </CardContent>
              </Card>

              {/* 3rd Place */}
              <Card className="mt-12 bg-gradient-to-b from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-600">
                <CardContent className="pt-6 text-center">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-14 h-14 border-4 border-amber-600">
                      <AvatarImage src={filteredLeaderboard[2]?.employees?.photo_url || ''} />
                      <AvatarFallback>{filteredLeaderboard[2]?.employees?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-amber-600 rounded-full p-1">
                      <Medal className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{filteredLeaderboard[2]?.employees?.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{filteredLeaderboard[2]?.employees?.department}</p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold">{filteredLeaderboard[2]?.points.toLocaleString()}</span>
                  </div>
                  <Badge variant="outline" className="mt-2 border-amber-600">Level {filteredLeaderboard[2]?.level}</Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Full Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
              ) : filteredLeaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gamification data yet. Click "Process Attendance" to start tracking.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLeaderboard.map((item, index) => {
                    const levelInfo = getLevelInfo(item.xp);
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors hover:bg-secondary/50 ${
                          index < 3 ? 'bg-secondary/30' : ''
                        }`}
                      >
                        <div className="w-10 flex justify-center">
                          {getRankBadge(index + 1)}
                        </div>
                        
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={item.employees?.photo_url || ''} />
                          <AvatarFallback>{item.employees?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.employees?.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.employees?.job_position} • {item.employees?.department}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Progress value={levelInfo.progressPercent} className="h-2 w-24" />
                            <span className="text-xs text-muted-foreground">
                              {item.xp} / {levelInfo.nextLevel.minXp} XP
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold">{item.points.toLocaleString()}</span>
                          </div>
                          <Badge variant="outline" className="mt-1">
                            Lv.{item.level} {item.level_name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">{item.streak_days}d streak</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Available Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges?.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      {getIconComponent(badge.icon)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{badge.name}</h4>
                      <p className="text-sm text-muted-foreground">{badge.description}</p>
                      <Badge variant="outline" className="mt-2 capitalize">
                        {badge.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Levels Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Level Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {LEVELS.map((level) => (
                  <div
                    key={level.level}
                    className="text-center p-4 rounded-lg border bg-secondary/20"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-xl font-bold text-primary">{level.level}</span>
                    </div>
                    <h4 className="font-semibold">{level.name}</h4>
                    <p className="text-sm text-muted-foreground">{level.minXp} XP</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Points Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {config?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold capitalize">
                        {item.action_type.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <Input
                          type="number"
                          value={item.points}
                          onChange={(e) => updateConfig.mutate({
                            id: item.id,
                            points: parseInt(e.target.value) || 0,
                            xp: item.xp,
                          })}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-500" />
                        <Input
                          type="number"
                          value={item.xp}
                          onChange={(e) => updateConfig.mutate({
                            id: item.id,
                            points: item.points,
                            xp: parseInt(e.target.value) || 0,
                          })}
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
