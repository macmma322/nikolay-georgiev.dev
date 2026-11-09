# 04. Claude and the contract workflow

Implementation: `contract-studio/src/ai.ts`, using the official `@anthropic-ai/sdk` and the Messages API with streaming.

## Model

`CLAUDE_MODEL` sets the default, and Settings can override it from an allowlist. The default is `claude-sonnet-5-5`, taken from Anthropic's model overview on 2026-11-09: it balances drafting quality against cost ($2 / $10 per million tokens at that date).

## From conversation to document

```
You describe the work
  → Claude streams a reply and files a structured proposal
  → Schema validation; unstated amounts removed
  → Card in the chat showing old → new values
  → You apply it, which creates a new draft version (or dismiss it)
  → Deterministic render to preview, PDF and DOCX
  → You approve, and that version is frozen
```

Claude sees only what the open contract needs: client name and country, project, terms, enabled clauses, template source references, the last approved scope and open change requests. It gets at most `CLAUDE_HISTORY_MESSAGES` messages of history.

A proposal is tied to the version it was made against. If the contract changed in the meantime, the proposal is marked stale and is not applied.

## Starting without a contract

AI Assistant → New conversation accepts something like:

> I am developing a course platform for a Bulgarian company for €2,500. They pay in milestones. I want additional features to be priced separately.

Claude records what it can and lists what is missing. "Create a draft from this" asks you to pick the client, because Claude never supplies party details.

## Scope changes

Open the contract and tell Claude what the client wants. It records a **change request**, classified covered, excluded or ambiguous, with its reasoning, open questions and proposed deliverables. It has no field for an amount.

"Prepare additional agreement" creates a new contract of type additional agreement, linked to the original, with the price you enter (or a visible missing-field marker if you leave it blank). The original contract and its approved version do not change.

## Cost controls

`CLAUDE_MAX_OUTPUT_TOKENS`, `CLAUDE_HISTORY_MESSAGES`, `CLAUDE_MONTHLY_BUDGET_USD`, `CLAUDE_TIMEOUT_MS` and `CLAUDE_REQUESTS_PER_MINUTE` limit use. Instructions and tools are prompt-cached. The monthly check happens before anything is sent. Figures in Settings are estimates, not an invoice.

## When Claude is unavailable

Without a key, or during an outage, the chat reports it plainly. Clients, projects, contracts, editing, approval and exports all keep working. Claude is never required for them.

## Limits

Claude can be wrong about law. It is told not to cite anything outside the template's verified references, but that is an instruction, not a guarantee. Read every proposal.
