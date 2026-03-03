import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Edit, Building2, MapPin, AlertCircle, Plus, ImagePlus, ShieldCheck, Trash2, Palette, BarChart3, Clock, Mail } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsWidgets from '@/components/admin/StatsWidgets';
import GlobalActivityFeed from '@/components/admin/GlobalActivityFeed';
import StyleConfigModal from '@/components/admin/StyleConfigModal';
import UsageHistoryModal from '@/components/admin/UsageHistoryModal';
import CouponGenerator from '@/components/admin/CouponGenerator';

interface Profile {
  _id: string;
  id: string;
  email?: string;
  center_name: string;
  region?: string;
  department?: string;
  plan_tier: string;
  monthly_limit: number;
  current_usage: number;
  is_active: boolean;
  created_at: number;
  writing_tone_prompt?: string | null;
  max_image_count: number;
  style_config?: any;
  lastActive?: number | null;
  totalPosts?: number;
  // New style settings
  writing_style?: string;
  content_length?: string;
  use_emoji?: boolean;
}

interface Stats {
  totalUsers: number;
  pendingApproval: number;
  todayPosts: number;
  monthlyUsage: number;
}

const PLAN_DEFAULTS: Record<string, { monthlyLimit: number; maxImageCount: number }> = {
  trial: { monthlyLimit: 15, maxImageCount: 5 },
  basic: { monthlyLimit: 15, maxImageCount: 5 },
  premium: { monthlyLimit: 30, maxImageCount: 10 },
  free: { monthlyLimit: 5, maxImageCount: 3 },
};

