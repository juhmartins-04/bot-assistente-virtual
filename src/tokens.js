// Paleta idêntica à usada no guia e na documentação técnica do Prontô
// (mesmos valores de --ink, --teal, --amber, --hairline, --muted),
// pra tudo — painel e documentações — ficar na mesma identidade.
// Os valores apontam pras custom properties definidas em index.css, que
// trocam sozinhas com base no tema claro/escuro do sistema — por isso
// nenhum componente que usa TOKENS precisa saber sobre tema nenhum.
export const TOKENS = {
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  canvas: "var(--canvas)",
  surface: "var(--surface)",
  amber: "var(--amber)",
  amberDeep: "var(--amber-deep)",
  amberWash: "var(--amber-wash)",
  teal: "var(--teal)",
  tealSoft: "var(--teal-soft)",
  crimson: "var(--crimson)",
  crimsonWash: "var(--crimson-wash)",
  border: "var(--border)",
  muted: "var(--muted)",
};
