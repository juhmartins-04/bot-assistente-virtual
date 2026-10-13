import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Keep social previews on the same host when publishing the static build.
// Cloudflare injects CF_PAGES_URL; an explicit public URL can override it.
const publicOrigin = {
  name: "pronto-public-origin",
  transformIndexHtml(html) {
    const configured = process.env.VITE_PUBLIC_SITE_URL || process.env.CF_PAGES_URL;
    if (!configured) return html;
    const url = new URL(configured);
    if (url.protocol !== "https:") throw new Error("A URL pública precisa usar HTTPS.");
    return html.replaceAll("https://usarpronto.vercel.app", url.origin);
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), publicOrigin],
});
