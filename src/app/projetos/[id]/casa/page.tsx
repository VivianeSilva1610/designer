"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import CasaSvg from "@/components/CasaSvg";
import { PE_DIREITO_PADRAO, comodosComPlanta, posicoes as calcularPosicoes } from "@/lib/casa";
import { useProjetos } from "@/lib/store";
import type { PosicaoCasa } from "@/lib/types";

// o 3D só roda no navegador
const Casa3D = dynamic(() => import("@/components/Casa3D"), {
  ssr: false,
  loading: () => <div className="card animate-pulse text-sm text-muted">Carregando o 3D…</div>,
});

function Pagina() {
  const { id } = useParams<{ id: string }>();
  const busca = useSearchParams();
  const { projetos, atualizar } = useProjetos();
  const p = projetos.find((x) => x.id === id);
  const [vista, setVista] = useState<"2d" | "3d">(busca.get("vista") === "3d" ? "3d" : "2d");
  const [sel, setSel] = useState<string | null>(busca.get("comodo"));

  const pos = useMemo(() => (p ? calcularPosicoes(p) : {}), [p]);

  if (!p) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <p className="mb-4 text-muted">Projeto não encontrado.</p>
        <Link className="btn" href="/projetos">Voltar aos projetos</Link>
      </div>
    );
  }

  const comPlanta = comodosComPlanta(p);
  const semPlanta = p.ambientes.filter((a) => !a.planta);
  const selecionado = comPlanta.find((a) => a.id === sel);

  function gravar(ambId: string, nova: PosicaoCasa) {
    // grava a posição de todos os cômodos (quem estava na fila automática fica fixo onde está)
    atualizar(p!.id, (x) => ({
      ...x,
      ambientes: x.ambientes.map((a) => (a.id === ambId ? { ...a, posicaoCasa: nova } : a.planta ? { ...a, posicaoCasa: a.posicaoCasa ?? pos[a.id] } : a)),
    }));
  }

  function girar(ambId: string, sentido: 1 | -1) {
    const atual = pos[ambId];
    const rotacao = (((atual.rotacao + sentido * 90) % 360) + 360) % 360 as PosicaoCasa["rotacao"];
    gravar(ambId, { ...atual, rotacao });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/projetos/${p.id}`} className="text-sm text-muted hover:text-accent">← {p.nome}</Link>
          <h1 className="h1">A casa</h1>
        </div>
        <div className="flex rounded-xl border border-line bg-surface p-1">
          <button className={`rounded-lg px-4 py-2 text-sm ${vista === "2d" ? "bg-accent text-white" : ""}`} onClick={() => setVista("2d")}>
            ⊞ Montar planta da casa
          </button>
          <button className={`rounded-lg px-4 py-2 text-sm ${vista === "3d" ? "bg-accent text-white" : ""}`} onClick={() => setVista("3d")}>
            ◈ Ver em 3D
          </button>
        </div>
      </div>

      {comPlanta.length === 0 ? (
        <div className="card space-y-3 text-sm">
          <p>Nenhum cômodo deste projeto tem planta ainda. Desenhe a planta de cada cômodo e depois volte aqui para juntar tudo.</p>
          <div className="flex flex-wrap gap-2">
            {p.ambientes.map((a) => (
              <Link key={a.id} className="btn-ghost" href={`/planta?projeto=${p.id}&ambiente=${a.id}`}>+ Planta: {a.nome}</Link>
            ))}
          </div>
        </div>
      ) : vista === "2d" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="card p-3">
            <CasaSvg projeto={p} posicoes={pos} selecionado={sel} onSelecionar={setSel} onMover={gravar} />
          </div>

          <div className="space-y-4">
            <div className="card space-y-3 text-sm">
              <div className="label">Como montar</div>
              <p className="text-muted">
                Arraste cada cômodo para o lugar dele. Quando um canto chega perto do canto de outro cômodo, ele <b>gruda sozinho</b> (ímã), deixando as paredes alinhadas.
              </p>
              <p className="text-muted">Portas desenhadas em um cômodo abrem a passagem também no cômodo vizinho, no 3D.</p>
            </div>

            {selecionado ? (
              <div className="card space-y-3">
                <div className="label">Cômodo selecionado</div>
                <div className="font-medium">{selecionado.nome}</div>
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => girar(selecionado.id, -1)}>⟲ Girar</button>
                  <button className="btn-ghost flex-1" onClick={() => girar(selecionado.id, 1)}>⟳ Girar</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">X (m)</label>
                    <input className="input" type="number" step="0.05" value={+pos[selecionado.id].x.toFixed(2)} onChange={(e) => gravar(selecionado.id, { ...pos[selecionado.id], x: Number(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="label">Y (m)</label>
                    <input className="input" type="number" step="0.05" value={+pos[selecionado.id].y.toFixed(2)} onChange={(e) => gravar(selecionado.id, { ...pos[selecionado.id], y: Number(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-ghost flex-1" href={`/planta?projeto=${p.id}&ambiente=${selecionado.id}`}>Editar planta</Link>
                  <button className="btn flex-1" onClick={() => setVista("3d")}>Ver em 3D</button>
                </div>
              </div>
            ) : (
              <div className="card text-sm text-muted">Clique em um cômodo para girar ou ajustar a posição.</div>
            )}

            <div className="card space-y-2">
              <label className="label">Pé-direito (altura do teto, m)</label>
              <input
                className="input"
                type="number"
                step="0.05"
                min="2"
                max="6"
                value={p.peDireito ?? PE_DIREITO_PADRAO}
                onChange={(e) => atualizar(p.id, (x) => ({ ...x, peDireito: Math.min(6, Math.max(2, Number(e.target.value) || PE_DIREITO_PADRAO)) }))}
              />
            </div>

            {semPlanta.length > 0 && (
              <div className="card space-y-2 text-sm">
                <div className="label">Ainda sem planta</div>
                {semPlanta.map((a) => (
                  <Link key={a.id} className="block text-accent underline" href={`/planta?projeto=${p.id}&ambiente=${a.id}`}>+ Desenhar {a.nome}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Casa3D projeto={p} posicoes={pos} comodoInicial={sel} modoInicial={busca.get("modo") === "caminhar" ? "caminhar" : "maquete"} />
      )}
    </div>
  );
}

export default function PaginaCasa() {
  return (
    <Suspense>
      <Pagina />
    </Suspense>
  );
}
