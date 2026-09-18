export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Supabase MCP generate_typescript_types 산출물을 앱에서 쓰는 최소 스키마 */
export type Database = {
  public: {
    Tables: {
      chat_threads: {
        Row: {
          created_at_ms: number;
          id: string;
          title: string;
          updated_at_ms: number;
          workspace_id: string;
        };
        Insert: {
          created_at_ms: number;
          id: string;
          title: string;
          updated_at_ms: number;
          workspace_id: string;
        };
        Update: {
          created_at_ms?: number;
          id?: string;
          title?: string;
          updated_at_ms?: number;
          workspace_id?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at_ms: number;
          id: string;
          mcp_results: Json | null;
          position: number;
          role: string;
          thread_id: string;
          workspace_id: string;
        };
        Insert: {
          content?: string;
          created_at_ms: number;
          id: string;
          mcp_results?: Json | null;
          position: number;
          role: string;
          thread_id: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at_ms?: number;
          id?: string;
          mcp_results?: Json | null;
          position?: number;
          role?: string;
          thread_id?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      mcp_servers: {
        Row: {
          args: string[] | null;
          command: string | null;
          created_at_ms: number;
          desired: boolean;
          env: Json | null;
          headers: Json | null;
          id: string;
          name: string;
          transport: string;
          updated_at_ms: number;
          url: string | null;
          workspace_id: string;
        };
        Insert: {
          args?: string[] | null;
          command?: string | null;
          created_at_ms: number;
          desired?: boolean;
          env?: Json | null;
          headers?: Json | null;
          id: string;
          name: string;
          transport: string;
          updated_at_ms: number;
          url?: string | null;
          workspace_id: string;
        };
        Update: {
          args?: string[] | null;
          command?: string | null;
          created_at_ms?: number;
          desired?: boolean;
          env?: Json | null;
          headers?: Json | null;
          id?: string;
          name?: string;
          transport?: string;
          updated_at_ms?: number;
          url?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          active_thread_id: string | null;
          chat_store_version: number;
          created_at: string;
          disabled_chat_tools: string[];
          id: string;
          last_seen_at: string;
          mcp_store_version: number;
        };
        Insert: {
          active_thread_id?: string | null;
          chat_store_version?: number;
          created_at?: string;
          disabled_chat_tools?: string[];
          id?: string;
          last_seen_at?: string;
          mcp_store_version?: number;
        };
        Update: {
          active_thread_id?: string | null;
          chat_store_version?: number;
          created_at?: string;
          disabled_chat_tools?: string[];
          id?: string;
          last_seen_at?: string;
          mcp_store_version?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_workspace: { Args: { p_id?: string }; Returns: string };
      load_chat_store: { Args: { p_workspace_id: string }; Returns: Json };
      load_mcp_store: { Args: { p_workspace_id: string }; Returns: Json };
      save_chat_store: {
        Args: {
          p_active_thread_id: string | null;
          p_threads: Json;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      save_mcp_store: {
        Args: {
          p_desired_ids: string[];
          p_disabled_tools: string[];
          p_servers: Json;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      workspace_has_data: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
