import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, estadoProtecao, respostaNaoAutorizada, sessaoValida } from "@/lib/sessao";

/** Exige a senha antes de qualquer página ou rota da API (exceto a própria tela de login). */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  if (estadoProtecao() === "aberto") return NextResponse.next();
  if (sessaoValida(req.cookies.get(COOKIE_SESSAO)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return respostaNaoAutorizada();

  const login = new URL("/login", req.url);
  if (pathname !== "/") login.searchParams.set("de", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // tudo, menos arquivos estáticos do Next e imagens
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
