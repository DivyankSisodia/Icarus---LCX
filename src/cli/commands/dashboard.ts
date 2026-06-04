import chalk from "chalk";
import { loadSecrets } from "../../core/config/secrets";
import { getViewer } from "../../core/leetcode/auth";
import { getStats } from "../../core/stats/reports";

export async function dashboardCommand(): Promise<void> {
  console.log("");
  console.log(
    chalk.bold.magenta("  ╔══════════════════════════════════════════╗")
  );
  console.log(
    chalk.bold.magenta("  ║") +
      chalk.bold.white("        LCX — Terminal LeetCode Client        ") +
      chalk.bold.magenta("║")
  );
  console.log(
    chalk.bold.magenta("  ╚══════════════════════════════════════════╝")
  );
  console.log("");

  const secrets = loadSecrets();

  if (!secrets) {
    console.log(chalk.gray("  Status: ") + chalk.yellow("Not logged in"));
    console.log(
      chalk.gray("  Run ") +
        chalk.cyan("lcx login") +
        chalk.gray(" to authenticate with LeetCode.")
    );
  } else {
    try {
      const viewer = await getViewer();
      console.log(
        chalk.gray("  User:     ") + chalk.white(viewer.username)
      );
      console.log(
        chalk.gray("  Solved:   ") +
          chalk.green(String(viewer.solvedCount))
      );
      console.log(
        chalk.gray("  Ranking:  ") +
          chalk.yellow(`#${viewer.ranking.toLocaleString()}`)
      );
    } catch {
      console.log(
        chalk.gray("  User:     ") + chalk.red("Session expired")
      );
      console.log(
        chalk.gray("  Run ") +
          chalk.cyan("lcx login") +
          chalk.gray(" to re-authenticate.")
      );
    }
  }

  console.log("");

  const tabs = ["Dashboard", "Problems", "Daily", "Stats", "Config"];
  const tabStr = tabs
    .map((t, i) =>
      i === 0
        ? chalk.bgMagenta.black(` ${t} `)
        : chalk.gray(` ${t} `)
    )
    .join(chalk.gray("│"));
  console.log(`  ${tabStr}`);
  console.log(chalk.gray("  ────────────────────────────────────────────"));
  console.log("");

  try {
    const stats = getStats();
    if (stats.totalAttempts > 0) {
      console.log(
        chalk.white("  Local Stats: ") +
          chalk.green(`${stats.solvedCount} solved`) +
          chalk.gray(" | ") +
          chalk.white(`${stats.totalAttempts} attempts`) +
          chalk.gray(" | ") +
          chalk.yellow(`${stats.acceptanceRate} accept rate`)
      );
      console.log("");
    }
  } catch {
    // DB may not exist yet
  }

  console.log(chalk.bold.white("  Weak Topics (placeholder):"));
  console.log(
    chalk.gray("    • ") + chalk.white("Dynamic Programming")
  );
  console.log(
    chalk.gray("    • ") + chalk.white("Graphs")
  );
  console.log(
    chalk.gray("    • ") + chalk.white("Trees")
  );
  console.log("");

  console.log(chalk.bold.white("  Recommended Next (placeholder):"));
  console.log(
    chalk.gray("    • ") +
      chalk.white("877. Stone Game") +
      chalk.yellow(" (Medium)")
  );
  console.log(
    chalk.gray("    • ") +
      chalk.white("91. Decode Ways") +
      chalk.yellow(" (Medium)")
  );
  console.log(
    chalk.gray("    • ") +
      chalk.white("525. Contiguous Array") +
      chalk.yellow(" (Medium)")
  );
  console.log("");

  console.log(chalk.gray("  Commands:"));
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx problems") +
      chalk.gray("        Browse problems")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan('lcx search "query"') +
      chalk.gray("   Search problems")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx open <slug>") +
      chalk.gray("     Open a problem workspace")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx run") +
      chalk.gray("              Run code on LeetCode")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx submit") +
      chalk.gray("           Submit code to LeetCode")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx stats") +
      chalk.gray("            View your stats")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx companies") +
      chalk.gray("         Browse company workbook sheets")
  );
  console.log(
    chalk.gray("    ") +
      chalk.cyan("lcx config") +
      chalk.gray("           View/set configuration")
  );
  console.log("");
}
