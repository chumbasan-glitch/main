/* ================= 問題の形（アイテム） =================
   cat: calc 計算・短い問題 / hissan 筆算 / fig 図・表 / word 文章題
   inst: 大きい問題の指示文　lead: まぜたときに問題の前につける短い指示  */
const NUMW = fs => 1.55 * fs;
function drawNum(G, x, y, n, fs){
  const r = 0.47 * fs;
  G.arc(x + r + 0.05 * fs, y, r, 0, Math.PI * 2, {w:0.25});
  G.text(String(n), x + r + 0.05 * fs, y + 0.02 * fs, {size:n >= 10 ? fs * 0.52 : fs * 0.66, align:"center"});
}

function lineItem(mk, o){
  o = o || {};
  const toks = parseMk(mk);
  return Object.assign({cat:"calc", n:1, toks,
    minW(G, fs){ return lineMetrics(G, toks, fs).w + 0.3 * fs; },
    lines(G, W, fs){ return wrapToks(G, toks, W, fs); },
    height(G, W, fs){ return blockMetrics(G, this.lines(G, W, fs), fs, 0.35 * fs).h; },
    firstUp(G, W, fs){ return lineMetrics(G, this.lines(G, W, fs)[0], fs).up; },
    draw(G, x, y, W, fs, ans){ drawBlock(G, this.lines(G, W, fs), x, y, fs, ans, 0.35 * fs); }
  }, o);
}

/* 文章題：問題文・式・答え */
function wordItem(text, shiki, answer, o){
  o = o || {};
  const toks = parseMk(text);
  const sh = (Array.isArray(shiki) ? shiki : [shiki]).map(parseMk);
  const an = parseMk(answer);
  return Object.assign({cat:"word", n:1, full:true, toks,
    minW(){ return 9999; },
    parts(G, W, fs){
      const lines = wrapToks(G, toks, W, fs);
      const tb = blockMetrics(G, lines, fs, 0.3 * fs);
      const shH = Math.max(3.2 * fs, sh.reduce((h, l) => h + lineMetrics(G, l, fs).up + lineMetrics(G, l, fs).dn + 0.3 * fs, 0));
      const am = lineMetrics(G, an, fs);
      return {lines, tb, shH, am, ansH:Math.max(1.9 * fs, am.up + am.dn + 0.4 * fs)};
    },
    height(G, W, fs){ const p = this.parts(G, W, fs); return p.tb.h + 0.35 * fs + p.shH + p.ansH; },
    firstUp(G, W, fs){ const p = this.parts(G, W, fs); return p.tb.ms[0].up; },
    draw(G, x, y, W, fs, ans){
      const p = this.parts(G, W, fs);
      drawBlock(G, p.lines, x, y, fs, ans, 0.3 * fs);
      let yy = y + p.tb.h + 0.35 * fs;
      G.text("式", x, yy + 0.7 * fs, {size:fs});
      if(ans){
        let sy = yy;
        for(const l of sh){ const m = lineMetrics(G, l, fs); sy += m.up; drawToks(G, l, x + 1.8 * fs, sy + 0.08 * fs, fs, false, RED); sy += m.dn + 0.3 * fs; }
      }
      yy += p.shH;
      const lw = Math.min(W * 0.5, Math.max(W * 0.34, p.am.w + 3 * fs)), lx = x + W - lw;
      const ly = yy + p.ansH - 0.25 * fs;
      G.text("答え", lx - 0.4 * fs, ly - 0.62 * fs, {size:fs, align:"right"});
      G.line(lx, ly, x + W, ly, {w:0.3});
      if(ans) drawToks(G, an, lx + (lw - p.am.w) / 2, ly - p.am.dn - 0.15 * fs, fs, false, RED);
    }
  }, o);
}

/* 図＋ひとつの問い */
function figItem(fw, fh, drawFig, qmk, o){
  o = o || {};
  const q = parseMk(qmk);
  return Object.assign({cat:"fig", n:1,
    minW(G, fs){ return Math.max(fw, lineMetrics(G, q, fs).w) + 0.3 * fs; },
    height(G, W, fs){ const m = lineMetrics(G, q, fs); return fh + 0.5 * fs + m.up + m.dn; },
    firstUp(G, W, fs){ return 0.62 * fs; },
    draw(G, x, y, W, fs, ans){
      drawFig(G, x, y, fw, fh, fs, ans);
      const m = lineMetrics(G, q, fs);
      drawToks(G, q, x, y + fh + 0.5 * fs + m.up, fs, ans);
    }
  }, o);
}

