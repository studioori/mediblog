import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import {
  DENTAL_REFINE_SYSTEM_PROMPT,
  DENTAL_GENERATE_SYSTEM_PROMPT,
  HEALTH_QA_STYLES,
  CONTENT_LENGTH_CONFIG,
  DEFAULT_HEALTH_QA_STYLE,
  DEFAULT_CONTENT_LENGTH,
  getStylePrompt,
  getContentLengthConfig,
} from "./prompts/dental";

/**
 * ============================================
 * 건강정보 Q&A AI 콘텐츠 생성 시스템
 * ============================================
 * 
 * 📋 기능 설명
 * 원장이 작성한 Q&A 초안(질문+답변)을 붙여넣으면 
 * AI(Gemini)가 블로그용으로 다듬어주는 기능
 * 
 * 🎯 첫 번째 타겟: 치과
 * 
 * @lastUpdated 2025-03-24
 */

// ============================================
// Types
// ============================================

interface HealthQAInput {
  draft: string;           // 원장이 작성한 Q&A 초안
  topic?: string;          // 주제 (선택)
  style?: string;          // 글쓰기 스타일
  contentLength?: string;  // 글 길이
}

interface HealthQAResult {
  title: string;
  content: string;
  hashtags: string[];
  key_points: string[];
}

// Gemini API 응답 타입
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

// ============================================
// Constants
// ============================================

// Gemini API 설정 - gemini-2.5-flash: 현재 권장 모델
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// 재시도 설정 (기존과 동일)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================
// Helper Functions
// ============================================

/**
 * 마크다운 코드 블록 제거 (기존 generateBlog.ts와 동일)
 */
const stripMarkdownCodeBlocks = (text: string): string => {
  // 마크다운 코드 블록 제거 (```json ... ``` 형식)
  const cleaned = text.trim();

  // 백틱으로 감싸인 JSON 추출 (가장 간단한 방식)
  // ``` 또는 ```json 또는 ```JSON 모두 처리
  const match = cleaned.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return cleaned;
};

/**
 * 손상된 JSON에서 내용 추출 (기존 generateBlog.ts 패턴 확장)
 */
