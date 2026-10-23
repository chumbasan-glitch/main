/* ================= 6年「立体の体積」：見取図の長さから底面積を求めて体積を出す ================= */
/* 底面（xy平面の多角形，反時計回り）を手前に置き，奥行き Ldep の角柱をかく。
   o.curved[i]=true の辺は曲面（円柱など）として，つなぎ目の線をかかない。 */
function drawPrismPoly(G, x, y, w, h, fs, base, Ldep, o){
  o = o || {};
  const n = base.length, P3 = base.map(p => [p[0], p[1], 0]).concat(base.map(p => [p[0], p[1], Ldep]));
  const pr = P3.map(proj), xs = pr.map(p => p[0]), ys = pr.map(p => p[1]), pad = o.pad || 9;
  const s = Math.min((w - 2 * pad) / (Math.max(...xs) - Math.min(...xs)), (h - 2 * pad) / (Math.max(...ys) - Math.min(...ys)));
  const ox = x + (w - (Math.max(...xs) - Math.min(...xs)) * s) / 2 - Math.min(...xs) * s, oy = y + (h - (Math.max(...ys) - Math.min(...ys)) * s) / 2 - Math.min(...ys) * s;
  const T = p => { const q = proj(p.length === 3 ? p : [p[0], p[1], 0]); return [ox + q[0] * s, oy + q[1] * s]; };
  const F = base.map(p => T([p[0], p[1], 0])), B = base.map(p => T([p[0], p[1], Ldep])), cen = centroid(F.concat(B)), cf = centroid(F);
  const cv = o.curved || [];
  const vis = i => { const a = base[i], b = base[(i + 1) % n]; return -0.42 * (b[1] - a[1]) + 0.3 * (b[0] - a[0]) < -1e-9; };
  if(!o.noFill) G.poly(F, {fill:SHADE, stroke:false});
  if(o.pre) o.pre(G, T);
  /* かくれた線：辺の上の点から見る人の方へ向かう線が，ほかの面にぶつかるかどうかで決める */
  const DX = 0.42, DY = 0.3, EPS = 1e-4;
  const pip = (q, poly) => { let c = false; for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j]; if((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const hidden = P => {
    const t0 = P[2]; if(t0 > EPS && pip([P[0] + DX * t0, P[1] + DY * t0], base)) return true;
    for(let i = 0; i < n; i++){
      const a = base[i], b = base[(i + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], det = -DX * ey + ex * DY;
      if(Math.abs(det) < 1e-12) continue;
      const rx = a[0] - P[0], ry = a[1] - P[1], t = (rx * -ey + ex * ry) / det, u = (DX * ry - DY * rx) / det, z = P[2] - t;
      if(t > EPS && u > -1e-9 && u < 1 + 1e-9 && z > -1e-9 && z < Ldep + 1e-9) return true;
    }
    return false;
  };
  const edge = (p, q) => {
    const N = 30; let st = null, prev = null;
    const flush = (k1, k2, hid) => { const A = p.map((v, d) => v + (q[d] - v) * k1 / N), B2 = p.map((v, d) => v + (q[d] - v) * k2 / N); G.line(...T(A), ...T(B2), hid ? {w:0.3, dash:[1, 0.8]} : {w:0.4}); };
    for(let k = 0; k <= N; k++){
      const kk = Math.min(N - 0.5, Math.max(0.5, k)), P = p.map((v, d) => v + (q[d] - v) * kk / N), hd = hidden(P);
      if(prev === null){ st = 0; prev = hd; } else if(hd !== prev){ flush(st, k - 0.5, prev); st = k - 0.5; prev = hd; }
    }
    flush(st, N, prev);
  };
  for(let i = 0; i < n; i++){ const j = (i + 1) % n; edge([...base[i], Ldep], [...base[j], Ldep]); }
  for(let i = 0; i < n; i++){
    const pv = (i - 1 + n) % n;
    if(cv[pv] && cv[i] && vis(pv) === vis(i)) continue;
    edge([...base[i], 0], [...base[i], Ldep]);
  }
  for(let i = 0; i < n; i++){ const j = (i + 1) % n; G.line(...F[i], ...F[j], {w:0.4}); }
  for(const [a, b] of o.inner || []) G.line(...T(a), ...T(b), {w:0.3, dash:[1, 0.8]});
  for(const [p, a, b] of o.right || []) angleMark(G, T(p), T(a), T(b), "", fs, {right:true});
  for(const lb of o.labels || []){
    const A = T(lb.a), Bb = T(lb.b);
    if(lb.c) sideLabel(G, A, Bb, lb.t, T(lb.c), fs, {off:lb.off || 1.25}); else sideLabel(G, A, Bb, lb.t, lb.depth ? cen : cf, fs, {off:lb.off || 1.25});
  }
  if(o.dot) G.dot(...T(o.dot), 0.35);
}
const arcPts = (r, a0, a1, k) => Array.from({length:k + 1}, (_, i) => { const t = a0 + (a1 - a0) * i / k; return [r * Math.cos(t), r * Math.sin(t)]; });
const VOLI = "つぎの立体の体積を求めましょう。", VOLIP = "つぎの立体の体積を求めましょう。円周率は3.14とします。";
/* 図＋「式」の場所＋「答え（　　）」 */
function volItem(fw, fh, drawFig, shiki, ans, o){
  const sh = (Array.isArray(shiki) ? shiki : [shiki]).map(parseMk), an = parseMk(ans), nl = Math.max(3, sh.length), qt = o && o.q ? parseMk(o.q) : null;
  const qh = (G, W, fs) => qt ? blockMetrics(G, wrapToks(G, qt, W, fs), fs, 0.3 * fs).h + 0.6 * fs : 0;
  return Object.assign({cat:"fig", n:1,
    minW(G, fs){ return Math.max(fw, 30 * fs / 4.9 * 2.4) + 0.3 * fs; },
    height(G, W, fs){ return qh(G, W, fs) + fh + 0.6 * fs + nl * 1.45 * fs + 2.2 * fs; },
    firstUp(G, W, fs){ return 0.62 * fs; },
    draw(G, x, y, W, fs, ans_){
      if(qt){ const h0 = qh(G, W, fs); drawBlock(G, wrapToks(G, qt, W, fs), x, y, fs, ans_, 0.3 * fs); y += h0; }
      drawFig(G, x, y, fw, fh, fs, ans_);
      let yy = y + fh + 0.6 * fs + 0.7 * fs;
      G.text(knows("式") ? "式" : "しき", x, yy, {size:fs});
      if(ans_) sh.forEach((t, i) => drawToks(G, t, x + 2.2 * fs, yy + i * 1.45 * fs, fs * 0.92, true, RED));
      const ay = y + fh + 0.6 * fs + nl * 1.45 * fs + 1.1 * fs, bw = Math.min(W - 4.5 * fs, Math.max(lineMetrics(G, an, fs).w + 2 * fs, 13 * fs));
      const ax = x + W - bw - 0.6 * fs;
      G.text(knows("答") ? "答え" : "こたえ", ax - 0.3 * fs, ay, {size:fs, align:"right"});
      G.text("（", ax, ay, {size:fs}); G.text("）", ax + bw, ay, {size:fs, align:"right"});
      if(ans_){ const m = lineMetrics(G, an, fs); drawToks(G, an, ax + (bw - m.w) / 2, ay, fs, true, RED); }
    }
  }, o);
}
const volFig = (draw, V, lead, sig, pi, big, shiki) => volItem(FIGW + (big ? 26 : 18), FIGH + (big ? 24 : 16), draw, shiki || `＝${V}`, V + "cm^3", {inst:pi ? VOLIP : VOLI, lead, sig});
const depthLab = (base, L, t) => { const i = base.reduce((bi, p, k) => p[0] - p[1] * 0.01 > base[bi][0] - base[bi][1] * 0.01 ? k : bi, 0), q = base[i]; return {a:[q[0], q[1], 0], b:[q[0], q[1], L], t, depth:true}; };

/* --- 角柱 --- */
function prismBox(lv){
  const W = ri(3, 9), H = ri(3, 8), L = ri(3, 10), b = [[0, 0], [W, 0], [W, H], [0, H]];
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(W)}, {a:b[3], b:b[0], t:cm(H)}, depthLab(b, L, cm(L))], right:[[[0, 0, 0], [1, 0, 0], [0, 1, 0]]]}), W * H * L, "四角柱の体積", "vb" + W + H + L, false, false, `${W}×${H}×${L}＝${W * H * L}`);
}
function prismRightTri(lv){
  for(;;){ const a = ri(3, 10), c = ri(3, 8), L = ri(3, 12); if((a * c * L) % 2) continue; const b = [[0, 0], [a, 0], [0, c]];
    return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(a)}, {a:b[2], b:b[0], t:cm(c)}, depthLab(b, L, cm(L))], right:[[[0, 0, 0], [1, 0, 0], [0, 1, 0]]]}), a * c * L / 2, "三角柱の体積", "vt" + a + c + L, false, false, `${a}×${c}÷2×${L}＝${a * c * L / 2}`); }
}
function prismTri(lv){
  for(;;){ const B = ri(4, lv === 2 ? 14 : 10), H = ri(3, lv === 2 ? 10 : 8), L = ri(4, lv === 2 ? 15 : 12), px = B * pick([0.3, 0.4, 0.6, 0.7]); if((B * H * L) % 2) continue;
    const b = [[0, 0], [B, 0], [px, H]];
    return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(B)}, {a:[px, H], b:[px, 0], t:cm(H), c:[0, H / 2]}, depthLab(b, L, cm(L))], inner:[[[px, H, 0], [px, 0, 0]]], right:[[[px, 0, 0], [px + 1, 0, 0], [px, 1, 0]]]}), B * H * L / 2, "三角柱の体積", "vg" + B + H + L, false, false, `${B}×${H}÷2×${L}＝${B * H * L / 2}`); }
}
function prismTrap(lv){
  for(;;){ const Bl = ri(6, lv === 2 ? 16 : 12), Bu = ri(2, Bl - 2), H = ri(3, lv === 2 ? 10 : 7), L = ri(4, lv === 2 ? 15 : 12); if(((Bu + Bl) * H * L) % 2 || (Bl - Bu) % 2) continue;
    const e = (Bl - Bu) / 2, b = [[0, 0], [Bl, 0], [e + Bu, H], [e, H]];
    return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(Bl)}, {a:b[2], b:b[3], t:cm(Bu)}, {a:[e, H], b:[e, 0], t:cm(H), c:[Bl / 2, H / 2]}, depthLab(b, L, cm(L))], inner:[[[e, H, 0], [e, 0, 0]]], right:[[[e, 0, 0], [e + 1, 0, 0], [e, 1, 0]]]}), (Bu + Bl) * H * L / 2, "四角柱の体積", "vz" + Bl + Bu + H + L, false, false, `（${Bu}＋${Bl}）×${H}÷2×${L}＝${(Bu + Bl) * H * L / 2}`); }
}
function prismPara(lv){
  const B = ri(4, 10), H = ri(3, 7), L = ri(4, 12), sft = Math.max(1, Math.round(B * 0.35)), b = [[0, 0], [B, 0], [B + sft, H], [sft, H]];
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(B)}, {a:[sft, H], b:[sft, 0], t:cm(H), c:[B, H / 2]}, depthLab(b, L, cm(L))], inner:[[[sft, H, 0], [sft, 0, 0]]], right:[[[sft, 0, 0], [sft + 1, 0, 0], [sft, 1, 0]]]}), B * H * L, "四角柱の体積", "vp" + B + H + L, false, false, `${B}×${H}×${L}＝${B * H * L}`);
}
function prismHouse(lv){
  for(;;){ const W = ri(4, 10), H1 = ri(3, 7), H2 = ri(2, 5), L = ri(4, 12); if((W * H2 * L) % 2) continue;
    const b = [[0, 0], [W, 0], [W, H1], [W / 2, H1 + H2], [0, H1]];
    return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(W)}, {a:b[4], b:b[0], t:cm(H1)}, {a:[W / 2, H1 + H2], b:[W / 2, H1], t:cm(H2), c:[W, H1 + H2 / 2]}, depthLab(b, L, cm(L))], inner:[[[W / 2, H1 + H2, 0], [W / 2, H1, 0]], [[0, H1, 0], [W, H1, 0]]], right:[[[0, 0, 0], [1, 0, 0], [0, 1, 0]]]}), W * H1 * L + W * H2 * L / 2, "五角柱の体積", "vh" + W + H1 + H2 + L, false, true, [`底面積　${W}×${H1}＋${W}×${H2}÷2＝${W * H1 + W * H2 / 2}`, `${W * H1 + W * H2 / 2}×${L}＝${W * H1 * L + W * H2 * L / 2}`]); }
}
/* --- 円柱 --- */
function cylStand(lv){
  const r = ri(2, 8), h = ri(3, 12), V = dmul(r * r * h, "3.14"), useD = lv >= 1 && R() < 0.5;
  return volFig((G, x, y, w, hh, fs) => drawCylinder(G, x, y, w, hh, fs, 2 * r, h, !useD), V, "円柱の体積", "cs" + r + h + useD, true, false, `${r}×${r}×3.14×${h}＝${V}`);
}
function cylLying(lv){
  const r = ri(2, 6), L = ri(4, 12), V = dmul(r * r * L, "3.14"), b = arcPts(r, -0.96, 2 * Math.PI - 0.96, 36).slice(0, 36), cv = b.map(() => true);
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {curved:cv, labels:[{a:[0, 0], b:[r * Math.cos(2.3), r * Math.sin(2.3)], t:cm(r), c:[r, -r]}, {a:[r * Math.cos(-0.96), r * Math.sin(-0.96), 0], b:[r * Math.cos(-0.96), r * Math.sin(-0.96), L], t:cm(L), depth:true}], inner:[[[0, 0, 0], [r * Math.cos(2.3), r * Math.sin(2.3), 0]]], dot:[0, 0, 0]}), V, "円柱の体積", "cl" + r + L, true, false, `${r}×${r}×3.14×${L}＝${V}`);
}
function cylHalf(lv){
  const r = ri(2, 8), L = ri(4, 12), V = dmul(r * r * L, "1.57"), b = arcPts(r, 0, Math.PI, 18), cv = b.map((_, i) => i < 18);
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {curved:cv, labels:[{a:[-r, 0], b:[r, 0], t:cm(2 * r), c:[0, r]}, depthLab(b, L, cm(L))]}), V, "円柱を半分にした立体", "ch" + r + L, true, false, `${r}×${r}×3.14÷2×${L}＝${V}`);
}
function cyl34(lv){
  const r = ri(2, 6), L = ri(4, 12), V = dmul(r * r * L, "2.355"), b = arcPts(r, 0, 1.5 * Math.PI, 27).concat([[0, 0]]), cv = b.map((_, i) => i < 27);
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {curved:cv, labels:[{a:[0, 0], b:[r, 0], t:cm(r), c:[0, r]}, depthLab(b, L, cm(L))], right:[[[0, 0, 0], [1, 0, 0], [0, -1, 0]]]}), V, "円柱の一部の体積", "c3" + r + L, true, false, `${r}×${r}×3.14×{3/4}×${L}＝${V}`);
}
function drawHollowCyl(G, x, y, w, h, fs, Rr, r, hh){
  const s = Math.min((w - 18) / (2 * Rr), (h - 14) / (hh + 2 * Rr * 0.4));
  const rx = Rr * s, ry = rx * 0.33, ix = r * s, iy = ix * 0.33, cx = x + w / 2 - 3, top = y + 7 + ry, bot = top + hh * s;
  G.ellipse(cx, top, rx, ry, 0, 2 * Math.PI, {w:0.4});
  G.ellipse(cx, top, ix, iy, 0, 2 * Math.PI, {w:0.4});
  G.ellipse(cx, bot, rx, ry, 0, Math.PI, {w:0.4});
  G.ellipse(cx, bot, rx, ry, Math.PI, 2 * Math.PI, {w:0.3, dash:[1, 0.8]});
  G.ellipse(cx, bot, ix, iy, 0, 2 * Math.PI, {w:0.3, dash:[1, 0.8]});
  G.line(cx - rx, top, cx - rx, bot, {w:0.4}); G.line(cx + rx, top, cx + rx, bot, {w:0.4});
  G.line(cx - ix, top, cx - ix, bot, {w:0.3, dash:[1, 0.8]}); G.line(cx + ix, top, cx + ix, bot, {w:0.3, dash:[1, 0.8]});
  G.dot(cx, top, 0.35);
  G.line(cx, top, cx - ix, top, {w:0.3}); G.text(cm(r), cx - rx * 0.5, top - ry - 1.4, {size:fs * 0.75, align:"center"});
  G.line(cx, top, cx + rx, top, {w:0.3}); G.text(cm(Rr), cx + rx * 0.55, top - ry - 1.4, {size:fs * 0.75, align:"center"});
  drawToks(G, parseMk(cm(hh)), cx + rx + 1.2, (top + bot) / 2, fs * 0.8, false);
}
function cylHollow(lv){
  const Rr = ri(4, 8), r = ri(1, Rr - 2), h = ri(3, 10), V = dmul((Rr * Rr - r * r) * h, "3.14");
  return volFig((G, x, y, w, hh, fs) => drawHollowCyl(G, x, y, w, hh, fs, Rr, r, h), V, "穴のあいた円柱", "ho" + Rr + r + h, true, true, [`${Rr}×${Rr}×3.14×${h}－${r}×${r}×3.14×${h}`, `＝${V}`]);
}
/* --- くふうして求める（へこんだ形・階段の形） --- */
function prismL(lv){
  for(;;){ const W = ri(5, 10), H = ri(5, 9), w2 = ri(2, W - 2), h1 = ri(2, H - 2), L = ri(3, 10);
    const b = [[0, 0], [W, 0], [W, h1], [w2, h1], [w2, H], [0, H]];
    return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(W)}, {a:b[5], b:b[0], t:cm(H)}, {a:b[1], b:b[2], t:cm(h1)}, {a:b[4], b:b[5], t:cm(w2)}, depthLab(b, L, cm(L))], right:[[[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[w2, h1, 0], [w2 + 1, h1, 0], [w2, h1 + 1, 0]]]}), (w2 * H + (W - w2) * h1) * L, "くふうして求める", "vl" + W + H + w2 + h1 + L, false, true, [`${w2}×${H}×${L}＋${W - w2}×${h1}×${L}`, `＝${(w2 * H + (W - w2) * h1) * L}`]); }
}
function prismStairs(lv){
  const sx = ri(2, 5), sy = ri(2, 5), L = ri(3, 8), b = [[0, 0], [3 * sx, 0], [3 * sx, sy], [2 * sx, sy], [2 * sx, 2 * sy], [sx, 2 * sy], [sx, 3 * sy], [0, 3 * sy]];
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(3 * sx)}, {a:b[7], b:b[0], t:cm(3 * sy)}, {a:b[1], b:b[2], t:cm(sy)}, {a:b[2], b:b[3], t:cm(sx)}, {a:b[6], b:b[7], t:cm(sx)}, depthLab(b, L, cm(L))]}), 6 * sx * sy * L, "くふうして求める", "vs" + sx + sy + L, false, true, [`底面積　${sx}×${sy}×6＝${6 * sx * sy}`, `${6 * sx * sy}×${L}＝${6 * sx * sy * L}`]);
}
function prismNotch(lv){ /* 凹の形（まん中がへこんだ形） */
  for(;;){ const a = ri(2, 4), m = ri(2, 4), H = ri(5, 8), d = ri(2, H - 2), L = ri(3, 8), W = 2 * a + m;
    const b = [[0, 0], [W, 0], [W, H], [a + m, H], [a + m, H - d], [a, H - d], [a, H], [0, H]];
    return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(W)}, {a:b[7], b:b[0], t:cm(H)}, {a:b[6], b:b[7], t:cm(a)}, {a:b[4], b:b[5], t:cm(m)}, {a:b[3], b:b[4], t:cm(d)}, depthLab(b, L, cm(L))]}), (W * H - m * d) * L, "くふうして求める", "vn" + a + m + H + d + L, false, true, [`（${W}×${H}－${m}×${d}）×${L}`, `＝${(W * H - m * d) * L}`]); }
}
function prismCross(lv){ /* 十字の形 */
  const a = ri(2, 4), L = ri(2, 6), b = [[a, 0], [2 * a, 0], [2 * a, a], [3 * a, a], [3 * a, 2 * a], [2 * a, 2 * a], [2 * a, 3 * a], [a, 3 * a], [a, 2 * a], [0, 2 * a], [0, a], [a, a]];
  return volFig((G, x, y, w, h, fs) => drawPrismPoly(G, x, y, w, h, fs, b, L, {labels:[{a:b[0], b:b[1], t:cm(a)}, {a:b[2], b:b[3], t:cm(a), c:[2 * a, 0]}, {a:b[3], b:b[4], t:cm(a)}, {a:b[6], b:b[7], t:cm(a)}, {a:b[9], b:b[10], t:cm(a)}, {a:[2 * a, 0, 0], b:[2 * a, 0, L], t:cm(L), depth:true}]}), 5 * a * a * L, "くふうして求める", "vx" + a + L, false, true, [`底面積　${a}×${a}×5＝${5 * a * a}`, `${5 * a * a}×${L}＝${5 * a * a * L}`]);
}
/* 立てた三角柱（直角三角形の底面）・立てた四角柱 */
function prismStandTri(lv){
  for(;;){ const a = ri(3, 9), c = ri(3, 8), hh = ri(4, 12); if((a * c * hh) % 2) continue;
    return volFig((G, x, y, w, h, fs) => drawPrism3(G, x, y, w, h, fs, a, c, "", hh), a * c * hh / 2, "三角柱の体積", "st" + a + c + hh, false, false, `${a}×${c}÷2×${hh}＝${a * c * hh / 2}`); }
}
function prismStandBox(lv){
  const a = ri(3, 9), b = ri(3, 9), hh = ri(4, 12);
  return volFig((G, x, y, w, h, fs) => drawPrism4(G, x, y, w, h, fs, a, b, hh), a * b * hh, "四角柱の体積", "sb" + a + b + hh, false, false, `${a}×${b}×${hh}＝${a * b * hh}`);
}
/* 単位をそろえる円柱・身のまわりの円柱 */
function cylText(lv){
  return scene([
    () => { const t = pick(["1.2", "1.5", "1.8", "2"]), tc = ddiv(t, 10), V = dmul(tc, "3.14"); return W_(`直径が2cm，厚さが${t}mmの円柱の形をしたこう貨があります。このこう貨の体積は何cm^3ですか。円周率は3.14とします。`.replace("厚さ", "あつさ"), [`${t}mm＝${tc}cm`, `1×1×3.14×${tc}＝${V}`], `${V}cm^3`, "単位をそろえて"); },
    () => { const m = pick(["0.5", "1", "1.5", "2"]), lc = dmul(m, 100), V = dmul(lc, "3.14"); return W_(`直径が2cm，長さが${m}mの円柱の形をしたぼうがあります。このぼうの体積は何cm^3ですか。円周率は3.14とします。`, [`${m}m＝${lc}cm`, `1×1×3.14×${lc}＝${V}`], `${V}cm^3`, "単位をそろえて"); },
    () => { const r = ri(3, 8), h = ri(8, 16), obj = pick(["クッキーのかん", "茶づつ", "ペン立て"]), V = dmul(r * r * h, "3.14"); return W_(`半径${r}cm，高さ${h}cmの円柱の形をした${obj}があります。この${obj}の体積は何cm^3ですか。円周率は3.14とします。`, `${r}×${r}×3.14×${h}＝${V}`, `${V}cm^3`, "円柱の体積"); },
    () => { const th = pick(["0.5", "0.8", "1.2"]), n = pick([5, 8, 10, 12]), d = pick([8, 10]), r = d / 2, hh = dmul(th, n), V = dmul(dmul(r * r, hh), "3.14"); return W_(`直径${d}cm，あつさ${th}cmの円の形をしたコースターを${n}まい重ねて，円柱の形にしました。この円柱の体積は何cm^3ですか。円周率は3.14とします。`, [`高さ　${th}×${n}＝${hh}`, `${r}×${r}×3.14×${hh}＝${V}`], `${V}cm^3`, "円柱の体積"); }]);
}
/* --- 水の問題（チャレンジ） --- */
const WATER = "#d5e7f6";
function drawTank(G, x, y, w, h, fs, W, H, D, d, labs){
  const b = [[0, 0], [W, 0], [W, H], [0, H]];
  const pre = d ? (G2, T) => {
    G2.poly([T([0, 0, 0]), T([W, 0, 0]), T([W, d, 0]), T([0, d, 0])], {fill:WATER, stroke:false});
    G2.poly([T([0, d, 0]), T([W, d, 0]), T([W, d, D]), T([0, d, D])], {fill:WATER, stroke:false});
    G2.line(...T([0, d, 0]), ...T([W, d, 0]), {w:0.3}); G2.line(...T([W, d, 0]), ...T([W, d, D]), {w:0.3});
  } : null;
  const L_ = [{a:b[0], b:b[1], t:cm(W)}, {a:b[3], b:b[0], t:cm(H)}, {a:[W, H, 0], b:[W, H, D], t:cm(D), depth:true}];
  if(d) L_.push({a:[W, 0], b:[W, d], t:cm(d)});
  drawPrismPoly(G, x, y, w, h, fs, b, D, {noFill:true, pre, labels:L_.filter((_, i) => !labs || labs.includes(i))});
}
function waterTurn(lv){
  for(;;){ const a = ri(2, 6) * 5, b = ri(10, 30), c = ri(10, 30), d = ri(3, c - 3), nd = b * d / c; if(b === c || !Number.isInteger(nd)) continue;
    const draw = (G, x, y, w, h, fs) => {
      const hw = w / 2;
      drawTank(G, x, y + 4, hw, h - 4, fs, a, c, b, d); drawTank(G, x + hw, y + 4, hw, h - 4, fs, a, b, c, 0);
      G.text("図1", x + 2, y + 2, {size:fs * 0.8}); G.text("図2", x + hw + 2, y + 2, {size:fs * 0.8});
    };
    return volItem(150, FIGH + 30, draw, [`水の体積　${a}×${b}×${d}＝${a * b * d}`, `${a * b * d}÷（${a}×${c}）＝${nd}`], `${nd}cm`,
      {inst:"つぎの問題に答えましょう。", lead:"水の深さ", full:true, sig:"wt" + a + b + c + d, q:`図1のような直方体の形をした入れ物に，深さ${d}cmまで水が入っています。この入れ物を図2のように置きかえると，水の深さは何cmになりますか。入れ物の厚さは考えないものとします。`.replace("厚さ", "あつさ")}); }
}
function waterStone(lv){
  for(;;){ const W = ri(2, 6) * 5, D = ri(2, 6) * 5, c = ri(3, 8), H = ri(15, 30), d = ri(6, H - 6), r10 = c * c * c * 10 / (W * D); if(!Number.isInteger(r10) || r10 < 3) continue;
    const rise = ds(r10, 1), nd = ds(d * 10 + r10, 1), askDepth = R() < 0.5;
    const draw = (G, x, y, w, h, fs) => drawTank(G, x, y, w, h, fs, W, H, D, d);
    return volItem(FIGW + 30, FIGH + 26, draw, askDepth ? [`石の体積　${c}×${c}×${c}＝${c * c * c}`, `${c * c * c}÷（${W}×${D}）＝${rise}`, `${d}＋${rise}＝${nd}`] : [`石の体積　${c}×${c}×${c}＝${c * c * c}`, `${c * c * c}÷（${W}×${D}）＝${rise}`], askDepth ? `${nd}cm` : `${rise}cm`,
      {inst:"つぎの問題に答えましょう。", lead:"水の深さ", full:true, sig:"ws" + W + D + c + d + askDepth, q:`図のような直方体の形をした水そうに，深さ${d}cmまで水が入っています。この中に1辺が${c}cmの立方体の石をしずめると，水面は${askDepth ? "上がって，水の深さは何cmになりますか" : "何cm上がりますか"}。水そうの厚さは考えないものとします。`.replace("厚さ", "あつさ")}); }
}
function waterTri(lv){
  for(;;){ const a = ri(6, 20), b = ri(6, 20), d = ri(4, 12), V2 = a * b * d, p = ri(5, 15), q = ri(5, 15); if(V2 % 2 || ((V2 / 2) * 10) % (p * q)) continue;
    const V = V2 / 2, nd10 = V * 10 / (p * q); if(nd10 < 10 || nd10 > 200) continue;
    return W_(`底面が直角三角形の三角柱の形をした入れ物があります。直角をはさむ2つの辺は${a}cmと${b}cmです。三角形の面を下にして，深さ${d}cmまで水を入れました。この水を全部，内のりがたて${p}cm，横${q}cmの直方体の入れ物にうつすと，水の深さは何cmになりますか。`, [`水の体積　${a}×${b}÷2×${d}＝${V}`, `${V}÷（${p}×${q}）＝${ds(nd10, 1)}`], `${ds(nd10, 1)}cm`, "水の深さ"); }
}
function waterCyl(lv){
  for(;;){ const r = ri(5, 15), d = ri(5, 20), V = dmul(r * r * d, "3.14"); const Lr = ddiv(V, 1000); if(!Lr) continue;
    return W_(`内側の半径が${r}cmの円柱の形をした入れ物に，深さ${d}cmまで水を入れました。水の体積は何cm^3ですか。また，それは何Lですか。円周率は3.14とします。`, [`${r}×${r}×3.14×${d}＝${V}`, `${V}cm^3＝${Lr}L`], `${V}cm^3，${Lr}L`, "水の体積"); }
}
/* --- およその体積（身のまわりのもの） --- */
function approxVol(lv){
  return scene([
    () => { const d = pick([6, 7, 8, 9]), h = ri(10, 16), V = dmul((d / 2) * (d / 2) * h, "3.14"); return W_(`直径が${d}cm，高さが${h}cmのカップがあります。円柱とみて，およその体積を求めましょう。円周率は3.14とします。`, `${d / 2}×${d / 2}×3.14×${h}＝${V}`, `約${V}cm^3`, "およその体積"); },
    () => { const a = ri(18, 25), b = ri(5, 8), c = ri(2, 4); return W_(`たて${b}cm，横${a}cm，高さ${c}cmくらいの筆箱があります。直方体とみて，およその体積を求めましょう。`, `${b}×${a}×${c}＝${a * b * c}`, `約${a * b * c}cm^3`, "およその体積"); },
    () => { const d = pick([10, 12, 14, 16]), h = ri(5, 8), V = dmul((d / 2) * (d / 2) * h, "3.14"); return W_(`直径が${d}cm，高さが${h}cmの丸いケーキがあります。円柱とみて，およその体積を求めましょう。円周率は3.14とします。`, `${d / 2}×${d / 2}×3.14×${h}＝${V}`, `約${V}cm^3`, "およその体積"); },
    () => { for(;;){ const t = ri(20, 30), u = ri(30, 40), hh = ri(20, 30), L = ri(50, 70); if(((t + u) * hh * L) % 2) continue; return W_(`衣装ケースを，底面が上の辺${t}cm，下の辺${u}cm，高さ${hh}cmの台形で，長さが${L}cmの四角柱とみます。およその容積を求めましょう。`, `（${t}＋${u}）×${hh}÷2×${L}＝${(t + u) * hh * L / 2}`, `約${(t + u) * hh * L / 2}cm^3`, "およその体積"); } }]);
}
(function(){
  const U = U6.find(u => u.id === "6-10");
  U.subs = [
    {id:"a", name:"角柱の体積", gen(lv){ return lv === 0 ? scene([() => prismBox(lv), () => prismRightTri(lv), () => prismStandTri(lv), () => prismStandBox(lv)]) : lv === 1 ? scene([() => prismTri(lv), () => prismTrap(lv), () => prismPara(lv)]) : scene([() => prismTri(lv), () => prismTrap(lv), () => prismHouse(lv)]); }},
    {id:"b", name:"円柱の体積", gen(lv){ if(lv === 0) return cylStand(lv); if(lv === 1) return scene([() => cylStand(lv), () => cylLying(lv), () => cylText(lv)]);
      return scene([() => cylHalf(lv), () => cylText(lv), () => waterCyl(lv), () => { const r = ri(2, 8), h = ri(3, 12), C = dmul(2 * r, "3.14"), V = dmul(r * r * h, "3.14"); return W_(`底面の円周が${C}cm，高さが${h}cmの円柱の体積を求めましょう。円周率は3.14とします。`, [`半径　${C}÷3.14÷2＝${r}`, `${r}×${r}×3.14×${h}＝${V}`], `${V}cm^3`, "円柱の体積"); }]); }},
    {id:"c", name:"くふうして求める", gen(lv){ return lv === 0 ? prismL(lv) : lv === 1 ? scene([() => prismStairs(lv), () => prismL(lv), () => prismNotch(lv), () => prismCross(lv)]) : scene([() => cylHollow(lv), () => cyl34(lv), () => prismNotch(lv), () => prismCross(lv), () => waterTurn(lv), () => waterStone(lv), () => waterTri(lv)]); }},
    {id:"d", name:"およその体積", gen(lv){ return approxVol(lv); }}
  ];
})();
