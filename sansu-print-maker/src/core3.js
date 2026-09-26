/* ================= 図の問題（5年） ================= */
const D2R = Math.PI / 180;
const FIGW = 48, FIGH = 32;
const cm = v => v + "cm";

/* 表（比例・データなど）：本文＋表＋問い */
function tableItem(text, rows, subs, o){
  o = o || {};
  const tt = text ? parseMk(text) : null;
  const rt = rows.map(r => r.map(c => parseMk(String(c))));
  const it = Object.assign({cat:"fig", full:true, sig:(text || "") + JSON.stringify(rows),
    subs:subs.map(parseMk),
    get n(){ return this.subs.length; },
    get selfNum(){ return this.subs.length > 1; },
    trim(k){ this.subs = this.subs.slice(0, Math.max(1, k)); },
    minW(){ return 9999; },
    tdims(G, fs){
      const cols = rt[0].length, cw = [];
      for(let c = 0; c < cols; c++) cw[c] = Math.max(c === 0 ? 3 * fs : 2.6 * fs, ...rt.map(r => lineMetrics(G, r[c], fs * 0.92).w + 1.2 * fs));
      const rh = rt.map(r => Math.max(1.75 * fs, ...r.map(c => { const m = lineMetrics(G, c, fs * 0.92); return m.up + m.dn + 0.5 * fs; })));
      return {cw, rh, w:cw.reduce((a, b) => a + b, 0), h:rh.reduce((a, b) => a + b, 0)};
    },
    parts(G, W, fs){
      const tl = tt ? wrapToks(G, tt, W, fs) : null;
      const th = tl ? blockMetrics(G, tl, fs, 0.3 * fs).h + 0.6 * fs : 0;
      const td = this.tdims(G, fs);
      const sh = this.subs.reduce((h, s) => { const m = lineMetrics(G, s, fs); return h + m.up + m.dn + 0.7 * fs; }, 0);
      return {tl, th, td, sh};
    },
    height(G, W, fs){ const p = this.parts(G, W, fs); return p.th + p.td.h + 0.8 * fs + p.sh - 0.7 * fs; },
    firstUp(G, W, fs){ return 0.62 * fs; },
    draw(G, x, y, W, fs, ans, num){
      const p = this.parts(G, W, fs);
      if(p.tl) drawBlock(G, p.tl, x, y, fs, ans, 0.3 * fs);
      let yy = y + p.th, xx = x + (o.center ? Math.max(0, (W - p.td.w) / 2) : 0.5 * fs);
      rt.forEach((r, ri_) => {
        let cx = xx;
        r.forEach((c, ci) => {
          const w = p.td.cw[ci], h = p.td.rh[ri_];
          G.rect(cx, yy, w, h, {w:0.3, fill:ci === 0 || (o.headRow && ri_ === 0) ? "#f0f0f0" : null});
          const m = lineMetrics(G, c, fs * 0.92);
          drawToks(G, c, cx + (w - m.w) / 2, yy + h / 2, fs * 0.92, ans);
          cx += w;
        });
        yy += p.td.rh[ri_];
      });
      yy += 0.8 * fs;
      const multi = this.subs.length > 1;
      this.subs.forEach((s, i) => {
        const m = lineMetrics(G, s, fs); yy += m.up;
        if(multi) drawNum(G, x, yy, num + i, fs);
        drawToks(G, s, x + (multi ? NUMW(fs) : 0), yy, fs, ans);
        yy += m.dn + 0.7 * fs;
      });
    }
  }, o);
  return it;
}

/* 三角形の角 */
function genTriAngle(lv){
  let al, be, ga;
  if(lv === 1){ al = 2 * ri(15, 50); be = ga = (180 - al) / 2; }
  else do{ be = ri(35, 85); ga = ri(35, 85); al = 180 - be - ga; } while(al < 30 || al > 110);
  const B = [0, 0], C = [10, 0], ab = 10 * Math.sin(ga * D2R) / Math.sin(al * D2R);
  let A = [ab * Math.cos(be * D2R), -ab * Math.sin(be * D2R)];
  let pts = [A, B, C];
  let C2 = null;
  if(lv === 2) C2 = [15, 0];
  const flip = R() < 0.5;
  if(flip){ pts = pts.map(p => [-p[0], p[1]]); if(C2) C2 = [-C2[0], C2[1]]; }
  const ang = [al, be, ga];
  let unknown, shown, ansV, ext = 0;
  if(lv === 0){ unknown = ri(0, 2); ansV = ang[unknown]; }
  else if(lv === 1){ unknown = R() < 0.5 ? 0 : ri(1, 2); ansV = ang[unknown]; }
  else { unknown = 0; ext = 180 - ga; ansV = ext - be; }
  const draw = (G, x, y, w, h, fs, ans) => {
    const all = C2 ? pts.concat([C2]) : pts;
    const f = fitPts(all, x, y, w, h, 5.5);
    const [a, b, c] = f.pts, c2 = C2 ? f.pts[3] : null, cen = centroid([a, b, c]);
    if(c2) G.line(c[0], c[1], c2[0], c2[1], {w:0.35});
    G.poly([a, b, c], {w:0.4});
    const P = [a, b, c], nb = i => [P[(i + 1) % 3], P[(i + 2) % 3]];
    if(lv === 1){ tick(G, a, b, 1, fs); tick(G, a, c, 1, fs); }
    for(let i = 0; i < 3; i++){
      if(lv === 2 && i === 2) continue;
      if(i === unknown) angleMark(G, P[i], ...nb(i), "ア", fs);
      else if(lv === 1 && unknown !== 0 && i !== 0 && i !== unknown) continue;
      else if(lv === 1 && unknown === 0 && i === 2) continue;
      else angleMark(G, P[i], ...nb(i), ang[i] + "°", fs);
    }
    if(lv === 2) angleMark(G, c, a, c2, ext + "°", fs);
  };
  return figItem(FIGW, FIGH, draw, "ア((" + ansV + "°))", {inst:"アの角度は何度ですか。計算で求めましょう。", lead:"アの角度"});
}

