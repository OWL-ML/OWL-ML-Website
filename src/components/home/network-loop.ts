// The homepage hero animation: an open-world dot field feeds a neural network that grows a node when
// a novel observation arrives and sheds one again later; its predictions widen (and turn orange)
// while it is uncertain. A port of the lab's `owlml_network_loop.py` (design/hero-network/): same
// layout, seed, timing and drawing order, so the site and the slides show the same figure.
//
// Pure functions only: `frame(t)` returns what to draw at loop time t (0..1, periodic) as a list of
// shapes in a fixed 1600 x 467 coordinate system. HeroNetwork.astro draws these on a canvas in the
// browser; hero-network.svg.ts turns one frame into the static SVG shown without JavaScript and
// under reduced motion.

export const LOOP_SECONDS = 8;
/** the still frame (no JavaScript, reduced motion): a novel observation has just made it grow */
export const STILL_T = 0.52;

const D = 160; // the script's pixels per inch; all sizes below are in its inch units × D
export const WIDTH = 10 * D;

type RGB = [number, number, number];
export type Shape =
  | { k: 'c'; x: number; y: number; r: number; fill?: string; stroke?: string; w?: number }
  | {
      k: 'l';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      c: string;
      w: number;
      round?: boolean;
    }
  | { k: 'p'; pts: number[]; c: string };

/** The colours the script calls teal100 … orange600, for the dark hero card (src/styles/tokens.css). */
export interface Palette {
  teal100: string; // background
  teal200: string;
  teal300: string;
  teal500: string;
  teal600: string;
  teal800: string;
  teal900: string;
  orange: string;
  orange300: string;
  orange600: string;
}
export const DARK: Palette = {
  teal100: '#18403d', // --teal-750 (hero panel)
  teal200: '#2f7a70', // --field-3
  teal300: '#4e9a8f', // --field-1
  teal500: '#8acbb7', // --field-2
  teal600: '#8acbb7', // --field-2
  teal800: '#e9f3f0', // --on-dark
  teal900: '#cfe3de', // --on-dark-muted
  orange: '#e38a43', // --orange
  orange300: '#7d6540', // --orange mixed half-way into --teal-750 (uncertain bands on dark)
  orange600: '#f3b585', // --peach-light
};

// ---------------------------------------------------------------- helpers (as in the script)
const clamp01 = (s: number) => Math.max(0, Math.min(1, s));
const pmod = (a: number, n: number) => ((a % n) + n) % n; // Python's %: never negative
const ease = (s: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(s));
const bump = (t: number, t0: number, dur: number) => {
  const d = pmod(t - t0, 1);
  return d < dur ? Math.sin((Math.PI * d) / dur) : 0;
};
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const lerp = (a: RGB, b: RGB, t: number): RGB => {
  const s = clamp01(t);
  return [0, 1, 2].map((i) => Math.trunc(a[i]! + (b[i]! - a[i]!) * s)) as RGB;
};
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
/** PIL line/outline widths: drawn at 2× supersampling and truncated to whole pixels */
const lw = (px: number) => Math.trunc(px * 2) / 2;

// ---------------------------------------------------------------- layout
const NODE_R = 0.095 * D;
const SP = 0.42 * D;
const SPL = [SP, SP, SP, 0.78 * D];
const LAYER_N = [4, 7, 6, 3];
const NET_SPAN = Math.max(...LAYER_N.map((n, i) => (n - 1) * SPL[i]!)) + 2 * NODE_R;
export const HEIGHT = Math.trunc(0.03 * D + NET_SPAN + 0.18 * D);
const NET_YC = 0.03 * D + NET_SPAN / 2;
const FIELD = [0.15 * D, NET_YC - NET_SPAN / 2, 2.85 * D, NET_YC + NET_SPAN / 2] as const;
const LAYER_X = [3.75 * D, 4.75 * D, 5.75 * D, 6.75 * D];
const OUT_X0 = LAYER_X[3]! + NODE_R + 0.12 * D;
const OUT_LEN = WIDTH - 0.2 * D - OUT_X0;

