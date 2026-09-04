/* =====================================================================
   OS TEXTOS, VINDOS DO BANCO

   Duas telas, o mesmo arquivo:

     index.html    a fileira de cartões da seção "Textos recentes"
     texto.html    a página de um texto, aberta por texto.html?id=...

   ---------------------------------------------------------------------
   O HTML CONTINUA SENDO O CHÃO

   Vale aqui a mesma regra que já vale para os textos soltos, em
   edicao.js: o que está escrito no HTML é conteúdo de verdade, e o banco
   só entra por cima quando tem o que dizer.

   Banco fora do ar, projeto pausado pelos 7 dias de inatividade do plano
   gratuito, internet ruim no meio do carregamento — em qualquer um
   desses casos a página mostra o que já está no HTML, e quem visita não
   percebe nada. O contrário disso é a seção de textos aparecer vazia
   justamente no dia em que alguém foi ler.

   Há uma exceção, e ela é de propósito. Se o endereço traz um id, o
   banco respondeu, e simplesmente não existe texto com aquele id, aí a
   página não pode mostrar o texto de exemplo: seria entregar um texto
   qualquer para quem pediu outro. Esse caso vira um recado de texto não
   encontrado.

   ---------------------------------------------------------------------
   NADA DE innerHTML COM O QUE VEIO DO BANCO

   Título, linha fina e corpo entram por textContent, sempre. O corpo é
   gravado como o autor escreveu — texto puro, com as quebras de
   parágrafo —, e é aqui que ele vira <p>. Se um dia alguém colar HTML
   dentro de um texto, ele aparece como texto, que é o que é.
   ===================================================================== */
