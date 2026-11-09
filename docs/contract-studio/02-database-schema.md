# 02. Database schema

Source of truth: `contract-studio/migrations/`. Primary keys are UUIDs, except `audit_logs` (identity) and `admin_credentials` (the passkey's own ID).

| Table                             | Holds                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `admin_credentials`               | Passkey public keys. Nothing secret.                                                 |
| `auth_challenges`                 | Single-use WebAuthn challenges, 5 minutes.                                           |
| `used_setup_tokens`               | Hashes of spent setup tokens.                                                        |
| `sessions`                        | SHA-256 of session tokens, never the tokens.                                         |
| `settings`                        | Developer profile and preferences, one row.                                          |
| `clients`, `projects`             | Records. No field for EGN: see [12-known-limitations.md](12-known-limitations.md).   |
| `contract_templates`              | One row per key, language and version.                                               |
| `contracts`                       | Status, current and approved version numbers, parent link for additional agreements. |
| `contract_versions`               | Append-only: structured content, rendered HTML, SHA-256, source, approval.           |
| `ai_conversations`, `ai_messages` | Chat, token counts, estimated cost.                                                  |
| `ai_usage_monthly`                | Spend per month and model, no content; survives conversation deletion.               |
| `ai_proposals`                    | What Claude proposed, and whether it was applied, rejected or went stale.            |
| `change_requests`                 | The scope-change register.                                                           |
| `generated_documents`             | PDF and DOCX metadata, checksum, storage path.                                       |
| `audit_logs`                      | Events, never contract text.                                                         |

## Rules enforced by the database

- A trigger (`contract_versions_guard`) refuses any change to a version's content. The only permitted update is the one-way draft to approved transition. Approved rows cannot be updated or deleted.
- To erase an approved contract (for example a GDPR request), an owner must deliberately run, in one transaction:

```sql
begin;
set local studio.allow_purge = 'on';
delete from contracts where id = '<uuid>';
commit;
```

Also delete its folder under `/data/documents/<uuid>`.

- `clients` and `projects` cannot be deleted while a contract references them.

## Contract status policy

Defined in `contract-studio/src/contracts.ts` (`TRANSITIONS`), with a test for each rule.

`draft` ⇄ `needs_information` → `ready_for_review` → (approval, requires no missing facts and milestones that add up to the price) → `approved` → (first final export) `exported` → `sent` → `signed` → `active` → `completed` or `terminated` → `archived`.

Editing `approved`, `exported` or `sent` creates a new draft version. `signed` and later states are frozen: changes go through an additional agreement.

## Migrations

```bash
npm run migrate
```

Forward only. Files run in order, each in a transaction, under an advisory lock. Editing an already-applied file stops the run with an error. Railway runs this as a pre-deploy step, so a failed migration blocks the release. To undo a change, write a new migration; for a bad release see [09-backups-and-recovery.md](09-backups-and-recovery.md).

## Roles

`src/create-app-role.ts` creates `studio_app`, which can read and write data but cannot change the schema or alter `audit_logs` and `schema_migrations`. The application should run as this role, with migrations as the owner.
