import chalk from "chalk";
import ora from "ora";
import {
  getCompanySheetDetail,
  getCompanyWorkbookSummary,
  resolveCompanyWorkbookPath,
} from "../../core/company/workbook";
import type {
  WorkbookQuestion,
  WorkbookSheetDetail,
  WorkbookSheetSummary,
  WorkbookSummary,
} from "../../types/company";

interface CompaniesOptions {
  file?: string;
  json?: boolean;
  limit?: string;
  all?: boolean;
}

function formatCountLabel(summary: WorkbookSheetSummary): string {
  if (summary.kind === "difficulty") {
    return `${summary.totalQuestions} questions`;
  }

  const companyLabel = `${summary.companyQuestions} company question${summary.companyQuestions === 1 ? "" : "s"}`;
  const dailyLabel =
    summary.dailyQuestions > 0
      ? ` + ${summary.dailyQuestions} daily question${summary.dailyQuestions === 1 ? "" : "s"}`
      : "";

  return `${companyLabel}${dailyLabel}`;
}

function printSummary(summary: WorkbookSummary): void {
  console.log("");
  console.log(chalk.bold.magenta("  LCX Company Workbook"));
  console.log(chalk.gray("  ────────────────────────────────────────────"));
  console.log(
    chalk.gray("  Workbook: ") + chalk.white(summary.workbookPath)
  );
  console.log(
    chalk.gray("  Sheets:   ") +
      chalk.white(String(summary.sheetCount)) +
      chalk.gray(" | ") +
      chalk.white(`${summary.companySheets.length} company`) +
      chalk.gray(" | ") +
      chalk.white(`${summary.difficultySheets.length} difficulty`)
  );
  console.log(
    chalk.gray("  Entries:  ") +
      chalk.white(String(summary.totalQuestions))
  );
  console.log("");

  for (const sheet of summary.sheets) {
    const label =
      sheet.kind === "difficulty"
        ? chalk.yellow(sheet.name)
        : chalk.cyan(sheet.name);
    console.log(
      `  ${label.padEnd(22)} ${chalk.white(formatCountLabel(sheet))}`
    );
  }
  console.log("");
}

function printDetail(detail: WorkbookSheetDetail, limit: number): void {
  console.log("");
  console.log(chalk.bold.magenta(`  ${detail.name}`));
  console.log(chalk.gray("  ────────────────────────────────────────────"));
  if (detail.kind === "difficulty") {
    console.log(
      chalk.gray("  Questions: ") +
        chalk.white(String(detail.totalQuestions)) +
        chalk.gray(" | ") +
        chalk.white("difficulty sheet")
    );
  } else {
    console.log(
      chalk.gray("  Questions: ") +
        chalk.white(String(detail.totalQuestions)) +
        chalk.gray(" | ") +
        chalk.white(`${detail.companyQuestions} company question${detail.companyQuestions === 1 ? "" : "s"}`) +
        (detail.dailyQuestions > 0
          ? chalk.gray(" | ") +
            chalk.white(
              `${detail.dailyQuestions} daily question${detail.dailyQuestions === 1 ? "" : "s"}`
            )
          : "")
    );
  }
  console.log("");

  const displayed = detail.questions.slice(0, limit);
  if (detail.questions.length === 0) {
    console.log(chalk.yellow("  No questions found in this sheet."));
    console.log("");
    return;
  }

  if (detail.questions.length > limit) {
    console.log(
      chalk.gray(`  Showing ${displayed.length} of ${detail.questions.length} questions`)
    );
    console.log("");
  }

  for (const question of displayed) {
    printQuestion(question, detail.kind);
  }

  console.log("");
}

function printQuestion(
  question: WorkbookQuestion,
  kind: WorkbookSheetSummary["kind"]
): void {
  const numberLabel = chalk.gray(`${String(question.rowNumber).padStart(4)}.`);
  const titleLabel = question.isDailyQuestion
    ? chalk.green(question.title)
    : chalk.white(question.title);
  const meta: string[] = [];

  if (kind === "difficulty" && question.topic) {
    meta.push(chalk.gray(question.topic));
  }
  if (question.difficulty) {
    meta.push(chalk.yellow(question.difficulty));
  }
  if (question.isDailyQuestion) {
    meta.push(chalk.green("daily"));
  }

  console.log(`  ${numberLabel} ${titleLabel}`);
  if (meta.length > 0) {
    console.log(`      ${meta.join(chalk.gray(" | "))}`);
  }
  console.log(`      ${chalk.gray(question.url)}`);
}

export function companiesCommand(
  companyName: string | undefined,
  options: CompaniesOptions
): void {
  const spinner = options.json ? null : ora("Loading workbook...").start();

  try {
    if (companyName) {
      const detail = getCompanySheetDetail(companyName, options.file);
      const limit = options.all
        ? Number.POSITIVE_INFINITY
        : Math.max(1, parseInt(options.limit || "", 10) || 50);

      spinner?.succeed(`Loaded ${detail.name}`);

      if (options.json) {
        const payload = {
          workbookPath: resolveCompanyWorkbookPath(options.file),
          sheet: detail,
        };
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      printDetail(detail, limit);
      return;
    }

    const summary = getCompanyWorkbookSummary(options.file);
    spinner?.succeed(`Loaded ${summary.sheetCount} sheets`);

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    printSummary(summary);
  } catch (error) {
    if (spinner) {
      spinner.fail(
        chalk.red(
          `Failed to load workbook: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
      return;
    }

    console.error(
      `Failed to load workbook: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exitCode = 1;
  }
}
