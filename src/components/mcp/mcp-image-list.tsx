"use client";

import type { McpImagePart } from "@/lib/mcp/tool-content";

type McpImageListProps = {
  images: McpImagePart[];
  alt: string;
};

export function McpImageList({ images, alt }: McpImageListProps) {
  if (images.length === 0) return null;

  return (
    <ul className="mt-2 flex flex-col gap-2">
      {images.map((image, index) => (
        <li key={`${image.mimeType}-${index}`}>
          {/* MCP image/blob는 data URL 또는 http(s) src */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={images.length > 1 ? `${alt} ${index + 1}` : alt}
            className="max-h-80 w-full rounded-lg border border-white/60 bg-white/70 object-contain"
          />
        </li>
      ))}
    </ul>
  );
}