/* 四角形の角 */
function genQuadAngle(lv){
  let pts, ang;
  for(let tries = 0; tries < 200; tries++){
    if(lv === 1){
      const a = ri(8, 12), h2 = ri(5, 9), h = ri(5, 9), s = pick([-3, -2, 2, 3, 4, 5]);
      if(Math.abs(h - h2) < 2) continue;
      pts = [[0, 0], [a, 0], [a - s, -h], [0, -h2]];
    } else {
      const th = []; let t = R() * 360; const gaps = [0, 0, 0, 0].map(() => 60 + R() * 60), sg = gaps.reduce((p, q) => p + q, 0);
      for(let i = 0; i < 4; i++){ th.push(t); t += gaps[i] / sg * 360; }
      pts = th.map(d => { const r = 0.85 + R() * 0.3; return [1.25 * r * Math.cos(d * D2R) * 10, 0.9 * r * Math.sin(d * D2R) * 10]; });
    }
    ang = pts.map((p, i) => angAt(p, pts[(i + 3) % 4], pts[(i + 1) % 4]));
    const sl = pts.map((p, i) => len(sub(pts[(i + 1) % 4], p)));
    if(ang.every(v => v > 55 && v < 140) && Math.min(...sl) > 0.6 * Math.max(...sl) && Math.abs(ang.reduce((p, q) => p + q, 0) - 360) < 0.5) break;
  }
  const rd = ang.map(Math.round);
  const unknown = lv === 1 ? ri(1, 3) : ri(0, 3);
  const extAt = lv === 2 ? (unknown + ri(1, 3)) % 4 : -1;
  let ansV = 360; for(let i = 0; i < 4; i++) if(i !== unknown) ansV -= (lv === 1 && i === 0) ? 90 : rd[i];
  let ext = extAt >= 0 ? 180 - rd[extAt] : 0;
  const draw = (G, x, y, w, h, fs, ans) => {
    let extra = [];
    if(extAt >= 0){ const p = pts[extAt], q = pts[(extAt + 3) % 4]; extra = [add(p, mul(unit(sub(p, q)), 5))]; }
    const f = fitPts(pts.concat(extra), x, y, w, h, 5.5), P = f.pts.slice(0, 4);
    if(extAt >= 0) G.line(...P[extAt], ...f.pts[4], {w:0.35});
    G.poly(P, {w:0.4});
    for(let i = 0; i < 4; i++){
      const nb = [P[(i + 3) % 4], P[(i + 1) % 4]];
      if(i === unknown) angleMark(G, P[i], ...nb, "ア", fs);
      else if(lv === 1 && i === 0) angleMark(G, P[i], ...nb, "", fs, {right:true});
      else if(i === extAt) angleMark(G, P[i], f.pts[4], nb[1], ext + "°", fs);
      else angleMark(G, P[i], ...nb, rd[i] + "°", fs);
    }
  };
  return figItem(FIGW, FIGH, draw, "ア((" + ansV + "°))", {inst:"アの角度は何度ですか。計算で求めましょう。", lead:"アの角度"});
}

/* 合同な三角形 */
function makeTri(){
  for(;;){
    const a = ri(4, 9), b = ri(3, 9), c = ri(3, 9);
    if(a === b || b === c || a === c) continue;
    if(a < Math.max(b, c) - 1) continue;
    if(a + b <= c + 1.5 || a + c <= b + 1.5 || b + c <= a + 1.5) continue;
    const x = (c * c + a * a - b * b) / (2 * a), yy = Math.sqrt(c * c - x * x);
    const A = [x, -yy], B = [0, 0], C = [a, 0];
    const angs = [angAt(A, B, C), angAt(B, A, C), angAt(C, A, B)];
    if(angs.some(v => v < 32 || v > 112)) continue;
    return {a, b, c, pts:[A, B, C], angs};
  }
}
function genCongruent(lv, kind){
  const T = makeTri();
  const th = (lv === 0 ? pick([180, 0, 180]) : ri(60, 300)) * D2R, refl = lv === 2 || (lv === 1 && R() < 0.3);
  const t2 = T.pts.map(p => { const q = refl ? [-p[0], p[1]] : p; return [q[0] * Math.cos(th) - q[1] * Math.sin(th), q[0] * Math.sin(th) + q[1] * Math.cos(th)]; });
  const N1 = ["A", "B", "C"], L2 = shuffle(["D", "E", "F"]);
  const sideName = (i, j) => N1[i] + N1[j], side2 = (i, j) => L2[i] + L2[j];
  const sideLen = (i, j) => { const k = 3 - i - j; return [T.a, T.b, T.c][k]; };
  const angR = T.angs.map(Math.round);
  let subs = [], shows = {sides:[], angs:[]};
  if(kind === "corr"){
    const vs = shuffle([0, 1, 2]);
    const cand = [
      "【頂|ちょう】点" + N1[vs[0]] + "に対応する【頂|ちょう】点((【頂|ちょう】点" + L2[vs[0]] + "))",
      "【頂|ちょう】点" + L2[vs[1]] + "に対応する【頂|ちょう】点((【頂|ちょう】点" + N1[vs[1]] + "))",
      "辺" + sideName(vs[0], vs[2]) + "に対応する辺((辺" + side2(vs[0], vs[2]) + "))",
      "辺" + side2(vs[1], vs[2]) + "に対応する辺((辺" + sideName(vs[1], vs[2]) + "))",
      "角" + N1[vs[2]] + "に対応する角((角" + L2[vs[2]] + "))"
    ];
    subs = lv === 0 ? [cand[0], cand[2], cand[4]] : lv === 1 ? [cand[0], cand[1], cand[2], cand[4]] : cand;
  } else {
    /* 三角形ABCに辺BC・ABと角B・角Cを書く */
    shows.sides = [[1, 2], [0, 1]]; shows.angs = [1, 2];
    subs.push("辺" + side2(1, 2) + "((" + cm(T.a) + "))");
    subs.push("辺" + side2(0, 1) + "((" + cm(T.c) + "))");
    subs.push("角" + L2[1] + "((" + angR[1] + "°))");
    if(lv >= 1) subs.push("角" + L2[2] + "((" + angR[2] + "°))");
    if(lv === 2) subs.push("角" + L2[0] + "((" + (180 - angR[1] - angR[2]) + "°))");
    subs = shuffle(subs);
  }
  const fw = 90, fh = 44;
  const draw = (G, x, y, w, h, fs, ans) => {
    const s = Math.min(fitScale(T.pts, w / 2 - 2, h, 6), fitScale(t2, w / 2 - 2, h, 6));
    const f1 = fitPts(T.pts, x, y, w / 2, h, 6, s), f2 = fitPts(t2, x + w / 2, y, w / 2, h, 6, s);
    for(const [f, names] of [[f1, N1], [f2, L2]]){
      G.poly(f.pts, {fill:SHADE, w:0.4});
      const cen = centroid(f.pts);
      f.pts.forEach((p, i) => vLabel(G, p, cen, names[i], fs));
    }
    const P = f1.pts, cen = centroid(P);
    for(const [i, j] of shows.sides) sideLabel(G, P[i], P[j], cm(sideLen(i, j)), cen, fs);
    for(const i of shows.angs) angleMark(G, P[i], P[(i + 1) % 3], P[(i + 2) % 3], angR[i] + "°", fs);
  };
  const inst = kind === "corr" ? "下の2つの三角形は合同です。対応する【頂|ちょう】点，辺，角を答えましょう。" : "下の2つの三角形は合同です。つぎの辺の長さや角の大きさを答えましょう。";
  return setItem(fw, fh, draw, subs, {inst, lead:"合同な三角形"});
}

