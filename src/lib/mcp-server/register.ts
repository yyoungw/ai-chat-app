import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

/** 이 앱이 직접 제공하는 MCP tool. 외부 3002 서버가 아니다. */
export function registerMcpCapabilities(server: McpServer) {
  server.registerTool(
    "greeting",
    {
      description: "이름과 언어를 받아 인사 메시지를 반환합니다.",
      inputSchema: z.object({
        name: z.string().describe("인사할 사람의 이름"),
        language: z
          .enum(["ko", "en"])
          .optional()
          .default("ko")
          .describe("인사 언어 (기본값: ko)"),
      }),
    },
    async ({ name, language }) => {
      const text =
        language === "en" ? `Hello, ${name}! 👋` : `안녕하세요, ${name}님!`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "calculator",
    {
      description: "두 숫자에 대한 사칙연산을 수행합니다.",
      inputSchema: z.object({
        operation: z
          .enum(["add", "subtract", "multiply", "divide"])
          .describe("수행할 연산"),
        a: z.number().describe("첫 번째 숫자"),
        b: z.number().describe("두 번째 숫자"),
      }),
    },
    async ({ operation, a, b }) => {
      // 엣지 케이스: 0으로 나누기
      if (operation === "divide" && b === 0) {
        throw new Error("0으로 나눌 수 없습니다");
      }
      const result =
        operation === "add"
          ? a + b
          : operation === "subtract"
            ? a - b
            : operation === "multiply"
              ? a * b
              : a / b;
      const symbol = {
        add: "+",
        subtract: "-",
        multiply: "×",
        divide: "÷",
      }[operation];
      return {
        content: [{ type: "text", text: `${a} ${symbol} ${b} = ${result}` }],
      };
    }
  );

  server.registerTool(
    "get_time",
    {
      description: "지정한 시간대의 현재 시각을 반환합니다.",
      inputSchema: z.object({
        timeZone: z.string().describe("시간대"),
      }),
    },
    async ({ timeZone }) => {
      return {
        content: [
          {
            type: "text",
            text: new Date().toLocaleString("ko-KR", { timeZone }),
          },
        ],
      };
    }
  );
}
