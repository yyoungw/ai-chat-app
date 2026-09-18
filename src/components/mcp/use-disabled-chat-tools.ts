"use client";

import { useEffect, useState } from "react";

import { chatToolKey } from "@/lib/mcp/chat-tool-key";
import {
  loadDisabledChatTools,
  setChatToolDisabled,
  subscribeChatToolsChanged,
} from "@/lib/storage/mcp-storage";

export function useDisabledChatTools() {
  const [disabled, setDisabled] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setDisabled(loadDisabledChatTools());
    sync();
    return subscribeChatToolsChanged(sync);
  }, []);

  function isEnabled(serverId: string, toolName: string): boolean {
    return !disabled.includes(chatToolKey(serverId, toolName));
  }

  function setEnabled(serverId: string, toolName: string, enabled: boolean) {
    setChatToolDisabled(serverId, toolName, !enabled);
  }

  return { disabled, isEnabled, setEnabled };
}
