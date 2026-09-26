/* ================= 問題を作る・ならべる ================= */
function unitsOf(grade){ return GRADES[grade] || []; }
function subsOn(st, u){ const off = (st.subsOff[u.id] || []); return u.subs.filter(s => !off.includes(s.id)); }

function buildItems(st){
  R = makeRng(st.seed);
  const out = [];
  for(const u of unitsOf(st.grade)){
    if(!st.units.includes(u.id)) continue;
    const n = st.alloc[u.id] || 0, subs = subsOn(st, u);
    if(!n || !subs.length) continue;
    const k = Math.max(1, Math.min(subs.length, Math.ceil(n / 2.5)));
    const use = k < subs.length ? shuffle(subs.map((s, i) => i)).slice(0, k).sort((a, b) => a - b).map(i => subs[i]) : subs;
    const cnt = use.map(() => 0); for(let i = 0; i < n; i++) cnt[i % use.length]++;
    use.forEach((s, si) => {
      let left = cnt[si], guard = 0; const got = [], seen = new Set();
      while(left > 0 && guard++ < 50){
        const lv = st.level === "mix" ? ri(0, 2) : st.level;
        let it; try{ it = s.gen(lv); }catch(e){ console.error(u.name, s.name, e); break; }
        if(!it) continue;
        const sig = it.sig || (it.toks && it.cat !== "fig" ? mkText(it.toks) : it.subs ? it.subs.map(mkText).join("|") : null);
        if(sig && seen.has(sig) && guard < 40) continue;
        if(sig) seen.add(sig);
        if(it.n > left){ if(it.trim) it.trim(left); else continue; }
        it.unit = u; it.sub = s; got.push(it); left -= it.n;
      }
      got.sort((a, b) => a.inst < b.inst ? -1 : a.inst > b.inst ? 1 : 0);
      out.push(...got);
    });
  }
  return out;
}

const GENERIC = {calc:"つぎの問題に答えましょう。", hissan:"筆算でしましょう。", fig:"つぎの問題に答えましょう。", word:"つぎの問題に答えましょう。"};
function groupList(list){
  const out = [], cats = [];
  for(const it of list) if(!cats.includes(it.cat)) cats.push(it.cat);
  for(const cat of cats){
    const ci = list.filter(i => i.cat === cat), insts = [];
    for(const it of ci) if(!insts.includes(it.inst)) insts.push(it.inst);
    const parts = insts.map(t => ci.filter(i => i.inst === t));
    const big = parts.filter(p => p.reduce((s, i) => s + i.n, 0) >= 2), small = parts.filter(p => !big.includes(p));
    const rest = small.flat();
    parts.forEach(p => { if(big.includes(p)) out.push({items:p}); else if(p === small[0]) out.push({items:rest}); });
  }
  return out;
}
function makeGroups(items, order){
  let groups = [];
  if(order === "mix") groups = groupList(shuffle(items));
  else {
    const units = []; for(const it of items) if(!units.includes(it.unit)) units.push(it.unit);
    for(const u of units) groups.push(...groupList(items.filter(i => i.unit === u)));
  }
  for(const g of groups){
    const same = g.items.every(i => i.inst === g.items[0].inst);
    g.inst = same ? g.items[0].inst : GENERIC[g.items[0].cat];
    g.n = g.items.reduce((s, i) => s + i.n, 0);
    for(const i of g.items) i.showLead = !same;
    g.instT = parseMk(g.inst);
  }
  return groups;
}

