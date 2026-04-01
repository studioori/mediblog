# AGENTS.md

AI 어시스턴트용 프로젝트 가이드

## Project Overview

**Mediblog** (🏥) is an AI-powered blog generator for Korean dental clinics and hospitals. Users upload activity photos and the AI generates professional yet warm blog posts suitable for patients and their families.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Convex (serverless backend with real-time subscriptions)
- **Authentication**: Clerk
- **AI**: Google Gemini API
- **UI**: shadcn/ui components + Tailwind CSS + Radix UI primitives
- **State Management**: TanStack Query (client), Convex React hooks (backend)
- **Routing**: react-router-dom
- **Face Detection**: face-api.js (`@vladmandic/face-api`)

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint
npm run lint

# Preview production build
npm run preview

# Start Convex development server (required for backend)
npx convex dev
```

**Note**: Both `npm run dev` and `npx convex dev` must run simultaneously for full development experience.

## Environment Variables

Required in `.env`:
- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk authentication key
- `GOOGLE_API_KEY` - Google Gemini API key (set in Convex dashboard)

See `.env.example.convex` for Convex configuration template.

## Architecture

### Key Patterns

**Convex Functions**
- Queries: Real-time subscribed data fetching (`useQuery`)
- Mutations: Data modifications (`useMutation`)
- Actions: External API calls (AI generation uses this)
- Internal functions: Server-side only operations

**Authentication Flow**
- Clerk handles auth UI and session
- `AuthContext` (`src/contexts/AuthContext.tsx`) wraps Clerk + Convex user data
- User profiles stored in Convex `profiles` table
- Role-based access via `user_roles` table (admin/user)

**Blog Generation Flow**
1. User uploads photos → compressed client-side
2. Photos uploaded to Convex file storage
3. `generateBlog` action called with image URLs + user preferences
4. Google Gemini AI generates content
5. Result saved to `generated_posts` table

### Database Tables (Convex Schema)

- `profiles` - User profiles with plan tiers and usage limits
- `user_roles` - Role assignments (admin/user)
- `activity_logs` - User activity tracking
- `generated_posts` - Generated blog content
- `coupons` - Subscription coupon management

## Conventions

### 코딩 컨벤션

- **TypeScript**: Strict mode, no `as any`, `@ts-ignore`, `@ts-expect-error`
- **Imports**: Use `@/` alias for `src/`
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS classes, shadcn/ui for UI primitives

### 네이밍 규칙

- **Files**: PascalCase for components (`PhotoUploader.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePhotoBlog.ts`)
- **Constants**: UPPER_SNAKE_CASE (`EMOJI_LIST`)
- **Types**: PascalCase (`PhotoItem`, `FaceBoundingBox`)

### 커밋 메시지

- 한국어 또는 영어 사용 (일관성 유지)
- 명확한 변경 사항 설명
- 예: "얼굴 모자이크 처리 속도 개선", "Fix: 이미지 압축 품질 조정"

## Path Aliases

The project uses `@/` as an alias for `src/`:
```typescript
import { Button } from "@/components/ui/button";
```

## UI Components

Components in `src/components/ui/` are generated via shadcn/ui CLI. To add new components:
```bash
npx shadcn@latest add [component-name]
```

## Korean Language Context

The application targets Korean dental clinics and hospitals. Content and UI are in Korean. Key terminology:
- 병원명 - Hospital/clinic name (replaced 센터명)
- 지역 - Region
- 치과 - Dental clinic
- 의원 - Medical clinic

## Branding

- **Brand Name**: Mediblog
- **Emoji**: 🏥 (hospital)
- **Example Hospital**: 서울치과의원
- **Tagline**: 환자들에게 다가가는 병원 소통 플랫폼

## Migration Notes

This project was migrated from:
- **Supabase → Convex** (backend)
- **Lovable AI → Google Gemini API** (AI generation)
- **Senior care center → Dental/hospital focus** (rebranding)