/* 図（表）＋いくつかの問い（小さい問題の番号は自分でつける） */
function setItem(fw, fh, drawFig, subs, o){
  o = o || {};
  const it = Object.assign({cat:"fig", full:true, selfNum:true,
    subs:subs.map(parseMk),
    get n(){ return this.subs.length; },
    trim(k){ this.subs = this.subs.slice(0, k); },
    minW(){ return 9999; },
    layout(G, W, fs){
      const numw = NUMW(fs);
      const sw = Math.max(...this.subs.map(s => lineMetrics(G, s, fs).w)) + numw;
      const side = !o.stack && W - fw - 5 >= sw;
      const tl = this.text ? wrapToks(G, this.text, W, fs) : null;
      const th = tl ? blockMetrics(G, tl, fs, 0.3 * fs).h + 0.6 * fs : 0;
      const sh = this.subs.reduce((h, s) => { const m = lineMetrics(G, s, fs); return h + m.up + m.dn + 0.7 * fs; }, 0) - 0.7 * fs;
      return {side, tl, th, sh, sw};
    },
    height(G, W, fs){ const L = this.layout(G, W, fs); return L.th + (L.side ? Math.max(fh, L.sh) : fh + 0.8 * fs + L.sh); },
    draw(G, x, y, W, fs, ans, num){
      const L = this.layout(G, W, fs);
      if(L.tl) drawBlock(G, L.tl, x, y, fs, ans, 0.3 * fs);
      y += L.th;
      drawFig(G, x, y, fw, fh, fs, ans);
      let sx, sy;
      if(L.side){ sx = x + W - Math.min(W - fw - 4, Math.max(L.sw, (W - fw) * 0.75)); sy = y + Math.max(0, (fh - L.sh) / 2); }
      else { sx = x; sy = y + fh + 0.8 * fs; }
      this.subs.forEach((s, i) => {
        const m = lineMetrics(G, s, fs); sy += m.up;
        drawNum(G, sx, sy, num + i, fs);
        drawToks(G, s, sx + NUMW(fs), sy, fs, ans);
        sy += m.dn + 0.7 * fs;
      });
    }
  }, o);
  it.text = o.text ? parseMk(o.text) : null;
  return it;
}

/* ---------- 筆算（かけ算） ---------- */
function hissanMulItem(a, b, o){
  const [ai, da] = dparse(a), [bi, db] = dparse(b);
  const aD = a.replace(".", ""), bD = b.replace(".", "");
  const dp = da + db;
  let pS = String(ai * bi); if(dp > 0 && pS.length <= dp) pS = pS.padStart(dp + 1, "0");
  const bs = String(bi), parts = [];
  for(let j = 0; j < bs.length; j++){ const dg = +bs[bs.length - 1 - j]; if(dg) parts.push({s:String(ai * dg), sh:j}); }
  const useParts = parts.length > 1;
  let cols = Math.max(aD.length, bD.length + 1, pS.length);
  if(useParts) for(const p of parts) cols = Math.max(cols, p.s.length + p.sh);
  const rows = 3 + (useParts ? parts.length : 0);
  return Object.assign({cat:"hissan", n:1, inst:"筆算でしましょう。", lead:"筆算", sig:a + "×" + b,
    dims(fs){ return {cs:1.25 * fs, rh:1.32 * fs}; },
    minW(G, fs){ return (cols + 0.4) * this.dims(fs).cs; },
    height(G, W, fs){ return rows * this.dims(fs).rh + 0.2 * fs; },
    firstUp(G, W, fs){ return this.dims(fs).rh / 2; },
    draw(G, x, y, W, fs, ans){
      const {cs, rh} = this.dims(fs), x0 = x + 0.3 * cs;
      const cx = c => x0 + (c + 0.5) * cs, ry = r => y + (r + 0.5) * rh;
      for(let c = 0; c <= cols; c++) G.line(x0 + c * cs, y, x0 + c * cs, y + rows * rh, {w:0.12, color:GRID, dash:[0.5, 0.7]});
      for(let r = 0; r <= rows; r++) G.line(x0, y + r * rh, x0 + cols * cs, y + r * rh, {w:0.12, color:GRID, dash:[0.5, 0.7]});
      const put = (s, row, endCol, color, dots) => {
        for(let i = 0; i < s.length; i++) G.text(s[i], cx(endCol - (s.length - 1 - i)), ry(row) + 0.03 * fs, {size:fs * 1.02, align:"center", color});
      };
      const pt = (row, afterCol, color) => G.dot(x0 + (afterCol + 1) * cs, y + row * rh + rh * 0.8, 0.13 * fs, color);
      put(aD, 0, cols - 1); if(da) pt(0, cols - 1 - da, INK);
      put(bD, 1, cols - 1); if(db) pt(1, cols - 1 - db, INK);
      G.text("×", cx(cols - bD.length - 1), ry(1), {size:fs, align:"center"});
      G.line(x0, y + 2 * rh, x0 + cols * cs, y + 2 * rh, {w:0.35});
      if(!ans) return;
      let r = 2;
      if(useParts){
        for(const p of parts){ put(p.s, r, cols - 1 - p.sh, RED); r++; }
        G.line(x0, y + r * rh, x0 + cols * cs, y + r * rh, {w:0.35, color:RED});
      }
      put(pS, r, cols - 1, RED);
      if(dp){
        pt(r, cols - 1 - dp, RED);
        let z = 0; while(z < dp && pS[pS.length - 1 - z] === "0") z++;
        for(let i = 0; i < z; i++){ const c = cols - 1 - i; G.line(cx(c) - 0.3 * cs, ry(r) + 0.35 * rh, cx(c) + 0.3 * cs, ry(r) - 0.35 * rh, {w:0.3, color:RED}); }
      }
    }
  }, o || {});
}

