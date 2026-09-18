# Components AGENTS

## Module Context

UI 조합 계층. `ui/`는 shadcn 원시 컴포넌트, 그 상위는 도메인 컴포넌트(채팅 버블, MCP 카드, 입력창 등)를 둔다.

## Tech Stack & Constraints

- shadcn/ui: style `base-nova`, CSS variables, icon `lucide` (`components.json` 기준).
- 스타일: Tailwind CSS v4. 임의 CSS 파일 남발 금지.
- 클래스 병합: `cn` (`@/lib/utils` 또는 `cn` 패키지).
- 새 primitive는 CLI로 추가: `pnpm dlx shadcn@latest add <name>`.
- `src/components/ui/*`는 생성기 산출물. 커스텀은 `ui/` 밖에서 래핑한다.

## Implementation Patterns

- import: `@/components/ui/<name>`
- 도메인 컴포넌트 네이밍: 역할 명사 (`ChatMessage`, `McpResultCard`, `ChatComposer`)
- 스트리밍 중 AI 버블은 첫 청크·로딩 표시를 우선한다.
- MCP 결과는 카드형 컨테이너로 타임라인에 삽입한다.
- 오류 UI: 짧은 안내 + 재시도 버튼.

## Testing Strategy

- 시각/상호작용: `pnpm dev`에서 키보드 포커스·disabled·로딩 상태 확인.
- `pnpm exec tsc --noEmit`으로 props/import 검증.

## Local Golden Rules

### Do's

- 기존 shadcn 컴포넌트를 재조합해 화면을 만든다.
- 접근성: button/label/dialog 등 시맨틱 역할 유지.

### Don'ts

- `ui/` 파일을 제품 요구에 맞게 크게 개조하지 않는다. 필요 시 래퍼 작성.
- 대시보드형 카드 남발·장식용 그라데이션으로 정보 위계를 흐리지 않는다.
- Inter/Roboto 등 기본 스택으로 폰트를 덮어쓰지 않는다. layout 폰트 변수를 따른다.
