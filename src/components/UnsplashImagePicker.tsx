/**
 * Unsplash 이미지 선택 컴포넌트
 * 
 * 건강정보 Q&A 블로그에 사용할 이미지를 Unsplash에서 검색하고 선택하는 기능
 * 
 * @lastUpdated 2025-03-24
 */

import { useState } from 'react';
import { useAction } from 'convex/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Loader2, 
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Convex 함수 이름 (기존 패턴과 동일)
const actions = {
  searchImagesByKeyword: 'unsplashActions:searchImagesByKeyword' as const,
};

// ============================================
// Types
// ============================================

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
    download: string;
  };
  width: number;
  height: number;
  color: string;
}

interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

interface UnsplashImagePickerProps {
  /** 블로그 제목 (자동 키워드 추출용) */
  title?: string;
  /** 블로그 내용 (자동 키워드 추출용) */
  content?: string;
  /** 이미지 선택 시 호출 */
  onImageSelect: (image: UnsplashImage) => void;
  /** 선택된 이미지 ID */
  selectedImageId?: string | null;
}

// ============================================
// Component
// ============================================

const UnsplashImagePicker = ({
  title,
  content,
  onImageSelect,
  selectedImageId,
}: UnsplashImagePickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const searchImagesAction = useAction(actions.searchImagesByKeyword as any);

  // 키워드 검색
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: '검색어를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(false);

    try {
      const result = await searchImagesAction({
        query: searchQuery.trim(),
        page: 1,
      }) as UnsplashSearchResult;

      setImages(result.results || []);
      setHasSearched(true);

      if (!result.results || result.results.length === 0) {
        toast({
          title: '검색 결과가 없습니다',
          description: '다른 키워드로 검색해보세요.',
        });
      }
    } catch (err) {
      console.error('Search failed:', err);
      toast({
        title: '검색 실패',
        description: '이미지 검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 이미지 선택
  const handleImageClick = (image: UnsplashImage) => {
    onImageSelect(image);
    toast({
      title: '이미지 선택 완료! 🖼️',
      description: `${image.user.name}의 사진이 선택되었습니다.`,
    });
  };

  // Enter 키 검색
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 추천 키워드
  const recommendedKeywords = [
    'dental care',
    'healthy smile',
    'oral hygiene',
    'dentist',
    'teeth cleaning',
    'medical',
    'healthcare',
  ];

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="이미지 검색어 입력 (예: dental care, healthy smile)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="px-4"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '검색'
          )}
        </Button>
      </div>

      {/* 추천 키워드 */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">추천:</span>
        {recommendedKeywords.map((keyword) => (
          <button
            key={keyword}
            onClick={() => {
              setSearchQuery(keyword);
              // 자동 검색
              setTimeout(() => {
                setIsLoading(true);
                searchImagesAction({ query: keyword, page: 1 })
                  .then((result: UnsplashSearchResult) => {
                    setImages(result.results || []);
                    setHasSearched(true);
                  })
                  .catch(console.error)
                  .finally(() => setIsLoading(false));
              }, 100);
            }}
            className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-full transition-colors"
          >
            {keyword}
          </button>
        ))}
      </div>

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">이미지 검색 중...</span>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!isLoading && hasSearched && images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
          <p>검색 결과가 없습니다</p>
          <p className="text-sm mt-1">다른 키워드로 검색해보세요</p>
        </div>
      )}

      {/* 이미지 그리드 */}
      {!isLoading && images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              onClick={() => handleImageClick(image)}
              className={`
                relative aspect-square rounded-lg overflow-hidden cursor-pointer
                transition-all duration-200 hover:shadow-lg
                ${selectedImageId === image.id 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : 'hover:ring-2 hover:ring-primary/50'
                }
              `}
              style={{ backgroundColor: image.color }}
            >
              <img
                src={image.urls.small}
                alt={image.alt_description || 'Unsplash image'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* 선택 표시 */}
              {selectedImageId === image.id && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* 저작자 정보 (호버 시 표시) */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">
                  📸 {image.user.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unsplash 저작자 표시 안내 */}
      {images.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          <p>
            Photos provided by{' '}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Unsplash
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default UnsplashImagePicker;
