import { medidaTV, polegadasDaTV } from "./biblioteca";
import { caixa, cantos, paredes } from "./geometria";
import type { Ambiente, Movel, Planta, PosicaoCasa, Ponto, Projeto, TipoAbertura } from "./types";

export const PE_DIREITO_PADRAO = 2.7;

/** Cômodos que já têm planta desenhada. */
export function comodosComPlanta(p: Projeto) {
  return p.ambientes.filter((a): a is Ambiente & { planta: Planta } => Boolean(a.planta));
}

/* ───────────── Coordenadas: cômodo → casa ───────────── */

export function rotacionar(pt: Ponto, graus: number): Ponto {
  const r = (graus * Math.PI) / 180;
  const c = Math.round(Math.cos(r) * 1e9) / 1e9, s = Math.round(Math.sin(r) * 1e9) / 1e9;
  return { x: pt.x * c - pt.y * s, y: pt.x * s + pt.y * c };
}

export function paraCasa(pt: Ponto, pos: PosicaoCasa): Ponto {
  const r = rotacionar(pt, pos.rotacao);
  return { x: r.x + pos.x, y: r.y + pos.y };
}

/** Posições de todos os cômodos com planta; quem ainda não tem posição vai para uma fila lado a lado. */
export function posicoes(p: Projeto): Record<string, PosicaoCasa> {
  const res: Record<string, PosicaoCasa> = {};
  const lista = comodosComPlanta(p);
  // começa à direita do que já foi posicionado
  let cursor = 0;
  for (const a of lista) {
    if (!a.posicaoCasa) continue;
    res[a.id] = a.posicaoCasa;
    const c = caixa(cantos(a.planta).map((q) => paraCasa(q, a.posicaoCasa!)));
    cursor = Math.max(cursor, c.maxX + 1);
  }
  for (const a of lista) {
    if (res[a.id]) continue;
    const c = caixa(cantos(a.planta));
    res[a.id] = { x: cursor - c.minX, y: -c.minY, rotacao: 0 };
    cursor += c.maxX - c.minX + 1;
  }
  return res;
}

export function cantosNaCasa(planta: Planta, pos: PosicaoCasa) {
  return cantos(planta).map((q) => paraCasa(q, pos));
}

/**
 * Ímã: desloca o cômodo para alinhar seus cantos aos cantos dos outros cômodos
 * (em x e em y separadamente), quando estiverem a menos de `tolerancia`.
 */
export function imantar(movendo: Ponto[], outros: Ponto[][], tolerancia = 0.3) {
  let melhorX = { d: tolerancia, dx: 0 }, melhorY = { d: tolerancia, dy: 0 };
  for (const m of movendo) {
    for (const poli of outros) {
      for (const o of poli) {
        const dx = o.x - m.x, dy = o.y - m.y;
        if (Math.abs(dx) < melhorX.d) melhorX = { d: Math.abs(dx), dx };
        if (Math.abs(dy) < melhorY.d) melhorY = { d: Math.abs(dy), dy };
      }
    }
  }
  return { dx: melhorX.dx, dy: melhorY.dy };
}

/* ───────────── Paredes da casa (para o 3D) ───────────── */

export interface VaoParede {
  s1: number; // início ao longo da parede (m)
  s2: number;
  tipo: TipoAbertura;
  altura: number;
  peitoril: number;
  arco?: boolean;
}

export interface ParedeCasa {
  ambienteId: string;
  a: Ponto;
  b: Ponto;
  u: Ponto;
  n: Ponto; // para dentro do cômodo
  comprimento: number;
  vaos: VaoParede[];
  cor?: string; // cor da face de dentro
}

