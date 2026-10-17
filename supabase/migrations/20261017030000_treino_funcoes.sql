-- Fase 3: regras de sessão de treino, cálculo de recordes e catálogo inicial de exercícios.

-- Sessão encerrada (finalizada ou cancelada) não volta a ficar aberta.
create or replace function app_private.guard_session_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('finalizada', 'cancelada') and new.status is distinct from old.status then
    raise exception 'Sessão encerrada não pode mudar de estado' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_session_status
  before update on public.workout_sessions
  for each row execute function app_private.guard_session_status();

-- Histórico imutável: exercícios e séries de sessão finalizada não mudam.
create or replace function app_private.guard_closed_session_children()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session uuid;
  v_status text;
begin
  if tg_table_name = 'session_exercises' then
    v_session := coalesce(new.session_id, old.session_id);
  else
    select se.session_id into v_session
      from public.session_exercises se
     where se.id = coalesce(new.session_exercise_id, old.session_exercise_id);
  end if;

  select s.status into v_status from public.workout_sessions s where s.id = v_session;
  -- Sem sessão visível = exclusão em cascata da própria sessão: permitido.
  if v_status = 'finalizada' then
    raise exception 'Sessão finalizada não pode ser alterada' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_closed_session_children
  before insert or update or delete on public.session_exercises
  for each row execute function app_private.guard_closed_session_children();
create trigger guard_closed_session_children
  before insert or update or delete on public.exercise_sets
  for each row execute function app_private.guard_closed_session_children();

-- Finaliza a sessão e grava os recordes batidos nela.
-- Critérios: maior carga em uma série com pelo menos 1, 3, 5 ou 10 repetições, e 1RM estimado
-- (Epley, carga × (1 + reps/30), só para séries de 2 a 12 repetições; 1 repetição = a própria carga).
-- Só séries concluídas, com carga e repetições maiores que zero, entram no cálculo.
create or replace function public.finish_workout_session(p_session uuid)
returns setof public.personal_records
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.workout_sessions
     set status = 'finalizada', finished_at = now()
   where id = p_session and user_id = v_uid and status in ('ativa', 'pausada');
  if not found then
    raise exception 'Sessão não encontrada ou já encerrada' using errcode = 'P0002';
  end if;

  return query
  with sets as (
    select es.id as set_id, es.weight_kg as w, es.reps, se.exercise_id, se.exercise_name
      from public.exercise_sets es
      join public.session_exercises se on se.id = es.session_exercise_id
     where se.session_id = p_session
       and es.completed_at is not null
       and es.weight_kg > 0
       and es.reps > 0
  ),
  candidates as (
    select s.set_id, s.exercise_id, s.exercise_name, c.criterion,
           case
             when c.criterion = 'e1rm' and s.reps = 1 then s.w
             when c.criterion = 'e1rm' and s.reps between 2 and 12 then round(s.w * (1 + s.reps / 30.0), 1)
             when c.criterion = 'e1rm' then null
             when s.reps >= c.min_reps then s.w
           end as value
      from sets s
     cross join (values ('carga_1', 1), ('carga_3', 3), ('carga_5', 5), ('carga_10', 10), ('e1rm', 0))
           as c (criterion, min_reps)
  ),
  best as (
    select distinct on (coalesce(exercise_id::text, exercise_name), criterion)
           set_id, exercise_id, exercise_name, criterion, value
      from candidates
     where value is not null
     order by coalesce(exercise_id::text, exercise_name), criterion, value desc, set_id
  )
  insert into public.personal_records (exercise_id, exercise_name, criterion, value, set_id, achieved_on)
  select b.exercise_id, b.exercise_name, b.criterion, b.value, b.set_id, current_date
    from best b
   where b.value > coalesce((
           select max(p.value) from public.personal_records p
            where p.user_id = v_uid
              and p.criterion = b.criterion
              and (p.exercise_id = b.exercise_id
                   or (b.exercise_id is null and p.exercise_id is null and p.exercise_name = b.exercise_name))
         ), 0)
  returning *;
end;
$$;

revoke execute on function public.finish_workout_session(uuid) from public, anon;
grant execute on function public.finish_workout_session(uuid) to authenticated;

