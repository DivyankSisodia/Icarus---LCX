import { getStats, printStats } from "../../core/stats/reports";

interface StatsOptions {
  topic?: string;
  difficulty?: string;
  json?: boolean;
}

export function statsCommand(options: StatsOptions): void {
  if (options.json) {
    console.log(JSON.stringify(getStats(), null, 2));
    return;
  }

  printStats();

  if (options.topic) {
    console.log(
      `  Topic filter: ${options.topic} (not yet implemented)`
    );
  }
  if (options.difficulty) {
    console.log(
      `  Difficulty filter: ${options.difficulty} (not yet implemented)`
    );
  }
}
