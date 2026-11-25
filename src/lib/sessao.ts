import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Proteção por senha única do app.
 *
 * - A senha fica na variável de ambiente APP_SENHA (na Vercel: Settings → Environment Variables).
 * - Depois do login, o navegador guarda um cookie com uma assinatura derivada da senha.
 *   Trocar a senha desconecta todo mundo automaticamente.
 * - Sem APP_SENHA: no computador local (desenvolvimento) o app fica aberto;
 *   em produção ele fica BLOQUEADO, para a chave da IA nunca ficar exposta por esquecimento.
 */

export const COOKIE_SESSAO = "studio_sessao";
export const DURACAO_SESSAO = 60 * 60 * 24 * 30; // 30 dias, em segundos

export type EstadoProtecao = "aberto" | "protegido" | "sem_senha";

export function estadoProtecao(): EstadoProtecao {
  if (process.env.APP_SENHA) return "protegido";
  return process.env.NODE_ENV === "production" ? "sem_senha" : "aberto";
}

function assinatura(senha: string) {
  return createHmac("sha256", senha).update("studio-interiores:sessao:v1").digest();
}

function iguais(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function tokenSessao(): string {
  return assinatura(process.env.APP_SENHA ?? "").toString("hex");
}

export function sessaoValida(valor: string | undefined): boolean {
  const estado = estadoProtecao();
  if (estado === "aberto") return true;
  if (estado === "sem_senha" || !valor) return false;
  return iguais(Buffer.from(valor, "utf8"), Buffer.from(tokenSessao(), "utf8"));
}

/** Compara a senha digitada sem vazar informação pelo tempo de resposta. */
export function senhaCorreta(tentativa: string): boolean {
  const senha = process.env.APP_SENHA;
  if (!senha) return false;
  return iguais(assinatura(tentativa), assinatura(senha));
}

function lerCookie(req: Request, nome: string) {
  const cabecalho = req.headers.get("cookie") ?? "";
  for (const parte of cabecalho.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/** Usado pelas rotas da IA: segunda barreira além do proxy. */
export function requisicaoAutorizada(req: Request): boolean {
  return sessaoValida(lerCookie(req, COOKIE_SESSAO));
}

export function respostaNaoAutorizada() {
  const semSenha = estadoProtecao() === "sem_senha";
  return Response.json(
    { erro: semSenha ? "O app está bloqueado: defina a variável APP_SENHA no servidor." : "Sessão expirada. Entre novamente com a senha." },
    { status: semSenha ? 503 : 401 }
  );
}
