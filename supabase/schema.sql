-- =====================================================================
-- O banco do site do Rogério Cunha — parte 1: textos e comentários
--
-- Rode no SQL Editor do projeto, de uma vez, de cima para baixo.
--
-- O QUE ENTRA AQUI
--
--   editores    quem pode mexer no site. Uma linha só, a do Rogério.
--   conteudos   cada pedaço de texto solto do site, por nome.
--   artigos     os textos que ele escreve, com página própria.
--   comentarios o que os leitores escrevem embaixo deles.
--
-- As listas que ele monta e desmonta — livros, vídeos, fotos — viram
-- tabelas próprias depois, quando o jeito de editar estiver aprovado.
-- =====================================================================


-- =====================================================================
-- 1. QUEM PODE EDITAR
--
-- Uma tabela em vez de comparar e-mail no meio do código. O dia em que
-- for preciso dar acesso a mais alguém — um filho que ajuda, você
-- mesmo para dar suporte — é inserir uma linha, e não editar e
-- republicar o site.
--
-- Ninguém se cadastra sozinho como editor: a tabela não aceita escrita
-- de ninguém (não há policy de INSERT). Editor novo entra pelo painel
-- do Supabase, por quem tem a senha da conta.
-- =====================================================================

create table if not exists public.editores (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    criado_em timestamptz not null default now()
);

alter table public.editores enable row level security;

-- A pergunta "esta pessoa pode editar?", feita em um lugar só.
--
-- security definer para a função poder ler a tabela mesmo com o RLS
-- ligado. Sem isso, a regra que usa a função precisaria ler a tabela
-- que a própria regra protege, e o banco entra em roda-viva.
create or replace function public.eh_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.editores where id = auth.uid());
$$;

-- O editor enxerga a própria linha. Serve para o site saber, ao abrir,
-- se mostra ou não os botões de editar.
drop policy if exists "editor le a propria linha" on public.editores;
create policy "editor le a propria linha"
    on public.editores for select
    using (id = auth.uid());


-- =====================================================================
-- 2. OS TEXTOS
--
-- "publicado" existe para ele poder escrever aos poucos. Um texto de
-- fôlego não sai numa sentada, e sem rascunho a única opção seria
-- escrever tudo de uma vez ou deixar meio texto no ar.
-- =====================================================================

