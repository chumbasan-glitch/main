/* ================= 基本の道具 ================= */
const INK = "#1a1a1a", RED = "#d4231b", GRID = "#b9b9b9", SHADE = "#dcdcdc";
/* 書体：すべて丸ゴシック（Zen 丸ゴシック）。読みこむ前やつながらないときも日本語の書体を使う */
const JP_SANS = '"Hiragino Maru Gothic ProN","Hiragino Sans","BIZ UDPGothic","Yu Gothic","Meiryo","Noto Sans JP",sans-serif';
const FONTS = {maru:{name:"丸ゴシック", stack:'"Zen Maru Gothic",' + JP_SANS, web:"Zen Maru Gothic", n:500, b:700}};
const FONT_KEY = "maru";

function makeRng(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let R = Math.random;
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = a => a[Math.floor(R() * a.length)];
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while(b){ [a, b] = [b, a % b]; } return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const P10 = n => Math.pow(10, n);

/* n / 10^s を小数の文字列にする（例：ds(352,2) → "3.52"） */
function ds(n, s){
  s = s || 0;
  const neg = n < 0; n = Math.round(Math.abs(n));
  let str = String(n);
  if(s > 0){
    str = str.padStart(s + 1, "0");
    str = str.slice(0, -s) + "." + str.slice(-s);
    str = str.replace(/0+$/, "").replace(/\.$/, "");
  }
  return (neg ? "-" : "") + str;
}
/* 数の文字列 → [整数, 小数のけた数] */
function dparse(str){ const i = str.indexOf("."); return i < 0 ? [parseInt(str, 10), 0] : [parseInt(str.replace(".", ""), 10), str.length - i - 1]; }
/* 小数どうしのかけ算・わり算を整数で正しく計算する */
function dmul(a, b){ const [x, s] = dparse(String(a)), [y, t] = dparse(String(b)); return ds(x * y, s + t); }
function dadd(a, b, sign){ const [x, s] = dparse(String(a)), [y, t] = dparse(String(b)), m = Math.max(s, t); return ds(x * P10(m - s) + (sign || 1) * y * P10(m - t), m); }
/* a÷b（わり切れるとき） */
function ddiv(a, b){ const [x, s] = dparse(String(a)), [y, t] = dparse(String(b)); for(let k = 0; k < 8; k++){ const num = x * P10(t + k), q = num / (y * P10(s)); if(Number.isInteger(q)) return ds(q, k); } return null; }
/* 最後のけたが0でない小数 */
function rdec(lo, hi, s){ let n; do{ n = ri(lo, hi); } while(s > 0 && n % 10 === 0); return ds(n, s); }

/* 分数の記法 */
const F = (n, d) => "{" + n + "/" + d + "}";
const MX = (w, n, d) => "{" + w + " " + n + "/" + d + "}";
/* 答えの分数：約分して、仮分数なら帯分数もそえる */
function fAns(n, d, mixedFirst){
  const g = gcd(n, d); n /= g; d /= g;
  if(d === 1) return String(n);
  if(n > d){
    const w = Math.floor(n / d), r = n % d;
    return mixedFirst ? MX(w, r, d) + "（" + F(n, d) + "）" : F(n, d) + "（" + MX(w, r, d) + "）";
  }
  return F(n, d);
}
const circled = n => "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"[n - 1] || "(" + n + ")";

/* 学年までに習う漢字（これにふくまれる漢字にはふりがなをつけない） */
let LEARNED = null;
function setLearned(grade){ LEARNED = new Set(); for(let g = 1; g <= grade; g++) for(const ch of (GRADE_CHARS[g] || "")) LEARNED.add(ch); }

/* ================= ことばの記法 =================
   {3/4} 分数　{1 2/3} 帯分数　^2 ^3 右上の小さい数
   [[答え]] 四角の答えらん　((答え)) かっこの答えらん　<<答え>> 答えだけ（問題では空白）  */
function parseMk(s){
  const out = []; let i = 0, buf = "";
  const flush = () => { if(buf){ out.push({t:"s", s:buf}); buf = ""; } };
  const pairs = [["[[", "]]", "box"], ["((", "))", "par"], ["<<", ">>", "ans"]];
  while(i < s.length){
    let hit = false;
    for(const [o, c, t] of pairs){
      if(s.startsWith(o, i)){
        const j = s.indexOf(c, i + 2);
        flush(); out.push({t, a:parseMk(s.slice(i + 2, j))}); i = j + 2; hit = true; break;
      }
    }
    if(hit) continue;
    if(s[i] === "{"){
      const j = s.indexOf("}", i), inner = s.slice(i + 1, j);
      const m = inner.match(/^(?:(\d+)\s+)?([^/]+)\/(.+)$/);
      flush(); out.push({t:"f", w:m[1] || "", n:m[2], d:m[3]}); i = j + 1; continue;
    }
    if(s[i] === "【"){
      const j = s.indexOf("】", i), [b, r] = s.slice(i + 1, j).split("|");
      if(LEARNED && [...b].every(ch => LEARNED.has(ch))) buf += b; else { flush(); out.push({t:"rb", s:b, r}); }
      i = j + 1; continue;
    }
    if(s[i] === "^"){ flush(); out.push({t:"sup", s:s[i + 1]}); i += 2; continue; }
    if(s[i] === "\n"){ flush(); out.push({t:"br"}); i++; continue; }
    buf += s[i]; i++;
  }
  flush(); return out;
}
/* 文章の中のすべての文字（漢字チェック用） */
function mkText(tokens){
  let s = "";
  for(const t of tokens){
    if(t.t === "s" || t.t === "rb") s += t.s;
    else if(t.t === "f") s += t.w + t.n + t.d;
    else if(t.a) s += mkText(t.a);
  }
  return s;
}

/* ================= 描画の道具（単位はすべてmm） ================= */
function makeG(ctx, k){
  try{ ctx.lang = "ja"; }catch(e){}
  const G = {
    k, ctx, capture:null,
    font(size, weight){
      const f = FONTS[FONT_KEY], w = weight >= 700 ? f.b : weight && weight <= 400 ? 400 : f.n;
      ctx.font = w + " " + (size * k).toFixed(2) + "px " + f.stack;
    },
    width(s, size, weight){ G.font(size, weight); return ctx.measureText(s).width / k; },
    text(s, x, y, o){
      o = o || {}; G.font(o.size || 5, o.weight);
      ctx.fillStyle = o.color || INK; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "middle";
      ctx.fillText(s, x * k, y * k);
      if(o.rbBase && ctx.__rb) ctx.__rb.push(s);
      if(G.capture) G.capture.push(s);
    },
    stroke(o){
      ctx.strokeStyle = o.color || INK; ctx.lineWidth = (o.w || 0.3) * k;
      ctx.setLineDash(o.dash ? o.dash.map(v => v * k) : []);
      ctx.stroke(); ctx.setLineDash([]);
    },
    line(x1, y1, x2, y2, o){ ctx.beginPath(); ctx.moveTo(x1 * k, y1 * k); ctx.lineTo(x2 * k, y2 * k); G.stroke(o || {}); },
    poly(pts, o){
      o = o || {};
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k));
      if(o.close !== false) ctx.closePath();
      if(o.fill){ ctx.fillStyle = o.fill; ctx.fill(); }
      if(o.stroke !== false) G.stroke(o);
    },
    rect(x, y, w, h, o){
      o = o || {};
      if(o.fill){ ctx.fillStyle = o.fill; ctx.fillRect(x * k, y * k, w * k, h * k); }
      if(o.stroke !== false){ ctx.beginPath(); ctx.rect(x * k, y * k, w * k, h * k); G.stroke(o); }
    },
    arc(cx, cy, r, a0, a1, o){
      o = o || {};
      ctx.beginPath();
      if(o.fill){ ctx.moveTo(cx * k, cy * k); }
      ctx.arc(cx * k, cy * k, r * k, a0, a1, !!o.ccw);
      if(o.fill){ ctx.closePath(); ctx.fillStyle = o.fill; ctx.fill(); }
      if(o.stroke !== false) G.stroke(o);
    },
    ellipse(cx, cy, rx, ry, a0, a1, o){ ctx.beginPath(); ctx.ellipse(cx * k, cy * k, rx * k, ry * k, 0, a0, a1); G.stroke(o || {}); },
    dot(x, y, r, color){ ctx.beginPath(); ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2); ctx.fillStyle = color || INK; ctx.fill(); }
  };
  return G;
}

