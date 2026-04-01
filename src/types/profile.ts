/**
 * Profile Types for Mediblog
 * 
 * Convex 스키마 기반 타입 정의
 * 모든 Profile 관련 타입은 이 파일에서 중앙 관리
 */

/**
 * 기본 Profile 타입 (Convex profiles 테이블 기반)
 * AuthContext 및 일반 사용용
 */
export interface Profile {
  _id: string;
  clerk_id: string;
  email?: string;
  center_name: string;
  region?: string;
  department?: string;
  plan_tier: 'free' | 'basic' | 'premium';
  monthly_limit: number;
  current_usage: number;
  is_active: boolean;
  created_at: number;
  updated_at: number;
  writing_tone_prompt?: string | null;
  max_image_count: number;
  subscription_expires_at?: number | null;
  writing_style?: string;
  content_length?: string;
  use_emoji?: boolean;
  style_config?: any;
  intro_greeting?: string;
  outro_signature?: string;
  sentence_length?: string;
  style_reference_text?: string;
}

/**
 * 시뮬레이션/데모용 Profile 타입
 * Admin 시뮬레이션, 데모 모드에서 사용
 */
export interface SimulationProfile {
  id: string;
  clerk_id: string;
  center_name: string;
  region: string;
  department?: string;
  plan_tier?: 'free' | 'basic' | 'premium';
  monthly_limit?: number;
  current_usage?: number;
  is_active?: boolean;
  max_image_count?: number;
  writing_tone_prompt?: string | null;
  style_config?: any;
  writing_style?: string;
  content_length?: string;
  use_emoji?: boolean;
}

/**
 * Admin 페이지용 Analytics 포함 Profile
 */
export interface ProfileWithAnalytics extends Profile {
  lastActive?: number | null;
  totalPosts?: number;
}

/**
 * AdminSimulationBar에서 사용하는 최소한의 Profile
 */
export interface SimulationProfileMin {
  id: string;
  clerk_id: string;
  center_name: string;
  region: string;
  department?: string;
  writing_tone_prompt?: string | null;
  style_config?: any;
  max_image_count: number;
}

/**
 * UsageHistoryModal용 Profile 프래그먼트
 */
export interface ProfileForUsage {
  clerk_id: string;
  center_name: string;
  email?: string;
}
