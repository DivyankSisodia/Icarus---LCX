export type WorkbookSheetKind = "company" | "difficulty";

export interface WorkbookQuestion {
  rowNumber: number;
  url: string;
  slug: string;
  title: string;
  topic?: string;
  difficulty?: string;
  envType?: string;
  envId?: string;
  favoriteSlug?: string;
  isDailyQuestion: boolean;
}

export interface WorkbookSheetSummary {
  name: string;
  kind: WorkbookSheetKind;
  totalQuestions: number;
  companyQuestions: number;
  dailyQuestions: number;
}

export interface WorkbookSheetDetail extends WorkbookSheetSummary {
  questions: WorkbookQuestion[];
}

export interface WorkbookSummary {
  workbookPath: string;
  sheetCount: number;
  totalQuestions: number;
  companySheets: WorkbookSheetSummary[];
  difficultySheets: WorkbookSheetSummary[];
  sheets: WorkbookSheetSummary[];
}
