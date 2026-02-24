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
      error:
        "Webhook URL not configured. Please set it in extension settings.",
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
      }),
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
