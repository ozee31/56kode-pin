# 56kode-pin — Development Plan

## Problem & Goal

**56kode** is a personal tech blog (Astro, GitHub repo `ozee31/56kode`) with an "AI radar" section where each entry is a Markdown file in `src/content/ai-radar/`. The current workflow is fully manual: find an article, create the file, fill the frontmatter, write a summary, commit, push.

**Goal:** Reduce this to a single click from the browser. The user reads an article, clicks the extension, and the rest is automated via an n8n webhook → LLM → GitHub push pipeline.

## Scope

The extension's role is **strictly limited**:

- **Does:** Extract article content from the current page + send it to a webhook
- **Does NOT:** Call any LLM, interact with GitHub, process or transform content

Everything beyond extraction and sending is handled by n8n (see `plan-technique-automatisation-veille.md` at the project root level for the full pipeline).

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Dynamic injection** via `chrome.scripting.executeScript` instead of static `content_scripts` in the manifest | The content script only needs to run when the user clicks "Pin", not on every page load. Keeps the extension lightweight. |
| **`activeTab` permission** instead of `<all_urls>` | Minimal permissions. `activeTab` grants temporary access only when the user interacts with the extension icon. Avoids Chrome Web Store review friction. |
| **`document.cloneNode(true)`** before running Readability | Readability mutates the DOM it processes. Cloning prevents any visible changes to the page the user is viewing. |
| **`textContent`** (not `content`) from Readability | The webhook contract expects plain text. `textContent` = plain text, `content` = HTML. |
| **Handler logic extracted** to `background/handler.ts` | Separating the orchestration logic from the `chrome.runtime.onMessage` listener makes it unit-testable with mocked Chrome APIs and fetch. |
| **CSS Modules** for popup styling | Scoped class names, no risk of style conflicts, no extra dependency. |
| **Preact** for popup UI | Lightweight (3KB), React-compatible API, sufficient for a popup with settings form + button + status feedback. |
| **No `host_permissions`** | Combined with `activeTab` + `scripting`, we can inject into the current tab without declaring broad host access. |

## Manifest V3 Constraints

These constraints shape the architecture and must be respected across all tasks:

1. **Content scripts cannot fetch external URLs** — All HTTP requests (webhook POST) must go through the service worker
2. **Async responses in `onMessage` require `return true`** — The listener must return `true` to keep the message channel open when using `sendResponse` asynchronously
3. **Service worker is ephemeral** — No persistent state; settings must be stored in `chrome.storage.local`
4. **`chrome.scripting.executeScript` return value** — The last evaluated expression in the injected script becomes the result. CRXJS bundles content scripts as IIFEs, so the function call at the end of the file is what gets returned.

## Architecture

```
POPUP (Preact)              SERVICE WORKER              CONTENT SCRIPT
┌──────────────┐            ┌──────────────┐            ┌───────────────┐
│ App.tsx       │ sendMsg    │ handler.ts   │ executeScript│ index.ts     │
│ [Pin button]  │ ────────> │              │ ──────────> │ Readability   │
│ [Settings]    │           │              │ <────────── │ .parse()      │
│               │           │  fetch POST  │  result     └───────────────┘
│               │           │  ──> n8n     │
│               │ response  │  <── result  │
│ [Status]      │ <──────── │              │
└──────────────┘            └──────────────┘
```

**Flow:** Popup → `PIN_ARTICLE` message → Service worker injects content script → Readability extracts article → Service worker receives `ArticleData` → POSTs to webhook → Relays response to popup → Popup shows success/error.

## API Contract (webhook)

Reference for tasks 3 and 4. This is the contract between the extension and n8n.

**POST payload:**
```json
{
  "url": "https://example.com/article",
  "title": "Article title extracted by Readability",
  "author": "Author name or null",
  "content": "Full plain text content extracted by Readability"
}
```

**Header:** `X-Secret-Token: <configured token>`

**Responses:**
- `200` → `{ "status": "ok", "file": "src/content/ai-radar/slug.md" }`
- `401` → Unauthorized (bad token)
- `4xx / 5xx` → Error with message body

## Tasks

6 sequential tasks. Each builds on the previous one and is designed to be executed independently by an AI coding agent.

| # | File | What it delivers | Depends on |
|---|---|---|---|
| 1 | [task-01-project-scaffolding.md](./task-01-project-scaffolding.md) | Working build: pnpm + Vite + CRXJS + Preact + MV3 manifest, loadable in Chrome with empty popup | — |
| 2 | [task-02-types-and-test-infra.md](./task-02-types-and-test-infra.md) | Shared TypeScript types (`ArticleData`, `PinArticleResponse`, `ExtensionSettings`) + Vitest config with jsdom | Task 1 |
| 3 | [task-03-content-script.md](./task-03-content-script.md) | Content script: `extractArticle()` using Readability.js, with unit tests | Tasks 1-2 |
| 4 | [task-04-service-worker.md](./task-04-service-worker.md) | Service worker: orchestration (inject, extract, fetch webhook), full error handling, with unit tests | Tasks 1-3 |
| 5 | [task-05-popup-ui.md](./task-05-popup-ui.md) | Preact popup: Settings form, PinButton with 4 states, visual feedback, with component tests | Tasks 1-4 |
| 6 | [task-06-integration-polish.md](./task-06-integration-polish.md) | E2E verification, edge case testing, production build check, project README | Tasks 1-5 |
