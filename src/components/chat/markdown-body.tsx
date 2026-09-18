"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type MarkdownBodyProps = {
  content: string;
  className?: string;
};

/** 코드 블록/인라인 코드를 일반 텍스트로 평탄화 (채팅에서 코드 UI 제거) */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-3 mb-2 text-base font-semibold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-1.5 text-sm font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2.5 mb-1 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-1 pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-1 pl-4">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-slate-400/50 pl-3 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-white/40" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-white/40">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/40 bg-white/30 px-2 py-1.5 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/20 px-2 py-1.5">{children}</td>
  ),
  code: ({ children }) => (
    <span className="whitespace-pre-wrap">{children}</span>
  ),
  pre: ({ children }) => (
    <p className="my-1.5 leading-relaxed whitespace-pre-wrap">{children}</p>
  ),
};

export function MarkdownBody({ content, className }: MarkdownBodyProps) {
  return (
    <div className={cn("markdown-body text-sm break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
