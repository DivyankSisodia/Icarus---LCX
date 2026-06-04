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
  isDailyQuestion: boolean;
}

interface WorkbookSheetDetail extends WorkbookSheetSummary {
  questions: WorkbookQuestion[];
}

export interface EmptySidebarState {
  mode: "home" | "companies" | "problems";
  summary: WorkbookSummary | null;
  selectedCompany: WorkbookSheetDetail | null;
  loadingLabel: string | null;
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

function renderHome(state: EmptySidebarState): string {
  return `
    <section class="hero-card">
      <div class="hero-badge">Icarus Sidebar</div>
      <h2>No Active Solution File</h2>
      <p class="hero-copy">
        Open a solution file to see full problem details, or browse company questions right here and open one into your workspace.
      </p>
      <div class="hero-actions">
        <button class="primary-btn" data-action="browse-companies" type="button">
          Browse Company Questions
        </button>
      </div>
      <div class="hero-tip">
        Terminal fallback: <code>lcx open &lt;slug&gt;</code>
      </div>
      ${
        state.summary
          ? `
            <div class="summary-strip">
              <span>${formatNumber(state.summary.companySheets.length)} companies</span>
              <span>${formatNumber(state.summary.totalQuestions)} workbook entries</span>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderCompanyList(state: EmptySidebarState): string {
  if (!state.summary) {
    return `
      <section class="panel-card">
        <div class="empty-panel">Company workbook not loaded yet.</div>
      </section>
    `;
  }

  return `
    <section class="panel-card">
      <div class="panel-header">
        <button class="back-btn" data-action="back-home" type="button">Back</button>
        <div>
          <div class="panel-title">Company Questions</div>
          <div class="panel-subtitle">${formatNumber(state.summary.companySheets.length)} companies available</div>
        </div>
      </div>
      <input
        class="filter-input"
        id="company-filter"
        type="search"
        placeholder="Filter companies"
      />
      <div class="company-list" id="company-list">
        ${state.summary.companySheets
          .map(
            (company) => `
              <button
                class="company-item"
                data-company="${escapeHtml(company.name)}"
                data-filter="${escapeHtml(company.name.toLowerCase())}"
                type="button"
              >
                <span class="company-name">${escapeHtml(company.name)}</span>
                <span class="company-meta">${company.companyQuestions} questions</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderProblemList(state: EmptySidebarState): string {
  const company = state.selectedCompany;
  if (!company) {
    return `
      <section class="panel-card">
        <div class="empty-panel">Pick a company to view its questions.</div>
      </section>
    `;
  }

  return `
    <section class="panel-card">
      <div class="panel-header">
        <button class="back-btn" data-action="back-companies" type="button">Back</button>
        <div>
          <div class="panel-title">${escapeHtml(company.name)}</div>
          <div class="panel-subtitle">${company.companyQuestions} company questions</div>
        </div>
      </div>
      <input
        class="filter-input"
        id="problem-filter"
        type="search"
        placeholder="Filter problems"
      />
      <div class="problem-list" id="problem-list">
        ${company.questions
          .map(
            (question) => `
              <article
                class="problem-item"
                data-filter="${escapeHtml(`${question.title} ${question.slug}`.toLowerCase())}"
              >
                <div class="problem-copy">
                  <div class="problem-title">
                    ${question.isDailyQuestion ? '<span class="pill">Daily</span>' : ""}
                    <span>${escapeHtml(question.title)}</span>
                  </div>
                  <div class="problem-meta">${escapeHtml(question.slug)}</div>
                </div>
                <button
                  class="open-btn"
                  data-problem="${escapeHtml(question.slug)}"
                  type="button"
                >
                  Open
                </button>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderError(state: EmptySidebarState): string {
  if (!state.errorMessage) {
    return "";
  }

  return `
    <div class="error-card">
      <div class="error-title">Could not load company questions</div>
      <div class="error-body">${escapeHtml(state.errorMessage)}</div>
    </div>
  `;
}

function renderLoading(state: EmptySidebarState): string {
  if (!state.loadingLabel) {
    return "";
  }

  return `
    <div class="loading-banner">
      <span class="loading-dot"></span>
      <span>${escapeHtml(state.loadingLabel)}</span>
    </div>
  `;
}

export function getEmptyStateWebviewContent(state: EmptySidebarState): string {
  const content =
    state.mode === "problems"
      ? renderProblemList(state)
      : state.mode === "companies"
        ? renderCompanyList(state)
        : renderHome(state);

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        :root {
          --panel-bg: color-mix(in srgb, var(--vscode-sideBar-background) 90%, black);
          --panel-card: color-mix(in srgb, var(--vscode-editor-background) 88%, transparent);
          --panel-border: color-mix(in srgb, var(--vscode-foreground) 12%, transparent);
          --panel-text: var(--vscode-foreground);
          --panel-muted: var(--vscode-descriptionForeground);
          --panel-accent: #39a0ed;
          --panel-accent-soft: rgba(57, 160, 237, 0.16);
          --panel-green: #22c55e;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          font-family: var(--vscode-font-family, system-ui, sans-serif);
          background:
            radial-gradient(circle at top, rgba(57, 160, 237, 0.14), transparent 30%),
            linear-gradient(180deg, color-mix(in srgb, var(--panel-bg) 94%, black), var(--panel-bg));
          color: var(--panel-text);
          padding: 14px;
        }

        button,
        input {
          font: inherit;
        }

        .shell {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hero-card,
        .panel-card,
        .error-card,
        .loading-banner {
          border: 1px solid var(--panel-border);
          border-radius: 18px;
          background: var(--panel-card);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
        }

        .hero-card,
        .panel-card,
        .error-card {
          padding: 16px;
        }

        .hero-badge,
        .panel-subtitle,
        .hero-copy,
        .hero-tip,
        .company-meta,
        .problem-meta,
        .error-body {
          color: var(--panel-muted);
        }

        .hero-badge {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          margin-bottom: 8px;
        }

        h2,
        .panel-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 700;
        }

        .hero-copy {
          margin: 10px 0 0;
          line-height: 1.55;
          font-size: 13px;
        }

        .hero-actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
        }

        .primary-btn,
        .open-btn {
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--panel-accent), #0ea5e9);
          color: white;
          cursor: pointer;
          font-weight: 700;
          transition: transform 120ms ease, opacity 120ms ease;
        }

        .primary-btn {
          width: 100%;
          padding: 12px 14px;
        }

        .open-btn {
          flex: none;
          padding: 8px 12px;
        }

        .primary-btn:hover,
        .open-btn:hover,
        .company-item:hover,
        .back-btn:hover {
          transform: translateY(-1px);
        }

        .hero-tip {
          margin-top: 12px;
          font-size: 12px;
        }

        code {
          font-family: var(--vscode-editor-font-family, monospace);
          background: color-mix(in srgb, var(--panel-card) 75%, black);
          padding: 2px 5px;
          border-radius: 6px;
        }

        .summary-strip {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
          color: var(--panel-muted);
          padding-top: 12px;
          border-top: 1px solid var(--panel-border);
        }

        .panel-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
        }

        .back-btn {
          border: 1px solid var(--panel-border);
          border-radius: 10px;
          background: transparent;
          color: var(--panel-text);
          padding: 8px 10px;
          cursor: pointer;
          flex: none;
        }

        .filter-input {
          width: 100%;
          border: 1px solid var(--panel-border);
          border-radius: 12px;
          background: color-mix(in srgb, var(--panel-card) 82%, black);
          color: var(--panel-text);
          padding: 10px 12px;
          margin-bottom: 12px;
        }

        .company-list,
        .problem-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 68vh;
          overflow-y: auto;
        }

