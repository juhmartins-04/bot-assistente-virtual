import { next } from "@vercel/functions";

// Só roda nas páginas públicas dos clientes — em qualquer outra rota,
// nem chega a ser chamado (ver "matcher" abaixo).
export const config = {
  matcher: "/p/:publicId",
};

const SUPABASE_URL = "https://rnlgvlmwwncfrfywszaf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x40vbDCMSrdE7uiNGK0U8Q_ODc99VlB";

// Crawlers que geram prévia de link (WhatsApp, Instagram/Facebook, Twitter/X,
// Telegram, Discord, Slack, LinkedIn) não executam JavaScript — por isso o
// <title>/meta definidos via useEffect no React nunca chegam até eles. Esse
// middleware detecta esses crawlers pelo User-Agent e devolve um HTML
// mínimo, já com o nome/descrição certos do negócio, sem passar pelo React.
// Visitantes de verdade (qualquer outro User-Agent) seguem direto pro app
// normal, sem passar por nada disso.
const UA_CRAWLER = /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|LinkedInBot|TelegramBot|Discordbot|SkypeUriPreview|Googlebot/i;

function escapeHtml(texto) {
  return String(texto || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export default async function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";
  if (!UA_CRAWLER.test(userAgent)) return next();

  const url = new URL(request.url);
  const publicId = url.pathname.split("/").filter(Boolean).pop();
  if (!publicId) return next();

  try {
    const resposta = await fetch(
      `${SUPABASE_URL}/rest/v1/widget_config?public_id=eq.${encodeURIComponent(publicId)}&select=dados`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!resposta.ok) return next();

    const linhas = await resposta.json();
    const dados = linhas?.[0]?.dados;
    if (!dados?.nomeNegocio) return next();

    const nome = escapeHtml(dados.nomeNegocio);
    const descricao = escapeHtml(dados.sobreNegocio || "Atendimento digital simples pro seu negócio.");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${nome}</title>
<meta name="description" content="${descricao}">
<meta property="og:title" content="${nome}">
<meta property="og:description" content="${descricao}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${nome}">
<meta name="twitter:description" content="${descricao}">
</head>
<body>${nome}</body>
</html>`;

    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  } catch {
    return next();
  }
}
