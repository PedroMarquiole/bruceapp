-- Fase 5: lembretes por Web Push.
-- Segredos (chave VAPID privada e segredo do agendador) ficam no Vault do Supabase, nunca aqui.
-- Para criá-los (uma vez, no SQL Editor):
--   select vault.create_secret('<chave privada VAPID>', 'vapid_private_key');
--   select vault.create_secret('<segredo aleatório>', 'cron_secret');

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Leitura de segredo do Vault, só para o servidor (Edge Functions com chave de serviço).
create or replace function public.app_secret(p_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;
revoke all on function public.app_secret(text) from public, anon, authenticated;
grant execute on function public.app_secret(text) to service_role;

-- A cada 15 minutos, pede à função send-reminders que envie os lembretes da janela.
select cron.schedule(
  'bruceapp-lembretes',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://bfhfikboegfrzkhylfwz.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
