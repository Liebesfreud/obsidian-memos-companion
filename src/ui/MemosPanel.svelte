<script lang="ts">
  import { Notice, setIcon } from "obsidian";
  import { onMount } from "svelte";

  import { getMessages, getVisibilityOptions, localeForLanguage, uploadSourceLabel } from "../i18n";
  import { VISIBILITY_VALUES } from "../types";
  import type {
    Memo,
    MemoResource,
    MemoVisibility,
    ObWithMemosSettings,
    PanelHost,
    UploadFile,
    UploadFileSource
  } from "../types";

  export let host: PanelHost;

  let currentSettings = readSettings();
  $: messages = getMessages(currentSettings.language);
  $: visibilityLabels = getVisibilityOptions(currentSettings.language);
  $: isConfigured = hasConnection(currentSettings);

  let attachments: UploadFile[] = [];
  let busyMemoName: string | null = null;
  let commentsByMemoName: Record<string, Memo[]> = {};
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
  let openActionMenuName: string | null = null;
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
    window.addEventListener("click", closeActionMenu);
    window.addEventListener("keydown", handleWindowKeydown);

    if (hasConnection(currentSettings)) {
      void refresh();
    }

    const unsubscribeSettings = host.onSettingsChange(() => {
      reloadSettings(false);
    });

    return () => {
      unsubscribeSettings();
      window.removeEventListener("click", closeActionMenu);
      window.removeEventListener("keydown", handleWindowKeydown);
    };
  });

  function icon(node: HTMLElement, name: string): { update(nextName: string): void } {
    setIcon(node, name);

    return {
      update(nextName: string): void {
        setIcon(node, nextName);
      }
    };
  }

  function readSettings(): ObWithMemosSettings {
    return { ...host.getSettings() };
  }

  function hasConnection(settings: ObWithMemosSettings): boolean {
    return Boolean(settings.memosUrl.trim() && settings.accessToken.trim());
  }

  function closeActionMenu(): void {
    openActionMenuName = null;
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      closeActionMenu();
    }
  }

  function toggleActionMenu(memo: Memo): void {
    openActionMenuName = openActionMenuName === memo.name ? null : memo.name;
  }

  async function refresh(): Promise<void> {
    if (!hasConnection(currentSettings)) {
      return;
    }

    loading = true;
    error = "";
    status = messages.panel.loadingMemos;

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
      commentsByMemoName = {};
      nextPageToken = memoResult.nextPageToken;
      remoteTags = tagResult;
      status = messages.panel.loaded(memos.length);
      void loadCommentsForMemos(memos);
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
      status = messages.panel.loaded(memos.length);
      void loadCommentsForMemos(result.memos);
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      loading = false;
    }
  }

  async function publishMemo(): Promise<void> {
    if (!content.trim() && attachments.length === 0) {
      error = messages.panel.addContentOrAttachment;
      return;
    }

    saving = true;
    error = "";
    status = messages.panel.publishing;

    try {
      const client = host.getClient();
      const resources: MemoResource[] = [];

      for (const attachment of attachments) {
        status = messages.panel.uploading(attachment.name);
        resources.push(await client.uploadResource(attachment));
      }

      status = messages.panel.creatingMemo;

      const memo = await client.createMemo({
        content: content.trim(),
        resources,
        visibility
      });

      memos = [memo, ...memos];
      attachments = [];
      content = "";
      status = messages.panel.published;
      new Notice(messages.panel.memoPublished);
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
    closeActionMenu();
    editingName = memo.name;
    editContent = memo.content;
    editVisibility = memo.visibility;
  }

  function startEditFromMenu(memo: Memo): void {
    startEdit(memo);
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
      new Notice(messages.panel.memoUpdated);
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      savingEditName = null;
    }
  }

  async function deleteMemo(memo: Memo): Promise<void> {
    closeActionMenu();

    if (!window.confirm(messages.panel.deleteConfirm)) {
      return;
    }

    busyMemoName = memo.name;
    error = "";

    try {
      await host.getClient().deleteMemo(memo.name);
      memos = memos.filter((current) => current.name !== memo.name);
      new Notice(messages.panel.memoDeleted);
    } catch (caught) {
      error = getErrorMessage(caught);
    } finally {
      busyMemoName = null;
    }
  }

  async function togglePinned(memo: Memo): Promise<void> {
    closeActionMenu();
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
    closeActionMenu();
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

  async function deleteMemoFromMenu(memo: Memo): Promise<void> {
    await deleteMemo(memo);
  }

  async function toggleArchivedFromMenu(memo: Memo): Promise<void> {
    await toggleArchived(memo);
  }

  async function togglePinnedFromMenu(memo: Memo): Promise<void> {
    await togglePinned(memo);
  }

  function reloadSettings(refreshMemos = true): void {
    const latestSettings = readSettings();

    currentSettings = latestSettings;

    if (!refreshMemos) {
      status = "";
      return;
    }

    visibility = latestSettings.defaultVisibility;

    if (hasConnection(latestSettings)) {
      void refresh();
    }
  }

  function replaceMemo(name: string, updated: Memo): void {
    memos = memos.map((memo) => (memo.name === name ? updated : memo));
  }

  async function loadCommentsForMemos(targetMemos: Memo[]): Promise<void> {
    const targets = targetMemos
      .map((memo) => ({
        memo,
        names: commentMemoNames(memo)
      }))
      .filter(({ names }) => names.length > 0);

    if (!targets.length) {
      return;
    }

    const client = host.getClient();
    const entries = await Promise.all(
      targets.map(async ({ memo, names }) => {
        const comments = await Promise.all(
          names.map(async (name) => {
            try {
              return await client.getMemo(name);
            } catch {
              return null;
            }
          })
        );

        return [
          memo.name,
          comments.filter((comment): comment is Memo => comment !== null)
        ] as const;
      })
    );
    const nextComments = { ...commentsByMemoName };

    for (const [memoName, comments] of entries) {
      if (comments.length) {
        nextComments[memoName] = comments;
      } else {
        delete nextComments[memoName];
      }
    }

    commentsByMemoName = nextComments;
  }

  function commentMemoNames(memo: Memo): string[] {
    return Array.from(
      new Set(
        (memo.relations ?? [])
          .filter((relation) => relation.type === "COMMENT")
          .map((relation) =>
            relation.relatedMemo?.name === memo.name ? relation.memo?.name : undefined
          )
          .filter((name): name is string => Boolean(name && name !== memo.name))
      )
    );
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
    return caught instanceof Error ? caught.message : messages.panel.unexpectedError;
  }

  function formatTime(value: string | undefined): string {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(localeForLanguage(currentSettings.language));
  }

  function resourceLabel(resource: MemoResource): string {
    return (
      resource.filename ??
      resource.name ??
      resource.publicId ??
      String(resource.id ?? messages.panel.resource)
    );
  }

  function imageResources(memo: Memo): MemoResource[] {
    return (memo.resources ?? []).filter((resource) => isImageResource(resource) && resourcePreviewUrl(resource));
  }

  function attachmentResources(memo: Memo): MemoResource[] {
    return (memo.resources ?? []).filter((resource) => !isImageResource(resource) || !resourcePreviewUrl(resource));
  }

  function isImageResource(resource: MemoResource): boolean {
    const label = resourceLabel(resource);
    return Boolean(
      resource.type?.startsWith("image/") ||
      /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(label)
    );
  }

  function resourcePreviewUrl(resource: MemoResource): string {
    return resource.previewUrl ?? resource.externalLink ?? "";
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
      <span class="obwm-status-pill">{status || messages.panel.ready}</span>
    </div>

    <div class="obwm-header-actions">
      <button
        aria-label={messages.panel.reloadSettings}
        class="clickable-icon obwm-icon-button"
        title={messages.panel.reloadSettings}
        type="button"
        on:click={() => reloadSettings()}
      >
        <span class="obwm-icon" use:icon={"rotate-ccw"}></span>
      </button>
      <button
        aria-label={messages.panel.refresh}
        class="clickable-icon obwm-icon-button"
        disabled={!isConfigured || loading}
        title={messages.panel.refresh}
        type="button"
        on:click={refresh}
      >
        <span class="obwm-icon" use:icon={"refresh-cw"}></span>
      </button>
      <button
        aria-label={messages.panel.settings}
        class="clickable-icon obwm-icon-button"
        title={messages.panel.settings}
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
      <h3>{messages.panel.connectMemos}</h3>
      <button class="mod-cta" type="button" on:click={() => host.openSettings()}>
        {messages.panel.openSettings}
      </button>
    </section>
  {:else}
    <div
      aria-label={messages.panel.memoComposer}
      class="obwm-composer"
      role="region"
      on:dragover={handleDragOver}
      on:drop={handleDrop}
    >
      <form class="obwm-composer-form" on:submit|preventDefault={publishMemo}>
        <textarea
          bind:value={content}
          class="obwm-compose-textarea"
          disabled={saving}
          placeholder={messages.panel.writeMemo}
          rows="5"
        ></textarea>

        <div class="obwm-composer-toolbar">
          <div class="obwm-toolbar-group">
            <select class="obwm-visibility-select" bind:value={visibility} disabled={saving}>
              {#each VISIBILITY_VALUES as value}
                <option value={value}>{visibilityLabels[value]}</option>
              {/each}
            </select>

            <button
              class="obwm-button obwm-soft-button"
              disabled={saving}
              type="button"
              on:click={() => fileInput?.click()}
            >
              <span class="obwm-icon" use:icon={"paperclip"}></span>
              {messages.panel.attach}
            </button>
          </div>

          <input
            bind:this={fileInput}
            hidden
            multiple
            type="file"
            on:change={handleFilePicker}
          />

          <button class="mod-cta obwm-submit" disabled={saving} type="submit">
            <span class="obwm-icon" use:icon={"send"}></span>
            {saving ? messages.panel.publishing : messages.panel.publish}
          </button>
        </div>

        <div class="obwm-vault-row">
          <input
            bind:value={vaultPath}
            disabled={saving}
            placeholder={messages.panel.vaultAttachmentPath}
            type="text"
            on:keydown={handleVaultKeydown}
          />
          <button class="obwm-button obwm-soft-button" disabled={saving || !vaultPath.trim()} type="button" on:click={addVaultAttachment}>
            {messages.panel.add}
          </button>
        </div>

        {#if attachments.length}
          <div class="obwm-attachments">
            {#each attachments as attachment, index}
              <div class="obwm-attachment">
                <span class="obwm-attachment-name">{attachment.name}</span>
                <span class="obwm-attachment-meta">
                  {uploadSourceLabel(currentSettings.language, attachment.source)}
                </span>
                <button
                  aria-label={messages.panel.removeAttachment}
                  class="clickable-icon obwm-icon-button"
                  disabled={saving}
                  title={messages.panel.remove}
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
        <input bind:value={search} placeholder={messages.panel.search} type="search" />

        <select bind:value={selectedTag}>
          <option value="">{messages.panel.allTags}</option>
          {#each tags as tag}
            <option value={tag}>#{tag}</option>
          {/each}
        </select>
      </div>

      <label class="obwm-checkbox">
        <input bind:checked={includeArchived} type="checkbox" on:change={refresh} />
        <span>{messages.panel.archived}</span>
      </label>
    </section>

    <section class="obwm-list">
      {#if loading && memos.length === 0}
        <div class="obwm-message">{messages.panel.loadingMemos}</div>
      {:else if filteredMemos.length === 0}
        <div class="obwm-message">{messages.panel.noMemosFound}</div>
      {:else}
        {#each filteredMemos as memo (memoKey(memo))}
          <article
            class:obwm-archived={isArchived(memo)}
            class:obwm-menu-open={openActionMenuName === memo.name}
            class="obwm-memo"
          >
            <div class="obwm-memo-topline">
              <div class="obwm-memo-meta">
                <span>{formatTime(memo.displayTime || memo.createTime)}</span>
                <span class="obwm-meta-pill">{visibilityLabels[memo.visibility]}</span>
                {#if memo.pinned}
                  <span class="obwm-meta-pill obwm-pinned-pill">
                    <span class="obwm-icon" use:icon={"pin"}></span>
                    {messages.panel.pinned}
                  </span>
                {/if}
              </div>

              {#if editingName !== memo.name}
                <div class="obwm-more-menu">
                  <button
                    aria-expanded={openActionMenuName === memo.name}
                    aria-haspopup="menu"
                    aria-label={messages.panel.moreActions}
                    class={openActionMenuName === memo.name
                      ? "clickable-icon obwm-action-button obwm-more-button obwm-more-button-active"
                      : "clickable-icon obwm-action-button obwm-more-button"}
                    title={messages.panel.moreActions}
                    type="button"
                    on:click|stopPropagation={() => toggleActionMenu(memo)}
                  >
                    <span class="obwm-icon" use:icon={"more-horizontal"}></span>
                  </button>

                  {#if openActionMenuName === memo.name}
                    <div class="obwm-action-menu" role="menu">
                      <button
                        class="obwm-menu-item"
                        role="menuitem"
                        type="button"
                        on:click={() => startEditFromMenu(memo)}
                      >
                        <span class="obwm-icon" use:icon={"pencil"}></span>
                        <span>{messages.panel.edit}</span>
                      </button>
                      <button
                        class="obwm-menu-item"
                        disabled={busyMemoName === memo.name}
                        role="menuitem"
                        type="button"
                        on:click={() => void togglePinnedFromMenu(memo)}
                      >
                        <span class="obwm-icon" use:icon={memo.pinned ? "pin-off" : "pin"}></span>
                        <span>{memo.pinned ? messages.panel.unpin : messages.panel.pin}</span>
                      </button>
                      <button
                        class="obwm-menu-item"
                        disabled={busyMemoName === memo.name}
                        role="menuitem"
                        type="button"
                        on:click={() => void toggleArchivedFromMenu(memo)}
                      >
                        <span class="obwm-icon" use:icon={isArchived(memo) ? "archive-restore" : "archive"}></span>
                        <span>{isArchived(memo) ? messages.panel.restore : messages.panel.archive}</span>
                      </button>
                      <button
                        class="obwm-menu-item obwm-danger"
                        disabled={busyMemoName === memo.name}
                        role="menuitem"
                        type="button"
                        on:click={() => void deleteMemoFromMenu(memo)}
                      >
                        <span class="obwm-icon" use:icon={"trash-2"}></span>
                        <span>{messages.panel.delete}</span>
                      </button>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            {#if editingName === memo.name}
              <textarea bind:value={editContent} class="obwm-edit-textarea" rows="6"></textarea>
              <div class="obwm-edit-actions">
                <select class="obwm-visibility-select" bind:value={editVisibility}>
                  {#each VISIBILITY_VALUES as value}
                    <option value={value}>{visibilityLabels[value]}</option>
                  {/each}
                </select>

                <button
                  class="mod-cta"
                  disabled={savingEditName === memo.name}
                  type="button"
                  on:click={() => saveEdit(memo)}
                >
                  {messages.panel.save}
                </button>
                <button class="obwm-button obwm-soft-button" type="button" on:click={cancelEdit}>{messages.panel.cancel}</button>
              </div>
            {:else}
              <div class="obwm-memo-content">{memo.content}</div>

              {#if imageResources(memo).length}
                <div class="obwm-image-grid">
                  {#each imageResources(memo) as resource}
                    <a
                      class="obwm-image-link"
                      href={resourcePreviewUrl(resource)}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <img
                        alt={resourceLabel(resource)}
                        loading="lazy"
                        src={resourcePreviewUrl(resource)}
                      />
                    </a>
                  {/each}
                </div>
              {/if}

              {#if attachmentResources(memo).length}
                <div class="obwm-resource-list">
                  {#each attachmentResources(memo) as resource}
                    <span>{resourceLabel(resource)}</span>
                  {/each}
                </div>
              {/if}

              {#if commentsByMemoName[memo.name]?.length}
                <div class="obwm-comments">
                  <div class="obwm-comments-title">{messages.panel.comments}</div>
                  {#each commentsByMemoName[memo.name] as comment (memoKey(comment))}
                    <div class="obwm-comment">
                      <div class="obwm-comment-meta">{formatTime(comment.displayTime || comment.createTime)}</div>
                      <div class="obwm-comment-content">{comment.content}</div>
                    </div>
                  {/each}
                </div>
              {/if}

            {/if}
          </article>
        {/each}

        {#if nextPageToken}
          <button class="obwm-load-more" disabled={loading} type="button" on:click={loadMore}>
            {loading ? messages.panel.loading : messages.panel.loadMore}
          </button>
        {/if}
      {/if}
    </section>
  {/if}
</div>