/* 100点満点の配点：大問ごとに同じ点数（各○点）になるようにする */
function assignPoints(groups){
  const N = groups.reduce((s, g) => s + g.n, 0);
  for(const g of groups){ g.each = null; g.total = null; g.itemPts = null; }
  if(!N || N > 100) return false;
  const base = Math.floor(100 / N), r = 100 - base * N;
  const pri = {word:0, fig:1, hissan:2, calc:3};
  const order = groups.map((g, i) => i).sort((a, b) => pri[groups[a].items[0].cat] - pri[groups[b].items[0].cat]);
  const stages = [new Map([[0, null]])];
  for(const gi of order){
    const prev = stages[stages.length - 1], next = new Map();
    for(const [s] of prev) for(let e = 0; e <= 4; e++){ const s2 = s + e * groups[gi].n; if(s2 <= r && !next.has(s2)) next.set(s2, [s, e]); }
    stages.push(next);
  }
  const extra = new Array(groups.length).fill(0);
  if(stages[stages.length - 1].has(r)){
    let s = r;
    for(let k = order.length; k >= 1; k--){ const [ps, e] = stages[k].get(s); extra[order[k - 1]] = e; s = ps; }
    groups.forEach((g, i) => { g.each = base + extra[i]; g.total = g.each * g.n; });
  } else {
    let left = r;
    for(const gi of order){ const g = groups[gi]; g.itemPts = []; for(const it of g.items){ let p = base * it.n; const add_ = Math.min(left, it.n); p += add_; left -= add_; g.itemPts.push(p); } g.total = g.itemPts.reduce((a, b) => a + b, 0); }
  }
  return true;
}

/* ================= ページのレイアウト ================= */
const PAPERS = {A4:[210, 297], B4:[257, 364]};
const MARGIN = 12;
const FS = {s:4.3, m:4.9, l:5.7};

function hdrH(fs){ return Math.max(15, 3.3 * fs); }
function meateH(fs){ return 2.0 * fs; }

function layoutPages(G, groups, paper, fs, opt){
  const [PW, PH] = PAPERS[paper];
  const CW = PW - 2 * MARGIN, bottom = PH - MARGIN - 5;
  const top0 = MARGIN + hdrH(fs) + (opt.meate ? meateH(fs) + 0.8 * fs : 0) + 1.3 * fs;
  const indent = 0.9 * fs, availW = CW - indent, gapX = 1.6 * fs, numW = NUMW(fs);
  const pages = [{ops:[]}]; let y = top0;
  const newPage = () => { pages.push({ops:[]}); y = top0; };
  groups.forEach((g, gi) => {
    const ptsTxt = opt.score === "100" ? ptsText(g) : "";
    const ptsW = ptsTxt ? G.width(ptsTxt, fs * 0.7) + 1.5 * fs : 0;
    const instLines = wrapToks(G, g.instT, CW - 1.8 * fs - ptsW, fs);
    const gh = blockMetrics(G, instLines, fs, 0.25 * fs).h + 0.8 * fs;
    const nonfull = g.items.filter(i => !i.full);
    let c = 1;
    for(const cc of [4, 3, 2]){
      const cw = (availW - (cc - 1) * gapX) / cc;
      if(nonfull.length && nonfull.every(i => i.minW(G, fs) + numW <= cw)){ c = cc; break; }
    }
    const colW = (availW - (c - 1) * gapX) / c;
    const rows = []; let cur = [];
    let num = 1;
    g.items.forEach((it, ii) => {
      const cell = {item:it, num, pts:g.itemPts ? g.itemPts[ii] : null}; num += it.n;
      if(it.full){ if(cur.length){ rows.push(cur); cur = []; } rows.push([Object.assign(cell, {w:availW})]); }
      else { cur.push(Object.assign(cell, {w:colW})); if(cur.length === c){ rows.push(cur); cur = []; } }
    });
    if(cur.length) rows.push(cur);
    const leadH = 1.35 * fs;
    rows.forEach((row, ri_) => {
      let h = 0;
      row.forEach((cell, k) => {
        cell.x = MARGIN + indent + k * (colW + gapX);
        cell.cw = cell.w - (cell.item.selfNum ? 0 : numW);
        cell.lead = cell.item.showLead && cell.item.lead ? leadH : 0;
        cell.h = cell.lead + cell.item.height(G, cell.cw, fs);
        h = Math.max(h, cell.h);
      });
      const rowGap = 1.3 * fs;
      const need = h + (ri_ === 0 ? gh : 0);
      if(y + need > bottom && y > top0 + 1) newPage();
      if(ri_ === 0){ pages[pages.length - 1].ops.push({t:"group", g, gi, y, instLines, ptsTxt}); y += gh; }
      pages[pages.length - 1].ops.push({t:"row", row, y, h});
      y += h + rowGap;
    });
    y += 0.9 * fs;
  });
  pages.forEach(p => p.used = p.ops.length ? Math.max(...p.ops.map(o => o.y + (o.h || 0))) : top0);
  return {pages, PW, PH, fits:pages.length === 1};
}
function ptsText(g){
  if(g.each != null) return g.n > 1 ? `各${g.each}点〔${g.total}〕` : `${g.each}点`;
  if(g.total != null) return `〔${g.total}〕`;
  return "";
}