create table if not exists public.artigos (
    id uuid primary key default gen_random_uuid(),

    titulo text not null check (length(trim(titulo)) > 0),

    -- A frase de chamada: aparece no cartão da página inicial e logo
    -- abaixo do título, na página do texto.
    linha_fina text,

    -- O texto inteiro. Guardado como o autor escreveu, com as quebras
    -- de parágrafo; quem transforma em HTML é a página, na hora de
    -- mostrar. Gravar HTML aqui deixaria a formatação presa ao desenho
    -- de hoje, e daria para colar código dentro do próprio texto.
    corpo text not null default '',

    -- Só o endereço da imagem. O arquivo mora no depósito criado na
    -- parte 5, lá embaixo.
    imagem_url text,

    -- "Sociedade", "Comportamento", "História". Texto livre de
    -- propósito: uma lista fechada obrigaria a mexer no banco toda vez
    -- que ele quisesse escrever sobre um assunto novo.
    categoria text,

    -- A data que aparece na tela. Separada de criado_em porque ele pode
    -- querer publicar hoje um texto escrito no mês passado, com a data
    -- em que foi escrito.
    publicado_em date not null default current_date,

    publicado boolean not null default false,

    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists artigos_publicados
    on public.artigos (publicado, publicado_em desc);

alter table public.artigos enable row level security;

-- Quem visita lê o que está publicado. Rascunho não.
drop policy if exists "todos leem artigo publicado" on public.artigos;
create policy "todos leem artigo publicado"
    on public.artigos for select
    using (publicado = true);

-- O editor enxerga tudo, inclusive os rascunhos, e faz tudo.
drop policy if exists "editor faz tudo com artigo" on public.artigos;
create policy "editor faz tudo com artigo"
    on public.artigos for all
    using (public.eh_editor())
    with check (public.eh_editor());


-- =====================================================================
-- 3. OS TEXTOS SOLTOS DO SITE
--
-- A frase grande da abertura, os títulos de seção, a biografia, o
-- texto dos botões. Tudo que é palavra na tela e não pertence a uma
-- lista.
--
-- Uma tabela de nome e valor, e não uma coluna para cada frase. São
-- dezenas de pedaços espalhados por três páginas, e uma coluna para
-- cada um significaria mexer no banco toda vez que o site ganhasse um
-- parágrafo. Aqui, o pedaço novo nasce quando o HTML o nomeia.
--
-- A chave é o endereço do pedaço na tela: "abertura.titulo",
-- "sobre.biografia". Quem lê o banco daqui a um ano precisa saber de
-- onde veio cada linha sem abrir o site para procurar.
--
-- O QUE ESTA TABELA NÃO FAZ, E É DE PROPÓSITO
--
-- Ela não é a fonte única do texto. O texto continua escrito no HTML,
-- e o que está aqui só substitui o que lá está. Um pedaço que o
-- Rogério nunca editou não tem linha nenhuma aqui.
--
-- Isso resolve três problemas de uma vez:
--
--   O site nunca abre em branco. Se o banco cair, ou for pausado por
--   inatividade — o plano gratuito pausa depois de 7 dias sem uso —,
--   a página mostra o texto do HTML e ninguém percebe.
--
--   O Google continua lendo o site. Texto que só existe depois de uma
--   consulta ao banco é texto que o buscador pode não esperar. Para o
--   site de um escritor, ser achado pelo nome é metade do serviço.
--
--   A primeira carga é imediata. Não existe um segundo em branco
--   esperando o banco responder.
-- =====================================================================

create table if not exists public.conteudos (
    chave text primary key check (length(trim(chave)) > 0),
    valor text not null default '',
    atualizado_em timestamptz not null default now()
);

alter table public.conteudos enable row level security;

-- É o texto do site: existe para ser lido.
drop policy if exists "todos leem conteudo" on public.conteudos;
create policy "todos leem conteudo"
    on public.conteudos for select
    using (true);

drop policy if exists "editor escreve conteudo" on public.conteudos;
create policy "editor escreve conteudo"
    on public.conteudos for all
    using (public.eh_editor())
    with check (public.eh_editor());


-- =====================================================================
-- 4. OS COMENTÁRIOS
--
-- Entram publicados, sem esperar aprovação — decisão do autor. O que
-- sustenta essa escolha é o botão de apagar estar à mão, na própria
-- página, para ele tirar em um clique o que não deve ficar.
--
-- O leitor não cria conta: informa nome e e-mail no formulário. Quem
-- tem conta de verdade neste site é só o editor.
-- =====================================================================

create table if not exists public.comentarios (
    id uuid primary key default gen_random_uuid(),

    artigo_id uuid not null references public.artigos(id) on delete cascade,

    nome text not null check (length(trim(nome)) between 2 and 80),

    -- Nunca aparece no site. A parte 6, lá embaixo, é o que garante
    -- isso do lado do banco — e não só do lado da página.
    email text not null check (position('@' in email) > 1),

    texto text not null check (length(trim(texto)) between 2 and 4000),

    -- Preenchido sozinho com quem está logado. Visitante não está
    -- logado, então cai nulo; quando tem valor, é o editor.
    --
    -- É isto que dá o selo de "Autor" embaixo do comentário: o selo sai
    -- de quem estava logado, e não do nome que foi digitado. Nome
    -- digitado qualquer um escolhe.
    autor_id uuid references auth.users(id) on delete set null,

    criado_em timestamptz not null default now(),

    -- Ninguém assina como o dono da casa.
    --
    -- Sem isto, um visitante escreve "Rogério Cunha" no campo de nome e
    -- responde a si mesmo embaixo do próprio texto do autor. O selo de
    -- Autor não apareceria, mas o nome sim — e é o nome que as pessoas
    -- leem. Vale para quem não está logado; o Rogério, logado, assina
    -- com o nome dele normalmente.
    constraint nome_nao_se_passa_pelo_autor check (
        autor_id is not null
        or lower(trim(nome)) not in (
            'rogerio cunha', 'rogério cunha', 'rogerio', 'rogério',
            'r. cunha', 'dr. rogerio cunha', 'dr. rogério cunha'
        )
    )
);

create index if not exists comentarios_do_artigo
    on public.comentarios (artigo_id, criado_em);

alter table public.comentarios enable row level security;

-- Todo mundo lê os comentários. Quais colunas cada um alcança é a
-- parte 6 que decide — o e-mail fica de fora para o visitante.
drop policy if exists "todos leem comentarios" on public.comentarios;
create policy "todos leem comentarios"
    on public.comentarios for select
    using (true);

-- Qualquer visitante comenta. O autor_id precisa bater com quem está
-- logado: visitante (não logado) só consegue gravar nulo, e não tem
-- como se marcar como autor escrevendo um id qualquer no lugar.
drop policy if exists "visitante comenta" on public.comentarios;
create policy "visitante comenta"
    on public.comentarios for insert
    with check (autor_id is not distinct from auth.uid());

-- Apagar e corrigir: só o editor.
drop policy if exists "editor apaga comentario" on public.comentarios;
create policy "editor apaga comentario"
    on public.comentarios for delete
    using (public.eh_editor());

drop policy if exists "editor corrige comentario" on public.comentarios;
create policy "editor corrige comentario"
    on public.comentarios for update
    using (public.eh_editor())
    with check (public.eh_editor());


-- =====================================================================
-- 5. AS IMAGENS
--
-- Depósito público para leitura: são imagens de um site, existem para
-- serem vistas. Só o editor põe e tira.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists "todos veem imagem" on storage.objects;
create policy "todos veem imagem"
    on storage.objects for select
    using (bucket_id = 'imagens');

drop policy if exists "editor envia imagem" on storage.objects;
create policy "editor envia imagem"
    on storage.objects for insert
    with check (bucket_id = 'imagens' and public.eh_editor());

drop policy if exists "editor apaga imagem" on storage.objects;
create policy "editor apaga imagem"
    on storage.objects for delete
    using (bucket_id = 'imagens' and public.eh_editor());


-- =====================================================================
-- 6. O E-MAIL DE QUEM COMENTA NÃO É PÚBLICO
--
-- Esta parte é a mais fácil de esquecer e a mais cara de esquecer.
--
-- As regras de RLS acima decidem QUAIS LINHAS cada um lê — e a linha do
-- comentário é pública, porque o comentário é público. Só que o e-mail
-- mora na mesma linha. Sem o que vem abaixo, qualquer pessoa pediria
--
--     /rest/v1/comentarios?select=nome,email
--
-- e receberia a lista de e-mails de todos os leitores do site. O site
-- na tela nunca mostraria isso; a API mostraria, e ninguém perceberia.
--
-- A permissão por coluna resolve no lugar certo: o visitante anônimo
-- simplesmente não tem permissão de ler essa coluna, e o pedido acima
-- passa a ser recusado pelo banco.
-- =====================================================================

revoke select on public.comentarios from anon;

grant select (id, artigo_id, nome, texto, autor_id, criado_em)
    on public.comentarios to anon;

grant insert (artigo_id, nome, email, texto, autor_id)
    on public.comentarios to anon;

-- Quem está logado — só o editor tem conta aqui — enxerga tudo,
-- inclusive o e-mail, que é o que ele precisa para responder.
grant select, insert, update, delete on public.comentarios to authenticated;


-- =====================================================================
-- 7. A HORA DA ÚLTIMA ALTERAÇÃO, SEM DEPENDER DE LEMBRAR
-- =====================================================================

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
    new.atualizado_em = now();
    return new;
end;
$$;

drop trigger if exists artigos_atualizado_em on public.artigos;
create trigger artigos_atualizado_em
    before update on public.artigos
    for each row execute function public.tocar_atualizado_em();

drop trigger if exists conteudos_atualizado_em on public.conteudos;
create trigger conteudos_atualizado_em
    before update on public.conteudos
    for each row execute function public.tocar_atualizado_em();


-- =====================================================================
-- 8. QUEM É O EDITOR  ←  FALTA FAZER, E SEM ISTO NINGUÉM EDITA NADA
--
-- Passo a passo, no painel do Supabase:
--
--   1. Authentication → Users → Add user → Create new user
--      E-mail e senha do Rogério. Marque "Auto Confirm User", senão
--      ele fica esperando um e-mail de confirmação que ninguém abriu.
--
--   2. Copie o UID que aparece na lista de usuários.
--
--   3. Rode aqui, trocando o UID e o nome:
--
--        insert into public.editores (id, nome)
--        values ('COLE-O-UID-AQUI', 'Rogério Cunha');
--
-- Enquanto esta linha não existir, o site abre normal para quem visita,
-- mas nenhum botão de editar aparece — nem para você.
--
-- Note que não existe tela de "criar conta" no site. É de propósito: só
-- existe uma pessoa que edita, e uma tela de cadastro aberta seria uma
-- porta a mais para cuidar sem nenhum ganho.
-- =====================================================================
