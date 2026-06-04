import chalk from "chalk";
import ora from "ora";
import { saveSecrets } from "../../core/config/secrets";
import { getViewer } from "../../core/leetcode/auth";
import { extractFromBrowsers } from "../../core/config/browser-cookies";

async function promptInput(message: string): Promise<string> {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    readline.question(message, (answer: string) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

export async function loginCommand(options: { force?: boolean }): Promise<void> {
  console.log("");
  console.log(chalk.bold.magenta("  LCX Login"));
  console.log(chalk.gray("  ─────────────────────────────"));
  console.log("");

  if (!options.force) {
    const spinner = ora("Scanning browsers for LeetCode cookies...").start();

    try {
      const extracted = extractFromBrowsers();

      if (extracted) {
        spinner.succeed(
          chalk.gray(`Found credentials in ${extracted.browser}`)
        );

        saveSecrets(extracted.LEETCODE_SESSION, extracted.csrftoken);

        const verifySpinner = ora("Verifying credentials...").start();
        try {
          const viewer = await getViewer();
          verifySpinner.succeed(
            chalk.green(`Logged in as ${chalk.bold(viewer.username)}`)
          );
          console.log(
            chalk.gray(
              `  Solved: ${viewer.solvedCount} | Ranking: ${viewer.ranking}`
            )
          );
          console.log("");
          console.log(
            chalk.green("  ✓ Auto-login successful — no manual token copying needed!")
          );
          console.log("");
          return;
        } catch (error) {
          verifySpinner.fail("Credentials from browser are invalid or expired.");
          console.log(
            chalk.gray("  The stored cookies may have expired. Falling back to manual input.")
          );
        }
      } else {
        spinner.info("No LeetCode cookies found in browsers.");
      }
    } catch {
      spinner.info("Could not scan browsers.");
    }
  }

  // Manual fallback
  console.log(
    chalk.gray("  To get your session cookies:")
  );
  console.log("");
  console.log(
    chalk.white("  1. Log into leetcode.com in your browser")
  );
  console.log(
    chalk.white("  2. Open DevTools (F12) → Application → Cookies")
  );
  console.log(
    chalk.white("  3. Copy LEETCODE_SESSION and csrftoken")
  );
  console.log("");

  const session = await promptInput(
    chalk.cyan("  Enter LEETCODE_SESSION: ")
  );
  const csrf = await promptInput(
    chalk.cyan("  Enter csrftoken: ")
  );

  if (!session || !csrf) {
    console.log("");
    console.log(chalk.red("  ✗ Both values are required."));
    return;
  }

  const spinner = ora("Verifying credentials...").start();

  try {
    saveSecrets(session, csrf);
    const viewer = await getViewer();
    spinner.succeed(
      chalk.green(`Logged in as ${chalk.bold(viewer.username)}`)
    );
    console.log(
      chalk.gray(
        `  Solved: ${viewer.solvedCount} | Ranking: ${viewer.ranking}`
      )
    );
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
    console.log(
      chalk.yellow(
        "  Check your LEETCODE_SESSION and csrftoken values. They may have expired."
      )
    );
  }
}
