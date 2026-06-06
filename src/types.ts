export type AppLanguage = "zh" | "en";

export type MemoVisibility = "PRIVATE" | "PROTECTED" | "PUBLIC";

export const DEFAULT_LANGUAGE: AppLanguage = "zh";

export const VISIBILITY_VALUES: MemoVisibility[] = ["PRIVATE", "PROTECTED", "PUBLIC"];

export interface ObWithMemosSettings {
  memosUrl: string;
  accessToken: string;
  defaultVisibility: MemoVisibility;
  language: AppLanguage;
  pageSize: number;
}

export const DEFAULT_SETTINGS: ObWithMemosSettings = {
  accessToken: "",
  defaultVisibility: "PUBLIC",
  language: DEFAULT_LANGUAGE,
  memosUrl: "",
  pageSize: 20
};

export interface MemoResource {
  content?: string;
  createTime?: string;
  externalLink?: string;
  filename?: string;
  id?: number | string;
  memo?: string;
  motionMedia?: unknown;
  name?: string;
  previewUrl?: string;
  publicId?: string;
  size?: number | string;
  type?: string;
  uid?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface MemoRelationTarget {
  name?: string;
  snippet?: string;
}

export interface MemoRelation {
  memo?: MemoRelationTarget;
  relatedMemo?: MemoRelationTarget;
  type?: string;
}

export interface Memo {
  content: string;
  createTime?: string;
  displayTime?: string;
  id?: number | string;
  name: string;
  pinned?: boolean;
  relations?: MemoRelation[];
  resources?: MemoResource[];
  rowStatus?: string;
  tags?: string[];
  uid?: string;
  updateTime?: string;
  visibility: MemoVisibility;
  [key: string]: unknown;
}

export interface ListMemosInput {
  includeArchived?: boolean;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

export interface ListMemosResult {
  memos: Memo[];
  nextPageToken: string;
}

export interface CreateMemoInput {
  content: string;
  resources?: MemoResource[];
  visibility: MemoVisibility;
}

export interface UpdateMemoInput {
  content?: string;
  pinned?: boolean;
  resources?: MemoResource[];
  rowStatus?: string;
  visibility?: MemoVisibility;
}

export type UploadFileSource = "clipboard" | "drop" | "local" | "vault";

export interface UploadFile {
  data: ArrayBuffer;
  name: string;
  path?: string;
  size: number;
  source: UploadFileSource;
  type: string;
}

export interface MemosApi {
  archiveMemo(name: string): Promise<Memo>;
  createMemo(input: CreateMemoInput): Promise<Memo>;
  deleteMemo(name: string): Promise<void>;
  getMemo(name: string): Promise<Memo>;
  listMemos(input?: ListMemosInput): Promise<ListMemosResult>;
  listTags(): Promise<string[]>;
  restoreMemo(name: string): Promise<Memo>;
  setPinned(name: string, pinned: boolean): Promise<Memo>;
  testConnection(): Promise<void>;
  updateMemo(name: string, input: UpdateMemoInput, updateMask?: string[]): Promise<Memo>;
  uploadResource(file: UploadFile): Promise<MemoResource>;
}

export interface PanelHost {
  getClient(): MemosApi;
  getSettings(): ObWithMemosSettings;
  onSettingsChange(callback: () => void): () => void;
  openSettings(): void;
  readVaultFile(path: string): Promise<UploadFile>;
}
