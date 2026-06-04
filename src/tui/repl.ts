import * as readline from "readline";
import chalk from "chalk";
import { printBanner } from "../tui/banner";
import { loadSecrets } from "../core/config/secrets";
import { getViewer } from "../core/leetcode/auth";
import { getProblems, searchProblems, getProblem, resolveSlug } from "../core/leetcode/problems";
import { openProblem, detectCurrentProblem } from "../core/workspace/workspace";
import { readSolutionFile, saveAttempt, saveAcceptedSubmit } from "../core/workspace/archive";
import { runCode } from "../core/leetcode/run";
import { submitCode } from "../core/leetcode/submit";
import { recordAttempt, recordSolved } from "../core/stats/attempts";
import { getStats } from "../core/stats/reports";
import { loadConfig, updateConfig } from "../core/config/config";
import { saveSecrets, clearSecrets } from "../core/config/secrets";
import { getDb } from "../core/stats/db";
import type { ProblemSummary } from "../types/problem";
import type { JudgeResult } from "../types/result";
import { LANGUAGE_EXTENSIONS } from "../types/config";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

let rl: readline.Interface | null = null;
let problemCache: ProblemSummary[] = [];
let lastDetectedProblem: { slug: string; title: string } | null = null;

const PURPLE = chalk.hex("#a855f7");
const DIM = chalk.hex("#71717a");

export async function startRepl(): Promise<void> {
  printBanner();

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PURPLE("lcx › "),
    terminal: true,
    historySize: 1000,
  });

  rl.prompt();

  rl.on("line", async (line: string) => {
    const input = line.trim();
    rl?.pause();

    try {
      if (!input) {
        await showDashboard();
      } else {
        await dispatch(input);
      }
    } catch (err) {
      console.log(chalk.red(`  Error: ${err instanceof Error ? err.message : err}`));
    }

    rl?.prompt();
  });

  rl.on("close", () => {
    console.log("");
    console.log(chalk.gray("  Stay strong, struggler."));
    process.exit(0);
  });

  await showDashboard();
}

async function dispatch(input: string): Promise<void> {
  const args = input.split(/\s+/);
  const cmd = args[0].toLowerCase();
  const rest = args.slice(1).join(" ");

  switch (cmd) {
    case "d":
    case "dashboard":
      await showDashboard();
      break;

    case "p":
    case "problems":
      await showProblems(rest);
      break;

    case "s":
    case "search":
      if (!rest) {
        console.log(chalk.yellow("  Usage: search <query>"));
        return;
      }
      await doSearch(rest);
      break;

    case "o":
    case "open":
      if (!rest) {
        console.log(chalk.yellow("  Usage: open <slug>"));
        return;
      }
      await doOpen(rest);
      break;

    case "r":
    case "run":
      await doRun();
      break;

    case "sub":
    case "submit":
      await doSubmit();
      break;

    case "st":
    case "stats":
      await doStats();
      break;

    case "c":
    case "config":
      if (rest) {
        await doConfigSet(rest);
      } else {
        await doConfig();
      }
      break;

    case "login":
      await doLogin();
      break;

    case "logout":
      clearSecrets();
      console.log(chalk.yellow("  Logged out."));
      break;

    case "cd":
      if (rest) {
        const detected = detectCurrentProblem();
        if (detected) {
          lastDetectedProblem = { slug: detected.slug, title: detected.metadata.title };
          console.log(PURPLE(`  Switched to: ${detected.metadata.title}`));
        } else {
          console.log(chalk.yellow("  Not in a problem workspace."));
        }
      }
      break;

    case "ls":
      await doListWorkspace();
      break;

    case "h":
    case "help":
      showHelp();
      break;

    case "q":
    case "quit":
    case "exit":
      rl?.close();
      break;

    case "clear":
      console.clear();
      break;

    default:
      console.log(chalk.yellow(`  Unknown command: ${cmd}`));
      console.log(DIM("  Type 'h' for help"));
  }
}

