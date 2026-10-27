# CLAUDE.md (example project)

<!--
An example of a project file that keeps its own facts here and imports the
generic blueprint. Save the blueprint as .claude/engineering-blueprint.md
(see SETUP.md, step 3) and delete its section 0.
-->

@.claude/engineering-blueprint.md

## Project facts

- **Project:** Acme Invoices: invoicing API and admin web app
- **Stack:** TypeScript, Node.js 22, Express, PostgreSQL 16, React 19
- **Integration branch:** `main`; one feature branch per task
- **Run:** `npm run dev` · **Test:** `npm test` · **Build:** `npm run build`
- **Checks before done:** `npm run lint`, `npm run typecheck`, `npm test`
- **Decision records:** `docs/adr/`
- **Never touch:** `dist/`, `migrations/` that are already applied, `.env*`

## Project rules (these override the blueprint)

- Use npm, never Yarn or pnpm.
- Money is stored in integer cents; never use floating point for amounts.
- Every new endpoint needs an integration test in `tests/api/`.
