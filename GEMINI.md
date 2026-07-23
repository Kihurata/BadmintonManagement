# GEMINI.md

> This file defines how AI agents behave in this workspace.

---

## 🔴 P0: SECOND BRAIN PROTOCOL (MANDATORY AT SESSION START)

**Before providing ANY code edits, plans, or answers:**

1. **Search Second Brain First**: Always search the global Second Brain at `c:\Kira_Second_Brain` (specifically [[wiki/badminton-management/]] and [[wiki/troubleshooting/]]) for relevant business rules, API contracts, database decisions, or past bug fixes before writing code or answering queries.

2. **Fallback**: If the required knowledge is not found in the Second Brain, fallback to local repo docs (`KNOWNS.md`), codebase analysis, or web search.

---

## 📋 PLANNING & MIRRORING PROTOCOL

1. **Mirroring Plans**: Every generated `implementation_plan.md`, `task.md`, and `walkthrough.md` MUST be copied/mirrored to `c:\Kira_Second_Brain\wiki\badminton-management\plans\{conversation_id}\`.

2. **Index Update**: Keep [[wiki/badminton-management/_index.md]] updated when adding new documentation or specs.

---

## ⚙️ KNOWNS & REPOSITORY RULES

- Follow the rules in [AGENTS.md](file:///d:/BadmintonManagement/AGENTS.md) and [KNOWNS.md](file:///d:/BadmintonManagement/KNOWNS.md).

- Use `knowns` MCP tools (`mcp_knowns_*`) or CLI for task and doc management inside this repository.

- After completing complex bug fixes or feature work, extract durable learnings to `c:\Kira_Second_Brain\wiki\troubleshooting\`.