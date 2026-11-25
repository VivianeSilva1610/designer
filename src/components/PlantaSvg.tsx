"use client";

import { useId, useRef, useState } from "react";
import { caixa, cantos, encaixarNaParede, folgasMovel, letraParede, nivelFolga, paredes, pontoNaParede } from "@/lib/geometria";
import { raioGiro, temGiro, type Abertura, type Movel, type Planta, type Ponto } from "@/lib/types";

interface Props {
  planta: Planta;
  selecionado?: string | null;
  onSelecionar?: (id: string | null) => void;
  onMover?: (id: string, x: number, y: number) => void;
  onMoverAbertura?: (id: string, parede: number, posicao: number) => void;
  /** modo de edição do formato: mostra os cantos arrastáveis */
  editarCantos?: boolean;
  cantoSelecionado?: number | null;
  onSelecionarCanto?: (i: number | null) => void;
  onMoverCanto?: (i: number, p: Ponto) => void;
  onInserirCanto?: (depoisDe: number, p: Ponto) => void;
  /** mostra o espaço livre ao redor do móvel selecionado */
  mostrarFolgas?: boolean;
  /** modo régua: arrastar no desenho mede a distância entre dois pontos */
  regua?: boolean;
  /** peças destacadas junto com a selecionada (ex.: o resto do conjunto) */
  destacados?: string[];
}

const COR_FOLGA = { apertado: "#b04a3f", justo: "#b5832f", bom: "#4f7a5a" };

function Cota({ de, ate, texto, cor, escala }: { de: Ponto; ate: Ponto; texto: string; cor: string; escala: number }) {
  const dx = ate.x - de.x, dy = ate.y - de.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 0.06, ny = (dx / len) * 0.06; // perninhas nas pontas
  const meio = { x: (de.x + ate.x) / 2, y: (de.y + ate.y) / 2 };
  const fonte = 0.15 * escala;
  const larguraTexto = texto.length * fonte * 0.55 + 0.08;
  return (
    <g pointerEvents="none">
      <line x1={de.x} y1={de.y} x2={ate.x} y2={ate.y} stroke={cor} strokeWidth={0.02} />
      <line x1={de.x - nx} y1={de.y - ny} x2={de.x + nx} y2={de.y + ny} stroke={cor} strokeWidth={0.02} />
      <line x1={ate.x - nx} y1={ate.y - ny} x2={ate.x + nx} y2={ate.y + ny} stroke={cor} strokeWidth={0.02} />
      <rect x={meio.x - larguraTexto / 2} y={meio.y - fonte * 0.7} width={larguraTexto} height={fonte * 1.4} rx={0.04} fill="#fff" stroke={cor} strokeWidth={0.012} />
      <text x={meio.x} y={meio.y} textAnchor="middle" dominantBaseline="central" fontSize={fonte} fontWeight="bold" fill={cor}>{texto}</text>
    </g>
  );
}

const MARGEM_MIN = 1.0; // metros ao redor do cômodo (para as medidas das paredes)
const PASSO = 0.05; // encaixe de 5 cm
const PAREDE = 0.12; // espessura desenhada da parede
const encaixe = (v: number) => +(Math.round(v / PASSO) * PASSO).toFixed(2);
const m2 = (v: number) => v.toFixed(2).replace(".", ",");

