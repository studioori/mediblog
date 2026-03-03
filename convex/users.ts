import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// 플랜 기본 설정
// ============================================

const PLAN_DEFAULTS = {
  free: {
    monthly_limit: 5,
    max_image_count: 3,
  },
  basic: {
    monthly_limit: 10,
    max_image_count: 10,
  },
  premium: {
    monthly_limit: 30,
    max_image_count: 20,
  },
} as const;

// ============================================
// Query Functions
// ============================================

/**
 * 1. userId로 프로필 조회
 * @param userId - 사용자 ID (Clerk 인증 ID)
 * @returns 프로필 정보 또는 null
 */
export const getProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    return profile;
  },
});

/**
 * 2. email로 프로필 조회
 * @param email - 사용자 이메일
 * @returns 프로필 정보 또는 null
 */
export const getProfileByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    return profile;
  },
});

/**
 * 6. 사용자 권한 조회
 * @param userId - 사용자 ID
 * @returns 권한 정보 또는 null
 */
export const getUserRole = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .first();

    return userRole;
  },
});

/**
 * 8. 생성 가능 여부 확인
 * 구독 만료일, 활성 상태, 월간 사용량 제한 확인
 * @param userId - 사용자 ID
 * @returns 생성 가능 여부와 관련 정보
 */
export const canGenerate = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (!profile) {
      return {
        canGenerate: false,
        reason: "profile_not_found",
        message: "프로필을 찾을 수 없습니다.",
        currentUsage: 0,
        monthlyLimit: 0,
        remainingCount: 0,
      };
    }

    // 활성 상태 확인
    if (!profile.is_active) {
      return {
        canGenerate: false,
        reason: "inactive",
        message: "비활성화된 계정입니다.",
        currentUsage: profile.current_usage,
        monthlyLimit: profile.monthly_limit,
        remainingCount: 0,
      };
    }

    // 구독 만료일 확인
    if (profile.subscription_expires_at) {
      const now = Date.now();
      if (now > profile.subscription_expires_at) {
        return {
          canGenerate: false,
          reason: "subscription_expired",
          message: "구독이 만료되었습니다.",
          currentUsage: profile.current_usage,
          monthlyLimit: profile.monthly_limit,
          remainingCount: 0,
          subscriptionExpiresAt: profile.subscription_expires_at,
        };
      }
    }

    // 월간 사용량 확인
    const remainingCount = profile.monthly_limit - profile.current_usage;

    if (remainingCount <= 0) {
      return {
        canGenerate: false,
        reason: "limit_exceeded",
        message: `월간 생성 한도(${profile.monthly_limit}회)를 초과했습니다.`,
        currentUsage: profile.current_usage,
        monthlyLimit: profile.monthly_limit,
        remainingCount: 0,
      };
    }

    return {
      canGenerate: true,
      reason: null,
      message: "생성 가능합니다.",
      currentUsage: profile.current_usage,
      monthlyLimit: profile.monthly_limit,
      remainingCount,
      subscriptionExpiresAt: profile.subscription_expires_at,
    };
  },
});

// ============================================
// Mutation Functions
// ============================================

/**
 * 3. 새 프로필 생성 (회원가입 시)
 * 기본값: free 플랜, 활성 상태, 기본 권한(user)
 * @param id - 사용자 ID (Clerk 인증 ID)
 * @param email - 이메일 (선택)
 * @param center_name - 병원명
 * @param region - 지역 (선택)
 * @param plan_tier - 플랜 등급 (선택, 기본값: free)
 * @returns 생성된 프로필 ID
 */
export const createProfile = mutation({
  args: {
    clerk_id: v.string(),
    email: v.optional(v.string()),
    center_name: v.string(),
    plan_tier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const planTier = args.plan_tier || "free";
    const planDefaults = PLAN_DEFAULTS[planTier as keyof typeof PLAN_DEFAULTS] || PLAN_DEFAULTS.free;

    // 기존 프로필 존재 여부 확인
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
      .first();

    if (existingProfile) {
throw new Error(`이미 존재하는 사용자입니다: ${args.clerk_id}`);
    }

    // 프로필 생성 (승인 대기 상태)
    const profileId = await ctx.db.insert("profiles", {
      clerk_id: args.clerk_id,
      email: args.email,
      center_name: args.center_name,

      plan_tier: planTier,
      monthly_limit: planDefaults.monthly_limit,
      current_usage: 0,
      is_active: false, // 관리자 승인 대기
      max_image_count: planDefaults.max_image_count,
      created_at: now,
      updated_at: now,
    });

    // 기본 사용자 권한 생성
    await ctx.db.insert("user_roles", {
      user_id: args.clerk_id,
      role: "user",
      created_at: now,
    });

    return profileId;
  }
});

/**
 * 4. 프로필 업데이트
 * @param userId - 사용자 ID
 * @param updates - 업데이트할 필드들
 * @returns 업데이트된 프로필 또는 null
 */
