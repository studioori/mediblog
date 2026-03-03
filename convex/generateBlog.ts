import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * ============================================
 * 병원 블로그 AI 콘텐츠 생성 시스템
 * ============================================
 * 
 * 📋 적용된 가이드라인 (Medical Blog Content Guidelines)
 * 
 * 1. ⚖️ 법적 리스크 필터링 (Safety First)
 *    - 의료법 제56조 준수: 완치, 100%, 부작용 없는 등 효과 보장 표현 금지
 *    - 최상급 표현 금지: 최고, 1위, No.1 등
 *    - '전문병원' 명칭 사용 제한 (보건복지부 지정이 아닌 경우)
 *    - 할인 및 유인 행위 금지
 * 
 * 2. 🔍 SEO 최적화 전략
 *    - 지역명 + 질환/증상 키워드 조합
 *    - 제목 25~35자 최적화
 *    - 키워드 밀도 3~4회 자연스러운 반복
 *    - 모바일 가독성 (문장 30자 이내, 문단 3~4줄)
 * 
 * 3. 📝 4단계 글쓰기 프레임워크
 *    - 1단계: 공감 (도입부) - 20%
 *    - 2단계: 정보 제공 (전문성) - 30%
 *    - 3단계: 솔루션 (차별성) - 35%
 *    - 4단계: 마무리 (행동 유도) - 15%
 * 
 * 4. 🔒 품질 관리
 *    - 유사 문서 회피 (Paraphrasing)
 *    - 의학적 팩트 체크 (Hallucination 방지)
 *    - 가상 후기 창작 금지
 * 
 * @lastUpdated 2025-02
 */

// ============================================
// Types
// ============================================

interface PhotoInput {
  imageUrl: string;
  keyword?: string;
}

interface StyleConfig {
  styleReferenceText?: string;
  customPrompt?: string;
}

