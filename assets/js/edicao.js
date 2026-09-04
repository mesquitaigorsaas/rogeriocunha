/* =====================================================================
   O site editável por dentro.

   A ideia inteira cabe numa frase: o Rogério vê o site exatamente como
   o público vê, e a única diferença é um botão "Editar" em cima de cada
   pedaço que ele pode mudar.

   Sem painel, sem formulário, sem imaginar onde o campo vai parar. Ele
   clica no texto que está lendo, muda ali, e salva.

   ---------------------------------------------------------------------
   COMO UM PEDAÇO DE TEXTO VIRA EDITÁVEL

   Basta nomeá-lo no HTML:

       <h1 data-editavel="abertura.titulo">Escrever é a forma...</h1>

   Só isso. Não há lista de campos para manter em lugar nenhum: o HTML
   nomeia, e este arquivo cuida do resto. Um pedaço novo entra no site
   ganhando um data-editavel, e some quando o atributo sai.

   ---------------------------------------------------------------------
   O TEXTO DO HTML É O CHÃO, NÃO O ANDAIME

   O que está escrito no HTML continua sendo o texto de verdade. O banco
   só substitui o que já está lá, e só para os pedaços que o Rogério
   editou algum dia.

   Isso não é preguiça — é o que mantém o site de pé:

     Se o banco cair, ou for pausado pelos 7 dias de inatividade do
     plano gratuito, a página mostra o texto do HTML. Ninguém percebe.

     O buscador lê o site sem depender de uma consulta ao banco. Para
     um escritor, ser achado pelo nome é metade do serviço.

     Não existe aquele segundo de tela vazia esperando o banco.
   ===================================================================== */
