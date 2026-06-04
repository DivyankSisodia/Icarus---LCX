import axios from "axios";
import type { JudgeResult, RunCodeInput } from "../../types/result";
import { createAuthenticatedClient, LEETCODE_BASE } from "./graphql";

const MAX_POLL_ATTEMPTS = 30;
const POLL_DELAY_MS = 1000;

export async function runCode(input: RunCodeInput): Promise<JudgeResult> {
  const client = createAuthenticatedClient();
  if (!client) {
    throw new Error("Not authenticated. Run `lcx login` first.");
  }

  const interpretUrl = `${LEETCODE_BASE}/problems/${input.questionSlug}/interpret_solution/`;

  const payload: Record<string, unknown> = {
    lang: input.language,
    question_id: input.questionId,
    typed_code: input.code,
    data_input: input.dataInput || "",
  };

  const response = await client.post<{ interpret_id: string; test_case: string }>(
    interpretUrl,
    payload,
    {
      headers: {
        Referer: `${LEETCODE_BASE}/problems/${input.questionSlug}/`,
        "Content-Type": "application/json",
      },
    }
  );

  const interpretId = response.data.interpret_id;
  if (!interpretId) {
    throw new Error("Failed to get interpret_id from LeetCode.");
  }

  return pollInterpretResult(interpretId, client);
}

async function pollInterpretResult(
  interpretId: string,
  client: ReturnType<typeof createAuthenticatedClient>
): Promise<JudgeResult> {
  if (!client) throw new Error("No client");

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));

    const checkUrl = `${LEETCODE_BASE}/submissions/detail/${interpretId}/check/`;
    const response = await client.get<InterpretCheckResponse>(checkUrl);

    const state = response.data.state;

    if (state === "PENDING" || state === "STARTED") {
      continue;
    }

    return mapInterpretResult(response.data);
  }

  return {
    status: "Pending",
    message: "Timed out waiting for judge result.",
  };
}

interface InterpretCheckResponse {
  state: string;
  status_code?: number;
  status_msg?: string;
  status_runtime?: string;
  status_memory?: string;
  run_success?: boolean;
  runtime_error?: string;
  compile_error?: string;
  full_compile_error?: string;
  total_correct?: number;
  total_testcases?: number;
  code_answer?: string[];
  expected_code_answer?: string[];
  code_output?: string[];
  std_output_list?: string[];
  submission_id?: string;
}

function mapInterpretResult(data: InterpretCheckResponse): JudgeResult {
  const statusMsg = data.status_msg || "";

  if (data.run_success === false && data.compile_error) {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error,
    };
  }

  if (data.run_success === false && data.runtime_error) {
    return {
      status: "Runtime Error",
      message: data.runtime_error,
      runtime: data.status_runtime,
      memory: data.status_memory,
    };
  }

  if (statusMsg === "Accepted") {
    return {
      status: "Accepted",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId: data.submission_id,
    };
  }

  if (statusMsg === "Wrong Answer") {
    return {
      status: "Wrong Answer",
      runtime: data.status_runtime,
      memory: data.status_memory,
      output: data.code_output?.join("\n"),
      expected: data.expected_code_answer?.join("\n"),
      submissionId: data.submission_id,
    };
  }

  if (statusMsg === "Runtime Error") {
    return {
      status: "Runtime Error",
      message: data.runtime_error || statusMsg,
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId: data.submission_id,
    };
  }

  if (statusMsg === "Time Limit Exceeded") {
    return {
      status: "Time Limit Exceeded",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId: data.submission_id,
    };
  }

  if (statusMsg === "Compile Error") {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error || statusMsg,
      submissionId: data.submission_id,
    };
  }

  return {
    status: "Unknown",
    message: statusMsg || data.state,
    runtime: data.status_runtime,
    memory: data.status_memory,
    submissionId: data.submission_id,
  };
}
