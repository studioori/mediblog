# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-04

### Added
- 얼굴 모자이크 기능 구현 (face-api.js, SSD MobileNet V1)
  - `FaceBlurModal` 컴포넌트: 모자이크/이모티콘/원본 선택 모달
  - `useFaceDetection` 훅: 얼굴 인식 로직
  - `faceBlur.ts` 유틸리티: 모자이크/이모티콘 처리
  - 적용 기능: 처리된 이미지를 업로드 목록에 반영
- DOCS_INDEX.md 문서 관리 체계 도입
- 글로벌 AGENTS.md 가이드라인 적용

### Changed
- `profiles` 테이블에서 `department` 필드 제거
- `profiles.id` → `profiles.clerk_id` 로 필드명 변경
- 프로젝트 문서 구조 개편 (docs/ 폴더 추가)

### Fixed
- 이미지 1개 업로드 시 플레이스홀더 미표시 문제 수정

## [0.9.0] - 2026-03-03

### Added
- SCREEN_MAPPING.md 화면 구성 문서 작성
- PROJECT_ANALYSIS.md 프로젝트 분석 문서 작성

### Changed
- Supabase → Convex 백엔드 마이그레이션
- Lovable AI → Google Gemini API 마이그레이션
- 요양원 → 치과/병원 리브랜딩

---

## 버전 관리 가이드라인

### 버전 번호 규칙
- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 기능 추가 (하위 호환)
- **PATCH**: 버그 수정 (하위 호환)

### 변경 유형
- `Added`: 새로운 기능
- `Changed`: 기존 기능 변경
- `Deprecated`: 곧 제거될 기능
- `Removed`: 제거된 기능
- `Fixed`: 버그 수정
- `Security`: 보안 관련 수정
