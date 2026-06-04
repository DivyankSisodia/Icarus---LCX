import fs from "fs-extra";
import path from "path";
import os from "os";

const SECRETS_DIR = path.join(os.homedir(), ".lcx");
const SECRETS_FILE = path.join(SECRETS_DIR, "secrets.json");

interface LcxSecrets {
  LEETCODE_SESSION: string;
  csrftoken: string;
}

let cachedSecrets: LcxSecrets | null = null;

export function loadSecrets(): LcxSecrets | null {
  if (cachedSecrets) return cachedSecrets;
  if (!fs.existsSync(SECRETS_FILE)) return null;
  try {
    const raw = fs.readJsonSync(SECRETS_FILE);
    if (raw.LEETCODE_SESSION && raw.csrftoken) {
      cachedSecrets = raw;
      return cachedSecrets;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSecrets(session: string, csrf: string): void {
  fs.ensureDirSync(SECRETS_DIR);
  const secrets: LcxSecrets = {
    LEETCODE_SESSION: session,
    csrftoken: csrf,
  };
  fs.writeJsonSync(SECRETS_FILE, secrets, { spaces: 2 });
  cachedSecrets = secrets;
  console.warn(
    "[!] Secrets stored in plaintext at ~/.lcx/secrets.json. " +
      "TODO: Replace with OS keychain (keytar) for secure storage."
  );
}

export function clearSecrets(): void {
  if (fs.existsSync(SECRETS_FILE)) {
    fs.unlinkSync(SECRETS_FILE);
  }
  cachedSecrets = null;
}