const Admin = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Convex queries
  const profilesData = useQuery(
    api.admin.getProfilesWithAnalytics,
    user?.id ? { adminUserId: user.id } : 'skip'
  );

  const statsData = useQuery(
    api.admin.getAdminStats,
    user?.id ? { adminUserId: user.id } : 'skip'
  );

  // Convex mutations
  const updateProfile = useMutation(api.admin.adminUpdateProfile);
  const updateUserRole = useMutation(api.admin.adminUpdateUserRole);
  const deleteUser = useMutation(api.admin.adminDeleteUser);
  const updateEmail = useMutation(api.admin.adminUpdateEmail);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, pendingApproval: 0, todayPosts: 0, monthlyUsage: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit form state
  const [editCenterName, setEditCenterName] = useState('');
  const [editRegion, setEditRegion] = useState('');
  const [editMonthlyLimit, setEditMonthlyLimit] = useState(10);
  const [editIsActive, setEditIsActive] = useState(false);
  const [editPlanTier, setEditPlanTier] = useState('trial');
  const [editMaxImageCount, setEditMaxImageCount] = useState(5);
  const [editIsAdminRole, setEditIsAdminRole] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Delete user state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Style config modal state
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [styleModalProfile, setStyleModalProfile] = useState<Profile | null>(null);

  // Usage history modal state
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [usageModalProfile, setUsageModalProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAdmin) {
      toast({
        title: '접근 권한 없음',
        description: '관리자만 접근할 수 있는 페이지입니다.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  useEffect(() => {
    if (profilesData) {
      setProfiles(profilesData as Profile[]);
      setIsLoading(false);
    }
    if (statsData) {
      setStats(statsData as Stats);
    }
  }, [profilesData, statsData]);

  const openEditDialog = async (profile: Profile) => {
    setSelectedProfile(profile);
    setEditCenterName(profile.center_name);
    setEditRegion(profile.region || '');
    setEditMonthlyLimit(profile.monthly_limit);
    setEditIsActive(profile.is_active);
    setEditPlanTier(profile.plan_tier || 'trial');
    setEditMaxImageCount(profile.max_image_count || 5);
    setEditEmail(profile.email || '');
    setOriginalEmail(profile.email || '');
    setValidationError(null);
    setEditIsAdminRole(false);

    // Check if this user has admin role (에러 무시하고 다이얼로그 열기)
    try {
      const api = await import('../../convex/_generated/api');
      const roleData = await (api as any).admin.getUserRoleByUserId({ userId: profile.clerk_id });
      if (roleData?.role === 'admin') {
        setEditIsAdminRole(true);
      }
    } catch (e) {
      console.log('Could not fetch role, defaulting to user');
    }
    
    setIsDialogOpen(true);
  };

  const handlePlanTierChange = (newPlanTier: string) => {
    setEditPlanTier(newPlanTier);
    const defaults = PLAN_DEFAULTS[newPlanTier];
    if (defaults) {
      setEditMonthlyLimit(defaults.monthlyLimit);
      setEditMaxImageCount(defaults.maxImageCount);
    }
  };

  const handleSave = async () => {
    if (!selectedProfile || !user?.id) return;

    // Validation
    if (editIsActive) {
      if (!editCenterName.trim() || editCenterName === '내 센터') {
        setValidationError('서비스 활성화를 위해 병원명을 입력해주세요.');
        return;
      }
      if (!editRegion.trim()) {
        setValidationError('서비스 활성화를 위해 지역을 입력해주세요.');
        return;
      }
    }

    setValidationError(null);
    setIsSaving(true);

    try {
      await updateProfile({
        adminUserId: user.id,
        targetUserId: selectedProfile.id,
        updates: {
          center_name: editCenterName,
          region: editRegion,
          monthly_limit: editMonthlyLimit,
          is_active: editIsActive,
          plan_tier: editPlanTier,
          max_image_count: editMaxImageCount,
        },
      });

      // Update email if changed
      if (editEmail !== originalEmail && editEmail.trim()) {
        await updateEmail({
          adminUserId: user.id,
          targetUserId: selectedProfile.id,
          newEmail: editEmail.trim(),
        });
      }

      // Update role if changed
      if (editIsAdminRole) {
        await updateUserRole({
          adminUserId: user.id,
          targetUserId: selectedProfile.id,
          role: 'admin',
        });
      }

      toast({
        title: '저장 완료',
        description: '업체 정보가 성공적으로 업데이트되었습니다.',
      });

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: '저장 실패',
        description: '업체 정보 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !user?.id) return;

    setIsDeleting(true);
    try {
      await deleteUser({
        adminUserId: user.id,
        targetUserId: userToDelete.id,
      });

      toast({
        title: '삭제 완료',
        description: '업체가 성공적으로 삭제되었습니다.',
      });

      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: '삭제 실패',
        description: '업체 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePendingClick = () => {
    setActiveTab('companies');
  };

  const pendingProfiles = profiles.filter(p => !p.is_active);
  const activeProfiles = profiles.filter(p => p.is_active);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/20 to-background">
      <AdminHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <StatsWidgets 
          totalUsers={stats.totalUsers}
          pendingApproval={stats.pendingApproval}
          todayPosts={stats.todayPosts}
          monthlyUsage={stats.monthlyUsage}
          onPendingClick={handlePendingClick}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border/50 shadow-soft p-1 gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📊 활동 모니터링
            </TabsTrigger>
            <TabsTrigger value="companies" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🏢 업체 관리
              {stats.pendingApproval > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs">
                  {stats.pendingApproval}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="coupons" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🎟️ 쿠폰 관리
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <GlobalActivityFeed />
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            {/* Pending Approvals Section */}
            {pendingProfiles.length > 0 && (
              <Card className="relative overflow-hidden bg-card border-secondary/40 shadow-soft">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold" />
                <CardHeader className="bg-secondary/5 border-b border-secondary/20">
                  <CardTitle className="text-secondary flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    승인 대기 중인 업체 ({pendingProfiles.length})
                  </CardTitle>
                  <CardDescription className="text-secondary/70">
                    아래 업체들의 정보를 확인하고 승인해주세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>병원명</TableHead>
                        <TableHead>지역</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingProfiles.map((profile) => (
                        <TableRow key={profile.clerk_id} className="bg-secondary/5">
                          <TableCell className="font-medium">
                            {profile.center_name === '내 센터' ? (
                              <span className="text-secondary italic">미등록</span>
                            ) : (
                              profile.center_name
                            )}
                          </TableCell>
                          <TableCell>
                            {profile.region ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {profile.region}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{profile.email || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(profile.created_at), 'yyyy.MM.dd', { locale: ko })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => openEditDialog(profile)}>
                              승인하기
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Active Companies Section */}
            <Card className="bg-card border-border/50 shadow-soft">
              <CardHeader className="border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      업체 목록
                    </CardTitle>
                    <CardDescription>
                      가입한 모든 업체를 관리합니다
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>병원명</TableHead>
                      <TableHead>지역</TableHead>
                      <TableHead>사용률</TableHead>
                      <TableHead>최근 접속</TableHead>
                      <TableHead>누적 생성</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-muted-foreground/50" />
                            가입된 업체가 없습니다
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      profiles.map((profile) => {
                        const utilization = profile.monthly_limit > 0 
                          ? Math.round((profile.current_usage / profile.monthly_limit) * 100) 
                          : 0;
                        
                        return (
                          <TableRow key={profile.clerk_id} className={!profile.is_active ? 'bg-muted/20' : ''}>
                            <TableCell className="font-medium">
                              <div>
                                {profile.center_name === '내 센터' ? (
                                  <span className="text-muted-foreground italic">미등록</span>
                                ) : (
                                  profile.center_name
                                )}
                                <p className="text-xs text-muted-foreground">{profile.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {profile.region ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {profile.region}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Progress value={utilization} className="w-16 h-2" />
                                  <span className="text-sm">{utilization}%</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  ({profile.current_usage}/{profile.monthly_limit})
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {profile.lastActive ? (
                                <span className="text-sm">
                                  {formatDistanceToNow(new Date(profile.lastActive), { addSuffix: true, locale: ko })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">기록 없음</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{profile.totalPosts || 0}개</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                                {profile.is_active ? '활성' : '비활성'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setUsageModalProfile(profile);
                                    setUsageModalOpen(true);
                                  }}
                                  title="이용 통계"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setStyleModalProfile(profile);
                                    setStyleModalOpen(true);
                                  }}
                                  title="스타일 설정"
                                >
                                  <Palette className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(profile)}
                                  title="정보 수정"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setUserToDelete(profile);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="text-destructive"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coupons" className="space-y-6">
            <CouponGenerator />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>업체 정보 수정</DialogTitle>
            <DialogDescription>
              {selectedProfile?.email}의 정보를 수정합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {selectedProfile && !selectedProfile.is_active && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ 승인 대기 중인 업체입니다
                </p>
                <p className="text-xs mt-1">서비스 활성화를 위해 병원명과 지역을 입력해주세요.</p>
              </div>
            )}

            {validationError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{validationError}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-email">이메일 주소</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-center-name">병원명 *</Label>
              <Input
                id="edit-center-name"
                value={editCenterName}
                onChange={(e) => setEditCenterName(e.target.value)}
                placeholder="예: 서울치과의원"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-region">지역 *</Label>
              <Input
                id="edit-region"
                value={editRegion}
                onChange={(e) => setEditRegion(e.target.value)}
                placeholder="예: 서울 강남구"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plan">요금제</Label>
              <Select value={editPlanTier} onValueChange={handlePlanTierChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-limit">월간 한도</Label>
              <Input
                id="edit-limit"
                type="number"
                value={editMonthlyLimit}
                onChange={(e) => setEditMonthlyLimit(parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                현재 사용량: {selectedProfile?.current_usage}회
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-max-images" className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4" />
                최대 이미지 업로드 수
              </Label>
              <Input
                id="edit-max-images"
                type="number"
                value={editMaxImageCount}
                onChange={(e) => setEditMaxImageCount(parseInt(e.target.value) || 5)}
                min={1}
                max={20}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">서비스 활성화 (승인)</Label>
              <Switch
                id="edit-active"
                checked={editIsActive}
                onCheckedChange={setEditIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말로 이 업체를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              생성된 모든 글과 데이터가 영구적으로 사라집니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Style Config Modal */}
      {styleModalProfile && (
        <StyleConfigModal
          isOpen={styleModalOpen}
          onClose={() => setStyleModalOpen(false)}
          centerName={styleModalProfile.center_name}
          region={styleModalProfile.region}
          department={styleModalProfile.department}
          maxImageCount={styleModalProfile.max_image_count}
          initialConfig={styleModalProfile.style_config || { styleReferenceText: '', customPrompt: '' }}
          userId={styleModalProfile.id}
          initialWritingStyle={styleModalProfile.writing_style}
          initialContentLength={styleModalProfile.content_length}
          initialUseEmoji={styleModalProfile.use_emoji}
        />
      )}

      {/* Usage History Modal */}
      {usageModalProfile && (
        <UsageHistoryModal
          isOpen={usageModalOpen}
          onClose={() => setUsageModalOpen(false)}
          profile={{
            id: usageModalProfile.id,
            center_name: usageModalProfile.center_name,
            email: usageModalProfile.email || '',
          }}
        />
      )}
    </div>
  );
};

export default Admin;
