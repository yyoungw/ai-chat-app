/**
 * 스트리밍 중 미닫힌 코드 펜스를 임시로 닫아 마크다운 파서 깨짐을 완화.
 * 완성된 텍스트는 그대로 반환.
 */
export function stabilizeStreamingMarkdown(text: string): string {
  if (!text) return text;

  const fenceMatches = text.match(/^```/gm);
  const fenceCount = fenceMatches?.length ?? 0;

  if (fenceCount % 2 === 1) {
    return `${text}\n\`\`\``;
  }

  return text;
}
