-- مجمع مدارس النور للمكفوفين — شئون العاملين
create table if not exists workspaces (
  user_id text primary key,
  directorate text not null default 'السويس',
  administration text not null default 'شمال السويس',
  complex_name text not null default 'مجمع مدارس النور للمكفوفين',
  seeded_at timestamptz not null default now()
);

create table if not exists schools (
  id serial primary key,
  user_id text not null,
  code text not null,
  name text not null,
  stage text not null,
  unique (user_id, code)
);
create index if not exists schools_user_id_idx on schools (user_id);

create table if not exists staff (
  id serial primary key,
  user_id text not null,
  school_id integer not null references schools(id) on delete cascade,
  teacher_code text not null,
  full_name text not null,
  national_id text not null default '',
  appointment_date date,
  subject text not null default '',
  financial_grade text not null default '',
  financial_grade_date date,
  job_group text not null default '',
  current_job text not null default '',
  qualification_type text not null default '',
  qualification text not null default '',
  cadre_job text not null default '',
  cadre_date date,
  category text not null default 'معلم',
  under_cadre boolean not null default true,
  data_errors text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists staff_user_code_idx on staff (user_id, teacher_code);
create index if not exists staff_user_id_idx on staff (user_id);
create index if not exists staff_school_idx on staff (school_id);
create index if not exists staff_name_idx on staff (full_name);

create table if not exists audit_log (
  id serial primary key,
  user_id text not null,
  staff_id integer,
  action text not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_user_idx on audit_log (user_id, created_at desc);
