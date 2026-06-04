import { graphqlQuery, graphqlQueryUnauthenticated } from "./graphql";
import type { ProblemSummary, ProblemDetails, ProblemFilters, CodeSnippet } from "../../types/problem";
import { getDb } from "../stats/db";
import { loadConfig } from "../config/config";
import { loadSecrets } from "../config/secrets";

const ALL_PROBLEMS_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        frontendQuestionId: questionFrontendId
        title
        titleSlug
        difficulty
        paidOnly: isPaidOnly
        topicTags {
          name
          slug
        }
        status
        hasSolution
        hasVideoSolution
      }
    }
  }
`;

const PROBLEM_DETAIL_QUERY = `
  query questionContent($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
      isPaidOnly
      topicTags {
        name
        slug
      }
      content
      hints
      likes
      dislikes
      similarQuestions
      exampleTestcases
      status
      codeSnippets {
        lang
        langSlug
        code
      }
    }
  }
`;

const SEARCH_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        frontendQuestionId: questionFrontendId
        title
        titleSlug
        difficulty
        paidOnly: isPaidOnly
        topicTags {
          name
          slug
        }
        status
      }
    }
  }
`;

export async function getProblems(filters?: ProblemFilters): Promise<ProblemSummary[]> {
  const checkAuth = tryAuthenticatedCall();

  const graphqlFilters: Record<string, unknown> = {};
  if (filters?.difficulty) {
    graphqlFilters.difficulty = filters.difficulty.toUpperCase();
  }
  if (filters?.tag) {
    graphqlFilters.tags = [filters.tag];
  }
  if (filters?.status) {
    graphqlFilters.status = filters.status.toUpperCase();
  }

  const limit = filters?.limit || 500;
  const skip = filters?.skip || 0;

  const data = await (checkAuth ? graphqlQuery : graphqlQueryUnauthenticated)<{
    problemsetQuestionList: {
      total: number;
      questions: Array<{
        frontendQuestionId: string;
        title: string;
        titleSlug: string;
        difficulty: string;
        paidOnly: boolean;
        topicTags: Array<{ name: string; slug: string }>;
        status: string | null;
      }>;
    };
  }>(ALL_PROBLEMS_QUERY, {
    categorySlug: "",
    limit,
    skip,
    filters: graphqlFilters,
  });

  const config = loadConfig();
  if (config.cacheProblems) {
    cacheProblems(data.problemsetQuestionList.questions);
  }

  return data.problemsetQuestionList.questions.map((q) => ({
    frontendId: q.frontendQuestionId,
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty as "Easy" | "Medium" | "Hard",
    paidOnly: q.paidOnly,
    topicTags: q.topicTags,
    status: q.status ? (q.status.toLowerCase() as "solved" | "unsolved") : undefined,
  }));
}

export async function searchProblems(query: string): Promise<ProblemSummary[]> {
  const checkAuth = tryAuthenticatedCall();

  const data = await (checkAuth ? graphqlQuery : graphqlQueryUnauthenticated)<{
    problemsetQuestionList: {
      total: number;
      questions: Array<{
        frontendQuestionId: string;
        title: string;
        titleSlug: string;
        difficulty: string;
        paidOnly: boolean;
        topicTags: Array<{ name: string; slug: string }>;
        status: string | null;
      }>;
    };
  }>(SEARCH_QUERY, {
    categorySlug: "",
    limit: 50,
    skip: 0,
    filters: { searchKeywords: query },
  });

  return data.problemsetQuestionList.questions.map((q) => ({
    frontendId: q.frontendQuestionId,
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty as "Easy" | "Medium" | "Hard",
    paidOnly: q.paidOnly,
    topicTags: q.topicTags,
    status: q.status ? (q.status.toLowerCase() as "solved" | "unsolved") : undefined,
  }));
}

