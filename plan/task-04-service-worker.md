# Task 4 — Service Worker (Orchestration + Webhook Call)

## Objective

Implement the service worker that listens for messages from the popup, injects the content script into the active tab, receives the extracted article data, POSTs it to the n8n webhook, and returns the result to the popup.

## Key Design Decisions

- **Extracted handler for testability:** The core logic lives in `handler.ts` as an exported async function. The `index.ts` file only wires the `chrome.runtime.onMessage` listener. This allows unit testing the handler with mocked Chrome APIs.
- **`return true` in listener:** Required to keep the message channel open for async responses via `sendResponse`.
- **Dynamic content script injection:** Uses `chrome.scripting.executeScript` with the `?script` import from CRXJS to get the bundled content script path.
- **Timeout protection:** Wraps the entire flow in a `Promise.race` with a 30-second timeout to prevent the popup from hanging indefinitely.

## Files to Create/Modify

### `src/background/handler.ts`

The core orchestration logic:

```ts
import type {
  PinArticleResponse,
  ArticleData,
  ExtensionSettings,
} from "../types/messages";

// The content script path is resolved by CRXJS at build time
import contentScriptPath from "../content/index.ts?script";

const TIMEOUT_MS = 30_000;

export async function handlePinArticle(): Promise<PinArticleResponse> {
  try {
    return await Promise.race([
      pinArticle(),
      timeout(TIMEOUT_MS),
    ]);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
}

async function pinArticle(): Promise<PinArticleResponse> {
  // 1. Get the active tab
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    return { success: false, error: "No active tab found" };
  }

  // 2. Inject content script and get article data
  let injectionResults;
  try {
    injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [contentScriptPath],
    });
  } catch {
    return {
      success: false,
      error: "Cannot extract content from this page (restricted URL)",
    };
  }

  const articleData = injectionResults?.[0]?.result as ArticleData | null;
  if (!articleData) {
    return {
      success: false,
      error: "Could not extract article content from this page",
    };
  }

  // 3. Load settings from storage
  const settings = (await chrome.storage.local.get([
    "webhookUrl",
    "secretToken",
  ])) as Partial<ExtensionSettings>;

  if (!settings.webhookUrl) {
    return {
      success: false,
      error: "Webhook URL not configured. Please set it in extension settings.",
    };
  }

  // 4. POST to webhook
  let response: Response;
  try {
    response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.secretToken
          ? { "X-Secret-Token": settings.secretToken }
          : {}),
      },
      body: JSON.stringify(articleData),
    });
  } catch {
    return {
      success: false,
      error: "Network error: could not reach webhook",
    };
  }

  // 5. Handle response
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    if (response.status === 401) {
      return {
        success: false,
        error: "Unauthorized: check your secret token",
      };
    }
    return {
      success: false,
      error: `Webhook error (${response.status}): ${errorText}`,
    };
  }

  const data = await response.json();
  return { success: true, data };
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), ms)
  );
}
```

### `src/background/index.ts`

Replace the empty shell with the message listener:

```ts
import { handlePinArticle } from "./handler";

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse): true | undefined => {
    if (message.type === "PIN_ARTICLE") {
      handlePinArticle().then(sendResponse);
      return true; // Keep message channel open for async response
    }
  }
);
```

### `src/__tests__/handler.test.ts`

Test the handler with mocked Chrome APIs and fetch:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock chrome APIs before importing handler
const mockTabsQuery = vi.fn();
const mockExecuteScript = vi.fn();
const mockStorageGet = vi.fn();

vi.stubGlobal("chrome", {
  tabs: { query: mockTabsQuery },
  scripting: { executeScript: mockExecuteScript },
  storage: { local: { get: mockStorageGet } },
});

// Mock the ?script import
vi.mock("../content/index.ts?script", () => ({
  default: "content-script.js",
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import AFTER mocks are set up
const { handlePinArticle } = await import("../background/handler");

const mockArticleData = {
  url: "https://example.com/article",
  title: "Test Article",
  author: "John Doe",
  content: "Article content",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handlePinArticle", () => {
  it("should return error when no active tab is found", async () => {
    mockTabsQuery.mockResolvedValue([]);
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "No active tab found",
    });
  });

  it("should return error when executeScript fails (restricted page)", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockRejectedValue(new Error("Cannot access"));
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "Cannot extract content from this page (restricted URL)",
    });
  });

  it("should return error when content extraction returns null", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: null }]);
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "Could not extract article content from this page",
    });
  });

  it("should return error when webhook URL is not configured", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({});
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "Webhook URL not configured. Please set it in extension settings.",
    });
  });

  it("should return error on network failure", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "token123",
    });
    mockFetch.mockRejectedValue(new Error("Network error"));
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "Network error: could not reach webhook",
    });
  });

  it("should return error on 401 response", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "wrong-token",
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "Unauthorized: check your secret token",
    });
  });

  it("should return error on 500 response", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({
      webhookUrl: "https://n8n.example.com/webhook/test",
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: false,
      error: "Webhook error (500): Internal Server Error",
    });
  });

  it("should return success with webhook response data on 200", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "token123",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "ok",
          file: "src/content/ai-radar/test-article.md",
        }),
    });
    const result = await handlePinArticle();
    expect(result).toEqual({
      success: true,
      data: {
        status: "ok",
        file: "src/content/ai-radar/test-article.md",
      },
    });
  });

  it("should include X-Secret-Token header when token is configured", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "my-secret",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", file: "test.md" }),
    });

    await handlePinArticle();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Secret-Token": "my-secret",
        }),
      })
    );
  });

  it("should not include X-Secret-Token header when token is empty", async () => {
    mockTabsQuery.mockResolvedValue([{ id: 1 }]);
    mockExecuteScript.mockResolvedValue([{ result: mockArticleData }]);
    mockStorageGet.mockResolvedValue({
      webhookUrl: "https://n8n.example.com/webhook/test",
      secretToken: "",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok", file: "test.md" }),
    });

    await handlePinArticle();

    const fetchHeaders = mockFetch.mock.calls[0][1].headers;
    expect(fetchHeaders).not.toHaveProperty("X-Secret-Token");
  });
});
```

## Steps

1. Create `src/background/handler.ts` with the full orchestration logic
2. Replace `src/background/index.ts` with the message listener
3. Create `src/__tests__/handler.test.ts`
4. Run `pnpm run test` to verify all handler tests pass
5. Run `pnpm run build` to verify the service worker bundles correctly

## Acceptance Criteria

- [ ] All 9+ handler tests pass
- [ ] Service worker loads without errors in Chrome
- [ ] `X-Secret-Token` header is correctly included/excluded based on settings
- [ ] Error cases return clear, user-friendly messages
- [ ] 30-second timeout prevents indefinite hangs
- [ ] `pnpm run build` succeeds
