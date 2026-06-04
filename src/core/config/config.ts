import fs from "fs-extra";
import path from "path";
import os from "os";
import { LcxConfig, LcxConfigSchema, DEFAULT_CONFIG } from "../../types/config";

function expandPath(p: string): string {
  let expanded = p;
  if (p.startsWith("~")) {
    expanded = path.join(os.homedir(), p.slice(1));
  }
  expanded = path.resolve(expanded);
  try {
    return fs.realpathSync(expanded);
  } catch {
    return expanded;
  }
}

function configFilePath(): string {
  const workspacePath = expandPath(
    process.env.LCX_WORKSPACE || DEFAULT_CONFIG.workspacePath
  );
  return path.join(workspacePath, "config.json");
}

export function loadConfig(): LcxConfig {
  const filePath = configFilePath();
  if (!fs.existsSync(filePath)) {
    fs.ensureDirSync(path.dirname(filePath));
    fs.writeJsonSync(filePath, DEFAULT_CONFIG, { spaces: 2 });
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readJsonSync(filePath);
    const parsed = LcxConfigSchema.parse(raw);
    return parsed;
  } catch {
    fs.writeJsonSync(filePath, DEFAULT_CONFIG, { spaces: 2 });
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: LcxConfig): void {
  const filePath = configFilePath();
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeJsonSync(filePath, config, { spaces: 2 });
}

export function updateConfig(
  key: keyof LcxConfig,
  value: string | boolean
): LcxConfig {
  const config = loadConfig();
  const schema = LcxConfigSchema.shape[key];
  if (!schema) {
    throw new Error(`Unknown config key: ${key}`);
  }
  let parsedValue: unknown = value;
  if (typeof value === "string") {
    if (value === "true") parsedValue = true;
    else if (value === "false") parsedValue = false;
  }
  (config as Record<string, unknown>)[key] = parsedValue;
  const validated = LcxConfigSchema.parse(config);
  saveConfig(validated);
  return validated;
}

export function getWorkspacePath(): string {
  const config = loadConfig();
  return expandPath(config.workspacePath);
}

export { expandPath };
