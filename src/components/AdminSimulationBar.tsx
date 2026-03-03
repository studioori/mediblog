import { useQuery } from 'convex/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FlaskConical, X, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Convex 쿼리 문자열
const queries = {
  getAdminUserIds: 'admin:getAdminUserIds' as const,
  getAllProfiles: 'admin:getAllProfiles' as const,
};

export interface SimulationProfile {
  id: string;
  center_name: string;
  region: string;
  department?: string;
  writing_tone_prompt: string | null;
  style_config: any;
  max_image_count: number;
}

interface AdminSimulationBarProps {
  onProfileSelect: (profile: SimulationProfile | null) => void;
  selectedProfile: SimulationProfile | null;
}

const AdminSimulationBar = ({ onProfileSelect, selectedProfile }: AdminSimulationBarProps) => {
  const { user } = useAuth();

  // Fetch admin user IDs
  const adminUserIds = useQuery(queries.getAdminUserIds as any);

  // Fetch all active profiles
  const allProfiles = useQuery(
    queries.getAllProfiles as any,
    user?.id ? { adminUserId: user.id } : 'skip'
  );

  const isLoading = adminUserIds === undefined || allProfiles === undefined;

  // Filter active profiles and exclude admins
  const profiles: SimulationProfile[] = (allProfiles || [])
    .filter(p => p.is_active && !adminUserIds?.includes(p.id))
    .map(p => ({
      id: p.id,
      center_name: p.center_name,
      region: p.region || '',
      department: p.department,
      writing_tone_prompt: p.writing_tone_prompt || null,
      style_config: p.style_config,
      max_image_count: p.max_image_count,
    }));

  const handleSelectChange = (value: string) => {
    if (value === 'none') {
      onProfileSelect(null);
    } else {
      const profile = profiles.find(p => p.id === value);
      onProfileSelect(profile || null);
    }
  };

  const handleClearSimulation = () => {
    onProfileSelect(null);
  };

  return (
    <div className="space-y-3">
      {/* Simulation Selector */}
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              🧪 관리자 시뮬레이션 모드
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              특정 업체의 설정으로 글 생성을 테스트합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">업체 목록 로딩 중...</span>
            </div>
          ) : (
            <>
              <Select
                value={selectedProfile?.id || 'none'}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="테스트할 업체 선택..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 z-50">
                  <SelectItem value="none">
                    <span className="text-slate-500">-- 직접 입력 모드 (내 계정) --</span>
                  </SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.clerk_id} value={profile.clerk_id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{profile.center_name}</span>
                        {profile.region && (
                          <span className="text-slate-400">({profile.region})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSimulation}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Active Simulation Banner */}
      {selectedProfile && (
        <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/30 animate-fade-in">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              📢 현재 <strong>{selectedProfile.center_name}</strong>
              {selectedProfile.region && ` (${selectedProfile.region})`}의 설정으로 시뮬레이션 중입니다.
            </span>
            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300 ml-2">
              시뮬레이션
            </Badge>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AdminSimulationBar;
