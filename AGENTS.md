# AGENTS.md

## Operational Commands

패키지 매니저: `pnpm` 고정. npm / yarn / bun 사용 금지.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm exec tsc --noEmit
```

UI 컴포넌트 추가:

```bash
pnpm dlx shadcn@latest add <component>
```

환경 변수: `.env.local` (`GEMINI_API_KEY`, `LLM_MODEL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` 등). 커밋 금지.

Node: LTS 권장.

---

## Golden Rules

### Immutable

- Gemini / MCP / 외부 API는 서버 사이드(Route Handler)에서만 호출한다. 클라이언트 직접 호출 금지.
- API 키·시크릿을 코드·localStorage·클라이언트 번들에 넣지 않는다.
- Supabase는 Route Handler에서만 호출한다. `SUPABASE_URL` / `SUPABASE_ANON_KEY`는 서버 전용이며 `NEXT_PUBLIC_` 금지.
- 모든 소스 파일은 500 LOC 이하. 초과 시 모듈 분리.

### Do's

- MVP 범위만 구현한다.
- shadcn/ui + Tailwind CSS + Lucide로 UI를 구성한다.
- 상태관리는 React state / 로컬 훅을 우선한다. 전역 스토어는 필요성이 명확할 때만.
- SSE 스트리밍은 AbortController로 취소를 지원한다.
- 에러는 통일 코드로 매핑한다 (401/403/429/5xx). UI는 친절한 문구 + 재시도.
- 로깅 시 민감 필드를 마스킹한다.

### Don'ts

- create-next-app 기본 UI를 제품 UI로 확장하지 않는다. shadcn 컴포넌트부터 조립한다.
- 민감 MCP 자격증명을 localStorage에 저장하지 않는다. 메타는 DB, 시크릿은 `mcp_server_secrets`에만 저장한다.
- 커밋에 `.env.local`을 포함하지 않는다.

---

## Project Context

MCP Host & Client를 포함한 AI 채팅 MVP. Next.js App Router로 FE/BE를 통합하고, Gemini 스트리밍 채팅과 MCP 도구 결과를 한 화면에서 제공한다.

Tech Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (base-nova), Lucide, Gemini API (서버), Supabase Postgres (서버 Route Handler), localStorage (캐시·이관), Vercel 배포 권장.

---

## Standards & References

- 경로 alias: `@/*` → `src/*` (`components.json` aliases 준수).
- 커밋: 짧게, why 중심. 사용자 요청 시에만 커밋.
- 응답/설명: 결론 먼저, 가정·제약은 뒤에. 한국어.
- Maintenance Policy: 규칙과 코드가 어긋나면 AGENTS.md 업데이트를 제안한다. 존재하지 않는 스크립트·경로를 문서에 남기지 않는다.

---

## Context Map

- **[App Router / API / SSE](./src/app/AGENTS.md)** — 페이지 레이아웃, Route Handler, 스트리밍 엔드포인트 작업 시.
- **[UI / shadcn](./src/components/AGENTS.md)** — 컴포넌트 추가·조합·스타일링 작업 시.
- **[lib / LLM / storage](./src/lib/AGENTS.md)** — 서버 유틸, LLM 어댑터, Supabase·localStorage 헬퍼 작업 시.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