/* 面積の図 */
function genArea(kind, lv){
  let pts, S, dims = [], hLine = null, ext = null, diag = null, extraSide = null;
  const dec = lv === 1 && kind !== "rhombus" ? R() < 0.5 : false;
  const v = (lo, hi) => dec ? rdec(lo * 10, hi * 10, 1) : String(ri(lo, hi));
  if(kind === "para"){
    let b = v(4, 9), h = v(3, 6); const bn = +b, hn = +h;
    let s = lv === 2 ? bn + ri(1, 3) : ri(1, Math.max(1, Math.floor(bn / 2)));
    if(lv === 1 && !dec){ const tr = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]]); s = tr[0] > bn - 1 ? 2 : tr[0]; }
    pts = [[s, 0], [s + bn, 0], [bn, hn], [0, hn]];
    S = dmul(b, h);
    dims = [[3, 2, cm(b)]]; hLine = [[s, 0], [s, hn], cm(h)];
    if(lv === 2) ext = [[bn, hn], [s, hn]];
    if(lv === 1 && !dec){ const sl = Math.round(Math.hypot(s, hn) * 10) / 10; extraSide = [[0, 3], ds(Math.round(sl * 10), 1)]; }
  } else if(kind === "tri"){
    const b = v(4, 10), h = v(3, 8), bn = +b, hn = +h;
    const s = lv === 2 ? bn + ri(1, 3) : ri(1, Math.max(1, Math.floor(bn) - 1));
    pts = [[s, 0], [bn, hn], [0, hn]];
    S = ds(dparse(dmul(b, h))[0] * 5, dparse(dmul(b, h))[1] + 1);
    dims = [[1, 2, cm(b)]]; hLine = [[s, 0], [s, hn], cm(h)];
    if(lv === 2) ext = [[bn, hn], [s, hn]];
  } else if(kind === "trap"){
    const a = v(2, 6), b = v(+a + 2, 11), h = v(3, 6), an = +a, bn = +b, hn = +h;
    const s = lv === 2 ? 0 : ri(0, Math.max(0, Math.floor(bn - an)));
    pts = [[s, 0], [s + an, 0], [bn, hn], [0, hn]];
    const pr = dparse(dmul(dadd(a, b), h)); S = ds(pr[0] * 5, pr[1] + 1);
    dims = [[0, 1, cm(a)], [3, 2, cm(b)]];
    hLine = s === 0 ? [[0, 0], [0, hn], cm(h), true] : [[s, 0], [s, hn], cm(h)];
  } else {
    const p = String(ri(4, 10)), q = String(ri(3, 8)), pn = +p, qn = +q;
    const cx = lv === 2 ? pn * (0.25 + R() * 0.15) : pn / 2;
    pts = lv === 2 ? [[0, qn / 2], [cx, 0], [pn, qn / 2], [cx, qn]] : [[0, qn / 2], [pn / 2, 0], [pn, qn / 2], [pn / 2, qn]];
    S = ds(pn * qn * 5, 1);
    diag = [[[0, qn / 2], [pn, qn / 2], cm(p)], [[cx, 0], [cx, qn], cm(q)]];
  }
  const draw = (G, x, y, w, h, fs, ans) => {
    const all = pts.concat(ext ? [ext[1]] : []);
    const f = fitPts(all, x, y, w, h, 6.5), s = f.s;
    const T = p => [f.pts[0][0] + (p[0] - pts[0][0]) * s, f.pts[0][1] + (p[1] - pts[0][1]) * s];
    const P = pts.map(T), cen = centroid(P);
    G.poly(P, {w:0.4});
    if(ext) G.line(...T(ext[0]), ...T(ext[1]), {w:0.3, dash:[1, 0.8]});
    for(const [i, j, lab] of dims) sideLabel(G, P[i], P[j], lab, cen, fs);
    if(extraSide) sideLabel(G, P[extraSide[0][0]], P[extraSide[0][1]], cm(extraSide[1]), cen, fs);
    if(hLine){
      const a = T(hLine[0]), b = T(hLine[1]);
      if(!hLine[3]) G.line(...a, ...b, {w:0.3, dash:[1, 0.8]});
      const q = 0.5 * fs, dir = ext ? -1 : 1;
      G.poly([[b[0] + dir * q, b[1]], [b[0] + dir * q, b[1] - q], [b[0], b[1] - q]], {close:false, w:0.25});
      const toks = parseMk(hLine[2]), lm = lineMetrics(G, toks, fs * 0.85);
      const lx = a[0] > cen[0] + 0.5 && !ext ? a[0] - lm.w - 0.45 * fs : a[0] + 0.45 * fs;
      drawToks(G, toks, hLine[3] ? a[0] - lm.w - 0.6 * fs : lx, (a[1] + b[1]) / 2, fs * 0.85, false);
    }
    if(diag){
      for(const [p1, p2, lab] of diag){
        const a = T(p1), b = T(p2); G.line(...a, ...b, {w:0.3, dash:[1, 0.8]});
      }
      const c = T([diag[1][0][0], diag[0][0][1]]);
      G.poly([[c[0] + 0.5 * fs, c[1]], [c[0] + 0.5 * fs, c[1] - 0.5 * fs], [c[0], c[1] - 0.5 * fs]], {close:false, w:0.25});
      const l1 = parseMk(diag[0][2]), l2 = parseMk(diag[1][2]);
      const a0 = T(diag[0][0]), a1 = T(diag[0][1]);
      drawToks(G, l1, (a0[0] + a1[0]) / 2 + (lv === 2 ? 2.5 * fs : 1.2 * fs), a0[1] + 0.8 * fs, fs * 0.85, false);
      const b0 = T(diag[1][0]);
      drawToks(G, l2, b0[0] + 0.6 * fs, b0[1] + 1.4 * fs, fs * 0.85, false);
    }
  };
  const name = {para:"平行四辺形", tri:"三角形", trap:"台形", rhombus:lv === 2 ? "四角形" : "ひし形"}[kind];
  return figItem(FIGW + 4, FIGH, draw, "((" + S + "cm^2))", {inst:"つぎの図形の面積を求めましょう。", lead:name + "の面積"});
}

