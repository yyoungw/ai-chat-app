import "server-only";

import { createMcpHandler } from "mcp-handler";

import { registerMcpCapabilities } from "@/lib/mcp-server/register";

export const MCP_SERVER_INFO = {
  name: "ai-chat-app",
  version: "0.1.0",
} as const;

export function handleMcpRequest(request: Request) {
  return createMcpHandler(
    (server) => {
      registerMcpCapabilities(server);
    },
    { serverInfo: MCP_SERVER_INFO }
  )(request);
}
