import type {
  LeetCodeViewer,
  ProblemSummary,
  ProblemDetails,
  ProblemFilters,
} from "../../types/problem";
import type {
  JudgeResult,
  RunCodeInput,
  SubmitCodeInput,
} from "../../types/result";

export interface LeetCodeClient {
  getViewer(): Promise<LeetCodeViewer>;
  getProblems(filters?: ProblemFilters): Promise<ProblemSummary[]>;
  searchProblems(query: string): Promise<ProblemSummary[]>;
  getProblem(slug: string): Promise<ProblemDetails>;

  runCode(input: RunCodeInput): Promise<JudgeResult>;
  submitCode(input: SubmitCodeInput): Promise<JudgeResult>;
}
