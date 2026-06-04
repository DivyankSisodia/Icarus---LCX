import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import {
  detectCurrentProblem,
} from "../../core/workspace/workspace";
import {
  readSolutionFile,
  saveAttempt,
} from "../../core/workspace/archive";
import { runCode } from "../../core/leetcode/run";
import { recordAttempt } from "../../core/stats/attempts";
import { loadConfig } from "../../core/config/config";
import type { JudgeResult } from "../../types/result";

interface RunOptions {
  testcase?: string;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const detected = detectCurrentProblem();
  if (!detected) {
    console.log(
      chalk.red(
        "  ✗ No problem workspace found. Run `lcx open <slug>` first."
      )
    );
    console.log(
      chalk.gray(
        "  Or navigate to a problem directory under ~/LCX/solutions/<slug>/"
      )
    );
    return;
  }

  const { slug, metadata } = detected;
  const lang = metadata.language;
  const code = readSolutionFile(slug, lang);

  if (!code) {
    console.log(
      chalk.red(
        `  ✗ No solution file found for ${slug}.`
      )
    );
    return;
  }

  const config = loadConfig();
  const spinner = ora("Running code on LeetCode server...").start();

  try {
    let testInput = "";
    if (options.testcase && fs.existsSync(options.testcase)) {
      testInput = fs.readFileSync(options.testcase, "utf-8").trim();
    }

    const result: JudgeResult = await runCode({
      questionSlug: slug,
      questionId: metadata.frontendId,
      language: lang,
      code,
      dataInput: testInput,
    });

    spinner.stop();
    printJudgeResult(result);

    if (config.saveAttempts) {
      recordAttempt({
        problem_slug: slug,
        title: metadata.title,
        difficulty: metadata.difficulty,
        language: lang,
        status: result.status,
        runtime: result.runtime,
        memory: result.memory,
        source: "run",
      });
    }

    const statusLower = result.status.toLowerCase().replace(/\s+/g, "-");
    if (result.status === "Accepted" && config.saveAcceptedRun) {
      const attemptPath = saveAttempt(slug, lang, "accepted-run", code);
      console.log(
        chalk.gray(`  Attempt saved: ${attemptPath}`)
      );
    } else if (result.status !== "Accepted") {
      const attemptPath = saveAttempt(
        slug,
        lang,
        statusLower,
        code
      );
      console.log(
        chalk.gray(`  Attempt saved: ${attemptPath}`)
      );
    }
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Run failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}

function printJudgeResult(result: JudgeResult): void {
  console.log("");
  const icon =
    result.status === "Accepted"
      ? chalk.green("✓")
      : result.status === "Wrong Answer"
        ? chalk.red("✗")
        : result.status === "Runtime Error"
          ? chalk.red("⚡")
          : result.status === "Compilation Error"
            ? chalk.red("⚠")
            : result.status === "Time Limit Exceeded"
              ? chalk.yellow("⏱")
              : chalk.yellow("...");

  console.log(
    `  ${icon} Status:   ${chalk.bold(statusColor(result.status)(result.status))}`
  );

  if (result.runtime) {
    console.log(
      chalk.gray(`  Runtime:  ${result.runtime}`)
    );
  }
  if (result.memory) {
    console.log(
      chalk.gray(`  Memory:   ${result.memory}`)
    );
  }
  if (result.output) {
    console.log(chalk.gray("  ──────────────────────────"));
    console.log(chalk.gray("  Output:"));
    console.log(chalk.white(`  ${result.output}`));
  }
  if (result.expected && result.status === "Wrong Answer") {
    console.log(chalk.gray("  Expected:"));
    console.log(chalk.white(`  ${result.expected}`));
  }
  if (result.message) {
    console.log(chalk.gray("  ──────────────────────────"));
    console.log(chalk.red(`  ${result.message}`));
  }
  console.log("");
}

function statusColor(status: string): chalk.Chalk {
  switch (status) {
    case "Accepted":
      return chalk.green;
    case "Wrong Answer":
      return chalk.red;
    case "Runtime Error":
      return chalk.red;
    case "Compilation Error":
      return chalk.red;
    case "Time Limit Exceeded":
      return chalk.yellow;
    default:
      return chalk.white;
  }
}
