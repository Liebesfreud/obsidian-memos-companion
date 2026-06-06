import { ItemView, WorkspaceLeaf } from "obsidian";
import type { SvelteComponent } from "svelte";

import type { PanelHost } from "./types";
import MemosPanel from "./ui/MemosPanel.svelte";

export const MEMOS_VIEW_TYPE = "ob-with-memos-view";

export class MemosView extends ItemView {
  private component: SvelteComponent | null = null;
  private readonly host: PanelHost;

  constructor(leaf: WorkspaceLeaf, host: PanelHost) {
    super(leaf);
    this.host = host;
  }

  getDisplayText(): string {
    return "Memos";
  }

  getIcon(): string {
    return "sticky-note";
  }

  getViewType(): string {
    return MEMOS_VIEW_TYPE;
  }

  async onClose(): Promise<void> {
    this.component?.$destroy();
    this.component = null;
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("obwm-view");

    this.component = new MemosPanel({
      props: {
        host: this.host
      },
      target: this.contentEl
    });
  }
}
