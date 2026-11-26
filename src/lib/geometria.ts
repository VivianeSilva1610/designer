import {
  TIPO_ABERTURA_LABEL,
  raioGiro,
  temGiro,
  type Abertura,
  type FormatoComodo,
  type Movel,
  type Planta,
  type Ponto,
  type Recorte,
} from "./types";

/* ───────────── Cantos e paredes ───────────── */

export const FORMATO_LABEL: Record<FormatoComodo, string> = {
  retangular: "Retangular",
  L: "Em L",
  U: "Em U",
  chanfrado: "Canto chanfrado (diagonal)",
  personalizado: "Personalizado (arrastar cantos)",
};

export type CantoRecorte = Recorte["canto"];
export const CANTO_LABEL: Record<CantoRecorte, string> = {
  sd: "Superior direito",
  se: "Superior esquerdo",
  id: "Inferior direito",
  ie: "Inferior esquerdo",
};

export function letraParede(i: number) {
  return i < 26 ? String.fromCharCode(65 + i) : `P${i + 1}`;
}

export function retangulo(L: number, C: number): Ponto[] {
  return [{ x: 0, y: 0 }, { x: L, y: 0 }, { x: L, y: C }, { x: 0, y: C }];
}

export function cantos(p: Planta): Ponto[] {
  return p.pontos && p.pontos.length >= 3 ? p.pontos : retangulo(p.largura, p.comprimento);
}

export interface InfoParede {
  i: number;
  a: Ponto; // início
  b: Ponto; // fim
  comprimento: number;
  u: Ponto; // direção ao longo da parede
  n: Ponto; // normal apontando para dentro do cômodo
}

/** Paredes na ordem dos cantos. Com os cantos em sentido horário (tela), o interior fica à direita. */
export function paredes(p: Planta): InfoParede[] {
  const pts = cantos(p);
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const comprimento = Math.hypot(dx, dy) || 1e-9;
    const u = { x: dx / comprimento, y: dy / comprimento };
    return { i, a, b, comprimento, u, n: { x: -u.y, y: u.x } };
  });
}

export function comprimentoParede(p: Planta, i: number) {
  return paredes(p)[i]?.comprimento ?? 0;
}

function areaComSinal(pts: Ponto[]) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function areaPlanta(p: Planta) {
  return Math.abs(areaComSinal(cantos(p)));
}

/** Garante sentido horário na tela (y para baixo), que é o que `paredes` espera. */
export function sentidoHorario(pts: Ponto[]) {
  return areaComSinal(pts) < 0 ? [...pts].reverse() : pts;
}

export function caixa(pts: Ponto[]) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function pontoNoPoligono(pt: Ponto, pts: Ponto[]) {
  let dentro = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

/* ───────────── Formatos prontos ───────────── */

export function gerarFormato(formato: FormatoComodo, L: number, C: number, r: Recorte): Ponto[] {
  const a = Math.min(r.largura, L - 0.3);
  const b = Math.min(r.comprimento, C - 0.3);
  let pts: Ponto[];
  switch (formato) {
    case "L": // recorte retangular num canto (desenhado no superior direito)
      pts = [{ x: 0, y: 0 }, { x: L - a, y: 0 }, { x: L - a, y: b }, { x: L, y: b }, { x: L, y: C }, { x: 0, y: C }];
      break;
    case "chanfrado": // canto cortado em diagonal
      pts = [{ x: 0, y: 0 }, { x: L - a, y: 0 }, { x: L, y: b }, { x: L, y: C }, { x: 0, y: C }];
      break;
    case "U": { // reentrância no meio de um lado (desenhada em cima)
      const x0 = (L - a) / 2;
      pts = [{ x: 0, y: 0 }, { x: x0, y: 0 }, { x: x0, y: b }, { x: x0 + a, y: b }, { x: x0 + a, y: 0 }, { x: L, y: 0 }, { x: L, y: C }, { x: 0, y: C }];
      break;
    }
    default:
      return retangulo(L, C);
  }
  // espelha para o canto/lado escolhido (no U, só importa se é superior ou inferior)
  const espelhaX = formato !== "U" && (r.canto === "se" || r.canto === "ie");
  const espelhaY = r.canto === "id" || r.canto === "ie";
  pts = pts.map((p) => ({ x: espelhaX ? L - p.x : p.x, y: espelhaY ? C - p.y : p.y }));
  return sentidoHorario(pts);
}

/** Aplica novos cantos à planta: recalcula medidas totais e reposiciona as aberturas. */
export function aplicarCantos(planta: Planta, pontos: Ponto[], formato: FormatoComodo, recorte?: Recorte): Planta {
  const arred = pontos.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2) }));
  const c = caixa(arred);
  const nova: Planta = {
    ...planta,
    formato,
    pontos: arred,
    largura: +(c.maxX - c.minX).toFixed(2),
    comprimento: +(c.maxY - c.minY).toFixed(2),
    ...(recorte ? { recorte } : {}),
  };
  return { ...nova, aberturas: reposicionarAberturas(planta, nova) };
}

