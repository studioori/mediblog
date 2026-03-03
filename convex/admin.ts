import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// Admin Query Functions
// ============================================

/**
 * 모든 프로필 조회 (관리자용)
 * 어드민 계정 제외
 */
export const getAllProfiles = query({
  args: {
    adminUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 모든 프로필 조회
    const profiles = await ctx.db
      .query("profiles")
      .order("desc")
      .collect();

    // 어드민 계정 ID 수집
    const adminRoles = await ctx.db
      .query("user_roles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const adminUserIds = new Set(adminRoles.map((r) => r.user_id));

    // 어드민 제외한 클라이언트 프로필만 반환
    return profiles.filter((p) => !adminUserIds.has(p.clerk_id));
  },
});

/**
 * 모든 어드민 사용자 ID 조회
 */
export const getAdminUserIds = query({
  args: {},
  handler: async (ctx) => {
    const adminRoles = await ctx.db
      .query("user_roles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    return adminRoles.map((r) => r.user_id);
  },
});

/**
 * 관리자 대시보드 통계 조회
 */
export const getAdminStats = query({
  args: {
    adminUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 모든 프로필 조회
    const profiles = await ctx.db.query("profiles").collect();

    // 어드민 계정 ID 수집
    const adminRoles = await ctx.db
      .query("user_roles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const adminUserIds = new Set(adminRoles.map((r) => r.user_id));

    // 클라이언트 프로필만 필터링
    const clientProfiles = profiles.filter((p) => !adminUserIds.has(p.clerk_id));

    // 오늘 생성된 포스트 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const allPosts = await ctx.db
      .query("generated_posts")
      .withIndex("by_created_at", (q) => q.gte("created_at", todayStart))
      .collect();

    // 월간 사용량 합계
    const monthlyUsageSum = clientProfiles.reduce(
      (sum, p) => sum + (p.current_usage || 0),
      0
    );

    // 승인 대기 수
    const pendingCount = clientProfiles.filter((p) => !p.is_active).length;

    return {
      totalUsers: clientProfiles.length,
      pendingApproval: pendingCount,
      todayPosts: allPosts.length,
      monthlyUsage: monthlyUsageSum,
    };
  },
});

/**
 * 사용자별 마지막 활동 시간 조회
 */
export const getLastActiveTimes = query({
  args: {
    userIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};

    for (const userId of args.userIds) {
      const logs = await ctx.db
        .query("activity_logs")
        .withIndex("by_user_id", (q) => q.eq("user_id", userId))
        .order("desc")
        .first();

      if (logs) {
        result[userId] = logs.created_at;
      }
    }

    return result;
  },
});

/**
 * 사용자별 포스트 수 조회
 */
export const getPostCountsByUsers = query({
  args: {
    userIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Record<string, number> = {};

    for (const userId of args.userIds) {
      const posts = await ctx.db
        .query("generated_posts")
        .withIndex("by_user_id", (q) => q.eq("user_id", userId))
        .collect();

      result[userId] = posts.length;
    }

    return result;
  },
});

/**
 * 특정 사용자의 권한 조회
 */
export const getUserRoleByUserId = query({
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
 * 관리자용 활동 로그 조회 (전체)
 */
export const getActivityLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);

    const logs = await ctx.db
      .query("activity_logs")
      .withIndex("by_created_at", (q) => q)
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * 특정 사용자의 활동 로그 조회
 */
export const getActivityLogsByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);

    const logs = await ctx.db
      .query("activity_logs")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * 관리자용 전체 포스트 조회
 */
export const getAllPosts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);

    const posts = await ctx.db
      .query("generated_posts")
      .withIndex("by_created_at", (q) => q)
      .order("desc")
      .take(limit);

    return posts;
  },
});

// ============================================
// Admin Mutation Functions
// ============================================

/**
 * 관리자용 프로필 업데이트
 */
export const adminUpdateProfile = mutation({
  args: {
    adminUserId: v.string(),
    targetUserId: v.string(),
    updates: v.object({
      center_name: v.optional(v.string()),
      region: v.optional(v.string()),
      monthly_limit: v.optional(v.number()),
      is_active: v.optional(v.boolean()),
      plan_tier: v.optional(v.string()),
      max_image_count: v.optional(v.number()),
      style_config: v.optional(v.any()),
      email: v.optional(v.string()),
      writing_style: v.optional(v.string()),
      content_length: v.optional(v.string()),
      use_emoji: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 대상 프로필 조회
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.targetUserId))
      .first();

    if (!profile) {
      throw new Error("프로필을 찾을 수 없습니다.");
    }

    // 업데이트 실행
    await ctx.db.patch(profile._id, {
      ...args.updates,
      updated_at: Date.now(),
    });

    return await ctx.db.get(profile._id);
  },
});

/**
 * 관리자용 사용자 권한 업데이트
 */
export const adminUpdateUserRole = mutation({
  args: {
    adminUserId: v.string(),
    targetUserId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 대상 사용자 권한 조회
    const targetRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.targetUserId))
      .first();

    if (!targetRole) {
      // 권한 레코드가 없으면 생성
      await ctx.db.insert("user_roles", {
        user_id: args.targetUserId,
        role: args.role,
        created_at: Date.now(),
      });
    } else {
      // 기존 권한 업데이트
      await ctx.db.patch(targetRole._id, {
        role: args.role,
      });
    }

    return { success: true };
  },
});

/**
 * 관리자용 새 사용자 생성
 * Clerk 인증과 함께 사용되어야 함
 */