export const updateProfile = mutation({
  args: {
    userId: v.string(),
    updates: v.object({
      email: v.optional(v.string()),
      center_name: v.optional(v.string()),
      region: v.optional(v.string()),
      plan_tier: v.optional(v.string()),
      monthly_limit: v.optional(v.number()),
      current_usage: v.optional(v.number()),
      is_active: v.optional(v.boolean()),
      style_config: v.optional(v.any()),
      writing_tone_prompt: v.optional(v.string()),
      max_image_count: v.optional(v.number()),
      subscription_expires_at: v.optional(v.number()),
      intro_greeting: v.optional(v.string()),
      outro_signature: v.optional(v.string()),
      sentence_length: v.optional(v.string()),
      style_reference_text: v.optional(v.string()),
      writing_style: v.optional(v.string()),
      content_length: v.optional(v.string()),
      use_emoji: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (!profile) {
      throw new Error(`프로필을 찾을 수 없습니다: ${args.userId}`);
    }

    // 플랜 변경 시 기본값도 업데이트
    const updatesToApply: Record<string, unknown> = { ...args.updates };

    if (args.updates.plan_tier) {
      const planDefaults = PLAN_DEFAULTS[args.updates.plan_tier as keyof typeof PLAN_DEFAULTS];

      if (planDefaults) {
        // 명시적으로 설정되지 않은 경우에만 플랜 기본값 적용
        if (args.updates.monthly_limit === undefined) {
          updatesToApply.monthly_limit = planDefaults.monthly_limit;
        }
        if (args.updates.max_image_count === undefined) {
          updatesToApply.max_image_count = planDefaults.max_image_count;
        }
      }
    }

    await ctx.db.patch(profile._id, {
      ...updatesToApply,
      updated_at: Date.now(),
    });

    // 업데이트된 프로필 반환
    return await ctx.db.get(profile._id);
  },
});

/**
 * 5. 사용량 증가
 * 블로그 포스트 생성 시 호출
 * @param userId - 사용자 ID
 * @param amount - 증가시킬 양 (기본값: 1)
 * @returns 업데이트된 사용량 정보
 */
export const incrementUsage = mutation({
  args: {
    userId: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const incrementBy = args.amount ?? 1;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (!profile) {
      throw new Error(`프로필을 찾을 수 없습니다: ${args.userId}`);
    }

    const newUsage = profile.current_usage + incrementBy;

    // 사용량이 제한을 초과하면 에러
    if (newUsage > profile.monthly_limit) {
      throw new Error(
        `월간 생성 한도를 초과했습니다. (현재: ${profile.current_usage}, 한도: ${profile.monthly_limit})`
      );
    }

    await ctx.db.patch(profile._id, {
      current_usage: newUsage,
      updated_at: Date.now(),
    });

    return {
      previousUsage: profile.current_usage,
      currentUsage: newUsage,
      monthlyLimit: profile.monthly_limit,
      remainingCount: profile.monthly_limit - newUsage,
    };
  },
});

/**
 * 7. 사용자 권한 생성/업데이트
 * 권한이 없으면 생성, 있으면 업데이트
 * @param userId - 사용자 ID
 * @param role - 권한 ("admin" | "user")
 * @returns 권한 레코드 ID
 */
export const createOrUpdateUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 기존 권한 조회
    const existingRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .first();

    if (existingRole) {
      // 기존 권한 업데이트
      await ctx.db.patch(existingRole._id, {
        role: args.role,
      });
      return existingRole._id;
    }

    // 새 권한 생성
    const roleId = await ctx.db.insert("user_roles", {
      user_id: args.userId,
      role: args.role,
      created_at: now,
    });

    return roleId;
  },
});

// ============================================
// Additional Helper Functions
// ============================================

/**
 * 월간 사용량 리셋 (cron용)
 * 모든 활성 사용자의 current_usage를 0으로 리셋
 * @returns 리셋된 사용자 수
 */
export const resetMonthlyUsage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_is_active", (q) => q.eq("is_active", true))
      .collect();

    const now = Date.now();
    let resetCount = 0;

    for (const profile of profiles) {
      if (profile.current_usage > 0) {
        await ctx.db.patch(profile._id, {
          current_usage: 0,
          updated_at: now,
        });
        resetCount++;
      }
    }

    return {
      resetCount,
      totalActiveUsers: profiles.length,
    };
  },
});

/**
 * 현재 인증된 사용자의 전체 정보 조회
 * 프로필 + 권한 + 생성 가능 여부를 한번에 조회
 * @param userId - 사용자 ID
 * @returns 통합 사용자 정보
 */
