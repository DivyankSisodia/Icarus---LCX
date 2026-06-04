export type JudgeStatus =
  | "Accepted"
  | "Wrong Answer"
  | "Runtime Error"
  | "Time Limit Exceeded"
  | "Compilation Error"
  | "Pending"
  | "Unknown";

export interface JudgeResult {
  status: JudgeStatus;
  runtime?: string;
  memory?: string;
  input?: string;
  output?: string;
  expected?: string;
  message?: string;
  submissionId?: string;
}

export interface RunCodeInput {
  questionSlug: string;
  questionId: string;
  language: string;
  code: string;
  dataInput: string;
}

export interface SubmitCodeInput {
  questionSlug: string;
  questionId: string;
  language: string;
  code: string;
}