const extractContentFromBrokenJson = (
  text: string
): { title?: string; content?: string; hashtags?: string[]; key_points?: string[] } => {
  const result: { title?: string; content?: string; hashtags?: string[]; key_points?: string[] } = {};

  // 제목 추출
  const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }

  // 내용 추출 - 이스케이프된 줄바꿈과 따옴표 처리
  const contentMatch = text.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"hashtags"|\s*,\s*"key_points"|\s*})/);
  if (contentMatch) {
    let content = contentMatch[1];
    content = content
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .replace(/\s*"\s*$/, '');
    result.content = content;
  }

  // 해시태그 추출
  const hashtagsMatch = text.match(/"hashtags"\s*:\s*\[([\s\S]*?)\]/);
  if (hashtagsMatch) {
    const hashtagsStr = hashtagsMatch[1];
    const hashtags = hashtagsStr.match(/"([^"]+)"/g);
    if (hashtags) {
      result.hashtags = hashtags.map(h => h.replace(/"/g, ''));
    }
  }

  // 핵심 포인트 추출
  const keyPointsMatch = text.match(/"key_points"\s*:\s*\[([\s\S]*?)\]/);
  if (keyPointsMatch) {
    const keyPointsStr = keyPointsMatch[1];
    const keyPoints = keyPointsStr.match(/"([^"]+)"/g);
    if (keyPoints) {
      result.key_points = keyPoints.map(k => k.replace(/"/g, ''));
    }
  }

  return result;
};

/**
 * 지연 함수
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * 건강정보 Q&A용 시스템 프롬프트 생성
 */
const getHealthQASystemPrompt = (
  centerName: string,
  region: string,
  style: string,
  contentLength: string
): string => {
  const styleConfig = HEALTH_QA_STYLES[style] || HEALTH_QA_STYLES[DEFAULT_HEALTH_QA_STYLE];
  const lengthConfig = getContentLengthConfig(contentLength);

  return `당신은 '${centerName}' 치과 원장입니다(지역: ${region}).

${DENTAL_REFINE_SYSTEM_PROMPT}

[글쓰기 스타일]
${styleConfig.name}: ${styleConfig.description}
${styleConfig.prompt}

[길이 목표]
${lengthConfig.description} (약 ${lengthConfig.targetChars}자)

[해시태그]
- #${centerName.replace(/\s/g, '')} #${region.replace(/\s/g, '')}치과 #건강정보
- 질환명과 검색의도를 반영한 태그 추가`;
};

// ============================================
// Core Generation Logic
// ============================================

/**
 * 건강정보 Q&A 생성 핵심 로직
 * Action과 InternalAction에서 공통으로 사용
 */
const generateHealthQACore = async (
  args: {
    draft: string;
    centerName: string;
    region: string;
    topic?: string;
    style?: string;
    contentLength?: string;
  }
): Promise<HealthQAResult> => {
  // 입력 검증
  if (!args.draft || args.draft.trim().length === 0) {
    throw new Error("초안 내용이 필요합니다.");
  }

  // 환경변수 확인 (Google API Key)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY가 설정되지 않았습니다. Convex 대시보드에서 환경 변수를 설정해주세요.");
  }

  // 기본값 설정
  const dynamicCenterName = args.centerName || "서울치과의원";
  const dynamicRegion = args.region || "";
  const dynamicStyle = args.style || DEFAULT_HEALTH_QA_STYLE;
  const dynamicContentLength = args.contentLength || DEFAULT_CONTENT_LENGTH;

  // 길이 설정 가져오기
  const lengthConfig = getContentLengthConfig(dynamicContentLength);
  const maxTokens = lengthConfig.maxTokens;

  // 시스템 프롬프트 생성
  const systemInstruction = getHealthQASystemPrompt(
    dynamicCenterName,
    dynamicRegion,
    dynamicStyle,
    dynamicContentLength
  );

  console.log(
    `Generating Health Q&A for center: ${dynamicCenterName}, region: ${dynamicRegion}, ` +
    `style: ${dynamicStyle}, contentLength: ${dynamicContentLength} (${maxTokens} tokens)`
  );

  // Gemini API용 parts 구성
  const parts: Array<{ text?: string }> = [];

  // 사용자 프롬프트 구성 (최소화)
  let userPrompt = `원장 초안을 Q&A 블로그 글로 변환하세요.\n\n`;

  if (args.topic) {
    userPrompt += `주제: ${args.topic}\n`;
  }

  userPrompt += `초안:\n${args.draft}\n\nJSON으로 응답하세요.`;

  parts.push({ text: userPrompt });

  // Gemini API 요청 본문 구성
  const requestBody = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7
    }
  };

  // API 호출 (재시도 로직 포함)
  let lastError: Error | null = null;
  let data: GeminiResponse | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData: GeminiResponse = await response.json();

      // API 에러 확인
      if (responseData.error) {
        console.error("Gemini API error:", responseData.error);
        
        if (responseData.error.code === 429 || responseData.error.code === 503) {
          const waitTime = RETRY_DELAY_MS * attempt;
          console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${MAX_RETRIES}`);
          await delay(waitTime);
          continue;
        }
        
        throw new Error(responseData.error.message || `Gemini API error: ${responseData.error.code}`);
      }

      data = responseData;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Gemini API attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }

  if (!data) {
    throw lastError || new Error("모든 재시도가 실패했습니다.");
  }

  // finishReason과 usage 정보 확인
  const finishReason = data.candidates?.[0]?.finishReason;
  const usageMetadata = (data as any).usageMetadata;

  console.log(
    `📊 API Response: finishReason=${finishReason}, ` +
    `inputTokens=${usageMetadata?.promptTokenCount || 'N/A'}, ` +
    `outputTokens=${usageMetadata?.candidatesTokenCount || 'N/A'}, ` +
    `maxOutputTokens=${maxTokens}`
  );

  if (finishReason === 'MAX_TOKENS') {
    console.warn(
      `⚠️ Generation stopped due to MAX_TOKENS limit. ` +
      `(output tokens: ${usageMetadata?.candidatesTokenCount || '?'}/${maxTokens})`
    );
  } else if (finishReason && finishReason !== 'STOP') {
    console.warn(`⚠️ Generation finished with reason: ${finishReason}`);
  }

  // 응답에서 텍스트 추출
  const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!aiContent) {
    console.error("Gemini response structure:", JSON.stringify(data, null, 2));
    throw new Error("AI 응답이 비어있습니다.");
  }

  console.log(`✅ AI response received (${aiContent.length} chars):`, aiContent.substring(0, 300));

  // 기본 해시태그
  const defaultHashtags = [
    `#${dynamicCenterName.replace(/\s/g, '')}`,
    `#${dynamicRegion.replace(/\s/g, '')}치과`,
    `#${dynamicRegion.replace(/\s/g, '')}건강정보`,
    "#치과",
    "#구강건강",
  ];

  // JSON 파싱 (다단계 - 기존 generateBlog.ts와 동일한 패턴)
  let parsedContent: HealthQAResult;

  try {
    // Stage 1: 마크다운 코드 블록 제거
    const cleanedContent = stripMarkdownCodeBlocks(aiContent);
    console.log("Cleaned content (first 200 chars):", cleanedContent.substring(0, 200));

    try {
      // Stage 2: 직접 JSON 파싱
      parsedContent = JSON.parse(cleanedContent);
      console.log("JSON parsed successfully via direct parse");
    } catch (directParseError) {
      console.log("Direct parse failed, trying regex extraction...");

      // Stage 3: 정규식으로 JSON 객체 추출
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedContent = JSON.parse(jsonMatch[0]);
          console.log("JSON parsed successfully via regex extraction");
        } catch (regexParseError) {
          console.log("Regex extraction parse failed, trying field extraction...");

          // Stage 4: 손상된 JSON에서 필드별 추출
          const extracted = extractContentFromBrokenJson(cleanedContent);
          if (extracted.content) {
            parsedContent = {
              title: extracted.title || "건강정보 Q&A",
              content: extracted.content,
              hashtags: extracted.hashtags || defaultHashtags,
              key_points: extracted.key_points || ["핵심 포인트를 확인해주세요."]
            };
            console.log("Content extracted from broken JSON");
          } else {
            throw new Error("Could not extract content from JSON");
          }
        }
      } else {
        // Stage 5: JSON 구조가 없는 경우 원본에서 필드 추출
        const extracted = extractContentFromBrokenJson(aiContent);
        if (extracted.content) {
          parsedContent = {
            title: extracted.title || "건강정보 Q&A",
            content: extracted.content,
            hashtags: extracted.hashtags || defaultHashtags,
            key_points: extracted.key_points || ["핵심 포인트를 확인해주세요."]
          };
          console.log("Content extracted from raw response");
        } else {
          throw new Error("No JSON structure found in response");
        }
      }
    }
  } catch (parseError) {
    console.error("All JSON parse attempts failed:", parseError);

    // 최종 폴백: 원본 텍스트 정리 후 내용으로 사용
    let fallbackContent = aiContent;

    // 마크다운 코드 블록 제거
    fallbackContent = fallbackContent
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```/g, '');

    // JSON 구문 아티팩트 제거
    fallbackContent = fallbackContent
      .replace(/^\s*\{\s*"title"\s*:\s*"[^"]*"\s*,?\s*/g, '')
      .replace(/^\s*"content"\s*:\s*"/g, '')
      .replace(/",?\s*"hashtags"\s*:\s*\[[\s\S]*?\]\s*\}?\s*$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, '\t')
      .trim();

    parsedContent = {
      title: "건강정보 Q&A",
      content: fallbackContent,
      hashtags: defaultHashtags,
      key_points: ["핵심 포인트를 확인해주세요."]
    };
    console.log("Using fallback content extraction");
  }

  // key_points가 없으면 기본값 추가
  if (!parsedContent.key_points || parsedContent.key_points.length === 0) {
    parsedContent.key_points = ["핵심 포인트를 확인해주세요."];
  }

  return parsedContent;
};

// ============================================
// Main Action (클라이언트 호출용)
// ============================================

/**
 * 건강정보 Q&A 생성 Action (클라이언트 호출용)
 * 
 * @param draft - 원장이 작성한 Q&A 초안
 * @param centerName - 병원명
 * @param region - 지역명
 * @param topic - 주제 (선택)
 * @param style - 글쓰기 스타일 (friendly_expert, fun_casual, calm_professional)
 * @param contentLength - 글 길이 (short, medium, long)
 * @returns 생성된 Q&A (title, content, hashtags, key_points)
 */
export const generateHealthQA = action({
  args: {
    draft: v.string(),
    centerName: v.string(),
    region: v.string(),
    topic: v.optional(v.string()),
    style: v.optional(v.string()),
    contentLength: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<HealthQAResult> => {
    return generateHealthQACore(args);
  },
});

// ============================================
// Internal Action (다른 Convex 함수에서 호출용)
// ============================================

/**
 * 내부용 건강정보 Q&A 생성 Action
 * 스케줄러나 다른 internal 함수에서 호출할 때 사용
 */
export const generateHealthQAInternal = internalAction({
  args: {
    draft: v.string(),
    centerName: v.string(),
    region: v.string(),
    topic: v.optional(v.string()),
    style: v.optional(v.string()),
    contentLength: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<HealthQAResult> => {
    return generateHealthQACore(args);
  },
});

// ============================================
// Utility Actions
// ============================================

/**
 * 사용 가능한 스타일 목록 조회
 */
export const getAvailableStyles = action({
  args: {},
  handler: async (): Promise<Array<{ key: string; name: string; description: string }>> => {
    return Object.entries(HEALTH_QA_STYLES).map(([key, value]) => ({
      key,
      name: value.name,
      description: value.description,
    }));
  },
});

/**
 * 사용 가능한 길이 설정 목록 조회
 */
export const getAvailableLengths = action({
  args: {},
  handler: async (): Promise<Array<{ key: string; description: string; targetChars: number }>> => {
    return Object.entries(CONTENT_LENGTH_CONFIG).map(([key, value]) => ({
      key,
      description: value.description,
      targetChars: value.targetChars,
    }));
  },
});