async function showDashboard(): Promise<void> {
  console.log("");
  console.log(chalk.bold.magenta("  ╔══ Dashboard ═══════════════════════════════════════╗"));
  console.log("");

  const secrets = loadSecrets();
  let solvedCount = 0;
  let username = "";

  if (secrets) {
    try {
      const viewer = await getViewer();
      username = viewer.username;
      solvedCount = viewer.solvedCount;
      console.log(
        `  ${PURPLE("User")}     ${chalk.white(username)}  ${chalk.green("●")} online`
      );
      console.log(
        `  ${PURPLE("Solved")}   ${chalk.green(String(solvedCount))}  ${chalk.gray("|")}  ${PURPLE("Rank")}  ${chalk.yellow(`#${viewer.ranking.toLocaleString()}`)}`
      );
    } catch {
      console.log(`  ${PURPLE("Status")}   ${chalk.red("Session expired — type 'login'")}`);
    }
  } else {
    console.log(`  ${PURPLE("Status")}   ${chalk.yellow("Not logged in — type 'login'")}`);
  }

  try {
    const stats = getStats();
    if (stats.totalAttempts > 0) {
      console.log(
        `  ${PURPLE("Local")}    ${chalk.green(`${stats.solvedCount} solved`)}  ${chalk.gray("|")}  ${stats.totalAttempts} attempts  ${chalk.gray("|")}  ${chalk.yellow(stats.acceptanceRate)} rate`
      );
    }
  } catch { /* no db yet */ }

  const detected = detectCurrentProblem();
  if (detected) {
    lastDetectedProblem = { slug: detected.slug, title: detected.metadata.title };
    console.log(
      `  ${PURPLE("Current")}  ${chalk.cyan(detected.metadata.title)} ${chalk.gray(`(#${detected.metadata.frontendId})`)} ${chalk.yellow(detected.metadata.difficulty)}`
    );
  }

  console.log("");
  console.log(chalk.bold.magenta("  ╚══════════════════════════════════════════════════════╝"));
  console.log("");

  if (problemCache.length === 0) {
    try {
      const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
      let i = 0;
      const interval = setInterval(() => {
        process.stdout.write(`\r  ${PURPLE(spinner[i % spinner.length])} Fetching problems...`);
        i++;
      }, 80);

      const problems = await getProblems({ limit: 30 });
      problemCache = problems.filter((p) => !p.paidOnly);
      clearInterval(interval);
      process.stdout.write("\r\x1b[K");
    } catch (err) {
      console.log(chalk.gray(`  Could not fetch problems: ${err instanceof Error ? err.message : err}`));
    }
  }

  if (problemCache.length > 0) {
    printProblemTable(problemCache.slice(0, 30));
  }

  console.log("");
  console.log(
    DIM("  d") +
      chalk.gray("/dashboard  ") +
      DIM("p") +
      chalk.gray("/problems  ") +
      DIM("s") +
      chalk.gray("/search  ") +
      DIM("o") +
      chalk.gray("/open  ") +
      DIM("r") +
      chalk.gray("/run  ") +
      DIM("sub") +
      chalk.gray("/submit  ") +
      DIM("q") +
      chalk.gray("/quit")
  );
  console.log("");
}

function printProblemTable(problems: ProblemSummary[]): void {
  console.log("");
  console.log(chalk.bold.white("  Problems"));
  console.log(chalk.gray("  ─────────────────────────────────────────────────────"));

  for (const p of problems) {
    const diffColor =
      p.difficulty === "Easy" ? chalk.green
      : p.difficulty === "Medium" ? chalk.yellow
      : chalk.red;

    const statusIcon =
      p.status === "solved" ? chalk.green("✓")
      : p.status === "attempted" ? chalk.yellow("~")
      : DIM("○");

    const tags = p.topicTags.slice(0, 3).map((t) => DIM(t.name)).join(" ");

    console.log(
      `  ${statusIcon} ${chalk.white(p.frontendId.padStart(4))}. ${chalk.white(p.title.padEnd(35))} ${diffColor(p.difficulty.padEnd(8))} ${tags}`
    );
  }
}

async function showProblems(args: string): Promise<void> {
  const filters = parseFilters(args);

  try {
    console.log(PURPLE("  Fetching..."));
    const problems = await getProblems({ ...filters, limit: 50 });
    problemCache = problems.filter((p) => !p.paidOnly);
    printProblemTable(problemCache);
    console.log("");
  } catch (err) {
    console.log(chalk.red(`  ${err instanceof Error ? err.message : err}`));
  }
}

function parseFilters(args: string): Record<string, string> {
  const parts = args.split(/\s+/);
  const filters: Record<string, string> = {};
  for (const part of parts) {
    if (["easy", "medium", "hard"].includes(part.toLowerCase())) {
      filters.difficulty = part.toLowerCase();
    } else if (["solved", "unsolved"].includes(part.toLowerCase())) {
      filters.status = part.toLowerCase();
    } else if (part.startsWith("tag:")) {
      filters.tag = part.slice(4);
    }
  }
  return filters;
}

async function doSearch(query: string): Promise<void> {
  try {
    console.log(PURPLE(`  Searching "${query}"...`));
    const results = await searchProblems(query);
    const filtered = results.filter((p) => !p.paidOnly).slice(0, 20);
    if (filtered.length === 0) {
      console.log(chalk.gray("  No results."));
    } else {
      printProblemTable(filtered);
    }
    console.log("");
  } catch (err) {
    console.log(chalk.red(`  ${err instanceof Error ? err.message : err}`));
  }
}

async function doOpen(input: string): Promise<void> {
  try {
    const resolved = await resolveSlug(input);
    console.log(PURPLE(`  Opening "${resolved}"...`));
    const problem = await getProblem(resolved);
    const config = loadConfig();
    const { dir, solutionPath } = openProblem(problem, config.defaultLanguage);

    lastDetectedProblem = { slug: problem.titleSlug, title: problem.title };

    console.log(
      chalk.green(`  ✓ ${problem.title} ${chalk.gray(`(#${problem.frontendId})`)} ${problem.difficulty === "Easy" ? chalk.green(problem.difficulty) : problem.difficulty === "Medium" ? chalk.yellow(problem.difficulty) : chalk.red(problem.difficulty)}`
    ));
    console.log(chalk.gray(`  ${dir}`));

    if (config.autoOpenEditor) {
      try {
        execSync(`${config.editorCommand} "${solutionPath}"`, { stdio: "ignore" });
        console.log(DIM(`  Opened in ${config.editorCommand}`));
      } catch { /* can't open editor */ }
    }
    console.log("");
  } catch (err) {
    console.log(chalk.red(`  ${err instanceof Error ? err.message : err}`));
  }
}

async function doRun(): Promise<void> {
  let slug: string;
  let title: string;
  let frontendId: string;
  let difficulty: string;
  let language: string;

  const detected = detectCurrentProblem();
  if (detected) {
    slug = detected.slug;
    title = detected.metadata.title;
    frontendId = detected.metadata.frontendId;
    difficulty = detected.metadata.difficulty;
    language = detected.metadata.language;
    lastDetectedProblem = { slug, title };
  } else if (lastDetectedProblem) {
    slug = lastDetectedProblem.slug;
    const metaPath = path.join(
      path.resolve(loadConfig().workspacePath.replace("~", require("os").homedir())),
      "solutions", slug, "metadata.json"
    );
    if (fs.existsSync(metaPath)) {
      const meta = fs.readJsonSync(metaPath);
      title = meta.title;
      frontendId = meta.frontendId;
      difficulty = meta.difficulty;
      language = meta.language;
    } else {
      console.log(chalk.yellow("  No workspace found. Use 'open <slug>' first."));
      return;
    }
  } else {
    console.log(chalk.yellow("  No workspace found. Use 'open <slug>' first."));
    return;
  }

  const code = readSolutionFile(slug, language);
  if (!code) {
    console.log(chalk.red(`  No solution file for ${slug}`));
    return;
  }

  const config = loadConfig();
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${PURPLE(spinner[i % spinner.length])} Running on LeetCode...`);
    i++;
  }, 80);

  try {
    const result: JudgeResult = await runCode({
      questionSlug: slug,
      questionId: frontendId,
      language,
      code,
      dataInput: "",
    });

    clearInterval(interval);
    process.stdout.write("\r\x1b[K");
    printJudgeResult(result);

    if (config.saveAttempts) {
      recordAttempt({ problem_slug: slug, title, difficulty, language, status: result.status, runtime: result.runtime, memory: result.memory, source: "run" });
    }

    const statusLower = result.status.toLowerCase().replace(/\s+/g, "-");
    if (result.status === "Accepted" && config.saveAcceptedRun) {
      const p = saveAttempt(slug, language, "accepted-run", code);
      console.log(DIM(`  Saved: ${p}`));
    } else if (result.status !== "Accepted") {
      const p = saveAttempt(slug, language, statusLower, code);
      console.log(DIM(`  Saved: ${p}`));
    }
    console.log("");
  } catch (err) {
    clearInterval(interval);
    process.stdout.write("\r\x1b[K");
    console.log(chalk.red(`  Run failed: ${err instanceof Error ? err.message : err}`));
  }
}

async function doSubmit(): Promise<void> {
  let slug: string;
  let title: string;
  let frontendId: string;
  let difficulty: string;
  let language: string;

  const detected = detectCurrentProblem();
  if (detected) {
    slug = detected.slug;
    title = detected.metadata.title;
    frontendId = detected.metadata.frontendId;
    difficulty = detected.metadata.difficulty;
    language = detected.metadata.language;
  } else if (lastDetectedProblem) {
    slug = lastDetectedProblem.slug;
    const metaPath = path.join(
      path.resolve(loadConfig().workspacePath.replace("~", require("os").homedir())),
      "solutions", slug, "metadata.json"
    );
    if (fs.existsSync(metaPath)) {
      const meta = fs.readJsonSync(metaPath);
      title = meta.title;
      frontendId = meta.frontendId;
      difficulty = meta.difficulty;
      language = meta.language;
    } else {
      console.log(chalk.yellow("  No workspace found. Use 'open <slug>' first."));
      return;
    }
  } else {
    console.log(chalk.yellow("  No workspace found. Use 'open <slug>' first."));
    return;
  }

  const code = readSolutionFile(slug, language);
  if (!code) {
    console.log(chalk.red(`  No solution file for ${slug}`));
    return;
  }

  console.log(PURPLE(`  Submitting ${title}...`));

  const config = loadConfig();
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${PURPLE(spinner[i % spinner.length])} Judging...`);
    i++;
  }, 80);

  try {
    const result: JudgeResult = await submitCode({
      questionSlug: slug,
      questionId: frontendId,
      language,
      code,
    });

    clearInterval(interval);
    process.stdout.write("\r\x1b[K");
    printJudgeResult(result);

    if (config.saveAttempts) {
      recordAttempt({ problem_slug: slug, title, difficulty, language, status: result.status, runtime: result.runtime, memory: result.memory, source: "submit" });
    }

    if (result.status === "Accepted") {
      if (config.saveAcceptedSubmit) {
        const p = saveAcceptedSubmit(slug, language, code);
        console.log(chalk.green(`  Saved: ${p}`));
      }
      const p = saveAttempt(slug, language, "accepted", code);
      console.log(DIM(`  Attempt: ${p}`));
      recordSolved({
        problem_slug: slug,
        title,
        difficulty,
        language,
        local_solution_path: saveAcceptedSubmit(slug, language, code),
        leetcode_submission_id: result.submissionId,
      });
      console.log(chalk.green.bold("  ✓ Accepted! Stats updated."));
    } else {
      const p = saveAttempt(slug, language, result.status.toLowerCase().replace(/\s+/g, "-"), code);
      console.log(DIM(`  Attempt: ${p}`));
    }
    console.log("");
  } catch (err) {
    clearInterval(interval);
    process.stdout.write("\r\x1b[K");
    console.log(chalk.red(`  Submit failed: ${err instanceof Error ? err.message : err}`));
  }
}

