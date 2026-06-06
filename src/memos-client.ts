import { requestUrl } from "obsidian";
import type { RequestUrlResponse } from "obsidian";

import type {
  CreateMemoInput,
  ListMemosInput,
  ListMemosResult,
  Memo,
  MemoResource,
  MemoVisibility,
  MemosApi,
  ObWithMemosSettings,
  UpdateMemoInput,
  UploadFile
} from "./types";

type QueryValue = boolean | number | string | undefined;

interface JsonRequest {
  body?: ArrayBuffer | string;
  contentType?: string;
  headers?: Record<string, string>;
  json?: unknown;
  method?: string;
  query?: Record<string, QueryValue>;
}

interface ListMemosResponse {
  memos?: unknown[];
  nextPageToken?: string;
  next_page_token?: string;
}

export class MemosApiError extends Error {
  readonly responseText: string;
  readonly status: number;

  constructor(message: string, status: number, responseText: string) {
    super(message);
    this.name = "MemosApiError";
    this.responseText = responseText;
    this.status = status;
  }
}

export class MemosClient implements MemosApi {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(settings: ObWithMemosSettings) {
    this.baseUrl = settings.memosUrl.trim().replace(/\/+$/, "");
    this.token = settings.accessToken.trim();
  }

  async archiveMemo(name: string): Promise<Memo> {
    return this.updateMemo(name, { rowStatus: "ARCHIVED" }, ["rowStatus"]);
  }

  async createMemo(input: CreateMemoInput): Promise<Memo> {
    const payload: Record<string, unknown> = {
      content: input.content,
      visibility: input.visibility
    };

    if (input.resources?.length) {
      payload.resources = input.resources;
    }

    const response = await this.request<unknown>("/api/v1/memos", {
      json: payload,
      method: "POST"
    });

    return normalizeMemo(response);
  }

  async deleteMemo(name: string): Promise<void> {
    await this.request<void>(apiNamePath(name), {
      method: "DELETE"
    });
  }

  async listMemos(input: ListMemosInput = {}): Promise<ListMemosResult> {
    const query: Record<string, QueryValue> = {
      orderBy: input.orderBy,
      pageSize: input.pageSize,
      pageToken: input.pageToken
    };

    if (!input.includeArchived) {
      query.state = "NORMAL";
    }

    const response = await this.request<ListMemosResponse | unknown[]>("/api/v1/memos", {
      query
    });

    if (Array.isArray(response)) {
      return {
        memos: response.map(normalizeMemo),
        nextPageToken: ""
      };
    }

    return {
      memos: (response.memos ?? []).map(normalizeMemo),
      nextPageToken: response.nextPageToken ?? response.next_page_token ?? ""
    };
  }

  async listTags(): Promise<string[]> {
    const response = await this.request<unknown>("/api/v1/tags");
    const responseTags = asRecord(response).tags;
    const values: unknown[] = Array.isArray(response)
      ? response
      : Array.isArray(responseTags)
        ? responseTags
        : [];

    return values
      .map((tag) => {
        if (typeof tag === "string") {
          return tag.replace(/^#/, "");
        }

        const record = asRecord(tag);
        const name = asString(record.name) || asString(record.tag);
        return name.replace(/^#/, "");
      })
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));
  }

  async restoreMemo(name: string): Promise<Memo> {
    return this.updateMemo(name, { rowStatus: "NORMAL" }, ["rowStatus"]);
  }

  async setPinned(name: string, pinned: boolean): Promise<Memo> {
    return this.updateMemo(name, { pinned }, ["pinned"]);
  }

  async testConnection(): Promise<void> {
    try {
      await this.request<unknown>("/api/v1/users/me");
    } catch (error) {
      if (error instanceof MemosApiError && error.status === 404) {
        await this.listMemos({ pageSize: 1 });
        return;
      }

      throw error;
    }
  }

  async updateMemo(
    name: string,
    input: UpdateMemoInput,
    updateMask = Object.keys(input)
  ): Promise<Memo> {
    const response = await this.request<unknown>(apiNamePath(name), {
      json: input,
      method: "PATCH",
      query: updateMask.length ? { updateMask: updateMask.join(",") } : undefined
    });

    return normalizeMemo(response);
  }

