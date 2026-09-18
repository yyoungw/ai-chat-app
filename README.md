MCP Host를 포함한 AI 채팅 MVP입니다. Gemini 스트리밍과 MCP 도구 결과를 한 화면에서 제공합니다.

## 환경 변수

`.env.example`을 복사해 `.env.local`을 만듭니다. **실제 키는 Git에 올리지 않습니다.**

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Gemini API 키 |
| `GEMINI_MODEL` | 사용할 모델 이름 |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | 서버 전용 anon 키 |

GitHub Actions / 배포용 값은 저장소 **Settings → Secrets and variables → Actions** 에 같은 이름으로 넣습니다.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
