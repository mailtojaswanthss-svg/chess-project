# Project skills

Vendored from the public repos listed on [skills.sh](https://skills.sh), pinned to the commits below. Claude Code loads every `*/SKILL.md` here automatically for anyone working in this repo.

| Skill | Use it for | Source (commit) | License |
|---|---|---|---|
| `react-best-practices` | Re-render and bundle performance in `frontend/src` (much of it targets Next.js; skip the `server-*` rules, this app is Vite) | `vercel-labs/agent-skills@063bee9` | MIT |
| `composition-patterns` | Splitting `App.tsx` and its components; skip the React 19 rules (the app is on React 18) | `vercel-labs/agent-skills@063bee9` | MIT |
| `web-design-guidelines` | UI and accessibility reviews (it fetches its rule list from raw.githubusercontent.com) | `vercel-labs/agent-skills@063bee9` | MIT |
| `frontend-design` | New or reshaped UI in the five tabs | `anthropics/skills@dbd4588` | Apache-2.0 (see its `LICENSE.txt`) |
| `webapp-testing` | Playwright checks of the running app (`scripts/with_server.py` starts the API and Vite) | `anthropics/skills@dbd4588` | Apache-2.0 (see its `LICENSE.txt`) |
| `test-driven-development` | Every backend fix: write a failing pytest first | `obra/superpowers@2ce8aa1` | MIT (`LICENSE.superpowers`) |
| `systematic-debugging` | Test failures and wrong output; find the root cause before fixing | `obra/superpowers@2ce8aa1` | MIT (`LICENSE.superpowers`) |
| `verification-before-completion` | Run the checks before saying anything is done | `obra/superpowers@2ce8aa1` | MIT (`LICENSE.superpowers`) |

To update one, re-copy its folder from the upstream repo and change the commit in this table.
