/** 채팅 tools on/off persist 키. 시크릿 없이 serverId::toolName만 쓴다. */
export function chatToolKey(serverId: string, toolName: string): string {
  return `${serverId}::${toolName}`;
}
