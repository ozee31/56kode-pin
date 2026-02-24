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