function printJudgeResult(result: JudgeResult): void {
  const icon = result.status === "Accepted" ? chalk.green("✓")
    : result.status === "Wrong Answer" ? chalk.red("✗")
    : result.status === "Runtime Error" ? chalk.red("⚡")
    : result.status === "Compilation Error" ? chalk.red("⚠")
    : result.status === "Time Limit Exceeded" ? chalk.yellow("⏱")
    : chalk.yellow("...");

  const statusColor = result.status === "Accepted" ? chalk.green
    : result.status.includes("Wrong") || result.status.includes("Error") ? chalk.red
    : chalk.yellow;

  console.log(`  ${icon} ${statusColor.bold(result.status)}  ${chalk.gray(result.runtime || "")}  ${chalk.gray(result.memory || "")}`);
  if (result.message) console.log(chalk.red(`  ${result.message}`));
  if (result.submissionId) console.log(DIM(`  https://leetcode.com/submissions/detail/${result.submissionId}/`));
}

async function doStats(): Promise<void> {
  try {
    const stats = getStats();
    console.log("");
    console.log(chalk.bold.magenta("  ╔══ Stats ═══════════════════════════════════╗"));
    console.log(`  ${chalk.white("Attempts")}    ${stats.totalAttempts}`);
    console.log(`  ${chalk.green("Solved")}      ${stats.solvedCount}  ${chalk.gray(`(${stats.solvedByDifficulty.Easy}E / ${stats.solvedByDifficulty.Medium}M / ${stats.solvedByDifficulty.Hard}H)`)}`);
    console.log(`  ${chalk.yellow("Accept Rate")} ${stats.acceptanceRate}`);
    if (stats.recentAccepted.length > 0) {
      console.log(`  ${chalk.white("Recent")}      ${stats.recentAccepted.slice(0, 3).map(r => r.title).join(", ")}`);
    }
    console.log(chalk.bold.magenta("  ╚══════════════════════════════════════════════╝"));
    console.log("");
  } catch (err) {
    console.log(chalk.yellow(`  No stats yet.`));
  }
}

