# Lib AGENTS

## Module Context

서버·클라이언트 공용 유틸과, 서버 전용 LLM/MCP 어댑터·스토리지 헬퍼가 위치한다. 비즈니스/외부 I/O의 단일 책임 모듈을 둔다.

## Tech Stack & Constraints

- `cn` / `@/lib/utils`: 클래스 병합만. UI 로직 금지.
- LLM: Gemini 공식 SDK/API를 서버에서만 사용. 추가 프로바이더는 어댑터로 확장.
- 스토리지: 원본은 Supabase (`src/lib/supabase`). 클라이언트는 `/api/storage/**`만 호출하고 localStorage는 캐시·이관 소스다.
- 서버 전용 모듈은 클라이언트 번들에 import되지 않게 경계를 지킨다 (`server-only` 권장).

## Implementation Patterns

- LLM 어댑터: `streamChat` / `abort` / 에러 매핑 인터페이스를 통일.
- MCP Host: `session-store`(프로세스 메모리) + `create-client` + `host`. 시크릿은 connect 요청·`mcp_server_secrets`에만 두고 로그에는 키 이름만 남긴다.
- 에러 매핑: HTTP/프로바이더 상태를 앱 공통 에러 코드로 변환 후 Route Handler에 반환.
- 스토리지 스키마: `workspaces`(설정) + `chat_threads`(목록) + `chat_messages`(질문/답변) + `mcp_servers`(서버 메타·시크릿·재연결). TS 타입의 camelCase·epoch ms를 유지한다.
- 공용 PC 경고 배너용 플래그/카피를 UI에 넘길 수 있게 헬퍼로 분리.
- 워크스페이스는 httpOnly 쿠키(`ai-chat-workspace-id`)로 식별한다. 로그인 없이 기기 단위 테넌트다.

## Testing Strategy

- 순수 함수(매핑·스키마 파싱): 정상 / 경계 / 오류 입력.
- 명령: `pnpm exec tsc --noEmit` (테스트 러너 도입 시 `pnpm test`로 교체하고 루트 AGENTS.md도 갱신).

## Local Golden Rules

### Do's

- 시크릿은 `process.env`에서만 읽고, 반환값에 키를 포함하지 않는다.
- 어댑터 교체 시 Route Handler 시그니처를 깨지 않는다.
- Supabase 클라이언트는 `src/lib/supabase`와 Route Handler에서만 생성한다.

### Don'ts

- 클라이언트 컴포넌트에서 Gemini/MCP SDK·Supabase 클라이언트를 import하지 않는다.
- localStorage에 토큰·API 키·MCP 시크릿을 저장하지 않는다.
- `SUPABASE_ANON_KEY`를 `NEXT_PUBLIC_`으로 노출하지 않는다.
