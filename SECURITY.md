# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Email the maintainer or open a private GitHub security advisory for the repository. Include a clear description, reproduction steps, affected versions, and any known workarounds.

## Sensitive data

Memos Companion stores plugin settings through Obsidian's plugin data API. Treat your Memos access token as sensitive:

- Do not commit `data.json` or vault plugin settings.
- Revoke and rotate the token if it is accidentally shared.
- Prefer a token with the least privileges supported by your Memos deployment.