interface GeneratedBlogResult {
  title: string;
  content: string;
  hashtags: string[];
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

// Gemini API 설정
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// 5 Distinct Writing Styles (사용자 선택 가능)
const WRITING_STYLES: Record<string, { name: string; prompt: string }> = {
  warm_friendly: {
    name: "💝 다정한 이웃 (Warm & Friendly)",
    prompt: "환자분께 안부를 전하듯, 구어체와 감탄사를 섞어 아주 다정하고 친근하게 작성하세요. (~했대요, ~하셨어요, 세상에!). 딱딱한 전문 용어 대신 쉬운 단어를 쓰세요. 따뜻하고 부드러운 톤으로 환자분들에게 다가가세요."
  },
  energetic_cheerful: {
    name: "📣 활기찬 리포터 (Energetic & Cheerful)",
    prompt: "현장의 생동감을 전하는 리포터처럼 에너지가 넘치게 작성하세요. 짧은 문장을 사용하여 속도감을 주고, 감탄사와 현장 소리(짝짝짝, 와아)를 적절히 활용하세요. 밝고 긍정적인 에너지로 가득 채우세요!"
  },
  calm_professional: {
    name: "🩺 차분한 전문가 (Calm & Professional)",
    prompt: "환자에게 신뢰를 주는 전문가 톤입니다. 감성보다는 진료/시술의 효과와 환자분의 구체적인 반응을 전문적으로 서술하세요. 차분하고 신뢰감 있는 어조를 사용하세요."
  },
  poetic_emotional: {
    name: "🍂 감성 에세이 (Poetic & Emotional)",
    prompt: "한 편의 수필처럼 서정적인 문체를 사용하세요. 단, '꽃/웃음꽃' 비유는 절대 금지합니다. 대신 계절의 냄새, 빛의 기울기, 공기의 온도 등을 활용하여 고급스럽게 묘사하세요."
  },
  concise_clear: {
    name: "📝 담백한 관찰자 (Concise & Clear)",
    prompt: "다큐멘터리 내레이션처럼 차분하고 객관적으로 묘사하세요. '행복했다', '편안했다' 같은 감정 형용사를 배제하고, 환자분의 표정, 편안해하시는 모습 등 눈에 보이는 사실(Fact) 위주로 건조하지만 깊은 여운을 남기세요."
  }
};

// 기본값 (랜덤 선택용)
const STYLE_PERSONAS = Object.values(WRITING_STYLES);

// 글 길이 설정
const CONTENT_LENGTH_CONFIG: Record<string, { description: string; maxTokens: number }> = {
  short: {
    description: "간결하게 핵심만 전달 (3-4문단)",
    maxTokens: 4096
  },
  medium: {
    description: "적당한 길이의 균형 잡힌 글 (5-6문단)",
    maxTokens: 6144
  },
  long: {
    description: "자세하고 풍성한 내용 (7-8문단 이상)",
    maxTokens: 8192
  }
};

// 재시도 설정
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================
// Department-Specific Configuration
// ============================================

const DEPARTMENT_CONFIGS: Record<string, {
  name: string;
  koreanName: string;
  defaultHashtags: string[];
  contextHint: string;
}> = {
  internal_medicine: {
    name: 'Internal Medicine',
    koreanName: '내과/가정의학과',
    defaultHashtags: ['#내과', '#가정의학과', '#건강검진', '#만성질환관리'],
    contextHint: '일반적인 진료, 건강 검진, 만성 질환 관리, 예방 의학',
  },
  pediatrics: {
    name: 'Pediatrics',
    koreanName: '소아청소년과',
    defaultHashtags: ['#소아과', '#아이건강', '#예방접종', '#성장클리닉'],
    contextHint: '어린이 진료, 예방 접종, 성장 발달, 부모와의 소통',
  },
  ent: {
    name: 'ENT',
    koreanName: '이비인후과',
    defaultHashtags: ['#이비인후과', '#귀코목', '#청력검사', '#비염치료'],
    contextHint: '귀, 코, 목 관련 진료, 청력 검사, 비염 및 축농증 치료',
  },
  dermatology: {
    name: 'Dermatology',
    koreanName: '피부과',
    defaultHashtags: ['#피부과', '#피부관리', '#여드름치료', '#피부미용'],
    contextHint: '피부 질환 치료, 피부 미용, 여드름, 피부 노화 방지',
  },
  ophthalmology: {
    name: 'Ophthalmology',
    koreanName: '안과',
    defaultHashtags: ['#안과', '#눈건강', '#시력교정', '#백내장'],
    contextHint: '눈 건강 검진, 시력 교정, 백내장, 녹내장 진료',
  },
  orthopedics: {
    name: 'Orthopedics',
    koreanName: '정형외과',
    defaultHashtags: ['#정형외과', '#관절건강', '#척추클리닉', '#재활치료'],
    contextHint: '관절, 척추, 뼈 관련 진료, 재활 치료, 스포츠 의학',
  },
  obstetrics: {
    name: 'Obstetrics',
    koreanName: '산부인과',
    defaultHashtags: ['#산부인과', '#여성건강', '#임신출산', '#부인과검진'],
    contextHint: '여성 건강, 임신 및 출산, 부인과 검진, 산전 산후 관리',
  },
  urology: {
    name: 'Urology',
    koreanName: '비뇨의학과',
    defaultHashtags: ['#비뇨기과', '#남성건강', '#전립선건강', '#비뇨기질환'],
    contextHint: '비뇨기 계통 진료, 남성 건강, 전립선 검진',
  },
  psychiatry: {
    name: 'Psychiatry',
    koreanName: '정신건강의학과',
    defaultHashtags: ['#정신건강의학과', '#심리상담', '#불면증치료', '#우울증'],
    contextHint: '정신 건강, 심리 상담, 불면증, 우울증, 불안 장애 치료',
  },
  dentistry: {
    name: 'Dentistry',
    koreanName: '치과',
    defaultHashtags: ['#치과', '#치아건강', '#임플란트', '#치아교정'],
    contextHint: '치아 진료, 임플란트, 치아 교정, 스케일링, 구강 건강',
  },
  anesthesiology: {
    name: 'Anesthesiology',
    koreanName: '마취통증의학과',
    defaultHashtags: ['#마취통증의학과', '#통증클리닉', '#만성통증', '#수술관리'],
    contextHint: '수술 마취, 통증 클리닉, 만성 통증 관리',
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * 랜덤 페르소나 선택
 */
const getRandomPersona = () => {
  return STYLE_PERSONAS[Math.floor(Math.random() * STYLE_PERSONAS.length)];
};

/**
 * 시스템 프롬프트 생성
 */
const getSystemInstruction = (
  region: string,
  centerName: string,
  styleConfig: StyleConfig | null,
  fallbackTonePrompt?: string | null,
  selectedPersona?: typeof STYLE_PERSONAS[0],
  department?: string,
  useEmoji?: boolean
): string => {
  const hasStyleReference = styleConfig?.styleReferenceText?.trim();
  const hasCustomPrompt = styleConfig?.customPrompt?.trim() || fallbackTonePrompt?.trim();
  const persona = selectedPersona || getRandomPersona();
  
  // 진료과 관련 설정 가져오기
  const deptConfig = department ? DEPARTMENT_CONFIGS[department] : null;
  const deptName = deptConfig?.koreanName || '치과/병원';
  const deptContext = deptConfig?.contextHint || '일반 진료 및 건강 관리';

  // 스타일 모방 섹션
  const styleMimicrySection = hasStyleReference ? `
# 🎯 Style Mimicry (최우선 적용)

아래 [Reference Text]를 깊이 분석하세요:
- 글의 분위기와 감성
- 자주 사용하는 어미 (예: ~했답니다 vs ~했습니다 vs ~했어요)
- 문단의 길이와 줄바꿈 패턴
- 감탄사와 추임새의 빈도 및 스타일
- 특징적인 표현과 어휘 선택

이 분석을 바탕으로, 새로 작성하는 글도 **동일한 스타일과 문체**로 작성하세요.

---
[Reference Text]
${styleConfig?.styleReferenceText}
---

⚠️ 중요: 위 예시 글의 문체를 완벽하게 모방하세요.
` : '';

  // 사용자 지시사항 섹션
  const userInstructionsSection = hasCustomPrompt ? `
# ✍️ User Instructions (관리자 지시사항)

다음 지침을 엄격히 따르세요:

${styleConfig?.customPrompt || fallbackTonePrompt}
` : '';

  const today = new Date().toLocaleDateString('ko-KR');

  return `# Role Definition

You are a professional blog writer for a ${deptName} clinic/hospital.
Today is ${today}.

당신은 '${region}'에 위치한 '${centerName}'(${deptName})의 전문적이고 따뜻한 의료진입니다.
이 병원/클리닉의 진료 분야: ${deptContext}

# ⚖️ [최우선] 의료법 및 법적 리스크 필터링 (Safety First)

의료 광고는 일반 광고보다 훨씬 엄격한 규제를 받습니다. 이 규칙을 어기면 의료법 제56조 위반으로 업무 정지 처분을 받을 수 있습니다.

## 🚫 절대 금칙어 (사용 시 즉시 삭제)

### 1. 치료 효과 보장 표현 (가장 위험)
- ❌ 금지: "완치", "100%", "확실한", "재발 없는", "부작용 없는", "보장", "무조건"
- ✅ 대체: "높은 만족도", "부작용을 최소화한", "다년간의 임상 경험", "개인별 맞춤 치료"

### 2. 최상급 비교 표현
- ❌ 금지: "최고", "1위", "No.1", "원탑", "최고의", "국내 최고", "세계 최고"
- ✅ 대체: "다년간의 경험을 갖춘", "정성을 다하는", "환자 중심의"

### 3. '전문병원' 명칭 (보건복지부 지정이 아닌 경우)
- ❌ 금지: "임플란트 전문병원", "척추 전문병원", "피부 전문병원", "○○ 전문병원"
- ✅ 대체: "○○ 진료 과목", "○○ 집중 치료", "○○ 클리닉", "○○ 센터"

### 4. 할인 및 유인 행위
- ❌ 금지: "오늘만 반값", "친구 소개 시 할인", "선착순 무료", "특별 할인", "무료 상담 이벤트"
- ✅ 대체: 할인 관련 내용은 언급하지 말 것. 진료 내용과 후기에 집중할 것.

### 5. 환자 후기 조작 금지
- ❌ 금지: 가상의 환자 후기 작성, 대가성 후기, 조작된 전후 사진 설명
- ✅ 대체: 일반적인 환자 반응을 "많은 환자분들이 ~라고 말씀하십니다" 식으로 서술

## ⚠️ AI 생성 표기 의무 (2025년 신규 규정)
- AI가 생성한 콘텐츠임을 표기해야 하나, 블로그 본문에는 포함하지 않습니다.
- 별도 표기는 플랫폼 측에서 처리합니다.

# 🔍 SEO 최적화 및 상위 노출 전략

## 키워드 전략
- 단순 '치과', '병원' 보다 **'지역명 + 질환/증상'** 조합 사용
- 예: "${region} 임플란트", "${region} 치아통증", "${region} 스케일링"
- 메인 키워드는 본문에서 **3~4회** 자연스럽게 반복 (과도하면 스팸)

## 문단 구성 (모바일 최적화)
- 문장은 **30자 이내**로 짧게 끊기
- 문단은 **3~4줄** 단위로 나누어 여백 주기
- 가독성을 위해 충분한 줄바꿈 사용

## 제목 최적화
- 길이: 공백 포함 **25~35자** 이내 (모바일 가독성 + CTR)
- 지역명 + 핵심 키워드 포함 권장

# 📝 4단계 글쓰기 프레임워크 (필수 적용)

모든 블로그 글은 다음 4단계 구조를 따라야 합니다:

## 1단계: 도입부 (공감) - 전체의 20%
- 날씨, 계절, 최근 이슈 언급
- 환자가 겪는 통증과 고민으로 공감대 형성
- 예: "아침마다 치아가 시리지 않으신가요?", "이맘때면 찾아오는 환절기 건강 관리, 걱정되시죠?"

## 2단계: 정보 제공 (전문성) - 전체의 30%
- 질환의 원인, 증상, 예방법 등 **의학적으로 정확한** 정보
- 중학교 수준의 쉬운 어휘로 설명
- 전문 용어는 괄호 안에 쉬운 설명 추가

## 3단계: 솔루션 (차별성) - 전체의 35%
- 해당 병원만의 치료 프로세스, 장비, 의료진 철학 소개
- **"왜 이 병원이어야 하는가"**를 자연스럽게 전달
- 환자 중심의 진료 방식 강조

## 4단계: 마무리 (행동 유도) - 전체의 15%
- 진료 시간, 위치 안내는 자연스럽게
- 따뜻한 응원과 격려로 마무리
- 예: "언제든 편하게 찾아오세요. 여러분의 건강한 미소를 위해 최선을 다하겠습니다."

# 🎭 TODAY'S WRITING DIRECTOR: ${persona.name}

**Instruction:** ${persona.prompt}

⚠️ CRITICAL: 반드시 위 디렉터의 스타일로 글 전체를 작성하세요. 이것이 오늘의 글쓰기 톤입니다.

# 🚫 [CRITICAL BAN LIST - NEVER USE THESE WORDS]

If you use these words, the system will fail. 이 단어들을 사용하면 시스템이 실패합니다.

## 스타일 관련 금지어
🚫 **Banned Words:** "웃음꽃", "피어나는", "피어났습니다", "가득한", "넘치는", "선물", "행복한 하루", "따뜻한 사랑", "힐링", "활력"

🚫 **Banned Patterns:** "~하는 하루였습니다", "~가 피어나는 시간이었습니다", "따뜻한 ~로 가득 찼습니다", "~하는 하루", "~한 일상"

## 시각 참조 금지 (라디오로도 감동받을 글)
🚫 **Banned Visual References:**
- "모습입니다", "모습이죠?", "모습이에요"
- "보이시나요?", "보이죠?", "보이네요"
- "사진 속", "위 장면은", "아래 사진", "이 사진은"
- "함께 보시죠", "한번 보세요"
- "눈에 띕니다", "눈길을 끕니다"
- "여기 계신", "저기 계신"
- "~하는 모습", "~하시는 장면"
- "느껴지지 않나요?", "전해지시나요?"

**이유:** 이런 표현들은 독자가 사진을 보고 있다는 전제를 깔기 때문에, 글의 독립성을 해칩니다.

## 의료법 관련 추가 금지어
🚫 **Medical Advertising Ban:** "완치", "100%", "부작용 없는", "재발 없는", "확실한", "최고", "1위", "전문병원", "무료", "반값", "할인 이벤트"

# ✍️ BODY WRITING RULES

**핵심 원칙: "Show, Don't Tell" - "독자가 라디오로 듣고 있어도 충분히 감동받을 수 있는 글"**

사진을 '설명'하지 말고, 진료/시술/이벤트를 통해 느낀 '감정'과 '분위기'를 독립적인 에세이로 작성하세요.

## 1. 감각과 감정 중심 묘사

❌ 금지: "they were happy" / "환자분께서 편안해하시는 모습이 보입니다"
✅ 권장: "they smiled warmly and said thank you" / "긴장했던 표정이 풀리니, 편안해지신 게 느껴졌습니다."

## 2. 활동을 '이야기'로 전환

진료/이벤트를 설명하려 하지 말고, **그 활동이 가져온 '변화'와 '에피소드'**를 적으세요.

❌ 설명조: "오늘은 진료 상담을 했습니다."
✅ 이야기조: "건강이 걱정되어 오셨던 환자분의 표정이 상담 후 밝아졌습니다. 새로운 시작을 앞두고 설레시는 게 느껴졌답니다."

## 3. 이미지 플레이스홀더 배치 (⭐ 중요: 이미지 우선)

- **반드시 이미지 플레이스홀더를 먼저 배치하고, 그 뒤에 해당 이미지와 관련된 텍스트를 작성하세요.**
- 순서: [IMAGE_PLACEHOLDER_1] → [해당 이미지에 대한 설명/이야기]
- 각 이미지는 해당 이미지의 내용을 설명하는 텍스트보다 **먼저** 나와야 합니다.
- ⚠️ 중요: 모든 플레이스홀더는 반드시 [IMAGE_PLACEHOLDER_1], [IMAGE_PLACEHOLDER_2]처럼 **번호를 포함**해야 합니다. [IMAGE_PLACEHOLDER] (번호 없음) 형식은 절대 사용하지 마세요.

## 4. 기본 톤앤매너
${hasStyleReference ? '\n(⚠️ 예시 글이 설정되어 있으므로 예시 글의 문체를 우선합니다)\n' : `
- 부드럽고 공손한 '해요체' 사용
- 전문 용어는 피하고 중학교 수준의 쉬운 어휘 사용
- 위협적 표현 대신 긍정적이고 희망적인 어조 사용
- 문단은 3~4줄로 짧게 끊고 충분한 여백${useEmoji ? '\n- 따뜻한 이모지(😊, 🌞, 🌸 등)를 적절히 사용' : '\n- 이모지는 사용하지 마세요'}
`}

# 🔒 품질 관리 (Quality Control)

## 유사 문서 회피
- 동일한 주제라도 매번 문장 구조와 단어를 변형하여 작성
- 복사-붙여넣기 식의 글은 블로그 지수를 떨어뜨림
- 다양한 문장 구조 사용 (서술형, 의문형, 감탄형, 인용형)

## 의학적 팩트 체크
- 생성된 의학 정보는 최신 지견과 일치해야 함
- 거짓 정보를 사실처럼 말하는 환현(Hallucination) 현상 주의
- 확실하지 않은 의학적 주장은 피하기

## 이미지 및 후기 사용 주의
- 치료 전후 사진이나 자극적인 환부 사진에 대한 직접적 언급 금지
- 가상의 환자 후기 창작 금지
- 일반적인 환자 반응은 "~라고 말씀하시는 분들이 많습니다" 식으로 서술

# Few-shot Example (4단계 프레임워크 적용)

**(입력)**
- 이미지 1 키워드: 진료 상담
- 이미지 2 키워드: 검진, 치료
- 이미지 3 키워드: 건강 관리, 예방

**(나쁜 예 - 금지)**

오전에는 진료 상담을 했습니다. 위 사진을 보면 환자분들이 편안해하시는 모습이 참 좋아 보이죠? 모두 편안하게 진료받으시는 모습이 인상적입니다. 저희는 최고의 시술을 제공합니다.

**(좋은 예 - 4단계 프레임워크 적용)**

[1단계: 공감 - 도입부]
아침저녁으로 쌀쌀한 바람이 불어오는 요즘, 건강 관리가 더욱 걱정되시죠? 이곳 ${region}에도 계절이 바뀌는 요즘, 많은 분들이 구강 건강을 챙기기 위해 찾아오고 계십니다.

[2단계: 정보 제공 - 전문성]
무엇보다 중요한 것은 정기적인 검진입니다. 초기에는 증상이 없어서 놓치기 쉬운 구강 문제들, 미리 확인하고 대비하는 것이 좋겠지요.

[IMAGE_PLACEHOLDER_1]

[3단계: 솔루션 - 차별성]
오늘도 ${centerName}에서는 환자분 한 분 한 분을 위한 맞춤 상담이 이어졌습니다. 환자분의 이야기를 하나하나 들여다보다 보면, 어느새 표정이 밝아지고 마음이 편안해지는 것을 느낄 수 있었답니다. "이제 마음이 놓이네요!" 하며 안도하시는 순간들이 모여, 저희에게도 큰 보람이 됩니다.

[IMAGE_PLACEHOLDER_2]

정밀한 검진을 통해 구강 상태를 꼼꼼히 확인했습니다. 건강 상태를 미리 파악하니 안심된다고 하시는 환자분들의 표정에서, 예방의 중요성을 다시금 느꼈습니다.

[IMAGE_PLACEHOLDER_3]

[4단계: 마무리 - 행동 유도]
오늘도 환자분들의 건강한 미소를 위해 최선을 다해 진료했습니다. 언제든 편하게 찾아오세요. 여러분의 구강 건강을 지키는 것이 저희의 가장 큰 기쁨입니다. 😊

# 🏷️ 제목 생성 규칙 (CRITICAL)

## 1. 제목 최적화 (SEO)
- **길이:** 공백 포함 **25~35자** 이내 (모바일 가독성 + 클릭률 최적화)
- **키워드:** 지역명 + 핵심 키워드 포함 권장
- 예: "${region} 치아건강, 정기 검진의 중요성"

## 2. 본문 분석 우선
- 본문 내용을 분석하여 가장 핵심적인 **'구체적 활동'** 1~2가지를 추출하세요.

## 3. 🚫 제목 금지어 (절대 사용 금지)
다음 상투적 표현이 제목에 포함되면 **절대 안 됩니다:**
- 스타일 금지어: "피어나는", "웃음꽃", "행복한 하루", "가득한", "넘치는", "활력", "일상", "따뜻한"
- 패턴 금지어: "~하는 하루", "~한 일상", "~가 피어났습니다"
- **의료법 금지어:** "완치", "100%", "최고", "1위", "전문병원", "확실한"

## 4. 제목 작성 공식
**[지역/계절] + [핵심 활동/키워드] + [감성 서술]** 조합을 사용하세요.

### ❌ 나쁜 예시 (사용 금지)
- 웃음꽃 피어나는 행복한 하루
- 100% 만족 보장하는 최고의 치과
- 활력이 가득한 즐거운 시간
- 임플란트 전문병원에서의 완치

### ✅ 좋은 예시 (이렇게 작성)
- ${region} 치아건강, 정기 검진으로 지키는 방법 🦷
- "이제 마음이 놓이네요!" 환자분과 함께한 진료 이야기
- 정성 가득한 진료, 환자분의 밝은 미소가 보람 😊
- 꼼꼼한 구강검진, 미래의 건강을 위한 작은 시작
- 세심한 상담으로 전하는 따뜻한 진료 이야기

## 5. 문장 구조 변주
서술형, 의문형, 감탄형 등 문장 구조를 매번 다르게 변주하세요:
- 서술형: "오늘은 ○○○를 했습니다"
- 감탄형: "와! ○○○ 대성공!"
- 의문형: "구강 건강, 얼마나 신경 쓰고 계신가요?"
- 인용형: "\\"이제 마음이 놓이네요!\\" 환자분의 따뜻한 말씀"

# 해시태그 지침 (SEO 최적화)

해시태그 생성 시 **지역명 + 진료과/질환** 조합을 적극적으로 포함하세요:
- #${centerName.replace(/\s/g, '')} (필수)
- #${region.replace(/\s/g, '')}${deptName} (지역+진료과)
- #${region.replace(/\s/g, '')}병원
- #${region.replace(/\s/g, '')}${deptName}추천
- 검색 의도가 반영된 태그 (예: #치아통증 #임플란트비용 #스케일링)
- 진료/시술 관련 해시태그

⚠️ 해시태그에서도 금칙어("완치", "최고", "전문병원" 등) 사용 금지

# 결과 형식

JSON 형식으로 반환하세요:
{
  "title": "블로그 제목 (25~35자, 금지어 절대 사용 금지, 의료법 준수)",
  "content": "본문 내용 (4단계 프레임워크 적용, 이미지 플레이스홀더 포함, 의료법 준수)",
  "hashtags": ["#${centerName.replace(/\s/g, '')}", "#${region.replace(/\s/g, '')}${deptName}", "#해시태그3", ...최대 10개]
}

⚠️ 최종 점검 사항:
1. 의료법 금칙어("완치", "100%", "최고", "전문병원", "할인" 등)가 포함되어 있지 않은지 확인
2. 4단계 프레임워크(공감→정보→솔루션→마무리)가 적용되었는지 확인
3. 제목이 25~35자 이내인지 확인
4. 문단이 3~4줄로 적절히 나뉘었는지 확인`;
};

/**
 * 마크다운 코드 블록 제거
 */
const stripMarkdownCodeBlocks = (text: string): string => {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return text.trim();
};

/**
 * 손상된 JSON에서 내용 추출
 */
const extractContentFromBrokenJson = (
  text: string
): { title?: string; content?: string; hashtags?: string[] } => {
  const result: { title?: string; content?: string; hashtags?: string[] } = {};

  // 제목 추출
  const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }

  // 내용 추출 - 이스케이프된 줄바꿈과 따옴표 처리
  const contentMatch = text.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"hashtags"|"\s*}|$)/);
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

  return result;
};

/**
 * 지연 함수
 */
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// Core Generation Logic (재사용 가능한 함수)
// ============================================

/**
 * 블로그 생성 핵심 로직
 * Action과 InternalAction에서 공통으로 사용
 */
const generateBlogCore = async (
  args: {
    photos: PhotoInput[];
    centerName: string;
    region: string;
    department?: string;
    writingTonePrompt?: string;
    styleConfig?: StyleConfig;
    // New style settings
    writingStyle?: string;
    contentLength?: string;
    useEmoji?: boolean;
  }
): Promise<GeneratedBlogResult> => {
  // 입력 검증
  if (!args.photos || args.photos.length === 0) {
    throw new Error("사진 데이터가 필요합니다.");
  }

  // 환경변수 확인 (Google API Key)
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY가 설정되지 않았습니다. Convex 대시보드에서 환경 변수를 설정해주세요.");
  }

  // 기본값 설정
  const dynamicCenterName = args.centerName || "서울치과의원";
  const dynamicRegion = args.region || "";
  const dynamicDepartment = args.department || "dentistry";

  // 스타일 설정 파싱
  let parsedStyleConfig: StyleConfig | null = null;
  if (args.styleConfig) {
    parsedStyleConfig = args.styleConfig;
  }

  // 사용자 선택 스타일 또는 랜덤 선택
  let selectedPersona: { name: string; prompt: string };
  if (args.writingStyle && WRITING_STYLES[args.writingStyle]) {
    selectedPersona = WRITING_STYLES[args.writingStyle];
  } else {
    selectedPersona = getRandomPersona();
  }

  // 콘텐츠 길이 설정
  const contentLengthKey = args.contentLength || 'medium';
  const lengthConfig = CONTENT_LENGTH_CONFIG[contentLengthKey] || CONTENT_LENGTH_CONFIG.medium;
  const maxTokens = lengthConfig.maxTokens;

  // 이모지 사용 설정 (기본값: true)
  const useEmoji = args.useEmoji !== undefined ? args.useEmoji : true;

  // 시스템 프롬프트 생성
  const systemInstruction = getSystemInstruction(
    dynamicRegion,
    dynamicCenterName,
    parsedStyleConfig,
    args.writingTonePrompt,
    selectedPersona,
    dynamicDepartment,
    useEmoji
  );

  // 진료과 설정 가져오기
  const deptConfig = DEPARTMENT_CONFIGS[dynamicDepartment];
  
  console.log(
    `Generating blog for center: ${dynamicCenterName}, region: ${dynamicRegion}, ` +
    `department: ${deptConfig?.koreanName || 'general'}, ` +
    `persona: ${selectedPersona.name}, ` +
    `contentLength: ${contentLengthKey} (${maxTokens} tokens), ` +
    `useEmoji: ${useEmoji}, ` +
    `hasReferenceText: ${parsedStyleConfig?.styleReferenceText ? 'yes' : 'no'}, ` +
    `hasCustomPrompt: ${parsedStyleConfig?.customPrompt ? 'yes' : 'no'}`
  );

  // Gemini API용 parts 구성
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

  // 사용자 프롬프트 시작
  parts.push({
    text: `다음은 오늘 하루 '${dynamicRegion} ${dynamicCenterName}'의 활동 사진들을 시간 순서대로 나열한 것입니다. 각 사진과 키워드를 참고하여, 사진의 흐름에 따라 자연스러운 하루 일과를 담은 블로그 포스팅을 작성해주세요.\n\n총 ${args.photos.length}장의 사진이 있습니다.\n\n`
  });

  // 각 사진 추가
  for (let i = 0; i < args.photos.length; i++) {
    const photo = args.photos[i];
    parts.push({ text: `--- 사진 ${i + 1} ---` });

    // 이미지 처리 - Gemini API는 base64 인라인 데이터 필요
    if (photo.imageUrl) {
      // data URL인 경우 (이미 base64)
      if (photo.imageUrl.startsWith('data:')) {
        const match = photo.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inline_data: {
              mime_type: match[1],
              data: match[2],
            }
          });
        }
      }
      // HTTP URL인 경우 이미지 fetch 필요
      else if (photo.imageUrl.startsWith('http')) {
        try {
          const imgResponse = await fetch(photo.imageUrl);
          if (imgResponse.ok) {
            const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
            const arrayBuffer = await imgResponse.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ""
              )
            );
            parts.push({
              inline_data: {
                mime_type: contentType,
                data: base64,
              }
            });
          }
        } catch (imgError) {
          console.warn(`Failed to fetch image ${i + 1}:`, imgError);
        }
      }
    }

    parts.push({ text: `사진 ${i + 1} 키워드: ${photo.keyword || "키워드 없음"}\n` });
  }

  parts.push({
    text: "\n위 사진들의 흐름을 자연스럽게 연결하여 하나의 완성된 이야기로 작성하고, 적절한 위치에 이미지 플레이스홀더를 꼭 넣어주세요. JSON 형식으로 응답해주세요."
  });

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
      temperature: 0.8,
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

  // finishReason 확인 - 토큰 제한으로 인한 잘림 감지
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    console.warn("⚠️ Generation stopped due to MAX_TOKENS limit. Content may be truncated.");
    console.warn("Consider increasing maxOutputTokens or reducing content complexity.");
  } else if (finishReason && finishReason !== 'STOP') {
    console.warn(`⚠️ Generation finished with reason: ${finishReason}`);
  }

  // 응답에서 텍스트 추출
  const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!aiContent) {
    console.error("Gemini response structure:", JSON.stringify(data, null, 2));
    throw new Error("AI 응답이 비어있습니다.");
  }

  console.log("AI response received:", aiContent.substring(0, 500));

  // 진료과명 가져오기
  const deptName = deptConfig?.koreanName || '치과';
  
  // 기본 해시태그 (진료과별 맞춤)
  const regionTag = dynamicRegion ? `#${dynamicRegion.replace(/\s/g, '')}${deptName}` : `#${deptName}`;
  const defaultHashtags = [
    `#${dynamicCenterName.replace(/\s/g, '')}`,
    regionTag,
    `#${dynamicRegion.replace(/\s/g, '')}병원`,
    ...(deptConfig?.defaultHashtags || [])
  ];

  // JSON 파싱 (다단계)
  let parsedContent: GeneratedBlogResult;

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
              title: extracted.title || "오늘 하루도 따뜻했습니다 🌸",
              content: extracted.content,
              hashtags: extracted.hashtags || defaultHashtags
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
            title: extracted.title || "오늘 하루도 따뜻했습니다 🌸",
            content: extracted.content,
            hashtags: extracted.hashtags || defaultHashtags
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
      title: "오늘 하루도 따뜻했습니다 🌸",
      content: fallbackContent,
      hashtags: defaultHashtags
    };
    console.log("Using fallback content extraction");
  }

  return parsedContent;
};

