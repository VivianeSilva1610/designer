import { NextResponse } from "next/server";
import { COOKIE_SESSAO, DURACAO_SESSAO, estadoProtecao, requisicaoAutorizada, senhaCorreta, tokenSessao } from "@/lib/sessao";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Situação da proteção (para a tela de login e o botão "Sair"). */
export async function GET(req: Request) {
  return Response.json({ estado: estadoProtecao(), logado: requisicaoAutorizada(req) });
}

/** Entrar: confere a senha e grava o cookie de sessão. */
export async function POST(req: Request) {
  const estado = estadoProtecao();
  if (estado === "sem_senha") {
    return Response.json({ erro: "A senha ainda não foi configurada no servidor (variável APP_SENHA)." }, { status: 503 });
  }
  if (estado === "aberto") return Response.json({ ok: true });

  let senha = "";
  try {
    senha = String(((await req.json()) as { senha?: unknown }).senha ?? "");
  } catch {
    /* corpo inválido: trata como senha vazia */
  }

  if (!senhaCorreta(senha)) {
    await espera(1000); // atrasa tentativas repetidas de adivinhar a senha
    return Response.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, tokenSessao(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO,
  });
  return res;
}

/** Sair: apaga o cookie. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
