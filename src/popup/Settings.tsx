import type { ExtensionSettings } from "../types/messages";
import styles from "./App.module.css";

interface SettingsProps {
  settings: ExtensionSettings;
  onChange: (settings: ExtensionSettings) => void;
}

export function Settings({ settings, onChange }: SettingsProps) {
  return (
    <div class={styles.settings}>
      <label class={styles.label}>
        Webhook URL
        <input
          type="url"
          class={styles.input}
          value={settings.webhookUrl}
          onInput={(e) =>
            onChange({
              ...settings,
              webhookUrl: (e.target as HTMLInputElement).value,
            })
          }
          placeholder="https://n8n.example.com/webhook/..."
        />
      </label>
      <label class={styles.label}>
        Secret Token
        <input
          type="password"
          class={styles.input}
          value={settings.secretToken}
          onInput={(e) =>
            onChange({
              ...settings,
              secretToken: (e.target as HTMLInputElement).value,
            })
          }
          placeholder="Your secret token"
        />
      </label>
    </div>
  );
}
