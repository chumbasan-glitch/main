/* ================= 1〜3年で使う図と問題の形 ================= */
const SP = "　";

/* 時計 */
function drawClock(G, cx, cy, r, h, m, fs){
  G.arc(cx, cy, r, 0, 2 * Math.PI, {w:0.5});
  for(let i = 0; i < 60; i++){ const a = i / 60 * 2 * Math.PI, l = i % 5 ? 0.9 : 1.8; G.line(cx + (r - l) * Math.sin(a), cy - (r - l) * Math.cos(a), cx + r * Math.sin(a), cy - r * Math.cos(a), {w:i % 5 ? 0.15 : 0.35}); }
  for(let i = 1; i <= 12; i++){ const a = i / 12 * 2 * Math.PI; G.text(String(i), cx + (r - 4) * Math.sin(a), cy - (r - 4) * Math.cos(a), {size:fs * 0.62, align:"center"}); }
  const ha = ((h % 12) + m / 60) / 12 * 2 * Math.PI, ma = m / 60 * 2 * Math.PI;
  G.line(cx, cy, cx + r * 0.5 * Math.sin(ha), cy - r * 0.5 * Math.cos(ha), {w:1.1});
  G.line(cx, cy, cx + r * 0.8 * Math.sin(ma), cy - r * 0.8 * Math.cos(ma), {w:0.6});
  G.dot(cx, cy, 0.7);
}
function clockItem(h, m, qmk, o){
  return figItem(36, 36, (G, x, y, w, hh, fs) => drawClock(G, x + w / 2, y + hh / 2, Math.min(w, hh) / 2 - 1, h, m, fs), qmk, Object.assign({sig:"c" + h + ":" + m}, o));
}
const timeStr = (h, m, g2) => m === 0 ? `${h}時` : (m === 30 && !g2 ? `${h}時はん` : `${h}時${m}分`);
const timeStrH = (h, m) => m === 0 ? `${h}じ` : m === 30 ? `${h}じはん` : `${h}じ${m}ふん`.replace(/(\d)ふん$/, (a, d) => ["0", "1", "3", "4", "6", "8"].includes(d) ? d + "ぷん" : d + "ふん");

