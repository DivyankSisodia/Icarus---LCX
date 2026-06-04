import chalk from "chalk";
import ora from "ora";
import { searchProblems } from "../../core/leetcode/problems";

interface SearchOptions {
  limit?: string;
}

export async function searchCommand(
  query: string,
  options: SearchOptions
): Promise<void> {
  if (!query) {
    console.log(
      chalk.yellow("  Usage: lcx search <query>")
    );
    console.log(
      chalk.gray('  Example: lcx search "binary tree"')
    );
    return;
  }

  const spinner = ora(
    `Searching for "${query}"...`
  ).start();

  try {
    const results = await searchProblems(query);
    spinner.succeed(
      `Found ${results.length} results for "${query}"`
    );

    const limit = parseInt(options.limit || "20", 10);
    const display = results
      .filter((p) => !p.paidOnly)
      .slice(0, limit);

    console.log("");
    console.log(
      chalk.bold.magenta("  LCX Search Results")
    );
    console.log(chalk.gray("  ────────────────────────────────────────────"));
    console.log("");

    if (display.length === 0) {
      console.log(chalk.gray("  No results found."));
    } else {
      for (const p of display) {
        const diffColor =
          p.difficulty === "Easy"
            ? chalk.green
            : p.difficulty === "Medium"
              ? chalk.yellow
              : chalk.red;

        console.log(
          `  ${chalk.white(p.frontendId.padStart(4))}. ${chalk.white(p.title.padEnd(40))} ${diffColor(p.difficulty.padEnd(8))} ${chalk.gray(p.titleSlug)}`
        );
      }
    }

    console.log("");
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}
