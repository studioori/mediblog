import React, { createContext, useContext, useCallback } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { useQuery, useMutation } from 'convex/react';
import { Profile, SimulationProfile } from '@/types/profile';

const queries = {
  getProfileByUserId: 'users:getProfileByUserId' as const,
  getUserRole: 'users:getUserRole' as const,
};

const mutations = {
  logActivity: 'users:logActivity' as const,
  createProfile: 'users:createProfile' as const,
  createOrUpdateUserRole: 'users:createOrUpdateUserRole' as const,
  linkPendingProfile: 'users:linkPendingProfile' as const,
};

interface UserRole {
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: ReturnType<typeof useUser>['user'];
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: () => void;
  signUp: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => void;
  canGenerate: boolean;
  isDemo: boolean;
  demoProfile: SimulationProfile | null;
  startDemo: (hospitalName: string, region: string) => void;
  endDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signOut: clerkSignOut, openSignIn, openSignUp } = useClerk();

  const userId = user?.id;

  // Demo mode state
  const [isDemo, setIsDemo] = React.useState(false);
  const [demoProfile, setDemoProfile] = React.useState<SimulationProfile | null>(null);

  // Start demo mode
  const startDemo = useCallback((hospitalName: string, region: string) => {
    const demoUser: SimulationProfile = {
      id: 'demo_user',
      clerk_id: 'demo_user',
      center_name: hospitalName,
      region,
      style_config: null,
      writing_style: 'warm_friendly',
      content_length: 'medium',
      use_emoji: true,
      is_active: true,
      current_usage: 0,
      monthly_limit: 9999,
      plan_tier: 'premium',
      max_image_count: 10,
    };
    setDemoProfile(demoUser);
    setIsDemo(true);
  }, []);

  // End demo mode
  const endDemo = useCallback(() => {
    setDemoProfile(null);
    setIsDemo(false);
  }, []);

  // Convex 쿼리: 프로필 조회
  const profileData = useQuery(
    queries.getProfileByUserId as any,
    userId ? { userId } : 'skip'
  );

  // Convex 쿼리: 권한 조회
  const roleData = useQuery(
    queries.getUserRole as any,
    userId ? { userId } : 'skip'
  );

  // Convex 뮤테이션: 활동 로그
  const logActivity = useMutation(mutations.logActivity as any);
  const createProfile = useMutation(mutations.createProfile as any);
  const createOrUpdateUserRole = useMutation(mutations.createOrUpdateUserRole as any);
  const linkPendingProfile = useMutation(mutations.linkPendingProfile as any);

  // 프로필 새로고침 (Convex 쿼리는 자동으로 리프레시됨)
  const refreshProfile = useCallback(() => {
    // Convex 쿼리는 반응형이므로 별도 새로고침 불필요
  }, []);

  // 로그인
  const handleSignIn = useCallback(() => {
    openSignIn();
  }, [openSignIn]);

  // 회원가입
  const handleSignUp = useCallback(() => {
    openSignUp();
  }, [openSignUp]);

  // 로그아웃
  const handleSignOut = useCallback(async () => {
    await clerkSignOut();
  }, [clerkSignOut]);

  // 프로필 데이터 변환
  const profile: Profile | null = profileData ? {
    _id: profileData._id,
    clerk_id: profileData.clerk_id,
    email: profileData.email,
    center_name: profileData.center_name,
    region: profileData.region,
    department: profileData.department,
    plan_tier: profileData.plan_tier as 'free' | 'basic' | 'premium',
    monthly_limit: profileData.monthly_limit,
    current_usage: profileData.current_usage,
    is_active: profileData.is_active,
    created_at: profileData.created_at,
    updated_at: profileData.updated_at,
    writing_tone_prompt: profileData.writing_tone_prompt ?? null,
    max_image_count: profileData.max_image_count,
    subscription_expires_at: profileData.subscription_expires_at ?? null,
    writing_style: profileData.writing_style,
    content_length: profileData.content_length,
    use_emoji: profileData.use_emoji,
    style_config: profileData.style_config,
  } : null;

  // 관리자 권한 확인
  const isAdmin = (roleData as UserRole | null)?.role === 'admin';

  // 로딩 상태
  const isLoading = !isAuthLoaded || !isUserLoaded || (isSignedIn && userId && profileData === undefined);

  // 현재 사용할 프로필 (데모 모드이면 demoProfile, 아니면 실제 profile)
  const currentProfile = isDemo ? demoProfile : profile;

  // 생성 가능 여부 확인
  const canGenerate = currentProfile
    ? (isAdmin || (currentProfile.is_active && currentProfile.current_usage < currentProfile.monthly_limit))
    : false;

  // 로그인 시 활동 로그 기록
  React.useEffect(() => {
    if (isSignedIn && userId && profileData) {
      logActivity({
        userId,
        actionType: 'LOGIN',
      }).catch(console.error);
    }
  }, [isSignedIn, userId, profileData, logActivity]);

  // 프로필이 없으면 자동 생성 또는 pending 프로필 연결
  React.useEffect(() => {
    const createOrLinkProfile = async () => {
      // 로그인되어 있고, 프로필 쿼리가 완료되었고, 프로필이 없는 경우
      if (isSignedIn && userId && user && profileData === null) {
        console.log('Profile not found, attempting to link or create for:', userId);
        
        const userEmail = user.primaryEmailAddress?.emailAddress;
        
        try {
          // 1. 먼저 pending 프로필 연결 시도
          if (userEmail) {
            console.log('Trying to link pending profile for email:', userEmail);
            const result = await linkPendingProfile({
              clerkUserId: userId,
              email: userEmail,
            });
            console.log('Link pending profile result:', result);
            
            if (result.linked || result.created) {
              // 연결되었거나 새로 생성되었으면 종료
              return;
            }
          }
          
          // 2. pending 프로필이 없으면 새로 생성
          console.log('Creating new profile for:', userId);
          const hospitalName = (user.unsafeMetadata?.hospital as string) || 
                              (user.publicMetadata?.hospital as string) || 
                              '병원명 미설정';

          const region = (user.unsafeMetadata?.region as string) || 
                        (user.publicMetadata?.region as string) || 
                        '';
          
          await createProfile({
            id: userId,
            email: userEmail || undefined,
            center_name: hospitalName,

            plan_tier: 'free',
          });
          console.log('Profile created successfully');
        } catch (error) {
          console.error('Failed to create/link profile:', error);
        }
      }
    };
    
    createOrLinkProfile();
  }, [isSignedIn, userId, user, profileData, createProfile, linkPendingProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: currentProfile as Profile | null,
        isAdmin,
        isLoading,
        isSignedIn: isSignedIn ?? false,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        refreshProfile,
        canGenerate,
        isDemo,
        demoProfile,
        startDemo,
        endDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// 기존 useAuth 훅과의 호환성을 위해 별칭 export
export { useAuthContext as useAuth };