// ============================================
// Main Action (클라이언트 호출용)
// ============================================

/**
 * AI 블로그 생성 Action (클라이언트 호출용)
 * 
 * @param photos - 이미지 URL과 키워드 배열
 * @param centerName - 센터명
 * @param region - 지역명
 * @param department - 진료과 (선택)
 * @param writingTonePrompt - 글쓰기 톤 프롬프트 (선택)
 * @param styleConfig - 스타일 설정 (선택)
 * @returns 생성된 블로그 (title, content, hashtags)
 */
export const generateBlog = action({
  args: {
    photos: v.array(
      v.object({
        imageUrl: v.string(),
        keyword: v.optional(v.string()),
      })
    ),
    centerName: v.string(),
    region: v.string(),
    department: v.optional(v.string()),
    writingTonePrompt: v.optional(v.string()),
    styleConfig: v.optional(
      v.object({
        styleReferenceText: v.optional(v.string()),
        customPrompt: v.optional(v.string()),
      })
    ),
    // New style settings
    writingStyle: v.optional(v.string()),
    contentLength: v.optional(v.string()),
    useEmoji: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<GeneratedBlogResult> => {
    return generateBlogCore(args);
  },
});

// ============================================
// Internal Action (다른 Convex 함수에서 호출용)
// ============================================

/**
 * 내부용 AI 블로그 생성 Action
 * 스케줄러나 다른 internal 함수에서 호출할 때 사용
 */
export const generateBlogInternal = internalAction({
  args: {
    photos: v.array(
      v.object({
        imageUrl: v.string(),
        keyword: v.optional(v.string()),
      })
    ),
    centerName: v.string(),
    region: v.string(),
    department: v.optional(v.string()),
    writingTonePrompt: v.optional(v.string()),
    styleConfig: v.optional(
      v.object({
        styleReferenceText: v.optional(v.string()),
        customPrompt: v.optional(v.string()),
      })
    ),
    // New style settings
    writingStyle: v.optional(v.string()),
    contentLength: v.optional(v.string()),
    useEmoji: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<GeneratedBlogResult> => {
    return generateBlogCore(args);
  },
});

// ============================================
// Utility Actions
// ============================================

/**
 * API 연결 상태 확인
 */
export const checkApiStatus = action({
  args: {},
  handler: async (): Promise<{ status: string; hasApiKey: boolean }> => {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    return {
      status: apiKey ? "configured" : "not_configured",
      hasApiKey: !!apiKey,
    };
  },
});

/**
 * 사용 가능한 페르소나 목록 조회
 */
export const getAvailablePersonas = action({
  args: {},
  handler: async (): Promise<Array<{ name: string; prompt: string }>> => {
    return STYLE_PERSONAS;
  },
});