/* ───────────── Aberturas nas paredes ───────────── */

export function pontoNaParede(par: InfoParede, s: number, t = 0): Ponto {
  return { x: par.a.x + s * par.u.x + t * par.n.x, y: par.a.y + s * par.u.y + t * par.n.y };
}

/** Distância de um ponto à parede e posição projetada ao longo dela. */
export function projetarNaParede(pt: Ponto, par: InfoParede) {
  const s = Math.min(Math.max((pt.x - par.a.x) * par.u.x + (pt.y - par.a.y) * par.u.y, 0), par.comprimento);
  const q = pontoNaParede(par, s);
  return { s, dist: Math.hypot(pt.x - q.x, pt.y - q.y) };
}

/** Parede mais próxima de um ponto e posição para uma abertura de largura `w` centrada nele. */
export function encaixarNaParede(p: Planta, pt: Ponto, w: number, passo = 0.05) {
  let melhor = { parede: 0, s: 0, dist: Infinity, comprimento: 0 };
  for (const par of paredes(p)) {
    const { s, dist } = projetarNaParede(pt, par);
    if (dist < melhor.dist) melhor = { parede: par.i, s, dist, comprimento: par.comprimento };
  }
  const max = Math.max(0, melhor.comprimento - w);
  const posicao = Math.min(Math.max(Math.round((melhor.s - w / 2) / passo) * passo, 0), max);
  return { parede: melhor.parede, posicao: +posicao.toFixed(2) };
}

/** Mantém as aberturas nas paredes certas depois que o formato muda. */
export function reposicionarAberturas(antiga: Planta, nova: Planta): Abertura[] {
  const pa = paredes(antiga), pn = paredes(nova);
  return (antiga.aberturas ?? []).map((ab) => {
    if (pa.length === pn.length) {
      const max = Math.max(0, (pn[ab.parede]?.comprimento ?? 0) - ab.largura);
      return { ...ab, posicao: +Math.min(Math.max(ab.posicao, 0), max).toFixed(2) };
    }
    const parAntiga = pa[ab.parede] ?? pa[0];
    const centro = pontoNaParede(parAntiga, ab.posicao + ab.largura / 2);
    return { ...ab, ...encaixarNaParede(nova, centro, ab.largura, 0.01) };
  });
}

/** Polígono varrido pela folha de uma porta que gira. */
export function giroPorta(p: Planta, ab: Abertura): Ponto[] | null {
  if (!temGiro(ab)) return null;
  const par = paredes(p)[ab.parede];
  if (!par) return null;
  const r = raioGiro(ab) * (ab.abreParaFora ? -1 : 1);
  return [
    pontoNaParede(par, ab.posicao),
    pontoNaParede(par, ab.posicao + ab.largura),
    pontoNaParede(par, ab.posicao + ab.largura, r),
    pontoNaParede(par, ab.posicao, r),
  ];
}

function cantosMovel(m: Movel): Ponto[] {
  return [{ x: m.x, y: m.y }, { x: m.x + m.w, y: m.y }, { x: m.x + m.w, y: m.y + m.h }, { x: m.x, y: m.y + m.h }];
}

/** Teste de sobreposição de dois polígonos convexos (eixos separadores). */
function sobrepoem(A: Ponto[], B: Ponto[]) {
  for (const poli of [A, B]) {
    for (let i = 0; i < poli.length; i++) {
      const a = poli[i], b = poli[(i + 1) % poli.length];
      const nx = -(b.y - a.y), ny = b.x - a.x;
      const proj = (P: Ponto[]) => P.map((q) => q.x * nx + q.y * ny);
      const pA = proj(A), pB = proj(B);
      const folga = 0.01 * Math.hypot(nx, ny);
      if (Math.max(...pA) <= Math.min(...pB) + folga || Math.max(...pB) <= Math.min(...pA) + folga) return false;
    }
  }
  return true;
}

/* ───────────── Espaços livres ───────────── */

export type Direcao = "esquerda" | "direita" | "acima" | "abaixo";

export interface Folga {
  direcao: Direcao;
  de: Ponto;
  ate: Ponto;
  distancia: number; // metros
  ate_o_que: string; // "parede B" ou nome do móvel
}