export const getCurrentUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .first();

    const remainingCount = profile.monthly_limit - profile.current_usage;
    const isSubscriptionValid =
      !profile.subscription_expires_at || profile.subscription_expires_at > Date.now();

    return {
      profile,
      role: userRole?.role || "user",
      canGenerate: profile.is_active && isSubscriptionValid && remainingCount > 0,
      remainingCount,
      isSubscriptionValid,
    };
  },
});

/**
 * 활동 로그 추가
 * @param userId - 사용자 ID
 * @param actionType - 액션 타입
 * @param metadata - 추가 메타데이터
 */
export const logActivity = mutation({
  args: {
    userId: v.string(),
    actionType: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activity_logs", {
      user_id: args.userId,
      action_type: args.actionType,
      metadata: args.metadata,
      created_at: Date.now(),
    });

    return true;
  },
});

// 기존 함수명 호환성 유지 (deprecated - getProfile 사용 권장)
export const getProfileByUserId = getProfile;

/**
 * pending 프로필을 실제 Clerk ID로 연결
 * 회원가입 시 임시 ID로 생성된 프로필을 로그인 시 실제 ID로 업데이트
 */
export const linkPendingProfile = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const pendingId = `pending_${args.email}`;
    
    // pending 프로필 찾기
    const pendingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", pendingId))
      .first();

    if (!pendingProfile) {
      // pending 프로필이 없으면 새로 생성
      console.log(`No pending profile found for ${args.email}, creating new one`);
      const now = Date.now();
      const profileId = await ctx.db.insert("profiles", {
        clerk_id: args.clerkUserId,
        email: args.email,
        center_name: "병원명 미설정",
        region: "",
        plan_tier: "free",
        monthly_limit: 5,
        current_usage: 0,
        is_active: false,
        max_image_count: 3,
        created_at: now,
        updated_at: now,
      });

      // 기본 사용자 권한 생성
      await ctx.db.insert("user_roles", {
        user_id: args.clerkUserId,
        role: "user",
        created_at: now,
      });

      return { linked: false, created: true, profileId };
    }

    // 이미 실제 ID로 된 프로필이 있는지 확인
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerkUserId))
      .first();

    if (existingProfile) {
      // 이미 실제 프로필이 있으면 pending 삭제
      await ctx.db.delete(pendingProfile._id);
      return { linked: false, created: false, profileId: existingProfile._id };
    }

    // pending 프로필을 실제 ID로 업데이트
    await ctx.db.patch(pendingProfile._id, {
      clerk_id: args.clerkUserId,
      updated_at: Date.now(),
    });

    // user_roles도 업데이트
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", pendingId))
      .first();

    if (userRole) {
      await ctx.db.patch(userRole._id, {
        user_id: args.clerkUserId,
      });
    } else {
      // 권한이 없으면 생성
      await ctx.db.insert("user_roles", {
        user_id: args.clerkUserId,
        role: "user",
        created_at: Date.now(),
      });
    }

    console.log(`Linked pending profile ${pendingId} to ${args.clerkUserId}`);
    return { linked: true, created: false, profileId: pendingProfile._id };
  },
});
// ============================================
// Migration Functions
// ============================================

/**
 * department 컬럼의 값을 null로 설정
 * 컬럼 자체는 Convex가 관리하므로 명시적인 제거가 필요함
 */
export const clearDepartmentValues = internalMutation({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let updatedCount = 0;
    for (const profile of profiles) {
      // TypeScript는 이미 department가 제거된 것으로 알고 있으므로, any 타입 사용
      const profileAny = profile as any;
      if (profileAny.department !== undefined) {
        await ctx.db.patch(profile._id, {
          department: undefined,
          updated_at: Date.now(),
        } as any);
        updatedCount++;
      }
    }

    console.log(`Cleared department values from ${updatedCount} profiles`);
    return {
      totalProfiles: profiles.length,
      updatedProfiles: updatedCount,
      message: `Cleared department values from ${updatedCount} profiles`,
    };
  },
});

/**
 * id 필드를 clerk_id로 마이그레이션
 * 기존 데이터에 id 필드가 있고 clerk_id가 없는 경우 실행
 */
export const migrateIdToClerkId = mutation({
  args: {},
  handler: async (ctx, _args) => {
    const profiles = await ctx.db.query("profiles").collect();

    let migratedCount = 0;
    for (const profile of profiles) {
      const profileAny = profile as any;
      
      // id 필드가 있고 clerk_id가 없으면 마이그레이션
      if (profileAny.id !== undefined && profile.clerk_id === undefined) {
        await ctx.db.patch(profile._id, {
          clerk_id: profileAny.id,
          id: undefined,
          updated_at: Date.now(),
        } as any);
        migratedCount++;
        console.log(`Migrated profile ${profile._id}: id -> clerk_id = ${profileAny.id}`);
      }
    }

    return {
      totalProfiles: profiles.length,
      migratedProfiles: migratedCount,
      message: `Migrated ${migratedCount} profiles from 'id' to 'clerk_id'`,
    };
  },
});
