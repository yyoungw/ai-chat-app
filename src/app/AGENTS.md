# App Router AGENTS

## Module Context

Next.js App Router 영역. 페이지 UI 셸과 서버 Route Handler(채팅 SSE, MCP 프록시)를 담당한다.

## Tech Stack & Constraints

- App Router only. Pages Router 금지.
- 서버 로직은 `src/app/api/**/route.ts` Route Handler로만 작성.
- 스트리밍: SSE, 권장 경로 `/api/chat/stream`.
- Client Component는 상호작용이 필요할 때만 `"use client"`. 기본은 Server Component.

## Implementation Patterns

채팅 레이아웃 골격:

- 상단: 모델/MCP 서버 관리 진입
- 본문: 유저/AI 버블 + MCP 결과 카드 타임라인
- 하단: 입력창 (텍스트, 전송). `/` 입력은 Prompt 전용 힌트

SSE 응답:

- `token` / `mcp` / `done` / `error` 이벤트
- MCP 프록시는 `/api/mcp-host/**` (이 앱의 `/api/mcp` 서버와 경로가 겹치지 않게 분리)
- 클라이언트 AbortController와 연동해 중단 가능해야 함
- 상태코드 에러는 통일된 에러 페이로드로 변환 후 전달

테마/글로벌 스타일: `globals.css` (shadcn CSS variables). 폰트 변수는 `--font-sans` 등 테마 토큰과 일치시킨다.

## Testing Strategy

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- 스트리밍 추가 시: 정상 청크 / Abort 취소 / 4xx·5xx 매핑을 수동 또는 테스트로 검증

## Local Golden Rules

### Do's

- Gemini·MCP 호출은 이 레이어(또는 여기가 호출하는 `src/lib`)에서만 수행.
- 로딩·에러·빈 상태를 시맨틱 마크업과 키보드 접근성으로 노출.

### Don'ts

- Route Handler 밖에서 비밀키를 읽거나 클라이언트에 전달하지 않는다.
- 한 route 파일에 UI·비즈니스·어댑터를 몰아넣지 않는다. 어댑터는 `src/lib`로 분리.
- DB 접근은 `/api/storage/**`와 MCP connect의 시크릿 조회처럼 서버 경로에서만 한다.
