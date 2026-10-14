# Prontô: edição solo, 13/10/2026

## Escopo publicado

Operação assistida pela Julia, com página, menu de respostas aprovadas e encaminhamento ao WhatsApp. Quatro modelos reais compartilham o renderizador com a demonstração. O menu responde na página; não é um bot dentro do WhatsApp, não usa IA paga e não realiza agendamentos.

A edição atual usa `OPERACAO_COMPLETA = false`. Não mudar esse marcador antes de revisar/aplicar a evolução do banco. Área do titular, cobrança automática, restauração e exclusão definitiva de negócios ficam desabilitadas. Não anunciar contratação autônoma.

Configurações privadas foram migradas para `account_config`, com chave `(user_id,key)` e RLS por conta. As linhas antigas de `app_storage` foram preservadas. O CRM e os recebimentos manuais usam essa tabela, sem copiar dados financeiros para a configuração pública do widget. Uma referência de comprovante repetida é rejeitada pela chave única.

Foram confirmadas as migrações de configurações/relatórios e `20261013212700_solo_operator_authorization.sql`. A autorização reserva criação/administração dos negócios às contas de operadoras existentes. Também foi confirmada a migração 20261013230715_solo_public_collection_guard.sql, que valida e limita a coleta pública. As três preservam os negócios e históricos existentes. O schema na raiz é a referência histórica usada nas fixtures; não deve ser reaplicado sobre produção. `supabase/optional` contém protótipos pendentes de revisão; não é a lista de migrações publicadas. A tentativa ampla foi recusada pela revisão automática, sem justificativa detalhada; a tentativa menor foi interrompida. A proteção de coleta separada foi posteriormente aplicada e verificada.

## Implantação e cobrança

1. Receber logo, descrição, WhatsApp, horário, serviços/valores e até cinco perguntas com respostas aprovadas.
2. Preparar o negócio suspenso. Conferir links, conteúdo e valores com o titular. Publicar o teste de 14 dias somente após aprovação.
3. Combinar o plano: Só Página R$97/mês; Assistente R$147/mês; Site + Assistente R$197/mês. Até duas solicitações agrupadas de conteúdo por mês; trabalhos extras têm proposta separada.
4. Conferir o Pix no banco. Registrar valor, referência e período no painel. O registro não cobra o cliente. Ativação e registro são operações separadas: se a ativação falhar, o painel informa que o comprovante já foi salvo e permite ativar sem duplicar o registro.
5. Conferir as renovações semanalmente. A validade registrada é um lembrete; nesta edição a suspensão por falta de pagamento é manual. Após a tolerância combinada de 10 dias, suspender se não houver renovação. Cancelamento mantém acesso até o fim do período pago; suspender nessa data.

A configuração deve estar salva antes de alterar o plano contratado. O valor mensal recebido é receita bruta, não lucro. Clientes antigos ativos não são classificados automaticamente como pagantes.

## Resultados e dados

O relatório filtra datas de Curitiba e agrega no banco, sem o antigo limite de 5.000 eventos. Mede visitas da página, aberturas do menu, opções e cliques no WhatsApp. Clique não confirma mensagem, agendamento ou venda. Contatos são paginados e sua exportação é identificada como todos os períodos. O relatório pode ser impresso em PDF pelo navegador. Eventos anteriores à correção de outubro podem incluir apresentação do botão; não foram recalculados.

O botão Exportar produz cópia operacional com configurações, contatos, eventos de página/menu, vínculos visíveis da conta e imagens disponíveis. Não contém senhas, contas Auth ou segredos. Na edição solo, restauração é um procedimento técnico revisado; guardar o arquivo não significa recuperação automática testada em produção. Salvar cópia antes de qualquer migração e pelo menos semanalmente, com acesso restrito e uma cópia separada do computador.

Não usar a exclusão de uma linha em clientes para cumprir retenção: o banco atual ainda tem histórico sem cascata. O botão foi desabilitado. Pedidos de correção/exclusão de dados pessoais devem ser tratados pela Julia em revisão técnica, inclusive contatos, eventos, imagens e cópias aplicáveis. Revisar os dados operacionais 30 dias após encerramento; obrigações fiscais têm tratamento separado. A coleta agora também é validada no banco: contatos vazios ou excessivos são rejeitados, notas/status enviados por visitantes são normalizados e envios repetidos são limitados. Os contadores privados têm limpeza após 24 horas, executada na nova coleta. Os três gatilhos protegem leads, eventos do menu e eventos da página.

## Hospedagem sem mensalidade

Supabase permanece Free. Não foram contratados serviços, domínios ou APIs pagos. O plano Hobby da Vercel é restrito a uso não comercial. O plano atual da equipe não foi confirmado; não tratar o domínio Vercel como solução comercial gratuita garantida.

Em 14/10/2026, a titular conectou o GitHub e criou o Worker `bot-assistente-virtual` na Cloudflare. O build de Vite passou, mas a primeira publicação falhou na configuração automática do Wrangler para Vite 5. A configuração explícita `wrangler.jsonc` publica apenas os arquivos estáticos de `dist` e mantém fallback de SPA para `/painel`, `/demo`, `/privacidade` e `/p/:id`, sem script de execução ou serviços pagos. As reescritas antigas de Pages em `_redirects` foram removidas: o fallback de SPA do Workers resolve essas rotas sem regras duplicadas, evitando a rejeição por loop na publicação. A origem configurada é `https://bot-assistente-virtual.juuhhzinha2000.workers.dev`. `npm run build` gera os assets e `npm run deploy:cloudflare` publica com a versão fixada do Wrangler. A telemetria opcional do Wrangler está desabilitada por `send_metrics: false`.

