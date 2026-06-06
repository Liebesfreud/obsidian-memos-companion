<script lang="ts">
  import { Notice, setIcon } from "obsidian";
  import { onMount } from "svelte";

  import { VISIBILITY_OPTIONS } from "../types";
  import type {
    Memo,
    MemoResource,
    MemoVisibility,
    PanelHost,
    UploadFile,
    UploadFileSource
  } from "../types";

  export let host: PanelHost;

  let currentSettings = host.getSettings();
  let settingsVersion = 0;
  $: isConfigured = Boolean(
    currentSettings.memosUrl.trim() && currentSettings.accessToken.trim()
  );
  $: {
    settingsVersion;
    currentSettings = host.getSettings();
  }

  let attachments: UploadFile[] = [];
  let busyMemoName: string | null = null;
  let content = "";
  let editContent = "";
  let editingName: string | null = null;
  let editVisibility: MemoVisibility = "PUBLIC";
  let error = "";
  let fileInput: HTMLInputElement | null = null;
  let includeArchived = false;
  let loading = false;
  let memos: Memo[] = [];
  let nextPageToken = "";
  let remoteTags: string[] = [];
  let saving = false;
  let savingEditName: string | null = null;
  let search = "";
  let selectedTag = "";
  let status = "";
  let vaultPath = "";
  let visibility: MemoVisibility = currentSettings.defaultVisibility;

  $: tags = Array.from(
    new Set([...remoteTags, ...memos.flatMap((memo) => extractTags(memo))])
  ).sort((a, b) => a.localeCompare(b));

  $: filteredMemos = memos.filter((memo) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || memo.content.toLowerCase().includes(query);
    const matchesTag = !selectedTag || extractTags(memo).includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  onMount(() => {
    if (isConfigured) {
      void refresh();
    }
  });

  function icon(node: HTMLElement, name: string): { update(nextName: string): void } {
    setIcon(node, name);

    return {
      update(nextName: string): void {
        setIcon(node, nextName);
      }
    };
  }

  async function refresh(): Promise<void> {
    if (!isConfigured) {
      return;
    }

    loading = true;
    error = "";
    status = "Loading memos";

    try {
      const client = host.getClient();
      const [memoResult, tagResult] = await Promise.all([
        client.listMemos({
          includeArchived,
          pageSize: currentSettings.pageSize
        }),
        client.listTags().catch(() => [])
      ]);

      memos = memoResult.memos;
      nextPageToken = memoResult.nextPageToken;
      remoteTags = tagResult;
      status = `${memos.length} loaded`;
    } catch (caught) {
      error = getErrorMessage(caught);
      status = "";
    } finally {
      loading = false;
    }
  }

  async function loadMore(): Promise<void> {
    if (!nextPageToken || loading) {
      return;
    }

    loading = true;
    error = "";

    try {
      const result = await host.getClient().listMemos({
        includeArchived,
        pageSize: currentSettings.pageSize,
        pageToken: nextPageToken
      });

      memos = [...memos, ...result.memos];
      nextPageToken = result.nextPageToken;
      status = `${memos.length} loaded`;
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      loading = false;
    }
  }

  async function publishMemo(): Promise<void> {
    if (!content.trim() && attachments.length === 0) {
      error = "Add content or an attachment before publishing.";
      return;
    }

    saving = true;
    error = "";
    status = "Publishing";

    try {
      const client = host.getClient();
      const resources: MemoResource[] = [];

      for (const attachment of attachments) {
        status = `Uploading ${attachment.name}`;
        resources.push(await client.uploadResource(attachment));
      }

      status = "Creating memo";

      const memo = await client.createMemo({
        content: content.trim(),
        resources,
        visibility
      });

      memos = [memo, ...memos];
      attachments = [];
      content = "";
      status = "Published";
      new Notice("Memo published.");
    } catch (caught) {
      error = getErrorMessage(caught);
      status = "";
    } finally {
      saving = false;
    }
  }

  async function addFiles(files: File[], source: UploadFileSource): Promise<void> {
    if (!files.length) {
      return;
    }

    const uploads = await Promise.all(
      files.map(async (file) => ({
        data: await file.arrayBuffer(),
        name: file.name,
        size: file.size,
        source,
        type: file.type || guessMimeType(file.name)
      }))
    );

    attachments = [...attachments, ...uploads];
  }

  async function addVaultAttachment(): Promise<void> {
    const path = vaultPath.trim();

    if (!path) {
      return;
    }

    try {
      const file = await host.readVaultFile(path);
      attachments = [...attachments, file];
      vaultPath = "";
      error = "";
    } catch (caught) {
      error = getErrorMessage(caught);
    }
  }

  function removeAttachment(index: number): void {
    attachments = attachments.filter((_, currentIndex) => currentIndex !== index);
  }

  async function handleFilePicker(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    await addFiles(Array.from(input.files ?? []), "local");
    input.value = "";
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const dataTransfer = event.dataTransfer;

    if (!dataTransfer) {
      return;
    }

    const files = Array.from(dataTransfer.files ?? []);

    if (files.length) {
      await addFiles(files, "drop");
      return;
    }

    const text = dataTransfer.getData("text/plain").trim();

    if (text) {
      vaultPath = text;
    }
  }

  async function handlePaste(event: ClipboardEvent): Promise<void> {
    const files = Array.from(event.clipboardData?.items ?? [])
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (files.length) {
      event.preventDefault();
      await addFiles(files, "clipboard");
    }
  }

  async function handleVaultKeydown(event: KeyboardEvent): Promise<void> {
    if (event.key === "Enter") {
      event.preventDefault();
      await addVaultAttachment();
    }
  }

  function startEdit(memo: Memo): void {
    editingName = memo.name;
    editContent = memo.content;
    editVisibility = memo.visibility;
  }

  function cancelEdit(): void {
    editingName = null;
    editContent = "";
  }

  async function saveEdit(memo: Memo): Promise<void> {
    savingEditName = memo.name;
    error = "";

    try {
      const updated = await host.getClient().updateMemo(
        memo.name,
        {
          content: editContent,
          visibility: editVisibility
        },
        ["content", "visibility"]
      );

      replaceMemo(memo.name, updated);
      cancelEdit();
      new Notice("Memo updated.");
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      savingEditName = null;
    }
  }

  async function deleteMemo(memo: Memo): Promise<void> {
    if (!window.confirm("Delete this memo?")) {
      return;
    }

    busyMemoName = memo.name;
    error = "";

    try {
      await host.getClient().deleteMemo(memo.name);
      memos = memos.filter((current) => current.name !== memo.name);
      new Notice("Memo deleted.");
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      busyMemoName = null;
    }
  }

  async function togglePinned(memo: Memo): Promise<void> {
    busyMemoName = memo.name;
    error = "";

    try {
      const updated = await host.getClient().setPinned(memo.name, !memo.pinned);
      replaceMemo(memo.name, updated);
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      busyMemoName = null;
    }
  }

  async function toggleArchived(memo: Memo): Promise<void> {
    busyMemoName = memo.name;
    error = "";

    try {
      const updated = isArchived(memo)
        ? await host.getClient().restoreMemo(memo.name)
        : await host.getClient().archiveMemo(memo.name);

      if (!includeArchived && isArchived(updated)) {
        memos = memos.filter((current) => current.name !== memo.name);
      } else {
        replaceMemo(memo.name, updated);
      }
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      busyMemoName = null;
    }
  }

  function reloadSettings(): void {
    settingsVersion += 1;
    visibility = host.getSettings().defaultVisibility;

    if (isConfigured) {
      void refresh();
    }
  }

  function replaceMemo(name: string, updated: Memo): void {
    memos = memos.map((memo) => (memo.name === name ? updated : memo));
  }

  function memoKey(memo: Memo): string {
    return memo.name || String(memo.id ?? memo.uid ?? memo.createTime ?? memo.content);
  }

  function isArchived(memo: Memo): boolean {
    return memo.rowStatus === "ARCHIVED";
  }

  function extractTags(memo: Memo): string[] {
    const tags = new Set<string>();

    for (const tag of memo.tags ?? []) {
      tags.add(tag.replace(/^#/, ""));
    }

    const tagRegex = /(?:^|\s)#([\p{L}\p{N}_/-]+)/gu;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(memo.content)) !== null) {
      tags.add(match[1]);
    }

    return Array.from(tags).filter(Boolean);
  }

  function getErrorMessage(caught: unknown): string {
    return caught instanceof Error ? caught.message : "Unexpected Memos error.";
  }

  function formatTime(value: string | undefined): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  function resourceLabel(resource: MemoResource): string {
    return (
      resource.filename ??
      resource.name ??
      resource.publicId ??
      String(resource.id ?? "resource")
    );
  }

  function guessMimeType(name: string): string {
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      gif: "image/gif",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      md: "text/markdown",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      pdf: "application/pdf",
      png: "image/png",
      svg: "image/svg+xml",
      txt: "text/plain",
      webm: "video/webm",
      webp: "image/webp"
    };

    return map[extension] ?? "application/octet-stream";
  }
</script>

<div class="obwm-panel" on:paste={handlePaste}>
  <header class="obwm-header">
    <div class="obwm-title-group">
      <h2>Memos</h2>
      <span>{status || "Ready"}</span>
    </div>

    <div class="obwm-header-actions">
      <button
        aria-label="Reload settings"
        class="clickable-icon obwm-icon-button"
        title="Reload settings"
        type="button"
        on:click={reloadSettings}
      >
        <span class="obwm-icon" use:icon={"rotate-ccw"}></span>
      </button>
      <button
        aria-label="Refresh"
        class="clickable-icon obwm-icon-button"
        disabled={!isConfigured || loading}
        title="Refresh"
        type="button"
        on:click={refresh}
      >
        <span class="obwm-icon" use:icon={"refresh-cw"}></span>
      </button>
      <button
        aria-label="Settings"
        class="clickable-icon obwm-icon-button"
        title="Settings"
        type="button"
        on:click={() => host.openSettings()}
      >
        <span class="obwm-icon" use:icon={"settings"}></span>
      </button>
    </div>
  </header>

  {#if error}
    <div class="obwm-message obwm-message-error">{error}</div>
  {/if}

  {#if !isConfigured}
    <section class="obwm-empty">
      <h3>Connect Memos</h3>
      <button class="mod-cta" type="button" on:click={() => host.openSettings()}>
        Open settings
      </button>
    </section>
  {:else}
    <div
      aria-label="Memo composer"
      class="obwm-composer"
      role="region"
      on:dragover={handleDragOver}
      on:drop={handleDrop}
    >
      <form on:submit|preventDefault={publishMemo}>
        <textarea
          bind:value={content}
          class="obwm-compose-textarea"
          disabled={saving}
          placeholder="Write a memo"
          rows="7"
        ></textarea>

        <div class="obwm-control-row">
          <select bind:value={visibility} disabled={saving}>
            {#each Object.entries(VISIBILITY_OPTIONS) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>

          <button
            class="obwm-button"
            disabled={saving}
            type="button"
            on:click={() => fileInput?.click()}
          >
            <span class="obwm-icon" use:icon={"paperclip"}></span>
            Attach
          </button>

          <input
            bind:this={fileInput}
            hidden
            multiple
            type="file"
            on:change={handleFilePicker}
          />

          <button class="mod-cta obwm-submit" disabled={saving} type="submit">
            <span class="obwm-icon" use:icon={"send"}></span>
            {saving ? "Publishing" : "Publish"}
          </button>
        </div>

        <div class="obwm-vault-row">
          <input
            bind:value={vaultPath}
            disabled={saving}
            placeholder="Vault attachment path"
            type="text"
            on:keydown={handleVaultKeydown}
          />
          <button class="obwm-button" disabled={saving || !vaultPath.trim()} type="button" on:click={addVaultAttachment}>
            Add
          </button>
        </div>

        {#if attachments.length}
          <div class="obwm-attachments">
            {#each attachments as attachment, index}
              <div class="obwm-attachment">
                <span class="obwm-attachment-name">{attachment.name}</span>
                <span class="obwm-attachment-meta">{attachment.source}</span>
                <button
                  aria-label="Remove attachment"
                  class="clickable-icon obwm-icon-button"
                  disabled={saving}
                  title="Remove"
                  type="button"
                  on:click={() => removeAttachment(index)}
                >
                  <span class="obwm-icon" use:icon={"x"}></span>
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </form>
    </div>

    <section class="obwm-list-tools">
      <div class="obwm-filter-grid">
        <input bind:value={search} placeholder="Search" type="search" />

        <select bind:value={selectedTag}>
          <option value="">All tags</option>
          {#each tags as tag}
            <option value={tag}>#{tag}</option>
          {/each}
        </select>
      </div>

      <label class="obwm-checkbox">
        <input bind:checked={includeArchived} type="checkbox" on:change={refresh} />
        <span>Archived</span>
      </label>
    </section>

    <section class="obwm-list">
      {#if loading && memos.length === 0}
        <div class="obwm-message">Loading memos...</div>
      {:else if filteredMemos.length === 0}
        <div class="obwm-message">No memos found.</div>
      {:else}
        {#each filteredMemos as memo (memoKey(memo))}
          <article class:obwm-archived={isArchived(memo)} class="obwm-memo">
            <div class="obwm-memo-meta">
              <span>{formatTime(memo.displayTime || memo.createTime)}</span>
              <span>{memo.visibility}</span>
              {#if memo.pinned}
                <span>Pinned</span>
              {/if}
            </div>

            {#if editingName === memo.name}
              <textarea bind:value={editContent} class="obwm-edit-textarea" rows="6"></textarea>
              <div class="obwm-control-row">
                <select bind:value={editVisibility}>
                  {#each Object.entries(VISIBILITY_OPTIONS) as [value, label]}
                    <option value={value}>{label}</option>
                  {/each}
                </select>

                <button
                  class="mod-cta"
                  disabled={savingEditName === memo.name}
                  type="button"
                  on:click={() => saveEdit(memo)}
                >
                  Save
                </button>
                <button class="obwm-button" type="button" on:click={cancelEdit}>Cancel</button>
              </div>
            {:else}
              <div class="obwm-memo-content">{memo.content}</div>

              {#if memo.resources?.length}
                <div class="obwm-resource-list">
                  {#each memo.resources as resource}
                    <span>{resourceLabel(resource)}</span>
                  {/each}
                </div>
              {/if}

              <div class="obwm-memo-actions">
                <button class="obwm-button" type="button" on:click={() => startEdit(memo)}>
                  <span class="obwm-icon" use:icon={"pencil"}></span>
                  Edit
                </button>
                <button
                  class="obwm-button"
                  disabled={busyMemoName === memo.name}
                  type="button"
                  on:click={() => togglePinned(memo)}
                >
                  <span class="obwm-icon" use:icon={memo.pinned ? "pin-off" : "pin"}></span>
                  {memo.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  class="obwm-button"
                  disabled={busyMemoName === memo.name}
                  type="button"
                  on:click={() => toggleArchived(memo)}
                >
                  <span class="obwm-icon" use:icon={isArchived(memo) ? "archive-restore" : "archive"}></span>
                  {isArchived(memo) ? "Restore" : "Archive"}
                </button>
                <button
                  class="obwm-button obwm-danger"
                  disabled={busyMemoName === memo.name}
                  type="button"
                  on:click={() => deleteMemo(memo)}
                >
                  <span class="obwm-icon" use:icon={"trash-2"}></span>
                  Delete
                </button>
              </div>
            {/if}
          </article>
        {/each}

        {#if nextPageToken}
          <button class="obwm-load-more" disabled={loading} type="button" on:click={loadMore}>
            {loading ? "Loading" : "Load more"}
          </button>
        {/if}
      {/if}
    </section>
  {/if}
</div>
