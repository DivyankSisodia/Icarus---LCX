# LCX — LeetCode Terminal Client

Solve LeetCode problems from your terminal.

## Install

```bash
cd lcx
npm install
npm run build
npm link   # makes `lcx` available globally
```

## Quick Start

```bash
lcx                    # Show dashboard
lcx login              # Authenticate with LeetCode
lcx problems           # Browse problems
lcx search "two sum"   # Search problems
lcx open two-sum       # Open a problem workspace
lcx run                # Run code (from workspace)
lcx submit             # Submit code (from workspace)
lcx stats              # View local stats
lcx config             # View/set config
```

## Login

LCX uses your LeetCode session cookies. To get them:

1. Log into [leetcode.com](https://leetcode.com) in your browser
2. Open DevTools → Application → Cookies → leetcode.com
3. Copy `LEETCODE_SESSION` and `csrftoken`
4. Run `lcx login` and paste them when prompted

Credentials are stored at `~/.lcx/secrets.json`.

## Workflow

```
lcx open two-sum        → creates ~/LCX/solutions/two-sum/
Edit solution.latest.cpp
lcx run                 → tests on LeetCode server
lcx submit              → submits for final judgment
  ✓ Accepted            → auto-saves solution.accepted-submit.cpp
                           marks problem solved in local DB
```

## Workspace Structure

```
~/LCX/
├── config.json
├── lcx.sqlite
└── solutions/
    └── two-sum/
        ├── solution.latest.cpp
        ├── solution.accepted-submit.cpp
        ├── metadata.json
        └── attempts/
            ├── 2026-06-04_21-30-10_wrong-answer.cpp
            └── 2026-06-04_21-42-01_accepted.cpp
```

## Config

```bash
lcx config                          # View config
lcx config set defaultLanguage python
lcx config set workspacePath ~/LCX
lcx config set autoOpenEditor false
```

Default config at `~/LCX/config.json`:

```json
{
  "workspacePath": "~/LCX",
  "defaultLanguage": "cpp",
  "theme": "purple-terminal",
  "runTarget": "leetcode",
  "saveAttempts": true,
  "saveAcceptedRun": true,
  "saveAcceptedSubmit": true,
  "autoOpenEditor": true,
  "editorCommand": "code",
  "cacheProblems": true
}
```

## Safety & Compliance

LCX is a **fair-use tool** for manual LeetCode practice. It does NOT:

- Auto-solve or generate answers
- Scrape premium-only content
- Bypass access controls
- Enable bulk/mass submissions
- Extract hidden test cases
- Abuse LeetCode's servers (rate limiting built in)

LCX uses your personal LeetCode session and respects rate limits.

## Known Limitations

- **LeetCode has no stable official API.** LCX uses community-documented GraphQL endpoints that may change. The integration is behind an adapter layer so the UI and local storage won't break when endpoints change.
- Run/submit endpoints may need manual verification and updates (marked with TODO blocks).
- OS-level secure credential storage (keytar) is not yet implemented; secrets are in a local file with a warning.
- The dashboard's "weak topics" and "recommended next" sections are placeholders.

## Future Roadmap

- Richer terminal UI (ink/blessed with tabs and keyboard navigation)
- VS Code extension (shared core package)
- Stats dashboard improvements (weak topics from attempt data, real recommendations)
- OS keychain integration via keytar
- Config UI
- Daily challenge integration
- Multi-language template support

## License

MIT
