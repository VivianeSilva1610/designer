"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type Estado = "aberto" | "protegido" | "sem_senha" | null;

function FormLogin() {
  const busca = useSearchParams();
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState<Estado>(null);

  useEffect(() => {
    fetch("/api/login")
      .then((r) => r.json())
      .then((d: { estado: Estado }) => setEstado(d.estado))
      .catch(() => setEstado("protegido"));
  }, []);

  // só volta para caminhos internos do próprio app
  const destino = (() => {
    const de = busca.get("de") ?? "/";
    return de.startsWith("/") && !de.startsWith("//") ? de : "/";
  })();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro ?? "Não foi possível entrar.");
      window.location.href = destino; // recarrega para o app inteiro já com a sessão
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="card w-full max-w-sm space-y-5 p-8">
        <div className="text-center">
          <div className="font-serif text-3xl">Studio Interiores</div>
          <div className="text-sm text-muted">design de interiores com IA</div>
        </div>

        {estado === "sem_senha" ? (
          <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-warn">
            <p className="font-medium">O app está bloqueado por segurança.</p>
            <p>
              A senha ainda não foi configurada. Na Vercel, abra o projeto → <b>Settings → Environment Variables</b>, crie a variável <code>APP_SENHA</code> com a senha desejada e faça um <b>Redeploy</b>.
            </p>
          </div>
        ) : estado === "aberto" ? (
          <div className="space-y-3 text-center text-sm text-muted">
            <p>A proteção por senha está desligada neste computador (modo de desenvolvimento, sem <code>APP_SENHA</code>).</p>
            <Link className="btn" href="/">Entrar no app</Link>
          </div>
        ) : (
          <form onSubmit={entrar} className="space-y-3">
            <div>
              <label className="label" htmlFor="senha">Senha</label>
              <div className="flex gap-2">
                <input
                  id="senha"
                  className="input"
                  type={mostrar ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <button type="button" className="btn-ghost px-3" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? "Esconder senha" : "Mostrar senha"}>
                  {mostrar ? "🙈" : "👁"}
                </button>
              </div>
            </div>
            {erro && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{erro}</div>}
            <button className="btn w-full" type="submit" disabled={enviando || !senha || estado === null}>
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PaginaLogin() {
  return (
    <Suspense>
      <FormLogin />
    </Suspense>
  );
}
