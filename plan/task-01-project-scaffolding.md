# Task 1 — Project Scaffolding and Build Configuration

## Objective

Set up the project foundation with pnpm, Vite, Preact, TypeScript, @crxjs/vite-plugin, and the correct directory structure. The extension should build and load in Chrome/Brave with an empty popup.

## Dependencies

### Runtime
- `preact` — Lightweight UI framework for the popup
- `@mozilla/readability` — Article content extraction (used in Task 3, installed now)

### Dev
- `typescript` — Language
- `vite` — Bundler
- `@preact/preset-vite` — Vite plugin for Preact (JSX transform, HMR)
- `@crxjs/vite-plugin` — Vite plugin for Chrome extensions (manifest handling, HMR, content script bundling)
- `@types/chrome` — TypeScript types for Chrome extension APIs
- `vitest` — Test runner (configured in Task 2, installed now)
- `jsdom` — DOM environment for tests
- `@testing-library/preact` — Component testing utilities

## Files to Create

### `package.json`

```json
{
  "name": "56kode-pin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

### `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "manifest.config.ts"]
}
```

### `vite.config.ts`

```ts
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest }),
  ],
  build: {
    sourcemap: false,
  },
});
```

### `manifest.config.ts`

Use `defineManifest` from `@crxjs/vite-plugin`:

```ts
import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";

const { version } = packageJson;

export default defineManifest({
  manifest_version: 3,
  name: "56kode Pin",
  description: "Pin any article to the 56kode AI radar with one click.",
  version,
  permissions: ["activeTab", "storage", "scripting"],
  action: {
    default_popup: "index.html",
    default_icon: {
      "16": "public/icon-16.png",
      "48": "public/icon-48.png",
      "128": "public/icon-128.png",
    },
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  icons: {
    "16": "public/icon-16.png",
    "48": "public/icon-48.png",
    "128": "public/icon-128.png",
  },
});
```

**Important:** No `content_scripts` entry. The content script is injected dynamically via `chrome.scripting.executeScript` (see Task 4).

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>56kode Pin</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/popup/index.tsx"></script>
</body>
</html>
```

### `src/popup/index.tsx`

```tsx
import { render } from "preact";
import { App } from "./App";

render(<App />, document.getElementById("app")!);
```

### `src/popup/App.tsx`

Minimal shell:

```tsx
export function App() {
  return (
    <div>
      <h1>56kode Pin</h1>
    </div>
  );
}
```

### `src/background/index.ts`

Empty service worker shell:

```ts
// Service worker for 56kode-pin extension
// Logic will be added in Task 4
export {};
```

### `src/content/index.ts`

Empty content script shell:

```ts
// Content script for article extraction
// Logic will be added in Task 3
export {};
```

### `src/types/messages.ts`

Empty types file:

```ts
// Shared types for message passing
// Will be defined in Task 2
export {};
```

### Icons (`public/icon-16.png`, `public/icon-48.png`, `public/icon-128.png`)

Generate simple placeholder PNG icons (solid color square or a simple pin symbol). These just need to exist for the manifest to be valid.

### `.gitignore`

```
node_modules/
dist/
.vite/
*.local
```

## Steps

1. Create all directories: `src/popup/`, `src/background/`, `src/content/`, `src/types/`, `src/__tests__/`, `public/`
2. Create `package.json` and run `pnpm install` with all dependencies
3. Create all configuration files (`tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `manifest.config.ts`)
4. Create `index.html` and the minimal source files
5. Generate placeholder icons
6. Create `.gitignore`
7. Run `pnpm run build` and verify it produces a valid `dist/` directory

## Acceptance Criteria

- [ ] `pnpm install` succeeds without errors
- [ ] `pnpm run build` produces a `dist/` directory with a valid Manifest V3 extension
- [ ] The built extension can be loaded in `chrome://extensions` (developer mode) without errors
- [ ] Clicking the extension icon opens a popup showing "56kode Pin"
- [ ] `pnpm run test` executes (even with no tests) and exits cleanly
