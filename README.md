# 56kode-pin

Browser extension to instantly pin any article to the 56kode AI radar with one click.

## How it works

1. Navigate to any article on the web
2. Click the 56kode Pin extension icon
3. Click "Pin this article"
4. The extension extracts the article content and sends it to your n8n webhook
5. n8n processes the content with AI and pushes a Markdown file to GitHub

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Language | TypeScript | Type safety |
| Bundler | Vite + @crxjs/vite-plugin | Build, HMR, Chrome extension support |
| Popup UI | Preact | Lightweight reactive components |
| Content extraction | @mozilla/readability | Isolate article content (like Firefox Reader View) |
| Package manager | pnpm | Fast, disk-efficient |
| Tests | Vitest + jsdom | Unit tests |
| Extension manifest | Manifest V3 | Required for Chrome/Brave |

## Project Structure

```
pin/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── manifest.config.ts
├── index.html
├── public/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── src/
│   ├── popup/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── Settings.tsx
│   │   ├── PinButton.tsx
│   │   └── App.module.css
│   ├── background/
│   │   ├── index.ts
│   │   └── handler.ts
│   ├── content/
│   │   └── index.ts
│   ├── types/
│   │   ├── messages.ts
│   │   └── crxjs.d.ts
│   └── __tests__/
│       ├── messages.test.ts
│       ├── content.test.ts
│       ├── handler.test.ts
│       └── popup.test.tsx
├── .gitignore
├── LICENSE
└── README.md
```

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

- **Popup** (Preact): Settings form + Pin button + status feedback
- **Service Worker**: Orchestrates the flow — injects content script, receives data, POSTs to webhook
- **Content Script**: Uses Readability.js to extract article content from the page

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

## Security

- Webhook URL and secret token stored in `chrome.storage.local` only (never synced, never hardcoded)
- No credentials for the LLM or GitHub are in the extension (those live in n8n)
- `activeTab` permission only — no broad host access

## License

MIT
