# Demos comerciais por segmento

Implementadas em 15/10/2026. Catálogo: https://pronto.juuhhzinha2000.workers.dev/demos/

## Formatos

| Segmento | Caminho | Oferta |
|---|---|---|
| Unhas e noivas | /demos/unhas | Página + Assistente · R$197/mês |
| Salão | /demos/salao | Página + Assistente · R$197/mês |
| Cabelo | /demos/cabelo | Página + Assistente · R$197/mês |
| Cabelo e maquiagem para eventos | /demos/eventos | Página + Assistente · R$197/mês |
| Costura e ajustes | /demos/costura | Página + Assistente · R$197/mês |
| Assistência técnica | /demos/eletronica | Assistente · R$147/mês |
| Lavanderia | /demos/lavanderia | Assistente · R$147/mês |
| Higienização de estofados | /demos/estofados | Assistente · R$147/mês |

As cinco primeiras permitem comparar Só Página (R$97/mês) com Página + Assistente. As três últimas mostram apenas a proposta de assistente e um cenário genérico de site existente, com comparação sem/com assistente. Não são cópias de sites de prospects.

## Regras da demonstração

- Marcas e conteúdo fictícios; não publicar nomes, contatos, fotos ou endereços de prospects nestes arquivos.
- Cada demo carrega o widget real do Prontô, com até cinco respostas específicas e contato final comercial da Julia.
- Sem `data-site`, coleta de dados, criação de clientes, eventos no banco ou início de teste.
- O assistente opera por menu no site; não é uma IA aberta, bot de WhatsApp, agenda, diagnóstico ou orçamento automático.
- Temas claro/escuro usam a mesma chave de preferência do Prontô: `pronto-tema`.
- Demos com `noindex,nofollow`; isso não restringe acesso ao link.
- Os layouts demonstrativos estão em HTML estático; não foram adicionados como modelos do editor do painel. Se o cliente escolher esse visual, preparar a versão final a partir da demo ou combinar o modelo disponível antes de fechar. Não prometer que o painel gera automaticamente esse layout.
- O teste de 14 dias começa após a publicação aprovada da versão oficial, nunca ao abrir uma demo.

## Instalação no site existente

1. Confirmar endereço do site, plataforma, escopo de uma unidade/site e responsável autorizado.
2. Verificar se permite JavaScript externo, se há política de segurança que precise liberar o Prontô e se outro chat usa o mesmo canto da tela.
3. Criar cliente no plano Assistente, configurar cor, WhatsApp, até cinco perguntas e respostas aprovadas e salvar para obter o identificador público.
4. Copiar o código real gerado no painel e inserir no site via acesso autorizado ou enviar ao responsável pelo site. Não usar a configuração fictícia das demos em produção.
5. Conferir carregamento, respostas, links, celular e computador antes da publicação aprovada e início do teste.
6. Atualizações de conteúdo passam pelo Prontô; não é necessário reinstalar o código para cada alteração de resposta.

Formato do código (exemplo técnico, substituir pelo código real do painel):

```html
<script src="https://pronto.juuhhzinha2000.workers.dev/atendente-virtual-widget.js" data-site="IDENTIFICADOR_PUBLICO_GERADO_NO_PAINEL" defer></script>
```

Não publicar o exemplo sem substituir o identificador. Hospedagem e domínio atuais seguem com o fornecedor do site. Não afirmar compatibilidade universal ou instalação em rede inteira pelo preço de uma unidade. Instalações restritas precisam ser avaliadas antes da contratação.

## Manutenção

- Fonte de conteúdo: `public/demos/catalogo.js`.
- Geração de HTML: `scripts/generate-commercial-demos.mjs`.
- Controlador: `public/demos/demo.js`; estilos: `public/demos/demo.css`.
- Rodar `npm run demos:generate` após editar catálogo ou gerador. O build também regenera automaticamente.
- Rodar `npm test` e `npm run build` antes de publicar alterações.
- Testes cobrem as cinco respostas das oito demos, comparação dos formatos, destinatário do WhatsApp, ausência de chamadas ao banco, recuperação de falha, tema, âncoras e contraste do botão principal.
- O navegador local não está disponível nesta sessão; a suíte jsdom e o build não substituem uma inspeção visual em dispositivo real.