export async function getProblem(slug: string): Promise<ProblemDetails> {
  const checkAuth = tryAuthenticatedCall();

  const data = await (checkAuth ? graphqlQuery : graphqlQueryUnauthenticated)<{
    question: {
      questionId: string;
      questionFrontendId: string;
      title: string;
      titleSlug: string;
      difficulty: string;
      isPaidOnly: boolean;
      topicTags: Array<{ name: string; slug: string }>;
      content: string;
      hints: string[];
      likes: number;
      dislikes: number;
      similarQuestions: string;
      exampleTestcases: string;
      status: string | null;
      codeSnippets: Array<{
        lang: string;
        langSlug: string;
        code: string;
      }>;
    };
  }>(PROBLEM_DETAIL_QUERY, { titleSlug: slug });

  const q = data.question;

  if (!q) {
    throw new Error(`Problem "${slug}" not found on LeetCode.`);
  }

  const config = loadConfig();
  if (config.cacheProblems && q.content) {
    cacheProblems([{
      frontendQuestionId: q.questionFrontendId,
      title: q.title,
      titleSlug: q.titleSlug,
      difficulty: q.difficulty,
      paidOnly: q.isPaidOnly,
      topicTags: q.topicTags,
      status: q.status,
    }]);
  }

  return {
    frontendId: q.questionFrontendId,
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty as "Easy" | "Medium" | "Hard",
    paidOnly: q.isPaidOnly,
    topicTags: q.topicTags,
    status: q.status ? (q.status.toLowerCase() as "solved" | "unsolved") : undefined,
    description: q.content || "",
    hints: q.hints || [],
    likes: q.likes,
    dislikes: q.dislikes,
    similarQuestions: q.similarQuestions ? JSON.parse(q.similarQuestions).map((sq: { title: string }) => sq.title) : [],
    exampleTestcases: q.exampleTestcases || "",
    content: q.content || "",
    codeSnippets: q.codeSnippets.map((s) => ({
      lang: s.lang,
      langSlug: s.langSlug,
      code: s.code,
    })),
  };
}

export async function resolveSlug(input: string): Promise<string> {
  if (!/^\d+$/.test(input)) return input;

  const db = getDb();
  const row = db
    .prepare("SELECT problem_slug FROM problem_cache WHERE frontend_id = ?")
    .get(input) as { problem_slug: string } | undefined;

  if (row) return row.problem_slug;

  await fetchAndCacheAll();
  const row2 = db
    .prepare("SELECT problem_slug FROM problem_cache WHERE frontend_id = ?")
    .get(input) as { problem_slug: string } | undefined;

  if (row2) return row2.problem_slug;
  throw new Error(`Problem #${input} not found. Try searching by name instead.`);
}

async function fetchAndCacheAll(): Promise<void> {
  const all = await getProblems({ limit: 500 });
  cacheProblems(
    all.map((p) => ({
      frontendQuestionId: p.frontendId,
      title: p.title,
      titleSlug: p.titleSlug,
      difficulty: p.difficulty,
      paidOnly: p.paidOnly,
      topicTags: p.topicTags,
      status: p.status || null,
    }))
  );
}

function tryAuthenticatedCall(): boolean {
  try {
    return !!loadSecrets();
  } catch {
    return false;
  }
}

function cacheProblems(questions: Array<{
  frontendQuestionId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  paidOnly: boolean;
  topicTags: Array<{ name: string; slug: string }>;
  status: string | null;
}>) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO problem_cache (problem_slug, title, difficulty, paid_only, tags, frontend_id, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items: typeof questions) => {
      for (const q of items) {
        stmt.run(
          q.titleSlug,
          q.title,
          q.difficulty,
          q.paidOnly ? 1 : 0,
          JSON.stringify(q.topicTags.map((t) => t.slug)),
          q.frontendQuestionId,
          new Date().toISOString()
        );
      }
    });
    insertMany(questions);
  } catch {
    // Silently fail caching — non-critical
  }
}
