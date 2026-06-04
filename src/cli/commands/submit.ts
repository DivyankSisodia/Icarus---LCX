import chalk from "chalk";
import ora from "ora";
import {
  detectCurrentProblem,
} from "../../core/workspace/workspace";
import {
  readSolutionFile,
  saveAcceptedSubmit,
  saveAttempt,
} from "../../core/workspace/archive";
import { submitCode } from "../../core/leetcode/submit";
import { recordAttempt, recordSolved } from "../../core/stats/attempts";
import { loadConfig } from "../../core/config/config";
import type { JudgeResult } from "../../types/result";

export async function submitCommand(): Promise<void> {
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

  console.log("");
  console.log(
    chalk.bold.magenta("  LCX Submit")
  );
  console.log(chalk.gray("  ─────────────────────────────"));
  console.log(
    chalk.gray(`  Problem:  ${metadata.title} (#${metadata.frontendId})`)
  );
  console.log(
    chalk.gray(`  Language: ${lang}`)
  );
  console.log("");

  const config = loadConfig();
  const spinner = ora("Submitting to LeetCode...").start();

  try {
    const result: JudgeResult = await submitCode({
      questionSlug: slug,
      questionId: metadata.frontendId,
      language: lang,
      code,
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
        source: "submit",
      });
    }

    if (result.status === "Accepted") {
      if (config.saveAcceptedSubmit) {
        const acceptedPath = saveAcceptedSubmit(slug, lang, code);
        console.log(
          chalk.gray(`  Saved: ${acceptedPath}`)
        );
      }

      const attemptPath = saveAttempt(slug, lang, "accepted", code);
      console.log(
        chalk.gray(`  Attempt saved: ${attemptPath}`)
      );

      recordSolved({
        problem_slug: slug,
        title: metadata.title,
        difficulty: metadata.difficulty,
        language: lang,
        local_solution_path: saveAcceptedSubmit(slug, lang, code),
        leetcode_submission_id: result.submissionId,
      });

      console.log("");
      console.log(
        chalk.green.bold("  ✓ Problem solved! Stats updated.")
      );
    } else {
      const statusLower = result.status
        .toLowerCase()
        .replace(/\s+/g, "-");
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
        `Submit failed: ${error instanceof Error ? error.message : "Unknown error"}`
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
  if (result.message) {
    console.log(chalk.gray("  ──────────────────────────"));
    console.log(chalk.red(`  ${result.message}`));
  }
  if (result.submissionId) {
    console.log(
      chalk.gray(
        `  Submission: https://leetcode.com/submissions/detail/${result.submissionId}/`
      )
    );
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