export function SimboloAbertura({ a, sel }: { a: Abertura; sel: boolean }) {
  const { posicao: x, largura: w } = a;
  const traco = sel ? "#a0673f" : "#2b2622";
  const fino = 0.015;
  const vao = <rect x={x} y={-PAREDE / 2 - 0.01} width={w} height={PAREDE + 0.02} fill="#fff" />;
  const batentes = (
    <g stroke={traco} strokeWidth={fino}>
      <line x1={x} y1={-PAREDE / 2} x2={x} y2={PAREDE / 2} />
      <line x1={x + w} y1={-PAREDE / 2} x2={x + w} y2={PAREDE / 2} />
    </g>
  );

  if (a.tipo === "janela") {
    return (
      <>
        {vao}
        {batentes}
        <g stroke={traco} strokeWidth={fino}>
          <line x1={x} y1={-PAREDE / 2} x2={x + w} y2={-PAREDE / 2} />
          <line x1={x} y1={0} x2={x + w} y2={0} />
          <line x1={x} y1={PAREDE / 2} x2={x + w} y2={PAREDE / 2} />
        </g>
      </>
    );
  }

  if (a.tipo === "porta_correr" || a.tipo === "porta_balcao") {
    const folha = w * 0.55;
    return (
      <>
        {vao}
        <g stroke={traco} strokeWidth={fino} fill={a.tipo === "porta_balcao" ? "#dbe9f0" : "#e9dccd"}>
          <rect x={x} y={-0.035} width={folha} height={0.035} />
          <rect x={x + w - folha} y={0} width={folha} height={0.035} />
        </g>
        {batentes}
      </>
    );
  }

  if (a.tipo === "vao") {
    return (
      <>
        {vao}
        {batentes}
        <line x1={x} y1={0} x2={x + w} y2={0} stroke={traco} strokeWidth={fino * 0.6} strokeDasharray="0.04 0.04" />
      </>
    );
  }

  const dir = a.abreParaFora ? -1 : 1;
  const tracejado = { fill: "none", stroke: traco, strokeWidth: fino * 0.8, strokeDasharray: "0.05 0.035" };

  if (a.tipo === "porta_dupla") {
    const r = w / 2;
    return (
      <>
        {vao}
        <path d={`M ${x} ${r * dir} A ${r} ${r} 0 0 ${a.abreParaFora ? 1 : 0} ${x + r} 0`} {...tracejado} />
        <path d={`M ${x + w} ${r * dir} A ${r} ${r} 0 0 ${a.abreParaFora ? 0 : 1} ${x + w - r} 0`} {...tracejado} />
        <g stroke={traco} strokeWidth={0.035}>
          <line x1={x} y1={0} x2={x} y2={r * dir} />
          <line x1={x + w} y1={0} x2={x + w} y2={r * dir} />
        </g>
      </>
    );
  }

  // porta de abrir: folha + arco de giro
  const esquerda = a.dobradica === "esquerda";
  const hx = esquerda ? x : x + w;
  const fim = esquerda ? x + w : x;
  const sweep = esquerda === !a.abreParaFora ? 0 : 1;
  return (
    <>
      {vao}
      <path d={`M ${hx} ${w * dir} A ${w} ${w} 0 0 ${sweep} ${fim} 0`} {...tracejado} />
      <line x1={hx} y1={0} x2={hx} y2={w * dir} stroke={traco} strokeWidth={0.035} />
    </>
  );
}