export function paredesDaCasa(p: Projeto, pos: Record<string, PosicaoCasa>): ParedeCasa[] {
  const todas: ParedeCasa[] = [];
  for (const amb of comodosComPlanta(p)) {
    const ps = pos[amb.id];
    if (!ps) continue;
    for (const par of paredes(amb.planta)) {
      const a = paraCasa(par.a, ps), b = paraCasa(par.b, ps);
      const u = rotacionar(par.u, ps.rotacao), n = rotacionar(par.n, ps.rotacao);
      const vaos = (amb.planta.aberturas ?? [])
        .filter((ab) => ab.parede === par.i)
        .map((ab) => ({ s1: ab.posicao, s2: ab.posicao + ab.largura, tipo: ab.tipo, altura: ab.altura, peitoril: ab.peitoril, arco: ab.arco }));
      const cor = amb.planta.coresParedes?.[par.i] ?? amb.planta.corParede;
      todas.push({ ambienteId: amb.id, a, b, u, n, comprimento: par.comprimento, vaos, cor });
    }
  }

  // uma porta desenhada em um cômodo também abre a parede do cômodo vizinho
  const resultado = todas.map((w) => ({ ...w, vaos: [...w.vaos] }));
  todas.forEach((w, i) => {
    todas.forEach((outra, j) => {
      if (i === j || outra.vaos.length === 0) return;
      const paralelas = Math.abs(w.u.x * outra.u.y - w.u.y * outra.u.x) < 0.01;
      if (!paralelas) return;
      const dist = Math.abs((outra.a.x - w.a.x) * w.n.x + (outra.a.y - w.a.y) * w.n.y);
      if (dist > 0.3) return; // paredes coladas (ou quase)
      for (const v of outra.vaos) {
        const p1 = { x: outra.a.x + outra.u.x * v.s1, y: outra.a.y + outra.u.y * v.s1 };
        const p2 = { x: outra.a.x + outra.u.x * v.s2, y: outra.a.y + outra.u.y * v.s2 };
        const proj = (q: Ponto) => (q.x - w.a.x) * w.u.x + (q.y - w.a.y) * w.u.y;
        const s1 = Math.max(0, Math.min(proj(p1), proj(p2)));
        const s2 = Math.min(w.comprimento, Math.max(proj(p1), proj(p2)));
        if (s2 - s1 < 0.05) continue;
        const jaTem = resultado[i].vaos.some((x) => x.s1 < s2 - 0.02 && s1 < x.s2 - 0.02);
        if (!jaTem) resultado[i].vaos.push({ ...v, s1, s2 });
      }
    });
  });
  return resultado;
}

/* ───────────── Móveis na casa ───────────── */

export interface MovelCasa {
  movel: Movel;
  centro: Ponto;
  rotacao: number; // graus
}

export function moveisDaCasa(p: Projeto, pos: Record<string, PosicaoCasa>): MovelCasa[] {
  return comodosComPlanta(p).flatMap((amb) => {
    const ps = pos[amb.id];
    if (!ps) return [];
    return amb.planta.moveis.map((m) => ({
      movel: m,
      centro: paraCasa({ x: m.x + m.w / 2, y: m.y + m.h / 2 }, ps),
      rotacao: ps.rotacao,
    }));
  });
}

/** Altura típica (m) de cada peça, pelo nome. */
export function alturaMovel(nome: string, peDireito = PE_DIREITO_PADRAO): { altura: number; vidro?: boolean; base?: number } {
  const n = nome.toLowerCase();
  // TV: tela presa à parede, com o centro a ~1,05 m do piso (altura boa para quem está sentado)
  const pol = polegadasDaTV(nome);
  if (pol) {
    const { altura } = medidaTV(pol);
    return { altura, base: +(1.05 - altura / 2).toFixed(2) };
  }
  // coifa: fica no alto, sobre o fogão
  if (/coifa/.test(n)) return { altura: 0.5, base: 1.9 };
  // colunas e pilares vão do piso ao teto
  if (/coluna|pilar/.test(n)) return { altura: peDireito };
  const regras: [RegExp, number, boolean?][] = [
    [/tapete|área de giro|gramado/, 0.01],
    [/caminho de pedra/, 0.02],
    [/árvore/, 4.5],
    [/arbusto/, 0.9],
    [/espelho d.água/, 0.35],
    [/canteiro/, 0.4],
    [/fonte/, 1.3],
    [/banco de jardim/, 0.45],
    [/box/, 2.0, true],
    [/câmara fria/, 2.4],
    [/guarda-roupa|armário|torre quente|cristaleira/, 2.1],
    [/geladeira industrial/, 2.0],
    [/adega|expositor/, 1.8],
    [/geladeira/, 1.8],
    [/balcão de bar/, 1.1],
    [/caixa|checkout|hostess|púlpito|recepção/, 1.1],
    [/mesa alta|bistrô/, 1.05],
    [/banco booth/, 1.05],
    [/floreira|divisória/, 1.1],
    [/mictório/, 0.6],
    [/forno combinado/, 1.0],
    [/freezer|chopeira|cervejeira|fritadeira|chapa|estação de garçom|mesa de preparo/, 0.9],
    [/estante/, 1.8],
    [/rede/, 0.5],
    [/espreguiçadeira/, 0.4],
    [/cama|berço/, 0.55],
    [/banheira/, 0.55],
    [/vaso sanitário|bidê/, 0.42],
    [/criado|mesa lateral/, 0.55],
    [/rack/, 0.5],
    [/mesa de centro/, 0.4],
    [/sofá|poltrona|chaise/, 0.85],
    [/cadeira/, 0.9],
    [/banqueta/, 0.75],
    [/pia|bancada|ilha|cooktop|fogão|lava-louças|tanque|máquina|secadora|churrasqueira/, 0.9],
    [/buffet|aparador|cômoda/, 0.85],
    [/mesa|escrivaninha|penteadeira/, 0.75],
    [/gaveteiro|arquivo/, 0.7],
    [/piano/, 1.0],
    [/planta|vaso/, 1.2],
  ];
  for (const [re, altura, vidro] of regras) if (re.test(n)) return { altura, vidro };
  return { altura: 0.8 };
}
