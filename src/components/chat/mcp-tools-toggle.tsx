"use client";

import { Wrench } from "lucide-react";
import { useMemo } from "react";

import { McpToolEnableSwitch } from "@/components/mcp/mcp-tool-enable-switch";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { McpChatTool } from "@/components/chat/use-mcp-chat-session";

type McpToolsToggleProps = {
  tools: McpChatTool[];
};

/** 연결된 MCP가 있을 때만 아이콘을 보여 주고, 누르면 도구별 on/off를 연다. */
export function McpToolsToggle({ tools }: McpToolsToggleProps) {
  const groups = useMemo(() => {
    const byServer = new Map<
      string,
      { serverId: string; serverName: string; tools: McpChatTool[] }
    >();
    for (const tool of tools) {
      const current = byServer.get(tool.serverId) ?? {
        serverId: tool.serverId,
        serverName: tool.serverName,
        tools: [],
      };
      current.tools.push(tool);
      byServer.set(tool.serverId, current);
    }
    return [...byServer.values()];
  }, [tools]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="bg-white/30 hover:bg-white/50"
            aria-label="채팅 MCP 도구"
          />
        }
      >
        <Wrench className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-80 max-h-80 overflow-auto"
      >
        <PopoverHeader>
          <PopoverTitle>채팅 도구</PopoverTitle>
          <PopoverDescription>
            {groups.length === 0
              ? "연결된 서버에서 도구 목록을 불러오지 못했습니다."
              : "끈 도구는 Gemini에 넘기지 않습니다. 연결은 유지됩니다."}
          </PopoverDescription>
        </PopoverHeader>
        {groups.length === 0 ? null : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.serverId} className="flex flex-col gap-1.5">
                <h3 className="truncate text-[11px] font-medium text-slate-500">
                  {group.serverName}
                </h3>
                <ul className="flex flex-col gap-1">
                  {group.tools.map((tool) => (
                    <li
                      key={`${tool.serverId}::${tool.name}`}
                      className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-slate-800">
                          {tool.name}
                        </p>
                        {tool.description ? (
                          <p className="line-clamp-1 text-[10px] text-slate-500">
                            {tool.description}
                          </p>
                        ) : null}
                      </div>
                      <McpToolEnableSwitch
                        serverId={tool.serverId}
                        toolName={tool.name}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
