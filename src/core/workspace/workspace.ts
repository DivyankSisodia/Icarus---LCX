import fs from "fs-extra";
import path from "path";
import { getWorkspacePath, loadConfig } from "../config/config";
import { LANGUAGE_EXTENSIONS } from "../../types/config";
import type { ProblemDetails, CodeSnippet } from "../../types/problem";

interface ProblemMetadata {
  title: string;
  titleSlug: string;
  frontendId: string;
  difficulty: string;
  language: string;
  topicTags: string[];
  openedAt: string;
  lastModifiedAt: string;
}

export function getSolutionDir(slug: string): string {
  const wsPath = getWorkspacePath();
  return path.join(wsPath, "solutions", slug);
}

export function loadMetadata(slug: string): ProblemMetadata | null {
  const metaPath = path.join(getSolutionDir(slug), "metadata.json");
  if (!fs.existsSync(metaPath)) return null;
  return fs.readJsonSync(metaPath) as ProblemMetadata;
}

export function saveMetadata(slug: string, meta: ProblemMetadata): void {
  const dir = getSolutionDir(slug);
  fs.ensureDirSync(dir);
  fs.writeJsonSync(path.join(dir, "metadata.json"), meta, { spaces: 2 });
}

export function detectCurrentProblem(): { slug: string; metadata: ProblemMetadata } | null {
  let dir = fs.realpathSync(process.cwd());
  const wsRoot = fs.realpathSync(getWorkspacePath());

  while (dir.startsWith(wsRoot) || dir.toLowerCase().startsWith(wsRoot.toLowerCase())) {
    const metaPath = path.join(dir, "metadata.json");
    if (fs.existsSync(metaPath)) {
      const meta = fs.readJsonSync(metaPath) as ProblemMetadata;
      return { slug: path.basename(dir), metadata: meta };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

export function getLatestSolutionPath(slug: string, language: string): string {
  const dir = getSolutionDir(slug);
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  return path.join(dir, `solution.latest.${ext}`);
}

export function getAcceptedSubmitPath(slug: string, language: string): string {
  const dir = getSolutionDir(slug);
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  return path.join(dir, `solution.accepted-submit.${ext}`);
}

export function getAttemptsDir(slug: string): string {
  return path.join(getSolutionDir(slug), "attempts");
}

export function generateTimestampFilename(
  status: string,
  language: string
): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  const safeStatus = status.toLowerCase().replace(/\s+/g, "-");
  return `${ts}_${safeStatus}.${ext}`;
}

export function openProblem(
  problem: ProblemDetails,
  language?: string
): { dir: string; solutionPath: string } {
  const config = loadConfig();
  const lang = language || config.defaultLanguage;
  const dir = getSolutionDir(problem.titleSlug);
  const ext = LANGUAGE_EXTENSIONS[lang] || lang;

  fs.ensureDirSync(dir);
  fs.ensureDirSync(path.join(dir, "attempts"));

  const solutionPath = getLatestSolutionPath(problem.titleSlug, lang);

  const snippet = problem.codeSnippets.find(
    (s) => LANGUAGE_EXTENSIONS[s.langSlug] === ext
  );
  const starterCode = snippet?.code || `// ${problem.title}\n// LeetCode #${problem.frontendId}\n`;

  if (!fs.existsSync(solutionPath)) {
    fs.writeFileSync(solutionPath, starterCode);
  }

  const metadata: ProblemMetadata = {
    title: problem.title,
    titleSlug: problem.titleSlug,
    frontendId: problem.frontendId,
    difficulty: problem.difficulty,
    language: lang,
    topicTags: problem.topicTags.map((t) => t.slug),
    openedAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
  };

  saveMetadata(problem.titleSlug, metadata);
  fs.writeJsonSync(path.join(dir, "problem.json"), problem, { spaces: 2 });

  return { dir, solutionPath };
}
