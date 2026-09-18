import "server-only";

import { GoogleGenAI } from "@google/genai";

import { createAppError } from "@/lib/errors";

/** 서버 전용 Gemini 클라이언트 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw createAppError(
      "UNAUTHORIZED",
      401,
      "GEMINI_API_KEY가 설정되지 않았습니다."
    );
  }

  return new GoogleGenAI({ apiKey });
}

/** 환경변수에서 모델명 조회 */
export function getGeminiModel(): string {
  const model = process.env.GEMINI_MODEL?.trim();
  if (!model) {
    throw createAppError(
      "BAD_REQUEST",
      400,
      "GEMINI_MODEL이 설정되지 않았습니다."
    );
  }
  return model;
}
