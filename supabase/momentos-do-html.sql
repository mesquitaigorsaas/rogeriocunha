-- =====================================================================
-- AS FOTOS DA GALERIA SAEM DO HTML E ENTRAM NO BANCO
--
-- A galeria da página inicial mostra três fotos do Rogério. Elas estão
-- escritas no HTML desde que o site nasceu — e por isso o painel de
-- Editar momentos não as enxergava: ele lê a tabela, e a tabela estava
-- vazia.
--
-- Do lado de fora o efeito era estranho: o site cheio de fotos e o
-- painel dizendo "nenhuma foto ainda". Nenhum dos dois estava errado;
-- eles simplesmente olhavam para lugares diferentes.
--
-- Este arquivo passa as três para a tabela, com o mesmo corte e o mesmo
-- texto alternativo que já tinham na página. A partir daí o painel as
-- lista, e ele pode trocar, reordenar e apagar como as outras.
--
-- O caminho começa com barra — "/assets/..." — e não com "assets/...".
-- A página inicial mora na raiz e as duas formas funcionariam nela; o
-- painel mora em /editar/, onde a forma sem barra viraria
-- "/editar/assets/..." e não acharia a foto.
-- =====================================================================

-- O "where not exists" existe para o arquivo poder ser rodado duas
-- vezes sem estragar nada. Não há restrição de unicidade em
-- imagem_url, e um "on conflict" não pegaria: a chave é um uuid
-- gerado, que nunca conflita. Sem esta guarda, rodar de novo por
-- engano deixaria a galeria com seis fotos, três delas repetidas.
insert into public.momentos (imagem_url, descricao, enquadramento, ordem, destaque, publicado)
select v.imagem_url, v.descricao, v.enquadramento, v.ordem, v.destaque, true
  from (values
    -- A grande, que abre a galeria. O 36% tira o corte da testa: é
    -- retrato vertical dentro de um quadro que a galeria fixa.
    ('/assets/img/RogerioCunha4.jpeg', 'Rogério Cunha sentado à mesa', 'center 36%', 10, true),
    ('/assets/img/RogerioCunha1.jpeg', 'Rogério Cunha',                'center 34%', 20, false),
    ('/assets/img/RogerioCunha2.jpeg', 'Rogério Cunha',                'center 20%', 30, false)
  ) as v(imagem_url, descricao, enquadramento, ordem, destaque)
 where not exists (
    select 1 from public.momentos m where m.imagem_url = v.imagem_url
 );


-- ---------------------------------------------------------------------
-- Para conferir depois de rodar:
--
--   select ordem, descricao, enquadramento, imagem_url
--     from public.momentos
--    order by ordem;
--
-- Devem aparecer as três, e o painel de Editar momentos passa a
-- lista-las.
--
-- Se quiser voltar atrás, apagando só estas três:
--
--   delete from public.momentos where imagem_url like '/assets/img/RogerioCunha%';
-- ---------------------------------------------------------------------
