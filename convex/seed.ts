import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * 초기 관리자 생성 (처음 한 번만 실행)
 * 이미 관리자가 있으면 실행되지 않음
 */
export const seedFirstAdmin = mutation({
  args: {
    email: v.string(),
    centerName: v.string(),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 기존 관리자 확인
    const existingAdmin = await ctx.db
      .query("user_roles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (existingAdmin) {
      return { success: false, message: "이미 관리자가 존재합니다." };
    }

    // 기존 프로필 확인 (이메일로)
    const existingProfile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingProfile) {
      // 기존 프로필이 있으면 관리자 권한만 추가
      await ctx.db.insert("user_roles", {
        user_id: existingProfile.clerk_id,
        role: "admin",
        created_at: Date.now(),
      });
      return { success: true, message: "기존 사용자에게 관리자 권한 부여됨", userId: existingProfile.clerk_id };
    }

    // 새 관리자 생성을 위한 임시 ID
    // 실제로는 Clerk 회원가입 후 얻은 ID를 사용해야 함
    return { 
      success: false, 
      message: "먼저 웹사이트에서 회원가입을 해주세요. 회원가입 후 이 함수를 다시 호출하면 관리자 권한이 부여됩니다.",
      hint: "http://localhost:8080/auth 에서 회원가입 후 다시 시도하세요."
    };
  },
});

/**
 * 이메일로 사용자 찾아서 관리자 권한 부여
 */
export const setAdminByEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // 프로필 찾기
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!profile) {
      return { 
        success: false, 
        message: "해당 이메일의 사용자를 찾을 수 없습니다. 먼저 회원가입을 해주세요." 
      };
    }

    // 기존 권한 확인
    const existingRole = await ctx.db
      .query("user_roles")
      .withIndex("by_user_id", (q) => q.eq("user_id", profile.clerk_id))
      .first();

    if (existingRole) {
      // 기존 권한 업데이트
      await ctx.db.patch(existingRole._id, {
        role: "admin",
      });
    } else {
      // 새 권한 생성
      await ctx.db.insert("user_roles", {
        user_id: profile.clerk_id,
        role: "admin",
        created_at: Date.now(),
      });
    }

    // 프로필 승인 처리 (is_active = true)
    await ctx.db.patch(profile._id, {
      is_active: true,
    });

    return {
      success: true,
      message: `${args.email} 님에게 관리자 권한이 부여되었습니다!`,
      userId: profile.clerk_id
    };
  },
});

/**
 * 데모용 업체 3곳 생성
 * (관리자 페이지에서 데모 데이터로 사용)
 */
export const createDemoClinics = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // 데모 업체 데이터
    const demoClinics = [
      {
        id: `demo_clinic_${Date.now()}_1`,
        email: "demo1@seoul-dental.com",
        center_name: "서울치과의원",
        region: "서울 강남구",
        plan_tier: "premium",
        monthly_limit: 30,
        max_image_count: 20,
        current_usage: 12,
      },
      {
        id: `demo_clinic_${Date.now()}_2`,
        email: "demo2@happy-smile.com",
        center_name: "해맑은치과",
        region: "경기 성남시",
        plan_tier: "basic",
        monthly_limit: 10,
        max_image_count: 10,
        current_usage: 7,
      },
      {
        id: `demo_clinic_${Date.now()}_3`,
        email: "demo3@busan-dental.com",
        center_name: "부산중앙치과",
        region: "부산 해운대구",
        plan_tier: "free",
        monthly_limit: 5,
        max_image_count: 3,
        current_usage: 3,
      },
    ];

    const createdProfiles = [];

    for (const clinic of demoClinics) {
      // 이미 존재하는지 확인
      const existing = await ctx.db
        .query("profiles")
        .filter((q) => q.eq(q.field("email"), clinic.email))
        .first();

      if (existing) {
        createdProfiles.push({ email: clinic.email, status: "already_exists" });
        continue;
      }

      // 프로필 생성
      const profileId = await ctx.db.insert("profiles", {
        clerk_id: clinic.id,
        email: clinic.email,
        center_name: clinic.center_name,
        region: clinic.region,
        plan_tier: clinic.plan_tier,
        monthly_limit: clinic.monthly_limit,
        current_usage: clinic.current_usage,
        is_active: true,
        max_image_count: clinic.max_image_count,
        created_at: now,
        updated_at: now,
      });

      // 사용자 권한 생성
      await ctx.db.insert("user_roles", {
        user_id: clinic.id,
        role: "user",
        created_at: now,
      });

      // 활동 로그 생성 (데모용)
      await ctx.db.insert("activity_logs", {
        user_id: clinic.id,
        action_type: "DEMO_ACCOUNT_CREATED",
        metadata: {
          center_name: clinic.center_name,
          plan_tier: clinic.plan_tier,
        },
        created_at: now,
      });

      createdProfiles.push({ 
        email: clinic.email, 
        center_name: clinic.center_name,
        status: "created",
        profileId 
      });
    }

    return {
      success: true,
      message: "데모 업체 3곳이 생성되었습니다!",
      profiles: createdProfiles,
    };
  },
});
