# Contributing

Thanks for your interest in improving Memos Companion.

## Development setup

```bash
npm install
npm run build
```

For local testing, copy or symlink the repository into an Obsidian vault:

```text
<vault>/.obsidian/plugins/memos-companion
```

Then enable the plugin from Obsidian's community plugin settings.

## Pull requests

- Keep changes focused and describe the user-facing impact.
- Run `npm run check` before opening a pull request.
- Run `npm run build` when changes affect plugin output.
- Do not commit local plugin settings such as `data.json`.
- Include screenshots or short recordings for UI changes when helpful.

## Issues

When reporting a bug, include:

- Obsidian version and operating system.
- Memos server version and deployment type, if relevant.
- Steps to reproduce the issue.
- Expected behavior and actual behavior.
- Console errors or network response details, with tokens removed.
