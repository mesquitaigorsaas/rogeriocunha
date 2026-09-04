/* =====================================================================
   O QUE TODA TELA DE EDIÇÃO USA

   São quatro telas — vídeos, textos, livros e momentos — e todas fazem
   as mesmas cinco coisas: conferir quem entrou, subir imagem, gravar,
   apagar e avisar que deu certo. Isto aqui é essa parte.

   Escrito como window.PAINEL para as telas serem HTML simples, sem
   build e sem módulo, igual ao resto do site.
   ===================================================================== */
window.PAINEL = (function () {
    'use strict';

    const banco = window.supabase.createClient(
        window.CONFIG_SUPABASE.url,
        window.CONFIG_SUPABASE.chavePublica
    );


    // =================================================================
    // QUEM ENTROU
    // =================================================================

    /**
     * Só editor passa daqui.
     *
     * Duas perguntas, e as duas importam: se há sessão, e se essa sessão
     * é de um editor. A segunda não é firula — qualquer pessoa pode
     * criar uma conta no Supabase se um dia houver cadastro aberto, e a
     * conta sozinha não dá direito a mexer no site.
     *
     * A guarda daqui é conveniência, não segurança. Quem protege de
     * verdade são as regras do banco, que recusam a escrita de quem não
     * está em public.editores. Esta função existe para a pessoa errada
     * ver a tela de entrar, e não um formulário que falha ao salvar.
     */
    async function exigirEditor() {
        const { data: { session } } = await banco.auth.getSession();

        if (!session) {
            window.location.replace('../entrar.html');
            return null;
        }

        const { data, error } = await banco
            .from('editores')
            .select('id, nome')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error || !data) {
            await banco.auth.signOut();
            window.location.replace('../entrar.html');
            return null;
        }

        return data;
    }

    async function sair() {
        await banco.auth.signOut();
        window.location.replace('../index.html');
    }


    // =================================================================
    // IMAGENS
    // =================================================================

    // A foto de um celular de hoje pesa de 3 a 8 MB e tem uns 4000
    // pixels de largura. O site nunca mostra mais que uns 1600, e o
    // plano gratuito do Supabase tem 1 GB de depósito: subir o arquivo
    // cru gasta o espaço de vinte fotos para mostrar uma.
    //
    // Quem encolhe é o navegador de quem envia, antes de subir.
    const LARGURA_MAXIMA = 1600;
    const QUALIDADE_JPEG = 0.85;

    function encolher(arquivo) {
        return new Promise((resolve) => {
            // Arquivo pequeno, ou que não é imagem, passa direto:
            // recomprimir um arquivo leve só piora.
            if (!arquivo.type.startsWith('image/') || arquivo.size < 300 * 1024) {
                resolve(arquivo);
                return;
            }

            const leitor = new FileReader();

            leitor.onload = () => {
                const img = new Image();

                img.onload = () => {
                    const escala = Math.min(1, LARGURA_MAXIMA / img.width);
                    const largura = Math.round(img.width * escala);
                    const altura = Math.round(img.height * escala);

                    const tela = document.createElement('canvas');
                    tela.width = largura;
                    tela.height = altura;

                    const pincel = tela.getContext('2d');

                    // JPEG não guarda transparência: sem este fundo, o
                    // que era transparente num PNG sairia preto.
                    pincel.fillStyle = '#ffffff';
                    pincel.fillRect(0, 0, largura, altura);
                    pincel.drawImage(img, 0, 0, largura, altura);

                    tela.toBlob(
                        (blob) => resolve(blob && blob.size < arquivo.size ? blob : arquivo),
                        'image/jpeg',
                        QUALIDADE_JPEG
                    );
                };

                // Formato que o navegador não abre: sobe como veio, em
                // vez de travar o envio.
                img.onerror = () => resolve(arquivo);
                img.src = leitor.result;
            };

            leitor.onerror = () => resolve(arquivo);
            leitor.readAsDataURL(arquivo);
        });
    }

    /**
     * Sobe uma imagem e devolve o endereço público dela.
     *
     * O nome do arquivo é sorteado, e não o nome original. Dois motivos:
     * "WhatsApp Image 2026-09-03 at 22.14.31.jpeg" vira um endereço
     * horrível e cheio de espaço, e duas fotos com o mesmo nome — que
     * acontece o tempo todo com "IMG_0001.jpg" — uma apagaria a outra.
     */
    async function subirImagem(arquivo, pasta) {
        const enviar = await encolher(arquivo);

        const nome = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;

        const { error } = await banco.storage
            .from('imagens')
            .upload(nome, enviar, { cacheControl: '3600', upsert: false });

        if (error) throw new Error('Não consegui enviar a imagem: ' + error.message);

        const { data } = banco.storage.from('imagens').getPublicUrl(nome);
        return data.publicUrl;
    }


    // =================================================================
    // O CÓDIGO DO YOUTUBE, DE QUALQUER JEITO QUE ELE COLE
    // =================================================================

    /**
     * Aceita o endereço inteiro, o encurtado, o de "shorts", o de
     * "embed", ou o código sozinho.
     *
     * Ninguém vai pedir para ele "copiar só o código depois do v=". Ele
     * vai copiar a barra de endereço do navegador, que é o que qualquer
     * pessoa faz — e aí o site tem que se virar.
     */
    function codigoDoYoutube(texto) {
        const bruto = String(texto || '').trim();
        if (!bruto) return '';

        // Já é só o código: 11 caracteres, sem barra nem ponto.
        if (/^[\w-]{11}$/.test(bruto)) return bruto;

        const padroes = [
            /[?&]v=([\w-]{11})/,           // youtube.com/watch?v=CODIGO
            /youtu\.be\/([\w-]{11})/,      // youtu.be/CODIGO
            /\/embed\/([\w-]{11})/,        // youtube.com/embed/CODIGO
            /\/shorts\/([\w-]{11})/,       // youtube.com/shorts/CODIGO
            /\/live\/([\w-]{11})/          // youtube.com/live/CODIGO
        ];

        for (const padrao of padroes) {
            const achou = bruto.match(padrao);
            if (achou) return achou[1];
        }

        return '';
    }


    // =================================================================
    // O RECADO NO CANTO DA TELA
    // =================================================================

    let recadoAberto = null;

    function avisar(texto, tipo) {
        if (recadoAberto) recadoAberto.remove();

        const recado = document.createElement('div');
        recado.className = 'recado' + (tipo === 'erro' ? ' erro' : '');
        recado.textContent = texto;
        recado.setAttribute('role', 'status');

        document.body.appendChild(recado);
        recadoAberto = recado;

        // Erro fica mais tempo na tela: quem errou precisa ler o que
        // errou, e quem acertou já viu a mudança acontecer.
        setTimeout(() => {
            if (recado === recadoAberto) recadoAberto = null;
            recado.remove();
        }, tipo === 'erro' ? 6000 : 2600);
    }


    // =================================================================
    // ORDEM
    // =================================================================

    /**
     * O número de ordem de um item novo: dez a mais que o último.
     *
     * De dez em dez para caber um item no meio depois, sem renumerar a
     * lista inteira só para enfiar um vídeo entre o segundo e o
     * terceiro.
     */
    function proximaOrdem(itens) {
        const maior = itens.reduce((max, item) => Math.max(max, item.ordem || 0), 0);
        return maior + 10;
    }

    /**
     * Troca dois itens de lugar e grava as duas ordens.
     *
     * Só as duas linhas mudam. Renumerar a lista inteira a cada seta
     * clicada seria uma escrita por item, e uma lista de vinte fotos
     * viraria vinte escritas para mover uma.
     */
    async function trocarOrdem(tabela, a, b) {
        const [ordemA, ordemB] = [a.ordem, b.ordem];

        const { error } = await banco.from(tabela).upsert([
            { id: a.id, ordem: ordemB },
            { id: b.id, ordem: ordemA }
        ]);

        if (error) throw new Error('Não consegui mudar a ordem: ' + error.message);
    }


    return {
        banco,
        exigirEditor,
        sair,
        subirImagem,
        codigoDoYoutube,
        avisar,
        proximaOrdem,
        trocarOrdem
    };
})();
