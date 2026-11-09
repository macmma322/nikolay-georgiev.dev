alter table generated_documents
  add column draft boolean not null default false,
  drop constraint generated_documents_contract_version_id_format_key,
  add constraint generated_documents_version_format_draft_key unique (contract_version_id, format, draft);