export const DIRECAO_LABEL: Record<Direcao, string> = { esquerda: "Esquerda", direita: "Direita", acima: "Acima", abaixo: "Abaixo" };

/** Classifica a folga para circulação (referências usuais de projeto). */
export function nivelFolga(d: number): "apertado" | "justo" | "bom" {
  const cm = Math.round(d * 100); // evita 0,7999 contar como "menos de 80 cm"
  if (cm < 60) return "apertado";
  if (cm < 80) return "justo";
  return "bom";
}

/** Peças que não ocupam o piso: tapete, marcação de giro PCD e coifa (fica no alto). */
export const naoOcupaPiso = (nome: string) => /tapete|área de giro|coifa|gramado|caminho de pedra/i.test(nome);
const ehTapete = (m: Movel) => naoOcupaPiso(m.nome);

/** Distância de um ponto, numa direção, até a primeira parede. */
function raioAteParede(p: Planta, origem: Ponto, d: Ponto) {
  let melhor = { t: Infinity, parede: -1 };
  for (const par of paredes(p)) {
    const ex = par.b.x - par.a.x, ey = par.b.y - par.a.y;
    const den = d.x * ey - d.y * ex;
    if (Math.abs(den) < 1e-9) continue; // paralelo
    const ax = par.a.x - origem.x, ay = par.a.y - origem.y;
    const t = (ax * ey - ay * ex) / den;
    const s = (ax * d.y - ay * d.x) / den;
    if (t > -1e-6 && s >= -1e-6 && s <= 1 + 1e-6 && t < melhor.t) melhor = { t: Math.max(0, t), parede: par.i };
  }
  return melhor;
}

/**
 * Espaço livre ao redor de um móvel nas 4 direções: até a parede ou até o
 * móvel mais próximo (tapetes não contam como obstáculo).
 */
export function folgasMovel(p: Planta, m: Movel): Folga[] {
  if (ehTapete(m)) return [];
  const outros = p.moveis.filter((o) => o.id !== m.id && !ehTapete(o));
  const AMOSTRAS = 7;
  const config: { direcao: Direcao; d: Ponto; vertical: boolean }[] = [
    { direcao: "esquerda", d: { x: -1, y: 0 }, vertical: false },
    { direcao: "direita", d: { x: 1, y: 0 }, vertical: false },
    { direcao: "acima", d: { x: 0, y: -1 }, vertical: true },
    { direcao: "abaixo", d: { x: 0, y: 1 }, vertical: true },
  ];
  const folgas: Folga[] = [];

  for (const { direcao, d, vertical } of config) {
    // borda do móvel de onde sai a medida e o intervalo que ela cobre
    const borda = vertical ? (d.y < 0 ? m.y : m.y + m.h) : d.x < 0 ? m.x : m.x + m.w;
    const ini = vertical ? m.x : m.y;
    const fim = vertical ? m.x + m.w : m.y + m.h;
    const ponto = (ao_longo: number): Ponto => (vertical ? { x: ao_longo, y: borda } : { x: borda, y: ao_longo });

    let melhor: { dist: number; em: number; oque: string } | null = null;

    // paredes: vários raios ao longo da borda, fica o menor
    for (let k = 0; k < AMOSTRAS; k++) {
      const em = ini + 0.02 + ((fim - ini - 0.04) * k) / (AMOSTRAS - 1);
      const r = raioAteParede(p, ponto(em), d);
      if (r.parede >= 0 && (!melhor || r.t < melhor.dist)) melhor = { dist: r.t, em, oque: `parede ${letraParede(r.parede)}` };
    }

    // móveis que estão nessa direção e se sobrepõem no intervalo
    for (const o of outros) {
      const oIni = vertical ? o.x : o.y;
      const oFim = vertical ? o.x + o.w : o.y + o.h;
      const sobreA = Math.max(ini, oIni), sobreB = Math.min(fim, oFim);
      if (sobreB - sobreA < 0.01) continue;
      const oBorda = vertical ? (d.y < 0 ? o.y + o.h : o.y) : d.x < 0 ? o.x + o.w : o.x;
      const dist = (oBorda - borda) * (vertical ? d.y : d.x);
      if (dist < -0.01) continue; // está do outro lado
      if (!melhor || dist < melhor.dist) melhor = { dist: Math.max(0, dist), em: (sobreA + sobreB) / 2, oque: `“${o.nome}”` };
    }

    if (!melhor || melhor.dist < 0.02 || !isFinite(melhor.dist)) continue; // encostado ou fora do cômodo
    const de = ponto(melhor.em);
    folgas.push({
      direcao,
      de,
      ate: { x: de.x + d.x * melhor.dist, y: de.y + d.y * melhor.dist },
      distancia: melhor.dist,
      ate_o_que: melhor.oque,
    });
  }
  return folgas;
}

