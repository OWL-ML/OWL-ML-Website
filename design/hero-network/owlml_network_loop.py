#!/usr/bin/env python3
"""Perfectly looping companion to title_loop.py (GIF): open-world dot field -> growing/shrinking neural network -> uncertain outputs.

Usage: python3 network_loop.py <out.gif> [--headline --head-pt 19 | --head-frac 0.62] [--no-labels] [--png frame.png] [--w 10 --dpi 160 --fps 15 --secs 8 --seed 7]
  website figure:  --headline --no-labels              (headline stretched across the full width)
  slide figure:    --headline --no-labels --head-pt P  (P = subtitle size / GIF scale; scripts/title_figure.py does this per deck)
  plain figure:    (no flags) three small labels under the panels; --no-labels for none

Story told once per loop (all motion periodic in the loop length T, so the last frame flows into the first):
- the dot field on the left drifts on Lissajous orbits exactly like the title animation;
- four observations are sampled from it (a copy detaches from a dot and travels into an input node), one of them a novel orange dot;
- every observation sends a pulse layer by layer through the network;
- the novel one makes the network GROW (a new node eases in with an orange ring, then settles to teal) and the
  prediction bands on the right widen and turn orange (high uncertainty);
- afterwards the network SHRINKS again (a weak node fades and its layer reflows) and the bands narrow back to baseline.
Because nodes are identical and layers reflow to even spacing, the network at the end of the loop looks exactly as at the start.
Colours come from brand.json (teal/orange brand). Text uses Liberation Sans (Arial metrics).
"""
import argparse, json, math, os, subprocess
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("out"); ap.add_argument("--w", type=float, default=10); ap.add_argument("--h", type=float, default=None, help="figure height in inches (default: normalised to the tallest state of the network)")
ap.add_argument("--dpi", type=int, default=160); ap.add_argument("--fps", type=int, default=15); ap.add_argument("--secs", type=float, default=8)
ap.add_argument("--seed", type=int, default=7); ap.add_argument("--n", type=int, default=30)
ap.add_argument("--no-labels", action="store_true"); ap.add_argument("--png", default=None, help="also save one still frame (t=0.52) as PNG")
ap.add_argument("--headline", action="store_true", help="rolling headline at the top, as in title_loop.py (adds a text band above the figure)")
ap.add_argument("--line", default="Machine learning that keeps"); ap.add_argument("--words", default="learning,adapting,growing,remembering")
ap.add_argument("--head-frac", type=float, default=1.0, help="fraction of the width the one-line headline (with its longest word) spans")
ap.add_argument("--head-pt", type=float, default=None, help="headline size in points at the GIF's native inch scale (overrides --head-frac)")
ap.add_argument("--brand", default=None, help="brand.json (default: next to this script, else one level up)")
a = ap.parse_args()
if not a.brand:
    here = os.path.dirname(os.path.abspath(__file__))
    a.brand = next(p for p in (os.path.join(here, "brand.json"), os.path.join(here, "..", "brand.json")) if os.path.exists(p))

C = json.load(open(a.brand))["colors"]
hx = lambda k: tuple(int(C[k][i:i + 2], 16) for i in (0, 2, 4))
BG, TEAL100, TEAL200, TEAL300, TEAL500, TEAL600, TEAL900 = hx("teal100"), hx("teal100"), hx("teal200"), hx("teal300"), hx("teal500"), hx("teal600"), hx("teal900")
ORANGE, ORANGE300, ORANGE600, INK = hx("orange"), hx("orange300"), hx("orange600"), hx("teal900")
SS = 2
D = a.dpi; W = int(a.w * D); T = a.secs; N = int(a.fps * a.secs)
FONT_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
if not os.path.exists(FONT_B):
    FONT_B = subprocess.run(["fc-match", "-f", "%{file}", "Liberation Sans:bold"], capture_output=True, text=True).stdout.strip() or FONT_B
f_lab = ImageFont.truetype(FONT_B, int(0.17 * D * SS))
# optional headline band (same construction as title_loop.py): fixed line + rolling orange word, cap tops at the top edge
HEAD_H = 0; PAD = 0
if a.headline:
    def fit_font(txt, target):
        lo, hi = 10, 400
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if ImageFont.truetype(FONT_B, mid).getlength(txt) <= target: lo = mid
            else: hi = mid
        return lo
    words = a.words.split(","); longest = max(words, key=len)
    fpx = int(round(a.head_pt / 72 * D * SS)) if a.head_pt else fit_font(a.line + " " + longest, a.head_frac * (W - 0.3 * D) * SS)
    f_line = ImageFont.truetype(FONT_B, fpx)
    line_h = fpx / SS * 1.15
    PAD = 0.06 * D                                                   # clear margin above the tallest ink (i-dots, ascenders)
    INK_TOP = min(f_line.getbbox(a.line + " " + w)[1] for w in words) / SS   # distance from the text origin to the highest ink
    HEAD_H = PAD + 0.92 * line_h                                 # headline sits tight above the figure
