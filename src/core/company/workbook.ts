import fs from "fs-extra";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import { expandPath, loadConfig } from "../config/config";
import type {
  WorkbookQuestion,
  WorkbookSheetDetail,
  WorkbookSheetKind,
  WorkbookSheetSummary,
  WorkbookSummary,
} from "../../types/company";

const DIFFICULTY_SHEETS = new Set(["easy", "medium", "hard"]);
const DEFAULT_WORKBOOK_BASENAME =
  "Leetcode problem set (company tag, sorted by freq).xlsx";
const WORKBOOK_NAME_HINTS = [
  "leetcode problem set",
  "company tag",
  "sorted by freq",
];

function normalizeSheetName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function isDifficultySheet(name: string): boolean {
  return DIFFICULTY_SHEETS.has(normalizeSheetName(name));
}

function slugToTitle(slug: string): string {
  if (!slug) {
    return "Unknown question";
  }

  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseLeetCodeUrl(url: string): Omit<
  WorkbookQuestion,
  "rowNumber" | "url" | "topic" | "difficulty" | "isDailyQuestion"
> & {
  envType?: string;
  envId?: string;
  favoriteSlug?: string;
} {
  const parsed = new URL(url);
  const slug = parsed.pathname.replace(/\/$/, "").split("/").pop() || url;

  return {
    slug,
    title: slugToTitle(slug),
    envType: parsed.searchParams.get("envType") || undefined,
    envId: parsed.searchParams.get("envId") || undefined,
    favoriteSlug: parsed.searchParams.get("favoriteSlug") || undefined,
  };
}

function parseTextCell(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function matchesWorkbookName(fileName: string): boolean {
  const normalized = fileName.toLowerCase();
  return (
    normalized.endsWith(".xlsx") &&
    WORKBOOK_NAME_HINTS.every((hint) => normalized.includes(hint))
  );
}

function searchDirectoryForWorkbook(
  directory: string,
  preferredName?: string
): string | null {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return null;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const lowerPreferredName = preferredName?.toLowerCase().trim();

  if (lowerPreferredName) {
    const preferredExact = entries.find(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase() === lowerPreferredName
    );
    if (preferredExact) {
      return path.join(directory, preferredExact.name);
    }

    if (!lowerPreferredName.endsWith(".xlsx")) {
      const preferredWithExtension = entries.find(
        (entry) =>
          entry.isFile() &&
          entry.name.toLowerCase() === `${lowerPreferredName}.xlsx`
      );
      if (preferredWithExtension) {
        return path.join(directory, preferredWithExtension.name);
      }
    }
  }

  const fuzzyMatch = entries.find(
    (entry) => entry.isFile() && matchesWorkbookName(entry.name)
  );
  if (fuzzyMatch) {
    return path.join(directory, fuzzyMatch.name);
  }

  return null;
}

function autoDetectWorkbookPath(preferredName?: string): string | null {
  const searchRoots = [
    path.join(os.homedir(), "Downloads"),
    os.homedir(),
    process.cwd(),
  ];

  for (const root of searchRoots) {
    const found = searchDirectoryForWorkbook(root, preferredName);
    if (found) {
      return found;
    }
  }

  return null;
}

function getConfiguredWorkbookPath(explicitPath?: string): string {
  const config = loadConfig();
  const sourcePath = explicitPath?.trim() || config.companyWorkbookPath.trim();

  if (sourcePath) {
    const resolved = expandPath(sourcePath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    const autoDetected = autoDetectWorkbookPath(path.basename(sourcePath));
    if (autoDetected) {
      return autoDetected;
    }
  } else {
    const autoDetected = autoDetectWorkbookPath(DEFAULT_WORKBOOK_BASENAME);
    if (autoDetected) {
      return autoDetected;
    }
  }

  throw new Error(
    "No company workbook configured or found automatically. Set `companyWorkbookPath` with `lcx config set companyWorkbookPath <path>` or pass `--file <path>`."
  );
}

function loadWorkbook(filePath: string): XLSX.WorkBook {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found: ${filePath}`);
  }

  return XLSX.readFile(filePath, {
    cellDates: false,
    cellText: false,
    cellStyles: false,
  });
}

function parseSheetRows(
  sheetName: string,
  rows: unknown[][]
): WorkbookQuestion[] {
  const questions: WorkbookQuestion[] = [];
  const difficultySheet = isDifficultySheet(sheetName);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const urlCell = difficultySheet ? row[2] : row[0];
    const url = parseTextCell(urlCell);
    if (!url || !url.startsWith("http")) {
      continue;
    }

    const parsedUrl = parseLeetCodeUrl(url);
    const question: WorkbookQuestion = {
      rowNumber: index + 1,
      url,
      slug: parsedUrl.slug,
      title: parsedUrl.title,
      isDailyQuestion: parsedUrl.envType === "daily-question",
      envType: parsedUrl.envType,
      envId: parsedUrl.envId,
      favoriteSlug: parsedUrl.favoriteSlug,
    };

    if (difficultySheet) {
      question.topic = parseTextCell(row[1]) || undefined;
      question.difficulty = parseTextCell(row[3]) || sheetName;
    }

    questions.push(question);
  }

  return questions;
}

function summarizeSheet(
  sheetName: string,
  questions: WorkbookQuestion[]
): WorkbookSheetSummary {
  const kind: WorkbookSheetKind = isDifficultySheet(sheetName)
    ? "difficulty"
    : "company";
  const dailyQuestions = questions.filter((question) => question.isDailyQuestion)
    .length;
  const companyQuestions = questions.length - dailyQuestions;

  return {
    name: sheetName,
    kind,
    totalQuestions: questions.length,
    companyQuestions,
    dailyQuestions,
  };
}

export function resolveCompanyWorkbookPath(explicitPath?: string): string {
  return getConfiguredWorkbookPath(explicitPath);
}

export function getCompanyWorkbookSummary(
  explicitPath?: string
): WorkbookSummary {
  const workbookPath = getConfiguredWorkbookPath(explicitPath);
  const workbook = loadWorkbook(workbookPath);
  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: true,
      defval: "",
    }) as unknown[][];
    const questions = parseSheetRows(sheetName, rows);

    return summarizeSheet(sheetName, questions);
  });

  const companySheets = sheets.filter((sheet) => sheet.kind === "company");
  const difficultySheets = sheets.filter((sheet) => sheet.kind === "difficulty");
  const totalQuestions = sheets.reduce((sum, sheet) => sum + sheet.totalQuestions, 0);

  return {
    workbookPath,
    sheetCount: sheets.length,
    totalQuestions,
    companySheets,
    difficultySheets,
    sheets,
  };
}

export function getCompanySheetDetail(
  sheetName: string,
  explicitPath?: string
): WorkbookSheetDetail {
  const workbookPath = getConfiguredWorkbookPath(explicitPath);
  const workbook = loadWorkbook(workbookPath);
  const resolvedSheetName = workbook.SheetNames.find(
    (candidate) =>
      normalizeSheetName(candidate) === normalizeSheetName(sheetName)
  );

  if (!resolvedSheetName) {
    const available = workbook.SheetNames.join(", ");
    throw new Error(
      `Sheet "${sheetName}" was not found in ${path.basename(workbookPath)}. Available sheets: ${available}`
    );
  }

  const worksheet = workbook.Sheets[resolvedSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: true,
    defval: "",
  }) as unknown[][];
  const questions = parseSheetRows(resolvedSheetName, rows);
  const summary = summarizeSheet(resolvedSheetName, questions);

  return {
    ...summary,
    questions,
  };
}