/* ---------- 筆算（わり算） ----------
   mode: exact わり切れるまで / round 四しゃ五入して r けた / rem 商は一の位まで・あまり */
function divSolve(n, d, mode, r){
  const dD = d.replace(".", ""), dd = dparse(d)[1], D = parseInt(dD, 10);
  const X = n.replace(".", "").split(""), nd = dparse(n)[1], orig = X.length;
  const onesIdx = X.length - nd - 1, onesP = onesIdx + dd, added = new Set();
  const need = i => { while(X.length <= i){ X.push("0"); added.add(X.length - 1); } };
  need(onesP);
  let limit = mode === "rem" ? onesP : mode === "round" ? onesP + r + 1 : onesP + 5;
  let cur = 0, first = -1, last = -1; const steps = [], qd = {};
  for(let i = 0; i <= limit; i++){
    need(i);
    cur = cur * 10 + (+X[i]); const q = Math.floor(cur / D); qd[i] = q;
    if(q > 0){ if(first < 0) first = i; steps.push({col:i, prod:q * D, rem:cur - q * D}); cur -= q * D; }
    last = i;
    if(mode === "exact" && i >= onesP && i >= orig - 1 && cur === 0 && first >= 0) break;
  }
  const c0 = first >= 0 && first <= onesP ? first : onesP;
  const qDig = []; for(let c = c0; c <= last; c++) qDig.push({c, v:qd[c] || 0});
  const qInt = parseInt(qDig.map(q => q.v).join(""), 10), qDec = Math.max(0, last - onesP);
  let ansText;
  if(mode === "exact") ansText = ds(qInt, qDec);
  else if(mode === "round") ansText = "約" + ds(Math.round(qInt / 10), r);
  else ansText = ds(qInt, 0) + "あまり" + ds(cur, dd + Math.max(0, nd - dd));
  return {dD, dd, D, X, orig, onesIdx, onesP, added, steps, qDig, last, qInt, qDec, ansText, rem:cur};
}
function hissanDivItem(n, d, mode, r, o){
  const S = divSolve(n, d, mode, r);
  const cols = Math.max(S.X.length, S.last + 1);
  const rows = 2 + 2 * S.steps.length;
  const noteMk = mode === "exact" ? "" : S.ansText;
  const lead = mode === "exact" ? "わり切れるまで" : mode === "round" ? (r === 0 ? "四しゃ五入して整数で" : "四しゃ五入して" + F(1, P10(r)) + "の位まで") : "商は一の位まで，あまりも";
  return Object.assign({cat:"hissan", n:1, lead, S, sig:n + "÷" + d,
    inst:mode === "exact" ? "わり切れるまで筆算でしましょう。" : mode === "round" ? (r === 0 ? "商を四しゃ五入して，整数で求めましょう。" : "商を四しゃ五入して，" + F(1, P10(r)) + "の位までのがい数で求めましょう。") : "商は一の位まで求めて，あまりも出しましょう。",
    dims(fs){ return {cs:1.2 * fs, rh:1.3 * fs}; },
    noteW(G, fs){ return noteMk ? G.width(noteMk, fs * 0.9) + 1.2 * fs : 0; },
    minW(G, fs){ const {cs} = this.dims(fs); return (S.dD.length + 0.9 + cols) * cs + this.noteW(G, fs) + 0.3 * fs; },
    height(G, W, fs){ return rows * this.dims(fs).rh + 0.3 * fs; },
    firstUp(G, W, fs){ return this.dims(fs).rh / 2; },
    draw(G, x, y, W, fs, ans){
      const {cs, rh} = this.dims(fs);
      const xl = x + 0.2 * cs, xb = xl + S.dD.length * cs + 0.75 * cs;
      const cx = c => xb + (c + 0.5) * cs, ry = rr => y + (rr + 0.5) * rh;
      for(let c = 0; c <= cols; c++) G.line(xb + c * cs, y, xb + c * cs, y + rows * rh, {w:0.12, color:GRID, dash:[0.5, 0.7]});
      for(let rr = 0; rr <= rows; rr++) G.line(xb, y + rr * rh, xb + cols * cs, y + rr * rh, {w:0.12, color:GRID, dash:[0.5, 0.7]});
      const put = (s, row, endCol, color) => { for(let i = 0; i < s.length; i++) G.text(s[i], cx(endCol - (s.length - 1 - i)), ry(row) + 0.03 * fs, {size:fs * 1.02, align:"center", color}); };
      /* わる数 */
      for(let i = 0; i < S.dD.length; i++) G.text(S.dD[i], xl + (i + 0.5) * cs, ry(1) + 0.03 * fs, {size:fs * 1.02, align:"center"});
      if(S.dd) G.dot(xl + (S.dD.length - S.dd) * cs, y + rh + rh * 0.8, 0.13 * fs, INK);
      /* ）とよこ線 */
      const bx = xb - 0.1 * cs;
      G.ctx.beginPath(); G.ctx.moveTo((bx - 0.35 * cs) * G.k, (y + rh) * G.k);
      G.ctx.quadraticCurveTo((bx + 0.15 * cs) * G.k, (y + 1.5 * rh) * G.k, (bx - 0.35 * cs) * G.k, (y + 2 * rh + 0.1 * rh) * G.k); G.stroke({w:0.35});
      G.line(bx - 0.35 * cs, y + rh, xb + cols * cs, y + rh, {w:0.35});
      /* わられる数 */
      for(let i = 0; i < S.orig; i++) G.text(S.X[i], cx(i), ry(1) + 0.03 * fs, {size:fs * 1.02, align:"center"});
      if(S.onesIdx < S.orig - 1) G.dot(xb + (S.onesIdx + 1) * cs, y + rh + rh * 0.8, 0.13 * fs, INK);
      if(!ans) return;
      for(const i of S.added) if(i < cols) G.text("0", cx(i), ry(1) + 0.03 * fs, {size:fs * 0.9, align:"center", color:RED});
      if(S.dd){
        G.dot(xl + S.dD.length * cs, y + rh + rh * 0.8, 0.14 * fs, RED);
        G.dot(xb + (S.onesP + 1) * cs, y + rh + rh * 0.8, 0.14 * fs, RED);
      }
      for(const q of S.qDig) G.text(String(q.v), cx(q.c), ry(0) + 0.03 * fs, {size:fs * 1.02, align:"center", color:RED});
      if(S.last > S.onesP) G.dot(xb + (S.onesP + 1) * cs, y + rh * 0.8, 0.14 * fs, RED);
      let row = 2;
      S.steps.forEach((st, j) => {
        const ps = String(st.prod); put(ps, row, st.col, RED);
        G.line(xb + (st.col - ps.length + 1) * cs, y + (row + 1) * rh, xb + (st.col + 1) * cs, y + (row + 1) * rh, {w:0.3, color:RED});
        row++;
        const upto = j < S.steps.length - 1 ? S.steps[j + 1].col : S.last;
        let v = String(st.rem); for(let c = st.col + 1; c <= upto; c++) v += S.X[c];
        v = String(parseInt(v, 10));
        put(v, row, upto, RED);
        if(mode === "rem" && j === S.steps.length - 1 && S.dd) G.dot(xb + (S.onesIdx + 1) * cs, y + row * rh + rh * 0.8, 0.14 * fs, RED);
        row++;
      });
      if(noteMk) G.text(noteMk, xb + cols * cs + 0.8 * fs, ry(0), {size:fs * 0.9, color:RED});
    }
  }, o || {});
}

