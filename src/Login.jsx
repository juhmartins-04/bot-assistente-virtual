import React, { useState } from "react";
import { Sparkles, Mail, Lock } from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";
import { useTema } from "./useTema";
import BotaoTema from "./BotaoTema";

export default function Login() {
  const { tema, alternar: alternarTema } = useTema();
  const [modo, setModo] = useState("senha"); // "senha" | "link"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(null);

  async function entrarComSenha(e) {
    e.preventDefault();
    if (!email.trim() || !senha) return;

    setEnviando(true);
    setErro(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw error;
    } catch {
      setErro("E-mail ou senha incorretos. Se ainda não definiu uma senha, use \"Entrar por link no e-mail\".");
    }
    setEnviando(false);
  }

  async function enviarLink(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setEnviando(true);
    setErro(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      if (err?.code === "over_email_send_rate_limit" || err?.status === 429) {
        setErro("Muitos links pedidos em pouco tempo. Espere alguns minutos e tente de novo (ou entre com senha, se já tiver uma).");
      } else {
        setErro("Não consegui enviar o link agora. Confira o e-mail e tente de novo.");
      }
    }
    setEnviando(false);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-5 font-sans text-sm"
      style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}
    >
      <div className="w-full max-w-sm card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Sparkles size={20} style={{ color: TOKENS.amber }} />
          <h1 className="font-semibold text-base flex-1">Prontô</h1>
          <BotaoTema tema={tema} alternar={alternarTema} />
        </div>

        {enviado ? (
          <div className="flex flex-col gap-2">
            <p className="font-medium">Verifique seu e-mail</p>
            <p style={{ color: TOKENS.muted }}>
              Mandamos um link de acesso para <strong>{email}</strong>. Abra
              nesse mesmo navegador pra entrar.
            </p>
            <button
              onClick={() => { setEnviado(false); setModo("senha"); }}
              className="text-xs font-medium underline self-start mt-1"
              style={{ color: TOKENS.teal }}
            >
              voltar
            </button>
          </div>
        ) : modo === "senha" ? (
          <form onSubmit={entrarComSenha} className="flex flex-col gap-3" autoComplete="on">
            <label className="flex flex-col gap-1">
              <span className="font-medium">E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@suaagencia.com"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: TOKENS.border }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Senha</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: TOKENS.border }}
              />
            </label>
            <button
              type="submit"
              disabled={enviando}
              className="btn btn-primary py-2.5"
            >
              <Lock size={16} /> {enviando ? "Entrando..." : "Entrar"}
            </button>
            {erro && <span className="text-sm text-red-600 dark:text-red-400">{erro}</span>}
            <button
              type="button"
              onClick={() => { setModo("link"); setErro(null); }}
              className="text-xs font-medium underline self-start"
              style={{ color: TOKENS.teal }}
            >
              Ainda não tenho senha / esqueci — entrar por link no e-mail
            </button>
          </form>
        ) : (
          <form onSubmit={enviarLink} className="flex flex-col gap-3">
            <p style={{ color: TOKENS.muted }}>
              A gente manda um link de acesso pro seu e-mail. Depois de entrar, você
              pode definir uma senha pra não precisar disso de novo.
            </p>
            <label className="flex flex-col gap-1">
              <span className="font-medium">E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@suaagencia.com"
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: TOKENS.border }}
              />
            </label>
            <button
              type="submit"
              disabled={enviando}
              className="btn btn-primary py-2.5"
            >
              <Mail size={16} /> {enviando ? "Enviando..." : "Enviar link de acesso"}
            </button>
            {erro && <span className="text-sm text-red-600 dark:text-red-400">{erro}</span>}
            <button
              type="button"
              onClick={() => { setModo("senha"); setErro(null); }}
              className="text-xs font-medium underline self-start"
              style={{ color: TOKENS.teal }}
            >
              já tenho senha — entrar com senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