        .company-item,
        .problem-item {
          width: 100%;
          border: 1px solid var(--panel-border);
          border-radius: 14px;
          background: color-mix(in srgb, var(--panel-card) 78%, black);
        }

        .company-item {
          padding: 12px 14px;
          text-align: left;
          color: var(--panel-text);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .company-name,
        .problem-title {
          font-weight: 600;
        }

        .problem-item {
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .problem-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .problem-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill {
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          background: color-mix(in srgb, var(--panel-green) 22%, transparent);
          color: #d4ffe2;
        }

        .problem-meta {
          font-size: 12px;
        }

        .loading-banner {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--panel-muted);
          font-size: 12px;
        }

        .loading-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--panel-accent);
          box-shadow: 0 0 0 6px var(--panel-accent-soft);
          animation: pulse 1s ease-in-out infinite;
        }

        .error-title {
          font-weight: 700;
          margin-bottom: 6px;
        }

        .empty-panel {
          color: var(--panel-muted);
          text-align: center;
          padding: 16px 8px;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.85); opacity: 0.75; }
        }
      </style>
    </head>
    <body>
      <div class="shell">
        ${renderLoading(state)}
        ${renderError(state)}
        ${content}
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        document.querySelector('[data-action="browse-companies"]')?.addEventListener('click', () => {
          vscode.postMessage({ command: 'browseCompanies' });
        });

        document.querySelector('[data-action="back-home"]')?.addEventListener('click', () => {
          vscode.postMessage({ command: 'backHome' });
        });

        document.querySelector('[data-action="back-companies"]')?.addEventListener('click', () => {
          vscode.postMessage({ command: 'backCompanies' });
        });

        document.querySelectorAll('[data-company]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({
              command: 'selectCompany',
              companyName: button.getAttribute('data-company'),
            });
          });
        });

        document.querySelectorAll('[data-problem]').forEach((button) => {
          button.addEventListener('click', () => {
            vscode.postMessage({
              command: 'openProblem',
              slug: button.getAttribute('data-problem'),
            });
          });
        });

        const companyFilter = document.getElementById('company-filter');
        if (companyFilter) {
          companyFilter.addEventListener('input', () => {
            const term = companyFilter.value.trim().toLowerCase();
            document.querySelectorAll('[data-company]').forEach((item) => {
              const text = item.getAttribute('data-filter') || '';
              item.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }

        const problemFilter = document.getElementById('problem-filter');
        if (problemFilter) {
          problemFilter.addEventListener('input', () => {
            const term = problemFilter.value.trim().toLowerCase();
            document.querySelectorAll('[data-filter]').forEach((item) => {
              if (!item.classList.contains('problem-item')) {
                return;
              }
              const text = item.getAttribute('data-filter') || '';
              item.style.display = text.includes(term) ? '' : 'none';
            });
          });
        }
      </script>
    </body>
  </html>`;
}
