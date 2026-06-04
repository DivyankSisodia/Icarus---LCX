import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as cp from "child_process";
import { getWebviewContent } from "./webview";

let activeProblem: {
  slug: string;
  dir: string;
  solutionPath: string;
  language: string;
} | null = null;

// Helper to strip ANSI codes from child process output
function stripAnsi(str: string): string {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new IcarusProblemViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "icarus-sidebar-view",
      provider
    )
  );

  // Command to manually open the sidebar description
  context.subscriptions.push(
    vscode.commands.registerCommand("lcx.showProblemDescription", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.icarus");
      provider.refresh();
    })
  );

  // Commands to Run and Submit via command palette
  context.subscriptions.push(
    vscode.commands.registerCommand("lcx.run", () => {
      provider.runLcxCommand("run");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lcx.submit", () => {
      provider.runLcxCommand("submit");
    })
  );

  // Listen to active text editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        provider.checkActiveEditor(editor.document.fileName);
      }
    })
  );

  // Initial check on startup
  if (vscode.window.activeTextEditor) {
    provider.checkActiveEditor(
      vscode.window.activeTextEditor.document.fileName
    );
  }
}

class IcarusProblemViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    this.updateWebview();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "run":
          this.runLcxCommand("run");
          break;
        case "submit":
          this.runLcxCommand("submit");
          break;
      }
    });
  }

  public refresh() {
    this.updateWebview();
  }

  // Check if opened file is inside the local solutions folder and load problem.json
  public checkActiveEditor(filePath: string) {
    const parentDir = path.dirname(filePath);
    const metaPath = path.join(parentDir, "metadata.json");
    const problemJsonPath = path.join(parentDir, "problem.json");

    const fileName = path.basename(filePath);
    const isSolutionFile =
      fileName.startsWith("solution.latest.") ||
      fileName.startsWith("solution.accepted-submit.");

    if (isSolutionFile && fs.existsSync(metaPath)) {
      try {
        const metadata = fs.readJsonSync(metaPath);
        activeProblem = {
          slug: metadata.titleSlug,
          dir: parentDir,
          solutionPath: filePath,
          language: metadata.language,
        };
        this.updateWebview();
      } catch (err) {
        console.error("Failed to read metadata.json:", err);
      }
    }
  }

  private updateWebview() {
    if (!this._view) {
      return;
    }

    if (!activeProblem) {
      this._view.webview.html = getWebviewContent(null);
      return;
    }

    const problemJsonPath = path.join(activeProblem.dir, "problem.json");
    const metaPath = path.join(activeProblem.dir, "metadata.json");

    try {
      if (fs.existsSync(problemJsonPath)) {
        const problemData = fs.readJsonSync(problemJsonPath);
        this._view.webview.html = getWebviewContent(problemData);
      } else if (fs.existsSync(metaPath)) {
        // Fallback if full problem.json is missing but metadata is there
        const metadata = fs.readJsonSync(metaPath);
        this._view.webview.html = getWebviewContent({
          frontendId: metadata.frontendId,
          title: metadata.title,
          titleSlug: metadata.titleSlug,
          difficulty: metadata.difficulty,
          likes: 0,
          dislikes: 0,
          topicTags: metadata.topicTags || [],
          description: `<p>Problem statement is not cached locally. Run <code>lcx open ${metadata.titleSlug}</code> in the terminal to download it.</p>`,
          hints: [],
        });
      }
    } catch (err) {
      this._view.webview.html = getWebviewContent(null);
    }
  }

  // Spawn the CLI to execute "run" or "submit" commands.
  public runLcxCommand(type: "run" | "submit") {
    if (!activeProblem) {
      vscode.window.showErrorMessage("No active LeetCode solution file is open.");
      return;
    }

    if (!this._view) {
      return;
    }

    const webview = this._view.webview;

    // Resolve the bundled CLI entry point (dist/index.js).
    // 1. First try relative to extension directory (works in development or package layout)
    let cliPath = path.resolve(__dirname, "..", "..", "dist", "index.js");
    if (!fs.existsSync(cliPath)) {
      // 2. Try directly resolving in /Users/divyanksisodia/lcx/dist/index.js (local workspace)
      cliPath = "/Users/divyanksisodia/lcx/dist/index.js";
    }

    if (!fs.existsSync(cliPath)) {
      webview.postMessage({
        command: "error",
        text: `Icarus CLI executable not found at: ${cliPath}. Please build the CLI project by running "npm run build" in the root directory first.`,
      });
      return;
    }

    // Spawn node CLI command
    const child = cp.spawn("node", [cliPath, type], {
      cwd: activeProblem.dir,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    let outputBuffer = "";

    child.stdout.on("data", (data) => {
      const text = stripAnsi(data.toString());
      outputBuffer += text;
      webview.postMessage({ command: "log", text });
    });

    child.stderr.on("data", (data) => {
      const text = stripAnsi(data.toString());
      outputBuffer += text;
      webview.postMessage({ command: "log", text });
    });

    child.on("close", (code) => {
      const success =
        code === 0 &&
        (outputBuffer.includes("Accepted") ||
          outputBuffer.includes("✔") ||
          outputBuffer.includes("Compilation Success"));

      webview.postMessage({
        command: "result",
        success,
        output: outputBuffer,
      });
    });

    child.on("error", (err) => {
      webview.postMessage({
        command: "error",
        text: err.message,
      });
    });
  }
}

export function deactivate() {}
