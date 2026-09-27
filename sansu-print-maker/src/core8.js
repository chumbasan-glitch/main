/* ================= 4年の単元と問題 ================= */
const U4 = [];
function unit4(no, name, month, meate, subs){ U4.push({id:"4-" + no, no, name, month, meate, subs}); }
const SUI = "【垂|すい】直", SHA = "四【捨|しゃ】五入";
const KN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
/* 数を漢字で書く（万・億・兆の4けたごと） */
function kanjiNum(n){
  const units = ["", "万", "億", "兆"]; let s = "", i = 0;
  if(n === 0) return "零";
  while(n > 0){
    const g = n % 10000; n = Math.floor(n / 10000);
    if(g){ let t = ""; const th = Math.floor(g / 1000), h = Math.floor(g / 100) % 10, te = Math.floor(g / 10) % 10, o = g % 10;
      if(th) t += (th > 1 ? KN[th] : "") + "千"; if(h) t += (h > 1 ? KN[h] : "") + "百"; if(te) t += (te > 1 ? KN[te] : "") + "十"; if(o) t += KN[o];
      s = t + units[i] + s; }
    i++;
  }
  return s;
}
/* 大きな数（億・兆をふくむ）を、0の多い形で作る */
function bigNum(lv){
  for(;;){
    const len = lv === 0 ? ri(9, 10) : ri(10, 13), digs = [ri(1, 9)];
    for(let i = 1; i < len; i++) digs.push(R() < (lv === 2 ? 0.45 : 0.6) ? 0 : ri(1, 9));
    const n = Number(digs.join("")); if(n <= Number.MAX_SAFE_INTEGER) return n;
  }
}

unit4(1, "大きい数", "4月", "数の表し方やしくみを調べよう", [
  {id:"a", name:"大きい数の読み書き", gen(lv){
    const n = bigNum(lv);
    return R() < 0.5 ? L(`${kanjiNum(n)}を数字で書きましょう。((${n}))`, K_Q, "大きい数") : L(`${n}を漢字で書きましょう。((${kanjiNum(n)}))`, K_Q, "大きい数");
  }},
  {id:"b", name:"大きい数のしくみ", gen(lv){
    if(lv === 0){ const a = ri(2, 9), u = pick(["億", "兆"]); return R() < 0.5 ? L(`1${u}を${a}こ集めた数は[[${a}${u}]]です。`, K_BOX, "□にあう数") : L(`1000万を10こ集めた数は[[1億]]です。`.replace("1000万を10こ", u === "億" ? "1000万を10こ" : "1000億を10こ").replace("[[1億]]", u === "億" ? "[[1億]]" : "[[1兆]]"), K_BOX, "□にあう数"); }
    if(lv === 1){ const a = ri(2, 9) * pick([1, 10, 100]), m = pick([10, 100]); return L(`${a}億を${m}倍した数((${a * m >= 10000 ? (a * m / 10000) + "兆" : a * m + "億"}))`, K_Q, "10倍・100倍"); }
    const a = ri(2, 9) * 10; return L(`${a}兆の${F(1, 10)}の数((${a / 10}兆))`, K_Q, "10分の1");
  }},
  {id:"c", name:"大きい数の計算", gen(lv){
    const u = pick(["億", "兆"]), a = ri(12, 80), b = ri(11, 60);
    if(lv === 0) return R() < 0.5 ? L(`${a}${u}＋${b}${u}＝<<${a + b}${u}>>`, K_CALC, "計算") : L(`${a + b}${u}－${b}${u}＝<<${a}${u}>>`, K_CALC, "計算");
    if(lv === 1){ const k = ri(2, 9); return R() < 0.5 ? L(`${a}${u}×${k}＝<<${a * k}${u}>>`, K_CALC, "計算") : L(`${a * k}${u}÷${k}＝<<${a}${u}>>`, K_CALC, "計算"); }
    const x = ri(12, 90) * 10, y = ri(12, 90) * 100; return L(`${x}万×${y}＝<<${kanjiUnit(x * y * 10000)}>>`, K_CALC, "計算");
  }}
]);
function kanjiUnit(n){ /* 例：36000000000 → 360億 */
  if(n % 1e12 === 0) return n / 1e12 + "兆";
  if(n % 1e8 === 0) return n / 1e8 + "億";
  if(n % 1e4 === 0) return n / 1e4 + "万";
  return String(n);
}

/* ---------- 折れ線グラフ ---------- */
const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
function tempSeries(){ const base = ri(3, 8), amp = ri(17, 22), out = []; for(let m = 0; m < 12; m++) out.push(Math.round(base + amp * Math.sin((m - 3) / 12 * 2 * Math.PI) / 2 + amp / 2 + ri(-1, 1))); return out; }
function drawLineGraph(G, x, y, w, h, fs, series, ymax, step, unitLbl){
  const ox = x + 10, oy = y + h - 7, gw = w - 14, gh = h - 12, n = series[0].length;
  for(let v = 0; v <= ymax; v++){ const yy = oy - gh * v / ymax; G.line(ox, yy, ox + gw, yy, {w:v % step === 0 ? 0.15 : 0.07, color:GRID}); if(v % step === 0) G.text(String(v), ox - 1.5, yy, {size:fs * 0.5, align:"right"}); }
  for(let i = 0; i < n; i++){ const xx = ox + gw * (i + 0.5) / n; G.text(String(i + 1), xx, oy + 2.4, {size:fs * 0.5, align:"center"}); }
  G.line(ox, oy, ox + gw, oy, {w:0.4}); G.line(ox, oy, ox, oy - gh, {w:0.4});
  G.text("(" + unitLbl + ")", ox - 1, y + 1.5, {size:fs * 0.5, align:"right"}); G.text("(月)", ox + gw, oy + 5, {size:fs * 0.5, align:"right"});
  series.forEach((s, k) => {
    const pts = s.map((v, i) => [ox + gw * (i + 0.5) / n, oy - gh * v / ymax]);
    G.poly(pts, {close:false, w:0.45, dash:k ? [1, 0.6] : null});
    pts.forEach(p => k ? G.rect(p[0] - 0.6, p[1] - 0.6, 1.2, 1.2, {fill:INK, stroke:false}) : G.dot(p[0], p[1], 0.6));
  });
}
unit4(2, "折れ線グラフ", "4月", "変わり方がわかりやすいグラフを調べよう", [
  {id:"a", name:"折れ線グラフを読む", gen(lv){
    const T = tempSeries(), m = ri(0, 11), mx = T.indexOf(Math.max(...T));
    if(T.filter(v => v === T[mx]).length > 1) return this.gen(lv);
    const d = T.slice(1).map((v, i) => v - T[i]), up = d.indexOf(Math.max(...d));
    if(d.filter(v => v === d[up]).length > 1) return this.gen(lv);
    const subs = [`${MONTHS[m]}の気温は何度ですか。((${T[m]}度))`, `気温がいちばん高いのは何月ですか。((${MONTHS[mx]}))`];
    if(lv >= 1) subs.push(`気温の上がり方がいちばん大きいのは，何月から何月の間ですか。((${MONTHS[up]}から${MONTHS[up + 1]}))`);
    if(lv === 2){ const a = ri(0, 11); let b; do{ b = ri(0, 11); } while(b === a); subs.push(`${MONTHS[a]}と${MONTHS[b]}の気温のちがいは何度ですか。((${Math.abs(T[a] - T[b])}度))`); }
    return setItem(78, 54, (G, x, y, w, h, fs) => drawLineGraph(G, x, y, w, h, fs, [T], 30, 5, "度"), subs, {inst:K_Q, lead:"折れ線グラフ", text:"下の折れ線グラフは，ある市の1年間の気温の変わり方を表したものです。", sig:T.join()});
  }},
  {id:"b", name:"折れ線グラフに表すとよいもの", gen(lv){
    const L_ = [["1日の気温の変わり方", "折れ線グラフ"], ["自分の身長の1年ごとの変わり方", "折れ線グラフ"], ["プールの水温の毎日の変わり方", "折れ線グラフ"], ["クラスのすきなスポーツの人数", "ぼうグラフ"], ["町ごとの人口", "ぼうグラフ"], ["4年生の組ごとの図書室でかりた本の数", "ぼうグラフ"]];
    const [t, a] = pick(L_); return L(`${t}((${a}))`, "折れ線グラフとぼうグラフのどちらに表すとよいですか。", "グラフのえらび方");
  }}
]);

