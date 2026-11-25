import { Fragment, type ReactNode } from "react";

/** Renderizador simples de Markdown (títulos, listas, negrito, itálico) para as respostas da IA. */
function inline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g);
  return partes.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^(\*[^*]+\*|_[^_]+_)$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="rounded bg-bg px-1">{p.slice(1, -1)}</code>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export default function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];
  let lista: { ordenada: boolean; itens: string[] } | null = null;

  const fecharLista = () => {
    if (!lista) return;
    const Tag = lista.ordenada ? "ol" : "ul";
    blocos.push(
      <Tag key={blocos.length} className={`my-2 space-y-1 pl-5 ${lista.ordenada ? "list-decimal" : "list-disc"}`}>
        {lista.itens.map((t, i) => <li key={i}>{inline(t)}</li>)}
      </Tag>
    );
    lista = null;
  };

  for (const linha of linhas) {
    const ul = /^\s*[-*•]\s+(.*)$/.exec(linha);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(linha);
    const h = /^(#{1,4})\s+(.*)$/.exec(linha);
    if (ul || ol) {
      const ordenada = Boolean(ol);
      if (lista && lista.ordenada !== ordenada) fecharLista();
      if (!lista) lista = { ordenada, itens: [] };
      lista.itens.push((ul ?? ol)![1]);
      continue;
    }
    fecharLista();
    if (h) {
      blocos.push(<div key={blocos.length} className="mt-3 mb-1 font-semibold">{inline(h[2])}</div>);
    } else if (/^---+$/.test(linha.trim())) {
      blocos.push(<hr key={blocos.length} className="my-3 border-line" />);
    } else if (linha.trim()) {
      blocos.push(<p key={blocos.length} className="my-1.5">{inline(linha)}</p>);
    }
  }
  fecharLista();
  return <div className="text-sm leading-relaxed">{blocos}</div>;
}
