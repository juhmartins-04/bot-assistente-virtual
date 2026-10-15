# Prontô — revisão de segurança e instalação do assistente

Revisão de 15/10/2026. Escopo: aplicação comercial, painel solo, publicação de páginas, widget, banco e instalação em site existente. Não equivale a um pentest independente ou garantia de ausência de falhas.

## Correções aplicadas

- Revogadas permissões herdadas de TRUNCATE e outras operações desnecessárias dos papéis de API. RLS não protege contra TRUNCATE; os privilégios precisam ser limitados separadamente.
- Visitantes têm permissão de leitura apenas para o conteúdo publicado e inserção apenas nas colunas previstas de contatos e eventos. Notas, status e datas não podem ser forjados na coleta pública.
- A configuração pública passou a ser uma projeção com uma lista explícita de campos permitidos, sincronizada no banco a cada alteração de conteúdo ou acesso. Dados internos de instalação e futuros campos privados ficam fora da API pública.
- As duas views públicas usam `security_invoker=true`. A visão de colaboradores chama uma função privada com identidade explícita e devolve somente os identificadores/nome dos clientes atribuídos.
- Upload e atualização de logos restritos à operadora autorizada, no próprio caminho de armazenamento.
- CSP com `script-src 'self'`, bloqueio de objetos, restrição de formulários/base/frames e Permissions-Policy. Scripts executáveis inline foram extraídos. Estilos inline continuam permitidos para os estilos dinâmicos do React; scripts inline e eval não são permitidos.
- Código do widget validado: somente origem HTTPS, sem credenciais, caminho ou parâmetros, e identificador público no formato UUID. Links do simulador também rejeitam protocolos executáveis.
- CSS do widget em arquivo externo, com seletores limitados ao próprio widget. A instalação continua usando a mesma linha de script; o CSS é carregado automaticamente da origem do Prontô.
- Um `data-site` de produção sempre busca a configuração remota, mesmo se houver uma variável de preview no site hospedeiro.
- A página de conferência identifica erros e indisponibilidade e não grava contatos nem eventos. O widget trata rede, teste vencido, suspensão e plano sem assistente sem interromper o site hospedeiro.
- Exportação CSV também neutraliza fórmulas precedidas por espaços e caracteres de controle.
- Vite, plugin React e esbuild atualizados. Supabase client fixado em versão exata; lockfile atualizado. Novas senhas cadastradas pelo painel precisam de 12 caracteres; isso não altera sozinho a política do servidor de autenticação.

## Fluxo Só Assistente

1. Criar o negócio no plano Assistente. Não é criada uma página pública do negócio nesse plano.
2. Preencher identidade, WhatsApp, perguntas e respostas.
3. Informar o endereço HTTPS do site que receberá o widget e, opcionalmente, a plataforma/responsável.
4. Conferir suporte a JavaScript externo, autorização, política de segurança e possível conflito com outro chat. Registrar autorização e aprovação do conteúdo.
5. Salvar e abrir “Ver assistente”. A prévia usa dados locais, sem coleta, em um cenário de site existente.
6. Inserir o código gerado no painel no site autorizado. O script e seu CSS continuam hospedados no Prontô; não trocar sua origem pela URL do cliente.
7. Após aprovação, publicar o teste. Enquanto suspenso/rascunho, o widget de produção não aparece.
8. Conferir no site real em celular e computador e marcar a instalação verificada. A página “Testar widget” pode conferir a configuração publicada sem inflar os resultados.
9. Atualizações de conteúdo e suspensão ficam no Prontô. O site e a hospedagem do cliente seguem com seu fornecedor.

A verificação da instalação real é posterior à publicação: não é possível exigir que um widget de produção suspenso já esteja visível antes de liberar o teste. Autorização, site válido e aprovação de conteúdo são exigidos antes de iniciar teste ou ativar o período pago pelo painel.

## Sites com política de segurança restrita

O responsável precisa permitir a origem HTTPS do Prontô em `script-src` e `style-src`, e a origem do projeto Supabase em `connect-src`, respeitando a política do próprio site. Não desativar a política inteira para instalar o assistente. Plataformas e planos que não aceitam JavaScript externo precisam ser avaliados antes da contratação. Não há promessa de compatibilidade universal.

## Verificação

Suíte automatizada cobre permissões/RLS, projeção pública, isolamento entre usuários e colaboradores, expiração/suspensão, limites de coleta, criação por plano, busca, rascunho, salvamento, prévia em dois tamanhos, aprovação antes de publicar Só Assistente, respostas das oito demos, widget em origem externa, ausência de coleta em conferência, links, XSS, temas, CSP e neutralização de CSV.

As permissões e o funcionamento público também foram consultados no banco e via API real sem criar clientes nem escrever eventos de teste. Contagens de negócios, contatos e eventos existentes permaneceram iguais após a migração.

## Limites e pendências

- A inspeção visual no navegador e um login interativo com a conta real da titular não estavam disponíveis nesta sessão. Testes de componentes e HTTP não substituem esses passos.
- A primeira instalação em um site de cliente precisa de autorização e conferência nesse ambiente. As integrações externas foram verificadas com origem distinta em ambiente isolado.
- Proteção do Supabase contra senhas conhecidas como vazadas continua desativada; a documentação informa que esse recurso exige Pro ou superior. Nenhum upgrade foi contratado. A regra de 12 caracteres no painel não substitui configuração de senha no servidor.
- Conferir no Supabase Auth a Site URL da Cloudflare e o redirect `/painel` antes de depender de links por e-mail. Não foi alterada a configuração de Auth nesta revisão.
- O aviso informativo de RLS sem policy no contador privado é esperado: acesso direto aos contadores deve permanecer negado. Há avisos de desempenho legados para revisão futura; não são promessa de risco zero ou motivo para remover índices sem análise.
- Relatórios contam interações; não confirmam envio de mensagem, agendamento ou venda. O período pago ainda é acompanhado manualmente na edição solo.
- As versões locais de migração foram alinhadas às versões registradas no banco; operações opcionais completas continuam desabilitadas.

## Fontes técnicas

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/changelog?types=breaking-change
- https://developers.cloudflare.com/workers/static-assets/headers/
- https://vite.dev/guide/migration.html
