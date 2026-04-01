import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ticket, Copy, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

// Convex 쿼리/뮤테이션 문자열
const queries = {
  getAllCoupons: 'coupons:getAllCoupons' as const,
};

const mutations = {
  createCoupons: 'coupons:createCoupons' as const,
};

interface Coupon {
  _id: string;
  code: string;
  duration_months: number;
  is_used: boolean;
  used_by: string | null;
  used_at: number | null;
  created_at: number;
}

const CouponGenerator = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState('1');
  const [durationMonths, setDurationMonths] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Coupon list state
  const [showCouponList, setShowCouponList] = useState(false);

  // Fetch coupons
  const { data: couponsData, isLoading: isLoadingCoupons, refetch: refetchCoupons } = useQuery(
    queries.getAllCoupons as any,
    user?.id ? { adminUserId: user.id, includeUsed: true } : 'skip'
  );

  const createCouponsMutation = useMutation(mutations.createCoupons as any);

  type RawCoupon = {
    _id: string;
    code: string;
    duration_months: number;
    is_used: boolean;
    used_by: string | null;
    used_at: number | null;
    created_at: number;
  };

  // Generate random coupon code
  const generateRandomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = [4, 4];
    const prefix = 'LOVE';
    
    const code = segments.map(len => {
      let segment = '';
      for (let i = 0; i < len; i++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return segment;
    }).join('-');
    
    return `${prefix}-${code}`;
  };

  const handleGenerate = async () => {
    const qty = parseInt(quantity, 10);
    const months = parseInt(durationMonths, 10);

    if (isNaN(qty) || qty < 1 || qty > 100) {
      toast({
        title: '입력 오류',
        description: '발급 개수는 1~100 사이여야 합니다.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: '로그인 필요',
        description: '로그인이 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedCodes([]);

    try {
      const codes: string[] = [];
      const couponsToInsert = [];

      for (let i = 0; i < qty; i++) {
        let code = generateRandomCode();
        // Ensure unique code
        while (codes.includes(code)) {
          code = generateRandomCode();
        }
        codes.push(code);
        couponsToInsert.push({
          code,
          duration_months: months,
        });
      }

      const result = await createCouponsMutation({
        adminUserId: user.id,
        coupons: couponsToInsert,
      });

      if (result.errorCount > 0) {
        toast({
          title: '일부 생성 실패',
          description: `${result.errorCount}개의 쿠폰 생성에 실패했습니다.`,
          variant: 'destructive',
        });
      }

      setGeneratedCodes(codes);
      toast({
        title: '쿠폰 생성 완료',
        description: `${result.successCount}개의 ${months}개월 이용권이 생성되었습니다.`,
      });

      // Refresh coupon list if visible (Convex는 반응형이므로 자동으로 업데이트됨)
    } catch (error) {
      console.error('Error generating coupons:', error);
      toast({
        title: '생성 실패',
        description: '쿠폰 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: '복사됨',
        description: `${code} 가 클립보드에 복사되었습니다.`,
      });
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '클립보드 복사에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const copyAllToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCodes.join('\n'));
      toast({
        title: '전체 복사됨',
        description: `${generatedCodes.length}개의 코드가 클립보드에 복사되었습니다.`,
      });
    } catch (error) {
      toast({
        title: '복사 실패',
        description: '클립보드 복사에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleShowCouponList = () => {
    setShowCouponList(!showCouponList);
  };

  const coupons: Coupon[] = (couponsData ?? []).map((c: RawCoupon) => ({
    _id: c._id,
    code: c.code,
    duration_months: c.duration_months,
    is_used: c.is_used,
    used_by: c.used_by,
    used_at: c.used_at,
    created_at: c.created_at,
  }));

  return (
    <div className="space-y-6">
      {/* Generator Card */}
      <Card className="relative overflow-hidden bg-card border-border/50 shadow-soft">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-600" />
            이용권 생성
          </CardTitle>
          <CardDescription>
            사용자에게 지급할 이용권 쿠폰을 생성합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">발급 개수</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1~100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">이용 기간</Label>
              <Select value={durationMonths} onValueChange={setDurationMonths}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="기간 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1개월</SelectItem>
                  <SelectItem value="3">3개월</SelectItem>
                  <SelectItem value="6">6개월</SelectItem>
                  <SelectItem value="12">12개월</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4 mr-2" />
                쿠폰 생성
              </>
            )}
          </Button>

          {/* Generated Codes Display */}
          {generatedCodes.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">생성된 쿠폰 ({generatedCodes.length}개)</Label>
                <Button variant="outline" size="sm" onClick={copyAllToClipboard}>
                  <Copy className="w-3 h-3 mr-1" />
                  전체 복사
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 bg-muted/50 rounded-lg p-3">
                {generatedCodes.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-between bg-background rounded-md px-3 py-2 border border-border/50"
                  >
                    <code className="font-mono text-sm text-foreground">{code}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                      className="h-7 w-7 p-0"
                    >
                      {copiedCode === code ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coupon List Toggle */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={handleShowCouponList}>
          {showCouponList ? '쿠폰 목록 숨기기' : '쿠폰 목록 보기'}
        </Button>
      </div>

      {/* Coupon List */}
      {showCouponList && (
        <Card className="relative overflow-hidden bg-card border-border/50 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">쿠폰 목록</CardTitle>
              <CardDescription>발급된 쿠폰 현황</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingCoupons ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                발급된 쿠폰이 없습니다
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>쿠폰 코드</TableHead>
                    <TableHead>기간</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>생성일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon._id}>
                      <TableCell>
                        <code className="font-mono text-sm">{coupon.code}</code>
                      </TableCell>
                      <TableCell>{coupon.duration_months}개월</TableCell>
                      <TableCell>
                        <Badge variant={coupon.is_used ? 'secondary' : 'default'}>
                          {coupon.is_used ? '사용됨' : '미사용'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(coupon.created_at), 'yyyy.MM.dd', { locale: ko })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CouponGenerator;
