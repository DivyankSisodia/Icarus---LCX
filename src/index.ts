import { createRouter } from "./cli/router";
import { closeDb } from "./core/stats/db";

async function main(): Promise<void> {
  const program = createRouter();

  process.on("exit", () => {
    closeDb();
  });

  process.on("SIGINT", () => {
    closeDb();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    closeDb();
    process.exit(0);
  });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error("LCX Error:", error.message || error);
  process.exit(1);
});
