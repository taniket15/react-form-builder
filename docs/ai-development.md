# AI-Assisted Development

This project was built with an AI coding assistant throughout. This is a short playbook for doing that well on this repo — not a log of what happened (that's `ai-usage-log.md`).

## The approach

Plan before building, verify before accepting. Non-trivial changes start as a written plan, not just a chat reply. Claims about the codebase get checked against the actual code before they're trusted. Nothing is called "done" without running the build, the tests, and a real check in the browser.

## Tools used

| Tool | Used for |
|---|---|
| Claude Code plan mode | Anything bigger than a one-line change goes through a written, reviewed plan first |
| Read-only research passes | Grounding a plan in the real codebase before writing it, instead of assuming |
| Playwright | Checking UI changes in an actual browser |
| Context7 | Current library docs instead of relying on memory |

## What's worked well

- Re-read the actual spec, not memory, before building further on something — this once caught a requirement conflict a first pass had missed.
- Trace a claim through the real code before accepting it, including the AI's own earlier reasoning — prose describing what code does can quietly disagree with the code next to it.
- Be skeptical of tooling output that "looks" wrong, like a dead-code checker flagging exports that are actually used via a side effect — check before deleting.
- When a feature and a requirement seem to conflict, look for a version that keeps both (e.g. disable a button until its precondition is met) before removing the feature.
- Check a design or UX complaint against the actual source (the mockup, the spec) instead of just the verbal description of it.

## Testing

- Engine logic (conditions, calculations) is unit-tested — write these alongside the code.
- UI and end-to-end flows are checked manually against `docs/testing-plan.md`, since there's no browser-automation suite in this repo.

## Keep the log going

Add to `ai-usage-log.md` when a prompt leads to a real decision — what was asked, what came back, what was checked, what was changed or rejected. A few good entries beat a long list of small ones.
