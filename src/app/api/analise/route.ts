import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODELO, anthropic, blocoImagem, mensagemDeErro } from "@/lib/anthropic";
import { requisicaoAutorizada, respostaNaoAutorizada } from "@/lib/sessao";
import { INSTRUCOES_DESIGNER } from "@/lib/designer-interiores";

export const maxDuration = 120;

const Analise = z.object({
  resumo: z.string().describe("Diagnóstico geral do ambiente em 2 a 4 frases"),
  pontosFortes: z.array(z.string()),
  melhorias: z.array(z.string()).describe("Melhorias concretas e priorizadas"),
  paleta: z
    .array(z.object({ nome: z.string(), hex: z.string().describe("Cor em #RRGGBB"), uso: z.string() }))
    .describe("5 a 6 cores para o novo estilo"),
  moveis: z
    .array(
      z.object({
        nome: z.string(),
        categoria: z.enum(["Móveis", "Iluminação", "Têxteis", "Decoração", "Revestimentos", "Marcenaria", "Outros"]),
        descricao: z.string().describe("Material, cor, medidas sugeridas"),
        precoEstimado: z.number().describe("Preço unitário estimado em reais"),
      })
    )
    .describe("Lista de compras sugerida"),
  iluminacao: z.array(z.string()),
  layout: z.string().describe("Sugestão de disposição dos móveis e circulação"),
});

export type ResultadoAnalise = z.infer<typeof Analise>;

export async function POST(req: Request) {
  if (!requisicaoAutorizada(req)) return respostaNaoAutorizada();
  try {
    const { imagem, ambiente, estilo, orcamento, notas } = (await req.json()) as {
      imagem?: string;
      ambiente: string;
      estilo: string;
      orcamento?: number;
      notas?: string;
    };

    const pedido = [
      `Ambiente: ${ambiente}`,
      `Estilo desejado: ${estilo}`,
      orcamento ? `Orçamento total disponível: R$ ${orcamento}` : "Orçamento: não informado (sugira opções de faixa média)",
      notas ? `Observações do cliente: ${notas}` : "",
      imagem
        ? "Analise a foto do ambiente atual e proponha a transformação para o estilo desejado."
        : "Não há foto: proponha um projeto do zero para esse ambiente e estilo.",
      "Se houver orçamento, faça a soma da lista de compras caber nele.",
      "Entregue uma proposta inicial com as informações disponíveis. Registre no resumo ou no layout as premissas que precisam ser confirmadas.",
    ]
      .filter(Boolean)
      .join("\n");

    const resposta = await anthropic.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      system: INSTRUCOES_DESIGNER,
      output_config: { effort: "medium", format: zodOutputFormat(Analise) },
      messages: [
        {
          role: "user",
          content: imagem ? [blocoImagem(imagem), { type: "text", text: pedido }] : pedido,
        },
      ],
    });

    if (resposta.stop_reason === "refusal") {
      return Response.json({ erro: "A IA não pôde analisar esta solicitação. Tente outra imagem ou descrição." }, { status: 422 });
    }
    if (!resposta.parsed_output) {
      return Response.json({ erro: "A resposta da IA veio incompleta. Tente novamente." }, { status: 502 });
    }
    return Response.json(resposta.parsed_output);
  } catch (e) {
    const { mensagem, status } = mensagemDeErro(e);
    return Response.json({ erro: mensagem }, { status });
  }
}
