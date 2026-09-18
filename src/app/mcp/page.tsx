import { McpManagerView } from "@/components/mcp/mcp-manager-view";

export const metadata = {
  title: "MCP 관리",
  description: "MCP 서버 등록과 인스펙터",
};

export default function McpPage() {
  return <McpManagerView />;
}
