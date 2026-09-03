/* =====================================================================
   Endereço do banco de dados — um lugar só.

   Estes dois valores são públicos de propósito: eles viajam dentro da
   página até o navegador de quem visita, e qualquer pessoa pode lê-los.
   Não é descuido, é como o Supabase foi feito. Quem decide o que cada
   visitante pode ver e mexer são as regras de segurança (RLS) escritas
   nos arquivos de supabase/, do lado do banco.

   A chave "service_role" NÃO está aqui e nunca deve estar. Ela ignora
   todas as regras de segurança e vive só no painel do Supabase.

   A senha do banco também não. Ela vive no gerenciador de senhas, e de
   lá pode ser redefinida em Project Settings → Database.

   ---------------------------------------------------------------------
   ONDE ISTO MORA

   Conta ....... mktrogeriocunha@gmail.com
   Organização . Rogerio Cunha (plano gratuito)
   Região ...... South America (São Paulo)

   É uma conta separada da que guarda os outros projetos. Site de
   cliente sob conta do cliente: se um dia o site for entregue ao
   Rogério, o banco vai junto, sem depender de um e-mail de terceiro.
   ===================================================================== */
window.CONFIG_SUPABASE = {
    url: 'https://fkxtbikeilihabpniqxm.supabase.co',
    chavePublica: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreHRiaWtlaWxpaGFicG5pcXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjQ2MDksImV4cCI6MjEwNDA0MDYwOX0.5R4YA798z_HT5ZzluC1kcHh_rQeiRVyvXta1_aNLtXw'
};
