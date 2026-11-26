"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PE_DIREITO_PADRAO, alturaMovel, cantosNaCasa, comodosComPlanta, moveisDaCasa, paredesDaCasa } from "@/lib/casa";
import { ehCeuAberto, raioArco } from "@/lib/arquitetura";
import { caixa, pontoNoPoligono } from "@/lib/geometria";
import type { PosicaoCasa, Ponto, Projeto } from "@/lib/types";

interface Props {
  projeto: Projeto;
  posicoes: Record<string, PosicaoCasa>;
  comodoInicial?: string | null;
  modoInicial?: "maquete" | "caminhar";
}

type Modo = "maquete" | "caminhar";

const ESPESSURA = 0.07; // cada cômodo levanta meia parede para dentro; vizinhos somam ~14 cm
const OLHOS = 1.6;
const RAIO_CORPO = 0.25;
const AREAS_MOLHADAS = /cozinha|banheiro|lavabo|lavanderia|varanda|gourmet|área|externa|bar|estoque|despensa|câmara|vestiário|deck/i;

/** Um ponto bem dentro do polígono (o centro de um L pode cair fora dele). */
function pontoInterior(pts: Ponto[]): Ponto {
  const c = pts.reduce((s, q) => ({ x: s.x + q.x / pts.length, y: s.y + q.y / pts.length }), { x: 0, y: 0 });
  if (pontoNoPoligono(c, pts)) return c;
  const b = caixa(pts);
  const candidatos: Ponto[] = [];
  for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) candidatos.push({ x: b.minX + ((b.maxX - b.minX) * i) / 12, y: b.minY + ((b.maxY - b.minY) * j) / 12 });
  return candidatos.filter((q) => pontoNoPoligono(q, pts)).sort((a, z) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(z.x - c.x, z.y - c.y))[0] ?? c;
}

