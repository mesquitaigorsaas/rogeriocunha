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

    document.addEventListener('editor-conferido', (e) => {
        if (!e.detail.editor) return;
        trocarBotaoDosVideos();
        criarBotaoDosMomentos();
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
    }
})();
