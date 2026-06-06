import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import { getLanguage, getMessages, getVisibilityOptions, LANGUAGE_OPTIONS } from "./i18n";
import { MemosClient } from "./memos-client";
import type ObWithMemosPlugin from "./main";
import { VISIBILITY_VALUES } from "./types";
import type { MemoVisibility } from "./types";

export class MemosSettingTab extends PluginSettingTab {
  private readonly plugin: ObWithMemosPlugin;

  constructor(app: App, plugin: ObWithMemosPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const messages = getMessages(this.plugin.settings.language);
    const visibilityLabels = getVisibilityOptions(this.plugin.settings.language);

    containerEl.empty();
    containerEl.createEl("h2", { text: "Memos" });

    new Setting(containerEl)
      .setName(messages.settings.language.name)
      .setDesc(messages.settings.language.desc)
      .addDropdown((dropdown) => {
        for (const [value, label] of Object.entries(LANGUAGE_OPTIONS)) {
          dropdown.addOption(value, label);
        }

        dropdown
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = getLanguage(value);
            await this.plugin.saveSettings();
            this.plugin.notifySettingsChanged();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(messages.settings.baseUrl.name)
      .setDesc(messages.settings.baseUrl.desc)
      .addText((text) => {
        text
          .setPlaceholder(messages.settings.baseUrl.placeholder)
          .setValue(this.plugin.settings.memosUrl)
          .onChange(async (value) => {
            this.plugin.settings.memosUrl = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(messages.settings.accessToken.name)
      .setDesc(messages.settings.accessToken.desc)
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder(messages.settings.accessToken.placeholder)
          .setValue(this.plugin.settings.accessToken)
          .onChange(async (value) => {
            this.plugin.settings.accessToken = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(messages.settings.defaultVisibility.name)
      .addDropdown((dropdown) => {
        for (const value of VISIBILITY_VALUES) {
          dropdown.addOption(value, visibilityLabels[value]);
        }

        dropdown
          .setValue(this.plugin.settings.defaultVisibility)
          .onChange(async (value) => {
            this.plugin.settings.defaultVisibility = value as MemoVisibility;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(messages.settings.pageSize.name)
      .setDesc(messages.settings.pageSize.desc)
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "5";
        text.inputEl.max = "100";
        text
          .setPlaceholder(messages.settings.pageSize.placeholder)
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
      .setName(messages.settings.connection.name)
      .setDesc(messages.settings.connection.desc)
      .addButton((button) => {
        button.setButtonText(messages.settings.connection.test).onClick(async () => {
          button.setDisabled(true);
          button.setButtonText(messages.settings.connection.testing);

          try {
            await new MemosClient(this.plugin.settings).testConnection();
            new Notice(messages.settings.connection.connected);
          } catch (error) {
            new Notice(error instanceof Error ? error.message : messages.settings.connection.failed);
          } finally {
            button.setDisabled(false);
            button.setButtonText(messages.settings.connection.test);
          }
        });
      });
  }
}
