import { useState } from 'react';
import { useQuery } from 'convex/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

// Convex 쿼리 문자열
const queries = {
  getAllPosts: 'admin:getAllPosts' as const,
  getAllProfiles: 'admin:getAllProfiles' as const,
};

interface Post {
  _id: string;
  content: string;
  image_paths: string[];
  created_at: number;
  user_id: string;
  center_name: string;
  region: string;
}

// 이미지 플레이스홀더를 실제 이미지로 치환하여 블로그 스타일로 렌더링
const parseStoryBlocks = (content: string, imagePaths: string[]) => {
  if (!content) return [];
  
  // HTML 태그 제거하고 순수 텍스트로 처리
  let textContent = content.replace(/<[^>]*>/g, '');
  
  // 이미지 플레이스홀더 패턴들을 마커로 치환
  const imageMarkers: { index: number; imageIndex: number }[] = [];
  
  imagePaths.forEach((_, imgIndex) => {
    const patterns = [
      `[사진 ${imgIndex + 1}]`,
      `(사진 ${imgIndex + 1})`,
      `[이미지 ${imgIndex + 1}]`,
      `[IMAGE_PLACEHOLDER_${imgIndex + 1}]`,
      `(사진${imgIndex + 1})`,
      `[사진${imgIndex + 1}]`,
    ];
    
    patterns.forEach(pattern => {
      const idx = textContent.indexOf(pattern);
      if (idx !== -1) {
        textContent = textContent.replace(pattern, `__IMG_${imgIndex}__`);
      }
    });
  });
  
  // 마커를 기준으로 분할
  const parts = textContent.split(/__IMG_(\d+)__/);
  const blocks: Array<{ type: 'text' | 'image'; content: string }> = [];
  
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      // 홀수 인덱스는 이미지 인덱스 번호
      const imgIndex = parseInt(part);
      if (imagePaths[imgIndex]) {
        blocks.push({ type: 'image', content: imagePaths[imgIndex] });
      }
    } else if (part.trim()) {
      // 짝수 인덱스는 텍스트
      blocks.push({ type: 'text', content: part });
    }
  });
  
  // 만약 마커가 없었다면 (이미지가 본문에 삽입되지 않은 경우) 이미지를 앞에 배치
  if (blocks.every(b => b.type === 'text') && imagePaths.length > 0) {
    const textBlocks = [...blocks];
    blocks.length = 0;
    imagePaths.forEach(path => {
      blocks.push({ type: 'image', content: path });
    });
    blocks.push(...textBlocks);
  }
  
  return blocks;
};

const GlobalActivityFeed = () => {
  const { user, isAdmin } = useAuth();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const postsData = useQuery(
    queries.getAllPosts as any,
    { limit: 50 }
  );

  const profilesData = useQuery(
    queries.getAllProfiles as any,
    user?.id ? { adminUserId: user.id } : 'skip'
  );

  const isLoading = postsData === undefined || profilesData === undefined;

  // Create profiles map
  const profilesMap: Record<string, { center_name: string; region: string }> = {};
  (profilesData || []).forEach(p => {
    profilesMap[p.id] = { center_name: p.center_name, region: p.region || '' };
  });

  // Enrich posts with profile info
  const posts: Post[] = (postsData || []).map((post: any) => ({
    _id: post._id,
    content: post.content,
    image_paths: post.image_paths || [],
    created_at: post.created_at,
    user_id: post.user_id,
    center_name: profilesMap[post.user_id]?.center_name || '알 수 없음',
    region: profilesMap[post.user_id]?.region || '',
  }));

  const openPostModal = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const getPreviewText = (content: string) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ');
    return cleanContent.length > 50 ? cleanContent.substring(0, 50) + '...' : cleanContent;
  };

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden bg-card border-border/50 shadow-soft">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-forest" />
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative overflow-hidden bg-card border-border/50 shadow-soft">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-forest" />
        <CardHeader className="border-b border-border/30">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            전체 생성글 모니터링
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            모든 업체에서 생성된 최근 50개의 글을 확인합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-muted-foreground font-semibold w-[180px]">업체 정보</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">내용 미리보기</TableHead>
                  <TableHead className="text-muted-foreground font-semibold w-[160px]">생성 일시</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right w-[100px]">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                        생성된 글이 없습니다
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post._id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {post.center_name}
                          </span>
                          {post.region && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {post.region}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground/80">
                        <p className="line-clamp-2">{getPreviewText(post.content)}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(post.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPostModal(post)}
                          className="border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          전문 보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Post Detail Modal - Naver Blog Style */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-card border-border/50 shadow-elevated">
          <DialogHeader className="px-6 py-4 border-b border-border/30 bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <Badge variant="outline" className="font-medium bg-primary/10 text-primary border-primary/30">
                  {selectedPost?.center_name}
                </Badge>
                {selectedPost?.region && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedPost.region}
                  </span>
                )}
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedPost && format(new Date(selectedPost.created_at), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
            </p>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            {/* Naver Blog Style Container */}
            <div 
              className="mx-auto bg-white dark:bg-card"
              style={{ 
                maxWidth: '800px',
                padding: '40px 20px',
                fontFamily: "'Nanum Gothic', 'Pretendard', sans-serif",
              }}
            >
              <div 
                className="text-foreground"
                style={{ 
                  fontSize: '16px',
                  lineHeight: '1.8',
                  color: 'hsl(var(--foreground))',
                  wordBreak: 'keep-all',
                }}
              >
                {selectedPost && parseStoryBlocks(selectedPost.content, selectedPost.image_paths || []).map((block, index) => {
                  if (block.type === 'image') {
                    return (
                      <img
                        key={index}
                        src={block.content}
                        alt={`블로그 이미지 ${index + 1}`}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          display: 'block',
                          margin: '20px auto',
                          borderRadius: '8px',
                        }}
                        className="shadow-soft"
                      />
                    );
                  }
                  return (
                    <p 
                      key={index} 
                      style={{ 
                        marginBottom: '1em',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {block.content}
                    </p>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalActivityFeed;
