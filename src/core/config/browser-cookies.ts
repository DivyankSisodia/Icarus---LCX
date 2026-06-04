import Database from "better-sqlite3";
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

interface BrowserCandidate {
  name: string;
  keychainName: string;
  cookiePaths: string[];
}

function getProfilePaths(browserDir: string): string[] {
  const profiles: string[] = [];
  const base = path.join(os.homedir(), "Library/Application Support", browserDir);
  if (!fs.existsSync(base)) return profiles;
  const entries = fs.readdirSync(base);
  for (const entry of entries) {
    if (entry.startsWith("Profile ") || entry === "Default") {
      const cookiePath = path.join(base, entry, "Cookies");
      if (fs.existsSync(cookiePath)) profiles.push(cookiePath);
    }
  }
  return profiles;
}

function getChromeProfilePaths(): string[] {
  return getProfilePaths("Google/Chrome");
}

const BROWSERS: BrowserCandidate[] = [
  {
    name: "Chrome",
    keychainName: "Chrome",
    cookiePaths: getChromeProfilePaths(),
  },
  {
    name: "Brave",
    keychainName: "Brave",
    cookiePaths: getProfilePaths("BraveSoftware/Brave-Browser"),
  },
  {
    name: "Edge",
    keychainName: "Microsoft Edge",
    cookiePaths: getProfilePaths("Microsoft Edge"),
  },
  {
    name: "Chromium",
    keychainName: "Chromium",
    cookiePaths: getProfilePaths("Chromium"),
  },
];

export interface ExtractedCredentials {
  LEETCODE_SESSION: string;
  csrftoken: string;
  browser: string;
}

export function extractFromBrowsers(): ExtractedCredentials | null {
  for (const browser of BROWSERS) {
    for (const cookiePath of browser.cookiePaths) {
      if (!fs.existsSync(cookiePath)) continue;

      const result = tryExtractChromiumCookies(browser.name, browser.keychainName, cookiePath);
      if (result) return result;
    }
  }

  const firefoxResult = tryExtractFirefoxCookies();
  if (firefoxResult) return firefoxResult;

  return null;
}

function tryExtractChromiumCookies(
  browserName: string,
  keychainName: string,
  cookiePath: string
): ExtractedCredentials | null {
  const tempPath = `/tmp/lcx_cookies_${Date.now()}.sqlite`;

  try {
    fs.copyFileSync(cookiePath, tempPath);

    const encryptionKey = getChromiumKey(keychainName);
    if (!encryptionKey) return null;

    const db = new Database(tempPath, { readonly: true });

    const rows = db
      .prepare(
        `SELECT name, encrypted_value FROM cookies
         WHERE host_key LIKE '%leetcode.com'
         AND (name = 'LEETCODE_SESSION' OR name = 'csrftoken')`
      )
      .all() as Array<{ name: string; encrypted_value: Buffer }>;

    db.close();

    if (rows.length < 2) return null;

    let leetcodeSession = "";
    let csrftoken = "";

    for (const row of rows) {
      const decrypted = decryptChromiumCookie(row.encrypted_value, encryptionKey);
      if (row.name === "LEETCODE_SESSION") leetcodeSession = decrypted;
      if (row.name === "csrftoken") csrftoken = decrypted;
    }

    if (leetcodeSession && csrftoken) {
      return { LEETCODE_SESSION: leetcodeSession, csrftoken, browser: browserName };
    }
    return null;
  } catch {
    return null;
  } finally {
    try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
  }
}

function getChromiumKey(browserName: string): Buffer | null {
  try {
    const raw = execSync(
      `security find-generic-password -wa '${browserName}' 2>/dev/null`,
      { encoding: "utf-8" }
    ).trim();

    if (!raw) return null;

    if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
      return Buffer.from(raw, "hex");
    }

    return Buffer.from(raw, "base64");
  } catch {
    return null;
  }
}

function decryptChromiumCookie(
  encryptedValue: Buffer,
  key: Buffer
): string {
  const prefix = "v10";

  const dataStr = encryptedValue.toString();
  if (!dataStr.startsWith(prefix)) {
    return dataStr;
  }

  const encryptedData = encryptedValue.subarray(prefix.length);

  const nonce = encryptedData.subarray(0, 12);
  const ciphertext = encryptedData.subarray(12, encryptedData.length - 16);
  const authTag = encryptedData.subarray(encryptedData.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

function tryExtractFirefoxCookies(): ExtractedCredentials | null {
  const profilesDir = path.join(
    os.homedir(),
    "Library/Application Support/Firefox/Profiles"
  );
  if (!fs.existsSync(profilesDir)) return null;

  const profileDirs = fs.readdirSync(profilesDir).filter((d) => d.endsWith(".default-release") || d.endsWith(".default"));

  for (const profile of profileDirs) {
    const cookieDbPath = path.join(profilesDir, profile, "cookies.sqlite");
    if (!fs.existsSync(cookieDbPath)) continue;

    const tempPath = `/tmp/lcx_firefox_cookies_${Date.now()}.sqlite`;

    try {
      fs.copyFileSync(cookieDbPath, tempPath);
      const db = new Database(tempPath, { readonly: true });

      const rows = db
        .prepare(
          `SELECT name, value FROM moz_cookies
           WHERE host LIKE '%leetcode.com'
           AND (name = 'LEETCODE_SESSION' OR name = 'csrftoken')`
        )
        .all() as Array<{ name: string; value: string }>;

      db.close();

      if (rows.length < 2) return null;

      let leetcodeSession = "";
      let csrftoken = "";

      for (const row of rows) {
        if (row.name === "LEETCODE_SESSION") leetcodeSession = row.value;
        if (row.name === "csrftoken") csrftoken = row.value;
      }

      if (leetcodeSession && csrftoken) {
        return { LEETCODE_SESSION: leetcodeSession, csrftoken, browser: "Firefox" };
      }
      return null;
    } catch {
      return null;
    } finally {
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
  }

  return null;
}
