/* =====================================================================
   O que vale para todas as páginas do site.

   Antes isto estava copiado dentro de cada uma. Três cópias da mesma
   coisa é o começo de três comportamentos diferentes: basta corrigir
   numa e esquecer das outras.
   ===================================================================== */

// ---------------------------------------------------------------------
// Menu do celular
// ---------------------------------------------------------------------
const botaoMenu = document.getElementById('abrirMenu');
const menu = document.getElementById('menu');

if (botaoMenu && menu) {
    botaoMenu.addEventListener('click', () => menu.classList.toggle('aberto'));

    // Escolheu uma seção: o menu se fecha sozinho. Sem isto ele ficava
    // aberto por cima do conteúdo logo depois do clique.
    menu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') menu.classList.remove('aberto');
    });
}


// ---------------------------------------------------------------------
// Foto que ainda não chegou
//
// Enquanto o arquivo de imagem não estiver na pasta, o navegador
// mostraria o ícone de figura quebrada — e a página inteira parece
// defeituosa por causa de um arquivo faltando.
//
// Aqui, a imagem que não carrega volta a ser o espaço reservado
// bonito, com o nome do que vai entrar ali. O texto vem do próprio
// HTML, em data-reserva="Título|Legenda".
// ---------------------------------------------------------------------
document.querySelectorAll('img[data-reserva]').forEach((imagem) => {
    imagem.addEventListener('error', () => {
        const [titulo, legenda = ''] = imagem.dataset.reserva.split('|');

        const reserva = document.createElement('div');
        reserva.className = 'reservado';
        reserva.innerHTML = '<b></b>';
        reserva.querySelector('b').textContent = titulo;
        reserva.append(legenda);

        imagem.replaceWith(reserva);
    });
});


// ---------------------------------------------------------------------
// Voltar ao topo
//
// Aparece depois da primeira tela e leva de volta ao começo. Numa
// página longa como esta, é o que evita a pessoa ter que arrastar a
// barra de rolagem de volta ou rodar o dedo dez vezes no celular.
// ---------------------------------------------------------------------
const subir = document.createElement('button');
subir.type = 'button';
subir.className = 'subir-topo';
subir.setAttribute('aria-label', 'Voltar ao topo da página');
subir.title = 'Voltar ao topo';
document.body.appendChild(subir);

subir.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Devolve o foco ao começo da página, para quem navega pelo teclado
    // não continuar preso lá embaixo depois de subir.
    document.querySelector('.marca')?.focus?.();
});

/* Mostra o botão depois que a pessoa desceu quase uma tela inteira.

   Cheguei a agrupar isto por quadro de animação, para não rodar a cada
   pixel de rolagem. Tirei: a única coisa que acontece aqui é ligar ou
   desligar uma classe — quando o valor não muda, o navegador nem
   repinta. O agrupamento economizava nada e ainda dependia de um
   relógio que o navegador congela em aba de segundo plano.

   "passive" avisa o navegador que não vamos travar a rolagem, e é isso
   que mantém o deslize liso no celular. */
/* Meia tela já basta. Comecei com quase uma tela inteira e, num
   monitor grande, o botão demorava tanto a aparecer que dava a
   impressão de não existir. */
function conferirRolagem() {
    subir.classList.toggle('visivel', window.scrollY > window.innerHeight * 0.5);
}

window.addEventListener('scroll', conferirRolagem, { passive: true });

// Se a página abrir já rolada — ao voltar pelo navegador, por exemplo.
conferirRolagem();