/* ================= ページを描く ================= */
function drawHeader(G, L, fs, opt, ans, pageNo, pageCount){
  const PW = L.PW, CW = PW - 2 * MARGIN, x0 = MARGIN, y0 = MARGIN, hh = hdrH(fs);
  const scoreW = Math.max(26, 5.6 * fs), nameW = Math.max(62, CW * 0.36), titleW = CW - scoreW - nameW;
  G.rect(x0, y0, CW, hh, {w:0.6});
  G.line(x0 + titleW, y0, x0 + titleW, y0 + hh, {w:0.4});
  G.line(x0 + titleW + nameW, y0, x0 + titleW + nameW, y0 + hh, {w:0.4});
  let ts = fs * 1.3; const tw = titleW - 2 * fs;
  if(G.width(opt.title, ts, 700) <= tw) G.text(opt.title, x0 + fs, y0 + hh / 2, {size:ts, weight:700});
  else {
    const parts = opt.title.split("・"); let best = null;
    for(let cut = 1; cut < parts.length; cut++){
      const l1 = parts.slice(0, cut).join("・") + "・", l2 = parts.slice(cut).join("・");
      const w = Math.max(G.width(l1, 1, 700), G.width(l2, 1, 700));
      if(!best || w < best.w) best = {l1, l2, w};
    }
    if(!best) best = {l1:opt.title, l2:"", w:G.width(opt.title, 1, 700)};
    ts = Math.min(fs * 1.05, tw / best.w, (hh - 2) / 2.5);
    G.text(best.l1, x0 + fs, y0 + hh / 2 - ts * 0.62, {size:ts, weight:700});
    G.text(best.l2, x0 + fs, y0 + hh / 2 + ts * 0.62, {size:ts, weight:700});
  }
  G.text(opt.grade <= 2 ? "なまえ" : "名前", x0 + titleW + 0.6 * fs, y0 + 0.75 * fs, {size:fs * 0.62});
  if(opt.score === "100") G.text("点", x0 + CW - 0.6 * fs, y0 + hh - 0.8 * fs, {size:fs * 0.8, align:"right"});
  else G.text("／" + opt.total + (opt.grade <= 2 ? "もん" : "問"), x0 + CW - 0.6 * fs, y0 + hh - 0.8 * fs, {size:fs * 0.8, align:"right"});
  if(ans) G.text("答え（先生用）", x0 + CW, y0 - 3.2, {size:fs * 0.75, color:RED, align:"right", weight:700});
  if(pageCount > 1) G.text(pageNo + "／" + pageCount, x0 + CW / 2, L.PH - MARGIN + 1, {size:fs * 0.6, align:"center"});
  if(opt.meate){
    const my = y0 + hh + 0.8 * fs, mh = meateH(fs);
    G.rect(x0, my, CW, mh, {w:0.3, fill:"#f4f4f4"});
    G.text("めあて", x0 + 0.8 * fs, my + mh / 2, {size:fs * 0.75, weight:700});
    let ms = fs * 0.9; while(ms > fs * 0.6 && G.width(opt.meate, ms) > CW - 5.5 * fs) ms -= 0.2;
    G.text(opt.meate, x0 + 4.6 * fs, my + mh / 2, {size:ms});
  }
}
function drawPageAt(G, L, pi, fs, opt, ans){
  const page = L.pages[pi];
  G.rbSeen = new Set();
  G.rect(0, 0, L.PW, L.PH, {fill:"#ffffff", stroke:false});
  drawHeader(G, L, fs, opt, ans, pi + 1, L.pages.length);
  const numW = NUMW(fs);
  for(const op of page.ops){
    if(op.t === "group"){
      const b = 1.2 * fs, x = MARGIN, first = blockMetrics(G, op.instLines, fs, 0.25 * fs).ms[0];
      const cy = op.y + first.up;
      G.rect(x, cy - b / 2, b, b, {fill:INK, stroke:false});
      G.text(String(op.gi + 1), x + b / 2, cy + 0.02 * fs, {size:fs * 0.85, color:"#ffffff", align:"center", weight:700});
      drawBlock(G, op.instLines, x + b + 0.6 * fs, op.y, fs, false, 0.25 * fs);
      if(op.ptsTxt) G.text(op.ptsTxt, L.PW - MARGIN, cy, {size:fs * 0.7, align:"right"});
    } else {
      for(const cell of op.row){
        const it = cell.item; let y = op.y, x = cell.x;
        if(cell.lead){ drawToks(G, parseMk("〔" + it.lead + "〕"), x, y + cell.lead / 2 - 0.1 * fs, fs * 0.72, false); y += cell.lead; }
        if(!it.selfNum){
          const fu = it.firstUp ? it.firstUp(G, cell.cw, fs) : 0.62 * fs;
          drawNum(G, x, y + fu, cell.num, fs); x += numW;
        }
        if(cell.pts != null) G.text("（" + cell.pts + "点）", cell.x + cell.w, op.y + 0.5 * fs, {size:fs * 0.55, align:"right"});
        it.draw(G, x, y, cell.cw, fs, ans, cell.num);
      }
    }
  }
}

