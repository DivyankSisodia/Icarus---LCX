import { z } from "zod";

export const LcxConfigSchema = z.object({
  workspacePath: z.string().default("~/LCX"),
  companyWorkbookPath: z.string().default(""),
  defaultLanguage: z.string().default("cpp"),
  theme: z.string().default("purple-terminal"),
  runTarget: z.enum(["leetcode"]).default("leetcode"),
  saveAttempts: z.boolean().default(true),
  saveAcceptedRun: z.boolean().default(true),
  saveAcceptedSubmit: z.boolean().default(true),
  autoOpenEditor: z.boolean().default(true),
  editorCommand: z.string().default("code"),
  cacheProblems: z.boolean().default(true),
});

export type LcxConfig = z.infer<typeof LcxConfigSchema>;

export const DEFAULT_CONFIG: LcxConfig = {
  workspacePath: "~/LCX",
  companyWorkbookPath: "",
  defaultLanguage: "cpp",
  theme: "purple-terminal",
  runTarget: "leetcode",
  saveAttempts: true,
  saveAcceptedRun: true,
  saveAcceptedSubmit: true,
  autoOpenEditor: true,
  editorCommand: "code",
  cacheProblems: true,
};

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  cpp: "cpp",
  java: "java",
  python: "py",
  python3: "py",
  javascript: "js",
  typescript: "ts",
  rust: "rs",
  go: "go",
  c: "c",
  csharp: "cs",
  ruby: "rb",
  swift: "swift",
  kotlin: "kt",
  scala: "scala",
  php: "php",
  dart: "dart",
  elixir: "ex",
  erlang: "erl",
  racket: "rkt",
};