function distSegmento(p: Ponto, a: Ponto, b: Ponto) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function etiqueta(texto: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 44px sans-serif";
  const w = Math.ceil(ctx.measureText(texto).width) + 40;
  canvas.width = w;
  canvas.height = 72;
  ctx.font = "bold 44px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect(0, 0, w, 72, 20);
  ctx.fill();
  ctx.fillStyle = "#2b2622";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, 20, 38);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set((w / 72) * 0.45, 0.45, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export default function Casa3D({ projeto, posicoes, comodoInicial, modoInicial = "maquete" }: Props) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ modo: (m: Modo) => void; irPara: (id: string) => void; paredesInteiras: (v: boolean) => void } | null>(null);
  const [inteiras, setInteiras] = useState(false);
  const inteirasRef = useRef(false);
  const teclas = useRef<Record<string, boolean>>({});
  const [modo, setModo] = useState<Modo>(modoInicial);
  const modoRef = useRef<Modo>(modoInicial);
  // mantém as refs em dia para a cena 3D (declarado antes do efeito que monta a cena)
  useEffect(() => {
    modoRef.current = modo;
    inteirasRef.current = inteiras;
  });
  const [destino, setDestino] = useState<string>(comodoInicial ?? "");
  const comodos = comodosComPlanta(projeto);

  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const H = projeto.peDireito ?? PE_DIREITO_PADRAO;

    /* ── cena ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const cena = new THREE.Scene();
    cena.background = new THREE.Color("#f6f3ee");
    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 300);
    camera.rotation.order = "YXZ";

    const todos = comodos.flatMap((a) => cantosNaCasa(a.planta, posicoes[a.id]));
    const b = todos.length ? caixa(todos) : { minX: 0, minY: 0, maxX: 5, maxY: 5 };
    const centro = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minY + b.maxY) / 2);
    const tamanho = Math.max(b.maxX - b.minX, b.maxY - b.minY, 4);

    cena.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 1.2));
    const sol = new THREE.DirectionalLight(0xfff4e5, 1.8);
    sol.position.set(centro.x + tamanho * 0.6, tamanho * 1.4, centro.z + tamanho * 0.8);
    sol.target.position.copy(centro);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -tamanho, right: tamanho, top: tamanho, bottom: -tamanho, near: 0.5, far: tamanho * 4 });
    sol.shadow.bias = -0.0005;
    cena.add(sol, sol.target);

    // chão externo
    const terreno = new THREE.Mesh(new THREE.PlaneGeometry(tamanho * 6, tamanho * 6), new THREE.MeshStandardMaterial({ color: "#dcd6cb" }));
    terreno.rotation.x = -Math.PI / 2;
    terreno.position.set(centro.x, -0.01, centro.z);
    terreno.receiveShadow = true;
    cena.add(terreno);

    /* ── pisos, tetos e nomes ── */
    const tetos = new THREE.Group();
    const nomes = new THREE.Group();
    const luzesInternas = new THREE.Group();
    cena.add(new THREE.AmbientLight(0xffffff, 0.35));
    const pontosEntrada: Record<string, Ponto> = {};
    const pontosCentro: Record<string, Ponto> = {};
    // retângulos (na casa) dos móveis em que não dá para "ficar em pé"
    const ocupados = moveisDaCasa(projeto, posicoes)
      .filter(({ movel }) => {
        const { altura, base = 0 } = alturaMovel(movel.nome, H);
        return altura > 0.05 && base < 0.3; // TV na parede não ocupa o piso
      })
      .map(({ movel, centro: c, rotacao }) => {
        const deitado = rotacao % 180 !== 0;
        const hw = (deitado ? movel.h : movel.w) / 2 + 0.2, hh = (deitado ? movel.w : movel.h) / 2 + 0.2;
        return { x1: c.x - hw, x2: c.x + hw, y1: c.y - hh, y2: c.y + hh };
      });
    const pontoLivre = (q: Ponto) => ocupados.every((r) => q.x < r.x1 || q.x > r.x2 || q.y < r.y1 || q.y > r.y2);
    for (const amb of comodos) {
      const pts = cantosNaCasa(amb.planta, posicoes[amb.id]);
      const forma = new THREE.Shape(pts.map((q) => new THREE.Vector2(q.x, -q.y)));
      const rotulo = `${amb.tipo} ${amb.nome}`;
      const molhada = AREAS_MOLHADAS.test(rotulo);
      const aberto = ehCeuAberto(rotulo); // pátio / jardim: sem teto
      const corPiso = /jardim|quintal/i.test(rotulo) ? "#9dbb7a" : aberto ? "#d6cfc1" : molhada ? "#dcd8d0" : "#c9a982";
      const piso = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshStandardMaterial({ color: corPiso, roughness: 0.8, side: THREE.DoubleSide }));
      piso.rotation.x = -Math.PI / 2;
      piso.receiveShadow = true;
      cena.add(piso);
      if (!aberto) {
        const teto = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshStandardMaterial({ color: "#fbfaf8", side: THREE.DoubleSide }));
        teto.rotation.x = -Math.PI / 2;
        teto.position.y = H;
        tetos.add(teto);
      }
      const dentro = pontoInterior(pts);
      pontosCentro[amb.id] = dentro;
      // visita começa perto da parede de baixo, olhando para dentro do cômodo
      const bx = caixa(pts);
      const recuado = { x: dentro.x, y: Math.min(bx.maxY - 0.6, dentro.y + (bx.maxY - bx.minY) * 0.4) };
      // anda do ponto recuado em direção ao centro até achar um lugar sem móvel
      let inicio = dentro;
      for (let k = 0; k <= 10; k++) {
        const q = { x: recuado.x + (dentro.x - recuado.x) * (k / 10), y: recuado.y + (dentro.y - recuado.y) * (k / 10) };
        if (pontoNoPoligono(q, pts) && pontoLivre(q)) {
          inicio = q;
          break;
        }
      }
      pontosEntrada[amb.id] = inicio;
      const nome = etiqueta(amb.nome);
      nome.position.set(dentro.x, H + 0.5, dentro.y);
      nomes.add(nome);
      // "luminária" de teto: ilumina o cômodo quando se está dentro dele
      const area = (bx.maxX - bx.minX) * (bx.maxY - bx.minY);
      const luz = new THREE.PointLight(0xfff1de, 1.5 + area * 0.17, 0, 1.4);
      luz.position.set(dentro.x, H - 0.35, dentro.y);
      if (!aberto) luzesInternas.add(luz); // a céu aberto, quem ilumina é o sol
    }
    luzesInternas.visible = false;
    cena.add(tetos, nomes, luzesInternas);

    /* ── paredes com vãos ── */
    const matParede = new THREE.MeshStandardMaterial({ color: "#f4f0ea", roughness: 0.9 });
    const matTopo = new THREE.MeshStandardMaterial({ color: "#3b3531", roughness: 0.9 }); // corte da parede na maquete
    const matVidro = new THREE.MeshStandardMaterial({ color: "#b9d6e6", transparent: true, opacity: 0.3, roughness: 0.1 });
    const paredesCasa = paredesDaCasa(projeto, posicoes);
    const solidos: [Ponto, Ponto][] = []; // trechos que bloqueiam a passagem
    let grupoParedes = new THREE.Group();
    const colunas: THREE.Object3D[] = []; // preenchido ao montar os móveis
    cena.add(grupoParedes);

    /** Levanta as paredes até `limite` (altura total ao caminhar; cortadas na maquete). */
    const montarParedes = (limite: number) => {
      cena.remove(grupoParedes);
      grupoParedes.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      grupoParedes = new THREE.Group();
      cena.add(grupoParedes);
      const cortada = limite < H - 0.01;
      // colunas acompanham o corte da maquete
      colunas.forEach((c) => c.scale.setY(Math.min(1, limite / H)));
      const registrar = solidos.length === 0;
    for (const w of paredesCasa) {
      const angulo = -Math.atan2(w.u.y, w.u.x);
      const ponto = (s: number): Ponto => ({ x: w.a.x + w.u.x * s, y: w.a.y + w.u.y * s });
      const bloco = (s1: number, s2: number, y1: number, y2Original: number, mat = matParede, esp = ESPESSURA) => {
        const y2 = Math.min(y2Original, limite);
        const len = s2 - s1, alt = y2 - y1;
        if (len < 0.005 || alt < 0.005) return;
        const c = ponto(s1 + len / 2);
        // na maquete, o topo cortado fica escuro, como num desenho de corte
        const mats = cortada && mat === matParede && y2 < y2Original ? [mat, mat, matTopo, mat, mat, mat] : mat;
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, alt, esp), mats);
        m.position.set(c.x + w.n.x * (ESPESSURA / 2), y1 + alt / 2, c.y + w.n.y * (ESPESSURA / 2));
        m.rotation.y = angulo;
        m.castShadow = mat === matParede;
        m.receiveShadow = true;
        grupoParedes.add(m);
      };
      /** Peça plana (desenhada no plano da parede: x ao longo dela, y para cima) com espessura. */
      const peca = (forma: THREE.Shape, mat: THREE.Material, esp = ESPESSURA) => {
        const geo = new THREE.ExtrudeGeometry(forma, { depth: esp, bevelEnabled: false, curveSegments: 24 });
        geo.translate(0, 0, -esp / 2);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(w.a.x + w.n.x * (ESPESSURA / 2), 0, w.a.y + w.n.y * (ESPESSURA / 2));
        m.rotation.y = angulo;
        m.castShadow = mat === matParede;
        m.receiveShadow = true;
        grupoParedes.add(m);
      };
      /** Parede acima de um arco: retângulo até o teto com o semicírculo recortado. */
      const sobreArco = (s1: number, s2: number, topo: number) => {
        const r = raioArco({ largura: s2 - s1, altura: topo });
        const nascente = topo - r; // onde a curva começa
        const f = new THREE.Shape();
        f.moveTo(s1, nascente);
        f.lineTo(s1, H);
        f.lineTo(s2, H);
        f.lineTo(s2, nascente);
        f.absarc((s1 + s2) / 2, nascente, (s2 - s1) / 2, 0, Math.PI, false);
        peca(f, matParede);
        return nascente;
      };
      /** Vidro em arco (janela ou porta-balcão): retângulo + meia-lua. */
      const vidroArco = (s1: number, s2: number, base: number, nascente: number) => {
        const f = new THREE.Shape();
        f.moveTo(s1, base);
        f.lineTo(s2, base);
        f.lineTo(s2, nascente);
        f.absarc((s1 + s2) / 2, nascente, (s2 - s1) / 2, 0, Math.PI, false);
        f.lineTo(s1, base);
        peca(f, matVidro, 0.01);
      };
      const solidosAntes = solidos.length;
      const vaos = w.vaos
        .map((v) => ({ ...v, s1: Math.max(0, v.s1), s2: Math.min(w.comprimento, v.s2) }))
        .filter((v) => v.s2 > v.s1)
        .sort((x, y) => x.s1 - y.s1);
      let cursor = 0;
      for (const v of vaos) {
        if (v.s1 > cursor) {
          bloco(cursor, v.s1, 0, H);
          solidos.push([ponto(cursor), ponto(v.s1)]);
        }
        const topo = Math.min(v.peitoril + v.altura, H);
        // arco: só aparece com a parede inteira (na maquete cortada, o corte fica abaixo dele)
        if (v.arco && !cortada && v.s2 - v.s1 > 0.1) {
          const janela = v.tipo === "janela";
          if (janela) bloco(v.s1, v.s2, 0, v.peitoril);
          const nascente = sobreArco(v.s1, v.s2, topo);
          if (janela || v.tipo === "porta_balcao") {
            vidroArco(v.s1, v.s2, janela ? v.peitoril : 0, nascente);
            solidos.push([ponto(v.s1), ponto(v.s2)]);
          }
          cursor = Math.max(cursor, v.s2);
          continue;
        }
        if (v.tipo === "janela") {
          bloco(v.s1, v.s2, 0, v.peitoril);
          bloco(v.s1, v.s2, topo, H);
          bloco(v.s1, v.s2, v.peitoril, topo, matVidro, 0.01);
          solidos.push([ponto(v.s1), ponto(v.s2)]);
        } else {
          bloco(v.s1, v.s2, Math.min(v.altura, H), H); // verga acima da porta
          if (v.tipo === "porta_balcao") {
            bloco(v.s1, v.s2, 0, Math.min(v.altura, H), matVidro, 0.01);
            solidos.push([ponto(v.s1), ponto(v.s2)]);
          }
        }
        cursor = Math.max(cursor, v.s2);
      }
      if (cursor < w.comprimento) {
        bloco(cursor, w.comprimento, 0, H);
        solidos.push([ponto(cursor), ponto(w.comprimento)]);
      }
      // os trechos sólidos só precisam ser registrados na primeira montagem
      if (!registrar) solidos.length = solidosAntes;
    }
    };
    const CORTE_MAQUETE = 1.2;
    let paredesInteiras = false;
    montarParedes(H);

    /* ── móveis ── */
    const matContorno = new THREE.LineBasicMaterial({ color: "#5b5047", transparent: true, opacity: 0.35 });
    for (const { movel: m, centro: c, rotacao } of moveisDaCasa(projeto, posicoes)) {
      const { altura, vidro, base = 0 } = alturaMovel(m.nome, H);
      const nomeMin = m.nome.toLowerCase();
      // peças com forma própria
      if (/coluna redonda|árvore|arbusto|fonte|espelho d.água/.test(nomeMin)) {
        const g = new THREE.Group();
        g.position.set(c.x, 0, c.y);
        g.rotation.y = (-rotacao * Math.PI) / 180;
        const mat = (cor: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, ...extra });
        const add = (geo: THREE.BufferGeometry, material: THREE.Material, y: number, sx = 1, sz = 1) => {
          const malha = new THREE.Mesh(geo, material);
          malha.position.y = y;
          malha.scale.set(sx, 1, sz);
          malha.castShadow = true;
          malha.receiveShadow = true;
          g.add(malha);
        };
        const rx = m.w / 2, rz = m.h / 2;
        if (nomeMin.includes("coluna")) {
          const r = Math.min(rx, rz);
          add(new THREE.CylinderGeometry(r * 0.82, r * 0.9, altura - 0.3, 28), mat(m.cor), altura / 2); // fuste
          add(new THREE.BoxGeometry(r * 2, 0.15, r * 2), mat(m.cor), 0.075); // base
          add(new THREE.BoxGeometry(r * 2.1, 0.15, r * 2.1), mat(m.cor), altura - 0.075); // capitel
        } else if (nomeMin.includes("árvore")) {
          add(new THREE.CylinderGeometry(0.1, 0.14, altura * 0.45, 12), mat("#7a5c43"), altura * 0.225);
          add(new THREE.SphereGeometry(1, 20, 14), mat(m.cor), altura * 0.65, rx, rz);
          g.children[1].scale.y = altura * 0.38;
        } else if (nomeMin.includes("arbusto")) {
          add(new THREE.SphereGeometry(1, 16, 12), mat(m.cor), altura / 2, rx, rz);
          g.children[0].scale.y = altura / 2;
        } else if (nomeMin.includes("fonte")) {
          add(new THREE.CylinderGeometry(1, 1, 0.45, 32), mat("#d8d2c6"), 0.225, rx, rz); // bacia
          add(new THREE.CylinderGeometry(1, 1, 0.02, 32), mat("#7fb2c8", { roughness: 0.1 }), 0.44, rx * 0.88, rz * 0.88); // água
          add(new THREE.CylinderGeometry(0.08, 0.12, altura - 0.45, 12), mat("#d8d2c6"), 0.45 + (altura - 0.45) / 2);
        } else {
          // espelho d'água: borda de pedra baixa com a lâmina d'água logo abaixo
          const borda = 0.15;
          for (const [w, d, x, z] of [[m.w, borda, 0, -rz + borda / 2], [m.w, borda, 0, rz - borda / 2], [borda, m.h, -rx + borda / 2, 0], [borda, m.h, rx - borda / 2, 0]]) {
            const lado = new THREE.Mesh(new THREE.BoxGeometry(w, altura, d), mat("#ddd6c8"));
            lado.position.set(x, altura / 2, z);
            lado.castShadow = lado.receiveShadow = true;
            g.add(lado);
          }
          add(new THREE.BoxGeometry(m.w - borda * 2, 0.02, m.h - borda * 2), mat(m.cor, { roughness: 0.05, metalness: 0.2 }), altura - 0.08);
        }
        if (nomeMin.includes("coluna")) colunas.push(g);
        cena.add(g);
        continue;
      }
      const geo = new THREE.BoxGeometry(m.w, altura, m.h);
      const mat = new THREE.MeshStandardMaterial({ color: m.cor, roughness: 0.75, ...(vidro ? { transparent: true, opacity: 0.25 } : {}) });
      const malha = new THREE.Mesh(geo, mat);
      malha.position.set(c.x, base + altura / 2 + (altura < 0.02 ? 0.003 : 0), c.y);
      if (/pilar/.test(nomeMin)) {
        // pilar: origem no piso, para ser cortado junto com as paredes na maquete
        geo.translate(0, altura / 2, 0);
        malha.position.y = base;
        colunas.push(malha);
      }
      malha.rotation.y = (-rotacao * Math.PI) / 180;
      malha.castShadow = !vidro && altura > 0.05;
      malha.receiveShadow = true;
      if (altura > 0.05) malha.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), matContorno));
      cena.add(malha);
    }

    /* ── controles ── */
    const orbita = new OrbitControls(camera, renderer.domElement);
    orbita.enableDamping = true;
    orbita.maxPolarAngle = Math.PI / 2.05;
    orbita.minDistance = 1;
    orbita.maxDistance = tamanho * 4;

    let modoAtual: Modo = "maquete";
    let yaw = 0, pitch = 0;
    const visaoMaquete = () => {
      orbita.target.copy(centro);
      camera.position.set(centro.x + tamanho * 0.1, tamanho * 0.85, centro.z + tamanho * 0.7);
      orbita.update();
    };
    const atualizarParedes = () => montarParedes(modoAtual === "maquete" && !paredesInteiras ? CORTE_MAQUETE : H);
    const irPara = (id: string) => {
      const p = pontosEntrada[id];
      if (!p) return;
      const alvo = pontosCentro[id] ?? p;
      camera.position.set(p.x, OLHOS, p.y);
      // olha para o centro do cômodo (ou para "frente" se já estiver nele)
      yaw = Math.hypot(alvo.x - p.x, alvo.y - p.y) > 0.2 ? Math.atan2(-(alvo.x - p.x), -(alvo.y - p.y)) : 0;
      pitch = -0.08;
    };
    const definirModo = (m: Modo) => {
      modoAtual = m;
      orbita.enabled = m === "maquete";
      tetos.visible = m === "caminhar";
      cena.background = new THREE.Color(m === "caminhar" ? "#cfe3f3" : "#f6f3ee"); // céu ao andar (visto no pátio e pelas janelas)
      luzesInternas.visible = m === "caminhar";
      nomes.visible = m === "maquete";
      camera.fov = m === "caminhar" ? 72 : 55;
      camera.updateProjectionMatrix();
      atualizarParedes();
      if (m === "maquete") visaoMaquete();
      else irPara(comodoInicial && pontosEntrada[comodoInicial] ? comodoInicial : comodos[0]?.id ?? "");
    };
    const definirParedesInteiras = (v: boolean) => {
      paredesInteiras = v;
      atualizarParedes();
    };
    api.current = { modo: definirModo, irPara, paredesInteiras: definirParedesInteiras };
    paredesInteiras = inteirasRef.current;
    definirModo(modoRef.current);

    // olhar ao redor arrastando (no modo caminhar)
    let arrastando: { x: number; y: number } | null = null;
    const aoApertar = (e: PointerEvent) => {
      if (modoAtual !== "caminhar") return;
      arrastando = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const aoMover = (e: PointerEvent) => {
      if (!arrastando || modoAtual !== "caminhar") return;
      yaw -= (e.clientX - arrastando.x) * 0.005;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - arrastando.y) * 0.005));
      arrastando = { x: e.clientX, y: e.clientY };
    };
    const aoSoltar = () => (arrastando = null);
    renderer.domElement.addEventListener("pointerdown", aoApertar);
    renderer.domElement.addEventListener("pointermove", aoMover);
    renderer.domElement.addEventListener("pointerup", aoSoltar);

    const MAPA: Record<string, string> = { w: "frente", arrowup: "frente", s: "tras", arrowdown: "tras", a: "esq", arrowleft: "esq", d: "dir", arrowright: "dir", shift: "correr" };
    const tecla = (v: boolean) => (e: KeyboardEvent) => {
      const k = MAPA[e.key.toLowerCase()];
      if (!k || modoAtual !== "caminhar") return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      e.preventDefault();
      teclas.current[k] = v;
    };
    const desce = tecla(true), sobe = tecla(false);
    window.addEventListener("keydown", desce);
    window.addEventListener("keyup", sobe);

    const livre = (x: number, y: number) => solidos.every(([a, z]) => distSegmento({ x, y }, a, z) > RAIO_CORPO);

    /* ── laço de desenho ── */
    const relogio = new THREE.Clock();
    let quadro = 0;
    const desenhar = () => {
      quadro = requestAnimationFrame(desenhar);
      const dt = Math.min(relogio.getDelta(), 0.1);
      if (modoAtual === "caminhar") {
        const t = teclas.current;
        const frente = (t.frente ? 1 : 0) - (t.tras ? 1 : 0);
        const lado = (t.dir ? 1 : 0) - (t.esq ? 1 : 0);
        if (frente || lado) {
          const vel = (t.correr ? 2.8 : 1.4) * dt;
          const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
          const rx = Math.cos(yaw), rz = -Math.sin(yaw);
          let dx = fx * frente + rx * lado, dz = fz * frente + rz * lado;
          const n = Math.hypot(dx, dz);
          dx = (dx / n) * vel;
          dz = (dz / n) * vel;
          const p = camera.position;
          if (livre(p.x + dx, p.z + dz)) p.set(p.x + dx, OLHOS, p.z + dz);
          else if (livre(p.x + dx, p.z)) p.x += dx; // desliza junto à parede
          else if (livre(p.x, p.z + dz)) p.z += dz;
        }
        camera.rotation.set(pitch, yaw, 0);
      } else {
        orbita.update();
      }
      renderer.render(cena, camera);
    };
    desenhar();

    const ajustar = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    ajustar();

    return () => {
      cancelAnimationFrame(quadro);
      obs.disconnect();
      window.removeEventListener("keydown", desce);
      window.removeEventListener("keyup", sobe);
      orbita.dispose();
      cena.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mt) => {
          (mt as THREE.MeshStandardMaterial).map?.dispose();
          mt.dispose();
        });
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      api.current = null;
    };
    // reconstrói a cena quando o projeto ou as posições mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto, posicoes]);

  useEffect(() => {
    api.current?.modo(modo);
  }, [modo]);

  useEffect(() => {
    api.current?.paredesInteiras(inteiras);
  }, [inteiras]);

  const botao = (k: string, rotulo: string) => (
    <button
      className="h-12 w-12 rounded-xl bg-white/90 text-lg shadow active:bg-accent-soft"
      onPointerDown={(e) => { e.preventDefault(); teclas.current[k] = true; }}
      onPointerUp={() => (teclas.current[k] = false)}
      onPointerLeave={() => (teclas.current[k] = false)}
      aria-label={k}
    >
      {rotulo}
    </button>
  );

  if (comodos.length === 0) {
    return <div className="card text-sm text-muted">Desenhe a planta de pelo menos um cômodo para ver em 3D.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(["maquete", "caminhar"] as Modo[]).map((m) => (
            <button key={m} className={`rounded-lg px-3 py-1.5 text-sm ${modo === m ? "bg-accent text-white" : ""}`} onClick={() => setModo(m)}>
              {m === "maquete" ? "🏠 Maquete" : "🚶 Caminhar por dentro"}
            </button>
          ))}
        </div>
        {modo === "maquete" && (
          <button className={`rounded-full border px-3 py-1.5 text-sm ${inteiras ? "border-line" : "border-accent bg-accent-soft text-accent"}`} onClick={() => setInteiras(!inteiras)}>
            {inteiras ? "▮ Paredes inteiras" : "▬ Paredes cortadas (ver por dentro)"}
          </button>
        )}
        {modo === "caminhar" && (
          <select
            className="input w-auto"
            value={destino}
            onChange={(e) => {
              setDestino(e.target.value);
              api.current?.irPara(e.target.value);
            }}
          >
            <option value="">Ir para o cômodo…</option>
            {comodos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        <button className="btn-ghost ml-auto" onClick={() => caixaRef.current?.parentElement?.requestFullscreen?.()}>⛶ Tela cheia</button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <div ref={caixaRef} className="h-[70vh] w-full" />
        <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-xl bg-white/85 px-3 py-2 text-xs text-muted">
          {modo === "maquete"
            ? "Arraste para girar · role (ou pinça) para aproximar · botão direito para mover."
            : "Arraste para olhar ao redor · W A S D ou setas para andar · Shift para andar mais rápido."}
        </div>
        {modo === "caminhar" && (
          <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1">
            <span />{botao("frente", "▲")}<span />
            {botao("esq", "◀")}{botao("tras", "▼")}{botao("dir", "▶")}
          </div>
        )}
      </div>
    </div>
  );
}