(function () {
    'use strict';

    // O cliente do banco é o mesmo de edicao.js. Dois clientes na mesma
    // página brigam pela sessão guardada no navegador: um renova o
    // acesso, o outro segue com o antigo, e o Rogério é deslogado do
    // nada no meio de uma edição.
    const banco = window.BANCO;
    if (!banco) return;

    const MESES = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    /**
     * "12 de agosto" na home, "12 de agosto de 2026" na página do texto.
     *
     * O ano fica de fora do cartão porque ali ele só ocupa espaço: os
     * textos da fileira são sempre os mais recentes. Na página aberta,
     * onde alguém pode chegar por um link de dois anos atrás, o ano é a
     * informação que evita o mal-entendido.
     *
     * A data vem do banco como "2026-08-12", sem fuso. Se ela fosse
     * lida por new Date('2026-08-12'), o JavaScript entenderia meia-noite
     * em UTC e, no horário de Brasília, mostraria o dia 11.
     */
    function dataEscrita(iso, comAno) {
        if (!iso) return '';

        const [ano, mes, dia] = String(iso).split('-').map(Number);
        if (!ano || !mes || !dia) return '';

        const escrita = `${dia} de ${MESES[mes - 1]}`;
        return comAno ? `${escrita} de ${ano}` : escrita;
    }

    /** "12 de agosto · Sociedade", pulando o que não existe. */
    function linhaDeApoio(artigo, comAno) {
        return [dataEscrita(artigo.publicado_em, comAno), artigo.categoria]
            .filter(Boolean)
            .join(' · ');
    }

    /**
     * Troca o conteúdo de um elemento, ou o tira da tela se não há o que
     * pôr nele.
     *
     * Um texto sem linha fina não deve deixar no lugar a linha fina do
     * exemplo que estava no HTML, nem um parágrafo vazio abrindo um buraco
     * no meio do título e do corpo.
     */
    function escreverOuSumir(elemento, valor) {
        if (!elemento) return;

        if (valor) {
            elemento.textContent = valor;
            elemento.hidden = false;
        } else {
            elemento.hidden = true;
        }
    }

    /**
     * Põe a imagem do texto no lugar do espaço reservado.
     *
     * Sem imagem, o espaço reservado do HTML fica como está: é ele que
     * segura a altura do cartão e mantém a fileira alinhada.
     */
    function trocarImagem(moldura, url, descricao) {
        if (!moldura || !url) return;

        const img = document.createElement('img');
        img.src = url;
        img.alt = descricao ? `Imagem de: ${descricao}` : '';
        img.loading = 'lazy';

        moldura.replaceChildren(img);
    }


    // =================================================================
    // A FILEIRA DE CARTÕES, NA PÁGINA INICIAL
    // =================================================================

    function montarCartao(artigo) {
        const cartao = document.createElement('a');
        cartao.className = 'cartao-texto';
        cartao.href = 'texto.html?id=' + encodeURIComponent(artigo.id);

        const capa = document.createElement('div');
        capa.className = 'cartao-capa';

        // O mesmo espaço reservado do HTML, para o cartão sem imagem
        // continuar do tamanho dos outros.
        const reservado = document.createElement('div');
        reservado.className = 'reservado';
        reservado.innerHTML = '<b>Imagem</b>';
        reservado.append('Horizontal');
        capa.appendChild(reservado);

        trocarImagem(capa, artigo.imagem_url, artigo.titulo);

        const meta = document.createElement('p');
        meta.className = 'cartao-meta';
        meta.textContent = linhaDeApoio(artigo, false);

        const titulo = document.createElement('h3');
        titulo.textContent = artigo.titulo;

        const chamada = document.createElement('p');
        chamada.textContent = artigo.linha_fina || '';

        const continua = document.createElement('span');
        continua.className = 'cartao-continua';
        continua.textContent = 'Continuar lendo';

        cartao.append(capa, meta, titulo);
        if (artigo.linha_fina) cartao.appendChild(chamada);
        cartao.appendChild(continua);

        return cartao;
    }

    async function montarFileiraDeTextos() {
        const grade = document.querySelector('.grade-textos');
        if (!grade) return;

        // Três, que é o que cabe na fileira. Quando ele tiver escrito
        // mais do que isso, os três mais recentes são os que aparecem.
        const { data, error } = await banco
            .from('artigos')
            .select('id, titulo, linha_fina, imagem_url, categoria, publicado_em')
            .eq('publicado', true)
            .order('publicado_em', { ascending: false })
            .limit(3);

        // Deu erro, ou ele ainda não publicou nenhum: fica o que está no
        // HTML. Não há o que avisar a quem visita.
        if (error || !data || data.length === 0) return;

        grade.replaceChildren(...data.map(montarCartao));
    }


    // =================================================================
    // A PÁGINA DE UM TEXTO
    // =================================================================

    /**
     * O corpo do texto, de texto puro para parágrafos.
     *
     * Uma linha em branco separa parágrafos; uma quebra sozinha, dentro
     * do mesmo parágrafo, continua sendo a mesma frase. É como se escreve
     * num editor comum, e é o que o autor espera ao colar de um Word.
     */
    function paragrafosDoCorpo(corpo) {
        return String(corpo || '')
            .split(/\n\s*\n/)
            .map((pedaco) => pedaco.trim().replace(/\s*\n\s*/g, ' '))
            .filter(Boolean)
            .map((texto) => {
                const p = document.createElement('p');
                p.textContent = texto;
                return p;
            });
    }

    function escreverArtigo(artigo) {
        document.title = `${artigo.titulo} — Rogério Cunha`;

        const descricao = document.querySelector('meta[name="description"]');
        if (descricao && artigo.linha_fina) {
            descricao.setAttribute('content', artigo.linha_fina);
        }

        const topo = document.querySelector('.artigo-topo');
        if (topo) {
            escreverOuSumir(topo.querySelector('.cartao-meta'), linhaDeApoio(artigo, true));
            escreverOuSumir(topo.querySelector('h1'), artigo.titulo);
            escreverOuSumir(topo.querySelector('.artigo-linha-fina'), artigo.linha_fina);
        }

        trocarImagem(document.querySelector('.artigo-capa'), artigo.imagem_url, artigo.titulo);

        // O corpo é só a parte de cima do .corpo-artigo. Embaixo dele
        // moram a assinatura do autor e os comentários, que não são do
        // texto e não podem ser varridos junto.
        const caixa = document.querySelector('.corpo-artigo');
        const assinatura = caixa && caixa.querySelector('.assinatura-artigo');
        if (!caixa || !assinatura) return;

        while (caixa.firstChild && caixa.firstChild !== assinatura) {
            caixa.removeChild(caixa.firstChild);
        }

        for (const paragrafo of paragrafosDoCorpo(artigo.corpo)) {
            caixa.insertBefore(paragrafo, assinatura);
        }
    }

    /**
     * Pediu um texto que não existe.
     *
     * Aqui a página não pode cair no texto do HTML: quem chegou por um
     * link quebrado receberia um texto qualquer achando que é o que
     * pediu. Some o corpo, e fica um recado com o caminho de volta.
     */
    function textoNaoEncontrado() {
        document.title = 'Texto não encontrado — Rogério Cunha';

        const topo = document.querySelector('.artigo-topo');
        if (topo) {
            escreverOuSumir(topo.querySelector('.cartao-meta'), '');
            escreverOuSumir(topo.querySelector('h1'), 'Este texto não está mais aqui');
            escreverOuSumir(
                topo.querySelector('.artigo-linha-fina'),
                'O endereço pode ter mudado, ou o texto pode ter saído do ar.'
            );
        }

        const capa = document.querySelector('.artigo-capa');
        if (capa) capa.hidden = true;

        const caixa = document.querySelector('.corpo-artigo');
        const assinatura = caixa && caixa.querySelector('.assinatura-artigo');
        if (!caixa || !assinatura) return;

        while (caixa.firstChild && caixa.firstChild !== assinatura) {
            caixa.removeChild(caixa.firstChild);
        }

        const volta = document.createElement('p');
        const link = document.createElement('a');
        link.href = 'index.html#textos';
        link.textContent = 'Ver os textos publicados';
        volta.appendChild(link);
        caixa.insertBefore(volta, assinatura);

        // A assinatura e os comentários são de um texto que não está na
        // tela: não fazem sentido aqui.
        assinatura.hidden = true;
        const comentarios = caixa.querySelector('.comentarios');
        if (comentarios) comentarios.hidden = true;
    }

    async function abrirTexto() {
        const caixa = document.querySelector('.corpo-artigo');
        if (!caixa) return;

        const id = new URLSearchParams(window.location.search).get('id');

        // Sem id no endereço: é a página aberta na mão, ou o link antigo
        // de quando os textos eram fixos. Fica o exemplo do HTML.
        if (!id) return;

        const { data, error } = await banco
            .from('artigos')
            .select('id, titulo, linha_fina, corpo, imagem_url, categoria, publicado_em')
            .eq('id', id)
            .maybeSingle();

        // Banco fora do ar é diferente de texto inexistente. No primeiro
        // caso a página fica como está; no segundo, avisa.
        if (error) return;
        if (!data) {
            textoNaoEncontrado();
            return;
        }

        escreverArtigo(data);
    }


    // =================================================================
    // ENTRADA
    // =================================================================
    montarFileiraDeTextos();
    abrirTexto();
})();
