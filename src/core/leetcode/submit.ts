import axios from "axios";
import type { JudgeResult, SubmitCodeInput } from "../../types/result";
import { createAuthenticatedClient, LEETCODE_BASE } from "./graphql";

const MAX_POLL_ATTEMPTS = 60;
const POLL_DELAY_MS = 2000;

export async function submitCode(input: SubmitCodeInput): Promise<JudgeResult> {
  const client = createAuthenticatedClient();
  if (!client) {
    throw new Error("Not authenticated. Run `lcx login` first.");
  }

  const submitUrl = `${LEETCODE_BASE}/problems/${input.questionSlug}/submit/`;

  const response = await client.post<{ submission_id: number }>(
    submitUrl,
    {
      lang: input.language,
      question_id: input.questionId,
      typed_code: input.code,
    },
    {
      headers: {
        Referer: `${LEETCODE_BASE}/problems/${input.questionSlug}/`,
        "Content-Type": "application/json",
      },
    }
  );

  const submissionId = response.data.submission_id;
  if (!submissionId) {
    throw new Error("Failed to get submission_id from LeetCode.");
  }

  return pollSubmissionResult(String(submissionId), client);
}

async function pollSubmissionResult(
  submissionId: string,
  client: ReturnType<typeof createAuthenticatedClient>
): Promise<JudgeResult> {
  if (!client) throw new Error("No client");

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));

    const checkUrl = `${LEETCODE_BASE}/submissions/detail/${submissionId}/check/`;
    const response = await client.get<SubmissionCheckResponse>(checkUrl);

    const state = response.data.state;

    if (state === "PENDING" || state === "STARTED") {
      continue;
    }

    return mapSubmissionResult(response.data, submissionId);
  }

  return {
    status: "Pending",
    message: "Timed out waiting for submission result.",
  };
}

interface SubmissionCheckResponse {
  state: string;
  status_code?: number;
  status_msg?: string;
  status_runtime?: string;
  status_memory?: string;
  runtime_percentile?: number;
  memory_percentile?: number;
  run_success?: boolean;
  runtime_error?: string;
  compile_error?: string;
  full_compile_error?: string;
  total_correct?: number;
  total_testcases?: number;
  code_answer?: string[];
  expected_code_answer?: string[];
}

function mapSubmissionResult(
  data: SubmissionCheckResponse,
  submissionId: string
): JudgeResult {
  const statusMsg = data.status_msg || "";

  if (data.run_success === false && data.compile_error) {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error,
      submissionId,
    };
  }

  if (data.run_success === false && data.runtime_error) {
    return {
      status: "Runtime Error",
      message: data.runtime_error,
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId,
    };
  }

  if (statusMsg === "Accepted") {
    return {
      status: "Accepted",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId,
    };
  }

  if (statusMsg === "Wrong Answer") {
    return {
      status: "Wrong Answer",
      runtime: data.status_runtime,
      memory: data.status_memory,
      output: data.code_answer?.join("\n"),
      expected: data.expected_code_answer?.join("\n"),
      submissionId,
    };
  }

  if (statusMsg === "Runtime Error") {
    return {
      status: "Runtime Error",
      message: data.runtime_error || statusMsg,
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId,
    };
  }

  if (statusMsg === "Time Limit Exceeded") {
    return {
      status: "Time Limit Exceeded",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId,
    };
  }

  if (statusMsg === "Compile Error") {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error || statusMsg,
      submissionId,
    };
  }

  return {
    status: "Unknown",
    message: statusMsg || data.state,
    runtime: data.status_runtime,
    memory: data.status_memory,
    submissionId,
  };
}
