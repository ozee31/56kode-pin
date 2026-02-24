# Task 2 — Shared Types and Test Infrastructure

## Objective

Define the TypeScript types for the message-passing protocol between popup, service worker, and content script. Configure Vitest with Chrome API mocks and jsdom. Write initial type validation tests.

## Files to Create

### `src/types/messages.ts`

Define all shared types as a discriminated union:

```ts
// Article data extracted by Readability
export interface ArticleData {
  url: string;
  title: string;
  author: string | null;
  content: string;
}

// Webhook response from n8n
export interface WebhookSuccessResponse {
  status: "ok";
  file: string;
}

// --- Messages from Popup to Service Worker ---

export interface PinArticleMessage {
  type: "PIN_ARTICLE";
}

// --- Messages from Service Worker to Popup (responses) ---

export interface PinSuccessResponse {
  success: true;
  data: WebhookSuccessResponse;
}

export interface PinErrorResponse {
  success: false;
  error: string;
}

export type PinArticleResponse = PinSuccessResponse | PinErrorResponse;

// --- Settings stored in chrome.storage.local ---

export interface ExtensionSettings {
  webhookUrl: string;
  secretToken: string;
}
```

### `src/types/crxjs.d.ts`

Type declaration for the CRXJS `?script` import query (used in Task 4):

```ts
declare module "*?script" {
  const scriptPath: string;
  export default scriptPath;
}
```

### `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

Note: If `chrome.*` APIs are needed in tests, mock them manually using `vi.fn()` in each test file (or in a setup file). The `chrome` global can be mocked via `vi.stubGlobal`.

### `src/__tests__/messages.test.ts`

```ts
import { describe, it, expect } from "vitest";
import type { PinArticleResponse, ArticleData } from "../types/messages";

describe("Message types", () => {
  it("should create a valid ArticleData object", () => {
    const article: ArticleData = {
      url: "https://example.com/article",
      title: "Test Article",
      author: "John Doe",
      content: "Article content here",
    };
    expect(article.url).toBe("https://example.com/article");
    expect(article.author).toBe("John Doe");
  });

  it("should allow null author in ArticleData", () => {
    const article: ArticleData = {
      url: "https://example.com",
      title: "No Author",
      author: null,
      content: "Content",
    };
    expect(article.author).toBeNull();
  });

  it("should discriminate success and error responses", () => {
    const success: PinArticleResponse = {
      success: true,
      data: { status: "ok", file: "src/content/ai-radar/test.md" },
    };
    const error: PinArticleResponse = {
      success: false,
      error: "Unauthorized",
    };

    if (success.success) {
      expect(success.data.file).toBe("src/content/ai-radar/test.md");
    }
    if (!error.success) {
      expect(error.error).toBe("Unauthorized");
    }
  });
});
```

## Steps

1. Replace the empty `src/types/messages.ts` with the full type definitions
2. Create `src/types/crxjs.d.ts`
3. Create (or update) `vitest.config.ts` with jsdom environment and Preact plugin
4. Create `src/__tests__/messages.test.ts`
5. Run `pnpm run test` to verify tests pass
6. Run `pnpm run typecheck` to verify TypeScript compiles

## Acceptance Criteria

- [ ] `tsc --noEmit` passes without errors
- [ ] `pnpm run test` passes with all 3 message type tests green
- [ ] The type system enforces correct discrimination: accessing `data` on an error response or `error` on a success response causes a compile error
