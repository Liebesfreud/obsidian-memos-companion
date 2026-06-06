import { DEFAULT_LANGUAGE } from "./types";
import type { AppLanguage, MemoVisibility, UploadFileSource } from "./types";

export const LANGUAGE_OPTIONS: Record<AppLanguage, string> = {
  zh: "中文",
  en: "English"
};

const messages = {
  zh: {
    client: {
      baseUrlMissing: "尚未配置 Memos 基础 URL。",
      requestFailed: (status: number) => `Memos 请求失败，状态码 ${status}。`,
      uploadFailed: "无法上传资源到 Memos。"
    },
    commands: {
      openMemos: "打开 Memos",
      openMemosSidebar: "打开 Memos 侧边栏",
      openSettingsFallback: "请打开插件设置来配置 Memos。"
    },
    panel: {
      add: "添加",
      addContentOrAttachment: "发布前请添加内容或附件。",
      allTags: "全部标签",
      archive: "归档",
      archived: "已归档",
      attach: "附件",
      cancel: "取消",
      connectMemos: "连接 Memos",
      creatingMemo: "正在创建 Memo",
      delete: "删除",
      deleteConfirm: "删除这条 Memo？",
      edit: "编辑",
      loadMore: "加载更多",
      loaded: (count: number) => `已加载 ${count} 条`,
      loading: "加载中",
      loadingMemos: "正在加载 Memos",
      memoComposer: "Memo 编辑器",
      memoDeleted: "Memo 已删除。",
      memoPublished: "Memo 已发布。",
      memoUpdated: "Memo 已更新。",
      noMemosFound: "没有找到 Memo。",
      openSettings: "打开设置",
      pin: "置顶",
      pinned: "已置顶",
      publish: "发布",
      published: "已发布",
      publishing: "发布中",
      ready: "就绪",
      refresh: "刷新",
      reloadSettings: "重新加载设置",
      remove: "移除",
      removeAttachment: "移除附件",
      resource: "资源",
      restore: "恢复",
      save: "保存",
      search: "搜索",
      settings: "设置",
      unexpectedError: "未知的 Memos 错误。",
      unpin: "取消置顶",
      uploading: (name: string) => `正在上传 ${name}`,
      vaultAttachmentPath: "仓库附件路径",
      writeMemo: "写一条 Memo"
    },
    settings: {
      accessToken: {
        desc: "在 Memos 账户设置中创建。",
        name: "访问令牌",
        placeholder: "memos 访问令牌"
      },
      baseUrl: {
        desc: "例如：https://memos.example.com",
        name: "基础 URL",
        placeholder: "https://memos.example.com"
      },
      connection: {
        connected: "已连接到 Memos。",
        desc: "验证 URL 和令牌。",
        failed: "无法连接到 Memos。",
        name: "连接",
        test: "测试",
        testing: "测试中..."
      },
      defaultVisibility: {
        name: "默认可见性"
      },
      language: {
        desc: "选择插件界面语言。",
        name: "语言"
      },
      pageSize: {
        desc: "每次请求加载的 Memo 数量。",
        name: "分页数量",
        placeholder: "20"
      }
    },
    uploadSource: {
      clipboard: "剪贴板",
      drop: "拖放",
      local: "本地",
      vault: "仓库"
    },
    visibility: {
      PRIVATE: "私有",
      PROTECTED: "受保护",
      PUBLIC: "公开"
    }
  },
  en: {
    client: {
      baseUrlMissing: "Memos Base URL is not configured.",
      requestFailed: (status: number) => `Memos request failed with status ${status}.`,
      uploadFailed: "Unable to upload resource to Memos."
    },
    commands: {
      openMemos: "Open Memos",
      openMemosSidebar: "Open Memos sidebar",
      openSettingsFallback: "Open plugin settings to configure Memos."
    },
    panel: {
      add: "Add",
      addContentOrAttachment: "Add content or an attachment before publishing.",
      allTags: "All tags",
      archive: "Archive",
      archived: "Archived",
      attach: "Attach",
      cancel: "Cancel",
      connectMemos: "Connect Memos",
      creatingMemo: "Creating memo",
      delete: "Delete",
      deleteConfirm: "Delete this memo?",
      edit: "Edit",
      loadMore: "Load more",
      loaded: (count: number) => `${count} loaded`,
      loading: "Loading",
      loadingMemos: "Loading memos",
      memoComposer: "Memo composer",
      memoDeleted: "Memo deleted.",
      memoPublished: "Memo published.",
      memoUpdated: "Memo updated.",
      noMemosFound: "No memos found.",
      openSettings: "Open settings",
      pin: "Pin",
      pinned: "Pinned",
      publish: "Publish",
      published: "Published",
      publishing: "Publishing",
      ready: "Ready",
      refresh: "Refresh",
      reloadSettings: "Reload settings",
      remove: "Remove",
      removeAttachment: "Remove attachment",
      resource: "resource",
      restore: "Restore",
      save: "Save",
      search: "Search",
      settings: "Settings",
      unexpectedError: "Unexpected Memos error.",
      unpin: "Unpin",
      uploading: (name: string) => `Uploading ${name}`,
      vaultAttachmentPath: "Vault attachment path",
      writeMemo: "Write a memo"
    },
    settings: {
      accessToken: {
        desc: "Create this in Memos account settings.",
        name: "Access token",
        placeholder: "memos access token"
      },
      baseUrl: {
        desc: "Example: https://memos.example.com",
        name: "Base URL",
        placeholder: "https://memos.example.com"
      },
      connection: {
        connected: "Connected to Memos.",
        desc: "Verify the URL and token.",
        failed: "Unable to connect to Memos.",
        name: "Connection",
        test: "Test",
        testing: "Testing..."
      },
      defaultVisibility: {
        name: "Default visibility"
      },
      language: {
        desc: "Choose the plugin interface language.",
        name: "Language"
      },
      pageSize: {
        desc: "Number of memos to load per request.",
        name: "Page size",
        placeholder: "20"
      }
    },
    uploadSource: {
      clipboard: "Clipboard",
      drop: "Drop",
      local: "Local",
      vault: "Vault"
    },
    visibility: {
      PRIVATE: "Private",
      PROTECTED: "Protected",
      PUBLIC: "Public"
    }
  }
};

export type MessageBundle = typeof messages.en;

export function getLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getMessages(language: unknown): MessageBundle {
  return messages[getLanguage(language)];
}

export function getVisibilityOptions(language: unknown): Record<MemoVisibility, string> {
  return getMessages(language).visibility;
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "zh" || value === "en";
}

export function localeForLanguage(language: unknown): string {
  return getLanguage(language) === "zh" ? "zh-CN" : "en";
}

export function uploadSourceLabel(language: unknown, source: UploadFileSource): string {
  return getMessages(language).uploadSource[source];
}
