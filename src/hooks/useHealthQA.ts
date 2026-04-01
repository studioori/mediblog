import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { useAuth } from '@/contexts/AuthContext';
import { type SimulationProfile } from '@/types/profile';

const actions = {
  generateHealthQA: 'generateHealthQA:generateHealthQA' as const,
};

const mutations = {
  createPost: 'posts:createPost' as const,
  incrementUsage: 'users:incrementUsage' as const,
  logActivity: 'users:logActivity' as const,
};

export interface HealthQAInputData {
  draft: string;
  style: string;
  contentLength: string;
}

export interface GeneratedHealthQA {
  title: string;
  content: string;
  hashtags: string[];
  keyPoints: string[];
}

interface UseHealthQAOptions {
  simulationProfile?: SimulationProfile | null;
}

interface UseHealthQAReturn {
  isGenerating: boolean;
  generatedQA: GeneratedHealthQA | null;
  error: string | null;
  generateQA: (input: HealthQAInputData) => Promise<void>;
  reset: () => void;
}

// ============================================
// Hook
// ============================================

export const useHealthQA = (options?: UseHealthQAOptions): UseHealthQAReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQA, setGeneratedQA] = useState<GeneratedHealthQA | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, profile, refreshProfile, isDemo } = useAuth();

  const simulationProfile = options?.simulationProfile;

  // Convex mutations and actions
  const generateHealthQAAction = useAction(actions.generateHealthQA as any);
  const createPostMutation = useMutation(mutations.createPost as any);
  const incrementUsageMutation = useMutation(mutations.incrementUsage as any);
  const logActivityMutation = useMutation(mutations.logActivity as any);

  /**
   * 건강정보 Q&A 생성
   */
  const generateQA = async (input: HealthQAInputData) => {
    // Demo mode allows generation without login
    if (!isDemo && (!user || !profile)) {
      setError('로그인이 필요합니다.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      // 시뮬레이션 프로필 또는 본인 프로필 사용
      const targetProfile = simulationProfile || profile;

      // Convex action 호출
      const data = await generateHealthQAAction({
        draft: input.draft,
        centerName: targetProfile.center_name,
        region: targetProfile.region || '',
        style: input.style,
        contentLength: input.contentLength,
      });

      const qaData: GeneratedHealthQA = {
        title: data.title || '건강정보 Q&A',
        content: data.content || '',
        hashtags: data.hashtags || ['#치과', '#건강정보'],
        keyPoints: data.key_points || [],
      };

      setGeneratedQA(qaData);

      // DB에 저장 (데모 모드에서는 건너뜀)
      if (!isDemo && user) {
        const fullContent = `${qaData.title}\n\n${qaData.content}\n\n📌 핵심 포인트\n${qaData.keyPoints.map(p => `- ${p}`).join('\n')}\n\n${qaData.hashtags.join(' ')}`;

        try {
          await createPostMutation({
            userId: user.id,
            content: fullContent,
            title: qaData.title,
            status: 'draft',
            // 건강정보 Q&A 모드 필드
            mode: 'health_qa',
            postType: 'refine',
            originalDraft: input.draft,
            department: targetProfile.department || 'dentistry',
            keyPoints: qaData.keyPoints,
            hashtags: qaData.hashtags,
          });
        } catch (saveError) {
          console.warn('Failed to save post to history:', saveError);
        }

        // 사용량 증가 및 활동 로그
        try {
          await incrementUsageMutation({ userId: user.id });
          await logActivityMutation({
            userId: user.id,
            actionType: 'GENERATE_HEALTH_QA',
          });
        } catch (usageError) {
          console.warn('Failed to update usage or log activity:', usageError);
        }

        // 프로필 새로고침
        refreshProfile();
      }

    } catch (err) {
      console.error('Error in generateQA:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 상태 초기화
   */
  const reset = () => {
    setGeneratedQA(null);
    setError(null);
  };

  return {
    isGenerating,
    generatedQA,
    error,
    generateQA,
    reset,
  };
};
