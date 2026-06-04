#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli/router.ts
var import_commander = require("commander");

// src/cli/commands/login.ts
var import_chalk = __toESM(require("chalk"));
var import_ora = __toESM(require("ora"));

// src/core/config/secrets.ts
var import_fs_extra = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var SECRETS_DIR = import_path.default.join(import_os.default.homedir(), ".lcx");
var SECRETS_FILE = import_path.default.join(SECRETS_DIR, "secrets.json");
var cachedSecrets = null;
function loadSecrets() {
  if (cachedSecrets) return cachedSecrets;
  if (!import_fs_extra.default.existsSync(SECRETS_FILE)) return null;
  try {
    const raw = import_fs_extra.default.readJsonSync(SECRETS_FILE);
    if (raw.LEETCODE_SESSION && raw.csrftoken) {
      cachedSecrets = raw;
      return cachedSecrets;
    }
    return null;
  } catch {
    return null;
  }
}
function saveSecrets(session, csrf) {
  import_fs_extra.default.ensureDirSync(SECRETS_DIR);
  const secrets = {
    LEETCODE_SESSION: session,
    csrftoken: csrf
  };
  import_fs_extra.default.writeJsonSync(SECRETS_FILE, secrets, { spaces: 2 });
  cachedSecrets = secrets;
  console.warn(
    "[!] Secrets stored in plaintext at ~/.lcx/secrets.json. TODO: Replace with OS keychain (keytar) for secure storage."
  );
}
function clearSecrets() {
  if (import_fs_extra.default.existsSync(SECRETS_FILE)) {
    import_fs_extra.default.unlinkSync(SECRETS_FILE);
  }
  cachedSecrets = null;
}

// src/core/leetcode/graphql.ts
var import_axios = __toESM(require("axios"));
var LEETCODE_BASE = "https://leetcode.com";
var LEETCODE_API = `${LEETCODE_BASE}/graphql`;
function createAuthenticatedClient() {
  const secrets = loadSecrets();
  if (!secrets) return null;
  return import_axios.default.create({
    baseURL: LEETCODE_BASE,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      Cookie: `LEETCODE_SESSION=${secrets.LEETCODE_SESSION}; csrftoken=${secrets.csrftoken}`,
      "x-csrftoken": secrets.csrftoken,
      Referer: `${LEETCODE_BASE}/`,
      Origin: LEETCODE_BASE
    },
    timeout: 15e3
  });
}
async function graphqlQuery(query, variables = {}) {
  const client = createAuthenticatedClient();
  if (!client) {
    throw new Error(
      "Not authenticated. Run `lcx login` first to set your LeetCode session."
    );
  }
  const response = await client.post(
    LEETCODE_API,
    { query, variables },
    { headers: { "Content-Type": "application/json" } }
  );
  if (response.data.errors && response.data.errors.length > 0) {
    const messages = response.data.errors.map((e) => e.message || String(e)).join("; ");
    if (messages.includes("authentication") || messages.includes("session")) {
      throw new Error(
        "LeetCode session expired or invalid. Run `lcx login` to re-authenticate."
      );
    }
    throw new Error(`LeetCode API error: ${messages}`);
  }
  return response.data.data;
}
async function graphqlQueryUnauthenticated(query, variables = {}) {
  const response = await import_axios.default.post(
    LEETCODE_API,
    { query, variables },
    {
      headers: {
        "Content-Type": "application/json",
        Referer: LEETCODE_BASE,
        Origin: LEETCODE_BASE
      },
      timeout: 15e3
    }
  );
  if (response.data.errors && response.data.errors.length > 0) {
    const messages = response.data.errors.map((e) => e.message || String(e)).join("; ");
    throw new Error(`LeetCode API error: ${messages}`);
  }
  return response.data.data;
}

// src/core/leetcode/auth.ts
var GLOBAL_DATA_QUERY = `
  query globalData {
    userStatus {
      userId
      username
      realName
      avatar
      isSignedIn
    }
  }
`;
var USER_PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        realName
        userAvatar
        reputation
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;
async function getViewer() {
  try {
    const globalData = await graphqlQuery(GLOBAL_DATA_QUERY);
    if (!globalData.userStatus || !globalData.userStatus.isSignedIn) {
      throw new Error("Not signed in. Session may be invalid.");
    }
    const username = globalData.userStatus.username;
    let solvedCount = 0;
    let ranking = 0;
    try {
      const profileData = await graphqlQuery(USER_PROFILE_QUERY, { username });
      const matchedUser = profileData.matchedUser;
      if (matchedUser) {
        ranking = matchedUser.profile.ranking || 0;
        solvedCount = matchedUser.submitStats.acSubmissionNum.find(
          (s) => s.difficulty === "All"
        )?.count || 0;
      }
    } catch {
    }
    return {
      username: globalData.userStatus.username,
      realName: globalData.userStatus.realName || "",
      avatar: globalData.userStatus.avatar || "",
      solvedCount,
      totalCount: 0,
      ranking
    };
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("Not authenticated") || msg.includes("session")) throw error;
      throw new Error(`Login verification failed: ${msg}`);
    }
    throw new Error("Failed to fetch user profile. Check your session credentials.");
  }
}

// src/core/config/browser-cookies.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_child_process = require("child_process");
var import_crypto = __toESM(require("crypto"));
var import_fs = __toESM(require("fs"));
var import_os2 = __toESM(require("os"));
var import_path2 = __toESM(require("path"));
function getProfilePaths(browserDir) {
  const profiles = [];
  const base = import_path2.default.join(import_os2.default.homedir(), "Library/Application Support", browserDir);
  if (!import_fs.default.existsSync(base)) return profiles;
  const entries = import_fs.default.readdirSync(base);
  for (const entry of entries) {
    if (entry.startsWith("Profile ") || entry === "Default") {
      const cookiePath = import_path2.default.join(base, entry, "Cookies");
      if (import_fs.default.existsSync(cookiePath)) profiles.push(cookiePath);
    }
  }
  return profiles;
}
function getChromeProfilePaths() {
  return getProfilePaths("Google/Chrome");
}
var BROWSERS = [
  {
    name: "Chrome",
    keychainName: "Chrome",
    cookiePaths: getChromeProfilePaths()
  },
  {
    name: "Brave",
    keychainName: "Brave",
    cookiePaths: getProfilePaths("BraveSoftware/Brave-Browser")
  },
  {
    name: "Edge",
    keychainName: "Microsoft Edge",
    cookiePaths: getProfilePaths("Microsoft Edge")
  },
  {
    name: "Chromium",
    keychainName: "Chromium",
    cookiePaths: getProfilePaths("Chromium")
  }
];
function extractFromBrowsers() {
  for (const browser of BROWSERS) {
    for (const cookiePath of browser.cookiePaths) {
      if (!import_fs.default.existsSync(cookiePath)) continue;
      const result = tryExtractChromiumCookies(browser.name, browser.keychainName, cookiePath);
      if (result) return result;
    }
  }
  const firefoxResult = tryExtractFirefoxCookies();
  if (firefoxResult) return firefoxResult;
  return null;
}
function tryExtractChromiumCookies(browserName, keychainName, cookiePath) {
  const tempPath = `/tmp/lcx_cookies_${Date.now()}.sqlite`;
  try {
    import_fs.default.copyFileSync(cookiePath, tempPath);
    const encryptionKey = getChromiumKey(keychainName);
    if (!encryptionKey) return null;
    const db2 = new import_better_sqlite3.default(tempPath, { readonly: true });
    const rows = db2.prepare(
      `SELECT name, encrypted_value FROM cookies
         WHERE host_key LIKE '%leetcode.com'
         AND (name = 'LEETCODE_SESSION' OR name = 'csrftoken')`
    ).all();
    db2.close();
    if (rows.length < 2) return null;
    let leetcodeSession = "";
    let csrftoken = "";
    for (const row of rows) {
      const decrypted = decryptChromiumCookie(row.encrypted_value, encryptionKey);
      if (row.name === "LEETCODE_SESSION") leetcodeSession = decrypted;
      if (row.name === "csrftoken") csrftoken = decrypted;
    }
    if (leetcodeSession && csrftoken) {
      return { LEETCODE_SESSION: leetcodeSession, csrftoken, browser: browserName };
    }
    return null;
  } catch {
    return null;
  } finally {
    try {
      import_fs.default.unlinkSync(tempPath);
    } catch {
    }
  }
}
function getChromiumKey(browserName) {
  try {
    const raw = (0, import_child_process.execSync)(
      `security find-generic-password -wa '${browserName}' 2>/dev/null`,
      { encoding: "utf-8" }
    ).trim();
    if (!raw) return null;
    if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
      return Buffer.from(raw, "hex");
    }
    return Buffer.from(raw, "base64");
  } catch {
    return null;
  }
}
function decryptChromiumCookie(encryptedValue, key) {
  const prefix = "v10";
  const dataStr = encryptedValue.toString();
  if (!dataStr.startsWith(prefix)) {
    return dataStr;
  }
  const encryptedData = encryptedValue.subarray(prefix.length);
  const nonce = encryptedData.subarray(0, 12);
  const ciphertext = encryptedData.subarray(12, encryptedData.length - 16);
  const authTag = encryptedData.subarray(encryptedData.length - 16);
  const decipher = import_crypto.default.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  return decrypted.toString("utf-8");
}
function tryExtractFirefoxCookies() {
  const profilesDir = import_path2.default.join(
    import_os2.default.homedir(),
    "Library/Application Support/Firefox/Profiles"
  );
  if (!import_fs.default.existsSync(profilesDir)) return null;
  const profileDirs = import_fs.default.readdirSync(profilesDir).filter((d) => d.endsWith(".default-release") || d.endsWith(".default"));
  for (const profile of profileDirs) {
    const cookieDbPath = import_path2.default.join(profilesDir, profile, "cookies.sqlite");
    if (!import_fs.default.existsSync(cookieDbPath)) continue;
    const tempPath = `/tmp/lcx_firefox_cookies_${Date.now()}.sqlite`;
    try {
      import_fs.default.copyFileSync(cookieDbPath, tempPath);
      const db2 = new import_better_sqlite3.default(tempPath, { readonly: true });
      const rows = db2.prepare(
        `SELECT name, value FROM moz_cookies
           WHERE host LIKE '%leetcode.com'
           AND (name = 'LEETCODE_SESSION' OR name = 'csrftoken')`
      ).all();
      db2.close();
      if (rows.length < 2) return null;
      let leetcodeSession = "";
      let csrftoken = "";
      for (const row of rows) {
        if (row.name === "LEETCODE_SESSION") leetcodeSession = row.value;
        if (row.name === "csrftoken") csrftoken = row.value;
      }
      if (leetcodeSession && csrftoken) {
        return { LEETCODE_SESSION: leetcodeSession, csrftoken, browser: "Firefox" };
      }
      return null;
    } catch {
      return null;
    } finally {
      try {
        import_fs.default.unlinkSync(tempPath);
      } catch {
      }
    }
  }
  return null;
}

