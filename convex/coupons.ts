import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// 쿠폰 관리 함수
// ============================================

/**
 * 1. getCouponByCode - 쿠폰 코드로 조회
 * @param code - 쿠폰 코드
 * @returns 쿠폰 정보 또는 null
 */
export const getCouponByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    return coupon;
  },
});

/**
 * 2. getAllCoupons - 모든 쿠폰 목록 조회 (관리자용)
 * @param adminUserId - 관리자 사용자 ID (권한 검증용)
 * @param includeUsed - 사용된 쿠폰 포함 여부 (기본값: true)
 * @returns 쿠폰 목록
 */
export const getAllCoupons = query({
  args: {
    adminUserId: v.string(),
    includeUsed: v.optional(v.boolean()),
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

    const includeUsed = args.includeUsed ?? true;

    if (includeUsed) {
      // 모든 쿠폰 조회
      return await ctx.db.query("coupons").order("desc").collect();
    }

    // 미사용 쿠폰만 조회
    return await ctx.db
      .query("coupons")
      .withIndex("by_is_used", (q) => q.eq("is_used", false))
      .order("desc")
      .collect();
  },
});

/**
 * 3. createCoupons - 쿠폰 대량 생성 (관리자용)
 * @param adminUserId - 관리자 사용자 ID
 * @param coupons - 생성할 쿠폰 배열 [{ code, duration_months, description? }]
 * @returns 생성된 쿠폰 ID 배열
 */
export const createCoupons = mutation({
  args: {
    adminUserId: v.string(),
    coupons: v.array(
      v.object({
        code: v.string(),
        duration_months: v.number(),
        description: v.optional(v.string()),
      })
    ),
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
    const createdIds: string[] = [];
    const errors: { code: string; error: string }[] = [];

    for (const couponData of args.coupons) {
      // 중복 코드 확인
      const existingCoupon = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", couponData.code))
        .first();

      if (existingCoupon) {
        errors.push({
          code: couponData.code,
          error: "이미 존재하는 쿠폰 코드입니다.",
        });
        continue;
      }

      // 유효 기간 검증
      if (couponData.duration_months <= 0) {
        errors.push({
          code: couponData.code,
          error: "유효 기간은 1개월 이상이어야 합니다.",
        });
        continue;
      }

      const couponId = await ctx.db.insert("coupons", {
        code: couponData.code,
        duration_months: couponData.duration_months,
        is_used: false,
        created_by: args.adminUserId,
        created_at: now,
        description: couponData.description,
      });

      createdIds.push(couponId);
    }

    return {
      successCount: createdIds.length,
      errorCount: errors.length,
      createdIds,
      errors,
    };
  },
});

/**
 * 4. redeemCoupon - 쿠폰 사용
 * 스마트 연장 로직:
 * - 활성 구독이 있으면: 만료일 + N개월
 * - 구독이 없거나 만료되었으면: 현재 시점 + N개월
 * 
 * @param userId - 사용자 ID
 * @param code - 쿠폰 코드
 * @returns 사용 결과 (성공 여부, 새 만료일 등)
 */
export const redeemCoupon = mutation({
  args: {
    userId: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. 쿠폰 조회
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!coupon) {
      throw new Error("존재하지 않는 쿠폰 코드입니다.");
    }

    // 2. 쿠폰 사용 여부 확인
    if (coupon.is_used) {
      throw new Error("이미 사용된 쿠폰입니다.");
    }

    // 3. 프로필 조회
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.userId))
      .first();

    if (!profile) {
      throw new Error("프로필을 찾을 수 없습니다.");
    }

    // 4. 스마트 연장 로직
    // 활성 구독이 있는지 확인 (만료일이 있고, 아직 만료되지 않음)
    const hasActiveSubscription =
      profile.subscription_expires_at && profile.subscription_expires_at > now;

    // 연장 기간 계산 (밀리초)
    const extensionMs = coupon.duration_months * 30 * 24 * 60 * 60 * 1000;

    // 새 만료일 계산
    const newExpiresAt = hasActiveSubscription
      ? profile.subscription_expires_at! + extensionMs
      : now + extensionMs;

    // 5. 프로필 업데이트
    await ctx.db.patch(profile._id, {
      subscription_expires_at: newExpiresAt,
      is_active: true,
      updated_at: now,
    });

    // 6. 쿠폰 사용 처리
    await ctx.db.patch(coupon._id, {
      is_used: true,
      used_by: args.userId,
      used_at: now,
    });

    // 7. 활동 로그 기록
    await ctx.db.insert("activity_logs", {
      user_id: args.userId,
      action_type: "coupon_redeemed",
      metadata: {
        coupon_code: coupon.code,
        coupon_id: coupon._id,
        duration_months: coupon.duration_months,
        previous_expires_at: profile.subscription_expires_at,
        new_expires_at: newExpiresAt,
        was_extended: hasActiveSubscription,
      },
      created_at: now,
    });

    // 8. 결과 반환
    return {
      success: true,
      message: hasActiveSubscription
        ? `구독이 ${coupon.duration_months}개월 연장되었습니다.`
        : `구독이 ${coupon.duration_months}개월 시작되었습니다.`,
      couponCode: coupon.code,
      durationMonths: coupon.duration_months,
      previousExpiresAt: profile.subscription_expires_at || null,
      newExpiresAt: newExpiresAt,
      wasExtended: hasActiveSubscription,
    };
  },
});