/* ---------- わり算（きまり・何十何百） ---------- */
unit4(3, "わり算", "4月", "わり算のきまりを見つけて使おう", [
  {id:"a", name:"わり算のきまり", gen(lv){
    const q = ri(2, 9), d = ri(2, 9), k = pick([10, 100]);
    if(lv === 0) return L(`${q * d * 10}÷${d * 10}＝${q * d}÷[[${d}]]`, K_BOX, "□にあう数");
    if(lv === 1) return L(`${q * d * k}÷${d * k}＝[[${q}]]`, K_BOX, "□にあう数");
    return L(`${q * d}÷${d}＝${q * d * 3}÷[[${d * 3}]]`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"何十・何百のわり算", gen(lv){
    const q = ri(1, 9), d = ri(2, 9);
    if(lv === 0) return L(`${q * d * 10}÷${d}＝<<${q * 10}>>`, K_CALC, "計算");
    if(lv === 1) return L(`${q * d * 100}÷${d}＝<<${q * 100}>>`, K_CALC, "計算");
    const q2 = ri(11, 30); return L(`${q2 * d * 10}÷${d}＝<<${q2 * 10}>>`, K_CALC, "計算");
  }}
]);

/* ---------- 角 ---------- */
function genAngle4(lv){
  const kind = lv === 0 ? "line" : lv === 1 ? pick(["line", "vert"]) : "big";
  const a = ri(3, 16) * 5 + (lv === 2 ? ri(0, 4) : 0);
  const draw = (G, x, y, w, h, fs) => {
    const cx = x + w / 2, cy = y + h / 2 + (kind === "line" ? 5 : 0), L_ = Math.min(w / 2 - 3, h - 8);
    const ray = t => [cx + L_ * Math.cos(t), cy - L_ * Math.sin(t)];
    if(kind === "line"){
      G.line(cx - L_, cy, cx + L_, cy, {w:0.4}); const r = ray(a * D2R); G.line(cx, cy, ...r, {w:0.4});
      angleMark(G, [cx, cy], [cx + L_, cy], r, a + "°", fs); angleMark(G, [cx, cy], r, [cx - L_, cy], "ア", fs);
    } else if(kind === "vert"){
      const t = a * D2R, p1 = ray(t), p2 = ray(t + Math.PI);
      G.line(cx - L_, cy, cx + L_, cy, {w:0.4}); G.line(...p2, ...p1, {w:0.4});
      angleMark(G, [cx, cy], [cx + L_, cy], p1, a + "°", fs); angleMark(G, [cx, cy], [cx - L_, cy], p2, "ア", fs);
    } else {
      const t = a * D2R, p1 = ray(0), p2 = ray(t);
      G.line(cx, cy, ...p1, {w:0.4}); G.line(cx, cy, ...p2, {w:0.4});
      angleMark(G, [cx, cy], p1, p2, a + "°", fs);
      G.arc(cx, cy, 3.2, 0, 2 * Math.PI - t, {w:0.25});
      G.text("ア", cx - 5, cy + 3.5, {size:fs * 0.85, align:"center"});
    }
  };
  const ans = kind === "big" ? 360 - a : 180 - a;
  const ansV = kind === "vert" ? a : ans;
  const inst = kind === "big" ? "アの角度を計算で求めましょう。" : "アの角度を計算で求めましょう。";
  return figItem(FIGW, FIGH, draw, `ア((${ansV}°))`, {inst, lead:"角度", sig:kind + a});
}
unit4(4, "角", "5月", "角の大きさのはかり方やかき方を考えよう", [
  {id:"a", name:"角度を計算で求める", gen(lv){ return genAngle4(lv); }},
  {id:"b", name:"回転の角と直角", gen(lv){
    if(lv === 0){ const k = ri(1, 3); return L(`直角${k}こ分の角度((${90 * k}°))`, K_Q, "回転の角"); }
    if(lv === 1) return pick([() => L(`半回転の角度((180°))`, K_Q, "回転の角"), () => L(`1回転の角度((360°))`, K_Q, "回転の角"), () => L(`1回転は，直角何こ分ですか。((4こ分))`, K_Q, "回転の角")])();
    const m = pick([5, 10, 15, 20, 25, 30, 40, 45]); return L(`時計の長いはりが${m}分間に回る角度((${m * 6}°))`, K_Q, "回転の角");
  }},
  {id:"c", name:"三角じょうぎの角", gen(lv){
    const A = [30, 60, 90, 45];
    const a = pick(A), b = pick(A.filter(v => v !== a || v === 45)), op = lv === 0 ? "＋" : pick(["＋", "－"]);
    const v = op === "＋" ? a + b : Math.abs(a - b); if(v === 0) return this.gen(lv);
    return L(`三角じょうぎの${Math.max(a, b)}°の角と${Math.min(a, b)}°の角を${op === "＋" ? "合わせてできる" : "重ねてできる"}角の大きさ((${v}°))`, K_Q, "三角じょうぎ");
  }}
]);

/* ---------- （2けた）÷（1けた）の計算 ---------- */
unit4(5, "（２けた）÷（１けた）の計算", "5月", "くふうして計算のしかたを考えよう", [
  {id:"a", name:"（2けた）÷（1けた）", gen(lv){
    for(;;){ const d = ri(2, 9), q = ri(11, 49), n = d * q; if(n > 99) continue;
      if(lv === 0 && (Math.floor(n / 10) % d || (n % 10) % d)) continue;
      if(lv >= 1 && !(Math.floor(n / 10) % d)) continue;
      if(lv === 2){ const r = ri(1, d - 1); if(n + r > 99) continue; return L(`${n + r}÷${d}＝<<${q}あまり${r}>>`, K_CALC, "計算"); }
      return L(`${n}÷${d}＝<<${q}>>`, K_CALC, "計算"); }
  }}
]);

/* ---------- 1けたでわるわり算（筆算） ---------- */
unit4(6, "１けたでわるわり算", "6月", "筆算のしかたを考えよう", [
  {id:"a", name:"商が2けた", gen(lv){
    for(;;){ const d = ri(2, 9), q = ri(11, 49), r = lv === 0 ? 0 : ri(1, d - 1), n = d * q + r; if(n > 99) continue;
      return hissanDivItem(String(n), String(d), r ? "rem" : "exact"); }
  }},
  {id:"b", name:"（3けた）÷（1けた）", gen(lv){
    for(;;){ const d = ri(2, 9), q = lv === 2 ? ri(12, 99) : ri(101, 330), r = lv === 0 ? 0 : ri(1, d - 1), n = d * q + r; if(n < 100 || n > 999) continue;
      return hissanDivItem(String(n), String(d), r ? "rem" : "exact"); }
  }},
  {id:"c", name:"商に0がたつ", gen(lv){
    for(;;){ const d = ri(2, 9), q = lv === 0 ? ri(2, 9) * 10 + 0 : ri(1, 3) * 100 + ri(0, 9), r = lv === 2 ? ri(1, d - 1) : 0, n = d * q + r;
      if(!String(q).includes("0") || n > 999) continue;
      return hissanDivItem(String(n), String(d), r ? "rem" : "exact"); }
  }},
  {id:"d", name:"答えのたしかめ", gen(lv){
    const d = ri(3, 9), q = ri(12, 90), r = ri(1, d - 1), n = d * q + r;
    return L(`${n}÷${d}＝${q}あまり${r}　たしかめの式((${d}×${q}＋${r}＝${n}))`, "わり算の答えをたしかめる式を書きましょう。", "たしかめ");
  }},
  {id:"e", name:"文章題", gen(lv){
    const d = ri(3, 9), q = ri(12, 40), r = lv === 0 ? 0 : ri(1, d - 1), n = d * q + r;
    if(lv === 0) return W_(`${n}まいの色紙を，${d}人で同じ数ずつ分けます。1人分は何まいになりますか。`, `${n}÷${d}＝${q}`, `${q}まい`, "わり算");
    if(lv === 1) return W_(`${n}本のえんぴつを，1人に${d}本ずつ配ります。何人に配れて，何本あまりますか。`, `${n}÷${d}＝${q}あまり${r}`, `${q}人に配れて，${r}本あまる`, "わり算");
    return W_(`${n}人の子どもが，1台に${d}人ずつ乗り物に乗ります。全員が乗るには，乗り物は何台いりますか。`, [`${n}÷${d}＝${q}あまり${r}`, `${q}＋1＝${q + 1}`], `${q + 1}台`, "わり算");
  }}
]);

/* ---------- しりょうの整理 ---------- */
unit4(7, "しりょうの整理", "6月", "表のまとめ方を考えよう", [
  {id:"a", name:"2つのことがらの表", gen(lv){
    const places = ["教室", "ろう下", "校庭", "体育館"], kinds = ["すりきず", "切りきず", "打ぼく"];
    const M = places.map(() => kinds.map(() => ri(0, 9)));
    const rowT = M.map(r => r.reduce((a, b) => a + b, 0)), colT = kinds.map((_, j) => M.reduce((a, r) => a + r[j], 0)), T = rowT.reduce((a, b) => a + b, 0);
    const hide = new Set(); const nh = lv === 0 ? 3 : lv === 1 ? 5 : 7;
    while(hide.size < nh) hide.add(ri(0, places.length) + "," + ri(0, kinds.length));
    const cell = (i, j, v) => hide.has(i + "," + j) ? `[[${v}]]` : String(v);
    const rows = [["場所＼しゅるい"].concat(kinds, ["合計"])].concat(places.map((p, i) => [p].concat(M[i].map((v, j) => cell(i, j, v)), [cell(i, kinds.length, rowT[i])])), [["合計"].concat(colT.map((v, j) => cell(places.length, j, v)), [cell(places.length, kinds.length, T)])]);
    const mi = rowT.indexOf(Math.max(...rowT));
    const subs = rowT.filter(v => v === rowT[mi]).length === 1 ? [`けがをした人がいちばん多い場所はどこですか。((${places[mi]}))`] : [];
    subs.unshift("表のあいているところに，あてはまる数を書きましょう。");
    return tableItem("4年生が1か月にしたけがを，場所としゅるいで分けて表にまとめました。", rows, subs, {inst:K_Q, lead:"表の整理", headRow:true});
  }}
]);

/* ---------- 2けたでわるわり算 ---------- */
unit4(8, "２けたでわるわり算", "7月", "筆算のしかたを考えよう", [
  {id:"a", name:"何十でわるわり算", gen(lv){
    const d = ri(2, 9) * 10, q = ri(2, 9), r = lv === 0 ? 0 : ri(1, d / 10 - 1) * 10;
    return L(`${d * q + r}÷${d}＝<<${q}${r ? "あまり" + r : ""}>>`, K_CALC, "計算");
  }},
  {id:"b", name:"（2・3けた）÷（2けた）＝1けた", gen(lv){
    for(;;){ const d = ri(12, 49), q = ri(2, 9), r = lv === 0 ? 0 : ri(1, d - 1), n = d * q + r; if(lv < 2 && n > 99) continue; if(n > 999) continue;
      return hissanDivItem(String(n), String(d), r ? "rem" : "exact"); }
  }},
  {id:"c", name:"（3けた）÷（2けた）＝2けた", gen(lv){
    for(;;){ const d = ri(12, 45), q = ri(11, lv === 2 ? 99 : 40), r = lv === 0 ? 0 : ri(1, d - 1), n = d * q + r; if(n < 100 || n > 999) continue;
      return hissanDivItem(String(n), String(d), r ? "rem" : "exact"); }
  }},
  {id:"d", name:"わり算のくふう", gen(lv){
    const q = ri(2, 9), d = ri(2, 9), k = lv === 0 ? 100 : 1000;
    if(lv === 2){ const r = ri(1, d - 1); return L(`${(q * d + r) * 100}÷${d * 100}＝<<${q}あまり${r * 100}>>`, "くふうして計算しましょう。", "わり算のくふう"); }
    return L(`${q * d * k}÷${d * k / 10}＝<<${q * 10}>>`, "くふうして計算しましょう。", "わり算のくふう");
  }},
  {id:"e", name:"文章題", gen(lv){
    const d = ri(12, 30), q = ri(3, 30), r = lv === 0 ? 0 : ri(1, d - 1), n = d * q + r;
    if(lv === 0) return W_(`${n}こあるあめを，${d}人で同じ数ずつ分けます。1人分は何こになりますか。`, `${n}÷${d}＝${q}`, `${q}こ`, "わり算");
    if(lv === 1) return W_(`${n}まいの紙を，${d}まいずつたばにします。何たばできて，何まいあまりますか。`, `${n}÷${d}＝${q}あまり${r}`, `${q}たばできて，${r}まいあまる`, "わり算");
    return W_(`${n}本の花を，${d}本ずつたばにして花たばを作ります。花たばは何たばできますか。`, `${n}÷${d}＝${q}あまり${r}`, `${q}たば`, "わり算");
  }}
]);

/* ---------- ○倍の計算（1）（2） ---------- */
U4.push({id:"4-x1", no:"○", name:"○倍の計算（１）", month:"7月", meate:"何倍かを考えよう", subs:[
  {id:"a", name:"何倍かを求める", gen(lv){ const a = ri(3, 20), k = ri(2, 9); return W_(`赤いテープの長さは${a}cm，青いテープの長さは${a * k}cmです。青いテープの長さは，赤いテープの長さの何倍ですか。`, `${a * k}÷${a}＝${k}`, `${k}倍`, "何倍"); }},
  {id:"b", name:"もとの大きさを求める", gen(lv){ const a = ri(3, 20), k = ri(2, 9); return lv === 0 ? W_(`赤いテープの長さは${a}cmです。青いテープの長さは，赤いテープの${k}倍です。青いテープは何cmですか。`, `${a}×${k}＝${a * k}`, `${a * k}cm`, "何倍") : W_(`青いテープの長さは${a * k}cmで，赤いテープの長さの${k}倍です。赤いテープは何cmですか。`, `${a * k}÷${k}＝${a}`, `${a}cm`, "何倍"); }}
]});
U4.push({id:"4-x2", no:"○", name:"○倍の計算（２）かんたんな割合", month:"9月", meate:"何倍かを使って，くらべ方を考えよう", subs:[
  {id:"a", name:"何倍で比べる", gen(lv){
    for(;;){ const a1 = ri(2, 6) * 10, k1 = ri(2, 5), a2 = ri(2, 6) * 10, k2 = ri(2, 5); if(k1 === k2 || a1 === a2) continue;
      return W_(`白いゴムは${a1}cmが${a1 * k1}cmまでのび，黒いゴムは${a2}cmが${a2 * k2}cmまでのびました。もとの長さをもとにすると，よくのびるといえるのはどちらのゴムですか。`, [`白　${a1 * k1}÷${a1}＝${k1}`, `黒　${a2 * k2}÷${a2}＝${k2}`], k1 > k2 ? "白いゴム" : "黒いゴム", "何倍でくらべる"); }
  }}
]});

/* ---------- 垂直・平行と四角形 ---------- */
const QUADS = [["向かい合った1組の辺が平行な四角形", "台形"], ["向かい合った2組の辺が，どちらも平行な四角形", "平行四辺形"], ["4つの辺の長さがみんな等しい四角形", "ひし形"], ["4つの角がみんな直角で，4つの辺の長さがみんな等しい四角形", "正方形"], ["4つの角がみんな直角な四角形", "長方形"]];
function genPara4(lv){
  const a = ri(3, 8), b = lv === 2 ? a : ri(3, 8), ang = ri(10, 16) * 5;
  const rh = lv === 2;
  const subs = [`辺CDの長さ((${a}cm))`, `辺ADの長さ((${b}cm))`, `角Bの大きさ((${ang}°))`, `角Cの大きさ((${180 - ang}°))`];
  const draw = (G, x, y, w, h, fs) => {
    const A = [0, 0], B = [a, 0], s = [b * Math.cos(ang * D2R), b * Math.sin(ang * D2R)];
    const pts = [[s[0], -s[1]], [a + s[0], -s[1]], [a, 0], [0, 0]];
    const f = fitPts(pts, x, y, w, h, 7), P = f.pts, cen = centroid(P), N = ["A", "B", "C", "D"];
    G.poly(P, {w:0.4}); P.forEach((p, i) => vLabel(G, p, cen, N[i], fs));
    sideLabel(G, P[0], P[1], cm(a), cen, fs); sideLabel(G, P[1], P[2], cm(b), cen, fs);
    angleMark(G, P[3], P[0], P[2], ang + "°", fs);
  };
  const inst = rh ? "下の四角形ABCDはひし形です。" : "下の四角形ABCDは平行四辺形です。";
  return setItem(62, 40, draw, lv === 0 ? subs.slice(0, 3) : subs, {inst, lead:rh ? "ひし形" : "平行四辺形"});
}
function genParallelLines(lv){
  const a = ri(8, 16) * 5, kind = lv === 0 ? "same" : lv === 1 ? "alt" : pick(["same", "alt", "co"]);
  const ans = kind === "co" ? 180 - a : a;
  const draw = (G, x, y, w, h, fs) => {
    const y1 = y + h * 0.3, y2 = y + h * 0.75, L_ = x + 2, R_ = x + w - 2;
    G.line(L_, y1, R_, y1, {w:0.4}); G.line(L_, y2, R_, y2, {w:0.4});
    G.text("あ", R_ - 1, y1 - 2.3, {size:fs * 0.65}); G.text("い", R_ - 1, y2 - 2.3, {size:fs * 0.65});
    /* 右上から左下へ下がる直線。上の交わる点 P1、下の交わる点 P2 */
    const dx = (y2 - y1) / Math.tan(a * D2R), mx = x + w / 2, P1 = [mx + dx / 2, y1], P2 = [mx - dx / 2, y2];
    const ext = 0.35, T1 = [P1[0] + dx * ext, y1 - (y2 - y1) * ext], T2 = [P2[0] - dx * ext, y2 + (y2 - y1) * ext];
    G.line(...T1, ...T2, {w:0.4});
    if(kind === "same"){ angleMark(G, P1, [R_, y1], T1, a + "°", fs); angleMark(G, P2, [R_, y2], P1, "ア", fs); }
    else if(kind === "alt"){ angleMark(G, P1, [L_, y1], P2, a + "°", fs); angleMark(G, P2, [R_, y2], P1, "ア", fs); }
    else { angleMark(G, P1, [L_, y1], P2, a + "°", fs); angleMark(G, P2, [L_, y2], P1, "ア", fs); }
  };
  const realAns = kind === "same" ? a : kind === "alt" ? a : 180 - a;
  return figItem(FIGW + 4, FIGH, draw, `ア((${realAns}°))`, {inst:"直線あと直線いは平行です。アの角度を求めましょう。", lead:"平行な直線と角", sig:kind + a});
}
unit4(9, "垂直・平行と四角形", "9月", "四角形のとくちょうを調べて，なかま分けしよう", [
  {id:"a", name:"四角形の名前", gen(lv){ const [t, a] = pick(lv === 0 ? QUADS.slice(0, 3) : QUADS); return L(`${t}((${a}))`, "つぎの四角形の名前を書きましょう。", "四角形の名前"); }},
  {id:"b", name:"平行四辺形・ひし形の辺と角", gen(lv){ return genPara4(lv); }},
  {id:"c", name:"対角線のとくちょう", gen(lv){
    const P = [["2本の対角線の長さが等しい", "長方形，正方形"], ["2本の対角線が" + SUI + "に交わる", "ひし形，正方形"], ["2本の対角線が，それぞれのまん中の点で交わる", "平行四辺形，ひし形，長方形，正方形"]];
    const [t, a] = pick(P); return L(`${t}四角形を，〔台形，平行四辺形，ひし形，長方形，正方形〕からすべて選びましょう。((${a}))`, K_Q, "対角線");
  }},
  {id:"d", name:"平行な直線と角", gen(lv){ return genParallelLines(lv); }}
]);

/* ---------- がい数 ---------- */
const PLACE = {10:"十", 100:"百", 1000:"千", 10000:"一万", 100000:"十万"};
const roundTo = (n, p) => Math.round(n / p) * p;
unit4(10, "がい数", "10月", "およその数の表し方や計算のしかたを考えよう", [
  {id:"a", name:SHA.replace(/【(.)\|[^】]*】/, "$1") + "でがい数にする", gen(lv){
    const n = ri(10000, 999999), p = lv === 0 ? pick([100, 1000]) : pick([1000, 10000]);
    if(lv === 2){ const k = pick([1, 2]), mag = P10(String(n).length - k); return L(`${n}を${SHA}して，上から${k}けたのがい数((${roundTo(n, mag)}))`, K_Q, "がい数"); }
    return L(`${n}を${SHA}して，${PLACE[p]}の位までのがい数((${roundTo(n, p)}))`, K_Q, "がい数");
  }},
  {id:"b", name:"がい数のはんい", gen(lv){
    const p = pick([10, 100, 1000]), v = ri(2, 90) * p;
    if(lv === 0) return L(`${SHA}して${PLACE[p]}の位までのがい数にすると${v}になる整数のうち，いちばん小さい数((${v - p / 2}))`, K_Q, "がい数のはんい");
    if(lv === 1) return L(`${SHA}して${PLACE[p]}の位までのがい数にすると${v}になる整数のうち，いちばん大きい数((${v + p / 2 - 1}))`, K_Q, "がい数のはんい");
    return L(`${SHA}して${PLACE[p]}の位までのがい数にすると${v}になる数のはんいを，以上・未満を使って表しましょう。((${v - p / 2}以上${v + p / 2}未満))`, K_Q, "がい数のはんい");
  }},
  {id:"c", name:"切り上げ・切り捨て", gen(lv){
    const n = ri(1001, 99999), p = pick([100, 1000]);
    return R() < 0.5 ? L(`${n}を切り上げて，${PLACE[p]}の位までのがい数((${Math.ceil(n / p) * p}))`, K_Q, "切り上げ") : L(`${n}を切り【捨|す】てて，${PLACE[p]}の位までのがい数((${Math.floor(n / p) * p}))`, K_Q, "切り【捨|す】て");
  }},
  {id:"d", name:"がい算（見積もり）", gen(lv){
    if(lv < 2){ const a = ri(1000, 9999), b = ri(1000, 9999), op = lv === 0 ? "＋" : "－"; const [x, y] = op === "＋" ? [a, b] : [Math.max(a, b), Math.min(a, b)];
      return L(`${x}${op}${y}を，${SHA}して百の位までのがい数にしてから計算しましょう。((${op === "＋" ? roundTo(x, 100) + roundTo(y, 100) : roundTo(x, 100) - roundTo(y, 100)}))`, K_Q, "がい算"); }
    const a = ri(110, 999), b = ri(11, 99), r1 = roundTo(a, P10(String(a).length - 1)), r2 = roundTo(b, 10);
    return L(`${a}×${b}の積を，それぞれ上から1けたのがい数にして見積もりましょう。((${r1}×${r2}＝${r1 * r2}))`, K_Q, "見積もり");
  }}
]);

/* ---------- 式と計算 ---------- */
unit4(11, "式と計算", "10月", "計算のきまりを使って，式を読み取ろう", [
  {id:"a", name:"計算の順じょ", gen(lv){
    const a = ri(10, 60), b = ri(2, 9), c = ri(2, 9), d = ri(2, 9);
    if(lv === 0) return pick([() => L(`${a + b * c}－${b}×${c}＝<<${a}>>`, K_CALC, "計算"), () => L(`（${a}＋${b}）×${c}＝<<${(a + b) * c}>>`, K_CALC, "計算")])();
    if(lv === 1) return pick([() => L(`${a}＋${b * c * 2}÷${c}＝<<${a + b * 2}>>`, K_CALC, "計算"), () => L(`${b * d * (c + 2)}÷（${c}＋2）－${d}＝<<${b * d - d}>>`, K_CALC, "計算")])();
    return L(`${a}－（${b * c}÷${c}＋${d}）×2＝<<${a - (b + d) * 2}>>`, K_CALC, "計算");
  }},
  {id:"b", name:"計算のきまり（くふう）", gen(lv){
    if(lv === 0){ const x = ri(12, 99), [p, q] = pick([[25, 4], [4, 25], [5, 2], [125, 8]]); return L(`${p}×${x}×${q}＝<<${p * q * x}>>`, "くふうして計算しましょう。", "計算のくふう"); }
    if(lv === 1){ const x = ri(12, 60), n = pick([99, 98, 101, 102]); return L(`${n}×${x}＝<<${n * x}>>`, "くふうして計算しましょう。", "計算のくふう"); }
    const x = ri(12, 60), a = ri(11, 89); return L(`${a}×${x}＋${100 - a}×${x}＝<<${100 * x}>>`, "くふうして計算しましょう。", "計算のくふう");
  }},
  {id:"c", name:"1つの式に表す", gen(lv){
    const p = ri(6, 15) * 10, n = ri(2, 6), q = ri(8, 20) * 10, M = 1000;
    if(lv === 0) return W_(`1こ${p}円のパンを${n}こと，${q}円のジュースを1本買いました。代金は何円ですか。1つの式に表して答えを求めましょう。`, `${p}×${n}＋${q}＝${p * n + q}`, `${p * n + q}円`, "1つの式");
    if(lv === 1) return W_(`${M}円を持って買い物に行き，1さつ${p}円のノートを${n}さつ買いました。のこりは何円ですか。1つの式に表して答えを求めましょう。`, `${M}－${p}×${n}＝${M - p * n}`, `${M - p * n}円`, "1つの式");
    return W_(`1こ${p}円のりんごと，1こ${q}円のなしを，1こずつ組にして${n}組買いました。代金は何円ですか。1つの式に表して答えを求めましょう。`, `（${p}＋${q}）×${n}＝${(p + q) * n}`, `${(p + q) * n}円`, "1つの式");
  }}
]);

/* ---------- 小数 ---------- */
unit4(12, "小数", "11月", "小数の表し方やしくみを調べよう", [
  {id:"a", name:"小数のしくみ", gen(lv){
    if(lv === 0){ const a = ri(1, 9), b = ri(1, 9); return L(`${a}.${b}は，0.1を[[${a * 10 + b}]]こ集めた数です。`, K_BOX, "□にあう数"); }
    if(lv === 1){ const n = ri(101, 999); if(n % 10 === 0) return this.gen(lv); return L(`0.01を${n}こ集めた数は[[${ds(n, 2)}]]です。`, K_BOX, "□にあう数"); }
    const a = ri(1, 9), b = ri(0, 9), c = ri(1, 9); return L(`${a}.${b}${c}${ri(1, 9)}の${F(1, 100)}の位の数字は[[${c}]]です。`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"小数と単位", gen(lv){
    const L_ = lv === 0 ? [[v => `${ds(v, 1)}L＝[[${v}]]dL`, 1], [v => `${v}cm＝[[${ds(v, 1)}]]cm`.replace(/^.*/, () => `${v}mm＝[[${ds(v, 1)}]]cm`), 1]] : [[v => `${ds(v, 3)}km＝[[${v}]]m`, 3], [v => `${v}g＝[[${ds(v, 3)}]]kg`, 3], [v => `${ds(v, 2)}m＝[[${v}]]cm`, 2]];
    const [f, k] = pick(L_), v = ri(P10(k) + 1, P10(k + 1) - 1); return L(f(v), K_BOX, "□にあう数");
  }},
  {id:"c", name:"小数のたし算・ひき算", gen(lv){
    const a = lv === 0 ? rdec(11, 99, 1) : rdec(101, 999, 2), b = lv === 0 ? rdec(11, 99, 1) : pick([rdec(11, 99, 1), rdec(101, 999, 2), String(ri(1, 9))]);
    if(R() < 0.5) return L(`${a}＋${b}＝<<${dadd(a, b)}>>`, K_CALC, "計算");
    const [x, y] = +a >= +b ? [a, b] : [b, a]; if(x === y) return this.gen(lv); return L(`${x}－${y}＝<<${dadd(x, y, -1)}>>`, K_CALC, "計算");
  }},
  {id:"d", name:"小数の大小", gen(lv){
    for(;;){ const a = lv === 0 ? rdec(1, 99, 1) : rdec(1, 999, pick([2, 3])), b = lv === 0 ? rdec(1, 99, 1) : rdec(1, 999, pick([1, 2, 3])); if(a === b) continue;
      return L(`${a}[[${+a > +b ? "＞" : "＜"}]]${b}`, "[[ ]]に不等号を書きましょう。", "不等号"); }
  }}
]);

/* ---------- そろばん ---------- */
function drawSoroban(G, x, y, w, h, fs, digits, onesIdx){
  const n = digits.length, rw = Math.min(6, (w - 6) / n), bx = x + (w - rw * n) / 2, top = y + 2, beam = y + h * 0.33, bot = y + h - 2;
  G.rect(bx - 1, top, rw * n + 2, bot - top, {w:0.6});
  G.line(bx - 1, beam, bx + rw * n + 1, beam, {w:0.6});
  const bh = Math.min(2.4, (bot - beam) / 6.2), bw = rw * 0.42;
  const bead = (cx, cy) => G.poly([[cx - bw, cy], [cx, cy - bh / 2], [cx + bw, cy], [cx, cy + bh / 2]], {fill:"#444444", w:0.2});
  for(let i = 0; i < n; i++){
    const cx = bx + (i + 0.5) * rw, d = digits[i];
    G.line(cx, top, cx, bot, {w:0.25});
    bead(cx, d >= 5 ? beam - bh / 2 - 0.1 : top + bh / 2 + 0.3);
    const up = d % 5;
    for(let k = 0; k < 4; k++){ const cy = k < up ? beam + bh / 2 + 0.1 + k * bh : bot - bh / 2 - 0.3 - (3 - k) * bh; bead(cx, cy); }
    if((onesIdx - i) % 3 === 0) G.dot(cx, beam, 0.45, "#ffffff"), G.dot(cx, beam, 0.3);
  }
  const cx = bx + (onesIdx + 0.5) * rw; G.text(knows("位") ? "一の位" : "一のくらい", cx, bot + 2.8, {size:fs * 0.55, align:"center"});
}
unit4(13, "そろばん", "11月", "そろばんで数を表したり計算したりしよう", [
  {id:"a", name:"そろばんの数を読む", gen(lv){
    const n = 7, onesIdx = lv === 0 ? 6 : lv === 1 ? 4 : 3, digs = Array.from({length:n}, () => 0);
    const lo = lv === 0 ? 3 : 2, hi = lv === 0 ? 6 : onesIdx + (lv === 1 ? 1 : 2);
    for(let i = lo; i <= Math.min(hi, n - 1); i++) digs[i] = ri(i === lo ? 1 : 0, 9);
    let s = ""; for(let i = 0; i < n; i++){ s += digs[i]; if(i === onesIdx && i < n - 1) s += "."; }
    const val = s.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    return figItem(46, 30, (G, x, y, w, h, fs) => drawSoroban(G, x, y, w, h - 3, fs, digs, onesIdx), `((${val}))`, {inst:"そろばんに入れた数を読みましょう。", lead:"そろばん", sig:s});
  }},
  {id:"b", name:"そろばんで計算", gen(lv){
    const a = lv === 0 ? ri(12, 80) : rdec(11, 99, 1), b = lv === 0 ? ri(11, 60) : rdec(11, 60, 1), u = lv === 2 ? "億" : "";
    if(lv === 0) return L(`${a}万＋${b}万＝<<${a + b}万>>`, "そろばんを使って計算しましょう。", "そろばん");
    if(lv === 1) return L(`${a}＋${b}＝<<${dadd(a, b)}>>`, "そろばんを使って計算しましょう。", "そろばん");
    const x = ri(30, 90), y = ri(11, x - 1); return L(`${x}${u}－${y}${u}＝<<${x - y}${u}>>`, "そろばんを使って計算しましょう。", "そろばん");
  }}
]);

/* ---------- 面積 ---------- */
function genRectArea(lv){
  const L_ = lv === 0 && R() < 0.4, a = ri(3, 12), b = L_ ? a : ri(3, 12);
  const draw = (G, x, y, w, h, fs) => {
    const s = Math.min((w - 14) / a, (h - 10) / b), rx = x + (w - a * s) / 2, ry = y + (h - b * s) / 2;
    G.rect(rx, ry, a * s, b * s, {w:0.4});
    G.text(cm(a), rx + a * s / 2, ry + b * s + 3, {size:fs * 0.8, align:"center"});
    if(!L_) G.text(cm(b), rx + a * s + 1.5, ry + b * s / 2, {size:fs * 0.8});
  };
  return figItem(FIGW, FIGH, draw, `((${a * b}cm^2))`, {inst:"つぎの長方形や正方形の面積を求めましょう。", lead:"面積", sig:"r" + a + b});
}
function genLArea(lv){
  const W = ri(6, 12), H = ri(5, 10), w2 = ri(2, W - 3), h2 = ri(2, H - 2), A = W * H - (W - w2) * (H - h2);
  const draw = (G, x, y, w, h, fs) => {
    const s = Math.min((w - 14) / W, (h - 10) / H), ox = x + (w - W * s) / 2, oy = y + (h - H * s) / 2;
    const P = [[0, 0], [w2, 0], [w2, H - h2], [W, H - h2], [W, H], [0, H]].map(p => [ox + p[0] * s, oy + p[1] * s]);
    G.poly(P, {w:0.4}); const cen = centroid(P);
    sideLabel(G, P[0], P[1], cm(w2), cen, fs); sideLabel(G, P[4], P[5], cm(W), cen, fs); sideLabel(G, P[5], P[0], cm(H), cen, fs); sideLabel(G, P[3], P[4], cm(h2), cen, fs);
  };
  return figItem(FIGW + 4, FIGH + 4, draw, `((${A}cm^2))`, {inst:"つぎの図形の面積を求めましょう。", lead:"いろいろな形の面積", sig:"L" + W + H + w2 + h2});
}
unit4(14, "面積", "12月", "広さの表し方や求め方を調べよう", [
  {id:"a", name:"長方形・正方形の面積", gen(lv){ return genRectArea(lv); }},
  {id:"b", name:"いろいろな形の面積", gen(lv){ return genLArea(lv); }},
  {id:"c", name:"大きい面積の単位", gen(lv){
    const P = lv === 0 ? [["1m^2＝[[10000]]cm^2"], ["1a＝[[100]]m^2"], ["1ha＝[[10000]]m^2"]] : lv === 1 ? [[`${ri(2, 9)}ha`], ["1km^2＝[[1000000]]m^2"], [`${ri(2, 9)}a`]] : [[`${ri(2, 9) * 100}a`], [`${ri(2, 9)}km^2`]];
    let [t] = pick(P);
    if(/^\d+ha$/.test(t)){ const v = parseInt(t, 10); t = `${v}ha＝[[${v * 100}]]a`; }
    else if(/^\d+a$/.test(t)){ const v = parseInt(t, 10); t = v >= 100 ? `${v}a＝[[${v / 100}]]ha` : `${v}a＝[[${v * 100}]]m^2`; }
    else if(/^\d+km\^2$/.test(t)){ const v = parseInt(t, 10); t = `${v}km^2＝[[${v * 100}]]ha`; }
    return L(t, K_BOX, "面積の単位");
  }},
  {id:"d", name:"面積から長さを求める", gen(lv){
    const a = ri(3, 15), b = ri(3, 15);
    if(lv === 2){ const s = ri(2, 9) * 10; return L(`面積が${s * s / 100}aの正方形の畑の1辺の長さ((${s}m))`, K_Q, "面積から長さ"); }
    return L(`面積が${a * b}cm^2で，たての長さが${a}cmの長方形の横の長さ((${b}cm))`, K_Q, "面積から長さ");
  }}
]);

/* ---------- 計算のしかたを考えよう（小数×整数・小数÷整数の暗算） ---------- */
unit4(15, "計算のしかたを考えよう", "1月", "くふうして小数をふくむ計算のしかたを考えよう", [
  {id:"a", name:"小数×整数", gen(lv){ const a = lv === 0 ? "0." + ri(2, 9) : rdec(11, 29, 1), b = ri(2, 9); return L(`${a}×${b}＝<<${dmul(a, b)}>>`, K_CALC, "計算"); }},
  {id:"b", name:"小数÷整数", gen(lv){ const b = ri(2, 9), q = lv === 0 ? "0." + ri(1, 9) : rdec(11, 29, 1), a = dmul(q, b); return L(`${a}÷${b}＝<<${q}>>`, K_CALC, "計算"); }}
]);

/* ---------- 小数のかけ算とわり算（筆算） ---------- */
unit4(16, "小数のかけ算とわり算", "1月", "小数のかけ算やわり算の筆算のしかたを考えよう", [
  {id:"a", name:"小数×整数", gen(lv){ const a = lv === 0 ? rdec(11, 99, 1) : lv === 1 ? rdec(101, 999, 2) : rdec(11, 99, 1), b = String(lv === 2 ? ri(12, 49) : ri(2, 9)); return hissanMulItem(a, b); }},
  {id:"b", name:"小数÷整数", gen(lv){
    for(;;){ const d = String(lv === 2 ? ri(12, 30) : ri(2, 9)), q = lv === 0 ? rdec(11, 99, 1) : rdec(11, 99, 2), n = dmul(q, d); if(dparse(n)[1] > dparse(q)[1]) continue;
      return hissanDivItem(n, d, "exact"); }
  }},
  {id:"c", name:"わり進むわり算", gen(lv){
    for(;;){ const d = String(pick([2, 4, 5, 6, 8])), n = lv === 0 ? String(ri(1, 30)) : rdec(11, 99, 1), q = ddiv(n, d); if(!q || dparse(q)[1] <= dparse(n)[1] || dparse(q)[1] > 3) continue;
      return hissanDivItem(n, d, "exact"); }
  }},
  {id:"d", name:"商をがい数で求める", gen(lv){
    for(;;){ const d = String(ri(3, 9)), n = rdec(11, 99, 1), S = divSolve(n, d, "exact"); if(S.rem === 0 && S.qDec <= 2) continue; return hissanDivItem(n, d, "round", 1); }
  }},
  {id:"e", name:"あまりのあるわり算", gen(lv){
    for(;;){ const d = String(ri(2, 9)), n = rdec(21, 999, 1), S = divSolve(n, d, "rem"); if(S.qInt < 2) continue; if(S.ansText.endsWith("あまり0")) continue; return hissanDivItem(n, d, "rem"); }
  }},
  {id:"f", name:"文章題", gen(lv){
    if(lv === 0){ const a = rdec(11, 49, 1), n = ri(3, 9); return W_(`1本${a}mのテープが${n}本あります。全部で何mありますか。`, `${a}×${n}＝${dmul(a, n)}`, `${dmul(a, n)}m`, "小数のかけ算"); }
    if(lv === 1){ const n = ri(3, 9), q = rdec(11, 49, 1), a = dmul(q, n); return W_(`${a}Lのジュースを，${n}人で同じ量ずつ分けます。1人分は何Lですか。`, `${a}÷${n}＝${q}`, `${q}L`, "小数のわり算"); }
    for(;;){ const k = ri(3, 8), a = rdec(101, 399, 1), S = divSolve(a, String(k), "rem"); const rem = S.ansText.split("あまり")[1]; if(rem === "0") continue;
      return W_(`${a}mのリボンから，${k}mのリボンは何本とれて，何mあまりますか。`, `${a}÷${k}＝${S.ansText}`, `${S.qInt}本とれて，${rem}mあまる`, "小数のわり算"); }
  }}
]);

U4.push({id:"4-x3", no:"○", name:"○倍の計算（３）小数倍", month:"2月", meate:"何倍かを小数で表そう", subs:[
  Object.assign({id:"a", name:"何倍かを小数で求める"}, pool(["5-x1.a"])),
  Object.assign({id:"b", name:"小数倍を使った問題"}, pool(["5-x1.b"]))
]});

/* ---------- 分数 ---------- */
unit4(17, "分数", "2月", "分数の大きさや計算のしかたを考えよう", [
  {id:"a", name:"仮分数と帯分数", gen(lv){
    const d = ri(2, lv === 0 ? 6 : 9), w = ri(1, 4), n = ri(1, d - 1);
    return R() < 0.5 ? L(`${F(w * d + n, d)}を帯分数に((${MX(w, n, d)}))`, K_Q, "分数") : L(`${MX(w, n, d)}を【仮|か】分数に((${F(w * d + n, d)}))`, K_Q, "分数");
  }},
  {id:"b", name:"分数の大小", gen(lv){
    for(;;){
      if(lv === 0){ const d = ri(3, 9), a = ri(1, 2 * d), b = ri(1, 2 * d); if(a === b) continue; return L(`${F(a, d)}[[${a > b ? "＞" : "＜"}]]${F(b, d)}`, "[[ ]]に不等号を書きましょう。", "不等号"); }
      if(lv === 1){ const a = ri(2, 9), b = ri(2, 9); if(a === b) continue; return L(`${F(1, a)}[[${a < b ? "＞" : "＜"}]]${F(1, b)}`, "[[ ]]に不等号を書きましょう。", "不等号"); }
      const d = ri(3, 7), w = ri(1, 3), n = ri(1, d - 1), m = w * d + n + pick([-1, 1]); if(m <= 0 || m === w * d + n) continue;
      return L(`${MX(w, n, d)}[[${w * d + n > m ? "＞" : "＜"}]]${F(m, d)}`, "[[ ]]に不等号を書きましょう。", "不等号");
    }
  }},
  {id:"c", name:"分数のたし算・ひき算", gen(lv){
    for(;;){ const d = ri(3, 9), op = R() < 0.5 ? 1 : -1;
      if(lv === 0){ const a = ri(1, d - 1), b = ri(1, d - 1); const r = a + op * b; if(r <= 0) continue; return L(`${F(a, d)}${op > 0 ? "＋" : "－"}${F(b, d)}＝<<${r === d ? "1" : r > d ? F(r, d) + "（" + MX(Math.floor(r / d), r % d, d) + "）" : F(r, d)}>>`, K_CALC, "計算"); }
      const w1 = ri(1, 4), w2 = ri(1, 3), a = ri(1, d - 1), b = ri(1, d - 1), x = w1 * d + a, y = w2 * d + b, r = x + op * y;
      if(r <= 0) continue; const carry = op > 0 ? a + b >= d : a < b;
      if(lv === 1 && carry) continue; if(lv === 2 && !carry) continue;
      const ans = r % d === 0 ? String(r / d) : r > d ? MX(Math.floor(r / d), r % d, d) : F(r, d);
      return L(`${MX(w1, a, d)}${op > 0 ? "＋" : "－"}${MX(w2, b, d)}＝<<${ans}>>`, K_CALC, "計算"); }
  }}
]);

/* ---------- 直方体と立方体 ---------- */
function genCuboidEdges(lv){
  const a = ri(4, 8), b = ri(2, 5), h = ri(3, 6);
  const N = ["A", "B", "C", "D", "E", "F", "G", "H"];
  /* 前の面 A(左上) B(右上) C(右下) D(左下)、うしろの面 E F G H */
  const P3 = [[0, h, 0], [a, h, 0], [a, 0, 0], [0, 0, 0], [0, h, b], [a, h, b], [a, 0, b], [0, 0, b]];
  const Q = [
    ["辺ABに平行な辺をすべて", "辺DC，辺EF，辺HG"],
    ["辺ADに平行な辺をすべて", "辺BC，辺EH，辺FG"],
    ["辺ABに" + SUI + "な辺をすべて", "辺AD，辺AE，辺BC，辺BF"],
    ["面ABCDに平行な面", "面EFGH"],
    ["面ABCDに" + SUI + "な面をすべて", "面ABFE，面BCGF，面DCGH，面ADHE"]
  ];
  const subs = (lv === 0 ? Q.slice(0, 2).concat([Q[3]]) : lv === 1 ? [Q[0], Q[2], Q[3]] : [Q[1], Q[2], Q[4]]).map(([t, ans]) => `${t}((${ans}))`);
  const draw = (G, x, y, w, hh, fs) => {
    const f = fitPts(P3.map(proj), x, y, w, hh, 7), P = f.pts, cen = centroid(P);
    for(const [i, j] of [[3, 7], [7, 6], [7, 4]]) G.line(...P[i], ...P[j], {w:0.3, dash:[1, 0.8]});
    for(const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 5], [2, 6], [4, 5], [5, 6]]) G.line(...P[i], ...P[j], {w:0.4});
    P.forEach((p, i) => vLabel(G, p, cen, N[i], fs));
  };
  return setItem(58, 44, draw, subs, {inst:"下の直方体について答えましょう。", lead:"直方体の辺と面"});
}
function genPosition(lv){
  const bx = ri(1, 7), by = ri(1, 5), cx = ri(1, 7), cy = ri(1, 5);
  if(bx === cx && by === cy) return genPosition(lv);
  const draw = (G, x, y, w, h, fs) => {
    const c = Math.min((w - 10) / 8, (h - 8) / 6), ox = x + 6, oy = y + 2 + 6 * c;
    drawGridLines(G, ox, oy - 6 * c, 8, 6, c);
    G.line(ox, oy, ox + 8 * c + 2, oy, {w:0.4}); G.line(ox, oy, ox, oy - 6 * c - 2, {w:0.4});
    G.text("横", ox + 8 * c + 3.5, oy, {size:fs * 0.6}); G.text("たて", ox, oy - 6 * c - 3.5, {size:fs * 0.6, align:"center"});
    G.dot(ox, oy, 0.7); G.text("A", ox - 2.2, oy + 2, {size:fs * 0.75, align:"center"});
    G.dot(ox + bx * c, oy - by * c, 0.7); G.text("B", ox + bx * c + 2, oy - by * c - 1.8, {size:fs * 0.75});
    if(lv >= 1){ G.dot(ox + cx * c, oy - cy * c, 0.7); G.text("C", ox + cx * c + 2, oy - cy * c - 1.8, {size:fs * 0.75}); }
    for(let i = 0; i <= 8; i++) G.text(String(i), ox + i * c, oy + 2.4, {size:fs * 0.45, align:"center"});
    for(let j = 1; j <= 6; j++) G.text(String(j), ox - 1.6, oy - j * c, {size:fs * 0.45, align:"right"});
  };
  const subs = [`点B（横((${bx}m))，たて((${by}m))）`];
  if(lv >= 1) subs.push(`点C（横((${cx}m))，たて((${cy}m))）`);
  return setItem(66, 50, draw, subs, {inst:"点Aをもとにして，点の位置を表しましょう。1目もりは1mです。", lead:"位置の表し方", sig:[bx, by, cx, cy].join()});
}
unit4(18, "直方体と立方体", "2月", "箱の形のとくちょうや作り方を調べよう", [
  {id:"a", name:"面・辺・【頂|ちょう】点の数".replace(/【(.)\|[^】]*】/, "$1"), gen(lv){
    const sh = pick(["直方体", "立方体"]), Q = [["面の数", 6], ["辺の数", 12], ["【頂|ちょう】点の数", 8]], [t, v] = pick(Q);
    if(lv === 2) return pick([() => L(`立方体の面の形((正方形))`, K_Q, "直方体と立方体"), () => L(`直方体で，1つの【頂|ちょう】点に集まっている辺の数((3))`, K_Q, "直方体と立方体")])();
    return L(`${sh}の${t}((${v}))`, K_Q, "直方体と立方体");
  }},
  {id:"b", name:"辺や面の" + "垂直・平行", gen(lv){ return genCuboidEdges(lv); }},
  {id:"c", name:"展開図をかく", gen(lv){ return genNetDraw(lv, "p4", true); }},
  {id:"d", name:"位置の表し方", gen(lv){ return genPosition(lv); }}
]);

/* ---------- ともなって変わる量 ---------- */
const TOMO = [
  () => { const s = ri(8, 14); return {t:`まわりの長さが${s * 2}cmの長方形の，たての長さ□cmと横の長さ○cm`, f:x => s - x, e:`□＋○＝${s}`, xs:[1, 2, 3, 4, 5, 6]}; },
  () => ({t:"1辺が1cmの正方形を1列にならべたときの，正方形の数□こと，まわりの長さ○cm", f:x => 2 * x + 2, e:"○＝□×2＋2", xs:[1, 2, 3, 4, 5, 6]}),
  () => { const a = ri(3, 8); return {t:`${a}才ちがいの姉と妹の，妹の年れい□才と姉の年れい○才`, f:x => x + a, e:`○＝□＋${a}`, xs:[1, 2, 3, 4, 5, 6]}; },
  () => { const p = ri(5, 15) * 10; return {t:`1こ${p}円のおかしを買うときの，買う数□こと代金○円`, f:x => p * x, e:`○＝${p}×□`, xs:[1, 2, 3, 4, 5, 6]}; }
];
unit4(19, "ともなって変わる量", "3月", "2つの量の変わり方や関係を調べよう", [
  {id:"a", name:"表と式", gen(lv){
    const S = pick(TOMO)(), giv = lv === 0 ? [0, 1, 2] : [0, 1];
    const rows = [["□"].concat(S.xs.map(String)), ["○"].concat(S.xs.map((x, i) => giv.includes(i) ? String(S.f(x)) : `[[${S.f(x)}]]`))];
    const subs = ["表のあいているところに，あてはまる数を書きましょう。"];
    if(lv >= 1) subs.push(`□と○の関係を式に表しましょう。((${S.e}))`);
    if(lv === 2){ const x = ri(8, 12); subs.push(`□が${x}のときの○の数((${S.f(x)}))`); }
    return tableItem(`${S.t}の関係を表にしました。`, rows, subs, {inst:K_Q, lead:"ともなって変わる量"});
  }}
]);

/* ---------- しりょうの活用 ---------- */
unit4(20, "しりょうの活用", "3月", "くふうしたグラフを読み取ろう", [
  {id:"a", name:"2つの折れ線グラフ", gen(lv){
    const A = tempSeries(), B = tempSeries().map(v => Math.max(0, v - ri(2, 6)));
    const diff = A.map((v, i) => Math.abs(v - B[i])), mi = diff.indexOf(Math.max(...diff));
    if(diff.filter(v => v === diff[mi]).length > 1) return this.gen(lv);
    const m = ri(0, 11);
    const subs = [`${MONTHS[m]}のA市の気温は何度ですか。((${A[m]}度))`, `${MONTHS[m]}のB市の気温は何度ですか。((${B[m]}度))`];
    if(lv >= 1) subs.push(`A市とB市の気温のちがいがいちばん大きいのは何月ですか。((${MONTHS[mi]}))`);
    return setItem(78, 56, (G, x, y, w, h, fs) => drawLineGraph(G, x, y, w, h, fs, [A, B], 30, 5, "度"), subs, {inst:K_Q, lead:"2つのグラフ", text:"下のグラフは，A市（――）とB市（－－－）の1年間の気温の変わり方を表したものです。", sig:A.join() + B.join()});
  }}
]);

/* ---------- 4年のまとめ ---------- */
unit4(21, "４年のまとめ", "3月", "4年の学習をふりかえろう", [
  Object.assign({id:"a", name:"数と計算"}, pool(["4-1.a", "4-3.b", "4-6.b", "4-8.c", "4-10.a", "4-11.a", "4-12.c", "4-16.a", "4-17.c"])),
  Object.assign({id:"b", name:"図形"}, pool(["4-4.a", "4-9.a", "4-9.b", "4-14.a", "4-14.b", "4-18.b"])),
  Object.assign({id:"c", name:"変化と関係・データ"}, pool(["4-2.a", "4-19.a", "4-x1.a", "4-7.a"]))
]);

GRADES[4] = U4;
