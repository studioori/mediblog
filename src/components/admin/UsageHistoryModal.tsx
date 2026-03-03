import { useQuery } from 'convex/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, FileText, TrendingUp, Calendar } from 'lucide-react';
import { format, formatDistanceToNow, parseISO, getHours } from 'date-fns';
import { ko } from 'date-fns/locale';

// Convex 쿼리 문자열
const queries = {
  getActivityLogsByUser: 'admin:getActivityLogsByUser' as const,
  getPostCountByUser: 'posts:getPostCountByUser' as const,
};

interface ActivityLog {
  _id: string;
  action_type: string;
  created_at: number;
}

interface UsageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    clerk_id: string;
    center_name: string;
    email: string;
  } | null;
}

const UsageHistoryModal = ({ isOpen, onClose, profile }: UsageHistoryModalProps) => {
  // Fetch activity logs
  const logsData = useQuery(
    queries.getActivityLogsByUser as any,
    profile?.clerk_id ? { userId: profile.clerk_id, limit: 50 } : 'skip'
  );

  // Fetch total posts count
  const totalPosts = useQuery(
    queries.getPostCountByUser as any,
    profile?.clerk_id ? { userId: profile.clerk_id } : 'skip'
  );

  // Transform logs
  const logs: ActivityLog[] = (logsData || []).map((log: any) => ({
    _id: log._id,
    action_type: log.action_type,
    created_at: log.created_at,
  }));

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return { label: '로그인', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'GENERATE_POST':
        return { label: '글 생성', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case 'COPY_CONTENT':
        return { label: '내용 복사', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-600' };
    }
  };

  const getUsageInsight = () => {
    if (logs.length === 0) return '아직 활동 기록이 없습니다.';

    const generateLogs = logs.filter(l => l.action_type === 'GENERATE_POST');
    if (generateLogs.length === 0) return '아직 글 생성 기록이 없습니다.';

    // Analyze peak hours
    const hourCounts: Record<number, number> = {};
    generateLogs.forEach(log => {
      const hour = getHours(new Date(log.created_at));
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
    if (peakHour) {
      const hourNum = parseInt(peakHour[0]);
      const period = hourNum < 12 ? '오전' : '오후';
      const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      return `주로 ${period} ${displayHour}시~${displayHour + 2}시 사이에 이용하는 업체입니다.`;
    }

    return '이용 패턴을 분석 중입니다.';
  };

  const loginLogs = logs.filter(l => l.action_type === 'LOGIN').slice(0, 10);
  const activityLogs = logs.filter(l => l.action_type !== 'LOGIN');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            이용 통계
          </DialogTitle>
          <DialogDescription>
            {profile?.center_name} ({profile?.email})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPosts || 0}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">누적 생성 글</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{loginLogs.length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">최근 접속 횟수</p>
              </div>
            </div>

            {/* Insight */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {getUsageInsight()}
              </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="activity" className="flex-1">활동 로그</TabsTrigger>
                <TabsTrigger value="logins" className="flex-1">접속 이력</TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <ScrollArea className="h-[300px]">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      활동 기록이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {activityLogs.map((log) => {
                        const action = getActionLabel(log.action_type);
                        return (
                          <div
                            key={log._id}
                            className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <Badge className={action.color}>{action.label}</Badge>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="logins">
                <ScrollArea className="h-[300px]">
                  {loginLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      접속 기록이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {loginLogs.map((log) => (
                        <div
                          key={log._id}
                          className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-300">로그인</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UsageHistoryModal;
