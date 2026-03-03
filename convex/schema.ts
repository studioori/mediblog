import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for ClinicBlog
 * 
 * 마이그레이션된 Supabase 테이블:
 * - profiles: 사용자 프로필 및 플랜 정보
 * - user_roles: 사용자 권한 관리
 * - activity_logs: 활동 로그
 * - generated_posts: 생성된 블로그 포스트
 * - coupons: 쿠폰 관리
 */

export default defineSchema({
  // ============================================
  // 사용자 프로필 테이블
  // ============================================
  profiles: defineTable({
    // Clerk 사용자 ID (외부 키)
    clerk_id: v.string(),
    email: v.optional(v.string()),
    // 병원명
    center_name: v.string(),
    region: v.optional(v.string()),
    // 플랜 등급 (free/basic/premium)
    plan_tier: v.string(),
    // 월간 사용 제한
    monthly_limit: v.number(),
    // 현재 사용량
    current_usage: v.number(),
    // 활성 상태
    is_active: v.boolean(),
    // 스타일 설정 (JSON 객체)
    style_config: v.optional(v.any()),
    // 글쓰기 톤 프롬프트
    writing_tone_prompt: v.optional(v.string()),
    // 최대 이미지 개수
    max_image_count: v.number(),
    // 구독 만료일 (Unix timestamp in ms)
    subscription_expires_at: v.optional(v.number()),
    // 인사말
    intro_greeting: v.optional(v.string()),
    // 결어
    outro_signature: v.optional(v.string()),
    // 문장 길이 설정
    sentence_length: v.optional(v.string()),
    // 스타일 참조 텍스트
    style_reference_text: v.optional(v.string()),
    // 글 스타일 (warm_friendly, energetic_cheerful, calm_professional, poetic_emotional, concise_clear)
    writing_style: v.optional(v.string()),
    // 글 길이 (short, medium, long)
    content_length: v.optional(v.string()),
    // 이모지 사용 여부
    use_emoji: v.optional(v.boolean()),
    // 생성일 (Unix timestamp in ms)
    created_at: v.number(),
    // 수정일 (Unix timestamp in ms)
    updated_at: v.number(),
  })
    // Clerk ID로 빠른 조회
    .index("by_clerk_id", ["clerk_id"])
    // 이메일로 조회
    // 플랜별 조회
    .index("by_plan_tier", ["plan_tier"])
    // 활성 사용자 조회
    .index("by_is_active", ["is_active"]),

  // ============================================
  // 사용자 권한 테이블
  // ============================================
  user_roles: defineTable({
    // 사용자 ID (profiles.clerk_id와 동일)
    user_id: v.string(),
    // 권한 (admin/user)
    role: v.union(
      v.literal("admin"),
      v.literal("user")
    ),
    // 생성일 (Unix timestamp in ms)
    created_at: v.optional(v.number()),
  })
    // 사용자 ID로 빠른 조회 (고유)
    .index("by_user_id", ["user_id"])
    // 권한별 조회
    .index("by_role", ["role"]),

  // ============================================
  // 활동 로그 테이블
  // ============================================
  activity_logs: defineTable({
    // 사용자 ID
    user_id: v.string(),
    // 액션 타입 (예: "post_generated", "login", "coupon_redeemed")
    action_type: v.string(),
    // 추가 메타데이터 (선택적)
    metadata: v.optional(v.any()),
    // 생성일 (Unix timestamp in ms)
    created_at: v.number(),
  })
    // 사용자별 활동 조회
    .index("by_user_id", ["user_id"])
    // 액션 타입별 조회
    .index("by_action_type", ["action_type"])
    // 사용자+액션 조합 조회
    .index("by_user_and_action", ["user_id", "action_type"])
    // 생성일 기준 정렬
    .index("by_created_at", ["created_at"]),

  // ============================================
  // 생성된 포스트 테이블
  // ============================================
  generated_posts: defineTable({
    // 사용자 ID
    user_id: v.optional(v.string()),
    // 포스트 내용
    content: v.string(),
    // 이미지 경로 배열
    image_paths: v.array(v.string()),
    // 생성일 (Unix timestamp in ms)
    created_at: v.number(),
    // 포스트 제목 (선택적)
    title: v.optional(v.string()),
    // 카테고리 (선택적)
    category: v.optional(v.string()),
    // 발행 상태
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    )),
    // ============================================
    // 건강정보 Q&A 모드 필드 (2025-03-24 추가)
    // ============================================
    // 모드 구분 (daily: 병원일상, health_qa: 건강정보 Q&A)
    mode: v.optional(v.union(
      v.literal("daily"),
      v.literal("health_qa")
    )),
    // 포스트 타입 (refine: 초안 다듬기, generate: 주제로 생성)
    post_type: v.optional(v.union(
      v.literal("refine"),
      v.literal("generate")
    )),
    // 건강 주제 (건강정보 Q&A 모드용)
    topic: v.optional(v.string()),
    // 원장 초안 원문 (초안 다듬기용)
    original_draft: v.optional(v.string()),
    // 진료과 (기본: dentistry)
    department: v.optional(v.string()),
    // 핵심 포인트 배열 (건강정보 Q&A용)
    key_points: v.optional(v.array(v.string())),
    // 해시태그 배열
    hashtags: v.optional(v.array(v.string())),
  })
    // 사용자별 포스트 조회
    .index("by_user_id", ["user_id"])
    // 생성일 기준 정렬
    .index("by_created_at", ["created_at"])
    // 상태별 조회
    .index("by_status", ["status"])
    // 사용자+생성일 조합
    .index("by_user_and_created", ["user_id", "created_at"]),

  // ============================================
  // 쿠폰 테이블
  // ============================================
  coupons: defineTable({
    // 쿠폰 코드 (고유)
    code: v.string(),
    // 유효 기간 (개월)
    duration_months: v.number(),
    // 사용 여부
    is_used: v.boolean(),
    // 사용자 ID (사용한 사람)
    used_by: v.optional(v.string()),
    // 사용일 (Unix timestamp in ms)
    used_at: v.optional(v.number()),
    // 생성자 ID
    created_by: v.optional(v.string()),
    // 생성일 (Unix timestamp in ms)
    created_at: v.number(),
    // 쿠폰 설명 (선택적)
    description: v.optional(v.string()),
  })
    // 쿠폰 코드로 빠른 조회 (고유)
    .index("by_code", ["code"])
    // 사용 여부별 조회
    .index("by_is_used", ["is_used"])
    // 사용자별 사용 쿠폰 조회
    .index("by_used_by", ["used_by"])
    // 생성자별 조회
    .index("by_created_by", ["created_by"]),
});
