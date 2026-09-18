"use client";

import { Switch } from "@/components/ui/switch";
import { useDisabledChatTools } from "@/components/mcp/use-disabled-chat-tools";

type McpToolEnableSwitchProps = {
  serverId: string;
  toolName: string;
};

/** 채팅·설정에서 같은 persist를 쓰는 도구 on/off. 연결 해제는 아니다. */
export function McpToolEnableSwitch({
  serverId,
  toolName,
}: McpToolEnableSwitchProps) {
  const { isEnabled, setEnabled } = useDisabledChatTools();
  const enabled = isEnabled(serverId, toolName);

  return (
    <Switch
      checked={enabled}
      onCheckedChange={(checked) =>
        setEnabled(serverId, toolName, Boolean(checked))
      }
      size="default"
      className="shrink-0 data-unchecked:bg-slate-400 data-checked:bg-primary"
      aria-label={`${toolName} 채팅 도구 ${enabled ? "활성" : "비활성"}`}
    />
  );
}
