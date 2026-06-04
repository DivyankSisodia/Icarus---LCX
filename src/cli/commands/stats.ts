import { printStats } from "../../core/stats/reports";

interface StatsOptions {
  topic?: string;
  difficulty?: string;
}

export function statsCommand(options: StatsOptions): void {
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
