import chalk from "chalk";
import { loadConfig, updateConfig } from "../../core/config/config";
import type { LcxConfig } from "../../types/config";
import { loadSecrets } from "../../core/config/secrets";

interface ConfigOptions {
  set?: [string, string];
}

export function configCommand(options: ConfigOptions): void {
  if (options.set) {
    const [key, value] = options.set;

    try {
      const updated = updateConfig(key as keyof LcxConfig, value);
      console.log("");
      console.log(
        chalk.green(
          `  ✓ ${key} set to ${JSON.stringify((updated as Record<string, unknown>)[key])}`
        )
      );
    } catch (error) {
      console.log(
        chalk.red(
          `  ✗ Failed to set config: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
    }
    return;
  }

  const config = loadConfig();
  const secrets = loadSecrets();

  console.log("");
  console.log(chalk.bold.magenta("  LCX Configuration"));
  console.log(chalk.gray("  ─────────────────────────────"));
  console.log("");

  const entries = Object.entries(config) as [string, unknown][];
  for (const [key, value] of entries) {
    const valStr = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
    console.log(
      `  ${chalk.white(key.padEnd(22))} ${chalk.cyan(valStr)}`
    );
  }

  console.log("");
  console.log(chalk.gray("  ─────────────────────────────"));
  console.log(
    `  ${chalk.white("Authenticated".padEnd(22))} ${
      secrets
        ? chalk.green("Yes") + chalk.gray(` (${secrets.LEETCODE_SESSION.slice(0, 8)}...)`)
        : chalk.red("No")
    }`
  );
  console.log("");

  console.log(
    chalk.gray("  Config file: ") +
      chalk.white("~/LCX/config.json")
  );
  console.log(
    chalk.gray("  Secrets file: ") +
      chalk.white("~/.lcx/secrets.json")
  );
  console.log("");

  console.log(chalk.gray("  To update a setting:"));
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx config set <key> <value>")
  );
  console.log(
    chalk.gray('    Example: ') +
      chalk.white("lcx config set defaultLanguage python")
  );
  console.log("");
}
