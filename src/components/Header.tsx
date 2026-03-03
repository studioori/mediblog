import { LogOut, Shield, User, LogIn, Settings, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useState } from 'react';
import StyleConfigModal from './admin/StyleConfigModal';

const Header = () => {
  const { user, profile, isAdmin, signOut, isSignedIn, isDemo, endDemo } = useAuth();
  const navigate = useNavigate();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleExitDemo = () => {
    endDemo();
    navigate('/auth');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="w-full py-4 px-4 border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-forest flex items-center justify-center shadow-card transition-all duration-300 group-hover:shadow-glow-forest group-hover:scale-105">
            <span className="text-lg sm:text-xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">🏥</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight transition-colors duration-200">
              {profile?.center_name || 'Mediblog'}{' '}
              <span className="text-gradient-gold">글쓰기 파트너</span>
            </h1>
            <p className="text-xs text-muted-foreground transition-colors duration-200 group-hover:text-muted-foreground/80">
              🏥 환자들에게 다가가는 병원 소통 플랫폼
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-sm font-bold text-foreground tracking-tight">
              <span className="text-gradient-gold">글쓰기 파트너</span>
            </h1>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F7DBA7]/10 border border-[#F7DBA7]/20">
              <span className="text-xs font-medium text-[#F7DBA7]">
                🎭 데모 모드
              </span>
            </div>
          )}
          {isSignedIn && profile && !isAdmin && !isDemo && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
              <span className="text-xs font-medium text-muted-foreground">
                이번 달 글쓰기 {profile.current_usage}/{profile.monthly_limit}회
              </span>
            </div>
          )}
          <ThemeToggle />

          {isDemo ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExitDemo}
              className="border-[#F7DBA7]/30 text-[#F7DBA7] hover:bg-[#F7DBA7]/10"
            >
              <X className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">데모 종료</span>
            </Button>
          ) : isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{profile?.center_name || '사용자'}</span>
                    <span className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsModalOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  글쓰기 스타일 설정
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="w-4 h-4 mr-2" />
                    관리자 대시보드
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
              <LogIn className="w-4 h-4 mr-2" />
              로그인
            </Button>
          )}
        </div>
      </div>

      {/* User Settings Modal */}
      {profile && (
        <StyleConfigModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          centerName={profile.center_name}
          region={profile.region}
          department={profile.department}
          maxImageCount={profile.max_image_count}
          initialConfig={(profile as any).style_config || { styleReferenceText: '', customPrompt: '' }}
          userId={profile.clerk_id}
          initialWritingStyle={profile.writing_style}
          initialContentLength={profile.content_length}
          initialUseEmoji={profile.use_emoji}
          isDemo={isDemo}
        />
      )}
    </header>
  );
};

export default Header;
