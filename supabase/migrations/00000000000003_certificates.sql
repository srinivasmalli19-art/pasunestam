-- Certificate templates + issued certificates (PLAYBOOK.md Phase 2/3).
-- Templates are data, not code, so a new certificate type — hand-built here
-- or produced by the Phase 4 AI import — needs no application changes.
-- `fields` and `body` shapes are documented in lib/certificates/types.ts;
-- `body` is rendered by lib/certificates/render.ts.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  title_en text not null,
  title_te text not null default '',
  number_prefix text not null,
  fields jsonb not null default '[]'::jsonb,
  body jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger certificate_templates_set_updated_at
  before update on public.certificate_templates
  for each row execute function public.set_updated_at();

alter table public.certificate_templates enable row level security;

create policy "certificate_templates_select_published"
  on public.certificate_templates for select
  using (published = true);

create policy "certificate_templates_all_editor"
  on public.certificate_templates for all
  using (public.is_editor())
  with check (public.is_editor());

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.certificate_templates(id),
  data jsonb not null default '{}'::jsonb,
  number text unique,
  status text not null default 'draft' check (status in ('draft', 'issued', 'cancelled')),
  cancelled_reason text,
  cancelled_at timestamptz,
  created_by uuid not null references public.profiles(id) default auth.uid(),
  issued_by uuid references public.profiles(id),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index certificates_created_by_idx on public.certificates (created_by);
create index certificates_number_idx on public.certificates (number);

create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

alter table public.certificates enable row level security;

create policy "certificates_select_own"
  on public.certificates for select
  using (created_by = auth.uid());

create policy "certificates_select_editor"
  on public.certificates for select
  using (public.is_editor());

create policy "certificates_insert_own"
  on public.certificates for insert
  with check (created_by = auth.uid());

-- A draft can still be edited by its owner; once issued or cancelled it's
-- read-only from the client (issuing/cancelling go through functions below).
create policy "certificates_update_own_draft"
  on public.certificates for update
  using (created_by = auth.uid() and status = 'draft')
  with check (created_by = auth.uid() and status = 'draft');

-- Verification (Phase 3) needs to look up an issued certificate by number
-- without the visitor being signed in.
create policy "certificates_select_issued_for_verify"
  on public.certificates for select
  using (status = 'issued');

-- One numbering sequence per template per year, so "HC/2026/SVC4521/0001"
-- always increments even under concurrent issuing.
create table public.certificate_number_counters (
  template_id uuid not null references public.certificate_templates(id),
  year int not null,
  next_seq int not null default 1,
  primary key (template_id, year)
);

alter table public.certificate_number_counters enable row level security;
-- No direct client access; only issue_certificate() (security definer) touches this.

