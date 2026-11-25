"use client";

import { useRef } from "react";
import { comprimentoParede, type Abertura, type Movel, type Parede, type Planta } from "@/lib/types";

interface Props {
  planta: Planta;
  selecionado?: string | null;
  onSelecionar?: (id: string | null) => void;
  onMover?: (id: string, x: number, y: number) => void;
  onMoverAbertura?: (id: string, parede: Parede, posicao: number) => void;
}

const MARGEM_MIN = 0.6; // metros ao redor do cômodo (para cotas)
const PASSO = 0.05; // encaixe de 5 cm
const PAREDE = 0.12; // espessura desenhada da parede
const encaixe = (v: number) => Math.round(v / PASSO) * PASSO;

/**
 * Cada parede tem um sistema de coordenadas local em que a parede corre ao longo
 * de +x (a partir do canto esquerdo/superior) e o interior do cômodo fica em +y.
 */
function transformacao(parede: Parede, L: number, C: number) {
  switch (parede) {
    case "norte": return "matrix(1,0,0,1,0,0)";
    case "sul": return `matrix(1,0,0,-1,0,${C})`;
    case "oeste": return "matrix(0,1,1,0,0,0)";
    case "leste": return `matrix(0,1,-1,0,${L},0)`;
  }
}

function SimboloAbertura({ a, sel }: { a: Abertura; sel: boolean }) {
  const { posicao: x, largura: w } = a;
  const traco = sel ? "#a0673f" : "#2b2622";
  const fino = 0.015;
  const vao = <rect x={x} y={-PAREDE / 2 - 0.01} width={w} height={PAREDE + 0.02} fill="#fff" />;

  if (a.tipo === "janela") {
    return (
      <>
        {vao}
        <g stroke={traco} strokeWidth={fino}>
          <line x1={x} y1={-PAREDE / 2} x2={x + w} y2={-PAREDE / 2} />
          <line x1={x} y1={0} x2={x + w} y2={0} />
          <line x1={x} y1={PAREDE / 2} x2={x + w} y2={PAREDE / 2} />
          <line x1={x} y1={-PAREDE / 2} x2={x} y2={PAREDE / 2} />
          <line x1={x + w} y1={-PAREDE / 2} x2={x + w} y2={PAREDE / 2} />
        </g>
      </>
    );
  }

  if (a.tipo === "porta_correr" || a.tipo === "porta_balcao") {
    const vidro = a.tipo === "porta_balcao";
    const folha = w * 0.55;
    return (
      <>
        {vao}
        <g stroke={traco} strokeWidth={fino} fill={vidro ? "#dbe9f0" : "#e9dccd"}>
          <rect x={x} y={-0.035} width={folha} height={0.035} />
          <rect x={x + w - folha} y={0} width={folha} height={0.035} />
        </g>
        <g stroke={traco} strokeWidth={fino}>
          <line x1={x} y1={-PAREDE / 2} x2={x} y2={PAREDE / 2} />
          <line x1={x + w} y1={-PAREDE / 2} x2={x + w} y2={PAREDE / 2} />
        </g>
      </>
    );
  }

  // porta de abrir: folha + arco de giro
  const dir = a.abreParaFora ? -1 : 1;
  const esquerda = a.dobradica === "esquerda";
  const hx = esquerda ? x : x + w; // dobradiça
  const fim = esquerda ? x + w : x; // ponto onde a folha fecha
  const sweep = esquerda === !a.abreParaFora ? 0 : 1;
  return (
    <>
      {vao}
      <path d={`M ${hx} ${w * dir} A ${w} ${w} 0 0 ${sweep} ${fim} 0`} fill="none" stroke={traco} strokeWidth={fino * 0.8} strokeDasharray="0.05 0.035" />
      <line x1={hx} y1={0} x2={hx} y2={w * dir} stroke={traco} strokeWidth={0.035} />
    </>
  );
}

