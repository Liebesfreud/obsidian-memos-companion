import { App, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";

import { getLanguage, getMessages } from "./i18n";
import { MemosClient } from "./memos-client";
import { MemosSettingTab } from "./settings";
import { DEFAULT_SETTINGS } from "./types";
import type { ObWithMemosSettings, PanelHost, UploadFile } from "./types";
import { MEMOS_VIEW_TYPE, MemosView } from "./view";

interface AppWithSettings extends App {
  setting?: {
    open(): void;
    openTabById(id: string): void;
  };
}

export default class ObWithMemosPlugin extends Plugin implements PanelHost {
  settings: ObWithMemosSettings = { ...DEFAULT_SETTINGS };
  private readonly settingsListeners = new Set<() => void>();

  async onload(): Promise<void> {
    await this.loadSettings();
    const messages = getMessages(this.settings.language);

    this.registerView(
      MEMOS_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new MemosView(leaf, this)
    );

    this.addRibbonIcon("sticky-note", messages.commands.openMemos, () => {
      void this.activateView();
    });

    this.addCommand({
      callback: () => {
        void this.activateView();
      },
      id: "open-memos-sidebar",
      name: messages.commands.openMemosSidebar
    });

    this.addSettingTab(new MemosSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(MEMOS_VIEW_TYPE);
    this.settingsListeners.clear();
  }

  async activateView(): Promise<void> {
    const existingLeaf = this.app.workspace.getLeavesOfType(MEMOS_VIEW_TYPE)[0];
    const leaf = existingLeaf ?? this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);

    await leaf.setViewState({
      active: true,
      type: MEMOS_VIEW_TYPE
    });

    this.app.workspace.revealLeaf(leaf);
  }

  getClient(): MemosClient {
    return new MemosClient(this.settings);
  }

  getSettings(): ObWithMemosSettings {
    return this.settings;
  }

  notifySettingsChanged(): void {
    for (const listener of this.settingsListeners) {
      listener();
    }
  }

  onSettingsChange(callback: () => void): () => void {
    this.settingsListeners.add(callback);

    return () => {
      this.settingsListeners.delete(callback);
    };
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
    this.settings.language = getLanguage(this.settings.language);
  }

  openSettings(): void {
    const setting = (this.app as AppWithSettings).setting;

    if (setting) {
      setting.open();
      setting.openTabById(this.manifest.id);
      return;
    }

    new Notice(getMessages(this.settings.language).commands.openSettingsFallback);
  }

  async readVaultFile(path: string): Promise<UploadFile> {
    const normalizedPath = path.trim();
    const file = this.app.vault.getAbstractFileByPath(normalizedPath);

    if (!(file instanceof TFile)) {
      throw new Error(`Vault file not found: ${normalizedPath}`);
    }

    const data = await this.app.vault.readBinary(file);

    return {
      data,
      name: file.name,
      path: file.path,
      size: data.byteLength,
      source: "vault",
      type: guessMimeType(file.extension)
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

function guessMimeType(extension: string): string {
  const normalized = extension.toLowerCase();
  const map: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    md: "text/markdown",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    pdf: "application/pdf",
    png: "image/png",
    svg: "image/svg+xml",
    txt: "text/plain",
    webm: "video/webm",
    webp: "image/webp"
  };

  return map[normalized] ?? "application/octet-stream";
}
