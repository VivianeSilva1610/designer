import type { ItemBiblioteca } from "./biblioteca";
import { novoId, type Movel } from "./types";

/**
 * Conjuntos de móveis (ex.: mesa + cadeiras): peças com o mesmo `grupo`
 * se movem, giram, duplicam e repetem juntas. Peça sem grupo = conjunto de 1.
 */

const r2 = (v: number) => +v.toFixed(2);

export function membros(moveis: Movel[], m: Movel): Movel[] {
  return m.grupo ? moveis.filter((x) => x.grupo === m.grupo) : [m];
}

export function caixaDe(lista: Movel[]) {
  return {
    minX: Math.min(...lista.map((m) => m.x)),
    minY: Math.min(...lista.map((m) => m.y)),
    maxX: Math.max(...lista.map((m) => m.x + m.w)),
    maxY: Math.max(...lista.map((m) => m.y + m.h)),
  };
}

/** Peças de um item da biblioteca (um conjunto vira várias peças com o mesmo grupo). */
export function pecasDoItem(item: ItemBiblioteca, x0: number, y0: number): Movel[] {
  if (!item.partes?.length) return [{ id: novoId(), nome: item.nome, w: item.w, h: item.h, cor: item.cor, x: x0, y: y0 }];
  const grupo = novoId();
  return item.partes.map((p) => ({ id: novoId(), nome: p.nome, w: p.w, h: p.h, cor: p.cor, x: r2(x0 + p.dx), y: r2(y0 + p.dy), grupo }));
}

/** Arrasta a peça `id` para (x, y) levando o conjunto inteiro junto. */
export function moverConjunto(moveis: Movel[], id: string, x: number, y: number): Movel[] {
  const m = moveis.find((q) => q.id === id);
  if (!m) return moveis;
  const dx = x - m.x, dy = y - m.y;
  const ids = new Set(membros(moveis, m).map((q) => q.id));
  return moveis.map((q) => (ids.has(q.id) ? { ...q, x: r2(q.x + dx), y: r2(q.y + dy) } : q));
}

/** Gira o conjunto 90° no sentido horário, em torno do próprio centro. */
export function girarConjunto(moveis: Movel[], id: string): Movel[] {
  const m = moveis.find((q) => q.id === id);
  if (!m) return moveis;
  const grupo = membros(moveis, m);
  const c = caixaDe(grupo);
  const gx = (c.minX + c.maxX) / 2, gy = (c.minY + c.maxY) / 2;
  const ids = new Set(grupo.map((q) => q.id));
  return moveis.map((q) => {
    if (!ids.has(q.id)) return q;
    const rx = q.x + q.w / 2 - gx, ry = q.y + q.h / 2 - gy;
    const cx = gx - ry, cy = gy + rx; // (rx, ry) → (−ry, rx): horário na tela
    return { ...q, w: q.h, h: q.w, x: r2(cx - q.h / 2), y: r2(cy - q.w / 2) };
  });
}

/** Cópias do conjunto deslocadas por (dx, dy); cada cópia ganha um grupo novo. */
function copiar(grupo: Movel[], dx: number, dy: number): Movel[] {
  const novoGrupo = grupo[0]?.grupo ? novoId() : undefined;
  return grupo.map((q) => ({ ...q, id: novoId(), x: r2(q.x + dx), y: r2(q.y + dy), grupo: novoGrupo }));
}

export function duplicarConjunto(moveis: Movel[], id: string): { moveis: Movel[]; selecionar: string | null } {
  const m = moveis.find((q) => q.id === id);
  if (!m) return { moveis, selecionar: null };
  const copia = copiar(membros(moveis, m), 0.3, 0.3);
  return { moveis: [...moveis, ...copia], selecionar: copia[membros(moveis, m).indexOf(m)]?.id ?? null };
}

/**
 * Repete o conjunto em linhas × colunas, com `folga` metros entre um e outro
 * (ex.: 4 × 5 mesas com 60 cm de circulação).
 */
export function repetirEmGrade(moveis: Movel[], id: string, linhas: number, colunas: number, folga: number): Movel[] {
  const m = moveis.find((q) => q.id === id);
  if (!m || linhas < 1 || colunas < 1) return moveis;
  const grupo = membros(moveis, m);
  const c = caixaDe(grupo);
  const passoX = c.maxX - c.minX + folga, passoY = c.maxY - c.minY + folga;
  const novos: Movel[] = [];
  for (let l = 0; l < linhas; l++) {
    for (let k = 0; k < colunas; k++) {
      if (l === 0 && k === 0) continue; // o original fica onde está
      novos.push(...copiar(grupo, k * passoX, l * passoY));
    }
  }
  return [...moveis, ...novos];
}

export function removerConjunto(moveis: Movel[], id: string): Movel[] {
  const m = moveis.find((q) => q.id === id);
  if (!m) return moveis;
  const ids = new Set(membros(moveis, m).map((q) => q.id));
  return moveis.filter((q) => !ids.has(q.id));
}

export function desagrupar(moveis: Movel[], id: string): Movel[] {
  const m = moveis.find((q) => q.id === id);
  if (!m?.grupo) return moveis;
  return moveis.map((q) => (q.grupo === m.grupo ? { ...q, grupo: undefined } : q));
}