async function doConfig(): Promise<void> {
  const config = loadConfig();
  const secrets = loadSecrets();
  console.log("");
  console.log(chalk.bold.magenta("  ╔══ Config ═══════════════════════════════════╗"));
  for (const [k, v] of Object.entries(config)) {
    console.log(`  ${chalk.white(k.padEnd(20))} ${chalk.cyan(String(v))}`);
  }
  console.log(`  ${chalk.white("authenticated".padEnd(20))} ${secrets ? chalk.green("yes") : chalk.red("no")}`);
  console.log(chalk.bold.magenta("  ╚══════════════════════════════════════════════╝"));
  console.log(DIM("  config set <key> <value>  to change"));
  console.log("");
}

async function doConfigSet(args: string): Promise<void> {
  const parts = args.split(/\s+/);
  if (parts.length < 2) {
    console.log(chalk.yellow("  Usage: config set <key> <value>"));
    return;
  }
  const [key, ...valueParts] = parts;
  const value = valueParts.join(" ");
  try {
    updateConfig(key as keyof ReturnType<typeof loadConfig>, value);
    console.log(chalk.green(`  ✓ ${key} = ${value}`));
  } catch (err) {
    console.log(chalk.red(`  ${err instanceof Error ? err.message : err}`));
  }
}

async function doLogin(): Promise<void> {
  const readline = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise(r => readline.question(q, (a: string) => { readline.close(); r(a.trim()); }));

  console.log("");
  console.log(chalk.yellow("  Enter your LeetCode session cookies:"));
  console.log(DIM("  (DevTools → Application → Cookies → leetcode.com)"));

  const readline2 = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  const ask2 = (q: string): Promise<string> => new Promise(r => readline2.question(q, (a: string) => r(a.trim())));

  const session = await ask2(PURPLE("  LEETCODE_SESSION: "));
  const csrf = await ask2(PURPLE("  csrftoken: "));
  readline2.close();

  if (!session || !csrf) {
    console.log(chalk.red("  Both required."));
    return;
  }

  saveSecrets(session, csrf);
  try {
    const viewer = await getViewer();
    console.log(chalk.green(`  ✓ Logged in as ${viewer.username} (${viewer.solvedCount} solved)`));
  } catch (err) {
    console.log(chalk.red(`  Verification failed: ${err instanceof Error ? err.message : err}`));
  }
}

