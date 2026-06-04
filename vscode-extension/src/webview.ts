import {
  EmptySidebarState,
  getEmptyStateWebviewContent,
} from "./sidebarEmptyState";

export function getWebviewContent(
  problem: any | null,
  emptyState?: EmptySidebarState
): string {
  if (!problem) {
    return getEmptyStateWebviewContent(
      emptyState || {
        mode: "home",
        summary: null,
        selectedCompany: null,
        loadingLabel: null,
        errorMessage: null,
      }
    );
  }

  const difficultyClass = problem.difficulty.toLowerCase();
  const tagsHtml = (problem.topicTags || [])
    .map((t: any) => `<span class="tag">${typeof t === 'string' ? t : t.name}</span>`)
    .join("");

  const hintsHtml = (problem.hints || [])
    .map((hint: string, index: number) => `
        <details class="hint-details">
            <summary class="hint-summary">Hint ${index + 1}</summary>
            <div class="hint-content">${hint}</div>
        </details>
    `).join("");

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          :root {
              --difficulty-easy: #22c55e;
              --difficulty-medium: #eab308;
              --difficulty-hard: #ef4444;
          }

          body {
              font-family: var(--vscode-font-family, system-ui, sans-serif);
              font-size: 13px;
              color: var(--vscode-foreground);
              background-color: var(--vscode-sideBar-background);
              padding: 12px 16px;
              margin: 0;
              box-sizing: border-box;
              line-height: 1.5;
          }

          /* Scrollbar Customization */
          ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
          }
          ::-webkit-scrollbar-track {
              background: transparent;
          }
          ::-webkit-scrollbar-thumb {
              background: var(--vscode-scrollbarSlider-background, rgba(100,100,100,0.4));
              border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
              background: var(--vscode-scrollbarSlider-activeBackground, rgba(100,100,100,0.6));
          }

          .header {
              border-bottom: 1px solid var(--vscode-divider, rgba(128,128,128,0.25));
              padding-bottom: 12px;
              margin-bottom: 14px;
          }

          .title-container {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 8px;
          }

          h2 {
              font-size: 16px;
              margin: 0 0 6px 0;
              font-weight: 600;
              color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
          }

          .difficulty-badge {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 2px 6px;
              border-radius: 4px;
              display: inline-block;
              color: #ffffff;
          }

          .difficulty-badge.easy { background-color: var(--difficulty-easy); }
          .difficulty-badge.medium { background-color: var(--difficulty-medium); }
          .difficulty-badge.hard { background-color: var(--difficulty-hard); }

          .stats {
              font-size: 11px;
              color: var(--vscode-descriptionForeground);
              margin-top: 6px;
              display: flex;
              gap: 12px;
          }

          .tags-container {
              display: flex;
              flex-wrap: wrap;
              gap: 4px;
              margin-top: 8px;
          }

          .tag {
              font-size: 10px;
              background-color: var(--vscode-badge-background, rgba(128, 128, 128, 0.15));
              color: var(--vscode-badge-foreground, var(--vscode-foreground));
              padding: 2px 6px;
              border-radius: 3px;
          }

          .actions {
              display: flex;
              gap: 8px;
              margin: 16px 0;
          }

          button {
              flex: 1;
              background-color: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              padding: 8px 12px;
              font-size: 12px;
              font-weight: 600;
              border-radius: 4px;
              cursor: pointer;
              transition: background-color 0.15s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
          }

          button:hover {
              background-color: var(--vscode-button-hoverBackground);
          }

          button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
          }

          button.secondary {
              background-color: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.2));
              color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
          }

          button.secondary:hover {
              background-color: var(--vscode-button-secondaryHoverBackground, rgba(128,128,128,0.3));
          }

          /* Problem content styling */
          .content {
              margin-bottom: 20px;
          }

          .content p {
              margin: 0 0 10px 0;
          }

          .content code {
              font-family: var(--vscode-editor-font-family, monospace);
              background-color: var(--vscode-textCodeBlock-background, rgba(128, 128, 128, 0.15));
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 12px;
          }

          .content pre {
              background-color: var(--vscode-textBlockQuote-background, rgba(0,0,0,0.15));
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
              border-left: 3px solid var(--vscode-textBlockQuote-border, var(--vscode-button-background));
              margin: 12px 0;
          }

          .content pre code {
              background-color: transparent;
              padding: 0;
              border-radius: 0;
          }

          .content ul, .content ol {
              margin: 0 0 10px 0;
              padding-left: 20px;
          }

          .content li {
              margin-bottom: 4px;
          }

          /* Hints section */
          .hints-header {
              font-size: 13px;
              font-weight: 600;
              margin: 16px 0 8px 0;
              border-bottom: 1px solid var(--vscode-divider, rgba(128,128,128,0.2));
              padding-bottom: 4px;
          }

          .hint-details {
              margin-bottom: 8px;
              border: 1px solid var(--vscode-divider, rgba(128,128,128,0.15));
              border-radius: 4px;
              background-color: var(--vscode-sideBar-background);
          }

          .hint-summary {
              padding: 8px 12px;
              font-weight: 600;
              cursor: pointer;
              outline: none;
              user-select: none;
          }

          .hint-summary:hover {
              background-color: rgba(128, 128, 128, 0.05);
          }

          .hint-content {
              padding: 10px 12px;
              border-top: 1px solid var(--vscode-divider, rgba(128,128,128,0.15));
              font-size: 12px;
              background-color: rgba(0, 0, 0, 0.1);
          }

          /* Console section */
          .console-container {
              margin-top: 24px;
              display: flex;
              flex-direction: column;
          }

          .console-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 6px;
              color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
          }

          .clear-btn {
              background: transparent;
              color: var(--vscode-descriptionForeground);
              padding: 2px 6px;
              font-size: 11px;
              font-weight: 500;
              border-radius: 3px;
              cursor: pointer;
              border: 1px solid var(--vscode-divider, rgba(128,128,128,0.2));
              flex: none;
          }

          .clear-btn:hover {
              background: rgba(128,128,128,0.1);
              color: var(--vscode-foreground);
          }

          .console-log {
              background-color: #0c0a0f;
              border: 1px solid #3c1e5a;
              box-shadow: 0 0 8px rgba(168, 85, 247, 0.15);
              border-radius: 4px;
              font-family: var(--vscode-editor-font-family, monospace);
              font-size: 11px;
              padding: 10px;
              min-height: 120px;
              max-height: 300px;
              overflow-y: auto;
              white-space: pre-wrap;
              color: #a855f7;
          }

          .console-log.running {
              border-color: #eab308;
              box-shadow: 0 0 8px rgba(234, 179, 8, 0.15);
          }

          .console-log.success {
              border-color: var(--difficulty-easy);
              box-shadow: 0 0 8px rgba(34, 197, 94, 0.15);
          }

          .console-log.failed {
              border-color: var(--difficulty-hard);
              box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
          }

          /* Loading indicator */
          .spinner {
              display: none;
              width: 14px;
              height: 14px;
              border: 2px solid rgba(255,255,255,0.2);
              border-radius: 50%;
              border-top-color: currentColor;
              animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
              to { transform: rotate(360deg); }
          }

          .running .spinner {
              display: inline-block;
          }

          .link-container {
              margin-top: 14px;
              text-align: center;
          }

          .leetcode-link {
              color: var(--vscode-textLink-foreground);
              text-decoration: none;
              font-size: 12px;
          }

          .leetcode-link:hover {
              text-decoration: underline;
          }
      </style>
  </head>
  <body>
      <div class="header">
          <div class="title-container">
              <h2>${problem.frontendId}. ${problem.title}</h2>
              <span class="difficulty-badge ${difficultyClass}">${problem.difficulty}</span>
          </div>
          <div class="stats">
              <span>👍 ${problem.likes?.toLocaleString() || 0}</span>
              <span>👎 ${problem.dislikes?.toLocaleString() || 0}</span>
          </div>
          <div class="tags-container">
              ${tagsHtml}
          </div>
      </div>

      <div class="actions">
          <button id="run-btn">
              <span class="spinner"></span>
              <span class="btn-text">▶ Run</span>
          </button>
          <button id="submit-btn" class="secondary">
              <span class="spinner"></span>
              <span class="btn-text">🚀 Submit</span>
          </button>
      </div>

      <div class="content">
          ${problem.description || problem.content}
      </div>

      ${hintsHtml.length > 0 ? `
          <div class="hints-header">Hints</div>
          <div class="hints-container">
              ${hintsHtml}
          </div>
      ` : ''}

      <div class="link-container">
          <a class="leetcode-link" href="https://leetcode.com/problems/${problem.titleSlug}/" target="_blank">🔗 Open in LeetCode</a>
      </div>

      <div class="console-container">
          <div class="console-header">
              <span>Execution Output</span>
              <button class="clear-btn" id="clear-btn">Clear</button>
          </div>
          <div class="console-log" id="console-log">Console ready...</div>
      </div>

      <script>
          const vscode = acquireVsCodeApi();
          const runBtn = document.getElementById('run-btn');
          const submitBtn = document.getElementById('submit-btn');
          const clearBtn = document.getElementById('clear-btn');
          const consoleLog = document.getElementById('console-log');

          // Disable buttons & show loading spinners
          function setLoading(isLoading, type) {
              if (isLoading) {
                  runBtn.disabled = true;
                  submitBtn.disabled = true;
                  if (type === 'run') {
                      runBtn.classList.add('running');
                  } else {
                      submitBtn.classList.add('running');
                  }
                  consoleLog.className = 'console-log running';
              } else {
                  runBtn.disabled = false;
                  submitBtn.disabled = false;
                  runBtn.classList.remove('running');
                  submitBtn.classList.remove('running');
              }
          }

          runBtn.addEventListener('click', () => {
              setLoading(true, 'run');
              consoleLog.textContent = 'Running test cases on LeetCode...\\n';
              vscode.postMessage({ command: 'run' });
          });

          submitBtn.addEventListener('click', () => {
              setLoading(true, 'submit');
              consoleLog.textContent = 'Submitting code to LeetCode...\\n';
              vscode.postMessage({ command: 'submit' });
          });

          clearBtn.addEventListener('click', () => {
              consoleLog.textContent = 'Console cleared...';
              consoleLog.className = 'console-log';
          });

          // Handle messages sent from the extension
          window.addEventListener('message', event => {
              const message = event.data;
              switch (message.command) {
                  case 'log':
                      consoleLog.textContent += message.text;
                      // Auto-scroll to bottom
                      consoleLog.scrollTop = consoleLog.scrollHeight;
                      break;
                  case 'result':
                      setLoading(false);
                      consoleLog.textContent = message.output;
                      consoleLog.scrollTop = consoleLog.scrollHeight;
                      if (message.success) {
                          consoleLog.className = 'console-log success';
                      } else {
                          consoleLog.className = 'console-log failed';
                      }
                      break;
                  case 'error':
                      setLoading(false);
                      consoleLog.textContent += '\\nError: ' + message.text;
                      consoleLog.className = 'console-log failed';
                      break;
              }
          });
      </script>
  </body>
  </html>`;
}
