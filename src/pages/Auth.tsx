import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSignIn, useSignUp, useClerk } from '@clerk/clerk-react';
import { useMutation } from 'convex/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Loader2, Mail, Lock, Building2, MapPin, Play, Sparkles } from 'lucide-react';


const REMEMBER_EMAIL_KEY = 'mediblog_remember_email';

const Auth = () => {
  const { isSignedIn, isAdmin, isLoading } = useAuth();
  const { isDemo, startDemo, endDemo } = useAuth();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const { setActive: setClerkActive } = useClerk();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Convex mutations
  const createProfile = useMutation('users:createProfile' as any);
  const createOrUpdateUserRole = useMutation('users:createOrUpdateUserRole' as any);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // 로그인 폼 상태
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  // 회원가입 폼 상태
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupHospital, setSignupHospital] = useState('');
  const [signupRegion, setSignupRegion] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Demo mode state
  const [demoHospital, setDemoHospital] = useState('서울치과의원');
  const [demoRegion, setDemoRegion] = useState('서울 강남구');
  const [demoError, setDemoError] = useState('');

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // URL 파라미터에서 탭 확인
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'signup') {
      setActiveTab('signup');
    }
  }, [searchParams]);

  // 이미 로그인된 경우 리다이렉트
  useEffect(() => {
    if (isSignedIn && !isLoading) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [isSignedIn, isAdmin, isLoading, navigate]);

  // 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded) return;

    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await signIn.create({
        identifier: loginEmail,
        password: loginPassword,
      });

      // 로그인 성공 시 세션 활성화
      if (result.status === 'complete') {
        // 이메일 기억하기 처리
        if (rememberEmail) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, loginEmail);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        
        await setClerkActive({ session: result.createdSessionId });
        // AuthContext가 자동으로 감지하여 리다이렉트
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // 세션이 이미 존재하는 경우
      if (err.errors?.[0]?.code === 'session_exists') {
        navigate('/');
        return;
      }
      
      setLoginError(
        err.errors?.[0]?.longMessage || 
        err.errors?.[0]?.message || 
        '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // 회원가입 처리
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded) return;

    setSignupError('');
    setSignupLoading(true);

    try {
      // 1. Clerk에 회원가입
      const result = await signUp.create({
        emailAddress: signupEmail,
        password: signupPassword,
        unsafeMetadata: {
          hospital: signupHospital,
          region: signupRegion,
        },
      });

      console.log('Signup result:', JSON.stringify(result, null, 2));

      // 2. Convex에 프로필 생성 (Clerk userId가 있으면 사용, 없으면 이메일 기반 임시 ID)
      const profileId = result.createdUserId || `pending_${signupEmail}`;

      try {
        await createProfile({
          id: profileId,
          email: signupEmail,
          center_name: signupHospital,
          plan_tier: 'free',
        });
        console.log('Convex profile created for:', profileId);
      } catch (convexError: any) {
        console.error('Failed to create Convex profile:', convexError);
        // 이미 존재하는 프로필이면 무시
        if (!convexError.message?.includes('이미 존재')) {
          throw convexError;
        }
      }

      // 3. 회원가입 완료 시 세션 활성화 시도
      if (result.status === 'complete' && result.createdSessionId) {
        await setClerkActive({ session: result.createdSessionId });
      }

      // 4. 회원가입 성공
      setSignupSuccess(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      setSignupError(
        err.errors?.[0]?.message ||
        '회원가입에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setSignupLoading(false);
    }
  };

  // Demo 모드 시작
  const handleStartDemo = () => {
    setDemoError('');
    if (!demoHospital.trim() || !demoRegion.trim()) {
      setDemoError('병원명과 지역을 입력해주세요.');
      return;
    }
    startDemo(demoHospital, demoRegion);
    navigate('/');
  };

  // Demo 모드 종료
  const handleEndDemo = () => {
    endDemo();
    navigate('/auth');
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin border-t-emerald-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg">🏥</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 animate-pulse">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 배경 장식 요소들 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/20 rounded-full blur-3xl"></div>

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
        {/* 브랜드 헤더 */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/25 mb-6 transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl">🏥</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
            Mediblog
          </h1>
          <p className="mt-3 text-slate-600 text-base sm:text-lg">
            환자들에게 다가가는 병원 소통 플랫폼
          </p>
        </div>

        {/* 로그인/회원가입 카드 */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden">
            {/* 카드 상단 장식선 */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>

            <div className="p-6 sm:p-8">
              {signupSuccess ? (
                // 회원가입 성공 메시지
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">회원가입 완료!</h3>
                  <p className="text-slate-600 mb-6">
                    관리자 승인 후 서비스를 이용하실 수 있습니다.
                  </p>
                  <Button
                    onClick={() => {
                      setSignupSuccess(false);
                      setActiveTab('login');
                    }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    로그인하러 가기
                  </Button>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100/80">
                    <TabsTrigger 
                      value="login"
                      className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                    >
                      로그인
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
                    >
                      회원가입
                    </TabsTrigger>
                  </TabsList>

                  {/* 로그인 탭 */}
                  <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      {loginError && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                          <AlertDescription>{loginError}</AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-slate-700 font-medium">
                          이메일
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="example@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-slate-700 font-medium">
                          비밀번호
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            required
                          />
                        </div>
                      </div>

                      {/* 이메일 기억하기 */}
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember-email" 
                          checked={rememberEmail}
                          onCheckedChange={(checked) => setRememberEmail(checked as boolean)}
                          className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <Label 
                          htmlFor="remember-email" 
                          className="text-sm text-slate-600 cursor-pointer select-none"
                        >
                          이메일 기억하기
                        </Label>
                      </div>

                      <Button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200"
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            로그인 중...
                          </>
                        ) : (
                          '로그인'
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* 회원가입 탭 */}
                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignup} className="space-y-4">
                      {signupError && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                          <AlertDescription>{signupError}</AlertDescription>
                        </Alert>
                      )}



                      <div className="space-y-2">
                        <Label htmlFor="signup-hospital" className="text-slate-700 font-medium">
                          병원명
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-hospital"
                            type="text"
                            placeholder="서울치과의원"
                            value={signupHospital}
                            onChange={(e) => setSignupHospital(e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            required
                          />
                        </div>
                      </div>



                      <div className="space-y-2">
                        <Label htmlFor="signup-region" className="text-slate-700 font-medium">
                          지역
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-region"
                            type="text"
                            placeholder="서울 강남구"
                            value={signupRegion}
                            onChange={(e) => setSignupRegion(e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-slate-700 font-medium">
                          이메일
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="example@email.com"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-slate-700 font-medium">
                          비밀번호
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="8자 이상 입력해주세요"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                            required
                            minLength={8}
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={signupLoading}
                        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200"
                      >
                        {signupLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            가입 중...
                          </>
                        ) : (
                          '회원가입'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>

        {/* 데모 모드 섹션 */}
        <div className="w-full max-w-md mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="bg-gradient-to-br from-[#041F1E] to-[#083F3E] rounded-2xl shadow-xl shadow-[#041F1E]/20 overflow-hidden border border-[#F7DBA7]/20">
            {/* 데모 모드 장식선 */}
            <div className="h-1 bg-gradient-to-r from-[#F7DBA7] via-[#EBC776] to-[#F7DBA7]"></div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F7DBA7]/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-[#F7DBA7]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F7DBA7]">데모 체험하기</h3>
                  <p className="text-xs text-[#F7DBA7]/70">로그인 없이 체험해보세요</p>
                </div>
              </div>

              {demoError && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-500/50 text-red-200">
                  <AlertDescription>{demoError}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleStartDemo(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-hospital" className="text-[#F7DBA7] font-medium text-sm">
                    병원명
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#F7DBA7]/50" />
                    <Input
                      id="demo-hospital"
                      type="text"
                      placeholder="서울치과의원"
                      value={demoHospital}
                      onChange={(e) => setDemoHospital(e.target.value)}
                      className="pl-10 h-12 bg-[#041F1E]/50 border-[#F7DBA7]/20 focus:border-[#F7DBA7] focus:ring-[#F7DBA7]/20 text-[#F7DBA7] placeholder:text-[#F7DBA7]/30"
                    />
                  </div>
                </div>



                <div className="space-y-2">
                  <Label htmlFor="demo-region" className="text-[#F7DBA7] font-medium text-sm">
                    지역
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#F7DBA7]/50" />
                    <Input
                      id="demo-region"
                      type="text"
                      placeholder="서울 강남구"
                      value={demoRegion}
                      onChange={(e) => setDemoRegion(e.target.value)}
                      className="pl-10 h-12 bg-[#041F1E]/50 border-[#F7DBA7]/20 focus:border-[#F7DBA7] focus:ring-[#F7DBA7]/20 text-[#F7DBA7] placeholder:text-[#F7DBA7]/30"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#F7DBA7] hover:bg-[#EBC776] text-[#041F1E] font-semibold rounded-xl shadow-lg shadow-[#F7DBA7]/20 hover:shadow-[#F7DBA7]/30 transition-all duration-200"
                >
                  <Sparkles className="mr-2 w-4 h-4" />
                  데모 시작하기
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50 text-sm text-slate-600">
            <span className="text-amber-500">📋</span>
            <span>회원가입 후 관리자 승인하면 서비스를 이용하실 수 있습니다</span>
          </div>
        </div>

        {/* 하단 저작권 */}
        <p className="mt-12 text-xs text-slate-400 text-center">
          © 2025 Mediblog. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Auth;