// ---------------------------------------------------------------- dot field (seeded as in the script)
type ColorKey = keyof Palette;
interface Dot {
  x: number;
  y: number;
  d: number;
  c: ColorKey;
  ax: number;
  ay: number;
  kx: number;
  ky: number;
  px: number;
  py: number;
}
let rs = 7n; // the script's linear congruential generator (big integers, as in Python)
const rnd = () => {
  rs = (rs * 1103515245n + 12345n) % 2147483648n;
  return Number(rs) / 2147483648;
};
const pts: Dot[] = [];
{
  const cols: ColorKey[] = ['teal200', 'teal200', 'teal300', 'teal300', 'teal500', 'teal100'];
  let tries = 0;
  while (pts.length < 30 && tries < 4000) {
    tries += 1;
    const d = (0.11 + rnd() * 0.3) * D;
    const m = 0.12 * D;
    const x = FIELD[0] + m + rnd() * (FIELD[2] - FIELD[0] - d - 2 * m);
    const y = FIELD[1] + m + rnd() * (FIELD[3] - FIELD[1] - d - 2 * m);
    if (pts.some((p) => Math.hypot(p.x - x, p.y - y) < (p.d + d) / 2 + 0.07 * D)) continue;
    pts.push({
      x,
      y,
      d,
      c: cols[Math.trunc(rnd() * cols.length)]!,
      ax: (0.03 + rnd() * 0.07) * D,
      ay: (0.03 + rnd() * 0.07) * D,
      kx: 1 + Math.trunc(rnd() * 2),
      ky: 1 + Math.trunc(rnd() * 2),
      px: rnd() * 2 * Math.PI,
      py: rnd() * 2 * Math.PI,
    });
  }
}
const dotPos = (p: Dot, t: number): [number, number] => [
  p.x + p.ax * Math.cos(2 * Math.PI * p.kx * t + p.px) + p.d / 2,
  p.y + p.ay * Math.sin(2 * Math.PI * p.ky * t + p.py) + p.d / 2,
];

// ---------------------------------------------------------------- the four observations per loop
const EVENTS: [number, boolean][] = [
  [0.05, false],
  [0.3, true],
  [0.55, false],
  [0.8, false],
];
const TRAVEL = 0.07;
const DS = 0.035;
const FLASH = 0.06;
const inner = pts
  .filter((p) => 0.14 * D < p.d && p.d < 0.3 * D && p.x > FIELD[0] + 0.4 * D)
  .sort((a, b) => a.y - b.y);
const step = Math.max(1, Math.floor(inner.length / 4));
const sources = [0, 1, 2, 3].map(
  (i) => inner[Math.min(inner.length - 1, i * step + Math.floor(step / 2))]!,
);
sources[1]!.c = 'orange'; // the novel dot

// ---------------------------------------------------------------- network that grows and shrinks
interface Node {
  grow?: number;
  prune?: number;
}
const GROW_D = 0.1;
const PRUNE_D = 0.12;
const TN = EVENTS[1]![0] + TRAVEL; // the novel observation reaches the input layer
const layers: Node[][] = [
  [{}, {}, {}, {}],
  [{}, {}, { grow: TN + 1 * DS + 0.02 }, {}, { prune: 0.7 }, {}, {}],
  [{}, { prune: 0.8 }, {}, {}, { grow: TN + 2 * DS + 0.02 }, {}],
  [{}, {}, {}],
];
const alive = (nd: Node, t: number) => {
  if (nd.grow !== undefined) return t < nd.grow ? 0 : ease((t - nd.grow) / GROW_D);
  if (nd.prune !== undefined) return t < nd.prune ? 1 : 1 - ease((t - nd.prune) / PRUNE_D);
  return 1;
};
/** nodes spread evenly by their alive weight around the centre line */
export const nodePositions = (li: number, t: number): [number, number, number][] => {
  const al = layers[li]!.map((nd) => alive(nd, t));
  const tot = al.reduce((a, b) => a + b, 0);
  let cum = 0;
  return al.map((av) => {
    const pos: [number, number, number] = [
      LAYER_X[li]!,
      NET_YC + (cum + av / 2 - tot / 2) * SPL[li]!,
      av,
    ];
    cum += av;
    return pos;
  });
};