/* 円周 */
function genCircle(lv){
  const d = ri(2, 12) * (lv === 1 ? 2 : 1);
  const draw = (G, x, y, w, h, fs, ans) => {
    const r = Math.min(w, h) / 2 - 3, cx = x + w / 2, cy = y + h / 2 + (lv === 2 ? r / 2 : 0);
    if(lv === 2){
      G.arc(cx, cy, r, Math.PI, 2 * Math.PI, {w:0.4}); G.line(cx - r, cy, cx + r, cy, {w:0.4});
      drawToks(G, parseMk(cm(d)), cx - G.width(cm(d), fs * 0.85) / 2, cy + 0.9 * fs, fs * 0.85, false);
      return;
    }
    G.arc(cx, cy, r, 0, 2 * Math.PI, {w:0.4}); G.dot(cx, cy, 0.35);
    if(lv === 0){ G.line(cx - r, cy, cx + r, cy, {w:0.3}); G.text(cm(d), cx + r / 2, cy - 0.8 * fs, {size:fs * 0.85, align:"center"}); }
    else { G.line(cx, cy, cx + r * 0.8, cy - r * 0.6, {w:0.3}); G.text(cm(d / 2), cx + r * 0.1, cy - r * 0.55, {size:fs * 0.85, align:"center"}); }
  };
  const c = dmul(String(d), "3.14");
  const ansV = lv === 2 ? ds(d * 157 + d * 100, 2) : c;
  return figItem(FIGW - 8, FIGH, draw, (lv === 2 ? "まわりの長さ" : "円周") + "((" + cm(ansV) + "))",
    {inst:lv === 2 ? "つぎの図形のまわりの長さを求めましょう。円周率は3.14とします。" : "つぎの円の円周の長さを求めましょう。円周率は3.14とします。", lead:lv === 2 ? "半円のまわりの長さ" : "円周"});
}

/* 直方体・立方体・L字の立体 */
function proj(p){ return [p[0] + p[2] * 0.42, -p[1] - p[2] * 0.3]; }
function genBox(lv, lshape){
  let W, H, D, V, h1, w2, unitS = "cm";
  if(lshape){
    W = ri(6, 10); H = ri(5, 8); D = ri(3, 6); h1 = ri(2, H - 2); w2 = ri(2, W - 3);
    V = w2 * H * D + (W - w2) * h1 * D;
  } else if(lv === 0 && R() < 0.4){ W = H = D = ri(3, 9); V = W * W * W; }
  else if(lv === 2){ unitS = "m"; W = rdec(10, 40, 1); H = ri(1, 3); D = ri(2, 5); V = +dmul(dmul(W, String(H)), String(D)); }
  else { W = ri(4, lv === 1 ? 15 : 9); H = ri(3, lv === 1 ? 12 : 8); D = ri(3, lv === 1 ? 12 : 8); V = W * H * D; }
  const Wn = +W, Hn = +H, Dn = +D;
  const draw = (G, x, y, w, h, fs, ans) => {
    let P3, vis, hid = [], labels;
    if(lshape){
      const F = [[0, 0], [Wn, 0], [Wn, h1], [w2, h1], [w2, Hn], [0, Hn]];
      const f = F.map(p => [p[0], p[1], 0]), b = F.map(p => [p[0], p[1], Dn]);
      P3 = f.concat(b);
      vis = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [5, 11], [4, 10], [3, 9], [2, 8], [1, 7], [11, 10], [10, 9], [9, 8], [8, 7]];
      labels = [[0, 1, cm(W)], [0, 5, cm(H)], [1, 2, cm(h1)], [5, 4, cm(w2)], [1, 7, cm(D)]];
    } else {
      P3 = [[0, 0, 0], [Wn, 0, 0], [Wn, Hn, 0], [0, Hn, 0], [0, 0, Dn], [Wn, 0, Dn], [Wn, Hn, Dn], [0, Hn, Dn]];
      vis = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 7], [2, 6], [1, 5], [7, 6], [6, 5]];
      hid = [[0, 4], [4, 5], [4, 7]];
      labels = [[0, 1, W + unitS], [1, 5, D + unitS], [1, 2, H + unitS]];
      if(W === H && H === D && !lshape) labels = [[0, 1, W + unitS]];
    }
    const f = fitPts(P3.map(proj), x, y, w, h, 6.5), P = f.pts, cen = centroid(P);
    for(const [i, j] of hid) G.line(...P[i], ...P[j], {w:0.3, dash:[1, 0.8]});
    for(const [i, j] of vis) G.line(...P[i], ...P[j], {w:0.4});
    for(const [i, j, lab] of labels) sideLabel(G, P[i], P[j], lab, cen, fs);
  };
  const Vs = typeof V === "number" ? String(V) : V;
  const lead = lshape ? "いろいろな形の体積" : "体積";
  return figItem(FIGW + 4, FIGH + 2, draw, "((" + Vs + unitS + "^3))", {inst:"つぎの立体の体積を求めましょう。", lead});
}