export default function PlantaSvg(props: Props) {
  const { planta, selecionado, onSelecionar, onMover, onMoverAbertura, editarCantos, cantoSelecionado, onSelecionarCanto, onMoverCanto, onInserirCanto, mostrarFolgas, regua, destacados } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const arrasto = useRef<{ tipo: "movel" | "abertura" | "canto" | "regua"; id: string; dx: number; dy: number } | null>(null);
  const clipId = useId();
  const [medida, setMedida] = useState<{ a: Ponto; b: Ponto } | null>(null);

  const pts = cantos(planta);
  const listaParedes = paredes(planta);
  const box = caixa(pts);
  const aberturas = planta.aberturas ?? [];
  const largura = box.maxX - box.minX;
  const altura = box.maxY - box.minY;
  const escalaTexto = Math.max(1, Math.max(largura, altura) / 6); // textos legíveis em cômodos grandes
  // a margem cresce com o texto das medidas (senão elas ficam cortadas em plantas grandes)
  const MARGEM = Math.max(
    MARGEM_MIN * escalaTexto * 1.15,
    ...aberturas.filter((a) => temGiro(a) && a.abreParaFora).map((a) => raioGiro(a) + 0.2)
  );

  function pontoEmMetros(e: React.PointerEvent): Ponto {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }

  function capturar(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function iniciarMovel(e: React.PointerEvent, m: Movel) {
    if (!onMover || editarCantos) return;
    capturar(e);
    const p = pontoEmMetros(e);
    arrasto.current = { tipo: "movel", id: m.id, dx: p.x - m.x, dy: p.y - m.y };
    onSelecionar?.(m.id);
  }

  function iniciarAbertura(e: React.PointerEvent, a: Abertura) {
    if (!onMoverAbertura || editarCantos) return;
    capturar(e);
    arrasto.current = { tipo: "abertura", id: a.id, dx: 0, dy: 0 };
    onSelecionar?.(a.id);
  }

  function iniciarCanto(e: React.PointerEvent, i: number) {
    if (!onMoverCanto) return;
    capturar(e);
    arrasto.current = { tipo: "canto", id: String(i), dx: 0, dy: 0 };
    onSelecionarCanto?.(i);
  }

  function mover(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a) return;
    const p = pontoEmMetros(e);

    if (a.tipo === "regua") {
      setMedida((m) => (m ? { ...m, b: { x: encaixe(p.x), y: encaixe(p.y) } } : m));
      return;
    }

    if (a.tipo === "canto") {
      onMoverCanto?.(Number(a.id), { x: encaixe(p.x), y: encaixe(p.y) });
      return;
    }

    if (a.tipo === "movel") {
      const m = planta.moveis.find((x) => x.id === a.id);
      if (!m || !onMover) return;
      const x = Math.min(Math.max(encaixe(p.x - a.dx), box.minX), Math.max(box.minX, box.maxX - m.w));
      const y = Math.min(Math.max(encaixe(p.y - a.dy), box.minY), Math.max(box.minY, box.maxY - m.h));
      onMover(a.id, +x.toFixed(2), +y.toFixed(2));
      return;
    }

    // abertura: vai para a parede mais próxima do ponteiro e desliza ao longo dela
    const ab = aberturas.find((x) => x.id === a.id);
    if (!ab || !onMoverAbertura) return;
    const { parede, posicao } = encaixarNaParede(planta, p, ab.largura);
    onMoverAbertura(a.id, parede, posicao);
  }

  const poligono = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const linhasGrade = [];
  for (let x = Math.ceil(box.minX * 2) / 2; x <= box.maxX; x += 0.5) linhasGrade.push(<line key={`x${x}`} x1={x} y1={box.minY} x2={x} y2={box.maxY} />);
  for (let y = Math.ceil(box.minY * 2) / 2; y <= box.maxY; y += 0.5) linhasGrade.push(<line key={`y${y}`} x1={box.minX} y1={y} x2={box.maxX} y2={y} />);

  return (
    <svg
      ref={svgRef}
      viewBox={`${box.minX - MARGEM} ${box.minY - MARGEM} ${largura + MARGEM * 2} ${altura + MARGEM * 2}`}
      className="w-full touch-none select-none rounded-xl bg-bg"
      onPointerMove={mover}
      onPointerUp={() => (arrasto.current = null)}
      onPointerDownCapture={(e) => {
        // no modo régua, qualquer clique começa uma medição (nada é arrastado)
        if (!regua) return;
        e.stopPropagation();
        svgRef.current!.setPointerCapture(e.pointerId);
        const p = pontoEmMetros(e);
        const q = { x: encaixe(p.x), y: encaixe(p.y) };
        arrasto.current = { tipo: "regua", id: "", dx: 0, dy: 0 };
        setMedida({ a: q, b: q });
      }}
      onPointerDown={() => {
        onSelecionar?.(null);
        onSelecionarCanto?.(null);
      }}
      style={{ maxHeight: "70vh", cursor: regua ? "crosshair" : undefined }}
    >
      <defs>
        <clipPath id={clipId}>
          <polygon points={poligono} />
        </clipPath>
      </defs>

      <polygon points={poligono} fill="#fff" />
      <g stroke="#e6dfd5" strokeWidth={0.01} clipPath={`url(#${clipId})`}>{linhasGrade}</g>

      {planta.moveis.map((m) => {
        const sel = m.id === selecionado;
        const doConjunto = !sel && Boolean(destacados?.includes(m.id));
        const fonte = Math.min(0.2, Math.max(0.1, Math.min(m.w, m.h) / 4));
        return (
          <g key={m.id} onPointerDown={(e) => iniciarMovel(e, m)} style={{ cursor: onMover && !editarCantos ? "move" : "default" }} opacity={editarCantos ? 0.4 : 1}>
            <rect x={m.x} y={m.y} width={m.w} height={m.h} rx={0.04} fill={m.cor} fillOpacity={0.85} stroke={sel || doConjunto ? "#a0673f" : "#2b2622"} strokeWidth={sel ? 0.05 : doConjunto ? 0.03 : 0.015} strokeDasharray={doConjunto ? "0.06 0.04" : undefined} />
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

      {/* paredes */}
      <polygon points={poligono} fill="none" stroke="#2b2622" strokeWidth={PAREDE} strokeLinejoin="miter" pointerEvents="none" />

      {/* letra e medida de cada parede, do lado de fora */}
      {listaParedes.map((par) => {
        // paredes mais verticais: texto alinhado para fora, para não cruzar a parede
        const fora = { x: -par.n.x, y: -par.n.y };
        const vertical = Math.abs(fora.x) > Math.abs(fora.y) * 1.2;
        const meio = pontoNaParede(par, par.comprimento / 2, -(vertical ? 0.18 : 0.32) * escalaTexto);
        const ancora = vertical ? (fora.x < 0 ? "end" : "start") : "middle";
        return (
          <text key={par.i} x={meio.x} y={meio.y} textAnchor={ancora} dominantBaseline="middle" fontSize={0.17 * escalaTexto} fill="#7a6f66" pointerEvents="none">
            <tspan fontWeight="bold" fill="#a0673f">{letraParede(par.i)}</tspan> {m2(par.comprimento)} m
          </text>
        );
      })}

      {aberturas.map((a) => {
        const par = listaParedes[a.parede];
        if (!par) return null;
        const sel = a.id === selecionado;
        const alcance = temGiro(a) ? raioGiro(a) : 0.1;
        return (
          <g
            key={a.id}
            transform={`matrix(${par.u.x},${par.u.y},${par.n.x},${par.n.y},${par.a.x},${par.a.y})`}
            onPointerDown={(e) => iniciarAbertura(e, a)}
            style={{ cursor: onMoverAbertura && !editarCantos ? "grab" : "default" }}
            opacity={editarCantos ? 0.5 : 1}
          >
            <SimboloAbertura a={a} sel={sel} />
            <rect
              x={a.posicao}
              y={temGiro(a) && a.abreParaFora ? -alcance : -0.15}
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

      {/* espaço livre ao redor do móvel selecionado */}
      {mostrarFolgas && !editarCantos && (() => {
        const m = planta.moveis.find((x) => x.id === selecionado);
        if (!m) return null;
        return folgasMovel(planta, m).map((f) => (
          <Cota key={f.direcao} de={f.de} ate={f.ate} texto={`${Math.round(f.distancia * 100)} cm`} cor={COR_FOLGA[nivelFolga(f.distancia)]} escala={escalaTexto} />
        ));
      })()}

      {/* régua */}
      {regua && medida && (medida.a.x !== medida.b.x || medida.a.y !== medida.b.y) && (
        <Cota
          de={medida.a}
          ate={medida.b}
          texto={`${Math.hypot(medida.b.x - medida.a.x, medida.b.y - medida.a.y).toFixed(2).replace(".", ",")} m`}
          cor="#2563a8"
          escala={escalaTexto}
        />
      )}

      {editarCantos && (
        <g>
          {/* "+" no meio de cada parede para criar um novo canto */}
          {listaParedes.map((par) => {
            const meio = pontoNaParede(par, par.comprimento / 2);
            return (
              <g
                key={`m${par.i}`}
                style={{ cursor: "copy" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onInserirCanto?.(par.i, { x: encaixe(meio.x), y: encaixe(meio.y) });
                }}
              >
                <circle cx={meio.x} cy={meio.y} r={0.1} fill="#fff" stroke="#a0673f" strokeWidth={0.02} />
                <text x={meio.x} y={meio.y} textAnchor="middle" dominantBaseline="central" fontSize={0.16} fill="#a0673f" pointerEvents="none">+</text>
              </g>
            );
          })}
          {pts.map((p, i) => (
            <circle
              key={`c${i}`}
              cx={p.x}
              cy={p.y}
              r={0.12}
              fill={i === cantoSelecionado ? "#a0673f" : "#fff"}
              stroke="#a0673f"
              strokeWidth={0.03}
              style={{ cursor: "move" }}
              onPointerDown={(e) => iniciarCanto(e, i)}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
