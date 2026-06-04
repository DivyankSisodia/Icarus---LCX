import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import * as cp from "child_process";
import { getWebviewContent } from "./webview";
import { CompanyExplorerPanel } from "./companyExplorer";
import { EmptySidebarState } from "./sidebarEmptyState";
import { resolveCliPath, runCliJsonCommand, stripAnsi } from "./cliRunner";

let activeProblem: {
  slug: string;
  dir: string;
  solutionPath: string;
  language: string;
} | null = null;

interface OpenProblemResult {
  title: string;
  titleSlug: string;
  frontendId: string;
  difficulty: string;
  dir: string;
  solutionPath: string;
  paidOnly: boolean;
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

  context.subscriptions.push(
    vscode.commands.registerCommand("lcx.showStats", async () => {
      await CompanyExplorerPanel.show(context.extensionUri, "stats");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("lcx.showCompanies", async () => {
      await CompanyExplorerPanel.show(context.extensionUri, "companies");
    })
  );

  // Listen to active text editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        provider.checkActiveEditor(editor.document.fileName);
      } else {
        provider.clearActiveProblem();
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
  private emptyStateMode: EmptySidebarState["mode"] = "home";
  private emptyStateSummary: EmptySidebarState["summary"] = null;
  private emptyStateSelectedCompany: EmptySidebarState["selectedCompany"] = null;
  private emptyStateLoadingLabel: EmptySidebarState["loadingLabel"] = null;
  private emptyStateErrorMessage: EmptySidebarState["errorMessage"] = null;

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
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "run":
          this.runLcxCommand("run");
          break;
        case "submit":
          this.runLcxCommand("submit");
          break;
        case "browseCompanies":
          await this.showCompanyBrowser();
          break;
        case "backHome":
          this.goBackHome();
          break;
        case "backCompanies":
          this.goBackToCompanies();
          break;
        case "selectCompany":
          if (typeof message.companyName === "string" && message.companyName) {
            await this.selectCompany(message.companyName);
          }
          break;
        case "openProblem":
          if (typeof message.slug === "string" && message.slug) {
            await this.openProblemFromSidebar(message.slug);
          }
          break;
      }
    });
  }

  public refresh() {
    this.updateWebview();
  }

  public clearActiveProblem() {
    if (!activeProblem) {
      this.updateWebview();
      return;
    }

    activeProblem = null;
    this.updateWebview();
  }

  // Check if opened file is inside the local solutions folder and load problem.json
  public checkActiveEditor(filePath: string) {
    const parentDir = path.dirname(filePath);
    const metaPath = path.join(parentDir, "metadata.json");

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
        activeProblem = null;
        console.error("Failed to read metadata.json:", err);
        this.updateWebview();
      }
      return;
    }

    activeProblem = null;
    this.updateWebview();
  }

  private updateWebview() {
    if (!this._view) {
      return;
    }

    if (!activeProblem) {
      this._view.webview.html = getWebviewContent(
        null,
        this.getEmptyState()
      );
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
      this._view.webview.html = getWebviewContent(
        null,
        this.getEmptyState()
      );
    }
  }

  private getEmptyState(): EmptySidebarState {
    return {
      mode: this.emptyStateMode,
      summary: this.emptyStateSummary,
      selectedCompany: this.emptyStateSelectedCompany,
      loadingLabel: this.emptyStateLoadingLabel,
      errorMessage: this.emptyStateErrorMessage,
    };
  }

  private async showCompanyBrowser() {
    this.emptyStateMode = "companies";
    this.emptyStateErrorMessage = null;

    if (this.emptyStateSummary) {
      this.updateWebview();
      return;
    }

    this.emptyStateLoadingLabel = "Loading company workbook...";
    this.updateWebview();

    try {
      this.emptyStateSummary = (await runCliJsonCommand([
        "companies",
        "--json",
      ])) as EmptySidebarState["summary"];
    } catch (error) {
      this.emptyStateErrorMessage =
        error instanceof Error ? error.message : String(error);
      this.emptyStateMode = "home";
    } finally {
      this.emptyStateLoadingLabel = null;
      this.updateWebview();
    }
  }

  private goBackHome() {
    this.emptyStateMode = "home";
    this.emptyStateSelectedCompany = null;
    this.emptyStateLoadingLabel = null;
    this.emptyStateErrorMessage = null;
    this.updateWebview();
  }

  private goBackToCompanies() {
    this.emptyStateMode = "companies";
    this.emptyStateSelectedCompany = null;
    this.emptyStateLoadingLabel = null;
    this.emptyStateErrorMessage = null;
    this.updateWebview();
  }

  private async selectCompany(companyName: string) {
    this.emptyStateLoadingLabel = `Loading ${companyName} questions...`;
    this.emptyStateErrorMessage = null;
    this.updateWebview();

    try {
      const payload = (await runCliJsonCommand([
        "companies",
        companyName,
        "--json",
        "--all",
      ])) as { sheet: EmptySidebarState["selectedCompany"] };

      this.emptyStateSelectedCompany = payload.sheet;
      this.emptyStateMode = "problems";
    } catch (error) {
      this.emptyStateErrorMessage =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.emptyStateLoadingLabel = null;
      this.updateWebview();
    }
  }

  private async openProblemFromSidebar(slug: string) {
    this.emptyStateLoadingLabel = `Opening ${slug}...`;
    this.emptyStateErrorMessage = null;
    this.updateWebview();

    try {
      const result = (await runCliJsonCommand([
        "open",
        slug,
        "--json",
        "--no-editor",
      ])) as OpenProblemResult;

      const document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(result.solutionPath)
      );
      await vscode.window.showTextDocument(document, { preview: false });
    } catch (error) {
      this.emptyStateErrorMessage =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.emptyStateLoadingLabel = null;
      this.updateWebview();
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

    let cliPath: string;
    try {
      cliPath = resolveCliPath();
    } catch (error) {
      webview.postMessage({
        command: "error",
        text:
          error instanceof Error ? error.message : "LCX CLI executable not found.",
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
