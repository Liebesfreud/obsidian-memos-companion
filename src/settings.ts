import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import { MemosClient } from "./memos-client";
import type ObWithMemosPlugin from "./main";
import { VISIBILITY_OPTIONS } from "./types";
import type { MemoVisibility } from "./types";

export class MemosSettingTab extends PluginSettingTab {
  private readonly plugin: ObWithMemosPlugin;

  constructor(app: App, plugin: ObWithMemosPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Memos" });

    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("Example: https://memos.example.com")
      .addText((text) => {
        text
          .setPlaceholder("https://memos.example.com")
          .setValue(this.plugin.settings.memosUrl)
          .onChange(async (value) => {
            this.plugin.settings.memosUrl = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Access token")
      .setDesc("Create this in Memos account settings.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("memos access token")
          .setValue(this.plugin.settings.accessToken)
          .onChange(async (value) => {
            this.plugin.settings.accessToken = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Default visibility")
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(VISIBILITY_OPTIONS)) {
          dropdown.addOption(value, label);
        }

        dropdown
          .setValue(this.plugin.settings.defaultVisibility)
          .onChange(async (value) => {
            this.plugin.settings.defaultVisibility = value as MemoVisibility;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Page size")
      .setDesc("Number of memos to load per request.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "5";
        text.inputEl.max = "100";
        text
          .setPlaceholder("20")
          .setValue(String(this.plugin.settings.pageSize))
          .onChange(async (value) => {
            const pageSize = Number.parseInt(value, 10);

            if (Number.isFinite(pageSize)) {
              this.plugin.settings.pageSize = Math.min(100, Math.max(5, pageSize));
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("Connection")
      .setDesc("Verify the URL and token.")
      .addButton((button) => {
        button.setButtonText("Test").onClick(async () => {
          button.setDisabled(true);
          button.setButtonText("Testing...");

          try {
            await new MemosClient(this.plugin.settings).testConnection();
            new Notice("Connected to Memos.");
          } catch (error) {
            new Notice(error instanceof Error ? error.message : "Unable to connect to Memos.");
          } finally {
            button.setDisabled(false);
            button.setButtonText("Test");
          }
        });
      });
  }
}
