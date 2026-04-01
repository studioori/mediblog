import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ticket, Calendar, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CouponRedeemProps {
  onRedeemSuccess?: () => void;
}

const CouponRedeem = ({ onRedeemSuccess }: CouponRedeemProps) => {
  const { toast } = useToast();
  const { refreshProfile, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Convex mutation
  const redeemCoupon = useMutation('coupons:redeemCoupon' as any);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast({
        title: '입력 오류',
        description: '쿠폰 코드를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.clerk_id) {
      toast({
        title: '로그인 필요',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsRedeeming(true);

    try {
      const result = await redeemCoupon({
        userId: profile.clerk_id,
        code: code.trim(),
      });

      const expiryDate = new Date(result.newExpiresAt);
      
      toast({
        title: '🎉 이용권 등록 완료!',
        description: `이용 기간이 ${result.durationMonths}개월 연장되었습니다! 만료일: ${format(expiryDate, 'yyyy년 MM월 dd일', { locale: ko })}`,
      });

      setCode('');
      setIsOpen(false);
      
      // Refresh profile to get updated subscription info
      await refreshProfile();
      onRedeemSuccess?.();
    } catch (error) {
      console.error('Error redeeming coupon:', error);
      const errorMessage = error instanceof Error ? error.message : '쿠폰 등록 중 오류가 발생했습니다.';
      toast({
        title: '등록 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  // Format expiry date for display
  const subscriptionExpiresAt = (profile as unknown as { subscription_expires_at?: number | string })?.subscription_expires_at;
  const hasSubscription = subscriptionExpiresAt && new Date(subscriptionExpiresAt) > new Date();

  return (
    <Card className="relative overflow-hidden bg-card border-border/50 shadow-soft">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-amber-600" />
          이용권 관리
        </CardTitle>
        <CardDescription>
          이용권 쿠폰을 등록하여 서비스 이용 기간을 연장하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current subscription status */}
        {hasSubscription && (
          <div className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg px-3 py-2 border border-emerald-200 dark:border-emerald-800">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>
              만료 예정일: <strong>{format(new Date(subscriptionExpiresAt), 'yyyy년 MM월 dd일', { locale: ko })}</strong>
            </span>
          </div>
        )}

        {!hasSubscription && profile?.is_active && (
          <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>이용권을 등록하여 서비스를 계속 이용하세요</span>
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Ticket className="w-4 h-4 mr-2" />
              이용권 등록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-600" />
                이용권 등록
              </DialogTitle>
              <DialogDescription>
                관리자로부터 받은 쿠폰 코드를 입력해주세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">쿠폰 코드</Label>
                <Input
                  id="coupon-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="예: LOVE-XXXX-XXXX"
                  className="font-mono text-center text-lg tracking-wider"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRedeeming) {
                      handleRedeem();
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                취소
              </Button>
              <Button 
                onClick={handleRedeem} 
                disabled={isRedeeming}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isRedeeming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  '등록하기'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CouponRedeem;