# height: normalised to the tallest state of the network (all grown nodes present) unless --h is given
NODE_R = 0.095 * D; SP = 0.42 * D; SPL = [SP, SP, SP, 0.78 * D]
LAYER_N = [4, 7, 6, 3]
NET_SPAN = max((n - 1) * sp for n, sp in zip(LAYER_N, SPL)) + 2 * NODE_R
LAB_H = 0 if a.no_labels else 0.45 * D
H = int(a.h * D + HEAD_H) if a.h else int(HEAD_H + 0.03 * D + NET_SPAN + 0.18 * D + LAB_H)

def lerp(c1, c2, t):
    t = max(0.0, min(1.0, t)); return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
def ease(s):
    s = max(0.0, min(1.0, s)); return 0.5 - 0.5 * math.cos(math.pi * s)
def bump(t, t0, dur):          # smooth 0 -> 1 -> 0 over [t0, t0+dur], periodic in the loop
    d = (t - t0) % 1.0
    return math.sin(math.pi * d / dur) if d < dur else 0.0
def circle(dr, cx, cy, r, fill=None, outline=None, width=1):
    dr.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], fill=fill, outline=outline, width=int(width * SS))

# ---------------------------------------------------------------- layout (inches -> px)
NET_YC = HEAD_H + 0.03 * D + NET_SPAN / 2 if not a.h else (HEAD_H + H - LAB_H) / 2   # vertical centre of network and field
FIELD = (0.15 * D, NET_YC - NET_SPAN / 2, 2.85 * D, NET_YC + NET_SPAN / 2)             # x0 y0 x1 y1, same height as the network
LAYER_X = [3.75 * D, 4.75 * D, 5.75 * D, 6.75 * D]
OUT_X0 = LAYER_X[-1] + NODE_R + 0.12 * D; OUT_LEN = W - 0.2 * D - OUT_X0  # prediction bands

# ---------------------------------------------------------------- dot field (same generator as title_loop.py)
rs = a.seed
def rnd():
    global rs
    rs = (rs * 1103515245 + 12345) % 2147483648
    return rs / 2147483648
pts = []; cols = [TEAL200, TEAL200, TEAL300, TEAL300, TEAL500, TEAL100]
tries = 0
while len(pts) < a.n and tries < 4000:
    tries += 1; d = (0.11 + rnd() * 0.30) * D; m = 0.12 * D
    x = FIELD[0] + m + rnd() * (FIELD[2] - FIELD[0] - d - 2 * m); y = FIELD[1] + m + rnd() * (FIELD[3] - FIELD[1] - d - 2 * m)
    if any(math.hypot(p["x"] - x, p["y"] - y) < (p["d"] + d) / 2 + 0.07 * D for p in pts): continue
    pts.append({"x": x, "y": y, "d": d, "c": cols[int(rnd() * len(cols))], "ax": (0.03 + rnd() * 0.07) * D, "ay": (0.03 + rnd() * 0.07) * D,
                "kx": 1 + int(rnd() * 2), "ky": 1 + int(rnd() * 2), "px": rnd() * 2 * math.pi, "py": rnd() * 2 * math.pi})
def dot_pos(p, t):           # centre of a field dot at loop time t
    x = p["x"] + p["ax"] * math.cos(2 * math.pi * p["kx"] * t + p["px"]); y = p["y"] + p["ay"] * math.sin(2 * math.pi * p["ky"] * t + p["py"])
    return x + p["d"] / 2, y + p["d"] / 2