export default function PlantaSvg({ planta, selecionado, onSelecionar, onMover, onMoverAbertura }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrasto = useRef<{ tipo: "movel" | "abertura"; id: string; dx: number; dy: number } | null>(null);
  const editavel = Boolean(onMover);
  const { largura: L, comprimento: C } = planta;
  const aberturas = planta.aberturas ?? [];
  // portas que abrem para fora precisam de espaço extra ao redor do desenho
  const MARGEM = Math.max(
    MARGEM_MIN,
    ...aberturas.filter((a) => a.tipo === "porta" && a.abreParaFora).map((a) => a.largura + 0.15)
  );

  function pontoEmMetros(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function iniciarMovel(e: React.PointerEvent, m: Movel) {
    if (!editavel) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = pontoEmMetros(e);
    arrasto.current = { tipo: "movel", id: m.id, dx: p.x - m.x, dy: p.y - m.y };
    onSelecionar?.(m.id);
  }

  function iniciarAbertura(e: React.PointerEvent, a: Abertura) {
    if (!onMoverAbertura) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    arrasto.current = { tipo: "abertura", id: a.id, dx: 0, dy: 0 };
    onSelecionar?.(a.id);
  }

  function mover(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a) return;
    const p = pontoEmMetros(e);

    if (a.tipo === "movel") {
      const m = planta.moveis.find((x) => x.id === a.id);
      if (!m || !onMover) return;
      const x = Math.min(Math.max(encaixe(p.x - a.dx), 0), Math.max(0, L - m.w));
      const y = Math.min(Math.max(encaixe(p.y - a.dy), 0), Math.max(0, C - m.h));
      onMover(a.id, +x.toFixed(2), +y.toFixed(2));
      return;
    }

    // abertura: vai para a parede mais próxima do ponteiro e desliza ao longo dela
    const ab = aberturas.find((x) => x.id === a.id);
    if (!ab || !onMoverAbertura) return;
    const distancias: [Parede, number][] = [
      ["norte", Math.abs(p.y)],
      ["sul", Math.abs(p.y - C)],
      ["oeste", Math.abs(p.x)],
      ["leste", Math.abs(p.x - L)],
    ];
    const parede = distancias.sort((x, y) => x[1] - y[1])[0][0];
    const ao_longo = parede === "norte" || parede === "sul" ? p.x : p.y;
    const max = Math.max(0, comprimentoParede(planta, parede) - ab.largura);
    const posicao = Math.min(Math.max(encaixe(ao_longo - ab.largura / 2), 0), max);
    onMoverAbertura(a.id, parede, +posicao.toFixed(2));
  }

  const linhasGrade = [];
  for (let x = 0.5; x < L; x += 0.5) linhasGrade.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={C} />);
  for (let y = 0.5; y < C; y += 0.5) linhasGrade.push(<line key={`y${y}`} x1={0} y1={y} x2={L} y2={y} />);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-MARGEM} ${-MARGEM} ${L + MARGEM * 2} ${C + MARGEM * 2}`}
      className="w-full touch-none select-none rounded-xl bg-bg"
      style={{ maxHeight: "70vh" }}
      onPointerMove={mover}
      onPointerUp={() => (arrasto.current = null)}
      onPointerDown={() => onSelecionar?.(null)}
    >
      <rect x={0} y={0} width={L} height={C} fill="#fff" />
      <g stroke="#e6dfd5" strokeWidth={0.01}>{linhasGrade}</g>

      {/* cotas */}
      <text x={L / 2} y={-0.3} textAnchor="middle" fontSize={0.22} fill="#7a6f66">{L.toFixed(2)} m</text>
      <text x={-0.3} y={C / 2} textAnchor="middle" fontSize={0.22} fill="#7a6f66" transform={`rotate(-90 ${-0.3} ${C / 2})`}>{C.toFixed(2)} m</text>

      {planta.moveis.map((m) => {
        const sel = m.id === selecionado;
        const fonte = Math.min(0.2, Math.max(0.1, Math.min(m.w, m.h) / 4));
        return (
          <g key={m.id} onPointerDown={(e) => iniciarMovel(e, m)} style={{ cursor: editavel ? "move" : "default" }}>
            <rect
              x={m.x}
              y={m.y}
              width={m.w}
              height={m.h}
              rx={0.04}
              fill={m.cor}
              fillOpacity={0.85}
              stroke={sel ? "#a0673f" : "#2b2622"}
              strokeWidth={sel ? 0.05 : 0.015}
            />
            <text
              x={m.x + m.w / 2}
              y={m.y + m.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fonte}
              fill="#2b2622"
              pointerEvents="none"
              transform={m.h > m.w * 1.6 ? `rotate(-90 ${m.x + m.w / 2} ${m.y + m.h / 2})` : undefined}
            >
              {m.nome}
            </text>
          </g>
        );
      })}

      {/* paredes por cima dos móveis, aberturas por cima das paredes */}
      <rect x={0} y={0} width={L} height={C} fill="none" stroke="#2b2622" strokeWidth={PAREDE} pointerEvents="none" />

      {aberturas.map((a) => {
        const sel = a.id === selecionado;
        const alcance = a.tipo === "porta" ? a.largura : 0.1;
        return (
          <g
            key={a.id}
            transform={transformacao(a.parede, L, C)}
            onPointerDown={(e) => iniciarAbertura(e, a)}
            style={{ cursor: onMoverAbertura ? "grab" : "default" }}
          >
            <SimboloAbertura a={a} sel={sel} />
            {/* área de clique invisível */}
            <rect
              x={a.posicao}
              y={a.tipo === "porta" && a.abreParaFora ? -alcance : -0.15}
              width={a.largura}
              height={alcance + 0.15}
              fill="transparent"
              stroke={sel ? "#a0673f" : "none"}
              strokeWidth={0.02}
              strokeDasharray="0.06 0.04"
            />
          </g>
        );
      })}
    </svg>
  );
}