// ---------------------------------------------------------------- prediction bands
const LPER = 2 * OUT_LEN;
const U0 = 0.45 * LPER;
const gaussWrap = (u: number, u0: number, s: number) => {
  const d = pmod(u - u0 + LPER / 2, LPER) - LPER / 2;
  return Math.exp(-0.5 * (d / s) ** 2);
};
const BAND = [
  { a1: 0.045, k1: 2, p1: 0.3, a2: 0.025, k2: 5, p2: 1.1, jump: 0.1, w0: 0.045, wb: 0.14 },
  { a1: 0.04, k1: 3, p1: 2.0, a2: 0.02, k2: 7, p2: 0.4, jump: -0.07, w0: 0.04, wb: 0.16 },
  { a1: 0.05, k1: 2, p1: 4.1, a2: 0.02, k2: 4, p2: 2.7, jump: 0.05, w0: 0.05, wb: 0.13 },
];
const bandAt = (b: (typeof BAND)[number], u: number) => {
  const g = gaussWrap(u, U0 + 0.25 * D, 0.45 * D);
  const gm = gaussWrap(u, U0 + 0.15 * D, 0.3 * D);
  const mean =
    (b.a1 * Math.sin((2 * Math.PI * b.k1 * u) / LPER + b.p1) +
      b.a2 * Math.sin((2 * Math.PI * b.k2 * u) / LPER + b.p2)) *
      D +
    b.jump * D * gm;
  return { mean, hw: (b.w0 + b.wb * g) * D, g };
};
const bezier = (sx: number, sy: number, x: number, y: number, s: number): [number, number] => {
  const cxp = FIELD[2] + 0.25 * D;
  return [
    (1 - s) ** 2 * sx + 2 * (1 - s) * s * cxp + s * s * x,
    (1 - s) ** 2 * sy + 2 * (1 - s) * s * (0.5 * sy + 0.5 * y) + s * s * y,
  ];
};