/* 円グラフ・帯グラフ */
const GRAPH_THEMES = [
  {t:"5年生のすきなスポーツ", items:["サッカー", "野球", "水泳", "なわとび"], u:"人"},
  {t:"5年生のすきな給食", items:["カレー", "あげパン", "ラーメン", "サラダ"], u:"人"},
  {t:"図書室でかりた本の種類", items:["物語", "図かん", "れきし", "まんが"], u:"さつ"},
  {t:"家でかっている動物", items:["犬", "ねこ", "金魚", "鳥"], u:"人"}
];
function makeShares(lv){
  for(;;){
    const step = lv === 0 ? 5 : 1;
    const other = step === 5 ? pick([5, 10]) : ri(4, 9);
    let rest = 100 - other, vals = [];
    for(let i = 0; i < 3; i++){ const v = Math.round(ri(12, Math.min(45, rest - 12 * (3 - i))) / step) * step; vals.push(v); rest -= v; }
    vals.push(rest);
    if(vals.some(v => v < 12)) continue;
    vals.sort((a, b) => b - a);
    if(new Set(vals).size < 4) continue;
    return vals.concat([other]);
  }
}
function genGraph(kind, lv){
  const th = pick(GRAPH_THEMES), names = shuffle(th.items), vals = makeShares(lv);
  const lab = names.concat(["その他"]);
  const subs = [];
  const i1 = ri(0, 3); subs.push(lab[i1] + "の【割|わり】合は何%ですか。((" + vals[i1] + "%))");
  let i2; do{ i2 = ri(0, 3); } while(i2 === i1);
  subs.push(lab[i2] + "の【割|わり】合は何%ですか。((" + vals[i2] + "%))");
  if(lv >= 1){
    const pairs = []; for(let a = 0; a < 4; a++) for(let b = 0; b < 4; b++) if(a !== b && vals[a] > vals[b] && (vals[a] * 10) % vals[b] === 0) pairs.push([a, b]);
    if(pairs.length){ const [a, b] = pick(pairs); subs.push(lab[a] + "は，" + lab[b] + "の何倍ですか。((" + ds(vals[a] * 10 / vals[b], 1) + "倍))"); }
  }
  if(lv === 2){ const tot = pick([200, 300, 400, 500]), i3 = ri(0, 3); subs.push("全体が" + tot + th.u + "のとき，" + lab[i3] + "は何" + th.u + "ですか。((" + tot * vals[i3] / 100 + th.u + "))"); }
  const text = "下の" + (kind === "pie" ? "円グラフ" : "帯グラフ") + "は，" + th.t + "を調べて，【割|わり】合を表したものです。";
  if(kind === "pie"){
    const draw = (G, x, y, w, h, fs) => {
      const r = Math.min(w, h) / 2 - 3.5, cx = x + w / 2, cy = y + h / 2;
      let a = -Math.PI / 2;
      vals.forEach((v, i) => {
        const a1 = a + v / 100 * 2 * Math.PI;
        G.arc(cx, cy, r, a, a1, {fill:i % 2 ? "#ffffff" : "#eeeeee", stroke:false});
        G.line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), {w:0.35});
        const am = (a + a1) / 2, lr = v < 10 ? r * 0.78 : r * 0.6;
        G.text(lab[i], cx + lr * Math.cos(am), cy + lr * Math.sin(am), {size:fs * (v < 10 ? 0.55 : 0.68), align:"center"});
        a = a1;
      });
      G.arc(cx, cy, r, 0, 2 * Math.PI, {w:0.4});
      for(let t = 0; t < 100; t++){
        const ang = -Math.PI / 2 + t / 100 * 2 * Math.PI, l = t % 10 === 0 ? 1.6 : t % 5 === 0 ? 1.1 : 0.6;
        G.line(cx + r * Math.cos(ang), cy + r * Math.sin(ang), cx + (r + l) * Math.cos(ang), cy + (r + l) * Math.sin(ang), {w:0.15});
        if(t % 10 === 0) G.text(String(t), cx + (r + 2.9) * Math.cos(ang), cy + (r + 2.9) * Math.sin(ang), {size:fs * 0.45, align:"center"});
      }
    };
    return setItem(58, 58, draw, subs, {inst:"つぎの問題に答えましょう。", lead:"円グラフ", text});
  }
  const draw = (G, x, y, w, h, fs) => {
    const bx = x + 2, bw = w - 4, by = y + 2, bh = 9;
    let cx = bx;
    vals.forEach((v, i) => {
      const ww = bw * v / 100;
      G.rect(cx, by, ww, bh, {w:0.35, fill:i % 2 ? "#ffffff" : "#eeeeee"});
      G.text(lab[i], cx + ww / 2, by + bh / 2, {size:fs * (v < 10 ? 0.5 : 0.68), align:"center"});
      cx += ww;
    });
    for(let t = 0; t <= 100; t++){
      const tx = bx + bw * t / 100, l = t % 10 === 0 ? 2 : t % 5 === 0 ? 1.3 : 0.7;
      G.line(tx, by + bh, tx, by + bh + l, {w:0.15});
      if(t % 10 === 0) G.text(String(t), tx, by + bh + 3.6, {size:fs * 0.5, align:"center"});
    }
    G.text("(%)", bx + bw, by + bh + 6.2, {size:fs * 0.5, align:"right"});
  };
  return setItem(150, 20, draw, subs, {inst:"つぎの問題に答えましょう。", lead:"帯グラフ", text, stack:true});
}

