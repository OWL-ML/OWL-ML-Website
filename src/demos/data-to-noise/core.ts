// From data to noise (docs/DEMOS.md): the forward diffusion process on 160 two-moons
// points, x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε with the cosine schedule. ε is fixed per point, so the
// slider is reversible. Ported from the prototype with the same seed. Pure logic, no DOM.

export interface Point {
  x0: number;
  y0: number;
  /** the point's fixed noise ε */
  ex: number;
  ey: number;
  /** which crescent */
  upper: boolean;
}

/** Cosine schedule: ᾱ(t) = cos²(((t + 0.008)/1.008)·π/2) / cos²((0.008/1.008)·π/2), t ∈ [0, 1]. */
export function alphaBar(t: number): number {
  const f = (u: number) => Math.cos(((u + 0.008) / 1.008) * (Math.PI / 2)) ** 2;
  return Math.max(0, Math.min(1, f(t) / f(0)));
}

/** 160 points on two interleaved crescents (Park–Miller generator, seed 3, as in the prototype). */
export function makePoints(n = 160, seed = 3): Point[] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const gauss = () => {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const upper = i % 2 === 0;
    const th = Math.PI * rnd();
    let x0 = upper ? Math.cos(th) : 1 - Math.cos(th);
    let y0 = upper ? Math.sin(th) : 0.5 - Math.sin(th);
    x0 += gauss() * 0.06;
    y0 += gauss() * 0.06;
    pts.push({ x0: (x0 - 0.5) / 0.9, y0: (y0 - 0.25) / 0.9, ex: gauss(), ey: gauss(), upper });
  }
  return pts;
}

/** Positions at time t. */
export function diffuse(pts: Point[], t: number): { x: number; y: number; upper: boolean }[] {
  const ab = alphaBar(t);
  const a = Math.sqrt(ab);
  const b = Math.sqrt(1 - ab);
  return pts.map((p) => ({ x: a * p.x0 + b * p.ex, y: a * p.y0 + b * p.ey, upper: p.upper }));
}