async function doListWorkspace(): Promise<void> {
  const wsPath = loadConfig().workspacePath.replace("~", require("os").homedir());
  const solDir = path.join(path.resolve(wsPath), "solutions");
  if (!fs.existsSync(solDir)) {
    console.log(chalk.gray("  No solutions yet. Use 'open <slug>' to start."));
    return;
  }
  const dirs = fs.readdirSync(solDir).filter(d => {
    const p = path.join(solDir, d);
    return fs.statSync(p).isDirectory();
  });
  if (dirs.length === 0) {
    console.log(chalk.gray("  No solutions yet."));
    return;
  }
  console.log("");
  for (const d of dirs) {
    const metaPath = path.join(solDir, d, "metadata.json");
    if (fs.existsSync(metaPath)) {
      const meta = fs.readJsonSync(metaPath);
      const active = lastDetectedProblem?.slug === d ? chalk.green(" ▶") : "  ";
      console.log(`${active} ${chalk.white(meta.title.padEnd(30))} ${chalk.gray(`#${meta.frontendId}`)} ${meta.difficulty === "Easy" ? chalk.green(meta.difficulty) : meta.difficulty === "Medium" ? chalk.yellow(meta.difficulty) : chalk.red(meta.difficulty)}`);
    }
  }
  console.log("");
}

function showHelp(): void {
  console.log("");
  console.log(chalk.bold.magenta("  LCX Commands"));
  console.log(chalk.gray("  ────────────────────────────────────────────"));
  console.log(`  ${PURPLE("d")}  dashboard    Show dashboard + problems`);
  console.log(`  ${PURPLE("p")}  problems     List problems [easy|medium|hard] [solved|unsolved]`);
  console.log(`  ${PURPLE("s")}  search <q>   Search problems`);
  console.log(`  ${PURPLE("o")}  open <slug>  Open problem workspace`);
  console.log(`  ${PURPLE("r")}  run          Run code on LeetCode`);
  console.log(`  ${PURPLE("sub")} submit      Submit code to LeetCode`);
  console.log(`  ${PURPLE("st")} stats       Show your stats`);
  console.log(`  ${PURPLE("c")}  config      View config  |  config set <k> <v>`);
  console.log(`  ${PURPLE("login")}          Authenticate`);
  console.log(`  ${PURPLE("logout")}         Clear credentials`);
  console.log(`  ${PURPLE("ls")}            List local solutions`);
  console.log(`  ${PURPLE("clear")}         Clear screen`);
  console.log(`  ${PURPLE("q")}  quit        Exit LCX`);
  console.log("");
  console.log(DIM("  Enter an empty line to refresh the dashboard."));
  console.log("");
}
