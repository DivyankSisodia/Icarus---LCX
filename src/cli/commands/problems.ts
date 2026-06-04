import chalk from "chalk";
import ora from "ora";
import { getProblems } from "../../core/leetcode/problems";
import type { ProblemFilters } from "../../types/problem";

interface ProblemsOptions {
  difficulty?: string;
  tag?: string;
  status?: string;
  limit?: string;
}

export async function problemsCommand(
  options: ProblemsOptions
): Promise<void> {
  const filters: ProblemFilters = { limit: 100 };

  if (
    options.difficulty &&
    ["easy", "medium", "hard"].includes(options.difficulty)
  ) {
    filters.difficulty = options.difficulty as "easy" | "medium" | "hard";
  }
  if (options.tag) {
    filters.tag = options.tag;
  }
  if (
    options.status &&
    ["solved", "unsolved"].includes(options.status)
  ) {
    filters.status = options.status as "solved" | "unsolved";
  }
  if (options.limit) {
    filters.limit = parseInt(options.limit, 10) || 100;
  }

  const spinner = ora("Fetching problems from LeetCode...").start();

  try {
    const problems = await getProblems(filters);
    spinner.succeed(`Found ${problems.length} problems`);

    const filtered = problems.filter((p) => !p.paidOnly);

    console.log("");
    console.log(
      chalk.bold.magenta("  LCX Problems")
    );
    console.log(chalk.gray("  ────────────────────────────────────────────"));
    console.log("");

    const filterLabels: string[] = [];
    if (filters.difficulty) filterLabels.push(filters.difficulty);
    if (filters.tag) filterLabels.push(filters.tag);
    if (filters.status) filterLabels.push(filters.status);
    if (filterLabels.length > 0) {
      console.log(
        chalk.gray("  Filters: ") +
          filterLabels.map((l) => chalk.cyan(l)).join(", ")
      );
      console.log("");
    }

    for (const p of filtered) {
      const diffColor =
        p.difficulty === "Easy"
          ? chalk.green
          : p.difficulty === "Medium"
            ? chalk.yellow
            : chalk.red;

      const statusIcon =
        p.status === "solved"
          ? chalk.green("✓")
          : p.status === "attempted"
            ? chalk.yellow("~")
            : chalk.gray("○");

      console.log(
        `  ${statusIcon} ${chalk.white(p.frontendId.padStart(4))}. ${chalk.white(p.title.padEnd(40))} ${diffColor(p.difficulty.padEnd(8))} ${chalk.gray(p.topicTags.slice(0, 3).map((t) => t.name).join(", "))}`
      );
    }

    console.log("");
    console.log(
      chalk.gray(
        `  Showing ${filtered.length} of ${problems.length} problems (paid-only filtered out)`
      )
    );
    console.log("");
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to fetch problems: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}
