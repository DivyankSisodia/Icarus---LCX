import { getDb } from "./db";
import chalk from "chalk";

interface StatsData {
  totalAttempts: number;
  solvedCount: number;
  solvedByDifficulty: { Easy: number; Medium: number; Hard: number };
  acceptanceRate: string;
  mostAttempted: { slug: string; title: string; count: number }[];
  recentAccepted: { slug: string; title: string; solved_at: string }[];
}

export function getStats(): StatsData {
  const db = getDb();

  const totalAttempts = db
    .prepare("SELECT COUNT(*) as count FROM attempts")
    .get() as { count: number };

  const solvedCount = db
    .prepare("SELECT COUNT(*) as count FROM solved_problems")
    .get() as { count: number };

  const easyCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM solved_problems WHERE difficulty = 'Easy'"
    )
    .get() as { count: number };
  const mediumCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM solved_problems WHERE difficulty = 'Medium'"
    )
    .get() as { count: number };
  const hardCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM solved_problems WHERE difficulty = 'Hard'"
    )
    .get() as { count: number };

  const totalSubmits = db
    .prepare("SELECT COUNT(*) as count FROM attempts WHERE source = 'submit'")
    .get() as { count: number };
  const acceptedSubmits = db
    .prepare(
      "SELECT COUNT(*) as count FROM attempts WHERE source = 'submit' AND status = 'Accepted'"
    )
    .get() as { count: number };

  const acceptanceRate =
    totalSubmits.count > 0
      ? ((acceptedSubmits.count / totalSubmits.count) * 100).toFixed(1) + "%"
      : "N/A";

  const mostAttempted = db
    .prepare(
      `SELECT problem_slug, title, COUNT(*) as count
       FROM attempts
       GROUP BY problem_slug
       ORDER BY count DESC
       LIMIT 5`
    )
    .all() as { problem_slug: string; title: string; count: number }[];

  const recentAccepted = db
    .prepare(
      `SELECT problem_slug, title, solved_at
       FROM solved_problems
       ORDER BY solved_at DESC
       LIMIT 5`
    )
    .all() as { problem_slug: string; title: string; solved_at: string }[];

  return {
    totalAttempts: totalAttempts.count,
    solvedCount: solvedCount.count,
    solvedByDifficulty: {
      Easy: easyCount.count,
      Medium: mediumCount.count,
      Hard: hardCount.count,
    },
    acceptanceRate,
    mostAttempted: mostAttempted.map((r) => ({
      slug: r.problem_slug,
      title: r.title,
      count: r.count,
    })),
    recentAccepted: recentAccepted.map((r) => ({
      slug: r.problem_slug,
      title: r.title,
      solved_at: r.solved_at,
    })),
  };
}

export function printStats(): void {
  const stats = getStats();

  console.log("");
  console.log(chalk.bold.magenta("  LCX Statistics"));
  console.log(chalk.gray("  ─────────────────────────────"));
  console.log("");
  console.log(`  ${chalk.white("Total Attempts:")}      ${stats.totalAttempts}`);
  console.log(`  ${chalk.green("Problems Solved:")}      ${stats.solvedCount}`);
  console.log(
    `    ${chalk.cyan("Easy:")}   ${stats.solvedByDifficulty.Easy}  ` +
      `${chalk.yellow("Medium:")} ${stats.solvedByDifficulty.Medium}  ` +
      `${chalk.red("Hard:")}   ${stats.solvedByDifficulty.Hard}`
  );
  console.log(`  ${chalk.white("Acceptance Rate:")}     ${stats.acceptanceRate}`);
  console.log("");

  if (stats.mostAttempted.length > 0) {
    console.log(chalk.bold.white("  Most Attempted Problems:"));
    for (const p of stats.mostAttempted) {
      console.log(
        `    ${chalk.gray("•")} ${chalk.white(p.title)} ${chalk.gray(`(${p.slug})`)} - ${p.count} attempts`
      );
    }
    console.log("");
  }

  if (stats.recentAccepted.length > 0) {
    console.log(chalk.bold.white("  Recent Accepted:"));
    for (const p of stats.recentAccepted) {
      console.log(
        `    ${chalk.green("✓")} ${chalk.white(p.title)} ${chalk.gray(`(${p.slug})`)}`
      );
    }
    console.log("");
  }
}
