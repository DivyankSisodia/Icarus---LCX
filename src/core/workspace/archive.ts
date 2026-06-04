import fs from "fs-extra";
import path from "path";
import {
  getSolutionDir,
  getAcceptedSubmitPath,
  getAttemptsDir,
  generateTimestampFilename,
} from "./workspace";

export function saveAcceptedSubmit(
  slug: string,
  language: string,
  code: string
): string {
  const filePath = getAcceptedSubmitPath(slug, language);
  fs.writeFileSync(filePath, code);
  return filePath;
}

export function saveAttempt(
  slug: string,
  language: string,
  status: string,
  code: string
): string {
  const attemptsDir = getAttemptsDir(slug);
  fs.ensureDirSync(attemptsDir);
  const filename = generateTimestampFilename(status, language);
  const filePath = path.join(attemptsDir, filename);
  fs.writeFileSync(filePath, code);
  return filePath;
}

export function readSolutionFile(
  slug: string,
  language: string
): string | null {
  const solutionPath = path.join(
    getSolutionDir(slug),
    `solution.latest.${language}`
  );
  if (!fs.existsSync(solutionPath)) return null;
  return fs.readFileSync(solutionPath, "utf-8");
}
