-- ============================================================
-- SEGUNDO CEREBRO — Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ─── Extensiones ───
create extension if not exists "uuid-ossp";

-- ─── Tabla de perfiles ───
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  partner_id uuid references public.profiles(id),
  partner_code text unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can view partner profile"
  on public.profiles for select using (auth.uid() = partner_id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ─── Trigger para crear perfil al registrarse ───
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, partner_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    substr(md5(random()::text), 1, 8)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Función para vincular pareja ───
create or replace function public.link_partner(code text)
returns json as $$
declare
  partner_record record;
begin
  -- Find the partner by code
  select * into partner_record from public.profiles
  where partner_code = code and id != auth.uid();

  if partner_record is null then
    return json_build_object('error', 'Código no encontrado');
  end if;

  if partner_record.partner_id is not null then
    return json_build_object('error', 'Esa persona ya tiene pareja vinculada');
  end if;

  -- Link both profiles
  update public.profiles set partner_id = partner_record.id where id = auth.uid();
  update public.profiles set partner_id = auth.uid() where id = partner_record.id;

  return json_build_object('success', true, 'partner_name', partner_record.display_name);
end;
$$ language plpgsql security definer;

-- ─── Transacciones (finanzas) ───
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('gasto', 'ingreso')),
  category text not null default 'Otros',
  date date not null default current_date,
  project_id uuid,
  is_shared boolean default false,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all using (auth.uid() = user_id);

create policy "Users can view partner shared transactions"
  on public.transactions for select using (
    is_shared = true and user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

-- ─── Inversiones ───
create table public.investments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  ticker text,
  cost numeric not null,
  current_value numeric not null,
  type text not null default 'acción',
  created_at timestamptz default now()
);

alter table public.investments enable row level security;

create policy "Users can manage own investments"
  on public.investments for all using (auth.uid() = user_id);

-- ─── Tareas ───
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  priority text not null default 'media' check (priority in ('alta', 'media', 'baja')),
  due_date date not null default current_date,
  frequency text not null default 'única' check (frequency in ('única', 'diaria', 'semanal', 'mensual')),
  project_id uuid,
  notes text,
  completed boolean default false,
  completed_dates date[] default '{}',
  is_shared boolean default false,
  created_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can manage own tasks"
  on public.tasks for all using (auth.uid() = user_id);

create policy "Users can view partner shared tasks"
  on public.tasks for select using (
    is_shared = true and user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

create policy "Users can update partner shared tasks"
  on public.tasks for update using (
    is_shared = true and user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

-- ─── Proyectos ───
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null default 'personal',
  status text not null default 'activo' check (status in ('activo', 'pausado', 'completado')),
  description text,
  deadline date,
  is_shared boolean default false,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Users can manage own projects"
  on public.projects for all using (auth.uid() = user_id);

create policy "Users can view partner shared projects"
  on public.projects for select using (
    is_shared = true and user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

-- ─── Hábitos ───
create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  frequency text not null default 'diaria',
  log date[] default '{}',
  created_at timestamptz default now()
);

alter table public.habits enable row level security;

create policy "Users can manage own habits"
  on public.habits for all using (auth.uid() = user_id);

-- ─── Notas ───
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text,
  project_id uuid,
  tags text[] default '{}',
  is_shared boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notes enable row level security;

create policy "Users can manage own notes"
  on public.notes for all using (auth.uid() = user_id);

create policy "Users can view partner shared notes"
  on public.notes for select using (
    is_shared = true and user_id in (
      select partner_id from public.profiles where id = auth.uid()
    )
  );

-- ─── Foreign keys para project_id ───
alter table public.transactions
  add constraint transactions_project_fk foreign key (project_id) references public.projects(id) on delete set null;

alter table public.tasks
  add constraint tasks_project_fk foreign key (project_id) references public.projects(id) on delete set null;

alter table public.notes
  add constraint notes_project_fk foreign key (project_id) references public.projects(id) on delete set null;

-- ─── Índices para performance ───
create index idx_transactions_user on public.transactions(user_id);
create index idx_transactions_date on public.transactions(date);
create index idx_tasks_user on public.tasks(user_id);
create index idx_tasks_due on public.tasks(due_date);
create index idx_projects_user on public.projects(user_id);
create index idx_habits_user on public.habits(user_id);
create index idx_notes_user on public.notes(user_id);

-- ─── Habilitar realtime ───
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.notes;
