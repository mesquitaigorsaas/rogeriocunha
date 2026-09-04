-- =====================================================================
-- AS LISTAS QUE ELE MONTA E DESMONTA — parte 2 do banco
--
-- Rode no SQL Editor do projeto, depois do schema.sql, de uma vez, de
-- cima para baixo.
--
-- O schema.sql deixou isto anotado para depois: "as listas que ele monta
-- e desmonta — livros, vídeos, fotos — viram tabelas próprias quando o
-- jeito de editar estiver aprovado". O jeito foi aprovado: ele entra,
-- clica em Editar ao lado do que quer mudar. Então é agora.
--
--   videos     os vídeos do YouTube, na ordem em que aparecem
--   livros     a obra dele, com capa, sinopse e preço
--   momentos   as fotos da galeria
--
-- AS TRÊS SE PARECEM DE PROPÓSITO
--
-- Todas têm "ordem" e "publicado", e todas leem para o público e
-- escrevem só para o editor. Uma tela de edição que funciona numa
-- funciona nas outras, e quem for mexer nisso daqui a um ano aprende o
-- padrão uma vez.
--
-- ORDEM, E NÃO DATA DE CRIAÇÃO
--
-- É ele quem decide o que vem primeiro. Numa vitrine, "o mais recente
-- primeiro" é palpite do programador: o livro que ele quer empurrar
-- este mês pode ser o mais antigo dos quatro.
--
-- Os números não precisam ser 1, 2, 3. Ficam de 10 em 10 na carga
-- inicial, para caber um item novo no meio sem renumerar a lista toda.
-- =====================================================================


-- =====================================================================
-- 1. OS VÍDEOS
-- =====================================================================

