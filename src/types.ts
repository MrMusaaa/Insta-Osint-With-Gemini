export interface UserProfile {
  username: string;
  fullName?: string;
  bio?: string;
  followers?: string;
  following?: string;
  posts?: string;
  profileUrl?: string;
  profilePicUrl?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
  externalUrl?: string;
  fetchMode?: "direct" | "index" | "source_import" | "instaloader" | "instaloader_verified";
  loginWall?: boolean;
  modalBypassed?: boolean;
  httpStatus?: number;
  redirectUrl?: string;
  fetchedAt?: string;
  diagnostics?: string;
}

export interface OsintItem {
  hash_id: string;
  title: string;
  link: string;
  snippet: string;
  dork: string;
  collected_at: string;
  page?: number;
  isProfile?: boolean;
  imageUrl?: string;
}

export interface CollectResponse {
  target_username: string;
  mode: "live_google_custom_search" | "simulated_index_fixtures";
  dorks_used: string[];
  total_records: number;
  items: OsintItem[];
  note?: string;
  error?: string;
}

export interface AnalyzeResponse {
  target_username: string;
  model_used: string;
  snippets_analyzed: number;
  execution_time_ms: number;
  analysis: string;
  quota_notice?: string;
  error?: string;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: "command" | "info" | "success" | "warn" | "error";
  text: string;
}