// src/cli/commands/login.ts
async function promptInput(message) {
  const readline2 = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    readline2.question(message, (answer) => {
      readline2.close();
      resolve(answer.trim());
    });
  });
}
async function loginCommand(options) {
  console.log("");
  console.log(import_chalk.default.bold.magenta("  LCX Login"));
  console.log(import_chalk.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log("");
  if (!options.force) {
    const spinner2 = (0, import_ora.default)("Scanning browsers for LeetCode cookies...").start();
    try {
      const extracted = extractFromBrowsers();
      if (extracted) {
        spinner2.succeed(
          import_chalk.default.gray(`Found credentials in ${extracted.browser}`)
        );
        saveSecrets(extracted.LEETCODE_SESSION, extracted.csrftoken);
        const verifySpinner = (0, import_ora.default)("Verifying credentials...").start();
        try {
          const viewer = await getViewer();
          verifySpinner.succeed(
            import_chalk.default.green(`Logged in as ${import_chalk.default.bold(viewer.username)}`)
          );
          console.log(
            import_chalk.default.gray(
              `  Solved: ${viewer.solvedCount} | Ranking: ${viewer.ranking}`
            )
          );
          console.log("");
          console.log(
            import_chalk.default.green("  \u2713 Auto-login successful \u2014 no manual token copying needed!")
          );
          console.log("");
          return;
        } catch (error) {
          verifySpinner.fail("Credentials from browser are invalid or expired.");
          console.log(
            import_chalk.default.gray("  The stored cookies may have expired. Falling back to manual input.")
          );
        }
      } else {
        spinner2.info("No LeetCode cookies found in browsers.");
      }
    } catch {
      spinner2.info("Could not scan browsers.");
    }
  }
  console.log(
    import_chalk.default.gray("  To get your session cookies:")
  );
  console.log("");
  console.log(
    import_chalk.default.white("  1. Log into leetcode.com in your browser")
  );
  console.log(
    import_chalk.default.white("  2. Open DevTools (F12) \u2192 Application \u2192 Cookies")
  );
  console.log(
    import_chalk.default.white("  3. Copy LEETCODE_SESSION and csrftoken")
  );
  console.log("");
  const session = await promptInput(
    import_chalk.default.cyan("  Enter LEETCODE_SESSION: ")
  );
  const csrf = await promptInput(
    import_chalk.default.cyan("  Enter csrftoken: ")
  );
  if (!session || !csrf) {
    console.log("");
    console.log(import_chalk.default.red("  \u2717 Both values are required."));
    return;
  }
  const spinner = (0, import_ora.default)("Verifying credentials...").start();
  try {
    saveSecrets(session, csrf);
    const viewer = await getViewer();
    spinner.succeed(
      import_chalk.default.green(`Logged in as ${import_chalk.default.bold(viewer.username)}`)
    );
    console.log(
      import_chalk.default.gray(
        `  Solved: ${viewer.solvedCount} | Ranking: ${viewer.ranking}`
      )
    );
  } catch (error) {
    spinner.fail(
      import_chalk.default.red(
        `Login failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
    console.log(
      import_chalk.default.yellow(
        "  Check your LEETCODE_SESSION and csrftoken values. They may have expired."
      )
    );
  }
}

// src/cli/commands/problems.ts
var import_chalk2 = __toESM(require("chalk"));
var import_ora2 = __toESM(require("ora"));

// src/core/stats/db.ts
var import_better_sqlite32 = __toESM(require("better-sqlite3"));
var import_path4 = __toESM(require("path"));

// src/core/config/config.ts
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_path3 = __toESM(require("path"));
var import_os3 = __toESM(require("os"));

// src/types/config.ts
var import_zod = require("zod");
var LcxConfigSchema = import_zod.z.object({
  workspacePath: import_zod.z.string().default("~/LCX"),
  companyWorkbookPath: import_zod.z.string().default(""),
  defaultLanguage: import_zod.z.string().default("cpp"),
  theme: import_zod.z.string().default("purple-terminal"),
  runTarget: import_zod.z.enum(["leetcode"]).default("leetcode"),
  saveAttempts: import_zod.z.boolean().default(true),
  saveAcceptedRun: import_zod.z.boolean().default(true),
  saveAcceptedSubmit: import_zod.z.boolean().default(true),
  autoOpenEditor: import_zod.z.boolean().default(true),
  editorCommand: import_zod.z.string().default("code"),
  cacheProblems: import_zod.z.boolean().default(true)
});
var DEFAULT_CONFIG = {
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
  cacheProblems: true
};
var LANGUAGE_EXTENSIONS = {
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
  racket: "rkt"
};

// src/core/config/config.ts
function expandPath(p) {
  let expanded = p;
  if (p.startsWith("~")) {
    expanded = import_path3.default.join(import_os3.default.homedir(), p.slice(1));
  }
  expanded = import_path3.default.resolve(expanded);
  try {
    return import_fs_extra2.default.realpathSync(expanded);
  } catch {
    return expanded;
  }
}
function configFilePath() {
  const workspacePath = expandPath(
    process.env.LCX_WORKSPACE || DEFAULT_CONFIG.workspacePath
  );
  return import_path3.default.join(workspacePath, "config.json");
}
function loadConfig() {
  const filePath = configFilePath();
  if (!import_fs_extra2.default.existsSync(filePath)) {
    import_fs_extra2.default.ensureDirSync(import_path3.default.dirname(filePath));
    import_fs_extra2.default.writeJsonSync(filePath, DEFAULT_CONFIG, { spaces: 2 });
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = import_fs_extra2.default.readJsonSync(filePath);
    const parsed = LcxConfigSchema.parse(raw);
    return parsed;
  } catch {
    import_fs_extra2.default.writeJsonSync(filePath, DEFAULT_CONFIG, { spaces: 2 });
    return { ...DEFAULT_CONFIG };
  }
}
function saveConfig(config) {
  const filePath = configFilePath();
  import_fs_extra2.default.ensureDirSync(import_path3.default.dirname(filePath));
  import_fs_extra2.default.writeJsonSync(filePath, config, { spaces: 2 });
}
function updateConfig(key, value) {
  const config = loadConfig();
  const schema = LcxConfigSchema.shape[key];
  if (!schema) {
    throw new Error(`Unknown config key: ${key}`);
  }
  let parsedValue = value;
  if (typeof value === "string") {
    if (value === "true") parsedValue = true;
    else if (value === "false") parsedValue = false;
  }
  config[key] = parsedValue;
  const validated = LcxConfigSchema.parse(config);
  saveConfig(validated);
  return validated;
}
function getWorkspacePath() {
  const config = loadConfig();
  return expandPath(config.workspacePath);
}

// src/core/stats/db.ts
var import_fs_extra3 = __toESM(require("fs-extra"));
var db = null;
function getDb() {
  if (db) return db;
  const workspacePath = getWorkspacePath();
  import_fs_extra3.default.ensureDirSync(workspacePath);
  const dbPath = import_path4.default.join(workspacePath, "lcx.sqlite");
  db = new import_better_sqlite32.default(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_slug TEXT NOT NULL,
      title TEXT,
      difficulty TEXT,
      language TEXT,
      status TEXT NOT NULL,
      runtime TEXT,
      memory TEXT,
      source TEXT NOT NULL,
      local_file_path TEXT,
      attempted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS solved_problems (
      problem_slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT,
      language TEXT,
      solved_at TEXT NOT NULL,
      local_solution_path TEXT,
      leetcode_submission_id TEXT
    );

    CREATE TABLE IF NOT EXISTS problem_cache (
      problem_slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      difficulty TEXT,
      paid_only INTEGER DEFAULT 0,
      tags TEXT,
      frontend_id TEXT,
      cached_at TEXT NOT NULL
    );
  `);
  return db;
}
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// src/core/leetcode/problems.ts
var ALL_PROBLEMS_QUERY = `
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
var PROBLEM_DETAIL_QUERY = `
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
var SEARCH_QUERY = `
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
async function getProblems(filters) {
  const checkAuth = tryAuthenticatedCall();
  const graphqlFilters = {};
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
  const data = await (checkAuth ? graphqlQuery : graphqlQueryUnauthenticated)(ALL_PROBLEMS_QUERY, {
    categorySlug: "",
    limit,
    skip,
    filters: graphqlFilters
  });
  const config = loadConfig();
  if (config.cacheProblems) {
    cacheProblems(data.problemsetQuestionList.questions);
  }
  return data.problemsetQuestionList.questions.map((q) => ({
    frontendId: q.frontendQuestionId,
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty,
    paidOnly: q.paidOnly,
    topicTags: q.topicTags,
    status: q.status ? q.status.toLowerCase() : void 0
  }));
}
async function searchProblems(query) {
  const checkAuth = tryAuthenticatedCall();
  const data = await (checkAuth ? graphqlQuery : graphqlQueryUnauthenticated)(SEARCH_QUERY, {
    categorySlug: "",
    limit: 50,
    skip: 0,
    filters: { searchKeywords: query }
  });
  return data.problemsetQuestionList.questions.map((q) => ({
    frontendId: q.frontendQuestionId,
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty,
    paidOnly: q.paidOnly,
    topicTags: q.topicTags,
    status: q.status ? q.status.toLowerCase() : void 0
  }));
}
async function getProblem(slug) {
  const checkAuth = tryAuthenticatedCall();
  const data = await (checkAuth ? graphqlQuery : graphqlQueryUnauthenticated)(PROBLEM_DETAIL_QUERY, { titleSlug: slug });
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
      status: q.status
    }]);
  }
  return {
    frontendId: q.questionFrontendId,
    title: q.title,
    titleSlug: q.titleSlug,
    difficulty: q.difficulty,
    paidOnly: q.isPaidOnly,
    topicTags: q.topicTags,
    status: q.status ? q.status.toLowerCase() : void 0,
    description: q.content || "",
    hints: q.hints || [],
    likes: q.likes,
    dislikes: q.dislikes,
    similarQuestions: q.similarQuestions ? JSON.parse(q.similarQuestions).map((sq) => sq.title) : [],
    exampleTestcases: q.exampleTestcases || "",
    content: q.content || "",
    codeSnippets: q.codeSnippets.map((s) => ({
      lang: s.lang,
      langSlug: s.langSlug,
      code: s.code
    }))
  };
}
async function resolveSlug(input) {
  if (!/^\d+$/.test(input)) return input;
  const db2 = getDb();
  const row = db2.prepare("SELECT problem_slug FROM problem_cache WHERE frontend_id = ?").get(input);
  if (row) return row.problem_slug;
  await fetchAndCacheAll();
  const row2 = db2.prepare("SELECT problem_slug FROM problem_cache WHERE frontend_id = ?").get(input);
  if (row2) return row2.problem_slug;
  throw new Error(`Problem #${input} not found. Try searching by name instead.`);
}
async function fetchAndCacheAll() {
  const all = await getProblems({ limit: 500 });
  cacheProblems(
    all.map((p) => ({
      frontendQuestionId: p.frontendId,
      title: p.title,
      titleSlug: p.titleSlug,
      difficulty: p.difficulty,
      paidOnly: p.paidOnly,
      topicTags: p.topicTags,
      status: p.status || null
    }))
  );
}
function tryAuthenticatedCall() {
  try {
    return !!loadSecrets();
  } catch {
    return false;
  }
}
function cacheProblems(questions) {
  try {
    const db2 = getDb();
    const stmt = db2.prepare(`
      INSERT OR REPLACE INTO problem_cache (problem_slug, title, difficulty, paid_only, tags, frontend_id, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db2.transaction((items) => {
      for (const q of items) {
        stmt.run(
          q.titleSlug,
          q.title,
          q.difficulty,
          q.paidOnly ? 1 : 0,
          JSON.stringify(q.topicTags.map((t) => t.slug)),
          q.frontendQuestionId,
          (/* @__PURE__ */ new Date()).toISOString()
        );
      }
    });
    insertMany(questions);
  } catch {
  }
}

// src/cli/commands/problems.ts
async function problemsCommand(options) {
  const filters = { limit: 100 };
  if (options.difficulty && ["easy", "medium", "hard"].includes(options.difficulty)) {
    filters.difficulty = options.difficulty;
  }
  if (options.tag) {
    filters.tag = options.tag;
  }
  if (options.status && ["solved", "unsolved"].includes(options.status)) {
    filters.status = options.status;
  }
  if (options.limit) {
    filters.limit = parseInt(options.limit, 10) || 100;
  }
  const spinner = (0, import_ora2.default)("Fetching problems from LeetCode...").start();
  try {
    const problems = await getProblems(filters);
    spinner.succeed(`Found ${problems.length} problems`);
    const filtered = problems.filter((p) => !p.paidOnly);
    console.log("");
    console.log(
      import_chalk2.default.bold.magenta("  LCX Problems")
    );
    console.log(import_chalk2.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
    console.log("");
    const filterLabels = [];
    if (filters.difficulty) filterLabels.push(filters.difficulty);
    if (filters.tag) filterLabels.push(filters.tag);
    if (filters.status) filterLabels.push(filters.status);
    if (filterLabels.length > 0) {
      console.log(
        import_chalk2.default.gray("  Filters: ") + filterLabels.map((l) => import_chalk2.default.cyan(l)).join(", ")
      );
      console.log("");
    }
    for (const p of filtered) {
      const diffColor = p.difficulty === "Easy" ? import_chalk2.default.green : p.difficulty === "Medium" ? import_chalk2.default.yellow : import_chalk2.default.red;
      const statusIcon = p.status === "solved" ? import_chalk2.default.green("\u2713") : p.status === "attempted" ? import_chalk2.default.yellow("~") : import_chalk2.default.gray("\u25CB");
      console.log(
        `  ${statusIcon} ${import_chalk2.default.white(p.frontendId.padStart(4))}. ${import_chalk2.default.white(p.title.padEnd(40))} ${diffColor(p.difficulty.padEnd(8))} ${import_chalk2.default.gray(p.topicTags.slice(0, 3).map((t) => t.name).join(", "))}`
      );
    }
    console.log("");
    console.log(
      import_chalk2.default.gray(
        `  Showing ${filtered.length} of ${problems.length} problems (paid-only filtered out)`
      )
    );
    console.log("");
  } catch (error) {
    spinner.fail(
      import_chalk2.default.red(
        `Failed to fetch problems: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}

// src/cli/commands/search.ts
var import_chalk3 = __toESM(require("chalk"));
var import_ora3 = __toESM(require("ora"));
async function searchCommand(query, options) {
  if (!query) {
    console.log(
      import_chalk3.default.yellow("  Usage: lcx search <query>")
    );
    console.log(
      import_chalk3.default.gray('  Example: lcx search "binary tree"')
    );
    return;
  }
  const spinner = (0, import_ora3.default)(
    `Searching for "${query}"...`
  ).start();
  try {
    const results = await searchProblems(query);
    spinner.succeed(
      `Found ${results.length} results for "${query}"`
    );
    const limit = parseInt(options.limit || "20", 10);
    const display = results.filter((p) => !p.paidOnly).slice(0, limit);
    console.log("");
    console.log(
      import_chalk3.default.bold.magenta("  LCX Search Results")
    );
    console.log(import_chalk3.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
    console.log("");
    if (display.length === 0) {
      console.log(import_chalk3.default.gray("  No results found."));
    } else {
      for (const p of display) {
        const diffColor = p.difficulty === "Easy" ? import_chalk3.default.green : p.difficulty === "Medium" ? import_chalk3.default.yellow : import_chalk3.default.red;
        console.log(
          `  ${import_chalk3.default.white(p.frontendId.padStart(4))}. ${import_chalk3.default.white(p.title.padEnd(40))} ${diffColor(p.difficulty.padEnd(8))} ${import_chalk3.default.gray(p.titleSlug)}`
        );
      }
    }
    console.log("");
  } catch (error) {
    spinner.fail(
      import_chalk3.default.red(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}

// src/cli/commands/open.ts
var import_chalk4 = __toESM(require("chalk"));
var import_ora4 = __toESM(require("ora"));
var import_child_process2 = require("child_process");

// src/core/workspace/workspace.ts
var import_fs_extra4 = __toESM(require("fs-extra"));
var import_path5 = __toESM(require("path"));
function getSolutionDir(slug) {
  const wsPath = getWorkspacePath();
  return import_path5.default.join(wsPath, "solutions", slug);
}
function saveMetadata(slug, meta) {
  const dir = getSolutionDir(slug);
  import_fs_extra4.default.ensureDirSync(dir);
  import_fs_extra4.default.writeJsonSync(import_path5.default.join(dir, "metadata.json"), meta, { spaces: 2 });
}
function detectCurrentProblem() {
  let dir = import_fs_extra4.default.realpathSync(process.cwd());
  const wsRoot = import_fs_extra4.default.realpathSync(getWorkspacePath());
  while (dir.startsWith(wsRoot) || dir.toLowerCase().startsWith(wsRoot.toLowerCase())) {
    const metaPath = import_path5.default.join(dir, "metadata.json");
    if (import_fs_extra4.default.existsSync(metaPath)) {
      const meta = import_fs_extra4.default.readJsonSync(metaPath);
      return { slug: import_path5.default.basename(dir), metadata: meta };
    }
    const parent = import_path5.default.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function getLatestSolutionPath(slug, language) {
  const dir = getSolutionDir(slug);
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  return import_path5.default.join(dir, `solution.latest.${ext}`);
}
function getAcceptedSubmitPath(slug, language) {
  const dir = getSolutionDir(slug);
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  return import_path5.default.join(dir, `solution.accepted-submit.${ext}`);
}
function getAttemptsDir(slug) {
  return import_path5.default.join(getSolutionDir(slug), "attempts");
}
function generateTimestampFilename(status, language) {
  const now = /* @__PURE__ */ new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const ext = LANGUAGE_EXTENSIONS[language] || language;
  const safeStatus = status.toLowerCase().replace(/\s+/g, "-");
  return `${ts}_${safeStatus}.${ext}`;
}
function openProblem(problem, language) {
  const config = loadConfig();
  const lang = language || config.defaultLanguage;
  const dir = getSolutionDir(problem.titleSlug);
  const ext = LANGUAGE_EXTENSIONS[lang] || lang;
  import_fs_extra4.default.ensureDirSync(dir);
  import_fs_extra4.default.ensureDirSync(import_path5.default.join(dir, "attempts"));
  const solutionPath = getLatestSolutionPath(problem.titleSlug, lang);
  const snippet = problem.codeSnippets.find(
    (s) => LANGUAGE_EXTENSIONS[s.langSlug] === ext
  );
  const starterCode = snippet?.code || `// ${problem.title}
// LeetCode #${problem.frontendId}
`;
  if (!import_fs_extra4.default.existsSync(solutionPath)) {
    import_fs_extra4.default.writeFileSync(solutionPath, starterCode);
  }
  const metadata = {
    title: problem.title,
    titleSlug: problem.titleSlug,
    frontendId: problem.frontendId,
    difficulty: problem.difficulty,
    language: lang,
    topicTags: problem.topicTags.map((t) => t.slug),
    openedAt: (/* @__PURE__ */ new Date()).toISOString(),
    lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveMetadata(problem.titleSlug, metadata);
  import_fs_extra4.default.writeJsonSync(import_path5.default.join(dir, "problem.json"), problem, { spaces: 2 });
  return { dir, solutionPath };
}

// src/cli/commands/open.ts
async function openCommand(slug, options) {
  if (!slug) {
    console.log(import_chalk4.default.yellow("  Usage: lcx open <problem-slug>"));
    console.log(
      import_chalk4.default.gray("  Example: lcx open two-sum")
    );
    return;
  }
  const displaySlug = /^\d+$/.test(slug) ? `#${slug}` : slug;
  const spinner = options.json ? null : (0, import_ora4.default)(`Opening problem "${displaySlug}"...`).start();
  try {
    const resolvedSlug = await resolveSlug(slug);
    const problem = await getProblem(resolvedSlug);
    const config = loadConfig();
    const lang = options.language || config.defaultLanguage;
    const { dir, solutionPath } = openProblem(problem, lang);
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            title: problem.title,
            titleSlug: problem.titleSlug,
            frontendId: problem.frontendId,
            difficulty: problem.difficulty,
            dir,
            solutionPath,
            paidOnly: problem.paidOnly
          },
          null,
          2
        )
      );
      return;
    }
    spinner?.succeed(
      import_chalk4.default.green(`Opened ${import_chalk4.default.bold(problem.title)} (#${problem.frontendId})`)
    );
    console.log("");
    console.log(
      import_chalk4.default.gray("  Difficulty: ") + (problem.difficulty === "Easy" ? import_chalk4.default.green(problem.difficulty) : problem.difficulty === "Medium" ? import_chalk4.default.yellow(problem.difficulty) : import_chalk4.default.red(problem.difficulty))
    );
    if (problem.topicTags.length > 0) {
      console.log(
        import_chalk4.default.gray("  Topics:     ") + import_chalk4.default.white(
          problem.topicTags.map((t) => t.name).join(", ")
        )
      );
    }
    console.log(
      import_chalk4.default.gray("  Workspace:  ") + import_chalk4.default.white(dir)
    );
    console.log(
      import_chalk4.default.gray("  Solution:   ") + import_chalk4.default.white(solutionPath)
    );
    console.log("");
    const shouldOpen = options.editor !== false && config.autoOpenEditor;
    if (shouldOpen) {
      try {
        const editor = config.editorCommand;
        (0, import_child_process2.execSync)(`${editor} "${solutionPath}"`, {
          stdio: "ignore"
        });
        console.log(
          import_chalk4.default.gray(
            `  Opened with ${editor}. Happy coding!`
          )
        );
      } catch {
        console.log(
          import_chalk4.default.gray(
            `  Could not open editor. File is at: ${solutionPath}`
          )
        );
      }
    }
    if (problem.paidOnly) {
      console.log(
        import_chalk4.default.yellow(
          "  Note: This is a premium problem. Only the title/metadata is cached."
        )
      );
    }
  } catch (error) {
    if (spinner) {
      spinner.fail(
        import_chalk4.default.red(
          `Failed to open problem: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
      return;
    }
    console.error(
      `Failed to open problem: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exitCode = 1;
  }
}

// src/cli/commands/run.ts
var import_chalk5 = __toESM(require("chalk"));
var import_ora5 = __toESM(require("ora"));
var import_fs_extra6 = __toESM(require("fs-extra"));

// src/core/workspace/archive.ts
var import_fs_extra5 = __toESM(require("fs-extra"));
var import_path6 = __toESM(require("path"));
function saveAcceptedSubmit(slug, language, code) {
  const filePath = getAcceptedSubmitPath(slug, language);
  import_fs_extra5.default.writeFileSync(filePath, code);
  return filePath;
}
function saveAttempt(slug, language, status, code) {
  const attemptsDir = getAttemptsDir(slug);
  import_fs_extra5.default.ensureDirSync(attemptsDir);
  const filename = generateTimestampFilename(status, language);
  const filePath = import_path6.default.join(attemptsDir, filename);
  import_fs_extra5.default.writeFileSync(filePath, code);
  return filePath;
}
function readSolutionFile(slug, language) {
  const solutionPath = import_path6.default.join(
    getSolutionDir(slug),
    `solution.latest.${language}`
  );
  if (!import_fs_extra5.default.existsSync(solutionPath)) return null;
  return import_fs_extra5.default.readFileSync(solutionPath, "utf-8");
}

// src/core/leetcode/run.ts
var MAX_POLL_ATTEMPTS = 30;
var POLL_DELAY_MS = 1e3;
async function runCode(input) {
  const client = createAuthenticatedClient();
  if (!client) {
    throw new Error("Not authenticated. Run `lcx login` first.");
  }
  const interpretUrl = `${LEETCODE_BASE}/problems/${input.questionSlug}/interpret_solution/`;
  const payload = {
    lang: input.language,
    question_id: input.questionId,
    typed_code: input.code,
    data_input: input.dataInput || ""
  };
  const response = await client.post(
    interpretUrl,
    payload,
    {
      headers: {
        Referer: `${LEETCODE_BASE}/problems/${input.questionSlug}/`,
        "Content-Type": "application/json"
      }
    }
  );
  const interpretId = response.data.interpret_id;
  if (!interpretId) {
    throw new Error("Failed to get interpret_id from LeetCode.");
  }
  return pollInterpretResult(interpretId, client);
}
async function pollInterpretResult(interpretId, client) {
  if (!client) throw new Error("No client");
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    const checkUrl = `${LEETCODE_BASE}/submissions/detail/${interpretId}/check/`;
    const response = await client.get(checkUrl);
    const state = response.data.state;
    if (state === "PENDING" || state === "STARTED") {
      continue;
    }
    return mapInterpretResult(response.data);
  }
  return {
    status: "Pending",
    message: "Timed out waiting for judge result."
  };
}
function mapInterpretResult(data) {
  const statusMsg = data.status_msg || "";
  if (data.run_success === false && data.compile_error) {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error
    };
  }
  if (data.run_success === false && data.runtime_error) {
    return {
      status: "Runtime Error",
      message: data.runtime_error,
      runtime: data.status_runtime,
      memory: data.status_memory
    };
  }
  if (statusMsg === "Accepted") {
    return {
      status: "Accepted",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId: data.submission_id
    };
  }
  if (statusMsg === "Wrong Answer") {
    return {
      status: "Wrong Answer",
      runtime: data.status_runtime,
      memory: data.status_memory,
      output: data.code_output?.join("\n"),
      expected: data.expected_code_answer?.join("\n"),
      submissionId: data.submission_id
    };
  }
  if (statusMsg === "Runtime Error") {
    return {
      status: "Runtime Error",
      message: data.runtime_error || statusMsg,
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId: data.submission_id
    };
  }
  if (statusMsg === "Time Limit Exceeded") {
    return {
      status: "Time Limit Exceeded",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId: data.submission_id
    };
  }
  if (statusMsg === "Compile Error") {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error || statusMsg,
      submissionId: data.submission_id
    };
  }
  return {
    status: "Unknown",
    message: statusMsg || data.state,
    runtime: data.status_runtime,
    memory: data.status_memory,
    submissionId: data.submission_id
  };
}

// src/core/stats/attempts.ts
function recordAttempt(record) {
  const db2 = getDb();
  const stmt = db2.prepare(`
    INSERT INTO attempts (problem_slug, title, difficulty, language, status, runtime, memory, source, local_file_path, attempted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.problem_slug,
    record.title || null,
    record.difficulty || null,
    record.language,
    record.status,
    record.runtime || null,
    record.memory || null,
    record.source,
    record.local_file_path || null,
    (/* @__PURE__ */ new Date()).toISOString()
  );
}
function recordSolved(record) {
  const db2 = getDb();
  const stmt = db2.prepare(`
    INSERT OR REPLACE INTO solved_problems (problem_slug, title, difficulty, language, solved_at, local_solution_path, leetcode_submission_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.problem_slug,
    record.title,
    record.difficulty || null,
    record.language,
    (/* @__PURE__ */ new Date()).toISOString(),
    record.local_solution_path || null,
    record.leetcode_submission_id || null
  );
}

// src/cli/commands/run.ts
async function runCommand(options) {
  const detected = detectCurrentProblem();
  if (!detected) {
    console.log(
      import_chalk5.default.red(
        "  \u2717 No problem workspace found. Run `lcx open <slug>` first."
      )
    );
    console.log(
      import_chalk5.default.gray(
        "  Or navigate to a problem directory under ~/LCX/solutions/<slug>/"
      )
    );
    return;
  }
  const { slug, metadata } = detected;
  const lang = metadata.language;
  const code = readSolutionFile(slug, lang);
  if (!code) {
    console.log(
      import_chalk5.default.red(
        `  \u2717 No solution file found for ${slug}.`
      )
    );
    return;
  }
  const config = loadConfig();
  const spinner = (0, import_ora5.default)("Running code on LeetCode server...").start();
  try {
    let testInput = "";
    if (options.testcase && import_fs_extra6.default.existsSync(options.testcase)) {
      testInput = import_fs_extra6.default.readFileSync(options.testcase, "utf-8").trim();
    }
    const result = await runCode({
      questionSlug: slug,
      questionId: metadata.frontendId,
      language: lang,
      code,
      dataInput: testInput
    });
    spinner.stop();
    printJudgeResult(result);
    if (config.saveAttempts) {
      recordAttempt({
        problem_slug: slug,
        title: metadata.title,
        difficulty: metadata.difficulty,
        language: lang,
        status: result.status,
        runtime: result.runtime,
        memory: result.memory,
        source: "run"
      });
    }
    const statusLower = result.status.toLowerCase().replace(/\s+/g, "-");
    if (result.status === "Accepted" && config.saveAcceptedRun) {
      const attemptPath = saveAttempt(slug, lang, "accepted-run", code);
      console.log(
        import_chalk5.default.gray(`  Attempt saved: ${attemptPath}`)
      );
    } else if (result.status !== "Accepted") {
      const attemptPath = saveAttempt(
        slug,
        lang,
        statusLower,
        code
      );
      console.log(
        import_chalk5.default.gray(`  Attempt saved: ${attemptPath}`)
      );
    }
  } catch (error) {
    spinner.fail(
      import_chalk5.default.red(
        `Run failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}
function printJudgeResult(result) {
  console.log("");
  const icon = result.status === "Accepted" ? import_chalk5.default.green("\u2713") : result.status === "Wrong Answer" ? import_chalk5.default.red("\u2717") : result.status === "Runtime Error" ? import_chalk5.default.red("\u26A1") : result.status === "Compilation Error" ? import_chalk5.default.red("\u26A0") : result.status === "Time Limit Exceeded" ? import_chalk5.default.yellow("\u23F1") : import_chalk5.default.yellow("...");
  console.log(
    `  ${icon} Status:   ${import_chalk5.default.bold(statusColor(result.status)(result.status))}`
  );
  if (result.runtime) {
    console.log(
      import_chalk5.default.gray(`  Runtime:  ${result.runtime}`)
    );
  }
  if (result.memory) {
    console.log(
      import_chalk5.default.gray(`  Memory:   ${result.memory}`)
    );
  }
  if (result.output) {
    console.log(import_chalk5.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
    console.log(import_chalk5.default.gray("  Output:"));
    console.log(import_chalk5.default.white(`  ${result.output}`));
  }
  if (result.expected && result.status === "Wrong Answer") {
    console.log(import_chalk5.default.gray("  Expected:"));
    console.log(import_chalk5.default.white(`  ${result.expected}`));
  }
  if (result.message) {
    console.log(import_chalk5.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
    console.log(import_chalk5.default.red(`  ${result.message}`));
  }
  console.log("");
}
function statusColor(status) {
  switch (status) {
    case "Accepted":
      return import_chalk5.default.green;
    case "Wrong Answer":
      return import_chalk5.default.red;
    case "Runtime Error":
      return import_chalk5.default.red;
    case "Compilation Error":
      return import_chalk5.default.red;
    case "Time Limit Exceeded":
      return import_chalk5.default.yellow;
    default:
      return import_chalk5.default.white;
  }
}

// src/cli/commands/submit.ts
var import_chalk6 = __toESM(require("chalk"));
var import_ora6 = __toESM(require("ora"));

// src/core/leetcode/submit.ts
var MAX_POLL_ATTEMPTS2 = 60;
var POLL_DELAY_MS2 = 2e3;
async function submitCode(input) {
  const client = createAuthenticatedClient();
  if (!client) {
    throw new Error("Not authenticated. Run `lcx login` first.");
  }
  const submitUrl = `${LEETCODE_BASE}/problems/${input.questionSlug}/submit/`;
  const response = await client.post(
    submitUrl,
    {
      lang: input.language,
      question_id: input.questionId,
      typed_code: input.code
    },
    {
      headers: {
        Referer: `${LEETCODE_BASE}/problems/${input.questionSlug}/`,
        "Content-Type": "application/json"
      }
    }
  );
  const submissionId = response.data.submission_id;
  if (!submissionId) {
    throw new Error("Failed to get submission_id from LeetCode.");
  }
  return pollSubmissionResult(String(submissionId), client);
}
async function pollSubmissionResult(submissionId, client) {
  if (!client) throw new Error("No client");
  for (let i = 0; i < MAX_POLL_ATTEMPTS2; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS2));
    const checkUrl = `${LEETCODE_BASE}/submissions/detail/${submissionId}/check/`;
    const response = await client.get(checkUrl);
    const state = response.data.state;
    if (state === "PENDING" || state === "STARTED") {
      continue;
    }
    return mapSubmissionResult(response.data, submissionId);
  }
  return {
    status: "Pending",
    message: "Timed out waiting for submission result."
  };
}
function mapSubmissionResult(data, submissionId) {
  const statusMsg = data.status_msg || "";
  if (data.run_success === false && data.compile_error) {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error,
      submissionId
    };
  }
  if (data.run_success === false && data.runtime_error) {
    return {
      status: "Runtime Error",
      message: data.runtime_error,
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId
    };
  }
  if (statusMsg === "Accepted") {
    return {
      status: "Accepted",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId
    };
  }
  if (statusMsg === "Wrong Answer") {
    return {
      status: "Wrong Answer",
      runtime: data.status_runtime,
      memory: data.status_memory,
      output: data.code_answer?.join("\n"),
      expected: data.expected_code_answer?.join("\n"),
      submissionId
    };
  }
  if (statusMsg === "Runtime Error") {
    return {
      status: "Runtime Error",
      message: data.runtime_error || statusMsg,
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId
    };
  }
  if (statusMsg === "Time Limit Exceeded") {
    return {
      status: "Time Limit Exceeded",
      runtime: data.status_runtime,
      memory: data.status_memory,
      submissionId
    };
  }
  if (statusMsg === "Compile Error") {
    return {
      status: "Compilation Error",
      message: data.compile_error || data.full_compile_error || statusMsg,
      submissionId
    };
  }
  return {
    status: "Unknown",
    message: statusMsg || data.state,
    runtime: data.status_runtime,
    memory: data.status_memory,
    submissionId
  };
}

// src/cli/commands/submit.ts
async function submitCommand() {
  const detected = detectCurrentProblem();
  if (!detected) {
    console.log(
      import_chalk6.default.red(
        "  \u2717 No problem workspace found. Run `lcx open <slug>` first."
      )
    );
    console.log(
      import_chalk6.default.gray(
        "  Or navigate to a problem directory under ~/LCX/solutions/<slug>/"
      )
    );
    return;
  }
  const { slug, metadata } = detected;
  const lang = metadata.language;
  const code = readSolutionFile(slug, lang);
  if (!code) {
    console.log(
      import_chalk6.default.red(
        `  \u2717 No solution file found for ${slug}.`
      )
    );
    return;
  }
  console.log("");
  console.log(
    import_chalk6.default.bold.magenta("  LCX Submit")
  );
  console.log(import_chalk6.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log(
    import_chalk6.default.gray(`  Problem:  ${metadata.title} (#${metadata.frontendId})`)
  );
  console.log(
    import_chalk6.default.gray(`  Language: ${lang}`)
  );
  console.log("");
  const config = loadConfig();
  const spinner = (0, import_ora6.default)("Submitting to LeetCode...").start();
  try {
    const result = await submitCode({
      questionSlug: slug,
      questionId: metadata.frontendId,
      language: lang,
      code
    });
    spinner.stop();
    printJudgeResult2(result);
    if (config.saveAttempts) {
      recordAttempt({
        problem_slug: slug,
        title: metadata.title,
        difficulty: metadata.difficulty,
        language: lang,
        status: result.status,
        runtime: result.runtime,
        memory: result.memory,
        source: "submit"
      });
    }
    if (result.status === "Accepted") {
      if (config.saveAcceptedSubmit) {
        const acceptedPath = saveAcceptedSubmit(slug, lang, code);
        console.log(
          import_chalk6.default.gray(`  Saved: ${acceptedPath}`)
        );
      }
      const attemptPath = saveAttempt(slug, lang, "accepted", code);
      console.log(
        import_chalk6.default.gray(`  Attempt saved: ${attemptPath}`)
      );
      recordSolved({
        problem_slug: slug,
        title: metadata.title,
        difficulty: metadata.difficulty,
        language: lang,
        local_solution_path: saveAcceptedSubmit(slug, lang, code),
        leetcode_submission_id: result.submissionId
      });
      console.log("");
      console.log(
        import_chalk6.default.green.bold("  \u2713 Problem solved! Stats updated.")
      );
    } else {
      const statusLower = result.status.toLowerCase().replace(/\s+/g, "-");
      const attemptPath = saveAttempt(
        slug,
        lang,
        statusLower,
        code
      );
      console.log(
        import_chalk6.default.gray(`  Attempt saved: ${attemptPath}`)
      );
    }
  } catch (error) {
    spinner.fail(
      import_chalk6.default.red(
        `Submit failed: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}
function printJudgeResult2(result) {
  console.log("");
  const icon = result.status === "Accepted" ? import_chalk6.default.green("\u2713") : result.status === "Wrong Answer" ? import_chalk6.default.red("\u2717") : result.status === "Runtime Error" ? import_chalk6.default.red("\u26A1") : result.status === "Compilation Error" ? import_chalk6.default.red("\u26A0") : result.status === "Time Limit Exceeded" ? import_chalk6.default.yellow("\u23F1") : import_chalk6.default.yellow("...");
  console.log(
    `  ${icon} Status:   ${import_chalk6.default.bold(statusColor2(result.status)(result.status))}`
  );
  if (result.runtime) {
    console.log(
      import_chalk6.default.gray(`  Runtime:  ${result.runtime}`)
    );
  }
  if (result.memory) {
    console.log(
      import_chalk6.default.gray(`  Memory:   ${result.memory}`)
    );
  }
  if (result.message) {
    console.log(import_chalk6.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
    console.log(import_chalk6.default.red(`  ${result.message}`));
  }
  if (result.submissionId) {
    console.log(
      import_chalk6.default.gray(
        `  Submission: https://leetcode.com/submissions/detail/${result.submissionId}/`
      )
    );
  }
  console.log("");
}
function statusColor2(status) {
  switch (status) {
    case "Accepted":
      return import_chalk6.default.green;
    case "Wrong Answer":
      return import_chalk6.default.red;
    case "Runtime Error":
      return import_chalk6.default.red;
    case "Compilation Error":
      return import_chalk6.default.red;
    case "Time Limit Exceeded":
      return import_chalk6.default.yellow;
    default:
      return import_chalk6.default.white;
  }
}

// src/core/stats/reports.ts
var import_chalk7 = __toESM(require("chalk"));
function getStats() {
  const db2 = getDb();
  const totalAttempts = db2.prepare("SELECT COUNT(*) as count FROM attempts").get();
  const solvedCount = db2.prepare("SELECT COUNT(*) as count FROM solved_problems").get();
  const easyCount = db2.prepare(
    "SELECT COUNT(*) as count FROM solved_problems WHERE difficulty = 'Easy'"
  ).get();
  const mediumCount = db2.prepare(
    "SELECT COUNT(*) as count FROM solved_problems WHERE difficulty = 'Medium'"
  ).get();
  const hardCount = db2.prepare(
    "SELECT COUNT(*) as count FROM solved_problems WHERE difficulty = 'Hard'"
  ).get();
  const totalSubmits = db2.prepare("SELECT COUNT(*) as count FROM attempts WHERE source = 'submit'").get();
  const acceptedSubmits = db2.prepare(
    "SELECT COUNT(*) as count FROM attempts WHERE source = 'submit' AND status = 'Accepted'"
  ).get();
  const acceptanceRate = totalSubmits.count > 0 ? (acceptedSubmits.count / totalSubmits.count * 100).toFixed(1) + "%" : "N/A";
  const mostAttempted = db2.prepare(
    `SELECT problem_slug, title, COUNT(*) as count
       FROM attempts
       GROUP BY problem_slug
       ORDER BY count DESC
       LIMIT 5`
  ).all();
  const recentAccepted = db2.prepare(
    `SELECT problem_slug, title, solved_at
       FROM solved_problems
       ORDER BY solved_at DESC
       LIMIT 5`
  ).all();
  return {
    totalAttempts: totalAttempts.count,
    solvedCount: solvedCount.count,
    solvedByDifficulty: {
      Easy: easyCount.count,
      Medium: mediumCount.count,
      Hard: hardCount.count
    },
    acceptanceRate,
    mostAttempted: mostAttempted.map((r) => ({
      slug: r.problem_slug,
      title: r.title,
      count: r.count
    })),
    recentAccepted: recentAccepted.map((r) => ({
      slug: r.problem_slug,
      title: r.title,
      solved_at: r.solved_at
    }))
  };
}
function printStats() {
  const stats = getStats();
  console.log("");
  console.log(import_chalk7.default.bold.magenta("  LCX Statistics"));
  console.log(import_chalk7.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log("");
  console.log(`  ${import_chalk7.default.white("Total Attempts:")}      ${stats.totalAttempts}`);
  console.log(`  ${import_chalk7.default.green("Problems Solved:")}      ${stats.solvedCount}`);
  console.log(
    `    ${import_chalk7.default.cyan("Easy:")}   ${stats.solvedByDifficulty.Easy}  ${import_chalk7.default.yellow("Medium:")} ${stats.solvedByDifficulty.Medium}  ${import_chalk7.default.red("Hard:")}   ${stats.solvedByDifficulty.Hard}`
  );
  console.log(`  ${import_chalk7.default.white("Acceptance Rate:")}     ${stats.acceptanceRate}`);
  console.log("");
  if (stats.mostAttempted.length > 0) {
    console.log(import_chalk7.default.bold.white("  Most Attempted Problems:"));
    for (const p of stats.mostAttempted) {
      console.log(
        `    ${import_chalk7.default.gray("\u2022")} ${import_chalk7.default.white(p.title)} ${import_chalk7.default.gray(`(${p.slug})`)} - ${p.count} attempts`
      );
    }
    console.log("");
  }
  if (stats.recentAccepted.length > 0) {
    console.log(import_chalk7.default.bold.white("  Recent Accepted:"));
    for (const p of stats.recentAccepted) {
      console.log(
        `    ${import_chalk7.default.green("\u2713")} ${import_chalk7.default.white(p.title)} ${import_chalk7.default.gray(`(${p.slug})`)}`
      );
    }
    console.log("");
  }
  return stats;
}

// src/cli/commands/stats.ts
function statsCommand(options) {
  if (options.json) {
    console.log(JSON.stringify(getStats(), null, 2));
    return;
  }
  printStats();
  if (options.topic) {
    console.log(
      `  Topic filter: ${options.topic} (not yet implemented)`
    );
  }
  if (options.difficulty) {
    console.log(
      `  Difficulty filter: ${options.difficulty} (not yet implemented)`
    );
  }
}

// src/cli/commands/companies.ts
var import_chalk8 = __toESM(require("chalk"));
var import_ora7 = __toESM(require("ora"));

// src/core/company/workbook.ts
var import_fs_extra7 = __toESM(require("fs-extra"));
var import_os4 = __toESM(require("os"));
var import_path7 = __toESM(require("path"));
var XLSX = __toESM(require("xlsx"));
var DIFFICULTY_SHEETS = /* @__PURE__ */ new Set(["easy", "medium", "hard"]);
var DEFAULT_WORKBOOK_BASENAME = "Leetcode problem set (company tag, sorted by freq).xlsx";
var WORKBOOK_NAME_HINTS = [
  "leetcode problem set",
  "company tag",
  "sorted by freq"
];
function normalizeSheetName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}
function isDifficultySheet(name) {
  return DIFFICULTY_SHEETS.has(normalizeSheetName(name));
}
function slugToTitle(slug) {
  if (!slug) {
    return "Unknown question";
  }
  return slug.split(/[-_]/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
function parseLeetCodeUrl(url) {
  const parsed = new URL(url);
  const slug = parsed.pathname.replace(/\/$/, "").split("/").pop() || url;
  return {
    slug,
    title: slugToTitle(slug),
    envType: parsed.searchParams.get("envType") || void 0,
    envId: parsed.searchParams.get("envId") || void 0,
    favoriteSlug: parsed.searchParams.get("favoriteSlug") || void 0
  };
}
function parseTextCell(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}
function matchesWorkbookName(fileName) {
  const normalized = fileName.toLowerCase();
  return normalized.endsWith(".xlsx") && WORKBOOK_NAME_HINTS.every((hint) => normalized.includes(hint));
}
function searchDirectoryForWorkbook(directory, preferredName) {
  if (!import_fs_extra7.default.existsSync(directory) || !import_fs_extra7.default.statSync(directory).isDirectory()) {
    return null;
  }
  const entries = import_fs_extra7.default.readdirSync(directory, { withFileTypes: true });
  const lowerPreferredName = preferredName?.toLowerCase().trim();
  if (lowerPreferredName) {
    const preferredExact = entries.find(
      (entry) => entry.isFile() && entry.name.toLowerCase() === lowerPreferredName
    );
    if (preferredExact) {
      return import_path7.default.join(directory, preferredExact.name);
    }
    if (!lowerPreferredName.endsWith(".xlsx")) {
      const preferredWithExtension = entries.find(
        (entry) => entry.isFile() && entry.name.toLowerCase() === `${lowerPreferredName}.xlsx`
      );
      if (preferredWithExtension) {
        return import_path7.default.join(directory, preferredWithExtension.name);
      }
    }
  }
  const fuzzyMatch = entries.find(
    (entry) => entry.isFile() && matchesWorkbookName(entry.name)
  );
  if (fuzzyMatch) {
    return import_path7.default.join(directory, fuzzyMatch.name);
  }
  return null;
}
function autoDetectWorkbookPath(preferredName) {
  const searchRoots = [
    import_path7.default.join(import_os4.default.homedir(), "Downloads"),
    import_os4.default.homedir(),
    process.cwd()
  ];
  for (const root of searchRoots) {
    const found = searchDirectoryForWorkbook(root, preferredName);
    if (found) {
      return found;
    }
  }
  return null;
}
function getConfiguredWorkbookPath(explicitPath) {
  const config = loadConfig();
  const sourcePath = explicitPath?.trim() || config.companyWorkbookPath.trim();
  if (sourcePath) {
    const resolved = expandPath(sourcePath);
    if (import_fs_extra7.default.existsSync(resolved)) {
      return resolved;
    }
    const autoDetected = autoDetectWorkbookPath(import_path7.default.basename(sourcePath));
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
function loadWorkbook(filePath) {
  if (!import_fs_extra7.default.existsSync(filePath)) {
    throw new Error(`Workbook not found: ${filePath}`);
  }
  return XLSX.readFile(filePath, {
    cellDates: false,
    cellText: false,
    cellStyles: false
  });
}
function parseSheetRows(sheetName, rows) {
  const questions = [];
  const difficultySheet = isDifficultySheet(sheetName);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const urlCell = difficultySheet ? row[2] : row[0];
    const url = parseTextCell(urlCell);
    if (!url || !url.startsWith("http")) {
      continue;
    }
    const parsedUrl = parseLeetCodeUrl(url);
    const question = {
      rowNumber: index + 1,
      url,
      slug: parsedUrl.slug,
      title: parsedUrl.title,
      isDailyQuestion: parsedUrl.envType === "daily-question",
      envType: parsedUrl.envType,
      envId: parsedUrl.envId,
      favoriteSlug: parsedUrl.favoriteSlug
    };
    if (difficultySheet) {
      question.topic = parseTextCell(row[1]) || void 0;
      question.difficulty = parseTextCell(row[3]) || sheetName;
    }
    questions.push(question);
  }
  return questions;
}
function summarizeSheet(sheetName, questions) {
  const kind = isDifficultySheet(sheetName) ? "difficulty" : "company";
  const dailyQuestions = questions.filter((question) => question.isDailyQuestion).length;
  const companyQuestions = questions.length - dailyQuestions;
  return {
    name: sheetName,
    kind,
    totalQuestions: questions.length,
    companyQuestions,
    dailyQuestions
  };
}
function resolveCompanyWorkbookPath(explicitPath) {
  return getConfiguredWorkbookPath(explicitPath);
}
function getCompanyWorkbookSummary(explicitPath) {
  const workbookPath = getConfiguredWorkbookPath(explicitPath);
  const workbook = loadWorkbook(workbookPath);
  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: true,
      defval: ""
    });
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
    sheets
  };
}
function getCompanySheetDetail(sheetName, explicitPath) {
  const workbookPath = getConfiguredWorkbookPath(explicitPath);
  const workbook = loadWorkbook(workbookPath);
  const resolvedSheetName = workbook.SheetNames.find(
    (candidate) => normalizeSheetName(candidate) === normalizeSheetName(sheetName)
  );
  if (!resolvedSheetName) {
    const available = workbook.SheetNames.join(", ");
    throw new Error(
      `Sheet "${sheetName}" was not found in ${import_path7.default.basename(workbookPath)}. Available sheets: ${available}`
    );
  }
  const worksheet = workbook.Sheets[resolvedSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: true,
    defval: ""
  });
  const questions = parseSheetRows(resolvedSheetName, rows);
  const summary = summarizeSheet(resolvedSheetName, questions);
  return {
    ...summary,
    questions
  };
}

// src/cli/commands/companies.ts
function formatCountLabel(summary) {
  if (summary.kind === "difficulty") {
    return `${summary.totalQuestions} questions`;
  }
  const companyLabel = `${summary.companyQuestions} company question${summary.companyQuestions === 1 ? "" : "s"}`;
  const dailyLabel = summary.dailyQuestions > 0 ? ` + ${summary.dailyQuestions} daily question${summary.dailyQuestions === 1 ? "" : "s"}` : "";
  return `${companyLabel}${dailyLabel}`;
}
function printSummary(summary) {
  console.log("");
  console.log(import_chalk8.default.bold.magenta("  LCX Company Workbook"));
  console.log(import_chalk8.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log(
    import_chalk8.default.gray("  Workbook: ") + import_chalk8.default.white(summary.workbookPath)
  );
  console.log(
    import_chalk8.default.gray("  Sheets:   ") + import_chalk8.default.white(String(summary.sheetCount)) + import_chalk8.default.gray(" | ") + import_chalk8.default.white(`${summary.companySheets.length} company`) + import_chalk8.default.gray(" | ") + import_chalk8.default.white(`${summary.difficultySheets.length} difficulty`)
  );
  console.log(
    import_chalk8.default.gray("  Entries:  ") + import_chalk8.default.white(String(summary.totalQuestions))
  );
  console.log("");
  for (const sheet of summary.sheets) {
    const label = sheet.kind === "difficulty" ? import_chalk8.default.yellow(sheet.name) : import_chalk8.default.cyan(sheet.name);
    console.log(
      `  ${label.padEnd(22)} ${import_chalk8.default.white(formatCountLabel(sheet))}`
    );
  }
  console.log("");
}
function printDetail(detail, limit) {
  console.log("");
  console.log(import_chalk8.default.bold.magenta(`  ${detail.name}`));
  console.log(import_chalk8.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  if (detail.kind === "difficulty") {
    console.log(
      import_chalk8.default.gray("  Questions: ") + import_chalk8.default.white(String(detail.totalQuestions)) + import_chalk8.default.gray(" | ") + import_chalk8.default.white("difficulty sheet")
    );
  } else {
    console.log(
      import_chalk8.default.gray("  Questions: ") + import_chalk8.default.white(String(detail.totalQuestions)) + import_chalk8.default.gray(" | ") + import_chalk8.default.white(`${detail.companyQuestions} company question${detail.companyQuestions === 1 ? "" : "s"}`) + (detail.dailyQuestions > 0 ? import_chalk8.default.gray(" | ") + import_chalk8.default.white(
        `${detail.dailyQuestions} daily question${detail.dailyQuestions === 1 ? "" : "s"}`
      ) : "")
    );
  }
  console.log("");
  const displayed = detail.questions.slice(0, limit);
  if (detail.questions.length === 0) {
    console.log(import_chalk8.default.yellow("  No questions found in this sheet."));
    console.log("");
    return;
  }
  if (detail.questions.length > limit) {
    console.log(
      import_chalk8.default.gray(`  Showing ${displayed.length} of ${detail.questions.length} questions`)
    );
    console.log("");
  }
  for (const question of displayed) {
    printQuestion(question, detail.kind);
  }
  console.log("");
}
function printQuestion(question, kind) {
  const numberLabel = import_chalk8.default.gray(`${String(question.rowNumber).padStart(4)}.`);
  const titleLabel = question.isDailyQuestion ? import_chalk8.default.green(question.title) : import_chalk8.default.white(question.title);
  const meta = [];
  if (kind === "difficulty" && question.topic) {
    meta.push(import_chalk8.default.gray(question.topic));
  }
  if (question.difficulty) {
    meta.push(import_chalk8.default.yellow(question.difficulty));
  }
  if (question.isDailyQuestion) {
    meta.push(import_chalk8.default.green("daily"));
  }
  console.log(`  ${numberLabel} ${titleLabel}`);
  if (meta.length > 0) {
    console.log(`      ${meta.join(import_chalk8.default.gray(" | "))}`);
  }
  console.log(`      ${import_chalk8.default.gray(question.url)}`);
}
function companiesCommand(companyName, options) {
  const spinner = options.json ? null : (0, import_ora7.default)("Loading workbook...").start();
  try {
    if (companyName) {
      const detail = getCompanySheetDetail(companyName, options.file);
      const limit = options.all ? Number.POSITIVE_INFINITY : Math.max(1, parseInt(options.limit || "", 10) || 50);
      spinner?.succeed(`Loaded ${detail.name}`);
      if (options.json) {
        const payload = {
          workbookPath: resolveCompanyWorkbookPath(options.file),
          sheet: detail
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
        import_chalk8.default.red(
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

// src/cli/commands/config.ts
var import_chalk9 = __toESM(require("chalk"));
function configCommand(options) {
  if (options.set) {
    const [key, value] = options.set;
    try {
      const updated = updateConfig(key, value);
      console.log("");
      console.log(
        import_chalk9.default.green(
          `  \u2713 ${key} set to ${JSON.stringify(updated[key])}`
        )
      );
    } catch (error) {
      console.log(
        import_chalk9.default.red(
          `  \u2717 Failed to set config: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      );
    }
    return;
  }
  const config = loadConfig();
  const secrets = loadSecrets();
  console.log("");
  console.log(import_chalk9.default.bold.magenta("  LCX Configuration"));
  console.log(import_chalk9.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log("");
  const entries = Object.entries(config);
  for (const [key, value] of entries) {
    const valStr = typeof value === "boolean" ? value ? "true" : "false" : String(value);
    console.log(
      `  ${import_chalk9.default.white(key.padEnd(22))} ${import_chalk9.default.cyan(valStr)}`
    );
  }
  console.log("");
  console.log(import_chalk9.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log(
    `  ${import_chalk9.default.white("Authenticated".padEnd(22))} ${secrets ? import_chalk9.default.green("Yes") + import_chalk9.default.gray(` (${secrets.LEETCODE_SESSION.slice(0, 8)}...)`) : import_chalk9.default.red("No")}`
  );
  console.log("");
  console.log(
    import_chalk9.default.gray("  Config file: ") + import_chalk9.default.white("~/LCX/config.json")
  );
  console.log(
    import_chalk9.default.gray("  Secrets file: ") + import_chalk9.default.white("~/.lcx/secrets.json")
  );
  console.log("");
  console.log(import_chalk9.default.gray("  To update a setting:"));
  console.log(
    import_chalk9.default.gray("    ") + import_chalk9.default.cyan("lcx config set <key> <value>")
  );
  console.log(
    import_chalk9.default.gray("    Example: ") + import_chalk9.default.white("lcx config set defaultLanguage python")
  );
  console.log(
    import_chalk9.default.gray("    Example: ") + import_chalk9.default.white(
      'lcx config set companyWorkbookPath "~/Downloads/Leetcode problem set (company tag, sorted by freq).xlsx"'
    )
  );
  console.log("");
}

// src/tui/repl.ts
var readline = __toESM(require("readline"));
var import_chalk11 = __toESM(require("chalk"));

// src/tui/banner.ts
var import_chalk10 = __toESM(require("chalk"));

// src/tui/ascii_art.ts
var ICARUS_ART = "                                                                                                    \n                                                                                                    \n  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . \n .   .  .  .::.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . \n           .=.%                                                                                     \n . .  .    ..*:*   .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  \n.     .      :**. .+*.   .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  \n   .    .     .%: :+=.                                                                              \n.  .    .  .  ..=.:*:  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .   .\n     .   ...    . .+.     .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . \n  .  .    -:      ..  ..                                                                            \n .     .      ..%-.  .+=   .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .   \n.   .   ..    .%*-   *:*.  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .\n   .     .::..%-+:::.%:=                                                                            \n  .   .   :@*---++=#.*+:   .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .\n        . #@%=::=#-*=*:    .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .\n  . .     %###::==:+=.                                                                              \n     .   .#+*#:::-:*:   .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . .:*#..  \n.     . . *=+**.:-:+..     .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . ..***%.    \n.  .   .=:*:*+#..-.=-*: .                                                               .+**##.     \n   .    .:*:=+*#.:.=#:%: .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  ..-*=***.  .  .\n          =::++*:=.*::=-    .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  =*%=#*%.      .\n  .  .    .=.-==%=.=:::= ...                                                      ..#*%=**@.        \n  .  .  .  =-.+==+.-:::+ :==  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .   .%***=**.   . ..  \n         .#++:.*=*:-:::=-*:%.    .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  . .:*-+#:+**         .\n.  .  .   *=**.--:+:..:**::*.                                                 .:#*:++-=+#.  .       \n   .     .:==#%.--:+=..%:::%  ..  .  .  .  .  .  .  .  .  .  .  .  .  .  .   .==%:-=*=*#:    . ..   \n      .    *.=*%.--:%..*:::=      .  .  .  .  .  .  .  .  .  .  .  .  .  .  .*.*+:==:+++          ..\n .    .    +=.=-%:-:=*.*::-..                                              :*.+%::=*:=*.  .  .      \n  .      . .*..+=#::::==..-    ..  .  .  .  .  .  .  .  .  .  .  .  .  .  -**.*=.:=.+*:      .  .   \n   .  .    .+*:.==#-.:==:.:        .  .  .  .  .  .  .  .  .  .  .  .  . :-#:-*::-*:==.         .  .\n.     .    .=:=%.:-#*..+=.: .  ...                                      .=-*.-*.:=:-*:  . ..        \n        .   .=.-==.+.#:.+::   .=-*=:  .  .  .  .  .  .  .  .  .  .  . ..*.=*:=:.:=.=*.       ..  .  \n . ..   .    .-.:=*=+.+:.+:   .*=.:#..   .  .  .  .  .  .  .  .  .     *%.==:=..:=:=:            .  \n.            .*%+.:=*::=-.+:.  .-.:.::=. .%=.                       . ::#:-::= -%:.#.  .. ..        \n     ..   .   :--==.:*.==+.==.  :::#%=.:*=*==.   .  .  .  .  .  .  . .*=%::::=*:=.:* .       ..  .  \n. .      .     .:-::**+.:=* :=. .##@@=:*%...:=.+.   .  .  .  .  .   .=.=#::.:+: -.-:             .  \n   .    .   .   .=.=::*.-::+ :*.    .*-@-...::-*.                    =.=*:-.%.. = =..  .  ..        \n.   .  .   .     .=-.=:*..:.*..*.    .+##::.::===##*#+..  .  .  . . .=-=+.:=:...-.=    .     ..  .  \n.         .   .   :*%=.:=+...: .=:.   :%*+: .*-:=:..=.+. .. .. ..   .+=-:--+....-.+.             .  \n   .  .  .   .     :==+*:+.=:.=. :*.  :%=:  .*@==-: ..= .==+=-++.   :+..:*.* .:.:.*  .   . .        \n.     .     .   .  ..*:-::*+...-. .#-.-#....=*=:==: .+=.*%#:=#===:=..+.-:%.-..:.-.*   .       .  .  \n .       .     .      *..:=+.:=:-:. :%:%=:.:.:==.:. ..-.#-+:::::=*: .:-.+:=-:.=.=.*.   .   .     .  \n   ..   .   .    .-**+*#+- .*:.::==.  :*#:=- .-*:.   .+*+=@=*=:.-+-+:--:*.-.:.-:=.*..   .  .        \n.      .   .    .*:-::::=-:=%:+=:::-+.   :%.. ..*=  .%-+%@**+*-+::+*:=.-:-:::.::= +           ..    \n .    .   .   ..=---::::-:=*:.:=-=+=++::. .:*...:-=.-*%*+@-++-++::*=.-:..=::::-#.:=   .  .       .. \n    .    .   ..*-=+:-:=---.:%-**-.:::=*::.  .:#.=+++%+-+%@==**+-*-: .=-..=-::-#: =.      .  .       \n   .    .   .:%::+=*=+=-==+=:=#::=+*:.==.      %::::::***@@%***#*:  .+:#+::::#...+  .       .  .    \n.     .    ..*-:-+#%@=*=*=====:=*+..:=*=.#-... .*::::::=%@@@:=-     .=::=-:=* ..+.  .  .       .  . \n .   .      :*:-+**#%+:%#*%=*:.:-=:**%+..=:-... ==:-=:**#+*@@-   . ..+=:::%: .:*:.     .  .       . \n  .     ..  +=:=-==--. .:*%%*:.==+:*#==::*:::-:..* .. .::.  +**.   .===*#:..::#.          .  .      \n   .    .*=+-*--:=+:.      .@::=#*=%===:.:--.::..*...   ....:-:-=:+*%*:. :::+=     . .       .  .   \n.   . .:*-:::#%%+.          .#=:=%%@+=-=:::..+:...::...+#..  ........:::::**   .      . .       .   \n.     .:*:::-+=.*       .       .-::*:::-::--::.:::.:::.. ..::::::::::-**:.     .  .     . .        \n   .     ....::..  .   .   .        .+.:..:....+---:..:.:::.=*=:=%@#=:.      .     .        . .  .. \n  .                 .                 .=*==+%@*==::=:-*=-..:*%==-=%.          .       ..            \n .   .               .  ..   .  .        .  .*%#+==+=+=+##*@#*:+*#:    .  .     ..       ..   .     \n.   .  .  .  .  ..          .   .  .         ..  ::... .  :@@:-.+-.       .  .     ..        .  ..  \n   .   .  .  .     .  .    .       .  ..  .              ..@%*:::+. .  .      .       ..    .       \n.                  .  .  .    .                 .         .#%=::.%.    .  .      .       .     .   .\n   . .  .  .   .         .   .  ..  .   .   .  .   .  .    %*:::.#..      .  .     ..    .  .       \n  .     .  .  .  .  .       .       .  .   .      .     .  *%*:-::*.  .      .  .     .     .    .  \n .   .           .  .  .   .   .          .   .  .   .    ..#=.=..::   .  .      .     .       .  . \n    .   .  .  .        .         .  .  .     .        .     *-==-:.-.     .  .      .   . .   .    .\n   .   .   .  .  .  .    .   .      .  .  .     .  .        .+--::.-.        .  .          .        \n.     .          .  .    .     .          .  .  .     . .    .*-%:-.-.. .       .  .  .     .   .   \n .   .   .  .         .    .   .  .  .       .     .     .     =%#==.:====+.       .  .  .   .  .   \n  .     .   .  .  .   .    .      .  .  .       .   .     .      .+%:.:.:-:.  .          .        ..\n   .   .       .  .     .    .          .  .     .    ..   .  .   :%%*-.+.    .  .  .      .  .     \n    .     .         .   .    .  .  .       .  .                   .:=*@+==       .  .  .   .  .  .  \n.    .   .  ..  .   .     .     .  .  .        .   .    .  .            .. .  .        .            \n.     .         .     .   .  .        .  .  .   .  .   .   .  ..              .  .  .    .  .  .    \n  ..   .  .       .   .      .  .  .     .  .         .          ..  .           .  .    .  .  .  . ";

// src/tui/banner.ts
function printBanner() {
  console.log(import_chalk10.default.white(ICARUS_ART));
}

// src/tui/repl.ts
var import_child_process3 = require("child_process");
var import_fs_extra8 = __toESM(require("fs-extra"));
var import_path8 = __toESM(require("path"));
var rl = null;
var problemCache = [];
var lastDetectedProblem = null;
var PURPLE = import_chalk11.default.hex("#a855f7");
var DIM = import_chalk11.default.hex("#71717a");
async function startRepl() {
  printBanner();
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PURPLE("lcx \u203A "),
    terminal: true,
    historySize: 1e3
  });
  rl.prompt();
  rl.on("line", async (line) => {
    const input = line.trim();
    rl?.pause();
    try {
      if (!input) {
        await showDashboard();
      } else {
        await dispatch(input);
      }
    } catch (err) {
      console.log(import_chalk11.default.red(`  Error: ${err instanceof Error ? err.message : err}`));
    }
    rl?.prompt();
  });
  rl.on("close", () => {
    console.log("");
    console.log(import_chalk11.default.gray("  Stay strong, struggler."));
    process.exit(0);
  });
  await showDashboard();
}
async function dispatch(input) {
  const args = input.split(/\s+/);
  const cmd = args[0].toLowerCase();
  const rest = args.slice(1).join(" ");
  switch (cmd) {
    case "d":
    case "dashboard":
      await showDashboard();
      break;
    case "p":
    case "problems":
      await showProblems(rest);
      break;
    case "s":
    case "search":
      if (!rest) {
        console.log(import_chalk11.default.yellow("  Usage: search <query>"));
        return;
      }
      await doSearch(rest);
      break;
    case "o":
    case "open":
      if (!rest) {
        console.log(import_chalk11.default.yellow("  Usage: open <slug>"));
        return;
      }
      await doOpen(rest);
      break;
    case "r":
    case "run":
      await doRun();
      break;
    case "sub":
    case "submit":
      await doSubmit();
      break;
    case "st":
    case "stats":
      await doStats();
      break;
    case "co":
    case "companies":
      await doCompanies(rest);
      break;
    case "c":
    case "config":
      if (rest) {
        await doConfigSet(rest);
      } else {
        await doConfig();
      }
      break;
    case "login":
      await doLogin();
      break;
    case "logout":
      clearSecrets();
      console.log(import_chalk11.default.yellow("  Logged out."));
      break;
    case "cd":
      if (rest) {
        const detected = detectCurrentProblem();
        if (detected) {
          lastDetectedProblem = { slug: detected.slug, title: detected.metadata.title };
          console.log(PURPLE(`  Switched to: ${detected.metadata.title}`));
        } else {
          console.log(import_chalk11.default.yellow("  Not in a problem workspace."));
        }
      }
      break;
    case "ls":
      await doListWorkspace();
      break;
    case "h":
    case "help":
      showHelp();
      break;
    case "q":
    case "quit":
    case "exit":
      rl?.close();
      break;
    case "clear":
      console.clear();
      break;
    default:
      console.log(import_chalk11.default.yellow(`  Unknown command: ${cmd}`));
      console.log(DIM("  Type 'h' for help"));
  }
}
async function showDashboard() {
  console.log("");
  console.log(import_chalk11.default.bold.magenta("  \u2554\u2550\u2550 Dashboard \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
  console.log("");
  const secrets = loadSecrets();
  let solvedCount = 0;
  let username = "";
  if (secrets) {
    try {
      const viewer = await getViewer();
      username = viewer.username;
      solvedCount = viewer.solvedCount;
      console.log(
        `  ${PURPLE("User")}     ${import_chalk11.default.white(username)}  ${import_chalk11.default.green("\u25CF")} online`
      );
      console.log(
        `  ${PURPLE("Solved")}   ${import_chalk11.default.green(String(solvedCount))}  ${import_chalk11.default.gray("|")}  ${PURPLE("Rank")}  ${import_chalk11.default.yellow(`#${viewer.ranking.toLocaleString()}`)}`
      );
    } catch {
      console.log(`  ${PURPLE("Status")}   ${import_chalk11.default.red("Session expired \u2014 type 'login'")}`);
    }
  } else {
    console.log(`  ${PURPLE("Status")}   ${import_chalk11.default.yellow("Not logged in \u2014 type 'login'")}`);
  }
  try {
    const stats = getStats();
    if (stats.totalAttempts > 0) {
      console.log(
        `  ${PURPLE("Local")}    ${import_chalk11.default.green(`${stats.solvedCount} solved`)}  ${import_chalk11.default.gray("|")}  ${stats.totalAttempts} attempts  ${import_chalk11.default.gray("|")}  ${import_chalk11.default.yellow(stats.acceptanceRate)} rate`
      );
    }
  } catch {
  }
  const detected = detectCurrentProblem();
  if (detected) {
    lastDetectedProblem = { slug: detected.slug, title: detected.metadata.title };
    console.log(
      `  ${PURPLE("Current")}  ${import_chalk11.default.cyan(detected.metadata.title)} ${import_chalk11.default.gray(`(#${detected.metadata.frontendId})`)} ${import_chalk11.default.yellow(detected.metadata.difficulty)}`
    );
  }
  console.log("");
  console.log(import_chalk11.default.bold.magenta("  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
  console.log("");
  if (problemCache.length === 0) {
    try {
      const spinner = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
      let i = 0;
      const interval = setInterval(() => {
        process.stdout.write(`\r  ${PURPLE(spinner[i % spinner.length])} Fetching problems...`);
        i++;
      }, 80);
      const problems = await getProblems({ limit: 30 });
      problemCache = problems.filter((p) => !p.paidOnly);
      clearInterval(interval);
      process.stdout.write("\r\x1B[K");
    } catch (err) {
      console.log(import_chalk11.default.gray(`  Could not fetch problems: ${err instanceof Error ? err.message : err}`));
    }
  }
  if (problemCache.length > 0) {
    printProblemTable(problemCache.slice(0, 30));
  }
  console.log("");
  console.log(
    DIM("  d") + import_chalk11.default.gray("/dashboard  ") + DIM("p") + import_chalk11.default.gray("/problems  ") + DIM("s") + import_chalk11.default.gray("/search  ") + DIM("o") + import_chalk11.default.gray("/open  ") + DIM("r") + import_chalk11.default.gray("/run  ") + DIM("sub") + import_chalk11.default.gray("/submit  ") + DIM("co") + import_chalk11.default.gray("/companies  ") + DIM("q") + import_chalk11.default.gray("/quit")
  );
  console.log("");
}
function printProblemTable(problems) {
  console.log("");
  console.log(import_chalk11.default.bold.white("  Problems"));
  console.log(import_chalk11.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  for (const p of problems) {
    const diffColor = p.difficulty === "Easy" ? import_chalk11.default.green : p.difficulty === "Medium" ? import_chalk11.default.yellow : import_chalk11.default.red;
    const statusIcon = p.status === "solved" ? import_chalk11.default.green("\u2713") : p.status === "attempted" ? import_chalk11.default.yellow("~") : DIM("\u25CB");
    const tags = p.topicTags.slice(0, 3).map((t) => DIM(t.name)).join(" ");
    console.log(
      `  ${statusIcon} ${import_chalk11.default.white(p.frontendId.padStart(4))}. ${import_chalk11.default.white(p.title.padEnd(35))} ${diffColor(p.difficulty.padEnd(8))} ${tags}`
    );
  }
}
async function showProblems(args) {
  const filters = parseFilters(args);
  try {
    console.log(PURPLE("  Fetching..."));
    const problems = await getProblems({ ...filters, limit: 50 });
    problemCache = problems.filter((p) => !p.paidOnly);
    printProblemTable(problemCache);
    console.log("");
  } catch (err) {
    console.log(import_chalk11.default.red(`  ${err instanceof Error ? err.message : err}`));
  }
}
function parseFilters(args) {
  const parts = args.split(/\s+/);
  const filters = {};
  for (const part of parts) {
    if (["easy", "medium", "hard"].includes(part.toLowerCase())) {
      filters.difficulty = part.toLowerCase();
    } else if (["solved", "unsolved"].includes(part.toLowerCase())) {
      filters.status = part.toLowerCase();
    } else if (part.startsWith("tag:")) {
      filters.tag = part.slice(4);
    }
  }
  return filters;
}
async function doSearch(query) {
  try {
    console.log(PURPLE(`  Searching "${query}"...`));
    const results = await searchProblems(query);
    const filtered = results.filter((p) => !p.paidOnly).slice(0, 20);
    if (filtered.length === 0) {
      console.log(import_chalk11.default.gray("  No results."));
    } else {
      printProblemTable(filtered);
    }
    console.log("");
  } catch (err) {
    console.log(import_chalk11.default.red(`  ${err instanceof Error ? err.message : err}`));
  }
}
async function doOpen(input) {
  try {
    const resolved = await resolveSlug(input);
    console.log(PURPLE(`  Opening "${resolved}"...`));
    const problem = await getProblem(resolved);
    const config = loadConfig();
    const { dir, solutionPath } = openProblem(problem, config.defaultLanguage);
    lastDetectedProblem = { slug: problem.titleSlug, title: problem.title };
    console.log(
      import_chalk11.default.green(
        `  \u2713 ${problem.title} ${import_chalk11.default.gray(`(#${problem.frontendId})`)} ${problem.difficulty === "Easy" ? import_chalk11.default.green(problem.difficulty) : problem.difficulty === "Medium" ? import_chalk11.default.yellow(problem.difficulty) : import_chalk11.default.red(problem.difficulty)}`
      )
    );
    console.log(import_chalk11.default.gray(`  ${dir}`));
    if (config.autoOpenEditor) {
      try {
        (0, import_child_process3.execSync)(`${config.editorCommand} "${solutionPath}"`, { stdio: "ignore" });
        console.log(DIM(`  Opened in ${config.editorCommand}`));
      } catch {
      }
    }
    console.log("");
  } catch (err) {
    console.log(import_chalk11.default.red(`  ${err instanceof Error ? err.message : err}`));
  }
}
async function doRun() {
  let slug;
  let title;
  let frontendId;
  let difficulty;
  let language;
  const detected = detectCurrentProblem();
  if (detected) {
    slug = detected.slug;
    title = detected.metadata.title;
    frontendId = detected.metadata.frontendId;
    difficulty = detected.metadata.difficulty;
    language = detected.metadata.language;
    lastDetectedProblem = { slug, title };
  } else if (lastDetectedProblem) {
    slug = lastDetectedProblem.slug;
    const metaPath = import_path8.default.join(
      import_path8.default.resolve(loadConfig().workspacePath.replace("~", require("os").homedir())),
      "solutions",
      slug,
      "metadata.json"
    );
    if (import_fs_extra8.default.existsSync(metaPath)) {
      const meta = import_fs_extra8.default.readJsonSync(metaPath);
      title = meta.title;
      frontendId = meta.frontendId;
      difficulty = meta.difficulty;
      language = meta.language;
    } else {
      console.log(import_chalk11.default.yellow("  No workspace found. Use 'open <slug>' first."));
      return;
    }
  } else {
    console.log(import_chalk11.default.yellow("  No workspace found. Use 'open <slug>' first."));
    return;
  }
  const code = readSolutionFile(slug, language);
  if (!code) {
    console.log(import_chalk11.default.red(`  No solution file for ${slug}`));
    return;
  }
  const config = loadConfig();
  const spinner = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${PURPLE(spinner[i % spinner.length])} Running on LeetCode...`);
    i++;
  }, 80);
  try {
    const result = await runCode({
      questionSlug: slug,
      questionId: frontendId,
      language,
      code,
      dataInput: ""
    });
    clearInterval(interval);
    process.stdout.write("\r\x1B[K");
    printJudgeResult3(result);
    if (config.saveAttempts) {
      recordAttempt({ problem_slug: slug, title, difficulty, language, status: result.status, runtime: result.runtime, memory: result.memory, source: "run" });
    }
    const statusLower = result.status.toLowerCase().replace(/\s+/g, "-");
    if (result.status === "Accepted" && config.saveAcceptedRun) {
      const p = saveAttempt(slug, language, "accepted-run", code);
      console.log(DIM(`  Saved: ${p}`));
    } else if (result.status !== "Accepted") {
      const p = saveAttempt(slug, language, statusLower, code);
      console.log(DIM(`  Saved: ${p}`));
    }
    console.log("");
  } catch (err) {
    clearInterval(interval);
    process.stdout.write("\r\x1B[K");
    console.log(import_chalk11.default.red(`  Run failed: ${err instanceof Error ? err.message : err}`));
  }
}
async function doSubmit() {
  let slug;
  let title;
  let frontendId;
  let difficulty;
  let language;
  const detected = detectCurrentProblem();
  if (detected) {
    slug = detected.slug;
    title = detected.metadata.title;
    frontendId = detected.metadata.frontendId;
    difficulty = detected.metadata.difficulty;
    language = detected.metadata.language;
  } else if (lastDetectedProblem) {
    slug = lastDetectedProblem.slug;
    const metaPath = import_path8.default.join(
      import_path8.default.resolve(loadConfig().workspacePath.replace("~", require("os").homedir())),
      "solutions",
      slug,
      "metadata.json"
    );
    if (import_fs_extra8.default.existsSync(metaPath)) {
      const meta = import_fs_extra8.default.readJsonSync(metaPath);
      title = meta.title;
      frontendId = meta.frontendId;
      difficulty = meta.difficulty;
      language = meta.language;
    } else {
      console.log(import_chalk11.default.yellow("  No workspace found. Use 'open <slug>' first."));
      return;
    }
  } else {
    console.log(import_chalk11.default.yellow("  No workspace found. Use 'open <slug>' first."));
    return;
  }
  const code = readSolutionFile(slug, language);
  if (!code) {
    console.log(import_chalk11.default.red(`  No solution file for ${slug}`));
    return;
  }
  console.log(PURPLE(`  Submitting ${title}...`));
  const config = loadConfig();
  const spinner = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${PURPLE(spinner[i % spinner.length])} Judging...`);
    i++;
  }, 80);
  try {
    const result = await submitCode({
      questionSlug: slug,
      questionId: frontendId,
      language,
      code
    });
    clearInterval(interval);
    process.stdout.write("\r\x1B[K");
    printJudgeResult3(result);
    if (config.saveAttempts) {
      recordAttempt({ problem_slug: slug, title, difficulty, language, status: result.status, runtime: result.runtime, memory: result.memory, source: "submit" });
    }
    if (result.status === "Accepted") {
      if (config.saveAcceptedSubmit) {
        const p2 = saveAcceptedSubmit(slug, language, code);
        console.log(import_chalk11.default.green(`  Saved: ${p2}`));
      }
      const p = saveAttempt(slug, language, "accepted", code);
      console.log(DIM(`  Attempt: ${p}`));
      recordSolved({
        problem_slug: slug,
        title,
        difficulty,
        language,
        local_solution_path: saveAcceptedSubmit(slug, language, code),
        leetcode_submission_id: result.submissionId
      });
      console.log(import_chalk11.default.green.bold("  \u2713 Accepted! Stats updated."));
    } else {
      const p = saveAttempt(slug, language, result.status.toLowerCase().replace(/\s+/g, "-"), code);
      console.log(DIM(`  Attempt: ${p}`));
    }
    console.log("");
  } catch (err) {
    clearInterval(interval);
    process.stdout.write("\r\x1B[K");
    console.log(import_chalk11.default.red(`  Submit failed: ${err instanceof Error ? err.message : err}`));
  }
}
function printJudgeResult3(result) {
  const icon = result.status === "Accepted" ? import_chalk11.default.green("\u2713") : result.status === "Wrong Answer" ? import_chalk11.default.red("\u2717") : result.status === "Runtime Error" ? import_chalk11.default.red("\u26A1") : result.status === "Compilation Error" ? import_chalk11.default.red("\u26A0") : result.status === "Time Limit Exceeded" ? import_chalk11.default.yellow("\u23F1") : import_chalk11.default.yellow("...");
  const statusColor3 = result.status === "Accepted" ? import_chalk11.default.green : result.status.includes("Wrong") || result.status.includes("Error") ? import_chalk11.default.red : import_chalk11.default.yellow;
  console.log(`  ${icon} ${statusColor3.bold(result.status)}  ${import_chalk11.default.gray(result.runtime || "")}  ${import_chalk11.default.gray(result.memory || "")}`);
  if (result.message) console.log(import_chalk11.default.red(`  ${result.message}`));
  if (result.submissionId) console.log(DIM(`  https://leetcode.com/submissions/detail/${result.submissionId}/`));
}
async function doStats() {
  try {
    const stats = getStats();
    console.log("");
    console.log(import_chalk11.default.bold.magenta("  \u2554\u2550\u2550 Stats \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
    console.log(`  ${import_chalk11.default.white("Attempts")}    ${stats.totalAttempts}`);
    console.log(`  ${import_chalk11.default.green("Solved")}      ${stats.solvedCount}  ${import_chalk11.default.gray(`(${stats.solvedByDifficulty.Easy}E / ${stats.solvedByDifficulty.Medium}M / ${stats.solvedByDifficulty.Hard}H)`)}`);
    console.log(`  ${import_chalk11.default.yellow("Accept Rate")} ${stats.acceptanceRate}`);
    if (stats.recentAccepted.length > 0) {
      console.log(`  ${import_chalk11.default.white("Recent")}      ${stats.recentAccepted.slice(0, 3).map((r) => r.title).join(", ")}`);
    }
    console.log(import_chalk11.default.bold.magenta("  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
    console.log("");
  } catch (err) {
    console.log(import_chalk11.default.yellow(`  No stats yet.`));
  }
}
async function doCompanies(args) {
  const company = args.trim() || void 0;
  try {
    companiesCommand(company, {
      limit: "50",
      all: false
    });
    console.log("");
  } catch (err) {
    console.log(import_chalk11.default.red(`  ${err instanceof Error ? err.message : err}`));
  }
}
async function doConfig() {
  const config = loadConfig();
  const secrets = loadSecrets();
  console.log("");
  console.log(import_chalk11.default.bold.magenta("  \u2554\u2550\u2550 Config \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557"));
  for (const [k, v] of Object.entries(config)) {
    console.log(`  ${import_chalk11.default.white(k.padEnd(20))} ${import_chalk11.default.cyan(String(v))}`);
  }
  console.log(`  ${import_chalk11.default.white("authenticated".padEnd(20))} ${secrets ? import_chalk11.default.green("yes") : import_chalk11.default.red("no")}`);
  console.log(import_chalk11.default.bold.magenta("  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D"));
  console.log(DIM("  config set <key> <value>  to change"));
  console.log("");
}
async function doConfigSet(args) {
  const parts = args.split(/\s+/);
  if (parts.length < 2) {
    console.log(import_chalk11.default.yellow("  Usage: config set <key> <value>"));
    return;
  }
  const [key, ...valueParts] = parts;
  const value = valueParts.join(" ");
  try {
    updateConfig(key, value);
    console.log(import_chalk11.default.green(`  \u2713 ${key} = ${value}`));
  } catch (err) {
    console.log(import_chalk11.default.red(`  ${err instanceof Error ? err.message : err}`));
  }
}
async function doLogin() {
  const readline2 = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => readline2.question(q, (a) => {
    readline2.close();
    r(a.trim());
  }));
  console.log("");
  console.log(import_chalk11.default.yellow("  Enter your LeetCode session cookies:"));
  console.log(DIM("  (DevTools \u2192 Application \u2192 Cookies \u2192 leetcode.com)"));
  const readline22 = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  const ask2 = (q) => new Promise((r) => readline22.question(q, (a) => r(a.trim())));
  const session = await ask2(PURPLE("  LEETCODE_SESSION: "));
  const csrf = await ask2(PURPLE("  csrftoken: "));
  readline22.close();
  if (!session || !csrf) {
    console.log(import_chalk11.default.red("  Both required."));
    return;
  }
  saveSecrets(session, csrf);
  try {
    const viewer = await getViewer();
    console.log(import_chalk11.default.green(`  \u2713 Logged in as ${viewer.username} (${viewer.solvedCount} solved)`));
  } catch (err) {
    console.log(import_chalk11.default.red(`  Verification failed: ${err instanceof Error ? err.message : err}`));
  }
}
async function doListWorkspace() {
  const wsPath = loadConfig().workspacePath.replace("~", require("os").homedir());
  const solDir = import_path8.default.join(import_path8.default.resolve(wsPath), "solutions");
  if (!import_fs_extra8.default.existsSync(solDir)) {
    console.log(import_chalk11.default.gray("  No solutions yet. Use 'open <slug>' to start."));
    return;
  }
  const dirs = import_fs_extra8.default.readdirSync(solDir).filter((d) => {
    const p = import_path8.default.join(solDir, d);
    return import_fs_extra8.default.statSync(p).isDirectory();
  });
  if (dirs.length === 0) {
    console.log(import_chalk11.default.gray("  No solutions yet."));
    return;
  }
  console.log("");
  for (const d of dirs) {
    const metaPath = import_path8.default.join(solDir, d, "metadata.json");
    if (import_fs_extra8.default.existsSync(metaPath)) {
      const meta = import_fs_extra8.default.readJsonSync(metaPath);
      const active = lastDetectedProblem?.slug === d ? import_chalk11.default.green(" \u25B6") : "  ";
      console.log(`${active} ${import_chalk11.default.white(meta.title.padEnd(30))} ${import_chalk11.default.gray(`#${meta.frontendId}`)} ${meta.difficulty === "Easy" ? import_chalk11.default.green(meta.difficulty) : meta.difficulty === "Medium" ? import_chalk11.default.yellow(meta.difficulty) : import_chalk11.default.red(meta.difficulty)}`);
    }
  }
  console.log("");
}
function showHelp() {
  console.log("");
  console.log(import_chalk11.default.bold.magenta("  LCX Commands"));
  console.log(import_chalk11.default.gray("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"));
  console.log(`  ${PURPLE("d")}  dashboard    Show dashboard + problems`);
  console.log(`  ${PURPLE("p")}  problems     List problems [easy|medium|hard] [solved|unsolved]`);
  console.log(`  ${PURPLE("s")}  search <q>   Search problems`);
  console.log(`  ${PURPLE("o")}  open <slug>  Open problem workspace`);
  console.log(`  ${PURPLE("r")}  run          Run code on LeetCode`);
  console.log(`  ${PURPLE("sub")} submit      Submit code to LeetCode`);
  console.log(`  ${PURPLE("st")} stats       Show your stats`);
  console.log(`  ${PURPLE("co")} companies   Browse company workbook sheets`);
  console.log(`  ${PURPLE("c")}  config      View config  |  config set <k> <v>`);
  console.log(`  ${PURPLE("login")}          Authenticate`);
  console.log(`  ${PURPLE("logout")}         Clear credentials`);
  console.log(`  ${PURPLE("ls")}            List local solutions`);
  console.log(`  ${PURPLE("clear")}         Clear screen`);
  console.log(`  ${PURPLE("q")}  quit        Exit LCX`);
  console.log("");
  console.log(DIM("  Enter an empty line to refresh the dashboard."));
  console.log("");
}

// src/cli/router.ts
function createRouter() {
  const program = new import_commander.Command();
  program.name("lcx").description("LCX \u2014 LeetCode Terminal Client").version("0.1.0");
  program.action(async () => {
    await startRepl();
  });
  program.command("login").description("Authenticate with LeetCode using session cookies").option("--force", "Skip browser auto-detection, go straight to manual input").action(async (options) => {
    await loginCommand({ force: options.force });
  });
  program.command("problems").description("Browse and filter LeetCode problems").option("--difficulty <d>", "Filter by difficulty: easy, medium, hard").option("--tag <tag>", "Filter by topic tag").option("--status <s>", "Filter by status: solved, unsolved").option("--limit <n>", "Limit the number of results").action(async (options) => {
    await problemsCommand(options);
  });
  program.command("search <query>").description("Search LeetCode problems by name or keyword").option("--limit <n>", "Limit results", "20").action(async (query, options) => {
    await searchCommand(query, options);
  });
  program.command("open <slug>").description("Open a problem workspace").option("--language <lang>", "Language for the solution template").option("--no-editor", "Skip opening the editor").option("--json", "Emit JSON for machine consumers").action(async (slug, options) => {
    await openCommand(slug, options);
  });
  program.command("run").description("Run code against LeetCode test cases").option("--testcase <path>", "Path to custom test case file").action(async (options) => {
    await runCommand(options);
  });
  program.command("submit").description("Submit code to LeetCode for final judgment").action(async () => {
    await submitCommand();
  });
  program.command("stats").description("Show local stats from SQLite").option("--topic <t>", "Filter by topic").option("--difficulty <d>", "Filter by difficulty").option("--json", "Emit JSON for machine consumers").action((options) => {
    statsCommand(options);
  });
  program.command("companies [company]").description("Browse the company workbook or open a specific sheet").option("--file <path>", "Path to the workbook").option("--limit <n>", "Limit questions shown for a sheet", "50").option("--all", "Show every question in a sheet").option("--json", "Emit JSON for machine consumers").action((company, options) => {
    companiesCommand(company, options);
  });
  program.command("config").description("View or update configuration").action(() => {
    configCommand({});
  });
  program.command("config:set <key> <value>").description("Set a configuration value").action((key, value) => {
    configCommand({ set: [key, value] });
  });
  return program;
}

// src/index.ts
async function main() {
  const program = createRouter();
  process.on("exit", () => {
    closeDb();
  });
  process.on("SIGINT", () => {
    closeDb();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    closeDb();
    process.exit(0);
  });
  await program.parseAsync(process.argv);
}
main().catch((error) => {
  console.error("LCX Error:", error.message || error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map