create table if not exists public.videos (
    id uuid primary key default gen_random_uuid(),

    -- Só o código do YouTube, não o endereço inteiro. "AbCdEf12345", e
    -- não "https://youtube.com/watch?v=AbCdEf12345".
    --
    -- Quem cola o endereço inteiro é a pessoa; quem separa o código é a
    -- tela de edição, antes de gravar. Guardar o código cru é o que
    -- permite montar a capa e o player sem remontar endereço na mão em
    -- três lugares diferentes.
    codigo_youtube text not null check (length(trim(codigo_youtube)) > 0),

    titulo text not null default '',
    legenda text not null default '',

    -- O primeiro da lista aparece grande, em cima; os outros vão para a
    -- fileira. É a forma da seção hoje, e sai daqui em vez de sair da
    -- posição no HTML.
    destaque boolean not null default false,

    ordem integer not null default 0,
    publicado boolean not null default true,

    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists videos_em_ordem
    on public.videos (publicado, destaque desc, ordem);

alter table public.videos enable row level security;

drop policy if exists "todos veem video publicado" on public.videos;
create policy "todos veem video publicado"
    on public.videos for select
    using (publicado = true);

drop policy if exists "editor faz tudo com video" on public.videos;
create policy "editor faz tudo com video"
    on public.videos for all
    using (public.eh_editor())
    with check (public.eh_editor());


-- =====================================================================
-- 2. OS LIVROS
--
-- O preço é numeric, e não texto.
--
-- Guardar "R$ 68,00" como texto é o começo de uma lista onde um livro
-- custa "R$ 68,00", outro "68 reais" e o terceiro "R$ 68" — e nenhuma
-- conta é possível depois. O número fica cru, e quem escreve o "R$" é a
-- página, uma vez só.
--
-- Nulo é preço não informado, e não zero. Zero é de graça; nulo é "ele
-- ainda não me mandou". Hoje os quatro livros estão nulos, esperando os
-- valores, e o cartão simplesmente não mostra linha de preço.
-- =====================================================================

create table if not exists public.livros (
    id uuid primary key default gen_random_uuid(),

    titulo text not null check (length(trim(titulo)) > 0),
    subtitulo text not null default '',
    sinopse text not null default '',

    capa_url text,

    -- "240 páginas · 148x210mm". Texto livre porque cada livro traz uma
    -- combinação diferente de dados na contracapa, e uma coluna para
    -- cada um viraria metade delas vazia.
    ficha text not null default '',

    editora text not null default '',

    preco numeric(10, 2) check (preco is null or preco >= 0),

    -- O de cima, grande, com a sinopse inteira. Os outros vão para a
    -- grade.
    destaque boolean not null default false,

    ordem integer not null default 0,
    publicado boolean not null default true,

    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists livros_em_ordem
    on public.livros (publicado, destaque desc, ordem);

alter table public.livros enable row level security;

drop policy if exists "todos veem livro publicado" on public.livros;
create policy "todos veem livro publicado"
    on public.livros for select
    using (publicado = true);

drop policy if exists "editor faz tudo com livro" on public.livros;
create policy "editor faz tudo com livro"
    on public.livros for all
    using (public.eh_editor())
    with check (public.eh_editor());


-- =====================================================================
-- 3. OS MOMENTOS
--
-- A galeria. Uma foto grande e as outras menores, do jeito que a seção
-- já é hoje.
-- =====================================================================

create table if not exists public.momentos (
    id uuid primary key default gen_random_uuid(),

    imagem_url text not null check (length(trim(imagem_url)) > 0),

    -- Vira o alt da imagem. Não aparece na tela, e é o que uma pessoa
    -- cega ouve no lugar da foto — e o que o Google lê.
    descricao text not null default '',

    -- "center 36%": por onde cortar a foto dentro do quadro. A galeria
    -- recorta tudo num formato fixo, e sem isto um retrato vertical sai
    -- com a testa cortada.
    --
    -- Texto livre com um padrão sensato, porque é valor de CSS: quem
    -- mexe nisso é a tela de edição, com um controle, e não a pessoa
    -- digitando porcentagem.
    enquadramento text not null default 'center 50%',

    destaque boolean not null default false,

    ordem integer not null default 0,
    publicado boolean not null default true,

    criado_em timestamptz not null default now()
);

create index if not exists momentos_em_ordem
    on public.momentos (publicado, destaque desc, ordem);

alter table public.momentos enable row level security;

drop policy if exists "todos veem momento publicado" on public.momentos;
create policy "todos veem momento publicado"
    on public.momentos for select
    using (publicado = true);

drop policy if exists "editor faz tudo com momento" on public.momentos;
create policy "editor faz tudo com momento"
    on public.momentos for all
    using (public.eh_editor())
    with check (public.eh_editor());


-- =====================================================================
-- 4. A HORA DA ÚLTIMA ALTERAÇÃO
--
-- Usa a mesma função que o schema.sql já criou.
-- =====================================================================

drop trigger if exists videos_atualizado_em on public.videos;
create trigger videos_atualizado_em
    before update on public.videos
    for each row execute function public.tocar_atualizado_em();

drop trigger if exists livros_atualizado_em on public.livros;
create trigger livros_atualizado_em
    before update on public.livros
    for each row execute function public.tocar_atualizado_em();


-- =====================================================================
-- 5. OS QUATRO LIVROS QUE JÁ ESTÃO NO SITE
--
-- Entram com o que já está publicado hoje: título, subtítulo, sinopse
-- da contracapa e a capa recortada da arte de gráfica.
--
-- O preço fica nulo nos quatro, que é a verdade — o autor ainda não
-- passou os valores. Quando passar, é ele mesmo quem digita na tela de
-- edição, sem precisar de SQL.
--
-- "on conflict do nothing" pelo título: rodar de novo não duplica.
-- =====================================================================

create unique index if not exists livros_titulo_unico
    on public.livros (titulo);

insert into public.livros (titulo, subtitulo, sinopse, capa_url, ficha, editora, destaque, ordem)
values
    (
        'Fernando Pessoa: O Gênio de Mil Faces',
        'A arquitetura da alma que deu voz a um universo de “eus”',
        'Um mapa para atravessar o universo de um dos maiores nomes da literatura em língua portuguesa. Uma jornada pela vida, pela mente e pela obra de Fernando Pessoa: dos anos de formação em Durban ao retorno a Lisboa, acompanhando a eclosão de uma trajetória marcada pela genialidade, pela inquietação intelectual e pela criação de múltiplas identidades poéticas.

Mais do que uma biografia, o livro mergulha na psicografia de Pessoa, investigando a gênese e a evolução de seus heterônimos e revelando as conexões entre vida, pensamento e criação literária.',
        'assets/img/capa-fernando-pessoa.jpg',
        '',
        'Literando',
        true,
        10
    ),
    (
        'A Sombra da Guerra',
        'Campos de Concentração no Brasil',
        'Uma análise das realidades negligenciadas dos campos de concentração no Brasil, da Era Vargas até os dias atuais — e do que esses locais deixaram na sociedade brasileira.',
        'assets/img/capa-sombra-da-guerra.jpg',
        '240 páginas · 148x210mm',
        '',
        false,
        20
    ),
    (
        'Contos Aleatórios',
        'Treze contos que atravessam épocas, guerras e memórias',
        'Um convento na Polônia ocupada, um romance proibido entre inimigos de guerra, uma investigação nos becos de Paris. Sem um fio narrativo único, os contos se conectam pelo mesmo olhar: como o amor, a perda, a coragem e o medo atravessam qualquer tempo.',
        'assets/img/capa-contos-aleatorios.jpg',
        '',
        '',
        false,
        30
    ),
    (
        'A Lenda de Arthur',
        'Entre a Tradição Medieval e o Renascimento',
        '',
        'assets/img/capa-lenda-de-arthur.jpg',
        '240 páginas · 148x210mm',
        '',
        false,
        40
    )
on conflict (titulo) do nothing;


-- =====================================================================
-- Para conferir depois de rodar:
--
--   select titulo, destaque, ordem, preco from public.livros order by ordem;
--   -- quatro linhas, preço nulo nas quatro
--
--   select count(*) from public.videos;    -- zero, por enquanto
--   select count(*) from public.momentos;  -- zero, por enquanto
-- =====================================================================