# ---------------------------------------------------------------- the four observations sampled per loop
# (t_event, novel?) -> each feeds a different input node; the novel (orange) one is the 2nd
EVENTS = [(0.05, False), (0.30, True), (0.55, False), (0.80, False)]
TRAVEL, DS, FLASH = 0.07, 0.035, 0.06           # copy travel time, stage delay between layers, flash duration
inner = [p for p in pts if 0.14 * D < p["d"] < 0.30 * D and p["x"] > FIELD[0] + 0.4 * D]
inner.sort(key=lambda p: p["y"])
step = max(1, len(inner) // 4); sources = [inner[min(len(inner) - 1, i * step + step // 2)] for i in range(4)]
sources[1]["c"] = ORANGE                        # the novel dot (steady ring + one pulse per loop, as in the title loop)
for p in sources: p["src"] = True

# ---------------------------------------------------------------- network with growth and pruning
# a node is (index-order position, grow time or None, prune time or None); grown nodes start absent, pruned ones end absent
GROW_D, PRUNE_D = 0.10, 0.12
T_IN = [e[0] + TRAVEL for e in EVENTS]          # arrival times at the input layer
TN = T_IN[1]                                    # arrival of the novel observation
layers = [
    [dict() for _ in range(4)],                                                             # input
    [dict(), dict(), dict(grow=TN + 1 * DS + 0.02), dict(), dict(prune=0.70), dict(), dict()],  # hidden 1: grows, later sheds one
    [dict(), dict(prune=0.80), dict(), dict(), dict(grow=TN + 2 * DS + 0.02), dict()],         # hidden 2
    [dict() for _ in range(3)],                                                             # output
]
def alive(nd, t):
    if "grow" in nd:
        if t < nd["grow"]: return 0.0
        return ease((t - nd["grow"]) / GROW_D)
    if "prune" in nd:
        if t < nd["prune"]: return 1.0
        return 1.0 - ease((t - nd["prune"]) / PRUNE_D)
    return 1.0
def node_positions(li, t):   # reflow: nodes spread evenly by their alive weight, centred on NET_YC
    L = layers[li]; al = [alive(nd, t) for nd in L]; tot = sum(al); cum = 0.0; pos = []
    for nd, av in zip(L, al):
        pos.append((LAYER_X[li], NET_YC + (cum + av / 2 - tot / 2) * SPL[li], av)); cum += av
    return pos
def node_color(nd, av, t):   # new nodes are orange and settle to teal; pruned nodes pale before shrinking
    if "grow" in nd and t >= nd["grow"]: return lerp(ORANGE, TEAL500, (t - nd["grow"] - GROW_D) / 0.25)
    if "prune" in nd: return lerp(TEAL500, TEAL200, (t - nd["prune"] + 0.08) / 0.10)
    return TEAL500
def pulse(t, stage, ev):     # strength of event ev's signal at stage (0 input ... 3 output), and its colour
    t_e, novel = EVENTS[ev]
    return bump(t, t_e + TRAVEL + stage * DS, FLASH), (ORANGE if novel else hx("teal800"))

# ---------------------------------------------------------------- prediction bands (scrolling, periodic)
LPER = 2.0 * OUT_LEN          # pattern period: the trace scrolls one full period per loop
U0 = 0.45 * LPER             # the uncertainty burst reaches the output node (x=0) at t = 0.55, just after the novel pulse arrives there
def gauss_wrap(u, u0, s):
    d = (u - u0 + LPER / 2) % LPER - LPER / 2; return math.exp(-0.5 * (d / s) ** 2)
BAND = [dict(a1=0.045, k1=2, p1=0.3, a2=0.025, k2=5, p2=1.1, jump=+0.10, w0=0.045, wb=0.14),
        dict(a1=0.040, k1=3, p1=2.0, a2=0.020, k2=7, p2=0.4, jump=-0.07, w0=0.040, wb=0.16),
        dict(a1=0.050, k1=2, p1=4.1, a2=0.020, k2=4, p2=2.7, jump=+0.05, w0=0.050, wb=0.13)]
def band_at(b, u):            # mean offset and half-width (px) of band b at pattern coordinate u
    g = gauss_wrap(u, U0 + 0.25 * D, 0.45 * D); gm = gauss_wrap(u, U0 + 0.15 * D, 0.30 * D)
    mean = (b["a1"] * math.sin(2 * math.pi * b["k1"] * u / LPER + b["p1"]) + b["a2"] * math.sin(2 * math.pi * b["k2"] * u / LPER + b["p2"])) * D + b["jump"] * D * gm
    return mean, (b["w0"] + b["wb"] * g) * D, g

def frame(k, t=None):
    t = k / N if t is None else t
    im = Image.new("RGB", (W * SS, H * SS), BG); dr = ImageDraw.Draw(im)
    # ---- 1. dot field
    for p in pts:
        cx, cy = dot_pos(p, t); circle(dr, cx, cy, p["d"] / 2, fill=p["c"])
    nov = sources[1]; cx, cy = dot_pos(nov, t); ph = (t - EVENTS[1][0]) % 1.0
    if ph < 0.6:
        s = ph / 0.6; circle(dr, cx, cy, nov["d"] / 2 + (0.08 + 0.20 * s) * D, outline=lerp(ORANGE, BG, s ** 1.5), width=0.022 * D)
    circle(dr, cx, cy, nov["d"] / 2 + 0.09 * D, outline=ORANGE, width=0.016 * D)
    # ---- 2. network: positions, faint ingestion paths, edges, nodes
    P = [node_positions(li, t) for li in range(4)]
    for j, (x, y, av) in enumerate(P[0]):      # faint guide curves from the field edge into each input node
        sx, sy = dot_pos(sources[j], EVENTS[j][0]); cxp = FIELD[2] + 0.25 * D
        prev = None
        for i in range(25):
            s = i / 24; px = (1 - s) ** 2 * sx + 2 * (1 - s) * s * cxp + s * s * x; py = (1 - s) ** 2 * sy + 2 * (1 - s) * s * (0.5 * sy + 0.5 * y) + s * s * y
            if prev and px > FIELD[2] + 0.05 * D: dr.line([prev, (px * SS, py * SS)], fill=TEAL200, width=int(0.012 * D * SS))
            prev = (px * SS, py * SS)
    for li in range(3):                         # edges, brightened by passing pulses
        for i, (x1, y1, a1) in enumerate(P[li]):
            for j, (x2, y2, a2) in enumerate(P[li + 1]):
                al = a1 * a2
                if al <= 0.01: continue
                col = lerp(BG, TEAL300, al)
                for ev in range(4):
                    if li == 0 and i != ev: continue   # the observation enters at its own input node
                    s, pc = pulse(t, li + 1, ev)
                    if s > 0: col = lerp(col, pc, min(1.0, 2.0 * s) * 0.85 * al)
                dr.line([(x1 * SS, y1 * SS), (x2 * SS, y2 * SS)], fill=col, width=int(0.014 * D * SS))
    for li in range(4):
        for i, (x, y, av) in enumerate(P[li]):
            if av <= 0.01: continue
            nd = layers[li][i]; col = node_color(nd, av, t); r = NODE_R * av
            for ev in range(4):
                if li == 0 and i != ev: continue
                s, pc = pulse(t, li, ev)
                if s > 0: col = lerp(col, pc, min(1.0, 2.5 * s)); r *= 1 + 0.25 * s
            if "grow" in nd and 0 <= t - nd["grow"] < 0.5:   # orange ring pulse announcing growth
                s = (t - nd["grow"]) / 0.5; circle(dr, x, y, r + (0.06 + 0.22 * s) * D, outline=lerp(ORANGE, BG, s ** 1.3), width=0.02 * D)
            circle(dr, x, y, r, fill=col)
    # ---- 3. observations travelling from the field into the input layer (copies; the field dot stays)
    for ev, (t_e, novel) in enumerate(EVENTS):
        u = ((t - t_e) % 1.0) / TRAVEL
        if u >= 1: continue
        sx, sy = dot_pos(sources[ev], t_e); x, y, _ = P[0][ev]; cxp = FIELD[2] + 0.25 * D
        for g, dl in ((3, 0.09), (2, 0.06), (1, 0.03), (0, 0)):   # three ghost trails + the copy
            s = ease(u - dl)
            if u - dl < 0: continue
            px = (1 - s) ** 2 * sx + 2 * (1 - s) * s * cxp + s * s * x; py = (1 - s) ** 2 * sy + 2 * (1 - s) * s * (0.5 * sy + 0.5 * y) + s * s * y
            r = sources[ev]["d"] / 2 + (NODE_R - sources[ev]["d"] / 2) * s
            circle(dr, px, py, r * (1 - 0.18 * g), fill=lerp(sources[ev]["c"], BG, 0.25 * g))
    # ---- 4. prediction bands with uncertainty, scrolling right from the output nodes
    for bi, (x0, y0, _) in enumerate(P[3]):
        b = BAND[bi]; nseg = 80; prev = None
        for i in range(nseg + 1):
            xs = i / nseg * OUT_LEN; u = (xs - LPER * t) % LPER; mean, hw, g = band_at(b, u)
            age = (xs / OUT_LEN) ** 1.4
            fill = lerp(lerp(TEAL200, ORANGE300, min(1.0, 1.6 * g)), BG, 0.75 * age); line = lerp(lerp(TEAL600, ORANGE600, min(1.0, 1.6 * g)), BG, 0.8 * age)
            cur = (OUT_X0 + xs, y0 + mean, hw, fill, line)
            if prev:
                (xa, ya, ha, fa, la), (xb, yb, hb, _, _) = prev, cur
                dr.polygon([(xa * SS, (ya - ha) * SS), (xb * SS, (yb - hb) * SS), (xb * SS, (yb + hb) * SS), (xa * SS, (ya + ha) * SS)], fill=fa)
                dr.line([(xa * SS, ya * SS), (xb * SS, yb * SS)], fill=la, width=int(0.02 * D * SS))
            prev = cur
        # the output node breathes with its current uncertainty
        _, hw0, g0 = band_at(b, (-LPER * t) % LPER)
        circle(dr, x0, y0, NODE_R + 0.5 * hw0, outline=lerp(TEAL300, ORANGE, min(1.0, 1.8 * g0)), width=0.018 * D)
    # ---- 5. headline (fixed line + rolling word in a clipped band) and labels
    if a.headline:
        x0 = int(0.15 * D); y0 = PAD - INK_TOP                               # text origin so the highest ink sits PAD below the top edge
        dr.text((x0 * SS, y0 * SS), a.line, font=f_line, fill=INK)
        xw = x0 + f_line.getlength(a.line + " ") / SS                       # the rolling word follows on the same line, same baseline
        lh = int(line_h * 1.1); band = Image.new("RGB", (int(f_line.getlength(longest) / SS + 0.1 * D) * SS, lh * SS), BG); bd = ImageDraw.Draw(band)
        per = 1.0 / len(words); tr = 0.22; i = int(t / per); u = (t - i * per) / per
        cur, nxt = words[i % len(words)], words[(i + 1) % len(words)]
        off = 0.0 if u < 1 - tr else (1 - math.cos(math.pi * (u - (1 - tr)) / tr)) / 2
        bd.text((0, (-off * lh) * SS), cur, font=f_line, fill=ORANGE)
        bd.text((0, ((1 - off) * lh) * SS), nxt, font=f_line, fill=ORANGE)
        im.paste(band, (int(xw * SS), int(y0 * SS)))
    if not a.no_labels:
        yl = H - LAB_H + 0.08 * D
        for txt, xc in (("open world", (FIELD[0] + FIELD[2]) / 2), ("network that grows and shrinks", (LAYER_X[0] + LAYER_X[-1]) / 2), ("uncertain predictions", OUT_X0 + OUT_LEN / 2 - 0.1 * D)):
            w = f_lab.getlength(txt) / SS; dr.text(((xc - w / 2) * SS, yl * SS), txt, font=f_lab, fill=INK)
    return im.resize((W, H), Image.LANCZOS)

if a.png:
    frame(0, t=0.52).save(a.png); print("wrote", a.png)
frames = [frame(k) for k in range(N)]
# shared palette from several frames (quiet, novel-pulse, growth, high-uncertainty) so orange is not quantised to brown
mont = Image.new("RGB", (W, 4 * H)); [mont.paste(frames[int(f * N)], (0, i * H)) for i, f in enumerate((0.0, 0.40, 0.52, 0.65))]
pal = mont.convert("P", palette=Image.ADAPTIVE, colors=128)
frames_p = [f.quantize(palette=pal, dither=Image.NONE) for f in frames]
# snap the palette entry used for the background to the exact brand colour, so the GIF is invisible on a teal100 slide
pl = frames_p[0].getpalette()[:768]
for i in range(len(pl) // 3):
    if sum((pl[3 * i + c] - BG[c]) ** 2 for c in range(3)) < 40: pl[3 * i:3 * i + 3] = list(BG)
for f in frames_p: f.putpalette(pl)
frames_p[0].save(a.out, save_all=True, append_images=frames_p[1:], duration=int(1000 / a.fps), loop=0, optimize=True, disposal=1)
json.dump({"wIn": W / D, "hIn": H / D, "labels": not a.no_labels, "capPadIn": ((PAD - INK_TOP + f_line.getbbox("H")[1] / SS) / D if a.headline else 0)}, open(os.path.splitext(a.out)[0] + ".json", "w"))
print("wrote", a.out, f"{W}x{H}px, {N} frames @ {a.fps} fps, {os.path.getsize(a.out) / 1e6:.1f} MB")