/* ================= 記法の大きさと描画 ================= */
function tokMetrics(G, t, fs){
  if(t.m && t.m.fs === fs) return t.m;
  let m;
  if(t.t === "s") m = {w:G.width(t.s, fs), up:0.62 * fs, dn:0.62 * fs};
  else if(t.t === "sup") m = {w:G.width(t.s, fs * 0.6) + 0.05 * fs, up:0.62 * fs, dn:0.62 * fs};
  else if(t.t === "rb") m = {w:G.width(t.s, fs), bw:G.width(t.s, fs), up:1.05 * fs, dn:0.62 * fs};
  else if(t.t === "f"){
    const fn = fs * 0.78, wn = Math.max(G.width(t.n, fn), G.width(t.d, fn)) + 0.3 * fs;
    const ww = t.w ? G.width(t.w, fs) + 0.06 * fs : 0;
    m = {w:ww + wn + 0.1 * fs, up:0.14 * fs + fn * 1.02, dn:0.14 * fs + fn * 1.02, ww, wn, fn};
  } else if(t.t === "br") m = {w:0, up:0, dn:0};
  else {
    const im = lineMetrics(G, t.a, fs);
    if(t.t === "box") m = {w:Math.max(im.w + 1.0 * fs, 2.2 * fs), up:Math.max(im.up, 0.62 * fs) + 0.12 * fs, dn:Math.max(im.dn, 0.62 * fs) + 0.12 * fs, im};
    else if(t.t === "par") m = {w:Math.max(im.w + 2.2 * fs, t.minw || 5.5 * fs), up:Math.max(im.up, 0.7 * fs), dn:Math.max(im.dn, 0.7 * fs), im};
    else m = {w:Math.max(im.w, t.minw || 2.4 * fs) + 0.3 * fs, up:Math.max(im.up, 0.62 * fs), dn:Math.max(im.dn, 0.62 * fs), im};
  }
  m.fs = fs; t.m = m; return m;
}
function lineMetrics(G, toks, fs){
  let w = 0, up = 0.62 * fs, dn = 0.62 * fs;
  for(const t of toks){ const m = tokMetrics(G, t, fs); w += m.w; up = Math.max(up, m.up); dn = Math.max(dn, m.dn); }
  return {w, up, dn};
}
function drawToks(G, toks, x, y, fs, ans, color){
  for(const t of toks){
    const m = tokMetrics(G, t, fs);
    drawTok(G, t, m, x, y, fs, ans, color);
    x += m.w;
  }
  return x;
}
function drawTok(G, t, m, x, y, fs, ans, color){
  const c = color || INK;
  if(t.t === "s") G.text(t.s, x, y, {size:fs, color:c});
  else if(t.t === "sup") G.text(t.s, x + 0.03 * fs, y - 0.32 * fs, {size:fs * 0.6, color:c});
  else if(t.t === "rb"){
    G.text(t.s, x + (m.w - m.bw) / 2, y, {size:fs, color:c, rbBase:true});
    /* ふりがなは、そのページで最初に出てきたときだけ（赤い答えの中では数えない） */
    const seen = G.rbSeen;
    if(!seen || !seen.has(t.s)) G.text(t.r, x + m.w / 2, y - 0.8 * fs, {size:fs * 0.42, color:c, align:"center", weight:600});
    if(seen && c !== RED) seen.add(t.s);
  }
  else if(t.t === "f"){
    if(t.w) G.text(t.w, x, y, {size:fs, color:c});
    const x0 = x + m.ww, cx = x0 + m.wn / 2 + 0.05 * fs;
    G.line(x0 + 0.1 * fs, y, x0 + m.wn, y, {w:0.28, color:c});
    G.text(t.n, cx, y - 0.14 * fs - m.fn * 0.5, {size:m.fn, color:c, align:"center"});
    G.text(t.d, cx, y + 0.14 * fs + m.fn * 0.52, {size:m.fn, color:c, align:"center"});
  } else if(t.t === "box"){
    G.rect(x + 0.12 * fs, y - m.up + 0.06 * fs, m.w - 0.24 * fs, m.up + m.dn - 0.12 * fs, {w:0.3});
    if(ans) drawToks(G, t.a, x + (m.w - m.im.w) / 2, y, fs, false, RED);
  } else if(t.t === "par"){
    const ph = (m.up + m.dn) * 0.95;
    G.text("（", x, y, {size:ph * 0.95, weight:400, color:c});
    G.text("）", x + m.w, y, {size:ph * 0.95, weight:400, color:c, align:"right"});
    if(ans) drawToks(G, t.a, x + (m.w - m.im.w) / 2, y, fs, false, RED);
  } else if(t.t === "ans"){
    if(ans) drawToks(G, t.a, x + 0.15 * fs, y, fs, false, RED);
  }
}
/* 折り返し（文字ごとに分け、行頭の「。、」をさける） */
function wrapToks(G, toks, maxW, fs){
  const units = [];
  for(const t of toks){
    if(t.t === "s") for(const ch of t.s) units.push({t:"s", s:ch});
    else units.push(t);
  }
  const lines = []; let cur = [], w = 0;
  const NOHEAD = "。、，．）」』ょゃゅっー";
  for(let i = 0; i < units.length; i++){
    const u = units[i];
    if(u.t === "br"){ lines.push(cur); cur = []; w = 0; continue; }
    const uw = tokMetrics(G, u, fs).w;
    if(w + uw > maxW && cur.length){
      if(u.t === "s" && NOHEAD.includes(u.s)){ cur.push(u); w += uw; continue; }
      lines.push(cur); cur = []; w = 0;
    }
    cur.push(u); w += uw;
  }
  if(cur.length) lines.push(cur);
  /* 同じ種類の文字をつなぎなおす */
  return lines.map(l => {
    const out = [];
    for(const u of l){ const last = out[out.length - 1]; if(u.t === "s" && last && last.t === "s" && !last.m){ last.s += u.s; } else out.push(u.t === "s" ? {t:"s", s:u.s} : u); }
    return out;
  });
}
function blockMetrics(G, lines, fs, gap){
  let h = 0; const ms = lines.map(l => { const m = lineMetrics(G, l, fs); h += m.up + m.dn; return m; });
  return {h:h + (lines.length - 1) * (gap || 0.2 * fs), ms};
}
function drawBlock(G, lines, x, y, fs, ans, gap){
  const {ms} = blockMetrics(G, lines, fs, gap);
  lines.forEach((l, i) => { y += ms[i].up; drawToks(G, l, x, y, fs, ans); y += ms[i].dn + (gap || 0.2 * fs); });
}
