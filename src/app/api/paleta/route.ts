import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODELO, anthropic, mensagemDeErro } from "@/lib/anthropic";
import { requisicaoAutorizada, respostaNaoAutorizada } from "@/lib/sessao";
import { INSTRUCOES_DESIGNER } from "@/lib/designer-interiores";

export const maxDuration = 60;

const Paleta = z.object({
  cores: z.array(z.object({ nome: z.string(), hex: z.string().describe("#RRGGBB") })).describe("5 a 6 cores harmoniosas"),
  conceito: z.string().describe("Conceito do moodboard em 2 a 3 frases"),
});

export async function POST(req: Request) {
  if (!requisicaoAutorizada(req)) return respostaNaoAutorizada();
  try {
    const { descricao } = (await req.json()) as { descricao: string };
    const resposta = await anthropic.messages.parse({
      model: MODELO,
      max_tokens: 4000,
      system: INSTRUCOES_DESIGNER,
      output_config: { effort: "low", format: zodOutputFormat(Paleta) },
      messages: [{ role: "user", content: `Crie uma paleta de cores para um moodboard de design de interiores: ${descricao}` }],
    });
    if (resposta.stop_reason === "refusal" || !resposta.parsed_output) {
      return Response.json({ erro: "Não foi possível gerar a paleta. Tente outra descrição." }, { status: 422 });
    }
    return Response.json(resposta.parsed_output);
  } catch (e) {
    const { mensagem, status } = mensagemDeErro(e);
    return Response.json({ erro: mensagem }, { status });
  }
}
