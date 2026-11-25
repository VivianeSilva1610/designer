import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// A chave vem da variável de ambiente ANTHROPIC_API_KEY (arquivo .env.local).
export const anthropic = new Anthropic();
export const MODELO = "claude-opus-5-5";

export type TipoImagem = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** Converte "data:image/jpeg;base64,AAAA" no bloco de imagem da API. */
export function blocoImagem(dataUrl: string) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Imagem inválida");
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: m[1] as TipoImagem, data: m[2] },
  };
}

export function mensagemDeErro(e: unknown): { mensagem: string; status: number } {
  if (e instanceof Anthropic.AuthenticationError) {
    return { mensagem: "Chave da API inválida ou ausente. Configure ANTHROPIC_API_KEY no arquivo .env.local.", status: 401 };
  }
  if (e instanceof Anthropic.RateLimitError) {
    return { mensagem: "Muitas solicitações em pouco tempo. Aguarde alguns segundos e tente de novo.", status: 429 };
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return { mensagem: "Não foi possível conectar à IA. Verifique sua internet.", status: 503 };
  }
  if (e instanceof Anthropic.APIError) {
    return { mensagem: `Erro da IA: ${e.message}`, status: e.status ?? 500 };
  }
  if (e instanceof Error && /api key|apiKey|authentication/i.test(e.message)) {
    return { mensagem: "Chave da API ausente. Configure ANTHROPIC_API_KEY no arquivo .env.local.", status: 401 };
  }
  return { mensagem: e instanceof Error ? e.message : "Erro inesperado", status: 500 };
}

