import * as vscode from "vscode";
import { runCliJsonCommand } from "./cliRunner";

type ExplorerTab = "stats" | "companies";

interface StatsData {
  totalAttempts: number;
  solvedCount: number;
  solvedByDifficulty: { Easy: number; Medium: number; Hard: number };
  acceptanceRate: string;
  mostAttempted: { slug: string; title: string; count: number }[];
  recentAccepted: { slug: string; title: string; solved_at: string }[];
}

interface WorkbookSheetSummary {
  name: string;
  kind: "company" | "difficulty";
  totalQuestions: number;
  companyQuestions: number;
  dailyQuestions: number;
}

interface WorkbookSummary {
  workbookPath: string;
  sheetCount: number;
  totalQuestions: number;
  companySheets: WorkbookSheetSummary[];
  difficultySheets: WorkbookSheetSummary[];
  sheets: WorkbookSheetSummary[];
}

interface WorkbookQuestion {
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

interface WorkbookSheetDetail extends WorkbookSheetSummary {
  questions: WorkbookQuestion[];
}

interface ExplorerState {
  activeTab: ExplorerTab;
  stats: StatsData | null;
  summary: WorkbookSummary | null;
  selectedSheet: WorkbookSheetDetail | null;
  loadingSheet: string | null;
  errorMessage: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function badgeClass(kind: "company" | "difficulty"): string {
  return kind === "company" ? "company" : "difficulty";
}

function renderStatsCards(stats: StatsData): string {
  return `
    <div class="stats-grid">
      <div class="card stat-card accent-green">
        <div class="label">Solved</div>
        <div class="value">${formatNumber(stats.solvedCount)}</div>
        <div class="meta">${stats.solvedByDifficulty.Easy} Easy · ${stats.solvedByDifficulty.Medium} Medium · ${stats.solvedByDifficulty.Hard} Hard</div>
      </div>
      <div class="card stat-card accent-cyan">
        <div class="label">Attempts</div>
        <div class="value">${formatNumber(stats.totalAttempts)}</div>
        <div class="meta">Acceptance ${escapeHtml(stats.acceptanceRate)}</div>
      </div>
      <div class="card stat-card accent-amber">
        <div class="label">Most Attempted</div>
        <div class="value">${stats.mostAttempted.length}</div>
        <div class="meta">Tracked locally</div>
      </div>
    </div>
  `;
}

function renderMostAttempted(stats: StatsData): string {
  if (stats.mostAttempted.length === 0) {
    return `<p class="empty-note">No attempt history yet.</p>`;
  }

  return `
    <div class="mini-list">
      ${stats.mostAttempted
        .map(
          (item) => `
            <div class="mini-row">
              <div>
                <div class="mini-title">${escapeHtml(item.title)}</div>
                <div class="mini-subtitle">${escapeHtml(item.slug)}</div>
              </div>
              <div class="mini-pill">${item.count}x</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRecentAccepted(stats: StatsData): string {
  if (stats.recentAccepted.length === 0) {
    return `<p class="empty-note">No accepted submissions yet.</p>`;
  }

  return `
    <div class="mini-list">
      ${stats.recentAccepted
        .map(
          (item) => `
            <div class="mini-row">
              <div>
                <div class="mini-title">${escapeHtml(item.title)}</div>
                <div class="mini-subtitle">${escapeHtml(item.slug)}</div>
              </div>
              <div class="mini-pill success">Accepted</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderWorkbookCards(summary: WorkbookSummary): string {
  return `
    <div class="stats-grid">
      <div class="card stat-card accent-violet">
        <div class="label">Sheets</div>
        <div class="value">${formatNumber(summary.sheetCount)}</div>
        <div class="meta">${summary.companySheets.length} company · ${summary.difficultySheets.length} difficulty</div>
      </div>
      <div class="card stat-card accent-blue">
        <div class="label">Questions</div>
        <div class="value">${formatNumber(summary.totalQuestions)}</div>
        <div class="meta">Across the workbook</div>
      </div>
      <div class="card stat-card accent-orange">
        <div class="label">Company Sheets</div>
        <div class="value">${formatNumber(summary.companySheets.length)}</div>
        <div class="meta">Browsable sheets</div>
      </div>
    </div>
  `;
}

function renderSheetList(summary: WorkbookSummary): string {
  return `
    <div class="sheet-toolbar">
      <input
        class="search"
        id="sheet-filter"
        type="search"
        placeholder="Filter companies or difficulty sheets"
      />
      <div class="sheet-hint">${formatNumber(summary.sheets.length)} sheets</div>
    </div>
    <div class="sheet-grid" id="sheet-grid">
      ${summary.sheets
        .map(
          (sheet) => `
            <button
              class="sheet-card"
              data-sheet="${escapeHtml(sheet.name)}"
              data-search="${escapeHtml(`${sheet.name} ${sheet.kind} ${sheet.totalQuestions} ${sheet.companyQuestions} ${sheet.dailyQuestions}`.toLowerCase())}"
              type="button"
            >
              <div class="sheet-card-header">
                <span class="sheet-name">${escapeHtml(sheet.name)}</span>
                <span class="sheet-badge ${badgeClass(sheet.kind)}">${sheet.kind}</span>
              </div>
              <div class="sheet-count">${sheet.kind === "company" ? `${sheet.companyQuestions} company questions` : `${sheet.totalQuestions} questions`}</div>
              ${sheet.dailyQuestions > 0 ? `<div class="sheet-meta">${sheet.dailyQuestions} daily question${sheet.dailyQuestions === 1 ? "" : "s"}</div>` : ""}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSelectedSheet(sheet: WorkbookSheetDetail): string {
  return `
    <div class="selected-sheet">
      <div class="sheet-toolbar compact">
        <div>
          <div class="selected-title">${escapeHtml(sheet.name)}</div>
          <div class="selected-subtitle">${sheet.companyQuestions} company questions${sheet.dailyQuestions > 0 ? ` · ${sheet.dailyQuestions} daily` : ""}</div>
        </div>
        <div class="sheet-actions">
          <input
            class="search"
            id="question-filter"
            type="search"
            placeholder="Filter questions"
          />
          <button class="ghost-button" data-action="back" type="button">Back</button>
        </div>
      </div>

      <div class="question-list" id="question-list">
        ${sheet.questions
          .map(
            (question) => `
              <article
                class="question-row"
                data-search="${escapeHtml(`${question.title} ${question.slug} ${question.topic || ""} ${question.difficulty || ""}`.toLowerCase())}"
              >
                <div class="question-main">
                  <div class="question-title">
                    ${question.isDailyQuestion ? '<span class="sheet-badge daily">daily</span>' : ""}
                    <span>${escapeHtml(question.title)}</span>
                  </div>
                  <div class="question-meta">
                    <span>${escapeHtml(question.slug)}</span>
                    ${question.topic ? `<span>${escapeHtml(question.topic)}</span>` : ""}
                    ${question.difficulty ? `<span>${escapeHtml(question.difficulty)}</span>` : ""}
                    <span>#${question.rowNumber}</span>
                  </div>
                </div>
                <button class="open-link" data-url="${escapeHtml(question.url)}" type="button">Open</button>
              </article>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    <div class="error-card">
      <div class="error-title">Workbook unavailable</div>
      <div class="error-message">${escapeHtml(message)}</div>
      <div class="error-help">
        Set the workbook path once with:
        <code>lcx config set companyWorkbookPath /path/to/Leetcode problem set (company tag, sorted by freq).xlsx</code>
      </div>
    </div>
  `;
}

export function getCompanyExplorerContent(state: ExplorerState): string {
  const hasData = Boolean(state.stats && state.summary);
  const statsSection = state.stats
    ? `
      <section class="panel-section" id="panel-stats" ${state.activeTab === "stats" ? "" : 'hidden'}>
        <div class="section-header">
          <h2>Stats</h2>
          <span class="section-chip">Local + workbook overview</span>
        </div>
        ${renderStatsCards(state.stats)}
        <div class="card stack-card">
          <h3>Attempted Problems</h3>
          ${renderMostAttempted(state.stats)}
        </div>
        <div class="card stack-card">
          <h3>Recent Accepted</h3>
          ${renderRecentAccepted(state.stats)}
        </div>
      </section>
    `
    : "";

  const companiesSection = state.summary
    ? `
      <section class="panel-section" id="panel-companies" ${state.activeTab === "companies" ? "" : 'hidden'}>
        <div class="section-header">
          <h2>Companies</h2>
          <span class="section-chip">${formatNumber(state.summary.companySheets.length)} company sheets</span>
        </div>
        ${renderWorkbookCards(state.summary)}
        ${state.loadingSheet ? `<div class="loading-pill">Loading ${escapeHtml(state.loadingSheet)}...</div>` : ""}
        ${
          state.selectedSheet
            ? `<div class="card stack-card">${renderSelectedSheet(state.selectedSheet)}</div>`
            : `<div class="card stack-card">${renderSheetList(state.summary)}</div>`
        }
      </section>
    `
    : "";

  const title = state.errorMessage
    ? "LCX Workbook Explorer"
    : hasData
      ? `LCX Workbook Explorer · ${state.summary?.sheetCount ?? 0} sheets`
      : "LCX Workbook Explorer";

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          --bg: var(--vscode-sideBar-background);
          --bg-elevated: color-mix(in srgb, var(--vscode-editor-background) 86%, transparent);
          --border: color-mix(in srgb, var(--vscode-foreground) 12%, transparent);
          --text: var(--vscode-foreground);
          --muted: var(--vscode-descriptionForeground);
          --accent: var(--vscode-button-background);
          --accent-strong: var(--vscode-button-hoverBackground);
        }

        body {
          margin: 0;
          padding: 18px;
          background:
            radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 14%, transparent), transparent 34%),
            linear-gradient(180deg, color-mix(in srgb, var(--bg) 94%, black) 0%, var(--bg) 100%);
          color: var(--text);
          font-family: var(--vscode-font-family, system-ui, sans-serif);
        }

        * {
          box-sizing: border-box;
        }

        button,
        input {
          font: inherit;
        }

        .shell {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .hero {
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 18px;
          background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated) 92%, transparent), color-mix(in srgb, var(--accent) 6%, transparent));
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.14);
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
        }

        .subtitle {
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .tab-button,
        .ghost-button {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: color-mix(in srgb, var(--bg-elevated) 90%, transparent);
          color: var(--text);
          padding: 8px 14px;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .tab-button:hover,
        .ghost-button:hover,
        .sheet-card:hover,
        .open-link:hover {
          transform: translateY(-1px);
          border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
        }

        .tab-button.active {
          background: color-mix(in srgb, var(--accent) 20%, var(--bg-elevated));
          border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
        }

        .panel-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .section-header h2,
        .stack-card h3 {
          margin: 0;
          font-size: 16px;
        }

        .section-chip {
          border-radius: 999px;
          padding: 5px 10px;
          border: 1px solid var(--border);
          font-size: 12px;
          color: var(--muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
        }

        .card {
          border: 1px solid var(--border);
          border-radius: 18px;
          background: color-mix(in srgb, var(--bg-elevated) 94%, transparent);
        }

        .stat-card {
          padding: 16px;
        }

        .stat-card .label {
          color: var(--muted);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .stat-card .value {
          margin-top: 10px;
          font-size: 28px;
          font-weight: 700;
        }

        .stat-card .meta {
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
        }

        .accent-green { box-shadow: inset 0 1px 0 rgba(34, 197, 94, 0.14); }
        .accent-cyan { box-shadow: inset 0 1px 0 rgba(6, 182, 212, 0.14); }
        .accent-amber { box-shadow: inset 0 1px 0 rgba(245, 158, 11, 0.14); }
        .accent-violet { box-shadow: inset 0 1px 0 rgba(139, 92, 246, 0.14); }
        .accent-blue { box-shadow: inset 0 1px 0 rgba(59, 130, 246, 0.14); }
        .accent-orange { box-shadow: inset 0 1px 0 rgba(249, 115, 22, 0.14); }

        .stack-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mini-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
          background: color-mix(in srgb, var(--bg) 78%, transparent);
        }

        .mini-title,
        .selected-title {
          font-weight: 600;
        }

        .mini-subtitle,
        .selected-subtitle,
        .empty-note,
        .sheet-meta,
        .sheet-count {
          color: var(--muted);
          font-size: 12px;
        }

        .mini-pill,
        .sheet-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--accent) 10%, transparent);
        }

        .mini-pill.success,
        .sheet-badge.company {
          background: color-mix(in srgb, #22c55e 18%, transparent);
        }

        .sheet-badge.difficulty {
          background: color-mix(in srgb, #f59e0b 18%, transparent);
        }

        .sheet-badge.daily {
          background: color-mix(in srgb, #10b981 18%, transparent);
        }

        .sheet-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sheet-toolbar.compact {
          align-items: flex-start;
        }

        .search {
          flex: 1;
          min-width: 220px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg) 84%, transparent);
          color: var(--text);
          padding: 10px 12px;
          outline: none;
        }

        .search:focus {
          border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 18%, transparent);
        }

        .sheet-hint {
          color: var(--muted);
          font-size: 12px;
        }

        .sheet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .sheet-card {
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          text-align: left;
          background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
          color: var(--text);
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease;
        }

        .sheet-card-header,
        .question-title,
        .question-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sheet-name {
          font-weight: 600;
        }

        .sheet-count {
          margin-top: 8px;
        }

        .question-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 60vh;
          overflow: auto;
          padding-right: 2px;
        }

        .question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 14px;
          background: color-mix(in srgb, var(--bg) 84%, transparent);
        }

        .question-main {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .question-title {
          font-weight: 600;
        }

        .question-meta {
          color: var(--muted);
          font-size: 12px;
        }

        .open-link {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--text);
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .selected-sheet {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sheet-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ghost-button {
          white-space: nowrap;
        }

        .loading-pill {
          align-self: flex-start;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 6px 10px;
          color: var(--muted);
          font-size: 12px;
          background: color-mix(in srgb, var(--accent) 8%, transparent);
        }

        .error-card {
          border: 1px solid color-mix(in srgb, #ef4444 38%, var(--border));
          background: color-mix(in srgb, #ef4444 9%, var(--bg-elevated));
          border-radius: 18px;
          padding: 18px;
        }

        .error-title {
          font-weight: 700;
          font-size: 16px;
        }

        .error-message,
        .error-help {
          margin-top: 8px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .error-help code {
          display: block;
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--bg) 78%, transparent);
          color: var(--text);
          overflow: auto;
        }

        [hidden] {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <header class="hero">
          <div class="eyebrow">LCX Workbook Explorer</div>
          <h1>${escapeHtml(title)}</h1>
          <div class="subtitle">
            ${state.summary ? `Loaded ${formatNumber(state.summary.sheetCount)} sheets from <code>${escapeHtml(state.summary.workbookPath)}</code>` : "Connect the workbook path in your LCX config to browse companies and sheet stats."}
          </div>
          <div class="tabs">
            <button class="tab-button ${state.activeTab === "stats" ? "active" : ""}" data-tab="stats" type="button">Stats</button>
            <button class="tab-button ${state.activeTab === "companies" ? "active" : ""}" data-tab="companies" type="button">Companies</button>
            <button class="tab-button" data-tab="refresh" type="button">Refresh</button>
          </div>
        </header>

        ${state.errorMessage ? renderError(state.errorMessage) : ""}
        ${statsSection}
        ${companiesSection}
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        document.querySelectorAll('[data-tab]').forEach((button) => {
          button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            if (tab === 'refresh') {
              vscode.postMessage({ command: 'refresh' });
              return;
            }
            vscode.postMessage({ command: 'switchTab', tab });
          });
        });

        document.querySelectorAll('[data-sheet]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({ command: 'loadSheet', sheetName: button.getAttribute('data-sheet') });
          });
        });

        document.querySelectorAll('[data-url]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({ command: 'openUrl', url: button.getAttribute('data-url') });
          });
        });

        const backButton = document.querySelector('[data-action="back"]');
        if (backButton) {
          backButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearSheet' });
          });
        }

        const sheetFilter = document.getElementById('sheet-filter');
        if (sheetFilter) {
          sheetFilter.addEventListener('input', () => {
            const term = sheetFilter.value.trim().toLowerCase();
            document.querySelectorAll('[data-search]').forEach((card) => {
              const text = card.getAttribute('data-search') || '';
              card.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }

        const questionFilter = document.getElementById('question-filter');
        if (questionFilter) {
          questionFilter.addEventListener('input', () => {
            const term = questionFilter.value.trim().toLowerCase();
            document.querySelectorAll('#question-list [data-search]').forEach((row) => {
              const text = row.getAttribute('data-search') || '';
              row.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }
      </script>
    </body>
  </html>`;
}

export class CompanyExplorerPanel {
  private static currentPanel: CompanyExplorerPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private state: ExplorerState = {
    activeTab: "stats",
    stats: null,
    summary: null,
    selectedSheet: null,
    loadingSheet: null,
    errorMessage: null,
  };
  private disposed = false;

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly extensionUri: vscode.Uri,
    initialTab: ExplorerTab
  ) {
    this.panel = panel;
    this.state.activeTab = initialTab;

    this.panel.onDidDispose(() => {
      this.disposed = true;
      if (CompanyExplorerPanel.currentPanel === this) {
        CompanyExplorerPanel.currentPanel = undefined;
      }
    });

    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "switchTab":
          this.state.activeTab = message.tab === "companies" ? "companies" : "stats";
          this.render();
          break;
        case "loadSheet":
          if (typeof message.sheetName === "string" && message.sheetName.trim()) {
            await this.loadSheet(message.sheetName.trim());
          }
          break;
        case "clearSheet":
          this.state.selectedSheet = null;
          this.state.loadingSheet = null;
          this.state.errorMessage = null;
          this.render();
          break;
        case "openUrl":
          if (typeof message.url === "string" && message.url) {
            vscode.env.openExternal(vscode.Uri.parse(message.url));
          }
          break;
        case "refresh":
          await this.refresh();
          break;
      }
    });
  }