As variáveis de build de produção na Cloudflare apontam para o mesmo Supabase, com chave pública publishable, NODE_VERSION 22 e VITE_PUBLIC_SITE_URL para os metadados sociais. A produção acompanha `main`; previews automáticos foram desabilitados nesta operação solo. Nenhum novo banco foi criado. Implantação estática confirmada em 14/10/2026: build 556e7695-a78d-44d0-9143-0b745c34d7f9, commit 4e1019f6647c38f8f14c3c2d8eb7b8ac2018c2be, versão a8d7cebc-8873-4913-a7f8-8fcfa575e7a6. Foram verificadas no navegador a raiz, a demonstração com resposta do menu, a tela de login e a página de teste ligada ao banco, sem erro da aplicação. O login autenticado com a conta da titular e a configuração de redirecionamento de Auth ainda precisam ser verificados; não afirmar migração integral do acesso. O endereço `usarpronto.vercel.app` pertence à Vercel e não pode ser transferido para Cloudflare.

A URL-base do widget na configuração privada da operadora foi atualizada para a origem Cloudflare, preservando as demais configurações. Pendente no Supabase Auth: em Authentication > URL Configuration, mudar Site URL para a origem Cloudflare e incluir a URL exata dessa origem com `/painel` em Redirect URLs, mantendo as origens antigas durante a transição. A conexão MCP disponível não oferece a alteração dessas opções; a titular pode salvar pelo painel. Atualizar os links divulgados após conferir o acesso. Widgets externos devem apontar para a nova origem. A prévia personalizada para crawlers em `middleware.js` é específica da Vercel; na hospedagem estática a prévia compartilhada pode mostrar a marca Prontô até implementar equivalente gratuito. Manter a publicação antiga durante a validação evita quebrar links existentes.

Cloudflare documenta requisições a arquivos estáticos gratuitas e sem limite de requisições; os builds e outros produtos têm quotas próprias. Não adicionar cartão, upgrade, IA, D1 ou APIs pagas sem nova decisão da titular.

## Rotina semanal (cerca de 3 horas, ajustar à sua disponibilidade)

- 30 min: renovações, testes próximos do fim, pedidos e próximos contatos.
- 60 min: cinco abordagens personalizadas e retorno a quem autorizou contato.
- 60 min: implantação ou duas solicitações agrupadas de conteúdo.
- 30 min: relatório, backup, teste dos links e conferir quotas/status dos provedores.

Separar mais 2 horas semanais para estudar e aplicar uma pequena melhoria. No começo, limitar a cinco clientes acompanhados e medir o tempo por cliente antes de aumentar. Não prometer suporte 24 horas, disponibilidade de 100% ou retorno financeiro garantido.

## Pendências antes de cadastro público e automação

A edição solo já reserva a administração às operadoras autorizadas no banco. Os papéis adicionais de titular/portal permanecem pendentes; não abrir cadastro de autosserviço. Desativar cadastros públicos no Supabase Auth enquanto não há autosserviço. Preparar SMTP somente quando houver necessidade real de novos logins; o servidor padrão não é apropriado para enviar a qualquer cliente em produção.

Revisar restauração com os IDs originais, correção/exclusão de contatos, retenção e validade no servidor. A integração de cobrança está em código de referência e não foi publicada nem configurada. Confirmar custos e taxas antes de escolher um provedor.

## Validação

`npm test` e `npm run build`. As fixtures testam tanto o core usado pela edição solo quanto a evolução opcional, identificada nos testes. Não usar o resultado de testes do protótipo como prova de que ele foi aplicado em produção. Não houve login autenticado no navegador com a senha da titular, pagamento real, mensagem a prospectos ou remoção dos dados existentes.

## Fontes oficiais consultadas em 13/10/2026

- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits/fair-use-guidelines
- https://www.cloudflare.com/products/pages/
- https://www.cloudflare.com/small-business/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/auth/auth-smtp

A proteção de coleta foi verificada também no banco de produção com uma transação revertida: rejeitou contato excessivo e a 61ª interação da mesma janela, preservando todos os registros anteriores. O CLI foi bloqueado pela revisão automática por telemetria externa; a migração foi preparada localmente e aplicada pela conexão autorizada do Supabase.

## Autorização contínua para manutenção

Julia autorizou correções, testes, commits/push no GitHub e atualização da Vercel sem pedir confirmação a cada etapa. A operação deve continuar sem contratar serviços pagos até haver lucro e uma nova decisão de investimento. Essa preferência não altera as exigências de autenticação e revisão das plataformas.

O aviso do advisor para private.solo_public_limits (RLS sem política) é intencional: a tabela não tem acesso público e é utilizada somente pelo gatilho interno. As views públicas existentes usam privilégios do criador com filtros de publicação/atribuição e grants exclusivos de leitura; não devem ser convertidas para invoker sem adaptar o fluxo público. A proteção de senhas vazadas do Auth permanece desativada e deve ser avaliada respeitando o plano gratuito.

A titular autorizou a migração da hospedagem para Cloudflare em 13/10/2026. As próximas publicações de produção acompanham o GitHub `main` na Cloudflare; não comprar domínio ou plano sem nova autorização.