/* ○をならべたグラフ（1・2年） */
function drawPicto(G, x, y, w, h, fs, labels, vals){
  const n = labels.length, cw = Math.min(11, (w - 4) / n), mx = Math.max(...vals), ch = Math.min(4.2, (h - 8) / mx), bx = x + (w - cw * n) / 2, by = y + h - 7;
  G.line(bx, by, bx + cw * n, by, {w:0.4});
  labels.forEach((l, i) => {
    const cx = bx + (i + 0.5) * cw;
    for(let k = 0; k < vals[i]; k++) G.arc(cx, by - (k + 0.5) * ch, ch * 0.42, 0, 2 * Math.PI, {w:0.3});
    G.text(l, cx, by + 3.2, {size:Math.min(fs * 0.62, cw / Math.max(1, [...l].length) * 1.05), align:"center"});
  });
}
/* ぼうグラフ（3年） */
function drawBars(G, x, y, w, h, fs, labels, vals, step, unitLbl){
  const n = labels.length, mx = Math.ceil(Math.max(...vals) / step / 5) * 5 * step, ox = x + 10, oy = y + h - 7, gw = w - 13, gh = h - 12, bw = gw / n;
  for(let v = 0; v <= mx; v += step){ const yy = oy - gh * v / mx; G.line(ox, yy, ox + gw, yy, {w:v % (step * 5) === 0 ? 0.2 : 0.08, color:GRID}); if(v % (step * 5) === 0) G.text(String(v), ox - 1.5, yy, {size:fs * 0.5, align:"right"}); }
  vals.forEach((v, i) => G.rect(ox + i * bw + bw * 0.2, oy - gh * v / mx, bw * 0.6, gh * v / mx, {w:0.3, fill:"#dddddd"}));
  labels.forEach((l, i) => G.text(l, ox + (i + 0.5) * bw, oy + 2.8, {size:Math.min(fs * 0.55, bw / Math.max(1, [...l].length) * 1.1), align:"center"}));
  G.line(ox, oy, ox + gw, oy, {w:0.4}); G.line(ox, oy, ox, oy - gh, {w:0.4});
  G.text("(" + unitLbl + ")", ox - 1, y + 1.5, {size:fs * 0.5, align:"right"});
}
/* 数の線：start から1目もり step で n 目もり。labelEvery ごとに数字。marks=[[値, 名前]] */
function drawNumLine(G, x, y, w, fs, start, step, n, labelEvery, marks){
  const u = (w - 6) / n, ox = x + 3, yy = y + 8;
  G.line(ox, yy, ox + n * u + 2, yy, {w:0.4});
  for(let i = 0; i <= n; i++){ const big = i % labelEvery === 0, mid = labelEvery % 2 === 0 && i % (labelEvery / 2) === 0; G.line(ox + i * u, yy - (big ? 2 : mid ? 1.5 : 1), ox + i * u, yy + (big ? 2 : mid ? 1.5 : 1), {w:big ? 0.3 : 0.18});
    if(big) G.text(String(start + i * step).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""), ox + i * u, yy + 4.2, {size:fs * 0.55, align:"center"}); }
  for(const [v, name] of marks){ const px = ox + (v - start) / step * u; G.line(px, yy - 6, px, yy - 2.4, {w:0.35}); G.poly([[px - 0.9, yy - 3.4], [px, yy - 2.2], [px + 0.9, yy - 3.4]], {close:false, w:0.35}); G.text(name, px, yy - 7.4, {size:fs * 0.7, align:"center"}); }
}
/* ひっ算（たし算・ひき算） */
function hissanAddItem(a, b, op, o){
  const r = op === "+" ? a + b : a - b, sa = String(a), sb = String(b), sr = String(r);
  const cols = Math.max(sa.length, sb.length + 1, sr.length);
  return Object.assign({cat:"hissan", n:1, sig:a + op + b, inst:knows("筆算") ? "筆算でしましょう。" : "ひっ算で　しましょう。", lead:knows("筆算") ? "筆算" : "ひっ算",
    dims(fs){ return {cs:1.3 * fs, rh:1.35 * fs}; },
    minW(G, fs){ return (cols + 0.4) * this.dims(fs).cs; },
    height(G, W, fs){ return 3 * this.dims(fs).rh + 0.2 * fs; },
    firstUp(G, W, fs){ return this.dims(fs).rh / 2; },
    draw(G, x, y, W, fs, ans){
      const {cs, rh} = this.dims(fs), x0 = x + 0.3 * cs;
      for(let c = 0; c <= cols; c++) G.line(x0 + c * cs, y, x0 + c * cs, y + 3 * rh, {w:0.12, color:GRID, dash:[0.5, 0.7]});
      for(let rr = 0; rr <= 3; rr++) G.line(x0, y + rr * rh, x0 + cols * cs, y + rr * rh, {w:0.12, color:GRID, dash:[0.5, 0.7]});
      const put = (s, row, color) => { for(let i = 0; i < s.length; i++) G.text(s[i], x0 + (cols - s.length + i + 0.5) * cs, y + (row + 0.5) * rh + 0.03 * fs, {size:fs * 1.02, align:"center", color}); };
      put(sa, 0); put(sb, 1); G.text(op === "+" ? "＋" : "－", x0 + (cols - sb.length - 0.5) * cs, y + 1.5 * rh, {size:fs, align:"center"});
      G.line(x0, y + 2 * rh, x0 + cols * cs, y + 2 * rh, {w:0.35});
      if(ans) put(sr, 2, RED);
    }
  }, o || {});
}
/* ものさし（2年）：0〜maxCm、テープの長さ Lmm */
function drawRuler(G, x, y, w, h, fs, maxCm, Lmm){
  const u = (w - 6) / (maxCm * 10), ox = x + 3, ry = y + 9;
  G.rect(ox - 1, ry, maxCm * 10 * u + 2, 9, {w:0.35, fill:"#f6f6f6"});
  for(let i = 0; i <= maxCm * 10; i++){ const l = i % 10 === 0 ? 3.2 : i % 5 === 0 ? 2.2 : 1.3; G.line(ox + i * u, ry, ox + i * u, ry + l, {w:i % 10 === 0 ? 0.3 : 0.15}); if(i % 10 === 0) G.text(String(i / 10), ox + i * u, ry + 5.5, {size:fs * 0.5, align:"center"}); }
  G.rect(ox, y + 2, Lmm * u, 5, {w:0.35, fill:"#d8d8d8"});
}
/* はかり（3年）：maxG まで、1目もり stepG */
function drawScale(G, cx, cy, r, fs, maxG, stepG, valG){
  G.arc(cx, cy, r, 0, 2 * Math.PI, {w:0.5});
  const n = maxG / stepG;
  for(let i = 0; i < n; i++){ const a = i / n * 2 * Math.PI, big = (i * stepG) % (maxG / 10) === 0, l = big ? 2 : 1; G.line(cx + (r - l) * Math.sin(a), cy - (r - l) * Math.cos(a), cx + r * Math.sin(a), cy - r * Math.cos(a), {w:big ? 0.3 : 0.12});
    if((i * stepG) % (maxG / 4) === 0) G.text(i * stepG >= 1000 ? (i * stepG / 1000) + "kg" : String(i * stepG), cx + (r - 5.2) * Math.sin(a), cy - (r - 5.2) * Math.cos(a), {size:fs * 0.45, align:"center"}); }
  const a = valG / maxG * 2 * Math.PI; G.line(cx, cy, cx + (r - 1) * Math.sin(a), cy - (r - 1) * Math.cos(a), {w:0.6}); G.dot(cx, cy, 0.8);
  G.text(maxG >= 1000 ? (maxG / 1000) + "kgまで" : maxG + "gまで", cx, cy + r * 0.45, {size:fs * 0.45, align:"center"});
}

/* ================= 3年の単元と問題 ================= */
const U3 = [];
function unit3(no, name, month, meate, subs){ U3.push({id:"3-" + no, no, name, month, meate, subs}); }
const KURA = "【位|くらい】", HEN = "【辺|へん】", KEI = "【径|けい】";