-- Catálogo inicial (global, somente leitura). Textos escritos para o projeto.
insert into public.exercises (user_id, name, primary_muscles, secondary_muscles, equipment, instructions) values
  (null, 'Supino reto com barra', '{peitoral}', '{tríceps,deltoide anterior}', 'barra', 'Deitado no banco, desça a barra até a linha do peito com os cotovelos a cerca de 45° do tronco e empurre de volta sem tirar os glúteos do banco.'),
  (null, 'Supino inclinado com halteres', '{peitoral superior}', '{tríceps,deltoide anterior}', 'halteres', 'Banco a 30–45°. Desça os halteres ao lado do peito e empurre para cima, aproximando-os no topo sem bater.'),
  (null, 'Supino reto com halteres', '{peitoral}', '{tríceps,deltoide anterior}', 'halteres', 'Mesmo movimento do supino com barra, com amplitude um pouco maior na descida.'),
  (null, 'Crucifixo com halteres', '{peitoral}', '{deltoide anterior}', 'halteres', 'Braços levemente flexionados e fixos; abra até sentir alongamento no peito e feche em arco.'),
  (null, 'Crossover na polia', '{peitoral}', '{deltoide anterior}', 'polia', 'Puxe os cabos em arco à frente do corpo, cruzando levemente as mãos, e volte devagar.'),
  (null, 'Flexão de braço', '{peitoral}', '{tríceps,core}', 'peso corporal', 'Corpo alinhado da cabeça aos pés; desça até o peito quase tocar o chão e empurre.'),
  (null, 'Barra fixa', '{dorsais}', '{bíceps,romboides}', 'barra fixa', 'Pegada pronada um pouco mais larga que os ombros; puxe até o queixo passar a barra e desça controlando.'),
  (null, 'Puxada frontal na polia', '{dorsais}', '{bíceps,romboides}', 'polia', 'Puxe a barra até a parte alta do peito, levando os cotovelos para baixo e para trás.'),
  (null, 'Remada curvada com barra', '{dorsais,romboides}', '{bíceps,lombar}', 'barra', 'Tronco inclinado à frente com a coluna neutra; puxe a barra até o abdômen.'),
  (null, 'Remada unilateral com halter', '{dorsais}', '{bíceps,romboides}', 'halteres', 'Apoie mão e joelho no banco; puxe o halter em direção ao quadril.'),
  (null, 'Remada baixa na polia', '{dorsais,romboides}', '{bíceps}', 'polia', 'Sentado, puxe o triângulo até o abdômen mantendo o tronco estável.'),
  (null, 'Levantamento terra', '{posteriores de coxa,glúteos,lombar}', '{trapézio,antebraços}', 'barra', 'Barra junto às canelas, coluna neutra; empurre o chão com os pés e estenda quadril e joelhos juntos.'),
  (null, 'Desenvolvimento com halteres', '{deltoides}', '{tríceps}', 'halteres', 'Sentado ou em pé, empurre os halteres da altura dos ombros até acima da cabeça.'),
  (null, 'Desenvolvimento militar com barra', '{deltoides}', '{tríceps,core}', 'barra', 'Em pé, empurre a barra do peito até acima da cabeça, sem arquear a lombar.'),
  (null, 'Elevação lateral', '{deltoide lateral}', '{trapézio}', 'halteres', 'Eleve os halteres pelas laterais até a altura dos ombros, com cotovelos levemente flexionados.'),
  (null, 'Crucifixo invertido', '{deltoide posterior}', '{romboides}', 'halteres', 'Tronco inclinado à frente; abra os braços para os lados apertando as escápulas.'),
  (null, 'Face pull', '{deltoide posterior}', '{romboides,manguito rotador}', 'polia', 'Corda na altura do rosto; puxe em direção à testa abrindo as mãos e os cotovelos.'),
  (null, 'Encolhimento com halteres', '{trapézio}', '{}', 'halteres', 'Eleve os ombros em direção às orelhas e desça devagar, sem girar.'),
  (null, 'Rosca direta com barra', '{bíceps}', '{antebraços}', 'barra', 'Cotovelos junto ao corpo; flexione até a barra chegar perto dos ombros.'),
  (null, 'Rosca alternada com halteres', '{bíceps}', '{antebraços}', 'halteres', 'Alterne os braços girando o punho para cima durante a subida.'),
  (null, 'Rosca martelo', '{bíceps,braquiorradial}', '{antebraços}', 'halteres', 'Pegada neutra, palmas viradas uma para a outra durante todo o movimento.'),
  (null, 'Tríceps na polia', '{tríceps}', '{}', 'polia', 'Cotovelos fixos ao lado do corpo; estenda os braços até o fim e volte controlando.'),
  (null, 'Tríceps francês', '{tríceps}', '{}', 'halteres', 'Halter atrás da cabeça com os cotovelos apontando para cima; estenda os braços.'),
  (null, 'Mergulho nas paralelas', '{tríceps,peitoral}', '{deltoide anterior}', 'paralelas', 'Desça até os ombros ficarem na altura dos cotovelos e empurre; tronco mais ereto foca o tríceps.'),
  (null, 'Agachamento livre', '{quadríceps,glúteos}', '{posteriores de coxa,core}', 'barra', 'Barra apoiada no trapézio; desça empurrando o quadril para trás até as coxas ficarem paralelas ao chão ou abaixo, joelhos na direção dos pés.'),
  (null, 'Agachamento frontal', '{quadríceps}', '{glúteos,core}', 'barra', 'Barra apoiada à frente dos ombros, cotovelos altos; desça com o tronco mais ereto.'),
  (null, 'Agachamento búlgaro', '{quadríceps,glúteos}', '{posteriores de coxa}', 'halteres', 'Pé de trás apoiado no banco; desça a perna da frente até a coxa ficar paralela ao chão.'),
  (null, 'Leg press', '{quadríceps,glúteos}', '{posteriores de coxa}', 'máquina', 'Pés na largura do quadril; desça até cerca de 90° nos joelhos sem tirar a lombar do encosto.'),
  (null, 'Cadeira extensora', '{quadríceps}', '{}', 'máquina', 'Estenda os joelhos até o fim e desça devagar.'),
  (null, 'Mesa flexora', '{posteriores de coxa}', '{panturrilhas}', 'máquina', 'Flexione os joelhos levando os calcanhares em direção aos glúteos.'),
  (null, 'Stiff com barra', '{posteriores de coxa,glúteos}', '{lombar}', 'barra', 'Joelhos levemente flexionados; desça a barra junto às pernas levando o quadril para trás, coluna neutra.'),
  (null, 'Afundo com halteres', '{quadríceps,glúteos}', '{posteriores de coxa}', 'halteres', 'Dê um passo à frente e desça até os dois joelhos ficarem perto de 90°.'),
  (null, 'Elevação de quadril com barra', '{glúteos}', '{posteriores de coxa}', 'barra', 'Costas apoiadas no banco, barra sobre o quadril; eleve até alinhar tronco e coxas.'),
  (null, 'Cadeira abdutora', '{glúteo médio}', '{}', 'máquina', 'Abra as pernas contra a resistência e volte devagar.'),
  (null, 'Panturrilha em pé', '{panturrilhas}', '{}', 'máquina', 'Suba na ponta dos pés o mais alto possível e desça alongando.'),
  (null, 'Panturrilha sentado', '{sóleo}', '{}', 'máquina', 'Com os joelhos flexionados, suba os calcanhares e desça devagar.'),
  (null, 'Prancha', '{core}', '{ombros}', 'peso corporal', 'Apoie antebraços e pés, mantenha o corpo alinhado e o abdômen contraído pelo tempo definido.'),
  (null, 'Abdominal na polia', '{reto abdominal}', '{}', 'polia', 'Ajoelhado, flexione o tronco trazendo os cotovelos em direção aos joelhos.'),
  (null, 'Elevação de pernas', '{reto abdominal}', '{flexores do quadril}', 'barra fixa', 'Pendurado ou apoiado, eleve as pernas sem balançar o corpo.'),
  (null, 'Corrida na esteira', '{cardio}', '{pernas}', 'esteira', 'Registre o tempo em minutos no campo de repetições e a velocidade nas observações.'),
  (null, 'Bicicleta ergométrica', '{cardio}', '{pernas}', 'bicicleta', 'Registre o tempo em minutos no campo de repetições.'),
  (null, 'Remo ergômetro', '{cardio}', '{dorsais,pernas}', 'remo', 'Empurre com as pernas, depois puxe com os braços; registre o tempo em minutos.');
