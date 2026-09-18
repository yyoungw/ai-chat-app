import { handleMcpRequest } from "@/lib/mcp-server/handler";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handler(request: Request) {
  return handleMcpRequest(request);
}

export { handler as GET, handler as POST };
