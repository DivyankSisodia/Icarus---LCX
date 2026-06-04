import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { getProblem, resolveSlug } from "../../core/leetcode/problems";
import { openProblem } from "../../core/workspace/workspace";
import { loadConfig } from "../../core/config/config";

interface OpenOptions {
  language?: string;
  editor?: boolean;
}

export async function openCommand(
  slug: string,
  options: OpenOptions
): Promise<void> {
  if (!slug) {
    console.log(chalk.yellow("  Usage: lcx open <problem-slug>"));
    console.log(
      chalk.gray('  Example: lcx open two-sum')
    );
    return;
  }

  const displaySlug = /^\d+$/.test(slug) ? `#${slug}` : slug;
  const spinner = ora(
    `Opening problem "${displaySlug}"...`
  ).start();

  try {
    const resolvedSlug = await resolveSlug(slug);
    const problem = await getProblem(resolvedSlug);

    const config = loadConfig();
    const lang = options.language || config.defaultLanguage;

    const { dir, solutionPath } = openProblem(problem, lang);

    spinner.succeed(
      chalk.green(`Opened ${chalk.bold(problem.title)} (#${problem.frontendId})`)
    );

    console.log("");
    console.log(
      chalk.gray("  Difficulty: ") +
        (problem.difficulty === "Easy"
          ? chalk.green(problem.difficulty)
          : problem.difficulty === "Medium"
            ? chalk.yellow(problem.difficulty)
            : chalk.red(problem.difficulty))
    );
    if (problem.topicTags.length > 0) {
      console.log(
        chalk.gray("  Topics:     ") +
          chalk.white(
            problem.topicTags.map((t) => t.name).join(", ")
          )
      );
    }
    console.log(
      chalk.gray("  Workspace:  ") + chalk.white(dir)
    );
    console.log(
      chalk.gray("  Solution:   ") +
        chalk.white(solutionPath)
    );
    console.log("");

    const shouldOpen =
      options.editor !== false && config.autoOpenEditor;
    if (shouldOpen) {
      try {
        const editor = config.editorCommand;
        execSync(`${editor} "${solutionPath}"`, {
          stdio: "ignore",
        });
        console.log(
          chalk.gray(
            `  Opened with ${editor}. Happy coding!`
          )
        );
      } catch {
        console.log(
          chalk.gray(
            `  Could not open editor. File is at: ${solutionPath}`
          )
        );
      }
    }

    if (problem.paidOnly) {
      console.log(
        chalk.yellow(
          "  Note: This is a premium problem. Only the title/metadata is cached."
        )
      );
    }
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Failed to open problem: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}
