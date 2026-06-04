import * as cp from "child_process";
import * as fs from "fs-extra";
import * as path from "path";

export function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

export function resolveCliPath(): string {
  const candidates = [
    path.resolve(__dirname, "..", "..", "dist", "index.js"),
    "/Users/divyanksisodia/lcx/dist/index.js",
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `LCX CLI executable not found. Checked: ${candidates.join(", ")}`
  );
}

export async function runCliJsonCommand(
  args: string[],
  cwd?: string
): Promise<unknown> {
  const cliPath = resolveCliPath();

  return await new Promise((resolve, reject) => {
    const child = cp.spawn("node", [cliPath, ...args], {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stripAnsi(stderr.trim()) ||
              `LCX command failed with exit code ${code ?? "unknown"}`
          )
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(
          new Error(
            `Failed to parse LCX JSON output: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    });
  });
}