create or replace function public.issue_certificate(p_certificate_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.certificates;
  v_template public.certificate_templates;
  v_profile public.profiles;
  v_year int := extract(year from now())::int;
  v_seq int;
  v_reg text;
  v_number text;
begin
  select * into v_cert from public.certificates where id = p_certificate_id for update;
  if not found then
    raise exception 'Certificate not found';
  end if;
  if v_cert.created_by <> auth.uid() then
    raise exception 'Not permitted to issue this certificate';
  end if;
  if v_cert.status = 'issued' then
    return v_cert; -- idempotent: issuing an already-issued certificate just returns it
  end if;
  if v_cert.status = 'cancelled' then
    raise exception 'A cancelled certificate cannot be issued';
  end if;

  select * into v_template from public.certificate_templates where id = v_cert.template_id;
  select * into v_profile from public.profiles where id = auth.uid();

  v_reg := upper(regexp_replace(coalesce(v_profile.registration_no, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_reg = '' then
    v_reg := 'REG';
  end if;

  insert into public.certificate_number_counters (template_id, year, next_seq)
    values (v_cert.template_id, v_year, 2)
  on conflict (template_id, year)
    do update set next_seq = public.certificate_number_counters.next_seq + 1
  returning next_seq - 1 into v_seq;

  v_number := v_template.number_prefix || '/' || v_year || '/' || v_reg || '/' || lpad(v_seq::text, 4, '0');

  update public.certificates
    set status = 'issued', number = v_number, issued_by = auth.uid(), issued_at = now()
    where id = p_certificate_id
    returning * into v_cert;

  return v_cert;
end;
$$;

create or replace function public.cancel_certificate(p_certificate_id uuid, p_reason text)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert public.certificates;
begin
  select * into v_cert from public.certificates where id = p_certificate_id for update;
  if not found then
    raise exception 'Certificate not found';
  end if;
  if v_cert.created_by <> auth.uid() and not public.is_editor() then
    raise exception 'Not permitted to cancel this certificate';
  end if;

  update public.certificates
    set status = 'cancelled', cancelled_reason = p_reason, cancelled_at = now()
    where id = p_certificate_id
    returning * into v_cert;

  return v_cert;
end;
$$;

-- Seed the three certificate types with the wording already worked out in
-- pasunestam.html. PLACEHOLDER: the user has not yet attached their real
-- health/valuation/post-mortem certificates (PLAYBOOK.md Phase 2 asks for
-- those photos/PDFs) — replace title/body wording here once they're
-- provided; the field lists and numbering already match the prototype.
insert into public.certificate_templates (key, name, title_en, title_te, number_prefix, fields, body) values
(
  'health',
  'Health certificate',
  'Health Certificate',
  'ఆరోగ్య ధృవీకరణ పత్రం',
  'HC',
  $fields$[
    {"id":"owner","label":"Owner's name","required":true},
    {"id":"addr","label":"Village / address"},
    {"id":"species","label":"Species","type":"select","options":["Cattle","Buffalo","Sheep","Goat","Dog","Cat","Horse","Pig","Poultry"]},
    {"id":"breed","label":"Breed"},
    {"id":"sex","label":"Sex","type":"select","options":["Female","Male"]},
    {"id":"age","label":"Age","placeholder":"e.g. 4 years"},
    {"id":"tag","label":"Ear tag / microchip no.","full":true},
    {"id":"colour","label":"Colour and identification marks","full":true},
    {"id":"vacc","label":"Vaccinations with dates","type":"textarea","full":true,"placeholder":"FMD – 14 Jul 2026; HS – 02 Jun 2026"},
    {"id":"purpose","label":"Fit for","type":"select","options":["Transport","Sale","Show / exhibition","Insurance","Travel with owner"]},
    {"id":"dest","label":"Destination (if transport)"},
    {"id":"examDate","label":"Date of examination","type":"date"},
    {"id":"remarks","label":"Remarks","type":"textarea","full":true}
  ]$fields$::jsonb,
  $body$[
    {"type":"paragraph","text":"Certified that I have personally examined the animal described below, belonging to Sri/Smt. {{owner}} of {{addr}}, on {{examDate|date}}. On clinical examination it was found free from symptoms of infectious and contagious disease, and is fit for {{purpose|lower}}{{#if dest}} to {{dest}}{{/if}}."},
    {"type":"table","rows":[
      {"label":"Species","field":"species"},
      {"label":"Breed","field":"breed"},
      {"label":"Sex","field":"sex"},
      {"label":"Age","field":"age"},
      {"label":"Ear tag / microchip no.","field":"tag"},
      {"label":"Colour and identification marks","field":"colour"},
      {"label":"Vaccinations","field":"vacc"}
    ]},
    {"type":"paragraph","text":"{{#if remarks}}<b>Remarks:</b> {{remarks}}{{/if}}"}
  ]$body$::jsonb
),
(
  'valuation',
  'Valuation certificate',
  'Valuation Certificate',
  'విలువ ధృవీకరణ పత్రం',
  'VC',
  $fields$[
    {"id":"owner","label":"Owner's name","required":true},
    {"id":"addr","label":"Village / address"},
    {"id":"species","label":"Species","type":"select","options":["Cattle","Buffalo","Sheep","Goat","Dog","Cat","Horse","Pig","Poultry"]},
    {"id":"breed","label":"Breed"},
    {"id":"sex","label":"Sex","type":"select","options":["Female","Male"]},
    {"id":"age","label":"Age","placeholder":"e.g. 4 years"},
    {"id":"tag","label":"Ear tag / microchip no.","full":true},
    {"id":"colour","label":"Colour and identification marks","full":true},
    {"id":"lactation","label":"Lactation no."},
    {"id":"yield","label":"Milk yield (litres/day)"},
    {"id":"preg","label":"Pregnancy status","placeholder":"e.g. 5 months pregnant"},
    {"id":"health","label":"General health","type":"select","options":["Healthy","Fair","Poor"]},
    {"id":"value","label":"Market value (₹)","type":"number"},
    {"id":"purpose","label":"Purpose","type":"select","options":["Insurance","Bank loan","Sale"]},
    {"id":"agency","label":"Bank / insurance company","full":true},
    {"id":"examDate","label":"Date of examination","type":"date"}
  ]$fields$::jsonb,
  $body$[
    {"type":"paragraph","text":"Certified that I have examined the animal described below, belonging to Sri/Smt. {{owner}} of {{addr}}, on {{examDate|date}}, for the purpose of {{purpose|lower}}{{#if agency}} with {{agency}}{{/if}}. Based on its age, breed, production and health, in my opinion its present market value is {{value|currency}} (Rupees {{value|words}} only)."},
    {"type":"table","rows":[
      {"label":"Species","field":"species"},
      {"label":"Breed","field":"breed"},
      {"label":"Sex","field":"sex"},
      {"label":"Age","field":"age"},
      {"label":"Ear tag no.","field":"tag"},
      {"label":"Colour and identification marks","field":"colour"},
      {"label":"Lactation no.","field":"lactation"},
      {"label":"Milk yield (litres/day)","field":"yield"},
      {"label":"Pregnancy status","field":"preg"},
      {"label":"General health","field":"health"}
    ]}
  ]$body$::jsonb
),
(
  'postmortem',
  'Post-mortem report',
  'Post-Mortem Examination Report',
  'శవ పరీక్ష నివేదిక',
  'PM',
  $fields$[
    {"id":"owner","label":"Owner's name","required":true},
    {"id":"addr","label":"Village / address"},
    {"id":"species","label":"Species","type":"select","options":["Cattle","Buffalo","Sheep","Goat","Dog","Cat","Horse","Pig","Poultry"]},
    {"id":"breed","label":"Breed"},
    {"id":"sex","label":"Sex","type":"select","options":["Female","Male"]},
    {"id":"age","label":"Age","placeholder":"e.g. 4 years"},
    {"id":"tag","label":"Ear tag / microchip no.","full":true},
    {"id":"colour","label":"Colour and identification marks","full":true},
    {"id":"deathTime","label":"Date and time of death","type":"datetime-local"},
    {"id":"pmTime","label":"Date and time of post-mortem","type":"datetime-local"},
    {"id":"place","label":"Place of post-mortem"},
    {"id":"requested","label":"Requested by","type":"select","options":["Owner","Insurance company","Police","Court"]},
    {"id":"history","label":"History","type":"textarea","full":true},
    {"id":"external","label":"External examination","type":"textarea","full":true},
    {"id":"internal","label":"Internal examination","type":"textarea","full":true},
    {"id":"cause","label":"Cause of death (opinion)","type":"textarea","full":true},
    {"id":"samples","label":"Samples sent to lab","full":true}
  ]$fields$::jsonb,
  $body$[
    {"type":"paragraph","text":"Post-mortem examination was conducted on the carcass of the animal described below, belonging to Sri/Smt. {{owner}} of {{addr}}, at {{place}} on {{pmTime|datetime}}, at the request of the {{requested|lower}}."},
    {"type":"table","rows":[
      {"label":"Species / breed","field":"species,breed"},
      {"label":"Sex / age","field":"sex,age"},
      {"label":"Ear tag no.","field":"tag"},
      {"label":"Identification marks","field":"colour"},
      {"label":"Date and time of death","field":"deathTime","filter":"datetime"}
    ]},
    {"type":"heading","text":"History"},
    {"type":"paragraph","text":"{{history}}"},
    {"type":"heading","text":"External examination"},
    {"type":"paragraph","text":"{{external}}"},
    {"type":"heading","text":"Internal examination"},
    {"type":"paragraph","text":"{{internal}}"},
    {"type":"heading","text":"Cause of death"},
    {"type":"paragraph","text":"<b>{{cause}}</b>"},
    {"type":"heading","text":"Samples sent for laboratory examination"},
    {"type":"paragraph","text":"{{samples|default:Nil}}"}
  ]$body$::jsonb
);