/* ---------- 図のための道具 ---------- */
/* 点の集まりを箱に合わせて置く（同じ倍率 s を返す） */
function fitPts(pts, x, y, w, h, pad, sFix){
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const s = sFix || Math.min((w - 2 * pad) / Math.max(maxx - minx, 1e-6), (h - 2 * pad) / Math.max(maxy - miny, 1e-6));
  const ox = x + (w - (maxx - minx) * s) / 2 - minx * s, oy = y + (h - (maxy - miny) * s) / 2 - miny * s;
  return {s, pts:pts.map(p => [ox + p[0] * s, oy + p[1] * s])};
}
function fitScale(pts, w, h, pad){
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return Math.min((w - 2 * pad) / Math.max(Math.max(...xs) - Math.min(...xs), 1e-6), (h - 2 * pad) / Math.max(Math.max(...ys) - Math.min(...ys), 1e-6));
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = a => Math.hypot(a[0], a[1]);
const unit = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const centroid = ps => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
const angAt = (p, a, b) => { const u = unit(sub(a, p)), v = unit(sub(b, p)); return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) * 180 / Math.PI; };
/* 頂点 p の角に弧と文字 */
function angleMark(G, p, a, b, label, fs, o){
  o = o || {};
  const u = unit(sub(a, p)), v = unit(sub(b, p));
  const a0 = Math.atan2(u[1], u[0]), a1 = Math.atan2(v[1], v[0]);
  let d = a1 - a0; while(d <= -Math.PI) d += 2 * Math.PI; while(d > Math.PI) d -= 2 * Math.PI;
  const deg = Math.abs(d) * 180 / Math.PI;
  const r = o.r || (deg < 45 ? 1.9 * fs : 1.3 * fs);
  if(o.right){
    const q = 0.55 * fs;
    G.poly([add(p, mul(u, q)), add(add(p, mul(u, q)), mul(v, q)), add(p, mul(v, q))], {close:false, w:0.25});
  } else if(o.arc !== false) G.arc(p[0], p[1], r * 0.55, a0, a0 + d, {ccw:d < 0, w:0.25, color:o.color});
  if(label){
    const bis = unit(add(u, v)), dist = r * (deg < 45 ? 1.05 : 1.0) + 0.35 * fs;
    const lp = add(p, mul(bis, dist));
    drawToks(G, parseMk(label), lp[0] - lineMetrics(G, parseMk(label), fs * 0.85).w / 2, lp[1], fs * 0.85, o.ans, o.color);
  }
}
/* 辺の外側に長さを書く */
function sideLabel(G, a, b, label, cen, fs, o){
  o = o || {};
  const m = mid(a, b); let nrm = unit([-(b[1] - a[1]), b[0] - a[0]]);
  if((m[0] - cen[0]) * nrm[0] + (m[1] - cen[1]) * nrm[1] < 0) nrm = mul(nrm, -1);
  const toks = parseMk(label), lm = lineMetrics(G, toks, fs * 0.85);
  const off = (o.off || 0.9) * fs + Math.abs(nrm[0]) * lm.w * 0.45;
  const p = add(m, mul(nrm, off));
  drawToks(G, toks, p[0] - lm.w / 2, p[1], fs * 0.85, o.ans, o.color);
}
function vLabel(G, p, cen, name, fs, color){
  const d = unit(sub(p, cen)), q = add(p, mul(d, 1.05 * fs));
  G.text(name, q[0], q[1], {size:fs * 0.85, align:"center", color:color || INK, weight:600});
}
/* 等しい辺のしるし */
function tick(G, a, b, n, fs){
  const m = mid(a, b), u = unit(sub(b, a)), nv = [-u[1], u[0]];
  for(let i = 0; i < n; i++){
    const c = add(m, mul(u, (i - (n - 1) / 2) * 0.35 * fs));
    G.line(...add(c, mul(nv, 0.4 * fs)), ...add(c, mul(nv, -0.4 * fs)), {w:0.3});
  }
}
