import React, { useState } from "react";
import { Sparkles, Mail } from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";

export default function Login() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(null);

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
    } catch {
      setErro("Não consegui enviar o link agora. Confira o e-mail e tente de novo.");
    }
    setEnviando(false);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-5 font-sans text-sm"
      style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}
    >
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 flex flex-col gap-5" style={{ borderColor: TOKENS.border }}>
        <div className="flex items-center gap-2">
          <Sparkles size={20} style={{ color: TOKENS.amber }} />
          <h1 className="font-semibold text-base">Prontô</h1>
        </div>

        {enviado ? (
          <div className="flex flex-col gap-2">
            <p className="font-medium">Verifique seu e-mail</p>
            <p style={{ color: TOKENS.muted }}>
              Mandamos um link de acesso para <strong>{email}</strong>. Abra
              nesse mesmo navegador pra entrar.
            </p>
            <button
              onClick={() => setEnviado(false)}
              className="text-xs font-medium underline self-start mt-1"
              style={{ color: TOKENS.teal }}
            >
              usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={enviarLink} className="flex flex-col gap-3">
            <p style={{ color: TOKENS.muted }}>
              Entre com seu e-mail. A gente manda um link, sem senha pra guardar.
            </p>
            <label className="flex flex-col gap-1">
              <span className="font-medium">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@suaagencia.com"
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: TOKENS.border }}
              />
            </label>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-white focus:outline-none focus:ring-2"
              style={{ backgroundColor: TOKENS.teal }}
            >
              <Mail size={16} /> {enviando ? "Enviando..." : "Enviar link de acesso"}
            </button>
            {erro && <span className="text-sm text-red-600">{erro}</span>}
          </form>
        )}
      </div>
    </div>
  );
}