// ---------------------------------------------------------------- one frame
/** Everything drawn at loop time t (0..1), in drawing order. */
export function frame(t: number, palette: Palette = DARK): Shape[] {
  const C = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, hex(v)])) as Record<
    ColorKey,
    RGB
  >;
  const BG = C.teal100;
  const out: Shape[] = [];
  const circle = (x: number, y: number, r: number, fill?: RGB, stroke?: RGB, w = 1) =>
    out.push(
      fill
        ? { k: 'c', x, y, r, fill: css(fill) }
        : { k: 'c', x, y, r, stroke: css(stroke!), w: lw(w) },
    );
  const line = (x1: number, y1: number, x2: number, y2: number, c: RGB, w: number, round = false) =>
    out.push({ k: 'l', x1, y1, x2, y2, c: css(c), w: lw(w), ...(round && { round }) });
  const pulse = (stage: number, ev: number): [number, RGB] => {
    const [te, novel] = EVENTS[ev]!;
    return [bump(t, te + TRAVEL + stage * DS, FLASH), novel ? C.orange : C.teal800];
  };
  const nodeColor = (nd: Node): RGB => {
    if (nd.grow !== undefined && t >= nd.grow)
      return lerp(C.orange, C.teal500, (t - nd.grow - GROW_D) / 0.25);
    if (nd.prune !== undefined) return lerp(C.teal500, C.teal200, (t - nd.prune + 0.08) / 0.1);
    return C.teal500;
  };

  // 1. dot field, with the novel dot's steady ring and one widening ring per loop
  for (const p of pts) {
    const [x, y] = dotPos(p, t);
    circle(x, y, p.d / 2, C[p.c]);
  }
  const nov = sources[1]!;
  const [nx, ny] = dotPos(nov, t);
  const ph = pmod(t - EVENTS[1]![0], 1);
  if (ph < 0.6) {
    const s = ph / 0.6;
    circle(
      nx,
      ny,
      nov.d / 2 + (0.08 + 0.2 * s) * D,
      undefined,
      lerp(C.orange, BG, s ** 1.5),
      0.022 * D,
    );
  }
  circle(nx, ny, nov.d / 2 + 0.09 * D, undefined, C.orange, 0.016 * D);

  // 2. network: faint ingestion paths, edges brightened by passing pulses, nodes
  const P = [0, 1, 2, 3].map((li) => nodePositions(li, t));
  P[0]!.forEach(([x, y], j) => {
    const [sx, sy] = dotPos(sources[j]!, EVENTS[j]![0]);
    let prev: [number, number] | null = null;
    for (let i = 0; i < 25; i++) {
      const pt = bezier(sx, sy, x, y, i / 24);
      if (prev && pt[0] > FIELD[2] + 0.05 * D)
        line(prev[0], prev[1], pt[0], pt[1], C.teal200, 0.012 * D);
      prev = pt;
    }
  });
  for (let li = 0; li < 3; li++) {
    P[li]!.forEach(([x1, y1, a1], i) => {
      P[li + 1]!.forEach(([x2, y2, a2]) => {
        const al = a1 * a2;
        if (al <= 0.01) return;
        let col = lerp(BG, C.teal300, al);
        for (let ev = 0; ev < 4; ev++) {
          if (li === 0 && i !== ev) continue; // an observation enters at its own input node
          const [s, pc] = pulse(li + 1, ev);
          if (s > 0) col = lerp(col, pc, Math.min(1, 2 * s) * 0.85 * al);
        }
        line(x1, y1, x2, y2, col, 0.014 * D);
      });
    });
  }
  for (let li = 0; li < 4; li++) {
    P[li]!.forEach(([x, y, av], i) => {
      if (av <= 0.01) return;
      const nd = layers[li]![i]!;
      let col = nodeColor(nd);
      let r = NODE_R * av;
      for (let ev = 0; ev < 4; ev++) {
        if (li === 0 && i !== ev) continue;
        const [s, pc] = pulse(li, ev);
        if (s > 0) {
          col = lerp(col, pc, Math.min(1, 2.5 * s));
          r *= 1 + 0.25 * s;
        }
      }
      if (nd.grow !== undefined && t - nd.grow >= 0 && t - nd.grow < 0.5) {
        const s = (t - nd.grow) / 0.5; // orange ring announcing growth
        circle(x, y, r + (0.06 + 0.22 * s) * D, undefined, lerp(C.orange, BG, s ** 1.3), 0.02 * D);
      }
      circle(x, y, r, col);
    });
  }

  // 3. observations travelling from the field into the input layer (copies with ghost trails)
  EVENTS.forEach(([te], ev) => {
    const u = pmod(t - te, 1) / TRAVEL;
    if (u >= 1) return;
    const src = sources[ev]!;
    const [sx, sy] = dotPos(src, te);
    const [x, y] = P[0]![ev]!;
    for (const [g, dl] of [
      [3, 0.09],
      [2, 0.06],
      [1, 0.03],
      [0, 0],
    ] as const) {
      if (u - dl < 0) continue;
      const s = ease(u - dl);
      const [px, py] = bezier(sx, sy, x, y, s);
      const r = src.d / 2 + (NODE_R - src.d / 2) * s;
      circle(px, py, r * (1 - 0.18 * g), lerp(C[src.c], BG, 0.25 * g));
    }
  });

  // 4. prediction bands scrolling right from the output nodes, widening while uncertain
  P[3]!.forEach(([x0, y0], bi) => {
    const b = BAND[bi]!;
    const nseg = 80;
    let prev: [number, number, number, RGB, RGB] | null = null;
    for (let i = 0; i <= nseg; i++) {
      const xs = (i / nseg) * OUT_LEN;
      const { mean, hw, g } = bandAt(b, pmod(xs - LPER * t, LPER));
      const age = (xs / OUT_LEN) ** 1.4;
      const k = Math.min(1, 1.6 * g);
      const fill = lerp(lerp(C.teal200, C.orange300, k), BG, 0.75 * age);
      const ln = lerp(lerp(C.teal600, C.orange600, k), BG, 0.8 * age);
      const cur: [number, number, number, RGB, RGB] = [OUT_X0 + xs, y0 + mean, hw, fill, ln];
      if (prev) {
        const [xa, ya, ha, fa, la] = prev;
        const [xb, yb, hb] = cur;
        // vector output (unlike the script's raster) would show hairline seams between the pieces:
        // each piece reaches a little under the next one, and the centre line has round ends
        const ov = i < nseg ? 1.5 : 0;
        out.push({
          k: 'p',
          pts: [xa, ya - ha, xb + ov, yb - hb, xb + ov, yb + hb, xa, ya + ha],
          c: css(fa),
        });
        line(xa, ya, xb, yb, la, 0.02 * D, true);
      }
      prev = cur;
    }
    const { hw, g } = bandAt(b, pmod(-LPER * t, LPER)); // the output node breathes with it
    circle(
      x0,
      y0,
      NODE_R + 0.5 * hw,
      undefined,
      lerp(C.teal300, C.orange, Math.min(1, 1.8 * g)),
      0.018 * D,
    );
  });
  return out;
}

