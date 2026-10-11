# Operação e próximas entregas

O Prontô atual é operado pela pessoa que configura os negócios. O proprietário
do negócio não tem uma área de cliente. Cadastro de uma conta no Auth não equivale
a uma assinatura paga; status e período de teste são administrados manualmente.

## Antes de abrir cadastro e contratação autônomos

- Migrar `app_storage` para uma chave única por `(user_id, key)`, com uma estratégia
  explícita para as linhas antigas sem proprietário. Hoje `storageSet` usa esse
  par em `onConflict`, mas o schema só tem chave primária em `key`.
- Criar papéis separados para operação, cliente e colaborador; impedir que o
  cliente configure o próprio acesso pago, status ou validade pelo navegador.
- Verificar SMTP, confirmação de e-mail, recuperação e expiração de sessão em
  contas reais de teste. O SMTP padrão do Supabase não serve para login público
  em produção.
- Manter testes de permissões por conta e papel. As views com privilégios do
  criador precisam de grants explícitos de leitura, sem DML nos papéis públicos.
- Criar cobrança e validade independentes da configuração pública do widget.
  Webhooks futuros devem verificar assinatura, duplicidade e cancelamento.

## Antes do primeiro relatório mensal

- Filtrar o intervalo de datas e agregar no banco, sem depender do limite de
  linhas da API. `buscarMetricas` atual busca até 5.000 eventos sem período nem
  paginação; esse total não representa um mês e pode ser truncado.
- Separar abertura, clique em opção, clique no WhatsApp e contato informado.
  Clique não confirma mensagem enviada, agendamento ou venda.
- Identificar e excluir demos/testes dos relatórios. Eventos antigos de
  `handoff_whatsapp` podem incluir simples apresentação do botão.
- Instrumentar também o botão de WhatsApp das páginas públicas; hoje ele não
  registra evento. Essa medição exige ajustar a oferta e a consulta do painel.

## Dados e continuidade

- Implementar exclusão/correção/exportação de contatos e uma rotina de retenção.
  Excluir uma linha em `clientes` não exclui `leads`/`eventos`, que não têm FK
  para esse registro. Não usar o botão de excluir cliente como cumprimento da
  retenção prometida no contrato.
- O JSON de exportação contém configurações dos clientes, sem contatos, eventos,
  logos ou cadastro de usuários. Ele não é um backup completo do produto.
- Proteger a coleta pública contra abuso, validar payloads e monitorar erros
  das inserções; RLS por negócio ativo não é um limite de requisições.
- Validar instalação fora do domínio do Prontô, celular, teclado, tema e conteúdo
  com um roteiro real. A demonstração comercial é fictícia e sem banco.
- Verificar o plano de hospedagem antes da venda: Vercel Hobby é para uso pessoal
  não comercial. A revisão não alterou plano nem criou despesas.

## Escopo da correção de outubro/2026

Foram revogados os grants de escrita das views públicas e o UPDATE geral de
`leads` para `authenticated`, preservando leitura e atualização de nota/status.
A migração correspondente foi aplicada no banco e as permissões foram conferidas.

O widget registra `handoff_whatsapp` no clique efetivo no link; mostrar o botão
ou pular o formulário não incrementa essa métrica. O painel identifica esse
contador como cliques no WhatsApp. Isso não recalcula os registros antigos.
