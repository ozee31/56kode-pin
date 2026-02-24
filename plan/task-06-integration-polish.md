# Task 6 — Integration, Polish, and Documentation

## Objective

Verify the full end-to-end flow, handle remaining edge cases, clean up the production build, and update the project README.

## End-to-End Flow Verification

Test the complete flow manually:

1. Build the extension: `pnpm run build`
2. Load `dist/` in `chrome://extensions` (developer mode)
3. Navigate to a blog article (e.g., any Medium article or dev.to post)
4. Click the 56kode Pin extension icon
5. Configure webhook URL and secret token in Settings (use a test endpoint like https://webhook.site for initial testing)
6. Click "Pin this article"
7. Verify: loading spinner appears → success/error message displays

## Edge Cases to Test

| Scenario | Expected behavior |
|---|---|
| Non-article page (e.g., google.com) | Error: "Could not extract article content from this page" |
| Restricted page (chrome://, chrome-extension://) | Error: "Cannot extract content from this page (restricted URL)" |
| Invalid/wrong secret token | Error: "Unauthorized: check your secret token" |
| Unreachable webhook URL | Error: "Network error: could not reach webhook" |
| Webhook URL not configured | Error: "Webhook URL not configured..." + settings auto-open |
| Very long article | Should work (Readability handles large DOMs; Gemini has 1M token context) |
| Page with no author detected | `author` field is `null` in payload |
| Settings persist after popup close/reopen | Webhook URL and token are still there |
| Success auto-reset | Green "Pinned!" message disappears after 3 seconds, button returns to idle |

## Tasks

### 1. Full test suite verification

Run and ensure all tests pass:

```bash
pnpm run test
pnpm run typecheck
```

Fix any issues that emerge from the full integration.

### 2. Production build check

```bash
pnpm run build
```

Verify:
- `dist/` contains all expected files (manifest.json, popup HTML/JS, service worker, content script)
- No source maps in production build (`build.sourcemap: false` in vite.config.ts)
- Content script bundle includes Readability.js (check file size is reasonable, ~50-100KB)

### 3. Update README.md

Update the project's root `README.md` with:

```markdown
# 56kode-pin

Browser extension to instantly pin any article to the 56kode AI radar with one click.

## How it works

1. Navigate to any article on the web
2. Click the 56kode Pin extension icon
3. Click "Pin this article"
4. The extension extracts the article content and sends it to your n8n webhook
5. n8n processes the content with AI and pushes a Markdown file to GitHub

## Installation

### From source

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm run build
   ```
4. Open Chrome/Brave and navigate to `chrome://extensions`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist/` directory

### Configuration

After installing the extension:
1. Click the 56kode Pin icon in your browser toolbar
2. Click the gear icon to open Settings
3. Enter your **Webhook URL** (n8n webhook endpoint)
4. Enter your **Secret Token** (must match the token configured in n8n)
5. Click Save

## Development

### Prerequisites

- Node.js 20+
- pnpm

### Commands

| Command | Description |
|---|---|
| `pnpm run dev` | Start Vite dev server with HMR |
| `pnpm run build` | Production build to `dist/` |
| `pnpm run test` | Run tests once |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run typecheck` | TypeScript type checking |

### Architecture

- **Popup** (Preact): Settings form + Pin button + status feedback
- **Service Worker**: Orchestrates the flow — injects content script, receives data, POSTs to webhook
- **Content Script**: Uses Readability.js to extract article content from the page

## Tech Stack

- TypeScript
- Vite + @crxjs/vite-plugin
- Preact
- @mozilla/readability
- Vitest
```

### 4. Verify .gitignore

Ensure these patterns are ignored:

```
node_modules/
dist/
.vite/
*.local
```

### 5. Add typecheck script (if not already present)

Verify `package.json` has:

```json
"typecheck": "tsc --noEmit"
```

## Acceptance Criteria

- [ ] `pnpm run build` produces a clean build with no warnings
- [ ] `pnpm run test` passes with all tests green
- [ ] `pnpm run typecheck` passes with no type errors
- [ ] Extension loads in Chrome/Brave developer mode without errors
- [ ] Full manual test succeeds: navigate to article → click Pin → see success
- [ ] All edge cases from the table above produce the expected error messages
- [ ] README.md is complete with installation, configuration, and development instructions
- [ ] `.gitignore` correctly excludes build artifacts
