# Memos Companion

[![CI](https://github.com/Liebesfreud/obsidian-memos-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/Liebesfreud/obsidian-memos-companion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Memos Companion is an Obsidian desktop plugin for writing and managing a self-hosted [Memos](https://www.usememos.com/) instance from a sidebar.

## Features

- Open a Memos sidebar from the ribbon or command palette.
- Configure Memos base URL, access token, default visibility, page size, and language.
- Create, browse, search, edit, delete, pin, archive, and restore memos.
- Upload attachments from file picker, paste, drag and drop, or an Obsidian vault path.
- Use Obsidian `requestUrl`, so desktop requests are not blocked by browser CORS.
- Run as a desktop-only plugin for self-hosted Memos workflows.

## Requirements

- Obsidian `1.5.0` or newer.
- A self-hosted Memos server with API access.
- A Memos access token.

## Installation

### From GitHub releases

1. Download `manifest.json`, `main.js`, and `styles.css` from the latest release.
2. Create this folder in your vault if it does not exist:

   ```text
   <vault>/.obsidian/plugins/memos-companion
   ```

3. Place the downloaded files in that folder.
4. Restart Obsidian or reload community plugins.
5. Enable **Memos Companion** in Obsidian settings.

### From source

```bash
npm install
npm run build
```

Then copy or symlink this repository into:

```text
<vault>/.obsidian/plugins/memos-companion
```

## Configuration

Open **Settings → Community plugins → Memos Companion** and set:

- **Memos URL**: the base URL of your Memos instance, for example `https://memos.example.com`.
- **Access token**: your Memos API token.
- **Default visibility**: the visibility used when creating new memos.
- **Page size**: the number of memos to fetch per page.
- **Language**: plugin interface language.

Do not commit Obsidian plugin data such as `data.json`; it may contain your access token.

## Development

```bash
npm install
npm run check
npm run build
```

Useful files:

- `src/main.ts`: plugin entry point.
- `src/memos-client.ts`: Memos API client.
- `src/ui/MemosPanel.svelte`: sidebar UI.
- `manifest.json`: Obsidian plugin manifest.
- `versions.json`: Obsidian community plugin compatibility map.

## Release checklist

1. Update `package.json`, `manifest.json`, and `versions.json` with the new version.
2. Update `CHANGELOG.md`.
3. Run `npm run check` and `npm run build`.
4. Commit the changes.
5. Create and push a tag, for example:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

The release workflow builds the plugin and uploads `manifest.json`, `main.js`, `styles.css`, and a zip archive to GitHub Releases.

## Compatibility notes

This plugin targets the latest Memos v1 API. Resource upload includes fallback endpoints for common Memos API shapes, but attachment behavior should be verified against your exact self-hosted version.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Security

Please report vulnerabilities privately and avoid posting access tokens in public issues. See [SECURITY.md](SECURITY.md).

## License

MIT License. See [LICENSE](LICENSE).