(function () {
    'use strict';

    if (!window.CONFIG_SUPABASE || !window.supabase) return;

    const banco = window.supabase.createClient(
        window.CONFIG_SUPABASE.url,
        window.CONFIG_SUPABASE.chavePublica
    );

    // Fica à mão para as outras partes do site — os artigos, os
    // comentários — usarem o mesmo cliente. Dois clientes na mesma
    // página brigam pela sessão guardada no navegador: um renova o
    // acesso, o outro segue com o antigo, e a pessoa é deslogada do
    // nada de vez em quando.
    window.BANCO = banco;

    let souEditor = false;


    // =================================================================
    // 1. O TEXTO QUE VEIO DO BANCO ENTRA NO LUGAR DO TEXTO DO HTML
    // =================================================================

    async function aplicarTextosSalvos() {
        const pedacos = document.querySelectorAll('[data-editavel]');
        if (!pedacos.length) return;

        const { data, error } = await banco
            .from('conteudos')
            .select('chave, valor');

        // Deu errado? A página fica com o texto do HTML, que é conteúdo
        // de verdade e não um erro. Não há o que avisar a quem visita.
        if (error || !data) return;

        const porChave = new Map(data.map((linha) => [linha.chave, linha.valor]));

        pedacos.forEach((pedaco) => {
            const salvo = porChave.get(pedaco.dataset.editavel);
            if (salvo !== undefined && salvo !== '') escrever(pedaco, salvo);
        });
    }

    /* Escreve respeitando os parágrafos.

       textContent transformaria um texto de três parágrafos numa
       parede única, porque quebra de linha não vira parágrafo em HTML.
       innerHTML resolveria a formatação e abriria a porta para código
       colado dentro do texto.

       Então: cada parágrafo vira um nó de texto de verdade, com <br>
       entre eles. A quebra aparece, e nada do que for digitado é
       interpretado como código. */
    function escrever(elemento, texto) {
        elemento.textContent = '';
        texto.split(/\n+/).forEach((linha, i) => {
            if (i > 0) elemento.appendChild(document.createElement('br'));
            elemento.appendChild(document.createTextNode(linha));
        });
    }

    /* O caminho de volta: do que está na tela para o texto puro, com as
       quebras de linha preservadas.

       O \u00A0 do replace é o espaço não separável, escrito em código
       de propósito: solto no arquivo ele é invisível, e ninguém
       entenderia depois o que aquela linha faz.

       O navegador enfia um desses toda vez que alguém digita dois
       espaços seguidos num campo editável. Na tela parece um espaço
       comum, mas não é: gravado assim, uma busca por "voz alta" não
       acharia o texto, porque lá está "voz" + esse outro caractere +
       "alta". Vira espaço comum antes de gravar. */
    function lerTexto(elemento) {
        return elemento.innerText.replace(/\u00A0/g, ' ').trim();
    }


    // =================================================================
    // 2. ENTRAR E SAIR
    // =================================================================

    async function conferirSessao() {
        const { data: { session } } = await banco.auth.getSession();
        if (!session) return false;

        // Ter conta não basta: é preciso estar na lista de editores. A
        // pergunta é feita ao banco, e não aqui — resposta vinda do
        // navegador qualquer um forja.
        const { data } = await banco
            .from('editores')
            .select('nome')
            .eq('id', session.user.id)
            .maybeSingle();

        return Boolean(data);
    }


    // =================================================================
    // 3. A BARRA DE EDIÇÃO
    //
    // Só existe para quem está logado. Fica no alto, fixa, dizendo em
    // letras claras que o site está em modo de edição — para ele nunca
    // ficar em dúvida sobre se o que está vendo é o site ou o painel.
    // =================================================================

    function montarBarra() {
        const barra = document.createElement('div');
        barra.className = 'barra-edicao';
        barra.innerHTML = `
            <span class="barra-aviso">
                <b>Modo de edição</b>
                Clique em Editar, ao lado do que quiser mudar.
            </span>
            <button type="button" class="barra-sair" id="sairEdicao">Sair</button>
        `;
        document.body.prepend(barra);
        document.body.classList.add('com-barra-edicao');

        barra.querySelector('#sairEdicao').addEventListener('click', async () => {
            await banco.auth.signOut();
            window.location.reload();
        });
    }


    // =================================================================
    // 4. O BOTÃO EM CIMA DE CADA PEDAÇO
    //
    // Editar → o texto vira editável ali mesmo, sem sair do lugar nem
    // mudar de tamanho. Salvar → grava. Cancelar → devolve o que era.
    //
    // Sem "Excluir" aqui, e é de propósito: apagar a frase de abertura
    // deixaria um buraco no desenho da página. Para sumir com um texto,
    // ele apaga o conteúdo e salva vazio — e aí volta o que está no
    // HTML, que é o texto original. Nada quebra.
    // =================================================================

    function prepararPedacos() {
        document.querySelectorAll('[data-editavel]').forEach((pedaco) => {
            const acoes = document.createElement('span');
            acoes.className = 'acoes-edicao';
            acoes.innerHTML = '<button type="button" class="btn-editar">Editar</button>';

            pedaco.classList.add('editavel');
            pedaco.after(acoes);

            acoes.addEventListener('click', (e) => {
                const botao = e.target.closest('button');
                if (!botao) return;

                if (botao.classList.contains('btn-editar')) abrir(pedaco, acoes);
                if (botao.classList.contains('btn-salvar')) salvar(pedaco, acoes);
                if (botao.classList.contains('btn-cancelar')) fechar(pedaco, acoes);
            });
        });
    }

    // Guarda o texto de antes, para o Cancelar ter para onde voltar.
    const antesDeEditar = new WeakMap();

    function abrir(pedaco, acoes) {
        antesDeEditar.set(pedaco, pedaco.innerHTML);

        pedaco.contentEditable = 'true';
        pedaco.classList.add('editando');
        pedaco.focus();

        acoes.innerHTML = `
            <button type="button" class="btn-salvar">Salvar</button>
            <button type="button" class="btn-cancelar">Cancelar</button>
        `;
    }

    function fechar(pedaco, acoes) {
        const anterior = antesDeEditar.get(pedaco);
        if (anterior !== undefined) pedaco.innerHTML = anterior;

        pedaco.contentEditable = 'false';
        pedaco.classList.remove('editando');
        acoes.innerHTML = '<button type="button" class="btn-editar">Editar</button>';
    }

    async function salvar(pedaco, acoes) {
        const botao = acoes.querySelector('.btn-salvar');
        botao.disabled = true;
        botao.textContent = 'Salvando...';

        const { error } = await banco.from('conteudos').upsert({
            chave: pedaco.dataset.editavel,
            valor: lerTexto(pedaco)
        });

        if (error) {
            // O texto continua na tela do jeito que ele escreveu, e o
            // botão volta a funcionar. Perder o que a pessoa acabou de
            // digitar por causa de uma falha de rede é imperdoável.
            botao.disabled = false;
            botao.textContent = 'Salvar';
            avisar('Não deu para salvar. Confira a internet e tente de novo.', 'erro');
            return;
        }

        pedaco.contentEditable = 'false';
        pedaco.classList.remove('editando');
        acoes.innerHTML = '<button type="button" class="btn-editar">Editar</button>';
        avisar('Salvo. Já está no ar.');
    }


    // =================================================================
    // 5. O AVISO
    //
    // Um recado curto no canto, que some sozinho. Sem alert(): a caixa
    // do navegador trava a página e exige um segundo clique para
    // confirmar algo que já aconteceu.
    // =================================================================

    function avisar(texto, tipo) {
        document.querySelector('.aviso-edicao')?.remove();

        const aviso = document.createElement('div');
        aviso.className = 'aviso-edicao' + (tipo === 'erro' ? ' erro' : '');
        aviso.textContent = texto;
        document.body.appendChild(aviso);

        // Erro fica mais tempo: quem precisa reagir a um problema
        // precisa de tempo para ler o que aconteceu.
        setTimeout(() => aviso.remove(), tipo === 'erro' ? 6000 : 2600);
    }


    // =================================================================
    // 6. A ORDEM DAS COISAS AO ABRIR A PÁGINA
    // =================================================================

    async function comecar() {
        // O texto salvo entra primeiro, para quem visita não ver a
        // versão antiga piscar antes da nova.
        await aplicarTextosSalvos();

        souEditor = await conferirSessao();

        // A resposta desta pergunta interessa a mais gente do que só a
        // este arquivo: as listas da página inicial trocam "Ver todos os
        // vídeos" por "Editar vídeos" quando é ele quem está olhando.
        //
        // Vai pelo <body> e por um aviso, e não por uma variável: quem
        // perguntar depois lê o atributo, quem perguntar antes espera o
        // aviso, e ninguém precisa se preocupar com quem carregou
        // primeiro.
        document.body.dataset.editor = souEditor ? 'sim' : 'nao';
        document.dispatchEvent(new CustomEvent('editor-conferido', {
            detail: { editor: souEditor }
        }));

        if (!souEditor) return;

        montarBarra();
        prepararPedacos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', comecar);
    } else {
        comecar();
    }
}());