/* ================= かく問題（作図・展開図） ================= */
/* 左に図、右（入らなければ下）に大きめのかくらん */
function drawItem(fw, fh, drawFig, bw, bh, drawAns, o){
  return Object.assign({cat:"fig", n:1, full:true,
    minW(){ return 9999; },
    side(W){ return W - fw - 6 >= bw; },
    height(G, W, fs){ return this.side(W) ? Math.max(fh, bh) : fh + 0.8 * fs + bh; },
    firstUp(G, W, fs){ return 0.62 * fs; },
    draw(G, x, y, W, fs, ans){
      drawFig(G, x, y, fw, fh, fs);
      const side = this.side(W), bx = side ? x + W - bw : x, by = side ? y : y + fh + 0.8 * fs;
      G.rect(bx, by, bw, bh, {w:0.35});
      if(ans) drawAns(G, bx, by, bw, bh, fs);
    }
  }, o || {});
}
/* 図形を実際の大きさ（1cm＝10mm）で四角の中にかく */
function realPlace(pts, bx, by, bw, bh){
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const w = (Math.max(...xs) - Math.min(...xs)) * 10, h = (Math.max(...ys) - Math.min(...ys)) * 10;
  const ox = bx + (bw - w) / 2 - Math.min(...xs) * 10, oy = by + (bh - h) / 2 - Math.min(...ys) * 10;
  return p => [ox + p[0] * 10, oy + p[1] * 10];
}
const bbox = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return {w:Math.max(...xs) - Math.min(...xs), h:Math.max(...ys) - Math.min(...ys)}; };

/* 合同な図形をかく */
function genCongDraw(lv){
  const BW = 88, BH = 64;
  let pts, sides = [], angs = [], diag = null, how;
  for(let t = 0; t < 500; t++){
    sides = []; angs = []; diag = null;
    if(lv === 2){
      const a = ri(4, 7), c = ri(2, 5), e = ri(4, 7), f = ri(2, 6), g = ri(2, 6);
      if(a + c <= e + 1 || c + e <= a + 1 || a + e <= c + 1 || e + f <= g + 1 || f + g <= e + 1 || e + g <= f + 1) continue;
      const B = [0, 0], C = [a, 0];
      const ax = (c * c + a * a - e * e) / (2 * a), A = [ax, -Math.sqrt(c * c - ax * ax)];
      /* D は直線ACについてBと反対がわ */
      const u = unit(sub(C, A)), nrm = [u[1], -u[0]];
      const dx = (g * g + e * e - f * f) / (2 * e), dy = Math.sqrt(Math.max(0, g * g - dx * dx));
      let D = add(add(A, mul(u, dx)), mul(nrm, dy));
      const sideB = (B[0] - A[0]) * nrm[0] + (B[1] - A[1]) * nrm[1];
      if(sideB > 0) D = add(add(A, mul(u, dx)), mul(nrm, -dy));
      pts = [A, B, C, D];
      const an = pts.map((p, i) => angAt(p, pts[(i + 3) % 4], pts[(i + 1) % 4]));
      if(an.some(v => v < 40 || v > 160) || Math.abs(an.reduce((p, q) => p + q, 0) - 360) > 0.5) continue;
      sides = [[0, 1, c], [1, 2, a], [2, 3, f], [3, 0, g]]; diag = [0, 2, e];
      how = "四角形";
    } else {
      const mode = lv === 0 ? "sss" : pick(["sas", "asa"]);
      const a = ri(4, 7);
      if(mode === "sss"){
        const b = ri(3, 7), c = ri(3, 7);
        if(a + b <= c + 1 || a + c <= b + 1 || b + c <= a + 1) continue;
        const x = (c * c + a * a - b * b) / (2 * a); pts = [[x, -Math.sqrt(c * c - x * x)], [0, 0], [a, 0]];
        sides = [[0, 1, c], [1, 2, a], [2, 0, b]];
      } else if(mode === "sas"){
        const c = ri(3, 6), B = ri(8, 22) * 5;
        pts = [[c * Math.cos(B * D2R), -c * Math.sin(B * D2R)], [0, 0], [a, 0]];
        sides = [[0, 1, c], [1, 2, a]]; angs = [[1, B]];
      } else {
        const B = ri(7, 16) * 5, C = ri(7, 16) * 5; if(B + C > 130) continue;
        const ab = a * Math.sin(C * D2R) / Math.sin((B + C) * D2R);
        pts = [[ab * Math.cos(B * D2R), -ab * Math.sin(B * D2R)], [0, 0], [a, 0]];
        sides = [[1, 2, a]]; angs = [[1, B], [2, C]];
      }
      const an = pts.map((p, i) => angAt(p, pts[(i + 2) % 3], pts[(i + 1) % 3]));
      if(an.some(v => v < 28)) continue;
      how = "三角形";
    }
    const bb = bbox(pts); if(bb.w * 10 > BW - 12 || bb.h * 10 > BH - 12) continue;
    break;
  }
  if(R() < 0.5) pts = pts.map(p => [-p[0], p[1]]);
  const n = pts.length;
  const drawFig = (G, x, y, w, h, fs, color) => {
    const f = fitPts(pts, x, y, w, h, 7), P = f.pts, cen = centroid(P);
    G.poly(P, {w:0.4, color});
    if(diag) G.line(...P[diag[0]], ...P[diag[1]], {w:0.3, dash:[1, 0.8], color});
    for(const [i, j, v] of sides) sideLabel(G, P[i], P[j], cm(v), cen, fs, {color});
    if(diag){ const m = mid(P[diag[0]], P[diag[1]]); drawToks(G, parseMk(cm(diag[2])), m[0] + 0.4 * fs, m[1] - 0.6 * fs, fs * 0.85, false, color); }
    for(const [i, v] of angs) angleMark(G, P[i], P[(i + n - 1) % n], P[(i + 1) % n], v + "°", fs, {color});
  };
  const ans = (G, bx, by, bw, bh, fs) => {
    const T = realPlace(pts, bx, by, bw, bh), P = pts.map(T);
    G.poly(P, {w:0.4, color:RED});
    if(diag) G.line(...P[diag[0]], ...P[diag[1]], {w:0.3, dash:[1, 0.8], color:RED});
    G.text("（実際の大きさ）", bx + bw - 1.5, by + bh - 2.5, {size:fs * 0.55, color:RED, align:"right"});
  };
  return drawItem(58, 48, (G, x, y, w, h, fs) => drawFig(G, x, y, w, h, fs), BW, BH, ans,
    {inst:"左の図形と合同な図形を，右の四角の中にかきましょう。", lead:"合同な" + how + "をかく", sig:JSON.stringify([sides, angs, diag])});
}

