-- Fase 4: assistente (conversas, mensagens, uso) e fotos de progresso privadas.

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Conversa' check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  -- Propostas de mudança que o usuário pode aceitar (nunca aplicadas sem confirmação).
  proposals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (conversation_id, user_id) references public.ai_conversations (id, user_id) on delete cascade
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, user_id, created_at);
create index ai_messages_user_idx on public.ai_messages (user_id, created_at);

-- Uso da IA: só contagem e custo, sem conteúdo. Gravado pela Edge Function (chave de serviço).
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  intent text not null check (char_length(intent) <= 40),
  model text not null check (char_length(model) <= 60),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(10, 6) not null default 0 check (cost_usd >= 0),
  ok boolean not null default true,
  created_at timestamptz not null default now()
);
create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 200),
  taken_on date not null default current_date,
  angle text not null default 'frente' check (angle in ('frente', 'lado', 'costas', 'outro')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  -- O arquivo precisa estar na pasta do próprio dono.
  check (split_part(storage_path, '/', 1) = user_id::text)
);
create index progress_photos_user_idx on public.progress_photos (user_id, taken_on desc);

create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage enable row level security;
alter table public.progress_photos enable row level security;

create policy "dono lê" on public.ai_conversations for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono insere" on public.ai_conversations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono atualiza" on public.ai_conversations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono exclui" on public.ai_conversations for delete to authenticated using ((select auth.uid()) = user_id);

create policy "dono lê" on public.ai_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono insere" on public.ai_messages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono exclui" on public.ai_messages for delete to authenticated using ((select auth.uid()) = user_id);

-- Uso: o dono só lê (para ver o consumo). Escrita apenas pelo servidor.
create policy "dono lê" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

create policy "dono lê" on public.progress_photos for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono insere" on public.progress_photos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono atualiza" on public.progress_photos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dono exclui" on public.progress_photos for delete to authenticated using ((select auth.uid()) = user_id);

-- Bucket privado para as fotos: até 8 MB, só imagens. Cada usuário só acessa a própria pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "fotos: dono lê" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: dono atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fotos: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
