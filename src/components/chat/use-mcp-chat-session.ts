"use client";

import { useEffect, useState } from "react";

import { listTools } from "@/lib/mcp/host-client";
import { restoreDesiredSessions } from "@/lib/mcp/restore-sessions";
import { hydrateFromRemote } from "@/lib/storage/hydrate-remote";

export type McpChatServer = {
  id: string;
  name: string;
};

export type McpChatTool = {
  serverId: string;
  serverName: string;
  name: string;
  description: string;
};

export function useMcpChatSession() {
  const [connected, setConnected] = useState<McpChatServer[]>([]);
  const [tools, setTools] = useState<McpChatTool[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const servers = (await hydrateFromRemote()).mcp.servers;
        if (cancelled) return;
        setRegisteredCount(servers.length);
        setReady(true);
        void restoreDesiredSessions(servers, (statuses) => {
          if (cancelled) return;
          setConnected(
            servers
              .filter((server) => statuses[server.id]?.status === "connected")
              .map((server) => ({ id: server.id, name: server.name }))
          );
        }).then(async (statuses) => {
          if (cancelled) return;
          const connectedServers = servers
            .filter((server) => statuses[server.id]?.status === "connected")
            .map((server) => ({ id: server.id, name: server.name }));
          setConnected(connectedServers);
          const listed = await Promise.all(
            connectedServers.map(async (server) => {
              try {
                const next = await listTools(server.id);
                return next.map((tool) => ({
                  serverId: server.id,
                  serverName: server.name,
                  name: tool.name,
                  description: tool.description,
                }));
              } catch {
                return [];
              }
            })
          );
          if (!cancelled) setTools(listed.flat());
        });
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return {
    connected,
    tools,
    ready,
    connectedCount: connected.length,
    registeredCount,
  };
}
