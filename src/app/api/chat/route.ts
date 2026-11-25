import type Anthropic from "@anthropic-ai/sdk";
import { MODELO, anthropic, blocoImagem, mensagemDeErro } from "@/lib/anthropic";
import { instrucoesDoConsultor } from "@/lib/designer-interiores";

export const maxDuration = 300;

interface MensagemCliente {
  role: "user" | "assistant";
  texto: string;
  imagem?: string;
}

export async function POST(req: Request) {
  let mensagens: MensagemCliente[];
  let contexto = "";
  try {
    const corpo = (await req.json()) as { mensagens: MensagemCliente[]; contexto?: string };
    mensagens = corpo.mensagens;
    contexto = corpo.contexto ?? "";
  } catch {
    return Response.json({ erro: "Requisição inválida" }, { status: 400 });
  }

  const historico: Anthropic.Beta.BetaMessageParam[] = mensagens.map((m) => ({
    role: m.role,
    content:
      m.role === "user" && m.imagem
        ? [blocoImagem(m.imagem), { type: "text" as const, text: m.texto || "Analise esta imagem." }]
        : m.texto,
  }));

  const system = instrucoesDoConsultor(contexto);

  const codificador = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controle) {
      try {
        const stream = anthropic.beta.messages.stream({
          model: MODELO,
          max_tokens: 64000,
          system,
          output_config: { effort: "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          messages: historico,
        });
        stream.on("text", (delta) => controle.enqueue(codificador.encode(delta)));
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controle.enqueue(codificador.encode("\n\n_(A IA não pôde responder a esta solicitação.)_"));
        }
      } catch (e) {
        controle.enqueue(codificador.encode(`\n\n⚠️ ${mensagemDeErro(e).mensagem}`));
      } finally {
        controle.close();
      }
    },
  });

  return new Response(corpo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" } });
}
