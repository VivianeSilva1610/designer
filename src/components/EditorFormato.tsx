"use client";

import {
  CANTO_LABEL,
  FORMATO_LABEL,
  aplicarCantos,
  areaPlanta,
  cantos,
  gerarFormato,
  letraParede,
  paredes,
  type CantoRecorte,
} from "@/lib/geometria";
import type { FormatoComodo, Planta, Ponto, Recorte } from "@/lib/types";

interface Props {
  planta: Planta;
  onChange: (p: Planta) => void;
  editandoCantos: boolean;
  onEditandoCantos: (v: boolean) => void;
  cantoSelecionado: number | null;
  onSelecionarCanto: (i: number | null) => void;
}

const RECORTE_PADRAO: Recorte = { largura: 1.5, comprimento: 1.5, canto: "sd" };
const num = (v: string, min: number) => Math.max(min, Number(v.replace(",", ".")) || min);
const m = (v: number) => v.toFixed(2).replace(".", ",");

export default function EditorFormato({ planta, onChange, editandoCantos, onEditandoCantos, cantoSelecionado, onSelecionarCanto }: Props) {
  const formato = planta.formato ?? "retangular";
  const recorte = planta.recorte ?? RECORTE_PADRAO;
  const pts = cantos(planta);

  function gerar(f: FormatoComodo, L: number, C: number, r: Recorte) {
    onChange(aplicarCantos(planta, gerarFormato(f, L, C, r), f, r));
  }

  function mudarFormato(f: FormatoComodo) {
    if (f === "personalizado") {
      onChange(aplicarCantos(planta, pts, "personalizado"));
      onEditandoCantos(true);
    } else {
      onEditandoCantos(false);
      onSelecionarCanto(null);
      gerar(f, planta.largura, planta.comprimento, recorte);
    }
  }

  function mudarCanto(i: number, p: Ponto) {
    onChange(aplicarCantos(planta, pts.map((q, k) => (k === i ? p : q)), "personalizado"));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Formato do cômodo</label>
        <select className="input" value={formato} onChange={(e) => mudarFormato(e.target.value as FormatoComodo)}>
          {Object.entries(FORMATO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {formato !== "personalizado" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Largura total</label>
              <input className="input" type="number" step="0.05" min="1" value={planta.largura} onChange={(e) => gerar(formato, num(e.target.value, 1), planta.comprimento, recorte)} />
            </div>
            <div>
              <label className="label">Compr. total</label>
              <input className="input" type="number" step="0.05" min="1" value={planta.comprimento} onChange={(e) => gerar(formato, planta.largura, num(e.target.value, 1), recorte)} />
            </div>
          </div>

          {formato !== "retangular" && (
            <div className="space-y-2 rounded-xl bg-bg p-2">
              <div className="text-xs text-muted">
                {formato === "L" && "Recorte (a parte que falta para formar o L):"}
                {formato === "U" && "Reentrância no meio da parede:"}
                {formato === "chanfrado" && "Tamanho do corte diagonal:"}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Largura</label>
                  <input className="input" type="number" step="0.05" min="0.1" value={recorte.largura} onChange={(e) => gerar(formato, planta.largura, planta.comprimento, { ...recorte, largura: num(e.target.value, 0.1) })} />
                </div>
                <div>
                  <label className="label">Profund.</label>
                  <input className="input" type="number" step="0.05" min="0.1" value={recorte.comprimento} onChange={(e) => gerar(formato, planta.largura, planta.comprimento, { ...recorte, comprimento: num(e.target.value, 0.1) })} />
                </div>
              </div>
              <select className="input" value={recorte.canto} onChange={(e) => gerar(formato, planta.largura, planta.comprimento, { ...recorte, canto: e.target.value as CantoRecorte })}>
                {formato === "U" ? (
                  <>
                    <option value="sd">Na parede de cima</option>
                    <option value="id">Na parede de baixo</option>
                  </>
                ) : (
                  Object.entries(CANTO_LABEL).map(([k, v]) => <option key={k} value={k}>Canto {v.toLowerCase()}</option>)
                )}
              </select>
            </div>
          )}

          <button className="btn-ghost w-full text-xs" onClick={() => mudarFormato("personalizado")}>
            ✎ Ajustar os cantos à mão
          </button>
        </>
      )}

      {formato === "personalizado" && (
        <div className="space-y-2">
          <button className={`w-full ${editandoCantos ? "btn" : "btn-ghost"}`} onClick={() => { onEditandoCantos(!editandoCantos); onSelecionarCanto(null); }}>
            {editandoCantos ? "✓ Concluir edição dos cantos" : "✎ Editar cantos"}
          </button>
          {editandoCantos && (
            <p className="text-xs text-muted">
              Arraste os <b>círculos</b> para mover os cantos. Clique no <b>+</b> no meio de uma parede para criar um canto novo (para fazer recortes, pilares ou paredes inclinadas).
            </p>
          )}
          <details className="text-sm" open={editandoCantos}>
            <summary className="cursor-pointer text-xs font-medium text-muted">Coordenadas dos cantos (m)</summary>
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1">
              {pts.map((p, i) => (
                <div key={i} className={`flex items-center gap-1 rounded-lg px-1 ${i === cantoSelecionado ? "bg-accent-soft" : ""}`} onClick={() => onSelecionarCanto(i)}>
                  <span className="w-5 text-xs text-muted">{i + 1}</span>
                  <input className="input px-2 py-1 text-xs" type="number" step="0.05" value={p.x} onChange={(e) => mudarCanto(i, { ...p, x: Number(e.target.value) || 0 })} aria-label={`x do canto ${i + 1}`} />
                  <input className="input px-2 py-1 text-xs" type="number" step="0.05" value={p.y} onChange={(e) => mudarCanto(i, { ...p, y: Number(e.target.value) || 0 })} aria-label={`y do canto ${i + 1}`} />
                  <button
                    className="px-1 text-xs text-danger disabled:opacity-30"
                    disabled={pts.length <= 3}
                    title="Remover canto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(aplicarCantos(planta, pts.filter((_, k) => k !== i), "personalizado"));
                      onSelecionarCanto(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      <div className="rounded-xl bg-bg p-2 text-xs">
        <div className="mb-1 font-medium text-muted">Paredes · área {m(areaPlanta(planta))} m²</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {paredes(planta).map((par) => (
            <span key={par.i}>
              <b className="text-accent">{letraParede(par.i)}</b> {m(par.comprimento)} m
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
