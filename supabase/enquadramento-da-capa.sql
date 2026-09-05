-- =====================================================================
-- ONDE A CAPA É CORTADA
--
-- A arte que a gráfica entrega vem aberta: contracapa, lombada e capa
-- na mesma imagem, deitada. O site mostra só a capa da frente, em pé.
--
-- Pedir para ele recortar a imagem antes de subir seria pedir para ele
-- abrir um editor de imagem no celular. Em vez disso, a imagem sobe
-- inteira e ele arrasta uma barra até a capa aparecer na moldura — a
-- mesma solução que os momentos já usam para as fotos da galeria.
--
-- Guarda o valor pronto de CSS ("82% center"), e não um número solto.
-- Assim a página só joga o texto no object-position, sem precisar
-- saber o que ele significa nem remontar a frase.
-- =====================================================================

alter table public.livros
    add column if not exists enquadramento text not null default '50% center';

comment on column public.livros.enquadramento is
    'object-position da capa dentro da moldura em pé. A arte da gráfica vem deitada, com contracapa e lombada; isto escolhe que parte dela aparece.';


-- ---------------------------------------------------------------------
-- Para conferir depois de rodar:
--
--   select titulo, enquadramento from public.livros order by ordem;
--   -- os quatro devem responder "50% center" até ele ajustar cada um
-- ---------------------------------------------------------------------