/**
 * 5. deleteCoupon - 쿠폰 삭제 (관리자용)
 * 이미 사용된 쿠폰은 삭제 불가 (감사 기록 유지)
 * 
 * @param adminUserId - 관리자 사용자 ID
 * @param couponId - 삭제할 쿠폰 ID
 * @returns 삭제 결과
 */
export const deleteCoupon = mutation({
  args: {
    adminUserId: v.string(),
    couponId: v.id("coupons"),
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

    // 쿠폰 조회
    const coupon = await ctx.db.get(args.couponId);

    if (!coupon) {
      throw new Error("쿠폰을 찾을 수 없습니다.");
    }

    // 사용된 쿠폰은 삭제 불가
    if (coupon.is_used) {
      throw new Error("이미 사용된 쿠폰은 삭제할 수 없습니다. (감사 기록 유지)");
    }

    // 쿠폰 삭제
    await ctx.db.delete(args.couponId);

    // 활동 로그 기록
    await ctx.db.insert("activity_logs", {
      user_id: args.adminUserId,
      action_type: "coupon_deleted",
      metadata: {
        coupon_code: coupon.code,
        coupon_id: coupon._id,
        duration_months: coupon.duration_months,
      },
      created_at: Date.now(),
    });

    return {
      success: true,
      message: "쿠폰이 삭제되었습니다.",
      deletedCouponCode: coupon.code,
    };
  },
});

// ============================================
// 추가 유틸리티 함수
// ============================================

/**
 * 사용자의 쿠폰 사용 이력 조회
 * @param userId - 사용자 ID
 * @returns 사용한 쿠폰 목록
 */
export const getUserCouponHistory = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const coupons = await ctx.db
      .query("coupons")
      .withIndex("by_used_by", (q) => q.eq("used_by", args.userId))
      .order("desc")
      .collect();

    return coupons;
  },
});

/**
 * 쿠폰 통계 조회 (관리자용)
 * @param adminUserId - 관리자 사용자 ID
 * @returns 쿠폰 사용 통계
 */
export const getCouponStats = query({
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

    const allCoupons = await ctx.db.query("coupons").collect();

    const totalCoupons = allCoupons.length;
    const usedCoupons = allCoupons.filter((c) => c.is_used).length;
    const unusedCoupons = totalCoupons - usedCoupons;

    // 총 연장된 기간 (개월)
    const totalDurationMonths = allCoupons
      .filter((c) => c.is_used)
      .reduce((sum, c) => sum + c.duration_months, 0);

    return {
      totalCoupons,
      usedCoupons,
      unusedCoupons,
      usageRate: totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0,
      totalDurationMonths,
    };
  },
});

/**
 * 미사용 쿠폰 개수 조회 (관리자용)
 * @param adminUserId - 관리자 사용자 ID
 * @returns 미사용 쿠폰 개수
 */
export const getUnusedCouponCount = query({
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

    const unusedCoupons = await ctx.db
      .query("coupons")
      .withIndex("by_is_used", (q) => q.eq("is_used", false))
      .collect();

    return {
      count: unusedCoupons.length,
    };
  },
});