  public static async show(
    extensionUri: vscode.Uri,
    initialTab: ExplorerTab
  ): Promise<void> {
    if (CompanyExplorerPanel.currentPanel) {
      CompanyExplorerPanel.currentPanel.state.activeTab = initialTab;
      CompanyExplorerPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      CompanyExplorerPanel.currentPanel.render();
      await CompanyExplorerPanel.currentPanel.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "lcxWorkbookExplorer",
      "LCX Workbook Explorer",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    CompanyExplorerPanel.currentPanel = new CompanyExplorerPanel(
      panel,
      extensionUri,
      initialTab
    );
    await CompanyExplorerPanel.currentPanel.refresh();
  }

  private async refresh(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.state.loadingSheet = null;
    this.state.errorMessage = null;

    try {
      const [stats, summary] = await Promise.all([
        runCliJsonCommand(["stats", "--json"]),
        runCliJsonCommand(["companies", "--json"]),
      ]);

      this.state.stats = stats as StatsData;
      this.state.summary = summary as WorkbookSummary;
      this.render();
    } catch (error) {
      this.state.stats = null;
      this.state.summary = null;
      this.state.selectedSheet = null;
      this.state.errorMessage =
        error instanceof Error ? error.message : String(error);
      this.render();
    }
  }

  private async loadSheet(sheetName: string): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.state.loadingSheet = sheetName;
    this.state.errorMessage = null;
    this.render();

    try {
      const payload = (await runCliJsonCommand([
        "companies",
        sheetName,
        "--json",
        "--all",
      ])) as { sheet: WorkbookSheetDetail };

      this.state.selectedSheet = payload.sheet;
      this.state.activeTab = "companies";
      this.render();
    } catch (error) {
      this.state.selectedSheet = null;
      this.state.errorMessage =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.state.loadingSheet = null;
      this.render();
    }
  }

  private render(): void {
    if (this.disposed) {
      return;
    }

    this.panel.webview.html = getCompanyExplorerContent(this.state);
  }
}
