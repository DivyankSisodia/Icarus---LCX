export interface ProblemSummary {
  frontendId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  paidOnly: boolean;
  topicTags: Tag[];
  status?: "solved" | "unsolved" | "attempted";
}

export interface ProblemDetails extends ProblemSummary {
  description: string;
  hints: string[];
  likes: number;
  dislikes: number;
  similarQuestions: string[];
  codeSnippets: CodeSnippet[];
  exampleTestcases: string;
  content: string;
}

export interface Tag {
  name: string;
  slug: string;
}

export interface CodeSnippet {
  lang: string;
  langSlug: string;
  code: string;
}

export interface LeetCodeViewer {
  username: string;
  realName: string;
  avatar: string;
  solvedCount: number;
  totalCount: number;
  ranking: number;
}

export interface ProblemFilters {
  difficulty?: "easy" | "medium" | "hard";
  tag?: string;
  status?: "solved" | "unsolved";
  limit?: number;
  skip?: number;
}
