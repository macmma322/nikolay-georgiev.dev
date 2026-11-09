-- Contract Studio schema. Personal client data lives here: keep it minimal.
-- gen_random_uuid() is built in since PostgreSQL 13.

create table admin_credentials (
  id text primary key,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  label text not null default 'Passkey',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table auth_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge text not null,
  kind text not null check (kind in ('register', 'login')),
  expires_at timestamptz not null
);

-- A setup token works once; a new one (set on Railway) is the recovery path.
create table used_setup_tokens (
  token_hash bytea primary key,
  used_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  previous_token_hash bytea,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index sessions_previous_idx on sessions (previous_token_hash);

create table settings (
  id boolean primary key default true check (id),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('individual', 'legal_entity')),
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  eik text,
  vat_id text,
  country text not null default 'BG',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_name_idx on clients (lower(name));

create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  title text not null,
  description text,
  scope_summary text,
  deliverables jsonb not null default '[]',
  exclusions jsonb not null default '[]',
  start_date date,
  target_date date,
  price numeric(12, 2) check (price is null or price >= 0),
  currency char(3) not null default 'EUR',
  payment_structure text,
  status text not null default 'planned'
    check (status in ('planned', 'active', 'on_hold', 'delivered', 'closed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_client_idx on projects (client_id);
create index projects_target_idx on projects (target_date);

create table contract_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  lang text not null check (lang in ('bg', 'en')),
  category text not null,
  name text not null,
  jurisdiction text not null default 'BG',
  version text not null,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'lawyer_reviewed')),
  reviewed_by text,
  reviewed_at timestamptz,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, lang, version)
);

create sequence contract_reference_seq;

create table contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  project_id uuid references projects (id) on delete restrict,
  template_id uuid not null references contract_templates (id) on delete restrict,
  parent_contract_id uuid references contracts (id) on delete restrict,
  title text not null,
  reference text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'needs_information', 'ready_for_review', 'approved', 'exported', 'sent',
    'signed', 'active', 'completed', 'terminated', 'archived'
  )),
  current_version integer not null default 1 check (current_version > 0),
  approved_version integer,
  signature_status text not null default 'unsigned'
    check (signature_status in ('unsigned', 'partially_signed', 'signed')),
  signed_at date,
  effective_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_client_idx on contracts (client_id);
create index contracts_project_idx on contracts (project_id);
create index contracts_parent_idx on contracts (parent_contract_id);
create index contracts_status_idx on contracts (status);

-- Append-only. Content never changes after insert; the only allowed update is
-- the one-way draft -> approved transition (see the trigger below).
create table contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  version integer not null check (version > 0),
  content jsonb not null,
  rendered_html text not null,
  content_sha256 char(64) not null,
  source text not null check (source in ('template', 'manual', 'ai_proposal')),
  approval_state text not null default 'draft' check (approval_state in ('draft', 'approved')),
  approved_at timestamptz,
  approval_note text,
  created_at timestamptz not null default now(),
  unique (contract_id, version),
  check ((approval_state = 'approved') = (approved_at is not null))
);

create function contract_versions_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.approval_state = 'approved'
       and coalesce(current_setting('studio.allow_purge', true), 'off') <> 'on' then
      raise exception 'approved contract versions cannot be deleted' using errcode = 'restrict_violation';
    end if;
    return old;
  end if;
  if old.approval_state = 'approved'
     or new.contract_id <> old.contract_id or new.version <> old.version
     or new.content <> old.content or new.rendered_html <> old.rendered_html
     or new.content_sha256 <> old.content_sha256 or new.source <> old.source
     or new.created_at <> old.created_at or new.approval_state <> 'approved' then
    raise exception 'contract versions are immutable' using errcode = 'restrict_violation';
  end if;
  return new;
end $$;

create trigger contract_versions_immutable before update or delete on contract_versions
  for each row execute function contract_versions_guard();

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_contract_idx on ai_conversations (contract_id);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  state text not null default 'complete' check (state in ('complete', 'partial', 'error')),
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  estimated_cost_usd numeric(10, 6),
  created_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on ai_messages (conversation_id, created_at);

-- Spend survives conversation deletion and holds no content.
create table ai_usage_monthly (
  month date not null,
  model text not null,
  requests integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  primary key (month, model)
);

create table ai_proposals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  contract_id uuid references contracts (id) on delete cascade,
  payload jsonb not null,
  base_version integer,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'rejected', 'stale')),
  applied_version integer,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index ai_proposals_contract_idx on ai_proposals (contract_id, status);
create index ai_proposals_conversation_idx on ai_proposals (conversation_id);

create table change_requests (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  title text not null,
  description text not null,
  classification text not null check (classification in ('covered', 'excluded', 'ambiguous')),
  reasoning text not null,
  questions jsonb not null default '[]',
  proposed_deliverables jsonb not null default '[]',
  price numeric(12, 2) check (price is null or price >= 0),
  currency char(3) not null default 'EUR',
  status text not null default 'open' check (status in ('open', 'agreement_prepared', 'declined')),
  additional_contract_id uuid references contracts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index change_requests_contract_idx on change_requests (contract_id);
create index change_requests_additional_idx on change_requests (additional_contract_id);

create table generated_documents (
  id uuid primary key default gen_random_uuid(),
  contract_version_id uuid not null references contract_versions (id) on delete cascade,
  format text not null check (format in ('pdf', 'docx')),
  filename text not null,
  byte_size integer not null,
  sha256 char(64) not null,
  storage_path text not null,
  renderer_version text not null,
  created_at timestamptz not null default now(),
  unique (contract_version_id, format)
);

-- Events only. Never the text of a contract.
create table audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  entity_type text,
  entity_id text,
  ip text,
  detail jsonb not null default '{}'
);
create index audit_logs_at_idx on audit_logs (at desc);
