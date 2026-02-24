import { useState } from "preact/hooks";
import type { ExtensionSettings } from "../types/messages";
import styles from "./App.module.css";

interface SettingsProps {
  settings: ExtensionSettings;
  onSave: (settings: ExtensionSettings) => void;
}

export function Settings({ settings, onSave }: SettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [secretToken, setSecretToken] = useState(settings.secretToken);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSave({ webhookUrl, secretToken });
  };

  return (
    <form class={styles.settings} onSubmit={handleSubmit}>
      <label class={styles.label}>
        Webhook URL
        <input
          type="url"
          class={styles.input}
          value={webhookUrl}
          onInput={(e) =>
            setWebhookUrl((e.target as HTMLInputElement).value)
          }
          placeholder="https://n8n.example.com/webhook/..."
          required
        />
      </label>
      <label class={styles.label}>
        Secret Token
        <input
          type="password"
          class={styles.input}
          value={secretToken}
          onInput={(e) =>
            setSecretToken((e.target as HTMLInputElement).value)
          }
          placeholder="Your secret token"
        />
      </label>
      <button type="submit" class={styles.saveButton}>
        Save
      </button>
    </form>
  );
}