/* ================= PDF（画像をならべたPDFを作る） ================= */
async function canvasJpeg(c){ return new Promise(res => c.toBlob(res, "image/jpeg", 0.92)); }
async function makePdf(canvases, paper){
  const pages = [];
  for(const c of canvases){ const b = await canvasJpeg(c); pages.push({bytes:new Uint8Array(await b.arrayBuffer()), w:c.width, h:c.height}); }
  const [W, H] = PAPERS[paper], wPt = (W * 72 / 25.4).toFixed(2), hPt = (H * 72 / 25.4).toFixed(2);
  const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
  const push = x => { const b = typeof x === "string" ? enc.encode(x) : x; chunks.push(b); len += b.length; };
  const obj = (id, parts) => { offs[id] = len; push(id + " 0 obj\n"); parts.forEach(push); push("\nendobj\n"); };
  push("%PDF-1.4\n"); push(new Uint8Array([37, 226, 227, 207, 211, 10]));
  const n = pages.length;
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, ["<< /Type /Pages /Kids [" + pages.map((_, i) => (3 + 3 * i) + " 0 R").join(" ") + "] /Count " + n + " >>"]);
  pages.forEach((pg, i) => {
    const p = 3 + 3 * i, cs = "q " + wPt + " 0 0 " + hPt + " 0 0 cm /Im" + i + " Do Q";
    obj(p, ["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + wPt + " " + hPt + "] /Resources << /XObject << /Im" + i + " " + (p + 2) + " 0 R >> >> /Contents " + (p + 1) + " 0 R >>"]);
    obj(p + 1, ["<< /Length " + cs.length + " >>\nstream\n" + cs + "\nendstream"]);
    obj(p + 2, ["<< /Type /XObject /Subtype /Image /Width " + pg.w + " /Height " + pg.h + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + pg.bytes.length + " >>\nstream\n", pg.bytes, "\nendstream"]);
  });
  const total = 3 + 3 * n, xref = len;
  let x = "xref\n0 " + total + "\n0000000000 65535 f \n";
  for(let i = 1; i < total; i++) x += String(offs[i]).padStart(10, "0") + " 00000 n \n";
  push(x); push("trailer\n<< /Size " + total + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
  return new Blob(chunks, {type:"application/pdf"});
}