unit3(1, "かけ算", "4月", "九九のきまりを使って，かけ算を広げよう", [
  {id:"a", name:"かけ算のきまり", gen(lv){
    const a = ri(2, 9), b = ri(2, 9);
    if(lv === 0) return L(`${a}×${b}＝${b}×[[${a}]]`, K_BOX, "□にあう数");
    if(lv === 1) return R() < 0.5 ? L(`${a}×${b}＝${a}×${b - 1}＋[[${a}]]`, K_BOX, "□にあう数") : L(`${a}×${b}＝${a}×${b + 1}－[[${a}]]`, K_BOX, "□にあう数");
    return L(`[[${a}]]×${b}＝${a * b}`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"0や10のかけ算", gen(lv){
    const a = ri(1, 9);
    if(lv === 0) return R() < 0.5 ? L(`${a}×0＝<<0>>`, K_CALC, "計算") : L(`0×${a}＝<<0>>`, K_CALC, "計算");
    if(lv === 1) return R() < 0.5 ? L(`${a}×10＝<<${a * 10}>>`, K_CALC, "計算") : L(`10×${a}＝<<${a * 10}>>`, K_CALC, "計算");
    const b = ri(2, 9); return L(`${a}×${b}＋${a}×${10 - b}＝<<${a * 10}>>`, K_CALC, "計算");
  }}
]);

unit3(2, "時こくと時間", "4月", "時こくや時間を計算でもとめよう", [
  {id:"a", name:"時こくをもとめる", gen(lv){
    const h = ri(7, 10), m = ri(1, 10) * 5, d = lv === 0 ? pick([10, 20, 30]) : ri(3, 10) * 5;
    let H = h, M = m + (lv === 2 ? -d : d); while(M >= 60){ M -= 60; H++; } while(M < 0){ M += 60; H--; }
    return L(`${h}時${m}分から${d}分${lv === 2 ? "前" : "後"}の時こく((${H}時${M ? M + "分" : ""}))`, K_Q, "時こく");
  }},
  {id:"b", name:"時間をもとめる", gen(lv){
    const h1 = ri(7, 10), m1 = ri(0, 11) * 5, d = lv === 0 ? ri(2, 8) * 5 : ri(8, 20) * 5;
    let H = h1, M = m1 + d; while(M >= 60){ M -= 60; H++; }
    const dh = Math.floor(d / 60), dm = d % 60;
    return L(`${h1}時${m1 ? m1 + "分" : ""}から${H}時${M ? M + "分" : ""}までの時間((${dh ? dh + "時間" : ""}${dm ? dm + "分" : ""}))`, K_Q, "時間");
  }},
  {id:"c", name:"秒と分", gen(lv){
    if(lv === 0) return L(`1分＝[[60]]秒`, K_BOX, "□にあう数");
    const s = ri(61, 150); if(s % 60 === 0) return this.gen(lv);
    return lv === 1 ? L(`${s}秒＝[[${Math.floor(s / 60)}]]分[[${s % 60}]]秒`, K_BOX, "□にあう数") : L(`${Math.floor(s / 60)}分${s % 60}秒＝[[${s}]]秒`, K_BOX, "□にあう数");
  }}
]);

unit3(3, "わり算", "5月", "同じ数ずつ分けるときの計算を知ろう", [
  {id:"a", name:"わり算の計算", gen(lv){
    const d = ri(2, 9), q = ri(1, 9);
    if(lv === 2) return pick([() => L(`0÷${d}＝<<0>>`, K_CALC, "計算"), () => L(`${d}÷${d}＝<<1>>`, K_CALC, "計算"), () => L(`${d}÷1＝<<${d}>>`, K_CALC, "計算"), () => { const k = ri(1, 3); return L(`${d * k * 10}÷${d}＝<<${k * 10}>>`, K_CALC, "計算"); }])();
    return L(`${d * q}÷${d}＝<<${q}>>`, K_CALC, "計算");
  }},
  {id:"b", name:"文章題", gen(lv){
    const d = ri(2, 9), q = ri(2, 9), n = d * q;
    if(lv === 0) return W_(`${n}このあめを，${d}人で同じ数ずつ分けます。1人分は何こになりますか。`, `${n}÷${d}＝${q}`, `${q}こ`, "わり算");
    if(lv === 1) return W_(`${n}まいの色紙を，1人に${d}まいずつ分けます。何人に分けられますか。`, `${n}÷${d}＝${q}`, `${q}人`, "わり算");
    const k = ri(2, 3); return W_(`${n * k}cmのテープを，同じ長さずつ${d * k}本に切ります。1本の長さは何cmになりますか。`, `${n * k}÷${d * k}＝${q}`, `${q}cm`, "わり算");
  }}
]);

U3.push({id:"3-x1", no:"○", name:"○倍の計算", month:"5月", meate:"倍について考えよう", subs:[
  {id:"a", name:"何倍かをもとめる", gen(lv){ const a = ri(2, 9), k = ri(2, 9); return W_(`赤いテープの長さは${a}cm，青いテープの長さは${a * k}cmです。青いテープの長さは，赤いテープの長さの何倍ですか。`, `${a * k}÷${a}＝${k}`, `${k}倍`, "何倍"); }},
  {id:"b", name:"もとの長さをもとめる", gen(lv){ const a = ri(2, 9), k = ri(2, 9); return lv === 0 ? W_(`赤いテープの長さは${a}cmです。青いテープの長さは，赤いテープの長さの${k}倍です。青いテープは何cmですか。`, `${a}×${k}＝${a * k}`, `${a * k}cm`, "何倍") : W_(`青いテープの長さは${a * k}cmで，赤いテープの長さの${k}倍です。赤いテープは何cmですか。`, `${a * k}÷${k}＝${a}`, `${a}cm`, "何倍"); }}
]});

unit3(4, "たし算とひき算", "6月", "3けたや4けたの筆算ができるようになろう", [
  {id:"a", name:"3けたのたし算", gen(lv){ const a = ri(101, lv === 2 ? 999 : 699), b = ri(lv === 0 ? 11 : 101, lv === 2 ? 999 : 299); return hissanAddItem(a, b, "+"); }},
  {id:"b", name:"3けたのひき算", gen(lv){ for(;;){ const a = lv === 2 ? pick([1000, ri(301, 999)]) : ri(301, 999), b = ri(lv === 0 ? 11 : 101, a - 1); if(lv === 0 && String(a).split("").some((c, i) => +c < +(String(b).padStart(3, "0")[i]))) continue; return hissanAddItem(a, b, "-"); } }},
  {id:"c", name:"大きい数のたし算・ひき算", gen(lv){ const a = ri(1001, 8999), b = ri(1001, 9999 - a); return R() < 0.5 ? hissanAddItem(a, b, "+") : hissanAddItem(a + b, b, "-"); }},
  {id:"d", name:"計算のくふう", gen(lv){
    const a = ri(101, 899), b = ri(11, 89), c = 100 - b;
    return L(`${a}＋${b}＋${c}＝<<${a + 100}>>`, "くふうして計算しましょう。", "計算のくふう");
  }}
]);

unit3(5, "表とグラフ", "6月", "調べたことを表やぼうグラフに整理しよう", [
  {id:"a", name:"ぼうグラフを読む", gen(lv){
    const labels = pick([["犬", "ねこ", "うさぎ", "小鳥", "その他"], ["バス", "トラック", "乗用車", "自転車", "その他"], ["りんご", "みかん", "いちご", "もも", "その他"]]);
    const step = lv === 0 ? 1 : lv === 1 ? 2 : 5, vals = labels.map((_, i) => i === 4 ? ri(1, 4) * step : ri(2, 14) * step);
    const mx = vals.indexOf(Math.max(...vals.slice(0, 4))); if(vals.filter(v => v === vals[mx]).length > 1) return this.gen(lv);
    const i1 = ri(0, 3); let i2; do{ i2 = ri(0, 3); } while(i2 === i1);
    const subs = [`1目もりは何人ですか。((${step}人))`, `${labels[i1]}がすきな人は何人ですか。((${vals[i1]}人))`, `いちばん多いのはどれですか。((${labels[mx]}))`];
    if(lv >= 1) subs.push(`${labels[i1]}と${labels[i2]}のちがいは何人ですか。((${Math.abs(vals[i1] - vals[i2])}人))`);
    return setItem(72, 52, (G, x, y, w, h, fs) => drawBars(G, x, y, w, h, fs, labels, vals, step, "人"), subs, {inst:K_Q, lead:"ぼうグラフ", text:"下のぼうグラフは，3年生のすきなものを調べたものです。", sig:vals.join()});
  }},
  {id:"b", name:"表を読む", gen(lv){
    const kinds = ["すきな遊び", "おにごっこ", "ドッジボール", "なわとび", "合計"], cls = ["1組", "2組", "3組"];
    const M = cls.map(() => [ri(3, 12), ri(3, 12), ri(3, 12)]);
    const rowT = M.map(r => r.reduce((a, b) => a + b, 0)), colT = [0, 1, 2].map(j => M.reduce((a, r) => a + r[j], 0)), T = rowT.reduce((a, b) => a + b, 0);
    const hide = new Set(); while(hide.size < (lv === 0 ? 2 : 4)) hide.add(ri(0, 3) + "," + ri(0, 3));
    const cell = (i, j, v) => hide.has(i + "," + j) ? `[[${v}]]` : String(v);
    const rows = [["組"].concat(kinds.slice(1))].concat(cls.map((c, i) => [c].concat(M[i].map((v, j) => cell(i, j, v)), [cell(i, 3, rowT[i])])), [["合計"].concat(colT.map((v, j) => cell(3, j, v)), [cell(3, 3, T)])]);
    return tableItem("3年生のすきな遊びを，組ごとに調べて表にまとめました。", rows, ["表のあいているところに，あてはまる数を書きましょう。"], {inst:K_Q, lead:"表", headRow:true});
  }}
]);

unit3(6, "長さ", "7月", "kmを使って，長い道のりを表そう", [
  {id:"a", name:"kmとm", gen(lv){
    const k = ri(1, 9), m = ri(1, 999);
    if(lv === 0) return L(`${k}km＝[[${k * 1000}]]m`, K_BOX, "□にあう数");
    return R() < 0.5 ? L(`${k}km${m}m＝[[${k * 1000 + m}]]m`, K_BOX, "□にあう数") : L(`${k * 1000 + m}m＝[[${k}]]km[[${m}]]m`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"道のりの計算", gen(lv){
    const a = ri(3, 9) * 100 + ri(0, 9) * 10, b = ri(3, 9) * 100 + ri(0, 9) * 10, s = a + b, fmt = v => v >= 1000 ? `${Math.floor(v / 1000)}km${v % 1000 ? v % 1000 + "m" : ""}` : `${v}m`;
    if(lv === 0) return W_(`家から公園まで${a}m，公園から学校まで${b}mあります。家から公園の前を通って学校まで行く道のりは，何mですか。`, `${a}＋${b}＝${s}`, `${s}m`, "道のり");
    return W_(`家から公園まで${a}m，公園から学校まで${b}mあります。家から公園の前を通って学校まで行く道のりは，何km何mですか。`, `${a}＋${b}＝${s}`, fmt(s), "道のり");
  }}
]);

/* 円と球：箱に球がならんでいる図 */
function genBalls(lv){
  const r = ri(2, 6), n = ri(2, lv === 2 ? 4 : 3), rows = lv === 2 ? 2 : 1;
  const draw = (G, x, y, w, h, fs) => {
    const s = Math.min((w - 8) / (2 * r * n), (h - 10) / (2 * r * rows)), R_ = r * s, bx = x + (w - 2 * R_ * n) / 2, by = y + 2;
    G.rect(bx, by, 2 * R_ * n, 2 * R_ * rows, {w:0.4});
    for(let j = 0; j < rows; j++) for(let i = 0; i < n; i++) G.arc(bx + R_ * (2 * i + 1), by + R_ * (2 * j + 1), R_, 0, 2 * Math.PI, {w:0.35});
    G.line(bx + R_, by + R_, bx + 2 * R_, by + R_, {w:0.3}); G.dot(bx + R_, by + R_, 0.3);
    G.text(cm(r), bx + 1.5 * R_, by + R_ - 1.5, {size:fs * 0.7, align:"center"});
  };
  const q = lv === 2 ? `たての長さ((${4 * r}cm))　横の長さ((${2 * r * n}cm))` : `箱の横の長さ((${2 * r * n}cm))`;
  return figItem(62, lv === 2 ? 34 : 24, draw, q, {inst:`同じ大きさの球が，箱にぴったり入っています。球の半${KEI}は図のとおりです。`, lead:"円と球", sig:"b" + r + n + rows});
}
unit3(7, "円と球", "9月", "円や球のとくちょうを見つけて，コンパスでかこう", [
  {id:"a", name:`半${KEI}と直${KEI}`.replace(/【(.)\|[^】]*】/g, "$1"), gen(lv){
    const r = ri(2, 12);
    if(lv === 0) return L(`半${KEI}が${r}cmの円の直${KEI}((${2 * r}cm))`, K_Q, "円");
    if(lv === 1) return L(`直${KEI}が${2 * r}cmの円の半${KEI}((${r}cm))`, K_Q, "円");
    return R() < 0.5 ? L(`直${KEI}が${2 * r}cmの球の半${KEI}((${r}cm))`, K_Q, "球") : L(`半${KEI}が${r}cmの球の直${KEI}((${2 * r}cm))`, K_Q, "球");
  }},
  {id:"b", name:"球のならんだ箱", gen(lv){ return genBalls(lv); }}
]);

unit3(8, "あまりのあるわり算", "9月", "あまりのあるわり算の答えを考えよう", [
  {id:"a", name:"あまりのあるわり算", gen(lv){ const d = ri(2, 9), q = ri(1, 9), r = ri(1, d - 1); return L(`${d * q + r}÷${d}＝<<${q}あまり${r}>>`, K_CALC, "計算"); }},
  {id:"b", name:"答えのたしかめ", gen(lv){ const d = ri(2, 9), q = ri(1, 9), r = ri(1, d - 1), n = d * q + r; return L(`${n}÷${d}＝${q}あまり${r}　たしかめの式((${d}×${q}＋${r}＝${n}))`, "わり算の答えをたしかめる式を書きましょう。", "たしかめ"); }},
  {id:"c", name:"文章題", gen(lv){
    const d = ri(3, 9), q = ri(2, 9), r = ri(1, d - 1), n = d * q + r;
    if(lv === 0) return W_(`${n}このあめを，1人に${d}こずつ分けます。何人に分けられて，何こあまりますか。`, `${n}÷${d}＝${q}あまり${r}`, `${q}人に分けられて，${r}こあまる`, "あまり");
    if(lv === 1) return W_(`${n}人の子どもが，長いすに${d}人ずつすわります。みんながすわるには，長いすは何きゃくいりますか。`, [`${n}÷${d}＝${q}あまり${r}`, `${q}＋1＝${q + 1}`], `${q + 1}きゃく`, "あまり");
    return W_(`${n}本の花で，${d}本ずつの花たばを作ります。花たばは何たばできますか。`, `${n}÷${d}＝${q}あまり${r}`, `${q}たば`, "あまり");
  }}
]);

unit3(9, "（２けた）×（１けた）の計算", "10月", "2けた×1けたを分けて計算しよう", [
  {id:"a", name:"（2けた）×（1けた）", gen(lv){ for(;;){ const a = ri(11, lv === 0 ? 33 : 49), b = ri(2, lv === 0 ? 3 : 9); if(lv === 0 && (a % 10) * b >= 10) continue; return L(`${a}×${b}＝<<${a * b}>>`, K_CALC, "計算"); } }}
]);

unit3(10, "１けたをかけるかけ算", "10月", "1けたをかける筆算をすらすらできるようになろう", [
  {id:"a", name:"何十・何百のかけ算", gen(lv){ const a = ri(1, 9) * (lv === 2 ? 100 : 10), b = ri(2, 9); return L(`${a}×${b}＝<<${a * b}>>`, K_CALC, "計算"); }},
  {id:"b", name:"（2けた）×（1けた）の筆算", gen(lv){ return hissanMulItem(String(ri(lv === 0 ? 11 : 21, 99)), String(ri(2, 9))); }},
  {id:"c", name:"（3けた）×（1けた）の筆算", gen(lv){ return hissanMulItem(String(ri(lv === 0 ? 111 : 201, 999)), String(ri(2, 9))); }},
  {id:"d", name:"文章題", gen(lv){ const a = ri(12, 250), b = ri(3, 9); return W_(`1こ${a}円のパンを${b}こ買います。代金は何円ですか。`, `${a}×${b}＝${a * b}`, `${a * b}円`, "かけ算"); }}
]);

unit3(11, "大きい数", "11月", "一万より大きい数の読み方や書き方を知ろう", [
  {id:"a", name:"大きい数の読み書き", gen(lv){
    for(;;){ const len = lv === 0 ? 5 : ri(6, 8), digs = [ri(1, 9)]; for(let i = 1; i < len; i++) digs.push(R() < 0.45 ? 0 : ri(1, 9)); const n = Number(digs.join(""));
      return R() < 0.5 ? L(`${kanjiNum(n)}を数字で書きましょう。((${n}))`, K_Q, "大きい数") : L(`${n}を漢字で書きましょう。((${kanjiNum(n)}))`, K_Q, "大きい数"); }
  }},
  {id:"b", name:"大きい数のしくみ", gen(lv){
    if(lv === 0){ const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9); return L(`1000を${a}こ，100を${b}こ，1を${c}こあわせた数は[[${a * 1000 + b * 100 + c}]]です。`, K_BOX, "□にあう数"); }
    if(lv === 1){ const n = ri(12, 99) * 1000; return L(`${n}は，1000を[[${n / 1000}]]こ集めた数です。`, K_BOX, "□にあう数"); }
    const n = ri(12, 99) * 10; return R() < 0.5 ? L(`${n}を100倍した数((${n * 100}))`, K_Q, "10倍・100倍") : L(`${n}を10でわった数((${n / 10}))`, K_Q, "10でわる");
  }},
  {id:"c", name:"数の線", gen(lv){
    const step = lv === 0 ? 1000 : lv === 1 ? 10000 : 100000, start = lv === 2 ? 0 : ri(0, 5) * step * 10, a = ri(1, 9), b = ri(11, 19);
    const va = start + a * step, vb = start + b * step;
    return figItem(110, 16, (G, x, y, w, h, fs) => drawNumLine(G, x, y, w, fs, start, step, 20, 10, [[va, "ア"], [vb, "イ"]]), `ア((${va}))　イ((${vb}))`, {inst:"数の線のア，イが表す数を書きましょう。", lead:"数の線", sig:"nl" + va + vb});
  }},
  {id:"d", name:"大きい数の計算", gen(lv){ const a = ri(12, 60), b = ri(11, 39); return R() < 0.5 ? L(`${a}万＋${b}万＝<<${a + b}万>>`, K_CALC, "計算") : L(`${a + b}万－${b}万＝<<${a}万>>`, K_CALC, "計算"); }}
]);

unit3(12, "小数", "12月", "1より小さい数を小数で表そう", [
  {id:"a", name:"小数のしくみ", gen(lv){
    if(lv === 0){ const a = ri(2, 9); return L(`0.1を${a}こ集めた数は[[${ds(a, 1)}]]です。`, K_BOX, "□にあう数"); }
    if(lv === 1){ const n = ri(11, 99); if(n % 10 === 0) return this.gen(lv); return L(`${ds(n, 1)}は，0.1を[[${n}]]こ集めた数です。`, K_BOX, "□にあう数"); }
    const a = ri(1, 9), b = ri(1, 9); return L(`${a}と0.${b}をあわせた数は[[${a}.${b}]]です。`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"小数とたんい", gen(lv){ const n = ri(11, 99); if(n % 10 === 0) return this.gen(lv); return pick([() => L(`${n}dL＝[[${ds(n, 1)}]]L`, K_BOX, "□にあう数"), () => L(`${n}mm＝[[${ds(n, 1)}]]cm`, K_BOX, "□にあう数"), () => L(`${ds(n, 1)}cm＝[[${n}]]mm`, K_BOX, "□にあう数")])(); }},
  {id:"c", name:"小数のたし算・ひき算", gen(lv){
    const a = rdec(lv === 0 ? 1 : 11, 99, 1), b = rdec(lv === 0 ? 1 : 11, 99, 1);
    if(R() < 0.5) return L(`${a}＋${b}＝<<${dadd(a, b)}>>`, K_CALC, "計算");
    const [x, y] = +a >= +b ? [a, b] : [b, a]; if(x === y) return this.gen(lv); return L(`${x}－${y}＝<<${dadd(x, y, -1)}>>`, K_CALC, "計算");
  }},
  {id:"d", name:"小数の大小", gen(lv){ const a = rdec(1, 99, 1), b = rdec(1, 99, 1); if(a === b) return this.gen(lv); return L(`${a}[[${+a > +b ? "＞" : "＜"}]]${b}`, "[[ ]]に，＞か＜を書きましょう。", "大小"); }}
]);

/* 三角形の名前（3年） */
unit3(13, "三角形と角", "1月", "いろいろな三角形のなかまを調べてかこう", [
  {id:"a", name:"三角形の名前", gen(lv){
    const a = ri(3, 9); let t, ans;
    if(lv === 0){ t = R() < 0.5 ? [a, a, a] : [a, a, a === 9 ? 5 : a + ri(1, 2)]; }
    else { t = pick([[a, a, a], [a, a, ri(2, 2 * a - 1)], [a, ri(3, 9), ri(3, 9)]]); }
    const s = new Set(t).size; if(s === 3 && lv === 0) return this.gen(lv);
    if(t[0] + t[1] <= t[2] || t[0] + t[2] <= t[1] || t[1] + t[2] <= t[0]) return this.gen(lv);
    ans = s === 1 ? "正三角形" : s === 2 ? `二等${HEN}三角形` : "どちらでもない";
    return L(`${HEN}の長さが${t.map(cm).join("，")}の三角形((${ans}))`, `つぎの三角形は，二等${HEN}三角形ですか，正三角形ですか。`, "三角形の名前");
  }},
  {id:"b", name:"円を使った三角形", gen(lv){
    const r = ri(2, 6), c = ri(2, 2 * r - 1);
    if(lv === 2) return L(`半${KEI}${r}cmの円の中心と，円のまわりの2つの点を直線でむすんでできる三角形で，円のまわりの2点をむすんだ${HEN}が${r}cmのとき，三角形の名前((正三角形))`, K_Q, "三角形");
    return L(`半${KEI}${r}cmの円の中心と，円のまわりの2つの点を直線でむすんでできる三角形の名前((二等${HEN}三角形))`, K_Q, "三角形");
  }},
  {id:"c", name:"角の大きさくらべ", gen(lv){
    return pick([() => L(`正三角形の3つの角の大きさは，どうなっていますか。((みんな同じ))`, K_Q, "角"), () => L(`二等${HEN}三角形で，大きさが同じになっている角はいくつありますか。((2つ))`, K_Q, "角")])();
  }}
]);

unit3(14, "２けたをかけるかけ算", "1月", "2けたをかける筆算ができるようになろう", [
  {id:"a", name:"何十をかけるかけ算", gen(lv){ const a = ri(2, lv === 0 ? 9 : 40), b = ri(2, 9) * 10; return L(`${a}×${b}＝<<${a * b}>>`, K_CALC, "計算"); }},
  {id:"b", name:"（2けた）×（2けた）の筆算", gen(lv){ return hissanMulItem(String(ri(12, 99)), String(ri(lv === 0 ? 11 : 12, lv === 0 ? 29 : 99))); }},
  {id:"c", name:"（3けた）×（2けた）の筆算", gen(lv){ return hissanMulItem(String(ri(101, 999)), String(ri(12, 99))); }},
  {id:"d", name:"文章題", gen(lv){ const a = ri(12, 90), b = ri(12, 40); return W_(`1さつ${a}円のノートを${b}さつ買います。代金は何円ですか。`, `${a}×${b}＝${a * b}`, `${a * b}円`, "かけ算"); }}
]);

unit3(15, "分数", "2月", "等分した大きさを分数で表そう", [
  {id:"a", name:"分数の表し方", gen(lv){
    const d = ri(2, 9), n = ri(1, lv === 0 ? d - 1 : d + 2);
    if(lv === 0) return L(`1mを${d}等分した${n}こ分の長さ((${F(n, d)}m))`, K_Q, "分数");
    if(lv === 1) return L(`${F(1, d)}Lの${n}こ分のかさ((${F(n, d)}L))`, K_Q, "分数");
    return L(`${F(n, d)}は，${F(1, d)}の[[${n}]]こ分です。`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"分数の大小", gen(lv){
    const d = ri(3, 9), a = ri(1, d), b = ri(1, d); if(a === b) return this.gen(lv);
    if(lv === 2) return L(`${F(a, d)}[[${a > b ? "＞" : "＜"}]]${F(b, d)}`, "[[ ]]に，＞か＜を書きましょう。", "大小");
    return L(`${F(a, d)}[[${a > b ? "＞" : "＜"}]]${F(b, d)}`, "[[ ]]に，＞か＜を書きましょう。", "大小");
  }},
  {id:"c", name:"分数のたし算・ひき算", gen(lv){
    const d = ri(3, 9), a = ri(1, d - 1), b = ri(1, d - a); const op = R() < 0.5;
    if(op){ const s = a + b; return L(`${F(a, d)}＋${F(b, d)}＝<<${s === d ? "1" : F(s, d)}>>`, K_CALC, "計算"); }
    if(lv === 2){ return L(`1－${F(a, d)}＝<<${F(d - a, d)}>>`, K_CALC, "計算"); }
    if(a + b === d) return L(`1－${F(b, d)}＝<<${F(a, d)}>>`, K_CALC, "計算");
    return L(`${F(a + b, d)}－${F(b, d)}＝<<${F(a, d)}>>`, K_CALC, "計算");
  }}
]);

unit3(16, "重さ", "2月", "gやkgを使って重さをはかろう", [
  {id:"a", name:"はかりを読む", gen(lv){
    const [mx, st] = lv === 0 ? [1000, 5] : lv === 1 ? [2000, 10] : [4000, 20];
    const v = ri(1, mx / st - 1) * st;
    const fmt = v >= 1000 ? `${Math.floor(v / 1000)}kg${v % 1000 ? v % 1000 + "g" : ""}` : `${v}g`;
    return figItem(40, 40, (G, x, y, w, h, fs) => drawScale(G, x + w / 2, y + h / 2, Math.min(w, h) / 2 - 1, fs, mx, st, v), `((${fmt}))`, {inst:"はかりのはりがさしている重さを読みましょう。", lead:"はかり", sig:"s" + mx + v});
  }},
  {id:"b", name:"重さのたんい", gen(lv){
    if(lv === 0) return pick([() => L(`1kg＝[[1000]]g`, K_BOX, "□にあう数"), () => L(`1t＝[[1000]]kg`, K_BOX, "□にあう数")])();
    const k = ri(1, 5), g = ri(1, 999); return R() < 0.5 ? L(`${k}kg${g}g＝[[${k * 1000 + g}]]g`, K_BOX, "□にあう数") : L(`${k * 1000 + g}g＝[[${k}]]kg[[${g}]]g`, K_BOX, "□にあう数");
  }},
  {id:"c", name:"重さの計算", gen(lv){
    const a = ri(2, 9) * 100, b = ri(12, 29) * 100, t = a + b, fmt = v => `${Math.floor(v / 1000)}kg${v % 1000 ? v % 1000 + "g" : ""}`;
    return W_(`${a}gのかごに，${fmt(b)}のりんごを入れました。全体の重さは何kg何gですか。`, [`${fmt(b)}＝${b}g`, `${a}＋${b}＝${t}`], fmt(t), "重さ");
  }}
]);

unit3(17, "□を使った式", "3月", "わからない数を□にして式に表そう", [
  {id:"a", name:"□にあてはまる数", gen(lv){
    const x = ri(3, 40), a = ri(3, 40), k = ri(2, 9);
    if(lv === 0) return R() < 0.5 ? L(`□＋${a}＝${x + a}　□＝<<${x}>>`, "□にあてはまる数をもとめましょう。", "□を求める") : L(`□－${a}＝${x}　□＝<<${x + a}>>`, "□にあてはまる数をもとめましょう。", "□を求める");
    const v = ri(1, 9), w = ri(1, 9);
    return R() < 0.5 ? L(`□×${k}＝${v * k}　□＝<<${v}>>`, "□にあてはまる数をもとめましょう。", "□を求める") : L(`□÷${k}＝${w}　□＝<<${w * k}>>`, "□にあてはまる数をもとめましょう。", "□を求める");
  }},
  {id:"b", name:"文章題", gen(lv){
    const x = ri(10, 60), a = ri(5, 40);
    if(lv === 0) return W_(`あめを何こか持っていました。友だちから${a}こもらったので，${x + a}こになりました。はじめに持っていたあめの数を□こにして式に表し，□をもとめましょう。`, [`□＋${a}＝${x + a}`, `□＝${x + a}－${a}＝${x}`], `${x}こ`, "□を使った式");
    const k = ri(3, 9), p = ri(3, 12) * 10;
    return W_(`同じねだんのえんぴつを${k}本買ったら，代金は${p * k}円でした。えんぴつ1本のねだんを□円にして式に表し，□をもとめましょう。`, [`□×${k}＝${p * k}`, `□＝${p * k}÷${k}＝${p}`], `${p}円`, "□を使った式");
  }}
]);

unit3(18, "しりょうの活用", "3月", "表やグラフを読んで，気づいたことを話そう", [
  Object.assign({id:"a", name:"ぼうグラフと表"}, pool(["3-5.a", "3-5.b"]))
]);

unit3(19, "そろばん", "3月", "そろばんで数を表して計算しよう", [
  {id:"a", name:"そろばんの数を読む", gen(lv){
    const n = 7, onesIdx = lv === 2 ? 5 : 6, digs = Array.from({length:n}, () => 0);
    for(let i = lv === 0 ? 4 : 2; i < n; i++) digs[i] = ri(i === (lv === 0 ? 4 : 2) ? 1 : 0, 9);
    let s = ""; for(let i = 0; i < n; i++){ s += digs[i]; if(i === onesIdx && i < n - 1) s += "."; }
    const val = s.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return figItem(46, 30, (G, x, y, w, h, fs) => drawSoroban(G, x, y, w, h - 3, fs, digs, onesIdx), `((${val}))`, {inst:"そろばんに入れた数を読みましょう。", lead:"そろばん", sig:s});
  }},
  {id:"b", name:"そろばんで計算", gen(lv){ const a = ri(11, 60), b = ri(11, 39); return R() < 0.5 ? L(`${a}＋${b}＝<<${a + b}>>`, "そろばんを使って計算しましょう。", "そろばん") : L(`${a + b}－${b}＝<<${a}>>`, "そろばんを使って計算しましょう。", "そろばん"); }}
]);

unit3(20, "３年のまとめ", "3月", "3年でならったことをたしかめよう", [
  Object.assign({id:"a", name:"数と計算"}, pool(["3-3.a", "3-4.a", "3-4.b", "3-8.a", "3-10.b", "3-11.a", "3-12.c", "3-14.b", "3-15.c"])),
  Object.assign({id:"b", name:"図形とりょう"}, pool(["3-6.a", "3-7.a", "3-7.b", "3-13.a", "3-16.a", "3-16.b", "3-2.b"])),
  Object.assign({id:"c", name:"文章題とグラフ"}, pool(["3-3.b", "3-8.c", "3-17.b", "3-5.a"]))
]);
GRADES[3] = U3;
