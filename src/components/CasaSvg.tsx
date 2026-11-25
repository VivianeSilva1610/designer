"use client";

import { useRef, useState } from "react";
import { SimboloAbertura } from "@/components/PlantaSvg";
import { cantosNaCasa, imantar, comodosComPlanta } from "@/lib/casa";
import { areaPlanta, caixa, paredes } from "@/lib/geometria";
import type { PosicaoCasa, Ponto, Projeto } from "@/lib/types";

interface Props {
  projeto: Projeto;
  posicoes: Record<string, PosicaoCasa>;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  /** chamado ao soltar o cômodo (para gravar só no fim do arraste) */
  onMover: (id: string, pos: PosicaoCasa) => void;
}

const PAREDE = 0.12;
const PASSO = 0.05;
const encaixe = (v: number) => Math.round(v / PASSO) * PASSO;
const CORES = ["#f6efe6", "#eef3ee", "#eef1f6", "#f6eef0", "#f3f1e6", "#eef5f5", "#f5efe9"];

export default function CasaSvg({ projeto, posicoes, selecionado, onSelecionar, onMover }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrasto = useRef<{ id: string; inicio: Ponto; pos: PosicaoCasa } | null>(null);
  const [temporaria, setTemporaria] = useState<{ id: string; pos: PosicaoCasa } | null>(null);

  const comodos = comodosComPlanta(projeto);
  const posDe = (id: string) => (temporaria?.id === id ? temporaria.pos : posicoes[id]);

  const todosPontos = comodos.flatMap((a) => cantosNaCasa(a.planta, posDe(a.id)));
  const box = todosPontos.length ? caixa(todosPontos) : { minX: 0, minY: 0, maxX: 5, maxY: 5 };
  const M = 1.2;
  const areaTotal = comodos.reduce((s, a) => s + areaPlanta(a.planta), 0);
  const escala = Math.max(1, Math.max(box.maxX - box.minX, box.maxY - box.minY) / 8);

  function ponto(e: React.PointerEvent): Ponto {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function mover(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a) return;
    const p = ponto(e);
    const amb = comodos.find((c) => c.id === a.id)!;
    let pos: PosicaoCasa = { ...a.pos, x: encaixe(a.pos.x + p.x - a.inicio.x), y: encaixe(a.pos.y + p.y - a.inicio.y) };
    // ímã nos cantos dos outros cômodos
    const outros = comodos.filter((c) => c.id !== a.id).map((c) => cantosNaCasa(c.planta, posicoes[c.id]));
    const { dx, dy } = imantar(cantosNaCasa(amb.planta, pos), outros);
    pos = { ...pos, x: +(pos.x + dx).toFixed(3), y: +(pos.y + dy).toFixed(3) };
    setTemporaria({ id: a.id, pos });
  }

  function soltar() {
    if (arrasto.current && temporaria) onMover(temporaria.id, temporaria.pos);
    arrasto.current = null;
    setTemporaria(null);
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`${box.minX - M} ${box.minY - M} ${box.maxX - box.minX + 2 * M} ${box.maxY - box.minY + 2 * M}`}
        className="w-full touch-none select-none rounded-xl bg-bg"
        style={{ maxHeight: "72vh" }}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerDown={() => onSelecionar(null)}
      >
        {comodos.map((amb, k) => {
          const pos = posDe(amb.id);
          const sel = amb.id === selecionado;
          const pts = cantosNaCasa(amb.planta, pos);
          const centro = pts.reduce((s, q) => ({ x: s.x + q.x / pts.length, y: s.y + q.y / pts.length }), { x: 0, y: 0 });
          const listaParedes = paredes(amb.planta);
          return (
            <g
              key={amb.id}
              style={{ cursor: "move" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture(e.pointerId);
                arrasto.current = { id: amb.id, inicio: ponto(e), pos };
                onSelecionar(amb.id);
              }}
            >
              <polygon points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill={CORES[k % CORES.length]} />
              {/* móveis e aberturas no sistema do cômodo */}
              <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.rotacao})`} pointerEvents="none">
                {amb.planta.moveis.map((m) => (
                  <rect key={m.id} x={m.x} y={m.y} width={m.w} height={m.h} rx={0.03} fill={m.cor} fillOpacity={0.8} stroke="#2b2622" strokeWidth={0.01} />
                ))}
              </g>
              <polygon points={pts.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={sel ? "#a0673f" : "#2b2622"} strokeWidth={PAREDE} />
              <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.rotacao})`} pointerEvents="none">
                {(amb.planta.aberturas ?? []).map((ab) => {
                  const par = listaParedes[ab.parede];
                  if (!par) return null;
                  return (
                    <g key={ab.id} transform={`matrix(${par.u.x},${par.u.y},${par.n.x},${par.n.y},${par.a.x},${par.a.y})`}>
                      <SimboloAbertura a={ab} sel={false} />
                    </g>
                  );
                })}
              </g>
              <text x={centro.x} y={centro.y} textAnchor="middle" dominantBaseline="central" fontSize={0.28 * escala} fontWeight="bold" fill={sel ? "#a0673f" : "#2b2622"} pointerEvents="none" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 0.06 * escala }}>
                {amb.nome}
              </text>
              <text x={centro.x} y={centro.y + 0.38 * escala} textAnchor="middle" dominantBaseline="central" fontSize={0.2 * escala} fill="#7a6f66" pointerEvents="none" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 0.05 * escala }}>
                {areaPlanta(amb.planta).toFixed(1).replace(".", ",")} m²
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 text-sm text-muted">
        {comodos.length} cômodos · área total ≈ <b className="text-ink">{areaTotal.toFixed(1).replace(".", ",")} m²</b>
      </div>
    </div>
  );
}
