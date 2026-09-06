-- =====================================================================
-- O ZOOM DA FOTO NA GALERIA
--
-- O quadro da galeria é quadrado e não muda. Não dá para saber se a
-- próxima foto que ele subir é retrato ou paisagem, nem que canto dela
-- importa — então quem decide o recorte é ele, foto a foto, pegando a
-- imagem e arrastando dentro do quadrado.
--
-- Arrastar sozinho não bastava. Uma foto quadrada cabe justa no quadro
-- e não tem para onde ir; e mesmo num retrato, ele só conseguia
-- escolher a faixa de cima ou de baixo, nunca aproximar o rosto. O zoom
-- resolve os dois: aproxima, e ao aproximar cria a folga que faltava
-- para arrastar de lado.
--
-- A coluna "enquadramento", que já existia, continua guardando onde a
-- foto está — só que agora com os dois lados ("50% 36%") em vez de um
-- só ("center 36%"). O site lê as duas formas, então as linhas antigas
-- continuam valendo sem precisar ser reescritas.
-- =====================================================================

-- 1 é a foto inteira, do jeito que o object-fit: cover a deixa. Acima
-- disso é aproximação. O teto de 4 não é arbitrário: as fotos são de
-- celular, e passando disso o rosto começa a esfarelar na tela grande.
-- Deixar ele ampliar até borrar seria oferecer um caminho que estraga
-- a própria foto.
alter table public.momentos
    add column if not exists zoom real not null default 1
        check (zoom >= 1 and zoom <= 4);


-- ---------------------------------------------------------------------
-- Para conferir depois de rodar:
--
--   select ordem, descricao, enquadramento, zoom
--     from public.momentos
--    order by ordem;
--
-- As três fotos de hoje devem aparecer com zoom = 1 e o enquadramento
-- que já tinham. A partir daí, o que ele mexer no painel grava aqui.
--
-- Se quiser voltar atrás:
--
--   alter table public.momentos drop column if exists zoom;
-- ---------------------------------------------------------------------