/* 円柱・角柱の見取図 */
function drawCylinder(G, x, y, w, h, fs, d, hh, labR){
  const s = Math.min((w - 16) / d, (h - 14) / (hh + d * 0.4));
  const rx = d * s / 2, ry = rx * 0.33, cx = x + w / 2 - 3, top = y + 7 + ry, bot = top + hh * s;
  G.ellipse(cx, top, rx, ry, 0, 2 * Math.PI, {w:0.4});
  G.ellipse(cx, bot, rx, ry, 0, Math.PI, {w:0.4});
  G.ellipse(cx, bot, rx, ry, Math.PI, 2 * Math.PI, {w:0.3, dash:[1, 0.8]});
  G.line(cx - rx, top, cx - rx, bot, {w:0.4}); G.line(cx + rx, top, cx + rx, bot, {w:0.4});
  if(labR){ G.line(cx, top, cx + rx, top, {w:0.3}); G.dot(cx, top, 0.35); G.text(cm(d / 2), cx + rx / 2, top - ry - 1.2, {size:fs * 0.8, align:"center"}); }
  else { G.line(cx - rx, top, cx + rx, top, {w:0.3}); G.text(cm(d), cx, top - ry - 1.2, {size:fs * 0.8, align:"center"}); }
  drawToks(G, parseMk(cm(hh)), cx + rx + 1.2, (top + bot) / 2, fs * 0.8, false);
}
function drawPrism3(G, x, y, w, h, fs, a, b, c, hh){
  /* 直角三角形（直角をはさむ辺 a, b、ななめの辺 c）を底面にした三角柱 */
  const P3 = [[0, 0, 0], [a, 0, 0], [0, 0, b], [0, hh, 0], [a, hh, 0], [0, hh, b]];
  const f = fitPts(P3.map(proj), x, y, w, h, 7), P = f.pts, cen = centroid(P);
  for(const [i, j] of [[0, 2], [1, 2], [2, 5]]) G.line(...P[i], ...P[j], {w:0.3, dash:[1, 0.8]});
  for(const [i, j] of [[0, 1], [0, 3], [1, 4], [3, 4], [4, 5], [5, 3]]) G.line(...P[i], ...P[j], {w:0.4});
  sideLabel(G, P[0], P[1], cm(a), cen, fs); sideLabel(G, P[3], P[5], cm(b), cen, fs); if(c) sideLabel(G, P[4], P[5], cm(c), cen, fs); sideLabel(G, P[1], P[4], cm(hh), cen, fs);
}
function drawPrism4(G, x, y, w, h, fs, a, b, hh){
  const P3 = [[0, 0, 0], [a, 0, 0], [a, hh, 0], [0, hh, 0], [0, 0, b], [a, 0, b], [a, hh, b], [0, hh, b]];
  const f = fitPts(P3.map(proj), x, y, w, h, 7), P = f.pts, cen = centroid(P);
  for(const [i, j] of [[0, 4], [4, 5], [4, 7]]) G.line(...P[i], ...P[j], {w:0.3, dash:[1, 0.8]});
  for(const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [3, 7], [2, 6], [1, 5], [7, 6], [6, 5]]) G.line(...P[i], ...P[j], {w:0.4});
  sideLabel(G, P[0], P[1], cm(a), cen, fs); sideLabel(G, P[1], P[5], cm(b), cen, fs); sideLabel(G, P[1], P[2], cm(hh), cen, fs);
}
/* 展開図の線（単位cm）：[点の列の集まり] と 円 */
function netShapes(kind, v){
  const L_ = [], C_ = [];
  if(kind === "cyl"){
    const W = +dmul(v.d, "3.14"), r = v.d / 2, cx = W / 2;
    L_.push([[0, v.d], [W, v.d], [W, v.d + v.h], [0, v.d + v.h], [0, v.d]]);
    C_.push([cx, r, r], [cx, v.d + v.h + r, r]);
  } else if(kind === "p3"){
    const {a, b, c, h} = v, hc = a * b / c, xc = b + a;
    /* 横にならぶ長方形：b, a, c の順。三角形は c の長方形の上と下 */
    L_.push([[0, 0], [b + a + c, 0], [b + a + c, h], [0, h], [0, 0]], [[b, 0], [b, h]], [[b + a, 0], [b + a, h]]);
    const px = b * b / c;
    L_.push([[xc, 0], [xc + c - px, -hc], [xc + c, 0]], [[xc, h], [xc + c - px, h + hc], [xc + c, h]]);
  } else {
    const {a, b, h} = v;
    L_.push([[0, 0], [2 * a + 2 * b, 0], [2 * a + 2 * b, h], [0, h], [0, 0]], [[a, 0], [a, h]], [[a + b, 0], [a + b, h]], [[2 * a + b, 0], [2 * a + b, h]]);
    L_.push([[0, 0], [0, -b], [a, -b], [a, 0]], [[0, h], [0, h + b], [a, h + b], [a, h]]);
  }
  const all = L_.flat().concat(C_.flatMap(c => [[c[0] - c[2], c[1] - c[2]], [c[0] + c[2], c[1] + c[2]]]));
  return {L:L_, C:C_, all};
}
function drawNet(G, S, T, s, color){
  for(const l of S.L) G.poly(l.map(T), {close:false, w:0.4, color});
  for(const [cx, cy, r] of S.C){ const p = T([cx, cy]); G.arc(p[0], p[1], r * s, 0, 2 * Math.PI, {w:0.4, color}); }
}
function genNetDraw(lv){
  const kind = lv === 0 ? "cyl" : lv === 1 ? pick(["p3", "p4"]) : pick(["cyl", "p4"]);
  const v = kind === "cyl" ? (lv === 2 ? {d:3, h:ri(2, 3)} : {d:2, h:ri(2, 4)}) : kind === "p3" ? {a:3, b:4, c:5, h:ri(2, 3)} : {a:ri(2, 4), b:pick([1, 2]), h:ri(2, 4)};
  const S = netShapes(kind, v), bb = bbox(S.all);
  const BW = Math.max(90, Math.ceil(bb.w * 10 + 14)), BH = Math.max(64, Math.ceil(bb.h * 10 + 14));
  const drawFig = (G, x, y, w, h, fs) => {
    if(kind === "cyl"){ drawCylinder(G, x, y, w, h, fs, v.d, v.h, false); G.text("円周率は3.14", x + w / 2, y + h - 1, {size:fs * 0.6, align:"center"}); }
    else if(kind === "p3") drawPrism3(G, x, y, w, h, fs, v.a, v.b, v.c, v.h);
    else drawPrism4(G, x, y, w, h, fs, v.a, v.b, v.h);
  };
  const ans = (G, bx, by, bw, bh, fs) => { drawNet(G, S, realPlace(S.all, bx, by, bw, bh), 10, RED); G.text("（実際の大きさ・かき方の一例）", bx + bw - 1.5, by + bh - 2.5, {size:fs * 0.55, color:RED, align:"right"}); };
  const name = kind === "cyl" ? "円柱" : kind === "p3" ? "三角柱" : "四角柱";
  return drawItem(52, 44, drawFig, BW, BH, ans,
    {inst:"つぎの立体の【展|てん】開図を，実際の大きさで四角の中にかきましょう。", lead:name + "の【展|てん】開図", sig:kind + JSON.stringify(v)});
}
/* 展開図から長さを読み取る */
function genNetRead(lv){
  const d = ri(2, 8), h = ri(3, 9), W = dmul(d, "3.14");
  const S = netShapes("cyl", {d, h});
  const draw = (G, x, y, w, h_, fs) => {
    const f = fitPts(S.all, x, y, w, h_, 5), s = f.s;
    const x0 = Math.min(...S.all.map(p => p[0])), y0 = Math.min(...S.all.map(p => p[1]));
    const T = p => [f.pts[0][0] + (p[0] - S.all[0][0]) * s, f.pts[0][1] + (p[1] - S.all[0][1]) * s];
    drawNet(G, S, T, s);
    const c = S.C[0], p = T([c[0], c[1]]), r = c[2] * s;
    const lab = lv === 0 ? cm(d) : lv === 1 ? cm(d / 2) : "イ";
    if(lv === 1){ G.line(p[0], p[1], p[0] + r, p[1], {w:0.3}); G.dot(p[0], p[1], 0.3); G.text(lab, p[0] + r + 1, p[1] - 1.2, {size:fs * 0.8}); }
    else { G.line(p[0] - r, p[1], p[0] + r, p[1], {w:0.3}); G.text(lab, p[0] + r + 1, p[1] - 1.2, {size:fs * 0.8}); }
    const a = T([0, d + h]), b = T([+W, d + h]), t = T([+W, d]);
    const tl = T([0, d]), ym = (tl[1] + a[1]) / 2, x1 = tl[0] + 0.8, x2 = b[0] - 0.8, ah = 1.1;
    G.line(x1, ym, x2, ym, {w:0.3});
    G.poly([[x1 + ah, ym - ah * 0.6], [x1, ym], [x1 + ah, ym + ah * 0.6]], {close:false, w:0.3});
    G.poly([[x2 - ah, ym - ah * 0.6], [x2, ym], [x2 - ah, ym + ah * 0.6]], {close:false, w:0.3});
    const lab2 = lv === 2 ? cm(W) : "ア";
    G.text(lab2, (x1 + x2) / 2, ym - 0.75 * fs, {size:fs * 0.8, align:"center"});
    drawToks(G, parseMk(cm(h)), t[0] + 1, (t[1] + b[1]) / 2, fs * 0.8, false);
  };
  const q = lv === 2 ? `イ((${cm(d)}))` : `ア((${cm(W)}))`;
  return figItem(FIGW + 6, FIGH + 18, draw, q, {sig:lv + ":" + d + ":" + h, inst:lv === 2 ? "下の円柱の【展|てん】開図で，イの長さを求めましょう。円周率は3.14とします。" : "下の円柱の【展|てん】開図で，アの長さを求めましょう。円周率は3.14とします。", lead:"【展|てん】開図の長さ"});
}