export const adminCreateUser = mutation({
  args: {
    adminUserId: v.string(),
    userId: v.string(),
    email: v.optional(v.string()),
    centerName: v.string(),
    region: v.optional(v.string()),
    planTier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    const now = Date.now();
    const planTier = args.planTier || "trial";

    // 플랜 기본값 설정
    const planDefaults: Record<string, { monthlyLimit: number; maxImageCount: number }> = {
      trial: { monthlyLimit: 15, maxImageCount: 5 },
      basic: { monthlyLimit: 15, maxImageCount: 5 },
      premium: { monthlyLimit: 30, maxImageCount: 10 },
      free: { monthlyLimit: 5, maxImageCount: 3 },
    };

    const defaults = planDefaults[planTier] || planDefaults.trial;

    // 기존 프로필 확인
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (existingProfile) {
      throw new Error("이미 존재하는 사용자입니다.");
    }

    // 프로필 생성
    const profileId = await ctx.db.insert("profiles", {
      clerk_id: args.userId,
      email: args.email,
      center_name: args.centerName,
      region: args.region,
      plan_tier: planTier,
      monthly_limit: defaults.monthlyLimit,
      current_usage: 0,
      is_active: true,
      max_image_count: defaults.maxImageCount,
      created_at: now,
      updated_at: now,
    });

    // 기본 사용자 권한 생성
    await ctx.db.insert("user_roles", {
      user_id: args.userId,
      role: "user",
      created_at: now,
    });

    // 활동 로그 기록
    await ctx.db.insert("activity_logs", {
      user_id: args.userId,
      action_type: "USER_CREATED_BY_ADMIN",
      metadata: {
        created_by: args.adminUserId,
        center_name: args.centerName,
      },
      created_at: now,
    });

    return { profileId };
  },
});

/**
 * 관리자용 사용자 삭제
 * 포스트, 활동 로그, 권한 등 모든 연관 데이터 삭제
 */
export const adminDeleteUser = mutation({
  args: {
    adminUserId: v.string(),
    targetUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 프로필 조회
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.targetUserId))
      .first();

    if (!profile) {
      throw new Error("프로필을 찾을 수 없습니다.");
    }

    // 사용자 포스트 삭제
    const posts = await ctx.db
      .query("generated_posts")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.targetUserId))
      .collect();

    for (const post of posts) {
      await ctx.db.delete(post._id);
    }

    // 활동 로그 삭제
    const logs = await ctx.db
      .query("activity_logs")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.targetUserId))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // 권한 삭제
    const targetRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.targetUserId))
      .first();

    if (targetRole) {
      await ctx.db.delete(targetRole._id);
    }

    // 프로필 삭제
    await ctx.db.delete(profile._id);

    return {
      success: true,
      deletedPostsCount: posts.length,
      deletedLogsCount: logs.length,
    };
  },
});

/**
 * 스타일 설정 업데이트
 */
export const updateStyleConfig = mutation({
  args: {
    userId: v.string(),
    styleConfig: v.any(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (!profile) {
      throw new Error("프로필을 찾을 수 없습니다.");
    }

    await ctx.db.patch(profile._id, {
      style_config: args.styleConfig,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * 사용자별 포스트 수 조회 (단일)
 */
export const getPostCountByUserSimple = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("generated_posts")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.userId))
      .collect();

    return posts.length;
  },
});

/**
 * 프로필과 권한을 함께 조회 (관리자용)
 */
export const getProfileWithRole = query({
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

    return {
      ...profile,
      role: userRole?.role || "user",
    };
  },
});

/**
 * 관리자용 - 프로필 + 활동 정보 통합 조회
 * 한 번의 호출로 profiles, lastActive, totalPosts 모두 조회
 */
export const getProfilesWithAnalytics = query({
  args: {
    adminUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 모든 프로필 조회
    const profiles = await ctx.db
      .query("profiles")
      .order("desc")
      .collect();

    // 어드민 계정 ID 수집
    const adminRoles = await ctx.db
      .query("user_roles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const adminUserIds = new Set(adminRoles.map((r) => r.user_id));

    // 클라이언트 프로필만 필터링
    const clientProfiles = profiles.filter((p) => !adminUserIds.has(p.clerk_id));

    // 마지막 활동 시간 맵 구성
    const lastActiveMap: Record<string, number> = {};
    for (const profile of clientProfiles) {
      const lastLog = await ctx.db
        .query("activity_logs")
        .withIndex("by_user_id", (q) => q.eq("user_id", profile.clerk_id))
        .order("desc")
        .first();

      if (lastLog) {
        lastActiveMap[profile.clerk_id] = lastLog.created_at;
      }
    }

    // 포스트 수 맵 구성
    const postCountMap: Record<string, number> = {};
    for (const profile of clientProfiles) {
      const posts = await ctx.db
        .query("generated_posts")
        .withIndex("by_user_id", (q) => q.eq("user_id", profile.clerk_id))
        .collect();
      postCountMap[profile.clerk_id] = posts.length;
    }

    // 각 프로필에 활동 정보 추가
    const enrichedProfiles = clientProfiles.map((profile) => ({
      ...profile,
      lastActive: lastActiveMap[profile.clerk_id] || null,
      totalPosts: postCountMap[profile.clerk_id] || 0,
    }));

    return enrichedProfiles;
  },
});

/**
 * 관리자용 - 이메일 업데이트
 * 이메일은 profiles 테이블에만 저장 (Clerk 이메일은 별도 관리)
 */
export const adminUpdateEmail = mutation({
  args: {
    adminUserId: v.string(),
    targetUserId: v.string(),
    newEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // 관리자 권한 확인
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.adminUserId))
      .first();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }

    // 대상 프로필 조회
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.targetUserId))
      .first();

    if (!profile) {
      throw new Error("프로필을 찾을 수 없습니다.");
    }

    // 이메일 업데이트
    await ctx.db.patch(profile._id, {
      email: args.newEmail,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});
