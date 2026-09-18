/** MCP tools/call 결과에서 꺼낸 표시용 이미지. src는 data URL 또는 http(s). */
export type McpImagePart = {
  mimeType: string;
  src: string;
};

export type ParsedMcpContent = {
  text: string;
  images: McpImagePart[];
};

const IMAGE_MIME = /^image\/(png|jpe?g|gif|webp|svg\+xml|bmp)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeMime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const mime = value.trim().toLowerCase();
  if (!IMAGE_MIME.test(mime)) return null;
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

function mimeFromDataUrl(data: unknown): string | null {
  if (typeof data !== "string" || !data.startsWith("data:")) return null;
  const match = /^data:(image\/[a-z0-9.+-]+);/i.exec(data);
  return match ? normalizeMime(match[1]) : null;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function toImageSrc(data: string, mimeType: string): string | null {
  const trimmed = data.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (isSafeHttpUrl(trimmed)) return trimmed;
  const compact = trimmed.replace(/\s/g, "");
  if (!compact) return null;
  return `data:${mimeType};base64,${compact}`;
}

function pushImage(
  images: McpImagePart[],
  mimeType: string | null,
  data: unknown
) {
  if (!mimeType || typeof data !== "string") return;
  const src = toImageSrc(data, mimeType);
  if (!src) return;
  images.push({ mimeType, src });
}

function contentArray(result: unknown): unknown[] | null {
  if (Array.isArray(result)) return result;
  if (isRecord(result) && Array.isArray(result.content)) return result.content;
  if (isRecord(result) && result.type === "image") return [result];
  return null;
}

/** MCP CallToolResult content 블록을 텍스트·이미지로 나눈다. */
export function parseMcpToolResult(result: unknown): ParsedMcpContent {
  const images: McpImagePart[] = [];
  const texts: string[] = [];
  const items = contentArray(result);

  if (!items) {
    if (result === undefined) return { text: "", images };
    try {
      return { text: JSON.stringify(result), images };
    } catch {
      return { text: String(result), images };
    }
  }

  for (const item of items) {
    if (!isRecord(item) || typeof item.type !== "string") {
      continue;
    }

    if (item.type === "text" && typeof item.text === "string") {
      texts.push(item.text);
      continue;
    }

    if (item.type === "image") {
      const mime =
        normalizeMime(item.mimeType) ??
        normalizeMime(item.mime_type) ??
        mimeFromDataUrl(item.data) ??
        mimeFromDataUrl(item.url) ??
        "image/png";
      pushImage(images, mime, item.data ?? item.url);
      continue;
    }

    if (item.type === "resource" && isRecord(item.resource)) {
      const resource = item.resource;
      const mime = normalizeMime(resource.mimeType);
      if (typeof resource.blob === "string") {
        pushImage(images, mime, resource.blob);
      } else if (typeof resource.uri === "string" && mime) {
        pushImage(images, mime, resource.uri);
      } else if (typeof resource.text === "string") {
        texts.push(resource.text);
      }
      continue;
    }

    if (item.type === "resource_link") {
      const mime = normalizeMime(item.mimeType);
      if (typeof item.uri === "string" && mime) {
        pushImage(images, mime, item.uri);
      }
    }
  }

  let text = texts.join("\n").trim();
  if (!text && images.length > 0) {
    text = `이미지 ${images.length}개를 생성했습니다.`;
  }
  return { text, images };
}
