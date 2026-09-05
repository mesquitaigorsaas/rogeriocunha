/* =====================================================================
   AS LISTAS DA PÁGINA INICIAL, VINDAS DO BANCO

   Por enquanto: os vídeos. Livros e momentos entram aqui depois, pelo
   mesmo caminho — as três tabelas foram feitas parecidas de propósito.

   Vale a mesma regra do resto do site: o HTML é o chão. Banco fora do
   ar, projeto pausado por inatividade, internet ruim no meio do
   carregamento — em qualquer um desses a seção continua mostrando o que
   já está escrito na página.
   ===================================================================== */
(function () {
    'use strict';


    // =================================================================
    // O TOCADOR DO YOUTUBE
    //
    // Isto morava solto dentro do index.html. Virou função porque agora
    // precisa rodar duas vezes: uma para o que já está no HTML, e outra
    // depois que o banco troca os quadros por outros.
    //
    // Cada quadro mostra só a capa. O tocador do YouTube — que traz
    // junto uns dois megabytes de código do Google — só entra na página
    // quando alguém clica para assistir.
    // =================================================================

    function prepararVideos(raiz) {
        (raiz || document).querySelectorAll('.video-quadro').forEach((quadro) => {
            const codigo = quadro.dataset.video;

            // Sem código ainda: fica o espaço reservado como está.
            if (!codigo || quadro.dataset.pronto === 'sim') return;
            quadro.dataset.pronto = 'sim';

            const capa = document.createElement('img');
            capa.src = `https://img.youtube.com/vi/${codigo}/maxresdefault.jpg`;
            capa.alt = '';
            capa.loading = 'lazy';

            // Vídeo antigo ou gravado em baixa não tem a miniatura
            // grande; nesse caso cai na menor, que sempre existe.
            capa.onerror = () => {
                capa.onerror = null;
                capa.src = `https://img.youtube.com/vi/${codigo}/hqdefault.jpg`;
            };

            quadro.querySelector('.video-reservado')?.remove();
            quadro.prepend(capa);

            quadro.addEventListener('click', () => {
                const tocador = document.createElement('iframe');

                // youtube-nocookie: mesma reprodução, sem o YouTube
                // deixar rastreador no navegador de quem só passou pelo
                // site. Melhor para a LGPD e não custa nada.
                tocador.src = `https://www.youtube-nocookie.com/embed/${codigo}?autoplay=1&rel=0`;
                // A legenda é irmã do quadro, então quem sabe achá-la é
                // o pai.
                tocador.title = quadro.parentElement.querySelector('.video-legenda h3')?.textContent.trim() || 'Vídeo';
                tocador.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
                tocador.allowFullscreen = true;

                quadro.innerHTML = '';
                quadro.appendChild(tocador);
                quadro.style.cursor = 'default';
            }, { once: true });
        });
    }

    // O que já está escrito na página, agora.
    prepararVideos(document);


    // =================================================================
    // OS VÍDEOS DO BANCO
    // =================================================================

    /** Um quadro de vídeo com a legenda embaixo, do jeito que o HTML já é. */
    function montarVideo(video, textoReservado) {
        const bloco = document.createElement('div');

        const quadro = document.createElement('div');
        quadro.className = 'video-quadro';
        quadro.dataset.video = video.codigo_youtube || '';

        const reservado = document.createElement('div');
        reservado.className = 'video-reservado';
        reservado.innerHTML = '<b></b>';
        reservado.querySelector('b').textContent = textoReservado;
        quadro.appendChild(reservado);

        const play = document.createElement('div');
        play.className = 'botao-play';
        quadro.appendChild(play);

        const legenda = document.createElement('div');
        legenda.className = 'video-legenda';

        const titulo = document.createElement('h3');
        titulo.textContent = video.titulo || '';
        legenda.appendChild(titulo);

        if (video.legenda) {
            const p = document.createElement('p');
            p.textContent = video.legenda;
            legenda.appendChild(p);
        }

        bloco.append(quadro, legenda);
        return bloco;
    }

    async function montarSecaoDeVideos() {
        const destaque = document.querySelector('.video-destaque');
        const grade = document.querySelector('.grade-videos');
        if (!destaque || !grade) return;

        const { data, error } = await window.BANCO
            .from('videos')
            .select('id, codigo_youtube, titulo, legenda, ordem')
            .eq('publicado', true)
            .order('ordem', { ascending: true });

        // Erro, ou ele ainda não cadastrou nenhum: fica o que está no
        // HTML. Não há o que avisar a quem visita.
        if (error || !data || data.length === 0) return;

        // O primeiro da ordem é o grande, e ponto.
        //
        // Havia uma coluna "destaque" e um botão para marcá-la. O Igor
        // olhou e disse que não entendeu para que servia — e ele tinha
        // razão: eram dois jeitos de dizer a mesma coisa, a ordem e a
        // marca, e quem editasse um sem o outro veria a página discordar
        // da tela. Agora as setas de ordem decidem tudo, e "o primeiro
        // aparece grande" é uma frase que se explica sozinha.
        const [primeiro, ...resto] = data;

        const novoDestaque = montarVideo(primeiro, 'Vídeo em destaque');
        destaque.replaceChildren(...novoDestaque.childNodes);

        grade.replaceChildren(...resto.map((v) => montarVideo(v, 'Vídeo')));

        prepararVideos(document);
    }


    // =================================================================
    // OS MOMENTOS
    //
    // A galeria tem uma foto grande e as outras menores. Quem é a
    // grande: a primeira da ordem, pela mesma razão dos vídeos — um
    // conceito a menos para ele entender.
    // =================================================================

    async function montarGaleria() {
        const galeria = document.querySelector('.galeria');
        if (!galeria) return;

        const { data, error } = await window.BANCO
            .from('momentos')
            .select('id, imagem_url, descricao, enquadramento, ordem')
            .eq('publicado', true)
            .order('ordem', { ascending: true });

        if (error || !data || data.length === 0) return;

        galeria.replaceChildren(...data.map((momento, posicao) => {
            const item = document.createElement('div');
            item.className = 'galeria-item' + (posicao === 0 ? ' grande' : '');

            const foto = document.createElement('img');
            foto.src = momento.imagem_url;
            foto.alt = momento.descricao || '';
            foto.loading = 'lazy';
            foto.style.objectPosition = momento.enquadramento || 'center 50%';

            item.appendChild(foto);
            return item;
        }));
    }


    // =================================================================
    // OS LIVROS
    //
    // Aparecem em dois lugares com a mesma cara: a seção da página
    // inicial e a página inteira de livros. Um monta os dois.
    // =================================================================

    // O WhatsApp dele. Fica aqui porque é daqui que saem os botões
    // montados na hora; os que estão escritos no HTML têm o mesmo
    // número, e os dois precisam continuar iguais.
    const WHATSAPP = '5531983071456';

    function linkDoPedido(titulo) {
        const texto = `Olá! Gostaria de um exemplar de ${titulo}.`;
        return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
    }

    /** O preço como a pessoa lê. Sem preço, devolve vazio. */
    function precoEscrito(preco) {
        if (preco === null || preco === undefined) return '';
        return Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function capaDoLivro(livro) {
        const moldura = document.createElement('div');
        moldura.className = 'capa-livro';

        if (livro.capa_url) {
            const img = document.createElement('img');
            img.src = livro.capa_url;
            img.alt = 'Capa de ' + livro.titulo;
            img.loading = 'lazy';
            moldura.appendChild(img);
            return moldura;
        }

        // Sem capa, a capa desenhada — a mesma que o HTML já usava. Um
        // retângulo vazio na vitrine parece defeito; isto parece uma
        // capa sóbria.
        const reservada = document.createElement('div');
        reservada.className = 'capa-reservada';
        const autor = document.createElement('small');
        autor.textContent = 'Rogério Cunha';
        const nome = document.createElement('strong');
        nome.textContent = livro.titulo;
        reservada.append(autor, nome, document.createElement('span'));
        moldura.appendChild(reservada);

        return moldura;
    }

    /** A sinopse, de texto puro para parágrafos. */
    function paragrafos(texto) {
        return String(texto || '')
            .split(/\n\s*\n/)
            .map((p) => p.trim().replace(/\s*\n\s*/g, ' '))
            .filter(Boolean)
            .map((t) => {
                const p = document.createElement('p');
                p.textContent = t;
                return p;
            });
    }

    function botaoDoPedido(livro) {
        const a = document.createElement('a');
        a.className = 'botao zap';
        a.href = linkDoPedido(livro.titulo);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Quero um exemplar';
        return a;
    }

    /** O livro grande, com a sinopse inteira. */
    function montarDestaque(livro, comChamada) {
        const bloco = document.createElement('div');
        bloco.className = 'livro-destaque';

        const info = document.createElement('div');
        info.className = 'livro-info';

        if (comChamada) {
            const chamada = document.createElement('p');
            chamada.className = 'chamada-acima';
            chamada.style.cssText = 'color: var(--realce); font-size: 0.7rem; letter-spacing: 0.24em; text-transform: uppercase; margin-bottom: 16px;';
            chamada.textContent = 'Lançamento';
            info.appendChild(chamada);
        }

        const titulo = document.createElement('h3');
        titulo.textContent = livro.titulo;
        info.appendChild(titulo);

        if (livro.subtitulo) {
            const sub = document.createElement('p');
            sub.className = 'livro-subtitulo';
            sub.textContent = livro.subtitulo;
            info.appendChild(sub);
        }

        info.append(...paragrafos(livro.sinopse));

        // A ficha só nasce se houver o que pôr nela. Uma caixa de ficha
        // vazia abre um buraco entre a sinopse e o preço.
        const dados = [];
        if (livro.editora) dados.push(['Editora', livro.editora]);
        if (livro.ficha) dados.push([null, livro.ficha]);

        if (dados.length) {
            const ficha = document.createElement('div');
            ficha.className = 'livro-ficha';
            for (const [rotulo, valor] of dados) {
                const item = document.createElement('div');
                if (rotulo) {
                    const b = document.createElement('b');
                    b.textContent = valor;
                    item.append(b, ' ' + rotulo.toLowerCase());
                } else {
                    item.textContent = valor;
                }
                ficha.appendChild(item);
            }
            info.appendChild(ficha);
        }

        // Sem preço, nenhuma linha de preço. Nem "consulte", nem zero.
        if (livro.preco !== null) {
            const preco = document.createElement('p');
            preco.className = 'livro-preco';
            preco.append(precoEscrito(livro.preco));
            const nota = document.createElement('small');
            nota.textContent = 'Exemplar físico · frete combinado na conversa';
            preco.appendChild(nota);
            info.appendChild(preco);
        }

        info.appendChild(botaoDoPedido(livro));

        bloco.append(capaDoLivro(livro), info);
        return bloco;
    }

    /** Um livro da grade. */
    function montarCartaoDeLivro(livro) {
        const item = document.createElement('div');
        item.className = 'item-livro';

        item.appendChild(capaDoLivro(livro));

        const titulo = document.createElement('h3');
        titulo.textContent = livro.titulo;
        item.appendChild(titulo);

        if (livro.subtitulo) {
            const sub = document.createElement('p');
            sub.className = 'livro-subtitulo';
            sub.textContent = livro.subtitulo;
            item.appendChild(sub);
        }

        item.append(...paragrafos(livro.sinopse));

        if (livro.ficha) {
            const ficha = document.createElement('p');
            ficha.className = 'ficha-curta';
            ficha.textContent = livro.ficha;
            item.appendChild(ficha);
        }

        const linha = document.createElement('div');
        linha.className = 'linha-preco';

        if (livro.preco !== null) {
            const preco = document.createElement('strong');
            preco.textContent = precoEscrito(livro.preco);
            linha.appendChild(preco);
        }

        linha.appendChild(botaoDoPedido(livro));
        item.appendChild(linha);

        return item;
    }

    async function montarLivros() {
        const destaque = document.querySelector('.livro-destaque');
        const grade = document.querySelector('.grade-livros');
        if (!destaque || !grade) return;

        const { data, error } = await window.BANCO
            .from('livros')
            .select('id, titulo, subtitulo, sinopse, capa_url, ficha, editora, preco, ordem')
            .eq('publicado', true)
            .order('ordem', { ascending: true });

        if (error || !data || data.length === 0) return;

        const [primeiro, ...resto] = data;

        // A chamada "Lançamento" só existe na página inicial; na página
        // de livros o destaque é só o primeiro da lista.
        const naHome = Boolean(document.getElementById('videos'));

        destaque.replaceWith(montarDestaque(primeiro, naHome));
        grade.replaceChildren(...resto.map(montarCartaoDeLivro));
    }


    // =================================================================
    // O BOTÃO DA SEÇÃO, PARA QUEM ESTÁ EDITANDO
    //
    // Para quem visita, "Ver todos os vídeos" leva ao Instagram dele.
    // Para ele, logado, o mesmo lugar vira a porta da tela de edição —
    // que é onde ele espera que esteja, ao lado do que quer mudar.
    // =================================================================

    function trocarBotaoDosVideos() {
        const secao = document.getElementById('videos');
        const botao = secao && secao.querySelector('.acao-central a');
        if (!botao) return;

        botao.href = 'editar/videos.html';
        botao.textContent = 'Editar vídeos';
        botao.removeAttribute('target');
        botao.removeAttribute('rel');
    }

    /**
     * A galeria não tem botão nenhum no fim — para quem visita, ela é só
     * de olhar. Então, para ele, o botão nasce.
     *
     * Nasce só no modo de edição, e some quando ele sai: quem visita
     * continua vendo a galeria como sempre foi, sem uma porta a mais na
     * página.
     */
    function criarBotaoDosMomentos() {
        const galeria = document.querySelector('.galeria');
        if (!galeria || document.getElementById('editarMomentos')) return;

        const acao = document.createElement('div');
        acao.className = 'acao-central';

        const botao = document.createElement('a');
        botao.id = 'editarMomentos';
        botao.className = 'botao contorno';
        botao.href = 'editar/momentos.html';
        botao.textContent = 'Editar momentos';

        acao.appendChild(botao);
        galeria.parentElement.appendChild(acao);
    }

    /**
     * "Editar livros" entra ao lado de "Ver todos os livros", em vez de
     * no lugar dele.
     *
     * Aqui os dois botões servem: mesmo editando, ele vai querer ver a
     * página de livros como o comprador vê. Foi por isso que o dos
     * vídeos pôde substituir — aquele levava ao Instagram, que não é o
     * site — e este não pode.
     */
    function criarBotaoDosLivros() {
        const secao = document.getElementById('livros') || document.querySelector('.grade-livros');
        if (!secao || document.getElementById('editarLivros')) return;

        const acao = secao.querySelector('.acao-central')
            || (function () {
                const nova = document.createElement('div');
                nova.className = 'acao-central';
                (secao.querySelector('.container') || secao).appendChild(nova);
                return nova;
            })();

        const botao = document.createElement('a');
        botao.id = 'editarLivros';
        botao.className = 'botao contorno';
        botao.href = (document.getElementById('videos') ? 'editar/' : 'editar/') + 'livros.html';
        botao.textContent = 'Editar livros';
        botao.style.marginLeft = '10px';

        acao.appendChild(botao);
    }

    /**
     * "Editar textos" nasce embaixo da fileira de textos.
     *
     * Como a galeria, a seção não tem botão nenhum para quem visita — os
     * cartões levam direto ao texto. Então o botão só existe no modo de
     * edição, e some quando ele sai.
     *
     * Os textos são desenhados por artigos.js, e não por este arquivo.
     * Mesmo assim o botão mora aqui, junto dos outros três: quem for
     * mexer no jeito de entrar na edição encontra os quatro no mesmo
     * lugar, em vez de caçar um deles em outro arquivo.
     */
    function criarBotaoDosTextos() {
        const grade = document.querySelector('.grade-textos');
        if (!grade || document.getElementById('editarTextos')) return;

        const acao = document.createElement('div');
        acao.className = 'acao-central';

        const botao = document.createElement('a');
        botao.id = 'editarTextos';
        botao.className = 'botao contorno';
        botao.href = 'editar/textos.html';
        botao.textContent = 'Editar textos';

        acao.appendChild(botao);
        grade.parentElement.appendChild(acao);
    }

    document.addEventListener('editor-conferido', (e) => {
        if (!e.detail.editor) return;
        trocarBotaoDosVideos();
        criarBotaoDosMomentos();
        criarBotaoDosLivros();
        criarBotaoDosTextos();
    });


    // =================================================================
    // ENTRADA
    //
    // window.BANCO é criado por edicao.js. Sem ele — arquivo não
    // carregado, Supabase fora do ar — as listas ficam com o HTML, que é
    // exatamente o que deve acontecer.
    // =================================================================
    if (window.BANCO) {
        montarSecaoDeVideos();
        montarGaleria();
        montarLivros();
    }
})();
