/* =====================================================================
   OS COMENTÁRIOS DA PÁGINA DO TEXTO

   Entram publicados, na hora, sem esperar aprovação. É decisão do
   autor, e o que a sustenta é o botão de apagar estar à mão na tela de
   edição: em vez de segurar todo mundo na fila esperando ele ler, o
   comentário aparece e ele tira o que não deve ficar.

   O leitor não cria conta. Informa nome e e-mail no formulário, e o
   e-mail nunca aparece na tela — nem para quem visita, nem na API: o
   banco recusa ler essa coluna de quem não está logado.
   ===================================================================== */
(function () {
    'use strict';

    const lista = document.getElementById('listaComentarios');
    const forma = document.getElementById('formaComentario');

    // Página aberta sem texto nenhum: não há o que comentar.
    const idDoTexto = new URLSearchParams(window.location.search).get('id');

    if (!lista || !forma) return;

    // Sem banco, a seção some inteira. Um formulário que não grava é
    // pior que formulário nenhum: a pessoa escreve e perde o que
    // escreveu.
    if (!window.BANCO || !idDoTexto) {
        const secao = lista.closest('.comentarios');
        if (secao) secao.hidden = true;
        return;
    }

    const banco = window.BANCO;


    // =================================================================
    // MOSTRAR
    // =================================================================

    async function carregar() {
        const { data, error } = await banco
            .from('comentarios')
            .select('id, nome, texto, autor_id, criado_em')
            .eq('artigo_id', idDoTexto)
            .order('criado_em', { ascending: true });

        if (error) {
            // Erro de leitura não tira o formulário do ar: quem quer
            // comentar continua conseguindo.
            lista.replaceChildren();
            return;
        }

        desenhar(data || []);
    }

    function desenhar(comentarios) {
        lista.replaceChildren();

        if (comentarios.length === 0) {
            const vazio = document.createElement('p');
            vazio.className = 'explicativo';
            vazio.textContent = 'Ainda não há comentários. O seu pode ser o primeiro.';
            lista.appendChild(vazio);
            return;
        }

        for (const comentario of comentarios) {
            lista.appendChild(montar(comentario));
        }
    }

    function montar(comentario) {
        const caixa = document.createElement('div');
        caixa.className = 'comentario' + (comentario.autor_id ? ' resposta-autor' : '');

        const inicial = document.createElement('div');
        inicial.className = 'inicial';
        inicial.textContent = iniciaisDe(comentario.nome);

        const conteudo = document.createElement('div');

        const cabeca = document.createElement('div');
        cabeca.className = 'comentario-cabeca';

        const nome = document.createElement('strong');
        nome.textContent = comentario.nome;
        cabeca.appendChild(nome);

        // O selo sai de quem estava logado na hora de comentar, e não do
        // nome digitado. Nome digitado qualquer um escolhe.
        if (comentario.autor_id) {
            const selo = document.createElement('span');
            selo.className = 'selo-autor';
            selo.textContent = 'Autor';
            cabeca.appendChild(selo);
        }

        const quando = document.createElement('time');
        quando.textContent = dataEscrita(comentario.criado_em);
        cabeca.appendChild(quando);

        const texto = document.createElement('p');
        texto.textContent = comentario.texto;

        conteudo.append(cabeca, texto);
        caixa.append(inicial, conteudo);
        return caixa;
    }

    /** "Marina Alvarenga" -> "MA". Um nome só vira uma letra. */
    function iniciaisDe(nome) {
        const partes = String(nome || '').trim().split(/\s+/);
        const primeira = partes[0]?.[0] || '?';
        const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
        return (primeira + ultima).toUpperCase();
    }

    function dataEscrita(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
    }


    // =================================================================
    // GRAVAR
    // =================================================================

    forma.addEventListener('submit', async (e) => {
        e.preventDefault();

        const botao = forma.querySelector('button[type="submit"]');
        const campoNome = document.getElementById('c-nome');
        const campoEmail = document.getElementById('c-email');
        const campoTexto = document.getElementById('c-texto');

        const nome = campoNome.value.trim();
        const email = campoEmail.value.trim();
        const texto = campoTexto.value.trim();

        if (!nome || !email || !texto) return;

        botao.disabled = true;
        botao.textContent = 'Enviando...';

        // Quem está logado é o autor, e o banco põe o selo a partir
        // disto. Visitante não tem sessão, e o campo vai nulo.
        const { data: { session } } = await banco.auth.getSession();

        const { error } = await banco.from('comentarios').insert({
            artigo_id: idDoTexto,
            nome,
            email,
            texto,
            autor_id: session ? session.user.id : null
        });

        botao.disabled = false;
        botao.textContent = 'Enviar comentário';

        if (error) {
            mostrarErro(recadoDoBanco(error.message));
            return;
        }

        campoTexto.value = '';
        limparErro();
        await carregar();

        // Rola até o comentário que acabou de entrar. Sem isto, numa
        // conversa com vinte recados, a pessoa envia e não vê nada
        // acontecer — o dela ficou lá em cima, fora da tela.
        lista.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /**
     * As mensagens do banco citam o nome da regra que falhou, que não
     * diz nada a quem está na tela.
     */
    function recadoDoBanco(bruta) {
        if (/nome_nao_se_passa_pelo_autor/.test(bruta)) {
            return 'Esse nome é o do autor do site. Escreva o seu para comentar.';
        }
        if (/comentarios_nome_check/.test(bruta)) {
            return 'O nome precisa ter pelo menos duas letras.';
        }
        if (/comentarios_texto_check/.test(bruta)) {
            return 'O comentário precisa ter pelo menos duas letras, e no máximo 4000.';
        }
        if (/comentarios_email_check/.test(bruta)) {
            return 'Confira o e-mail.';
        }
        return 'Não consegui enviar seu comentário. Tente de novo em instantes.';
    }

    function mostrarErro(recado) {
        limparErro();
        const aviso = document.createElement('p');
        aviso.id = 'erroComentario';
        aviso.className = 'explicativo';
        aviso.style.color = '#a4343a';
        aviso.textContent = recado;
        forma.appendChild(aviso);
    }

    function limparErro() {
        document.getElementById('erroComentario')?.remove();
    }


    carregar();
}());
