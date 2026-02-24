import type {
  PinArticleResponse,
  ArticleData,
  ExtensionSettings,
} from "../types/messages";

import contentScriptPath from "../content/index.ts?script";

const TIMEOUT_MS = 30_000;

export async function handlePinArticle(): Promise<PinArticleResponse> {
  try {
    return await Promise.race([pinArticle(), timeout(TIMEOUT_MS)]);
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
      error:
        "Webhook URL not configured. Please set it in extension settings.",
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
    setTimeout(() => reject(new Error("Request timed out")), ms),
  );
}