  async uploadResource(file: UploadFile): Promise<MemoResource> {
    const multipart = buildMultipartBody("file", file);
    const endpoints = ["/api/v1/resources", "/api/v1/resources:upload", "/api/v1/resource"];
    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        const response = await this.request<unknown>(endpoint, {
          body: multipart.body,
          contentType: multipart.contentType,
          method: "POST"
        });

        return normalizeResourceResponse(response);
      } catch (error) {
        lastError = error;

        if (!(error instanceof MemosApiError) || ![400, 404, 405, 415].includes(error.status)) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to upload resource to Memos.");
  }

  private async request<T>(path: string, options: JsonRequest = {}): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("Memos Base URL is not configured.");
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers
    };
    let body = options.body;
    let contentType = options.contentType;

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    if (options.json !== undefined) {
      body = JSON.stringify(options.json);
      contentType = "application/json";
      headers["Content-Type"] = contentType;
    } else if (contentType) {
      headers["Content-Type"] = contentType;
    }

    const response = await requestUrl({
      body,
      contentType,
      headers,
      method: options.method ?? "GET",
      throw: false,
      url: this.buildUrl(path, options.query)
    });

    return parseResponse<T>(response);
  }

  private buildUrl(path: string, query: Record<string, QueryValue> = {}): string {
    const base = `${this.baseUrl}/`;
    const url = new URL(path.replace(/^\/+/, ""), base);

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}

function apiNamePath(name: string): string {
  return `/api/v1/${name.replace(/^\/+/, "")}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeMemo(value: unknown): Memo {
  const record = asRecord(value);
  const id = record.id;
  const name = asString(record.name) || (id !== undefined ? `memos/${String(id)}` : "");
  const resources = Array.isArray(record.resources)
    ? record.resources.map(normalizeResourceResponse)
    : undefined;
  const visibility = normalizeVisibility(record.visibility);

  return {
    ...record,
    content: asString(record.content),
    id: typeof id === "number" || typeof id === "string" ? id : undefined,
    name,
    pinned: typeof record.pinned === "boolean" ? record.pinned : undefined,
    resources,
    rowStatus: asString(record.rowStatus) || asString(record.row_status) || undefined,
    tags: Array.isArray(record.tags) ? record.tags.filter(isString) : undefined,
    visibility
  };
}

function normalizeResourceResponse(value: unknown): MemoResource {
  const record = asRecord(value);
  const nested = asRecord(record.resource);
  const source = Object.keys(nested).length ? nested : record;
  const id = source.id;

  return {
    ...source,
    id: typeof id === "number" || typeof id === "string" ? id : undefined,
    name: asString(source.name) || (id !== undefined ? `resources/${String(id)}` : undefined),
    type: asString(source.type) || asString(source.contentType) || undefined
  };
}

function normalizeVisibility(value: unknown): MemoVisibility {
  if (value === "PRIVATE" || value === "PROTECTED" || value === "PUBLIC") {
    return value;
  }

  return "PRIVATE";
}

function parseResponse<T>(response: RequestUrlResponse): T {
  if (response.status < 200 || response.status >= 300) {
    throw new MemosApiError(
      `Memos request failed with status ${response.status}.`,
      response.status,
      response.text
    );
  }

  if (!response.text) {
    return undefined as T;
  }

  try {
    return response.json as T;
  } catch {
    return JSON.parse(response.text) as T;
  }
}

function buildMultipartBody(fieldName: string, file: UploadFile): { body: ArrayBuffer; contentType: string } {
  const boundary = `obsidian-memos-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="${escapeMultipartValue(fieldName)}"; filename="${escapeMultipartValue(file.name)}"`,
    `Content-Type: ${file.type || "application/octet-stream"}`,
    "",
    ""
  ].join("\r\n");
  const footer = `\r\n--${boundary}--\r\n`;
  const chunks = [
    encoder.encode(header),
    new Uint8Array(file.data),
    encoder.encode(footer)
  ];
  const body = concatChunks(chunks);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

function concatChunks(chunks: Uint8Array[]): ArrayBuffer {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output.buffer;
}

function escapeMultipartValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "%22").replace(/[\r\n]/g, "_");
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