// ---------------------------------------------------------------- renderers
const r1 = (n: number) => Math.round(n * 10) / 10;

/** One frame as an SVG document (the static fallback). */
export function toSvg(shapes: Shape[], bg = DARK.teal100): string {
  const parts = shapes.map((s) => {
    if (s.k === 'c')
      return s.fill
        ? `<circle cx="${r1(s.x)}" cy="${r1(s.y)}" r="${r1(s.r)}" fill="${s.fill}"/>`
        : `<circle cx="${r1(s.x)}" cy="${r1(s.y)}" r="${r1(s.r - s.w! / 2)}" fill="none" stroke="${s.stroke}" stroke-width="${s.w}"/>`;
    if (s.k === 'l')
      return `<line x1="${r1(s.x1)}" y1="${r1(s.y1)}" x2="${r1(s.x2)}" y2="${r1(s.y2)}" stroke="${s.c}" stroke-width="${s.w}"${s.round ? ' stroke-linecap="round"' : ''}/>`;
    return `<polygon points="${s.pts.map(r1).join(' ')}" fill="${s.c}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}"><rect width="100%" height="100%" fill="${bg}"/>${parts.join('')}</svg>`;
}

/** One frame on a canvas whose width maps to WIDTH. */
export function drawCanvas(ctx: CanvasRenderingContext2D, shapes: Shape[], bg = DARK.teal100) {
  const scale = ctx.canvas.width / WIDTH;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (const s of shapes) {
    ctx.beginPath();
    if (s.k === 'c') {
      if (s.fill) {
        ctx.arc(s.x, s.y, Math.max(0, s.r), 0, 2 * Math.PI);
        ctx.fillStyle = s.fill;
        ctx.fill();
      } else {
        ctx.arc(s.x, s.y, Math.max(0, s.r - s.w! / 2), 0, 2 * Math.PI);
        ctx.strokeStyle = s.stroke!;
        ctx.lineWidth = s.w!;
        ctx.stroke();
      }
    } else if (s.k === 'l') {
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.lineCap = s.round ? 'round' : 'butt';
      ctx.strokeStyle = s.c;
      ctx.lineWidth = s.w;
      ctx.stroke();
    } else {
      ctx.moveTo(s.pts[0]!, s.pts[1]!);
      for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i]!, s.pts[i + 1]!);
      ctx.closePath();
      ctx.fillStyle = s.c;
      ctx.fill();
    }
  }
}
