import { Command } from "commander";
import { loginCommand } from "./commands/login";
import { problemsCommand } from "./commands/problems";
import { searchCommand } from "./commands/search";
import { openCommand } from "./commands/open";
import { runCommand } from "./commands/run";
import { submitCommand } from "./commands/submit";
import { statsCommand } from "./commands/stats";
import { configCommand } from "./commands/config";
import { startRepl } from "../tui/repl";

export function createRouter(): Command {
  const program = new Command();

  program
    .name("lcx")
    .description("LCX — LeetCode Terminal Client")
    .version("0.1.0");

  program.action(async () => {
    await startRepl();
  });

  program
    .command("login")
    .description("Authenticate with LeetCode using session cookies")
    .option("--force", "Skip browser auto-detection, go straight to manual input")
    .action(async (options) => {
      await loginCommand({ force: options.force });
    });

  program
    .command("problems")
    .description("Browse and filter LeetCode problems")
    .option("--difficulty <d>", "Filter by difficulty: easy, medium, hard")
    .option("--tag <tag>", "Filter by topic tag")
    .option("--status <s>", "Filter by status: solved, unsolved")
    .option("--limit <n>", "Limit the number of results")
    .action(async (options) => {
      await problemsCommand(options);
    });

  program
    .command("search <query>")
    .description("Search LeetCode problems by name or keyword")
    .option("--limit <n>", "Limit results", "20")
    .action(async (query: string, options) => {
      await searchCommand(query, options);
    });

  program
    .command("open <slug>")
    .description("Open a problem workspace")
    .option("--language <lang>", "Language for the solution template")
    .option("--no-editor", "Skip opening the editor")
    .action(async (slug: string, options) => {
      await openCommand(slug, options);
    });

  program
    .command("run")
    .description("Run code against LeetCode test cases")
    .option("--testcase <path>", "Path to custom test case file")
    .action(async (options) => {
      await runCommand(options);
    });

  program
    .command("submit")
    .description("Submit code to LeetCode for final judgment")
    .action(async () => {
      await submitCommand();
    });

  program
    .command("stats")
    .description("Show local stats from SQLite")
    .option("--topic <t>", "Filter by topic")
    .option("--difficulty <d>", "Filter by difficulty")
    .action((options) => {
      statsCommand(options);
    });

  program
    .command("config")
    .description("View or update configuration")
    .action(() => {
      configCommand({});
    });

  program
    .command("config:set <key> <value>")
    .description("Set a configuration value")
    .action((key: string, value: string) => {
      configCommand({ set: [key, value] });
    });

  return program;
}
