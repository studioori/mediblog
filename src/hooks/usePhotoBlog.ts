import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useAuth } from '@/contexts/AuthContext';
import { type PhotoItem } from '@/components/PhotoUploader';
import { type SimulationProfile } from '@/types/profile';

const actions = {
  generateBlog: 'generateBlog:generateBlog' as const,
};

const mutations = {
  createPost: 'posts:createPost' as const,
  incrementUsage: 'users:incrementUsage' as const,
  logActivity: 'users:logActivity' as const,
};

interface GeneratedBlog {
  title: string;
  content: string;
  hashtags: string[];
}

interface UsePhotoBlogOptions {
  simulationProfile?: SimulationProfile | null;
}

interface UsePhotoBlogReturn {
  isUploading: boolean;
  isGenerating: boolean;
  uploadedUrls: string[];
  generatedBlog: GeneratedBlog | null;
  error: string | null;
  uploadAndGenerate: (photos: PhotoItem[]) => Promise<void>;
  reset: () => void;
}

export const usePhotoBlog = (options?: UsePhotoBlogOptions): UsePhotoBlogReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [generatedBlog, setGeneratedBlog] = useState<GeneratedBlog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, refreshProfile, isAdmin, isDemo } = useAuth();
  
  const simulationProfile = options?.simulationProfile;

  // Convex mutations and actions
  const generateBlogAction = useAction(actions.generateBlog as any);
  const createPostMutation = useMutation(mutations.createPost as any);
  const incrementUsageMutation = useMutation(mutations.incrementUsage as any);
  const logActivityMutation = useMutation(mutations.logActivity as any);

  // TODO: 추후 이미지 업로드 구현 (현재는 로컬 URL 또는 data URL 사용)
  const getPhotoUrls = async (photos: PhotoItem[]): Promise<string[]> => {
    // 임시: 파일을 data URL로 변환하여 사용
    const urls: string[] = [];
    
    for (const photo of photos) {
      // 이미 URL인 경우 그대로 사용
      if (photo.preview && photo.preview.startsWith('http')) {
        urls.push(photo.preview);
        continue;
      }
      
      // File 객체를 data URL로 변환
      if (photo.file) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(photo.file);
        });
        urls.push(dataUrl);
      }
    }
    
    return urls;
  };

  const uploadAndGenerate = async (photos: PhotoItem[]) => {
    if (photos.length === 0) {
      setError('사진을 최소 1장 이상 선택해주세요.');
      return;
    }

    // Demo mode allows generation without login
    if (!isDemo && (!user || !profile)) {
      setError('로그인이 필요합니다.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Step 1: Get photo URLs (temporary: using data URLs)
      const urls = await getPhotoUrls(photos);
      setUploadedUrls(urls);

      setIsUploading(false);
      setIsGenerating(true);

      // Step 2: Use simulation profile if admin is testing, otherwise use own profile
      const targetProfile = simulationProfile || profile;
      
      const photosData = photos.map((photo, index) => ({
        imageUrl: urls[index],
        keyword: photo.keyword || '',
      }));

      // Replace {{CURRENT_DATE}} token with actual date in Korean format
      const today = new Date();
      const currentDateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
      const processedTonePrompt = (targetProfile.writing_tone_prompt || '')
        .replace(/\{\{CURRENT_DATE\}\}/g, currentDateStr);

      // Step 3: Call Convex action for blog generation
      const data = await generateBlogAction({
        photos: photosData,
        centerName: targetProfile.center_name,
        region: targetProfile.region || '',
        department: targetProfile.department || undefined,
        writingTonePrompt: processedTonePrompt || undefined,
        styleConfig: (targetProfile as any).style_config || undefined,
        // New style settings
        writingStyle: targetProfile.writing_style || undefined,
        contentLength: targetProfile.content_length || undefined,
        useEmoji: targetProfile.use_emoji !== undefined ? targetProfile.use_emoji : undefined,
      });

      const blogData: GeneratedBlog = {
        title: data.title || '오늘 하루도 따뜻했습니다',
        content: data.content || '',
        hashtags: data.hashtags || ['#서울치과의원'],
      };

      setGeneratedBlog(blogData);

      // Step 4: Save to database using Convex mutation (skip in demo mode)
      if (!isDemo && user) {
        const fullContent = `${blogData.title}\n\n${blogData.content}\n\n${blogData.hashtags.join(' ')}`;

        try {
          await createPostMutation({
            userId: user.id,
            content: fullContent,
            title: blogData.title,
            imagePaths: urls,
            status: 'draft',
          });
        } catch (saveError) {
          console.warn('Failed to save post to history:', saveError);
        }

        // Step 5: Increment usage count and log activity
        try {
          await incrementUsageMutation({ userId: user.id });
          await logActivityMutation({
            userId: user.id,
            actionType: 'GENERATE_POST',
          });
        } catch (usageError) {
          console.warn('Failed to update usage or log activity:', usageError);
        }

        // Refresh profile to get updated usage count
        refreshProfile();
      }

    } catch (err) {
      console.error('Error in uploadAndGenerate:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setUploadedUrls([]);
    setGeneratedBlog(null);
    setError(null);
  };

  return {
    isUploading,
    isGenerating,
    uploadedUrls,
    generatedBlog,
    error,
    uploadAndGenerate,
    reset,
  };
};
