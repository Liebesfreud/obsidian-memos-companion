# Memos Companion

An Obsidian desktop plugin for writing and managing a self-hosted Memos instance from a sidebar.

## Features

- Ribbon icon and command palette entry for the Memos sidebar.
- Memos connection settings: base URL, access token, default visibility, page size.
- Create, browse, search, edit, delete, pin, archive, and restore memos.
- Upload attachments from file picker, paste, drag and drop, or an Obsidian vault path.
- Uses Obsidian `requestUrl`, so desktop requests are not blocked by browser CORS.

## Development

```bash
npm install
npm run build
```

For local testing, copy or symlink this folder into:

```text
<vault>/.obsidian/plugins/memos-companion
```

Then enable the plugin in Obsidian community plugin settings.

## Notes

This plugin targets the latest Memos v1 API. Resource upload includes fallback endpoints for common Memos API shapes, but attachment behavior should be verified against your exact self-hosted version.