/** Área de piso sem móveis (aproximada: não desconta sobreposições entre móveis). */
export function areaLivre(p: Planta) {
  const ocupada = p.moveis.filter((m) => !ehTapete(m)).reduce((s, m) => s + m.w * m.h, 0);
  return Math.max(0, areaPlanta(p) - ocupada);
}

/* ───────────── Avisos e descrições ───────────── */

export function conflitosPlanta(p: Planta): string[] {
  const avisos: string[] = [];
  const pts = cantos(p);
  const aberturas = p.aberturas ?? [];

  for (const ab of aberturas) {
    const giro = !ab.abreParaFora ? giroPorta(p, ab) : null;
    if (!giro) continue;
    for (const m of p.moveis) {
      if (ehTapete(m)) continue;
      if (sobrepoem(giro, cantosMovel(m))) avisos.push(`A porta da parede ${letraParede(ab.parede)} bate em “${m.nome}”.`);
    }
  }

  for (let i = 0; i < aberturas.length; i++) {
    const a = aberturas[i];
    if (a.posicao + a.largura > comprimentoParede(p, a.parede) + 0.01) {
      avisos.push(`${TIPO_ABERTURA_LABEL[a.tipo]} de ${a.largura.toFixed(2)} m não cabe na parede ${letraParede(a.parede)}.`);
    }
    for (let j = i + 1; j < aberturas.length; j++) {
      const b = aberturas[j];
      if (a.parede === b.parede && a.posicao < b.posicao + b.largura && b.posicao < a.posicao + a.largura) {
        avisos.push(`Há duas aberturas sobrepostas na parede ${letraParede(a.parede)}.`);
      }
    }
  }

  for (const m of p.moveis) {
    // encolhe 1 cm para não acusar móvel encostado na parede
    const c = cantosMovel({ ...m, x: m.x + 0.01, y: m.y + 0.01, w: m.w - 0.02, h: m.h - 0.02 });
    if (c.some((q) => !pontoNoPoligono(q, pts))) avisos.push(`“${m.nome}” está passando para fora das paredes.`);
  }
  return avisos;
}

export function descreverAbertura(p: Planta, a: Abertura) {
  const base = `${TIPO_ABERTURA_LABEL[a.tipo]}${a.arco ? " em arco" : ""} ${a.largura.toFixed(2)} m na parede ${letraParede(a.parede)} (a ${a.posicao.toFixed(2)} m do início da parede, altura ${a.altura.toFixed(2)} m`;
  const extra = a.tipo === "janela" ? `, peitoril ${a.peitoril.toFixed(2)} m` : temGiro(a) ? `, abre para ${a.abreParaFora ? "fora" : "dentro"}` : "";
  return `${base}${extra})`;
}

export function descreverFormato(p: Planta) {
  const ps = paredes(p).map((par) => `${letraParede(par.i)} ${par.comprimento.toFixed(2)} m`).join(", ");
  return `${FORMATO_LABEL[p.formato ?? "retangular"]}, ${p.largura.toFixed(2)} x ${p.comprimento.toFixed(2)} m no total, área ${areaPlanta(p).toFixed(2)} m². Paredes: ${ps}`;
}

/* ───────────── Conversão de plantas antigas ───────────── */

type AberturaAntiga = Omit<Abertura, "parede"> & { parede: number | "norte" | "leste" | "sul" | "oeste" };

/** Plantas da versão anterior usavam paredes "norte/leste/sul/oeste". */
export function migrarPlanta(pl: Planta): Planta {
  const aberturas = (pl.aberturas ?? []) as AberturaAntiga[];
  if (!aberturas.some((a) => typeof a.parede === "string")) return pl;
  const { largura: L, comprimento: C } = pl;
  const inverter = (d: Abertura["dobradica"]) => (d === "esquerda" ? "direita" : "esquerda");
  return {
    ...pl,
    aberturas: aberturas.map((a): Abertura => {
      switch (a.parede) {
        case "norte": return { ...a, parede: 0 };
        case "leste": return { ...a, parede: 1 };
        // a parede inferior e a esquerda agora são percorridas no sentido contrário
        case "sul": return { ...a, parede: 2, posicao: +(L - a.posicao - a.largura).toFixed(2), dobradica: inverter(a.dobradica) };
        case "oeste": return { ...a, parede: 3, posicao: +(C - a.posicao - a.largura).toFixed(2), dobradica: inverter(a.dobradica) };
        default: return { ...a, parede: a.parede };
      }
    }),
  };
}
