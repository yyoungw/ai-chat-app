"use client";

import { LoaderCircle, Square, SendHorizontal } from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatComposerProps = {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  disabled?: boolean;
  toolbar?: ReactNode;
};

export function ChatComposer({
  isStreaming,
  onSend,
  onStop,
  disabled,
  toolbar,
}: ChatComposerProps) {
  const [value, setValue] = useState("");

  const canSend = !disabled && !isStreaming && value.trim().length > 0;

  function submit() {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    onSend(text);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border border-white/50 bg-white/45 p-3 shadow-sm backdrop-blur-xl"
    >
      {toolbar}
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요… (Enter 전송, Shift+Enter 줄바꿈)"
          disabled={disabled || isStreaming}
          rows={3}
          className="min-h-22 max-h-80 resize-none border-white/40 bg-white/35 backdrop-blur-md"
          aria-label="채팅 메시지 입력"
        />
        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onStop}
            aria-label="응답 중지"
            className="shrink-0 border-white/50 bg-white/40 backdrop-blur-md"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            aria-label="메시지 전송"
            className="shrink-0 shadow-sm"
          >
            {disabled ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
