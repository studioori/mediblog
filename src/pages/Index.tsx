import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import PhotoUploader, { type PhotoItem } from '@/components/PhotoUploader';
import PhotoBlogResult from '@/components/PhotoBlogResult';
import RecentPostsList from '@/components/RecentPostsList';
import AdminSimulationBar, { type SimulationProfile } from '@/components/AdminSimulationBar';
import CouponRedeem from '@/components/CouponRedeem';
import FaceBlurModal from '@/components/FaceBlurModal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePhotoBlog } from '@/hooks/usePhotoBlog';
import { useHealthQA } from '@/hooks/useHealthQA';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, AlertCircle, ImageIcon, Lock, LogOut, MessageSquare, FileText } from 'lucide-react';
import HealthQAInput, { type HealthQAInputData } from '@/components/HealthQAInput';
import HealthQAResult from '@/components/HealthQAResult';

const Index = () => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [simulationProfile, setSimulationProfile] = useState<SimulationProfile | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile, canGenerate, isLoading: authLoading, isAdmin, isDemo, endDemo } = useAuth();

  // ============================================
  // 기존 병원일상 모드 (변경 없음)
  // ============================================
  const {
    isUploading,
    isGenerating,
    uploadedUrls,
    generatedBlog,
    error,
    uploadAndGenerate,
    reset,
  } = usePhotoBlog({ simulationProfile });

  const isLoading = isUploading || isGenerating;

  // ============================================
  // 건강정보 Q&A 모드 상태 및 훅 (2025-03-24 추가)
  // ============================================
  const [mode, setMode] = useState<'daily' | 'health_qa'>('daily');
  const [healthQAInputData, setHealthQAInputData] = useState<HealthQAInputData | null>(null);
  const [originalDraft, setOriginalDraft] = useState<string>('');

  const {
    isGenerating: isHealthQAGenerating,
    generatedQA,
    error: healthQAError,
    generateQA,
    reset: healthQAReset,
  } = useHealthQA({ simulationProfile });

  const isLoadingHealthQA = isHealthQAGenerating;

  // Redirect to auth if not logged in (allow demo mode)
  useEffect(() => {
    if (!authLoading && !user && !isDemo) {
      navigate('/auth');
    }
  }, [user, authLoading, isDemo, navigate]);

  // ============================================
  // 기존 병원일상 모드 핸들러 (변경 없음)
  // ============================================
  const handleGenerate = async () => {
    // Allow demo mode without login
    if (!isDemo && !user) {
      toast({
        title: '로그인이 필요합니다',
        description: '서비스를 이용하려면 먼저 로그인해주세요.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Admins and demo mode bypass approval check
    if (!isAdmin && !isDemo && !profile?.is_active) {
      toast({
        title: '서비스 이용 불가',
        description: '관리자 승인 후 이용할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    // Admins and demo mode bypass usage limit check
    if (!isAdmin && !isDemo && !canGenerate) {
      toast({
        title: '이용 횟수 초과',
        description: '이번 달 이용 횟수를 초과했습니다. 관리자에게 문의하세요.',
        variant: 'destructive',
      });
      return;
    }

    if (photos.length === 0) {
      toast({
        title: '사진을 선택해주세요',
        description: '최소 1장 이상의 사진이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    await uploadAndGenerate(photos);
  };

  const handleReset = () => {
    photos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
    reset();
  };

  // ============================================
  // 얼굴 모자이크 핸들러
  // ============================================
  const handlePhotoClick = (photo: PhotoItem) => {
    setSelectedPhoto(photo);
  };

  const handleCloseFaceBlurModal = () => {
    setSelectedPhoto(null);
  };

  const handlePhotoApply = (processedFile: File | null, photoId: string) => {
    if (processedFile) {
      const oldPreview = photos.find(p => p.id === photoId)?.preview;
      if (oldPreview) {
        URL.revokeObjectURL(oldPreview);
      }

      setPhotos(prev => prev.map(p => {
        if (p.id === photoId) {
          return {
            ...p,
            file: processedFile,
            preview: URL.createObjectURL(processedFile),
          };
        }
        return p;
      }));
    }
  };

  // ============================================
  // 건강정보 Q&A 모드 핸들러 (2025-03-24 추가)
  // ============================================
  const handleHealthQAGenerate = async (input: HealthQAInputData) => {
    // Allow demo mode without login
    if (!isDemo && !user) {
      toast({
        title: '로그인이 필요합니다',
        description: '서비스를 이용하려면 먼저 로그인해주세요.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Admins and demo mode bypass approval check
    if (!isAdmin && !isDemo && !profile?.is_active) {
      toast({
        title: '서비스 이용 불가',
        description: '관리자 승인 후 이용할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    // Admins and demo mode bypass usage limit check
    if (!isAdmin && !isDemo && !canGenerate) {
      toast({
        title: '이용 횟수 초과',
        description: '이번 달 이용 횟수를 초과했습니다. 관리자에게 문의하세요.',
        variant: 'destructive',
      });
      return;
    }

    setOriginalDraft(input.draft);
    setHealthQAInputData(input);
    await generateQA(input);
  };

  const handleHealthQAReset = () => {
    setHealthQAInputData(null);
    setOriginalDraft('');
    healthQAReset();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show inactive notice (not for admins or demo mode)
  const showInactiveNotice = user && profile && !profile.is_active && !isAdmin && !isDemo;
  const showLimitReached = user && profile && profile.is_active && !canGenerate && !isAdmin && !isDemo;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* 데모 모드 배너 */}
      {isDemo && (
        <div className="bg-gradient-to-r from-[#041F1E] to-[#083F3E] border-b border-[#F7DBA7]/20">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F7DBA7]" />
                <span className="text-sm text-[#F7DBA7] font-medium">
                  데모 모드 활성화
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  endDemo();
                  navigate('/auth');
                }}
                className="h-8 px-3 border-[#F7DBA7]/30 text-[#F7DBA7] hover:bg-[#F7DBA7]/10 text-xs"
              >
                <LogOut className="w-3 h-3 mr-1.5" />
                데모 종료
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-10">
        {/* 관리자 시뮬레이션 모드 */}
        {isAdmin && (
          <AdminSimulationBar
            selectedProfile={simulationProfile}
            onProfileSelect={setSimulationProfile}
          />
        )}

        {/* 비활성화 상태 안내 */}
        {showInactiveNotice && (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              계정이 아직 승인되지 않았습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* 사용량 초과 안내 */}
        {showLimitReached && (
          <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              이번 달 이용 횟수({profile.monthly_limit}회)를 모두 사용했습니다. 관리자에게 문의하세요.
            </AlertDescription>
          </Alert>
        )}

        {/* ============================================ */}
        {/* 모드 선택 탭 (2025-03-24 추가) */}
        {/* ============================================ */}
        {!generatedBlog && (
          <div className="animate-fade-in">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'daily' | 'health_qa')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-xl">
                <TabsTrigger
                  value="daily"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all duration-200 py-3 font-medium"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  병원일상
                </TabsTrigger>
                <TabsTrigger
                  value="health_qa"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg transition-all duration-200 py-3 font-medium"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  건강정보 Q&A
                </TabsTrigger>
              </TabsList>

              {/* 병원일상 모드 컨텐츠 */}
              <TabsContent value="daily" className="mt-6 focus-visible:outline-none">
                {/* 히어로 섹션 */}
                <div className="text-center space-y-4 sm:space-y-5 py-6 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl sm:rounded-3xl bg-gradient-forest flex items-center justify-center shadow-elevated group cursor-default transition-all duration-500 hover:shadow-glow-forest hover:scale-105 ring-4 ring-primary/10">
                    <span className="text-3xl sm:text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">🦷</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight font-display">
                      사진으로 <span className="text-gradient-gold inline-block transition-transform duration-300 hover:scale-105">건강한 이야기</span>를 만들어보세요
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground w-full leading-relaxed px-4 sm:px-0">
                      병원 활동 사진을 업로드하면,<br className="hidden sm:block"/>
                      AI가 환자들에게 전하고 싶은 따뜻한 블로그 글을 작성해 드립니다.
                    </p>
                  </div>
                </div>

                {/* 사진 업로더 */}
                {(canGenerate || isDemo) && (
                  <div className="space-y-5 animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
                    <PhotoUploader
                      photos={photos}
                      onPhotosChange={setPhotos}
                      isLoading={isLoading}
                      maxPhotos={5}
                      department={profile?.department}
                      onPhotoClick={handlePhotoClick}
                    />

                    {/* 에러 메시지 */}
                    {error && (
                      <Alert variant="destructive" className="animate-scale-in">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {/* 생성 버튼 */}
                    {photos.length > 0 && (
                      <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <Button
                          variant="forest"
                          size="xl"
                          className="w-full group relative overflow-hidden"
                          onClick={handleGenerate}
                          disabled={isLoading}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            {isUploading ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                사진 업로드 중...
                              </>
                            ) : isGenerating ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                AI가 글을 작성하고 있어요...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                                블로그 글 생성하기
                              </>
                            )}
                          </span>
                          {!isLoading && (
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* 건강정보 Q&A 모드 컨텐츠 (2025-03-24 추가) */}
              <TabsContent value="health_qa" className="mt-6 focus-visible:outline-none">
                {/* 히어로 섹션 */}
                <div className="text-center space-y-4 sm:space-y-5 py-6 sm:py-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-elevated group cursor-default transition-all duration-500 hover:shadow-lg hover:scale-105 ring-4 ring-blue-500/10">
                    <span className="text-3xl sm:text-4xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">💡</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight font-display">
                      원장님의 <span className="text-blue-500 inline-block transition-transform duration-300 hover:scale-105">Q&A 초안</span>을 블로그로!
                    </h2>
                    <p className="text-sm sm:text-base text-muted-foreground w-full leading-relaxed px-4 sm:px-0">
                      원장님이 작성하신 Q&A 초안을 붙여넣으세요.<br className="hidden sm:block"/>
                      AI가 환자들에게 읽기 쉬운 블로그 글로 다듬어드립니다.
                    </p>
                  </div>
                </div>

                {/* 결과가 없을 때: 입력 폼 */}
                {!generatedQA && (
                  <div className="space-y-5 animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
                    <HealthQAInput
                      onSubmit={handleHealthQAGenerate}
                      isLoading={isLoadingHealthQA}
                      disabled={!canGenerate && !isAdmin && !isDemo}
                    />

                    {/* 에러 메시지 */}
                    {healthQAError && (
                      <Alert variant="destructive" className="animate-scale-in">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{healthQAError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* 결과가 있을 때: 결과 표시 */}
                {generatedQA && (
                  <HealthQAResult
                    title={generatedQA.title}
                    content={generatedQA.content}
                    hashtags={generatedQA.hashtags}
                    keyPoints={generatedQA.keyPoints}
                    originalDraft={originalDraft}
                    onReset={handleHealthQAReset}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* 생성된 결과 (병원일상 모드) */}
        {generatedBlog && (
          <div className="animate-fade-in">
            <PhotoBlogResult
              title={generatedBlog.title}
              content={generatedBlog.content}
              hashtags={generatedBlog.hashtags}
              imageUrls={uploadedUrls}
              onReset={handleReset}
            />
          </div>
        )}

        {/* 이용권 등록 섹션 - 데모 모드에서는 숨김 */}
        {!generatedBlog && !generatedQA && user && !isAdmin && !isDemo && (
          <CouponRedeem />
        )}

        {/* 최근 생성된 글 목록 - 데모 모드에서는 숨김, 일반 사용자는 본인 글만, 관리자는 모든 글 표시 */}
        {!generatedBlog && !generatedQA && !isDemo && (
          <RecentPostsList />
        )}
      </main>

      {/* 얼굴 모자이크 모달 */}
      <FaceBlurModal
        isOpen={selectedPhoto !== null}
        onClose={handleCloseFaceBlurModal}
        photo={selectedPhoto}
        onApply={handlePhotoApply}
      />

      {/* 푸터 */}
      <footer className="py-10 text-center text-sm text-muted-foreground border-t border-border/30 transition-colors duration-300 hover:border-border/50">
        <p className="font-medium transition-colors duration-200 hover:text-foreground/80">© 2025 Mediblog 🏥</p>
        <p className="mt-1.5 text-muted-foreground/80">환자들에게 다가가는 병원 소통 플랫폼</p>
      </footer>
    </div>
  );
};

export default Index;
