/* ================= 6年の単元と問題 ================= */
const U6 = [];
function unit6(no, name, month, meate, subs){ U6.push({id:"6-" + no, no, name, month, meate, subs}); }

/* 分数の計算（[分子, 分母]） */
const FR = (n, d) => { d = d || 1; if(d < 0){ n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
const fmul = (a, b) => FR(a[0] * b[0], a[1] * b[1]);
const fdiv = (a, b) => FR(a[0] * b[1], a[1] * b[0]);
const fadd = (a, b) => FR(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fsub = (a, b) => FR(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fA = f => fAns(f[0], f[1]);
/* 分数と小数の両方をあつかう単元の答え：仮分数（帯分数，小数） */
function fAD(f){
  const g = gcd(f[0], f[1]), n = f[0] / g, d = f[1] / g, base = fAns(n, d);
  if(d === 1) return base;
  let k = 0; while(k <= 4 && (P10(k) % d)) k++;
  if(k > 4) return base;
  const dec = ds(n * P10(k) / d, k);
  return base.endsWith("）") ? base.slice(0, -1) + "，" + dec + "）" : base + "（" + dec + "）";
}
const fM = f => { const [n, d] = FR(f[0], f[1]); if(d === 1) return String(n); return n > d ? MX(Math.floor(n / d), n % d, d) : F(n, d); };
const decFr = s => { const [n, k] = dparse(s); return FR(n, P10(k)); };
const fStr = f => f[1] === 1 ? String(f[0]) : F(f[0], f[1]);
const TAI = "対【称|しょう】", JIKU = "【軸|じく】", HIN = "最【頻|ひん】値";
const LETTERS = "ABCDEFGHIJKL";

/* ---------- 対称な図形 ---------- */
function symShape(kind){
  for(;;){
    if(kind === "line"){
      const k = ri(2, 3), top = [0, -ri(5, 8) / 2], bot = [0, ri(5, 8) / 2], right = [];
      const r0 = (R() - 0.5) * 0.6, ys = k === 2 ? [-1.3 + r0, 1.1 + r0] : [-2 + r0, 0 + r0, 1.9 + r0];
      for(const y of ys) right.push([1.2 + R() * 2, y]);
      const pts = [top].concat(right, [bot], right.slice().reverse().map(p => [-p[0], p[1]]));
      return {pts, k, n:pts.length};
    }
    const m = ri(2, 3), base = R() * 60, pts = [];
    let a = base;
    for(let i = 0; i < m; i++){ const r = 1.6 + R() * 1.4; pts.push([r * Math.cos(a * D2R), r * Math.sin(a * D2R)]); a += 180 / m * (0.75 + R() * 0.5); }
    const all = pts.concat(pts.map(p => [-p[0], -p[1]]));
    const angs = all.map(p => (Math.atan2(p[1], p[0]) * 180 / Math.PI + 360 - base + 1) % 360);
    if(!angs.every((v, i) => i === 0 || v > angs[i - 1] + 25)) continue;
    return {pts:all, m, n:all.length};
  }
}
function genSymFig(lv, kind){
  const S = symShape(kind), N = S.n, names = LETTERS.slice(0, N).split("");
  let corr;
  if(kind === "line") corr = i => (N - i) % N;
  else corr = i => (i + N / 2) % N;
  const pick1 = kind === "line" ? ri(1, S.k) : ri(0, N / 2 - 1);
  const i1 = pick1, i2 = (i1 + 1) % N, j1 = corr(i1), j2 = corr(i2);
  const i3 = kind === "line" ? ri(1, S.k) : ri(0, N - 1);
  const subs = [
    `点${names[i1]}に対応する点((点${names[j1]}))`,
    `辺${names[i1]}${names[i2]}に対応する辺((辺${names[j1]}${names[j2]}))`,
    `角${names[i3]}に対応する角((角${names[corr(i3)]}))`
  ];
  if(lv >= 1){ const v = ri(2, 6); subs.push(`辺${names[i1]}${names[i2]}の長さが${v}cmのとき，辺${names[j1]}${names[j2]}の長さ((${v}cm))`); }
  if(lv === 2){
    if(kind === "line") subs.push(`直線${names[i1]}${names[j1]}と${TAI}の${JIKU}は，どのように交わっていますか。((垂直に交わる))`);
    else { const v = ri(2, 5); subs.push(`直線O${names[i1]}の長さが${v}cmのとき，直線O${names[j1]}の長さ((${v}cm))`); }
  }
  const draw = (G, x, y, w, h, fs) => {
    const extra = kind === "line" ? [[0, S.pts[0][1] - 1.6], [0, S.pts[S.k + 1][1] + 1.6]] : [];
    const f = fitPts(S.pts.concat(extra), x, y, w, h, 6), P = f.pts.slice(0, N), cen = centroid(P);
    G.poly(P, {w:0.4, fill:SHADE});
    P.forEach((p, i) => { if(kind === "line" && (i === 0 || i === S.k + 1)) G.text(names[i], p[0] + 0.9 * fs, p[1] + (i ? 0.5 : -0.5) * fs, {size:fs * 0.85, align:"center"}); else vLabel(G, p, cen, names[i], fs); });
    if(kind === "line"){
      const a = f.pts[N], b = f.pts[N + 1];
      G.line(a[0], a[1], b[0], b[1], {w:0.3, dash:[1.2, 0.6, 0.3, 0.6]});
      G.text("ア", a[0] - 1.2, a[1] + 0.6, {size:fs * 0.75, align:"right"}); G.text("イ", b[0] - 1.2, b[1] - 0.6, {size:fs * 0.75, align:"right"});
    } else {
      const o = centroid(P); G.dot(o[0], o[1], 0.45); G.text("O", o[0] + 1.2, o[1] + 1.5, {size:fs * 0.75});
    }
  };
  const inst = kind === "line" ? `下の図は線${TAI}な図形で，直線アイは${TAI}の${JIKU}です。` : `下の図は点${TAI}な図形で，点Oは${TAI}の中心です。`;
  return setItem(66, 56, draw, subs, {inst, lead:(kind === "line" ? "線" : "点") + TAI + "な図形"});
}
/* 方眼：線対称・点対称な図形の残りの半分をかく */
function drawGridLines(G, x, y, cols, rows, c){
  for(let i = 0; i <= cols; i++) G.line(x + i * c, y, x + i * c, y + rows * c, {w:0.12, color:GRID});
  for(let j = 0; j <= rows; j++) G.line(x, y + j * c, x + cols * c, y + j * c, {w:0.12, color:GRID});
}
function genSymDraw(lv){
  const kind = lv === 0 ? "line" : lv === 2 ? "point" : pick(["line", "point"]);
  const COLS = 12, ROWS = 10, C = 5;
  let half, other;
  for(;;){
    if(kind === "line"){
      const y0 = ri(1, 3), y1 = ri(7, 9), k = ri(2, 3);
      const ys = shuffle([2, 3, 4, 5, 6, 7, 8].filter(v => v > y0 && v < y1)).slice(0, k).sort((a, b) => a - b);
      if(ys.length < 2) continue;
      half = [[6, y0]].concat(ys.map(v => [6 + ri(1, 5), v]), [[6, y1]]);
      other = half.map(p => [12 - p[0], p[1]]);
    } else {
      const k = ri(1, 2), a0 = ri(0, 11) * 15, pts = [];
      const step = 180 / (k + 1);
      for(let i = 0; i <= k; i++){ const a = (a0 + i * step + (i ? ri(-12, 12) : 0)) * D2R, r = ri(2, 4); pts.push([6 + Math.round(r * Math.cos(a)), 5 + Math.round(r * Math.sin(a))]); }
      const endp = [12 - pts[0][0], 10 - pts[0][1]];
      half = pts.concat([endp]);
      other = half.map(p => [12 - p[0], 10 - p[1]]);
      const all = half.concat(other.slice(1, -1));
      const ang = all.map(p => (Math.atan2(p[1] - 5, p[0] - 6) * 180 / Math.PI - a0 + 720) % 360);
      if(new Set(all.map(p => p.join())).size !== all.length) continue;
      if(!ang.every((v, i) => i === 0 || v > ang[i - 1] + 8)) continue;
    }
    if(half.concat(other).every(p => p[0] >= 0 && p[0] <= COLS && p[1] >= 0 && p[1] <= ROWS)) break;
  }
  const draw = (G, x, y, w, h, fs, ans) => {
    const gx = x + 2, gy = y + 1;
    drawGridLines(G, gx, gy, COLS, ROWS, C);
    const T = p => [gx + p[0] * C, gy + p[1] * C];
    if(kind === "line"){
      G.line(...T([6, -0.4]), ...T([6, ROWS + 0.4]), {w:0.35, dash:[1.2, 0.6, 0.3, 0.6]});
      G.text("ア", T([6, -0.4])[0] + 1.3, T([6, -0.4])[1] + 0.8, {size:fs * 0.7}); G.text("イ", T([6, ROWS])[0] + 1.3, T([6, ROWS])[1] - 0.8, {size:fs * 0.7});
    } else { const o = T([6, 5]); G.dot(o[0], o[1], 0.6); G.text("O", o[0] + 1.3, o[1] + 1.8, {size:fs * 0.7}); }
    G.poly(half.map(T), {close:false, w:0.55});
    if(ans) G.poly(other.map(T), {close:false, w:0.55, color:RED});
  };
  const inst = kind === "line" ? `直線アイを${TAI}の${JIKU}とする線${TAI}な図形になるように，残りの半分をかきましょう。` : `点Oを${TAI}の中心とする点${TAI}な図形になるように，残りの半分をかきましょう。`;
  return figItem(COLS * C + 4, ROWS * C + 2, draw, "", {inst, lead:(kind === "line" ? "線" : "点") + TAI + "な図形をかく", sig:JSON.stringify(half)});
}
const SYM_SHAPES = [["正三角形", 1, 3, 0], ["二等辺三角形", 1, 1, 0], ["正方形", 1, 4, 1], ["長方形", 1, 2, 1], ["ひし形", 1, 2, 1], ["平行四辺形", 0, 0, 1], ["正五角形", 1, 5, 0], ["正六角形", 1, 6, 1], ["正八角形", 1, 8, 1]];

unit6(1, "対称", "4月", "折り返したり回したりして重なる形を調べよう", [
  {id:"a", name:"線対称な図形", gen(lv){ return genSymFig(lv, "line"); }},
  {id:"b", name:"点対称な図形", gen(lv){ return genSymFig(lv, "point"); }},
  {id:"c", name:"多角形と対称", gen(lv){
    const [nm, l, ax, p] = pick(SYM_SHAPES);
    if(lv === 0) return R() < 0.5 ? L(`${nm}は，線${TAI}な図形ですか。((${l ? "はい" : "いいえ"}))`, "つぎの問題に答えましょう。", "多角形と" + TAI) : L(`${nm}は，点${TAI}な図形ですか。((${p ? "はい" : "いいえ"}))`, "つぎの問題に答えましょう。", "多角形と" + TAI);
    if(lv === 1){ if(!l) return this.gen(lv); return L(`${nm}の${TAI}の${JIKU}の数((${ax}本))`, "つぎの問題に答えましょう。", "多角形と" + TAI); }
    const n = pick([5, 6, 8, 9, 10, 12]);
    return R() < 0.5 ? L(`正${POLY[n]}の${TAI}の${JIKU}の数((${n}本))`, "つぎの問題に答えましょう。", "多角形と" + TAI) : L(`正${POLY[n]}は，点${TAI}な図形ですか。((${n % 2 ? "いいえ" : "はい"}))`, "つぎの問題に答えましょう。", "多角形と" + TAI);
  }},
  {id:"d", name:"対称な図形をかく", gen(lv){ return genSymDraw(lv); }}
]);

/* ---------- 文字と式 ---------- */
unit6(2, "文字と式", "5月", "xやyを使って，数量の関係を表そう", [
  {id:"a", name:"文字を使った式に表す", gen(lv){
    const n = ri(3, 9), p = ri(8, 30) * 10, m = ri(2, 6);
    const T0 = [[`1本x円のえんぴつを${n}本買ったときの代金`, `x×${n}（円）`], [`たてがxcm，横が${n}cmの長方形の面積`, `x×${n}（cm^2）`], [`xmのリボンを${n}人で同じ長さずつ分けたときの，1人分の長さ`, `x÷${n}（m）`], [`${p}円持っていて，x円のおかしを買ったときの残りのお金`, `${p}－x（円）`]];
    const T1 = [[`x円のノートを${n}さつと，${p}円の筆箱を1つ買ったときの代金`, `x×${n}＋${p}（円）`], [`1辺がxcmの正方形のまわりの長さ`, `x×4（cm）`], [`底辺がxcm，高さが${n}cmの三角形の面積`, `x×${n}÷2（cm^2）`]];
    const T2 = [[`1こa円のりんごを${n}こと，1こb円のみかんを${m}こ買ったときの代金`, `a×${n}＋b×${m}（円）`], [`たてがacm，横がbcm，高さが${n}cmの直方体の体積`, `a×b×${n}（cm^3）`], [`x円の品物を，定価の${m}0%引きで買ったときの代金`, `x×（1－0.${m}）（円）`]];
    const [t, a] = pick(lv === 0 ? T0 : lv === 1 ? T1 : T2);
    return L(`${t}((${a}))`, "つぎの数量を，文字を使った式に表しましょう。", "式に表す");
  }},
  {id:"b", name:"式の値", gen(lv){
    const n = ri(3, 9), v = ri(2, 12) * (lv === 0 ? 10 : 1), p = ri(2, 9) * 10;
    if(lv === 0) return L(`x×${n}＝yで，xが${v}のときのyの値((${v * n}))`, "つぎの問題に答えましょう。", "式の値");
    if(lv === 1) return R() < 0.5 ? L(`x＋${p}＝yで，xが${v * 3}のときのyの値((${v * 3 + p}))`, "つぎの問題に答えましょう。", "式の値") : L(`${p * 10}－x＝yで，xが${v * 7}のときのyの値((${p * 10 - v * 7}))`, "つぎの問題に答えましょう。", "式の値");
    return L(`x×${n}＋${p}＝yで，xが${v}のときのyの値((${v * n + p}))`, "つぎの問題に答えましょう。", "式の値");
  }},
  {id:"c", name:"xにあてはまる数", gen(lv){
    const a = ri(3, 12), x = ri(2, 30), b = ri(5, 40);
    if(lv === 0) return R() < 0.5 ? L(`x＋${b}＝${x + b}　　x＝<<${x}>>`, "xにあてはまる数を求めましょう。", "xを求める") : L(`x－${b}＝${x}　　x＝<<${x + b}>>`, "xにあてはまる数を求めましょう。", "xを求める");
    if(lv === 1) return R() < 0.5 ? L(`x×${a}＝${x * a}　　x＝<<${x}>>`, "xにあてはまる数を求めましょう。", "xを求める") : L(`x÷${a}＝${x}　　x＝<<${x * a}>>`, "xにあてはまる数を求めましょう。", "xを求める");
    return R() < 0.5 ? L(`x×${a}＋${b}＝${x * a + b}　　x＝<<${x}>>`, "xにあてはまる数を求めましょう。", "xを求める") : (() => { const k = pick(["1.5", "2.5", "0.4", "1.2"]), xx = ri(2, 20) * 5, y = dmul(xx, k); return L(`x×${k}＝${y}　　x＝<<${xx}>>`, "xにあてはまる数を求めましょう。", "xを求める"); })();
  }},
  {id:"d", name:"文章題", gen(lv){
    const a = ri(3, 9), x = ri(4, 30), b = ri(10, 60);
    if(lv === 0) return W_(`ある数xに${b}をたすと${x + b}になります。xを求めましょう。`, [`x＋${b}＝${x + b}`, `x＝${x + b}－${b}＝${x}`], `${x}`, "xを使った式");
    if(lv === 1) return W_(`1本x円のペンを${a}本買ったら，代金は${x * 10 * a}円でした。xを求めましょう。`, [`x×${a}＝${x * 10 * a}`, `x＝${x * 10 * a}÷${a}＝${x * 10}`], `${x * 10}`, "xを使った式");
    return W_(`1こx円のパンを${a}こと，${b * 10}円のジュースを1本買ったら，代金は${x * 10 * a + b * 10}円でした。xを求めましょう。`, [`x×${a}＋${b * 10}＝${x * 10 * a + b * 10}`, `x×${a}＝${x * 10 * a}`, `x＝${x * 10}`], `${x * 10}`, "xを使った式");
  }}
]);

/* ---------- 分数と整数のかけ算とわり算 ---------- */
unit6(3, "分数と整数のかけ算とわり算", "5月", "分数に整数をかけたり，整数でわったりしよう", [
  {id:"a", name:"分数×整数", gen(lv){
    for(;;){ const [a, b] = rfrac(9, 3), n = ri(2, 9);
      if(lv === 0 && gcd(n, b) > 1) continue; if(lv === 1 && gcd(n, b) === 1) continue;
      if(lv === 2){ const w = ri(1, 3); return L(`${MX(w, a, b)}×${n}＝<<${fA(fmul([w * b + a, b], [n, 1]))}>>`, K_CALC, "計算"); }
      return L(`${F(a, b)}×${n}＝<<${fA(fmul([a, b], [n, 1]))}>>`, K_CALC, "計算"); }
  }},
  {id:"b", name:"分数÷整数", gen(lv){
    for(;;){ const [a, b] = rfrac(9, 3), n = ri(2, 9);
      if(lv === 0 && gcd(a, n) > 1) continue; if(lv === 1 && gcd(a, n) === 1) continue;
      if(lv === 2){ const w = ri(1, 3); return L(`${MX(w, a, b)}÷${n}＝<<${fA(fdiv([w * b + a, b], [n, 1]))}>>`, K_CALC, "計算"); }
      return L(`${F(a, b)}÷${n}＝<<${fA(fdiv([a, b], [n, 1]))}>>`, K_CALC, "計算"); }
  }},
  {id:"c", name:"文章題", gen(lv){
    const [a, b] = rfrac(9, 3), n = ri(2, 6);
    if(lv === 0){ const r = fmul([a, b], [n, 1]); return W_(`1dLで${F(a, b)}m^2のかべをぬれるペンキがあります。このペンキ${n}dLでは，何m^2ぬれますか。`, `${F(a, b)}×${n}＝${fA(r)}`, `${fA(r)}m^2`, "分数×整数"); }
    if(lv === 1){ const r = fdiv([a, b], [n, 1]); return W_(`${F(a, b)}Lのジュースを，${n}人で同じ量ずつ分けます。1人分は何Lですか。`, `${F(a, b)}÷${n}＝${fA(r)}`, `${fA(r)}L`, "分数÷整数"); }
    const w = ri(1, 3), r = fdiv([w * b + a, b], [n, 1]);
    return W_(`${MX(w, a, b)}mのテープを，${n}等分します。1本分の長さは何mですか。`, `${MX(w, a, b)}÷${n}＝${fA(r)}`, `${fA(r)}m`, "分数÷整数");
  }}
]);

/* ---------- 分数×分数 ---------- */
function frPair(lv, maxD){
  for(;;){ const x = rfrac(maxD || 9, 2), y = rfrac(maxD || 9, 2); const r = fmul(x, y);
    const red = x[0] * y[0] !== r[0] || x[1] * y[1] !== r[1];
    if(lv === 0 && red) continue; if(lv >= 1 && !red) continue; return [x, y]; }
}
unit6(4, "分数×分数", "6月", "分数×分数の計算を，図や式で考えよう", [
  {id:"a", name:"分数×分数", gen(lv){
    if(lv === 2){ const w1 = ri(1, 2), [a, b] = rfrac(6, 2), w2 = ri(1, 2), [c, d] = rfrac(6, 2); const r = fmul([w1 * b + a, b], [w2 * d + c, d]); return L(`${MX(w1, a, b)}×${MX(w2, c, d)}＝<<${fA(r)}>>`, K_CALC, "計算"); }
    const [x, y] = frPair(lv); return L(`${fStr(x)}×${fStr(y)}＝<<${fA(fmul(x, y))}>>`, K_CALC, "計算");
  }},
  {id:"b", name:"整数×分数・3つの分数", gen(lv){
    if(lv === 0){ const n = ri(2, 9), [a, b] = rfrac(9, 3); return L(`${n}×${F(a, b)}＝<<${fA(fmul([n, 1], [a, b]))}>>`, K_CALC, "計算"); }
    const x = rfrac(9, 2), y = rfrac(9, 2), z = rfrac(9, 2);
    return L(`${fStr(x)}×${fStr(y)}×${fStr(z)}＝<<${fA(fmul(fmul(x, y), z))}>>`, K_CALC, "計算");
  }},
  {id:"c", name:"逆数", gen(lv){
    if(lv === 0){ const [a, b] = rfrac(9, 2); return L(`${F(a, b)}の逆数((${fA([b, a])}))`, "つぎの数の逆数を求めましょう。", "逆数"); }
    if(lv === 1){ if(R() < 0.5){ const n = ri(2, 12); return L(`${n}の逆数((${F(1, n)}))`, "つぎの数の逆数を求めましょう。", "逆数"); } const w = ri(1, 3), [a, b] = rfrac(7, 2); return L(`${MX(w, a, b)}の逆数((${F(b, w * b + a)}))`, "つぎの数の逆数を求めましょう。", "逆数"); }
    const x = pick(["0.3", "0.7", "0.9", "1.3", "0.25", "0.8", "1.5"]), f = decFr(x); return L(`${x}の逆数((${fA([f[1], f[0]])}))`, "つぎの数の逆数を求めましょう。", "逆数");
  }},
  {id:"d", name:"分数の辺の面積・体積", gen(lv){
    const x = rfrac(9, 2), y = rfrac(9, 2);
    if(lv < 2) return W_(`たて${fStr(x)}m，横${fStr(y)}mの長方形の面積は何m^2ですか。`, `${fStr(x)}×${fStr(y)}＝${fA(fmul(x, y))}`, `${fA(fmul(x, y))}m^2`, "面積");
    const z = rfrac(5, 2), v = fmul(fmul(x, y), z);
    return W_(`たて${fStr(x)}m，横${fStr(y)}m，高さ${fStr(z)}mの直方体の体積は何m^3ですか。`, `${fStr(x)}×${fStr(y)}×${fStr(z)}＝${fA(v)}`, `${fA(v)}m^3`, "体積");
  }},
  {id:"e", name:"文章題", gen(lv){
    const [x, y] = frPair(lv === 0 ? 0 : 1);
    if(lv === 2){ const w = ri(1, 2), X = [w * y[1] + y[0], y[1]], r = fmul(x, X); return W_(`1mの重さが${fStr(x)}kgのぼうがあります。このぼう${MX(w, y[0], y[1])}mの重さは何kgですか。`, `${fStr(x)}×${MX(w, y[0], y[1])}＝${fA(r)}`, `${fA(r)}kg`, "分数×分数"); }
    return W_(`1mの重さが${fStr(x)}kgのぼうがあります。このぼう${fStr(y)}mの重さは何kgですか。`, `${fStr(x)}×${fStr(y)}＝${fA(fmul(x, y))}`, `${fA(fmul(x, y))}kg`, "分数×分数");
  }}
]);

/* ---------- 分数÷分数 ---------- */
unit6(5, "分数÷分数", "6月", "分数÷分数の計算を，図や式で考えよう", [
  {id:"a", name:"分数÷分数", gen(lv){
    if(lv === 2){ if(R() < 0.5){ const n = ri(2, 9), [a, b] = rfrac(9, 2); return L(`${n}÷${F(a, b)}＝<<${fA(fdiv([n, 1], [a, b]))}>>`, K_CALC, "計算"); }
      const w1 = ri(1, 3), [a, b] = rfrac(6, 2), w2 = ri(1, 2), [c, d] = rfrac(6, 2); return L(`${MX(w1, a, b)}÷${MX(w2, c, d)}＝<<${fA(fdiv([w1 * b + a, b], [w2 * d + c, d]))}>>`, K_CALC, "計算"); }
    for(;;){ const x = rfrac(9, 2), y = rfrac(9, 2), r = fdiv(x, y); const red = x[0] * y[1] !== r[0] || x[1] * y[0] !== r[1];
      if(lv === 0 && red) continue; if(lv === 1 && !red) continue; if(x[1] === y[1] && x[0] === y[0]) continue;
      return L(`${fStr(x)}÷${fStr(y)}＝<<${fA(r)}>>`, K_CALC, "計算"); }
  }},
  {id:"b", name:"かけ算とわり算のまじった計算", gen(lv){
    const x = rfrac(9, 2), y = rfrac(9, 2), z = rfrac(9, 2);
    if(lv === 0) return L(`${fStr(x)}÷${fStr(y)}×${fStr(z)}＝<<${fA(fmul(fdiv(x, y), z))}>>`, K_CALC, "計算");
    if(lv === 1) return L(`${fStr(x)}×${fStr(y)}÷${fStr(z)}＝<<${fA(fdiv(fmul(x, y), z))}>>`, K_CALC, "計算");
    return L(`${fStr(x)}÷${fStr(y)}÷${fStr(z)}＝<<${fA(fdiv(fdiv(x, y), z))}>>`, K_CALC, "計算");
  }},
  {id:"c", name:"積や商の大きさ", gen(lv){
    const n = ri(4, 30), [a, b] = R() < 0.5 ? rfrac(9, 2) : (() => { const d = ri(2, 7); return [d + ri(1, d - 1), d]; })();
    if(gcd(a, b) > 1) return this.gen(lv);
    const op = lv === 0 ? "×" : lv === 1 ? "÷" : pick(["×", "÷"]);
    const big = op === "×" ? a > b : a < b;
    return L(`${n}${op}${F(a, b)} [[${big ? "＞" : "＜"}]] ${n}`, "計算をしないで，[[ ]]に不等号を書きましょう。", "不等号");
  }},
  {id:"d", name:"文章題", gen(lv){
    const x = rfrac(9, 2), y = rfrac(9, 2);
    if(lv === 0){ const r = fdiv(x, y); return W_(`${fStr(y)}dLのペンキで，${fStr(x)}m^2のかべをぬれました。このペンキ1dLでは，何m^2ぬれますか。`, `${fStr(x)}÷${fStr(y)}＝${fA(r)}`, `${fA(r)}m^2`, "分数÷分数"); }
    if(lv === 1){ const r = fdiv(x, y); return W_(`${fStr(y)}mの重さが${fStr(x)}kgのぼうがあります。このぼう1mの重さは何kgですか。`, `${fStr(x)}÷${fStr(y)}＝${fA(r)}`, `${fA(r)}kg`, "分数÷分数"); }
    const w = ri(2, 6), r = fdiv([w, 1], x);
    return W_(`${w}Lのジュースを，1人${fStr(x)}Lずつ分けます。何人に分けられますか。`, `${w}÷${fStr(x)}＝${fA(r)}`, Number.isInteger(r[0] / r[1]) ? `${r[0] / r[1]}人` : `${Math.floor(r[0] / r[1])}人（あまりが出る）`, "分数÷分数");
  }}
]);

/* ---------- 資料の整理 ---------- */
function makeData(n, lo, hi, needMode){
  for(let t = 0; t < 500; t++){
    const d = Array.from({length:n}, () => ri(lo, hi));
    if(needMode){ const m = ri(lo, hi), k = ri(2, 3); for(let i = 0; i < k; i++) d[i] = m; }
    const cnt = {}; d.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    const mx = Math.max(...Object.values(cnt)), modes = Object.keys(cnt).filter(k => cnt[k] === mx);
    if(needMode && (mx < 2 || modes.length !== 1)) continue;
    const sum = d.reduce((a, b) => a + b, 0); if((sum * 10) % n) continue;
    const s = d.slice().sort((a, b) => a - b), med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    return {d:shuffle(d), mean:ds(sum * 10 / n, 1), med:String(med), mode:modes[0]};
  }
  return null;
}
const CLS_LBL = (a, w) => `${a}以上${a + w}未満`;
function histData(lv){
  const w = 5, start = pick([15, 20]), k = 6;
  const tot = lv === 2 ? pick([20, 25]) : ri(18, 26);
  for(;;){
    const c = Array.from({length:k}, () => ri(1, 7)); const s = c.reduce((a, b) => a + b, 0);
    c[2] += tot - s; if(c[2] < 1 || c[2] > 9) continue;
    const mx = Math.max(...c); if(c.filter(v => v === mx).length > 1) continue;
    return {w, start, k, c, tot};
  }
}
unit6(6, "資料の整理", "7月", "代表値やちらばりでデータをくらべよう", [
  {id:"a", name:"代表値", gen(lv){
    const n = lv === 2 ? pick([10, 12]) : pick([9, 11]);
    const D = makeData(n, 15, 38, lv >= 1); if(!D) return this.gen(lv);
    const subs = [`平均値((${D.mean}m))`, `中央値((${D.med}m))`];
    if(lv >= 1) subs.push(`${HIN}((${D.mode}m))`);
    return setItem(0, 0, () => {}, subs, {stack:true, text:`下の記録は，6年1組の${n}人のソフトボール投げの記録です。\n${D.d.join("，")}（m）`, inst:"つぎの問題に答えましょう。", lead:"代表値", sig:D.d.join()});
  }},
  {id:"b", name:"度数分布表", gen(lv){
    const H = histData(lv), data = [];
    H.c.forEach((cnt, i) => { for(let j = 0; j < cnt; j++) data.push(H.start + i * H.w + ri(0, H.w - 1)); });
    const rows = [["きょり(m)", "人数(人)"]].concat(H.c.map((cnt, i) => [CLS_LBL(H.start + i * H.w, H.w), `[[${cnt}]]`]), [["合計", String(H.tot)]]);
    const mi = H.c.indexOf(Math.max(...H.c));
    const subs = [`人数がいちばん多いのは，どの階級ですか。((${CLS_LBL(H.start + mi * H.w, H.w)}))`];
    if(lv >= 1){ const t = H.start + 3 * H.w, n = H.c.slice(3).reduce((a, b) => a + b, 0); subs.push(`記録が${t}m以上の人は何人ですか。((${n}人))`); }
    if(lv === 2){ const t = H.start + 4 * H.w, n = H.c.slice(4).reduce((a, b) => a + b, 0); subs.push(`記録が${t}m以上の人は，全体の何%ですか。((${n * 100 / H.tot}%))`); }
    return tableItem(`下の記録は，6年生${H.tot}人のソフトボール投げの記録です。これを表にまとめましょう。\n${shuffle(data).join("，")}（m）`, rows, subs, {inst:"つぎの問題に答えましょう。", lead:"度数分布表", headRow:true});
  }},
  {id:"c", name:"柱状グラフ", gen(lv){
    const H = histData(lv), mi = H.c.indexOf(Math.max(...H.c));
    const q = ri(0, H.k - 1);
    const subs = [`${CLS_LBL(H.start + q * H.w, H.w)}の階級の人数は何人ですか。((${H.c[q]}人))`, `人数がいちばん多いのは，どの階級ですか。((${CLS_LBL(H.start + mi * H.w, H.w)}))`];
    if(lv >= 1){ const t = H.start + 4 * H.w; subs.push(`記録が${t}m以上の人は何人ですか。((${H.c[4] + H.c[5]}人))`); }
    if(lv === 2){ const t = H.start + 3 * H.w, n = H.c.slice(3).reduce((a, b) => a + b, 0); subs.push(`記録が${t}m以上の人は，全体の何%ですか。((${n * 100 / H.tot}%))`); }
    const draw = (G, x, y, w, h, fs) => {
      const mx = Math.max(...H.c) + 1, ox = x + 9, oy = y + h - 7, gw = w - 13, gh = h - 12, bw = gw / H.k;
      for(let v = 0; v <= mx; v++){ const yy = oy - gh * v / mx; G.line(ox, yy, ox + gw, yy, {w:0.1, color:GRID}); G.text(String(v), ox - 1.5, yy, {size:fs * 0.5, align:"right"}); }
      H.c.forEach((c, i) => G.rect(ox + i * bw, oy - gh * c / mx, bw, gh * c / mx, {w:0.35, fill:"#e6e6e6"}));
      G.line(ox, oy, ox + gw, oy, {w:0.4}); G.line(ox, oy, ox, oy - gh, {w:0.4});
      for(let i = 0; i <= H.k; i++) G.text(String(H.start + i * H.w), ox + i * bw, oy + 2.4, {size:fs * 0.5, align:"center"});
      G.text("(人)", ox - 1, y + 1.5, {size:fs * 0.5, align:"right"}); G.text("(m)", ox + gw, oy + 5, {size:fs * 0.5, align:"right"});
    };
    return setItem(70, 50, draw, subs, {inst:"つぎの問題に答えましょう。", lead:"柱状グラフ", text:`下の柱状グラフは，6年生${H.tot}人のソフトボール投げの記録を表したものです。`, sig:H.c.join()});
  }}
]);

/* ---------- ならべ方と組み合わせ方 ---------- */
const fact = n => n <= 1 ? 1 : n * fact(n - 1);
const comb = (n, k) => fact(n) / fact(k) / fact(n - k);
unit6(7, "ならべ方と組み合わせ方", "9月", "図や表を使って，順番に調べて数えよう", [
  {id:"a", name:"ならべ方", gen(lv){
    const Q = "つぎの問題に答えましょう。";
    if(lv === 0){ const n = ri(3, 4); return pick([
      () => L(`${"ABCD".slice(0, n).split("").join("，")}の${n}人が，1列にならびます。ならび方は何通りありますか。((${fact(n)}通り))`, Q, "ならべ方"),
      () => L(`${[1, 2, 3, 4].slice(0, n).join("，")}の${n}まいのカードを全部ならべて，${n}けたの整数をつくります。整数は何通りできますか。((${fact(n)}通り))`, Q, "ならべ方")])(); }
    if(lv === 1){ const n = ri(4, 5); return pick([
      () => L(`${n}人の中から，リレーの第1走者と第2走者を1人ずつ選びます。選び方は何通りありますか。((${n * (n - 1)}通り))`, Q, "ならべ方"),
      () => L(`1から${n}までの${n}まいのカードから2まいをならべて，2けたの整数をつくります。整数は何通りできますか。((${n * (n - 1)}通り))`, Q, "ならべ方"),
      () => { const k = ri(2, 4); return L(`コインを${k}回投げます。表と裏の出方は，全部で何通りありますか。((${P10(0) * Math.pow(2, k)}通り))`, Q, "ならべ方"); }])(); }
    return pick([
      () => L(`0，1，2，3の4まいのカードから3まいをならべて，3けたの整数をつくります。整数は何通りできますか。((18通り))`, Q, "ならべ方"),
      () => { const n = ri(4, 5); return L(`${n}人の中から，委員長，副委員長，書記を1人ずつ選びます。選び方は何通りありますか。((${n * (n - 1) * (n - 2)}通り))`, Q, "ならべ方"); }])();
  }},
  {id:"b", name:"組み合わせ方", gen(lv){
    const Q = "つぎの問題に答えましょう。";
    if(lv === 0){ const n = ri(4, 5); return L(`${"ABCDE".slice(0, n).split("").join("，")}の${n}チームが，どのチームとも1回ずつ試合をします。試合は全部で何試合ですか。((${comb(n, 2)}試合))`, Q, "組み合わせ方"); }
    if(lv === 1){ const n = ri(4, 6); return pick([
      () => L(`${n}種類のアイスクリームから，ちがう種類を2つ選びます。選び方は何通りありますか。((${comb(n, 2)}通り))`, Q, "組み合わせ方"),
      () => L(`10円，50円，100円，500円の4まいのこう貨から2まいを選びます。できる金額は何通りありますか。((6通り))`, Q, "組み合わせ方")])(); }
    const n = 5, k = 3; return pick([
      () => L(`${n}人の中から，そうじ当番を${k}人選びます。選び方は何通りありますか。((${comb(n, k)}通り))`, Q, "組み合わせ方"),
      () => L(`赤，青，黄，緑，白の5色から，4色を選びます。選び方は何通りありますか。((5通り))`, Q, "組み合わせ方")])();
  }}
]);

/* ---------- 小数と分数の計算 ---------- */
const DECS = ["0.2", "0.4", "0.5", "0.6", "0.8", "0.25", "0.75", "1.2", "1.5", "0.3", "0.7", "2.5"];
unit6(8, "小数と分数の計算", "9月", "小数と分数がまじった計算をしよう", [
  {id:"a", name:"小数と分数のかけ算・わり算", gen(lv){
    const d = pick(DECS), f = rfrac(9, 2), D = decFr(d);
    if(lv === 0) return L(`${d}×${fStr(f)}＝<<${fAD(fmul(D, f))}>>`, K_CALC, "計算");
    if(lv === 1) return L(`${fStr(f)}÷${d}＝<<${fAD(fdiv(f, D))}>>`, K_CALC, "計算");
    const g = rfrac(9, 2); return L(`${d}×${fStr(f)}÷${fStr(g)}＝<<${fAD(fdiv(fmul(D, f), g))}>>`, K_CALC, "計算");
  }},
  {id:"b", name:"小数と分数のたし算・ひき算", gen(lv){
    const d = pick(DECS.slice(0, 7)), f = rfrac(lv === 0 ? 6 : 9, 2), D = decFr(d);
    if(lv === 0) return L(`${d}＋${fStr(f)}＝<<${fAD(fadd(D, f))}>>`, K_CALC, "計算");
    const r = fsub(D, f); if(r[0] === 0) return this.gen(lv);
    if(r[0] < 0) return L(`${fStr(f)}－${d}＝<<${fAD(fsub(f, D))}>>`, K_CALC, "計算");
    return L(`${d}－${fStr(f)}＝<<${fAD(r)}>>`, K_CALC, "計算");
  }},
  {id:"c", name:"時間と分数", gen(lv){
    const m = pick([10, 15, 20, 25, 40, 45, 50]);
    if(lv === 0) return L(`${m}分は何時間ですか。分数で答えましょう。((${fStr(FR(m, 60))}時間))`, "つぎの問題に答えましょう。", "時間と分数");
    if(lv === 1){ const f = FR(m, 60); return L(`${fStr(f)}時間は何分ですか。((${m}分))`, "つぎの問題に答えましょう。", "時間と分数"); }
    const v = pick([4, 30, 36, 45, 60, 80]), dist = FR(v * m, 60);
    return W_(`時速${v}kmで走る自動車は，${m}分間に何km進みますか。`, [`${m}分＝${fStr(FR(m, 60))}時間`, `${v}×${fStr(FR(m, 60))}＝${fA(dist)}`], `${fA(dist)}km`, "時間と分数");
  }}
]);

/* ---------- ○倍の計算 分数倍 ---------- */
U6.push({id:"6-x1", no:"○", name:"○倍の計算（分数倍）", month:"9月", meate:"何倍かを分数で表して考えよう", subs:[
  {id:"a", name:"何倍かを分数で求める", gen(lv){
    for(;;){ const a = ri(12, 40), b = ri(12, 40); if(a === b || b % a === 0 || (b * 100) % a === 0) continue;
      if(lv === 0 && b > a) continue;
      return W_(`ソフトボール投げで，Aさんは${a}m，Bさんは${b}m投げました。Bさんの記録は，Aさんの記録の何倍ですか。分数で答えましょう。`, `${b}÷${a}＝${fA(FR(b, a))}`, `${fA(FR(b, a))}倍`, "分数倍"); }
  }},
  {id:"b", name:"分数倍を使った問題", gen(lv){
    const [p, q] = rfrac(9, 2), a = q * ri(3, 8), b = a * p / q;
    if(lv === 0) return W_(`Aさんは${a}m投げました。Bさんの記録は，Aさんの記録の${F(p, q)}倍です。Bさんは何m投げましたか。`, `${a}×${F(p, q)}＝${b}`, `${b}m`, "分数倍");
    return W_(`Bさんは${b}m投げました。これは，Aさんの記録の${F(p, q)}倍にあたります。Aさんは何m投げましたか。`, `${b}÷${F(p, q)}＝${a}`, `${a}m`, "分数倍");
  }}
]});

/* ---------- 円の面積 ---------- */
function genCircleArea(lv){
  const r = ri(2, 10), kind = lv === 2 ? pick(["half", "quarter"]) : "full";
  const A = kind === "full" ? dmul(r * r, "3.14") : kind === "half" ? dmul(r * r, "1.57") : dmul(r * r, "0.785");
  const draw = (G, x, y, w, h, fs) => {
    const R_ = Math.min(w, h) / 2 - 4, cx = x + w / 2, cy = y + h / 2;
    if(kind === "full"){ G.arc(cx, cy, R_, 0, 2 * Math.PI, {w:0.4}); G.dot(cx, cy, 0.35);
      if(lv === 0){ G.line(cx, cy, cx + R_, cy, {w:0.3}); G.text(cm(r), cx + R_ / 2, cy - 0.8 * fs, {size:fs * 0.85, align:"center"}); }
      else { G.line(cx - R_, cy, cx + R_, cy, {w:0.3}); G.text(cm(2 * r), cx, cy - 0.8 * fs, {size:fs * 0.85, align:"center"}); } }
    else if(kind === "half"){ const yy = cy + R_ / 2; G.arc(cx, yy, R_, Math.PI, 2 * Math.PI, {w:0.4}); G.line(cx - R_, yy, cx + R_, yy, {w:0.4}); G.dot(cx, yy, 0.35); G.text(cm(r), cx + R_ / 2, yy + 0.9 * fs, {size:fs * 0.85, align:"center"}); }
    else { const R2 = R_ * 1.5, ox = cx - R2 / 2, oy = cy + R2 / 2; G.arc(ox, oy, R2, -Math.PI / 2, 0, {w:0.4}); G.line(ox, oy, ox + R2, oy, {w:0.4}); G.line(ox, oy, ox, oy - R2, {w:0.4}); G.text(cm(r), ox + R2 / 2, oy + 0.9 * fs, {size:fs * 0.85, align:"center"}); }
  };
  return figItem(FIGW - 8, FIGH, draw, "((" + A + "cm^2))", {inst:"つぎの図形の面積を求めましょう。円周率は3.14とします。", lead:"円の面積", sig:kind + r + lv});
}
function genCircleMix(lv){
  const s = ri(2, 10) * (lv === 0 ? 1 : 2);
  let A, draw;
  if(lv === 0){
    const r1 = ri(4, 10), r2 = ri(2, r1 - 1); A = dmul(r1 * r1 - r2 * r2, "3.14");
    draw = (G, x, y, w, h, fs) => {
      const R_ = Math.min(w, h) / 2 - 4, cx = x + w / 2, cy = y + h / 2, rr = R_ * r2 / r1, ctx = G.ctx, k = G.k;
      ctx.beginPath(); ctx.arc(cx * k, cy * k, R_ * k, 0, 2 * Math.PI); ctx.arc(cx * k, cy * k, rr * k, 0, 2 * Math.PI, true); ctx.fillStyle = "#dddddd"; ctx.fill();
      G.arc(cx, cy, R_, 0, 2 * Math.PI, {w:0.4}); G.arc(cx, cy, rr, 0, 2 * Math.PI, {w:0.4}); G.dot(cx, cy, 0.35);
      G.line(cx, cy, cx + R_ * 0.8, cy - R_ * 0.6, {w:0.3}); G.text(cm(r1), cx + R_ * 0.55, cy - R_ * 0.62, {size:fs * 0.75});
      G.line(cx, cy, cx - rr, cy, {w:0.3}); G.text(cm(r2), cx - rr / 2, cy + 0.8 * fs, {size:fs * 0.75, align:"center"});
    };
  } else if(lv === 1){
    A = ds(s * s * 100 - s * s * 78.5, 2);
    draw = (G, x, y, w, h, fs) => {
      const L_ = Math.min(w, h) - 8, ox = x + (w - L_) / 2, oy = y + 4, ctx = G.ctx, k = G.k;
      ctx.beginPath(); ctx.rect(ox * k, oy * k, L_ * k, L_ * k); ctx.moveTo(ox * k, (oy + L_) * k); ctx.arc(ox * k, (oy + L_) * k, L_ * k, -Math.PI / 2, 0, false); ctx.closePath(); ctx.fillStyle = "#dddddd"; ctx.fill("evenodd");
      G.rect(ox, oy, L_, L_, {w:0.4}); G.arc(ox, oy + L_, L_, -Math.PI / 2, 0, {w:0.4});
      G.text(cm(s), ox + L_ / 2, oy + L_ + 0.9 * fs, {size:fs * 0.8, align:"center"});
    };
  } else {
    A = ds(s * s * 57, 2);
    draw = (G, x, y, w, h, fs) => {
      const L_ = Math.min(w, h) - 8, ox = x + (w - L_) / 2, oy = y + 4, ctx = G.ctx, k = G.k;
      ctx.beginPath(); ctx.moveTo(ox * k, oy * k); ctx.arc(ox * k, (oy + L_) * k, L_ * k, -Math.PI / 2, 0, false); ctx.arc((ox + L_) * k, oy * k, L_ * k, Math.PI / 2, Math.PI, false); ctx.closePath(); ctx.fillStyle = "#dddddd"; ctx.fill();
      G.rect(ox, oy, L_, L_, {w:0.4}); G.arc(ox, oy + L_, L_, -Math.PI / 2, 0, {w:0.4}); G.arc(ox + L_, oy, L_, Math.PI / 2, Math.PI, {w:0.4});
      G.text(cm(s), ox + L_ / 2, oy + L_ + 0.9 * fs, {size:fs * 0.8, align:"center"});
    };
  }
  return figItem(FIGW - 6, FIGH + 6, draw, "((" + A + "cm^2))", {inst:"色をぬった部分の面積を求めましょう。円周率は3.14とします。", lead:"いろいろな面積", sig:"m" + lv + s + A});
}
unit6(9, "円の面積", "9月", "円の面積の公式を使って求めよう", [
  {id:"a", name:"円の面積", gen(lv){ return genCircleArea(lv); }},
  {id:"b", name:"いろいろな面積", gen(lv){ return genCircleMix(lv); }},
  {id:"c", name:"円の面積（ことばの問題）", gen(lv){
    const r = ri(2, 12);
    if(lv === 0) return L(`半径${r}cmの円の面積((${dmul(r * r, "3.14")}cm^2))`, "つぎの問題に答えましょう。円周率は3.14とします。", "円の面積");
    if(lv === 1) return L(`直径${2 * r}cmの円の面積((${dmul(r * r, "3.14")}cm^2))`, "つぎの問題に答えましょう。円周率は3.14とします。", "円の面積");
    return L(`円周の長さが${dmul(2 * r, "3.14")}cmの円の面積((${dmul(r * r, "3.14")}cm^2))`, "つぎの問題に答えましょう。円周率は3.14とします。", "円の面積");
  }}
]);

/* ---------- 立体の体積 ---------- */
unit6(10, "立体の体積", "10月", "角柱や円柱の体積の求め方を考えよう", [
  {id:"a", name:"角柱の体積", gen(lv){
    if(lv === 0){ const S = ri(6, 40), h = ri(3, 12); return L(`底面積が${S}cm^2，高さが${h}cmの角柱の体積((${S * h}cm^3))`, "つぎの問題に答えましょう。", "角柱の体積"); }
    if(lv === 1){ const a = ri(3, 8), b = ri(3, 8), h = ri(4, 10), V = ds(a * b * h * 5, 1);
      return figItem(FIGW + 4, FIGH + 4, (G, x, y, w, hh, fs) => drawPrism3(G, x, y, w, hh, fs, a, b, "", h), "((" + V + "cm^3))", {inst:"つぎの角柱の体積を求めましょう。", lead:"角柱の体積", sig:"p3" + a + b + h}); }
    return genBox(1, true);
  }},
  {id:"b", name:"円柱の体積", gen(lv){
    const r = ri(2, 8), h = ri(3, 12), V = dmul(r * r * h, "3.14");
    if(lv === 2) return L(`底面の円周が${dmul(2 * r, "3.14")}cm，高さが${h}cmの円柱の体積((${V}cm^3))`, "つぎの問題に答えましょう。円周率は3.14とします。", "円柱の体積");
    return figItem(FIGW, FIGH + 6, (G, x, y, w, hh, fs) => drawCylinder(G, x, y, w, hh, fs, 2 * r, h, lv === 0), "((" + V + "cm^3))", {inst:"つぎの円柱の体積を求めましょう。円周率は3.14とします。", lead:"円柱の体積", sig:"c" + r + h + lv});
  }}
]);

/* ---------- 比とその利用 ---------- */
unit6(11, "比とその利用", "10月", "比を使って，いろいろな問題をとこう", [
  {id:"a", name:"比の値", gen(lv){
    if(lv === 0){ let a, b; do{ a = ri(1, 12); b = ri(2, 15); } while(a === b); return L(`${a}：${b}の比の値((${fA(FR(a, b))}))`, "つぎの比の値を求めましょう。", "比の値"); }
    if(lv === 1){ const a = rdec(2, 30, 1), b = rdec(2, 30, 1); if(a === b) return this.gen(lv); return L(`${a}：${b}の比の値((${fA(fdiv(decFr(a), decFr(b)))}))`, "つぎの比の値を求めましょう。", "比の値"); }
    const x = rfrac(9, 2), y = rfrac(9, 2); return L(`${fStr(x)}：${fStr(y)}の比の値((${fA(fdiv(x, y))}))`, "つぎの比の値を求めましょう。", "比の値");
  }},
  {id:"b", name:"比を簡単にする", gen(lv){
    let p, q; do{ p = ri(1, 9); q = ri(1, 9); } while(p === q || gcd(p, q) > 1);
    if(lv === 0){ const k = ri(2, 12); return L(`${p * k}：${q * k}＝<<${p}：${q}>>`, "つぎの比を簡単にしましょう。", "比を簡単に"); }
    if(lv === 1){ const k = pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]); return L(`${ds(Math.round(p * k * 10), 1)}：${ds(Math.round(q * k * 10), 1)}＝<<${p}：${q}>>`, "つぎの比を簡単にしましょう。", "比を簡単に"); }
    const x = rfrac(9, 2), y = rfrac(9, 2), r = fdiv(x, y); return L(`${fStr(x)}：${fStr(y)}＝<<${r[0]}：${r[1]}>>`, "つぎの比を簡単にしましょう。", "比を簡単に");
  }},
  {id:"c", name:"xの値を求める", gen(lv){
    let p, q; do{ p = ri(1, 9); q = ri(2, 9); } while(p === q || gcd(p, q) > 1);
    const k = ri(2, 9);
    if(lv === 0) return L(`${p}：${q}＝x：${q * k}　　x＝<<${p * k}>>`, "xにあてはまる数を求めましょう。", "等しい比");
    if(lv === 1) return L(`x：${q * k}＝${p}：${q}　　x＝<<${p * k}>>`, "xにあてはまる数を求めましょう。", "等しい比");
    const m = ri(2, 6); return L(`${p * k}：${q * k}＝${p * m}：x　　x＝<<${q * m}>>`, "xにあてはまる数を求めましょう。", "等しい比");
  }},
  {id:"d", name:"比の利用", gen(lv){
    let p, q; do{ p = ri(2, 7); q = ri(2, 9); } while(p === q || gcd(p, q) > 1);
    const k = ri(3, 12);
    if(lv === 0) return W_(`たてと横の長さの比が${p}：${q}の長方形をかきます。横の長さを${q * k}cmにすると，たての長さは何cmになりますか。`, [`${p}：${q}＝x：${q * k}`, `x＝${p * k}`], `${p * k}cm`, "比の利用");
    if(lv === 1){ const T = (p + q) * k; return W_(`${T}cmのリボンを，長さの比が${Math.max(p, q)}：${Math.min(p, q)}になるように2本に分けます。長いほうのリボンは何cmですか。`, [`${T}×${F(Math.max(p, q), p + q)}＝${Math.max(p, q) * k}`], `${Math.max(p, q) * k}cm`, "比の利用"); }
    return W_(`ジュースと牛乳を${p}：${q}の比でまぜて，飲み物を作ります。牛乳を${q * k * 10}mL使うとき，ジュースは何mL使いますか。`, [`${p}：${q}＝x：${q * k * 10}`, `x＝${p * k * 10}`], `${p * k * 10}mL`, "比の利用");
  }}
]);

/* ---------- 拡大図と縮図 ---------- */
function genSimilar(lv){
  const T = makeTri(), k = lv === 0 ? 2 : lv === 1 ? pick([3, "1/2"]) : pick([2, 3]);
  const kv = k === "1/2" ? 0.5 : k;
  const big = kv >= 1;
  const N1 = ["A", "B", "C"], N2 = ["D", "E", "F"], angR = T.angs.map(Math.round);
  const sideLen = [T.a, T.b, T.c];
  const subs = [];
  const kTxt = k === "1/2" ? F(1, 2) + "の縮図" : k + "倍の拡大図";
  if(lv === 2){
    subs.push(`三角形DEFは，三角形ABCの何倍の拡大図ですか。((${k}倍))`);
    subs.push(`辺DEの長さ((${cm(T.c * kv)}))`);
    subs.push(`角Fの大きさ((${angR[2]}°))`);
  } else {
    subs.push(`辺EFの長さ((${cm(ds(Math.round(T.a * kv * 10), 1))}))`);
    subs.push(`辺DEの長さ((${cm(ds(Math.round(T.c * kv * 10), 1))}))`);
    subs.push(`角Eの大きさ((${angR[1]}°))`);
  }
  const draw = (G, x, y, w, h, fs) => {
    const t1 = T.pts, t2 = T.pts.map(p => [p[0] * kv, p[1] * kv]);
    const s = Math.min(fitScale(big ? t2 : t1, w * (big ? 0.6 : 0.5), h, 6), fitScale(big ? t1 : t2, w * 0.4, h, 6));
    const f1 = fitPts(t1, x, y, w * (big ? 0.4 : 0.55), h, 6, s), f2 = fitPts(t2, x + w * (big ? 0.4 : 0.55), y, w * (big ? 0.6 : 0.45), h, 6, s);
    for(const [f, names] of [[f1, N1], [f2, N2]]){ G.poly(f.pts, {fill:SHADE, w:0.4}); const cen = centroid(f.pts); f.pts.forEach((p, i) => vLabel(G, p, cen, names[i], fs)); }
    const P = f1.pts, cen = centroid(P);
    sideLabel(G, P[1], P[2], cm(T.a), cen, fs); sideLabel(G, P[0], P[1], cm(T.c), cen, fs);
    angleMark(G, P[1], P[0], P[2], angR[1] + "°", fs); angleMark(G, P[2], P[0], P[1], angR[2] + "°", fs);
    if(lv === 2){ const Q = f2.pts, c2 = centroid(Q); sideLabel(G, Q[1], Q[2], cm(T.a * kv), c2, fs); }
  };
  const inst = lv === 2 ? "下の三角形DEFは，三角形ABCの拡大図です。つぎの問題に答えましょう。" : `下の三角形DEFは，三角形ABCの${kTxt}です。つぎの長さや角の大きさを答えましょう。`;
  return setItem(92, 46, draw, subs, {inst, lead:"拡大図と縮図"});
}
function genGridScale(lv){
  const k = lv === 2 ? 0.5 : 2, C = 4.5;
  let pts;
  for(;;){
    const n = lv === 0 ? 3 : 4, maxc = lv === 2 ? 8 : 5, step = lv === 2 ? 2 : 1;
    pts = Array.from({length:n}, () => [ri(0, maxc / step) * step, ri(0, (lv === 2 ? 6 : 4) / step) * step]);
    if(new Set(pts.map(p => p.join())).size < n) continue;
    const c = centroid(pts); pts.sort((a, b) => Math.atan2(a[1] - c[1], a[0] - c[0]) - Math.atan2(b[1] - c[1], b[0] - c[0]));
    const an = pts.map((p, i) => angAt(p, pts[(i + n - 1) % n], pts[(i + 1) % n]));
    if(an.some(v => v < 25 || v > 165)) continue;
    const bb = bbox(pts); if(bb.w < 2 || bb.h < 2) continue;
    break;
  }
  const bb = bbox(pts), mnx = Math.min(...pts.map(p => p[0])), mny = Math.min(...pts.map(p => p[1]));
  pts = pts.map(p => [p[0] - mnx, p[1] - mny]);
  const c1 = bb.w + 2, r1 = bb.h + 2, c2 = Math.ceil(bb.w * k) + 2, r2 = Math.ceil(bb.h * k) + 2;
  const BW = Math.max(c2, 8) * C, BH = Math.max(r2, 6) * C;
  const drawFig = (G, x, y, w, h, fs) => {
    drawGridLines(G, x + 2, y + 1, c1, r1, C);
    G.poly(pts.map(p => [x + 2 + (p[0] + 1) * C, y + 1 + (p[1] + 1) * C]), {w:0.5});
  };
  const ans = (G, bx, by, bw, bh, fs) => { G.poly(pts.map(p => [bx + (p[0] * k + 1) * C, by + (p[1] * k + 1) * C]), {w:0.5, color:RED}); };
  const it = drawItem(c1 * C + 4, r1 * C + 2, drawFig, BW, BH, ans,
    {inst:lv === 2 ? `左の図形の${F(1, 2)}の縮図を，右の方眼にかきましょう。` : "左の図形の2倍の拡大図を，右の方眼にかきましょう。", lead:lv === 2 ? "縮図をかく" : "拡大図をかく", sig:JSON.stringify(pts)});
  const d0 = it.draw;
  it.draw = function(G, x, y, W, fs, ans_){
    const side = this.side(W), bx = side ? x + W - BW : x, by = side ? y : y + r1 * C + 2 + 0.8 * fs;
    drawGridLines(G, bx, by, Math.round(BW / C), Math.round(BH / C), C);
    d0.call(this, G, x, y, W, fs, ans_);
  };
  return it;
}
unit6(12, "拡大図と縮図", "11月", "形を拡大したり縮小したりしてかこう", [
  {id:"a", name:"拡大図・縮図の辺と角", gen(lv){ return genSimilar(lv); }},
  {id:"b", name:"縮尺", gen(lv){
    if(lv === 0){ const s = pick([100, 200, 500, 1000]), c = ri(2, 9); return L(`縮尺${F(1, s)}の図で${c}cmの長さは，実際には何mですか。((${c * s / 100}m))`, "つぎの問題に答えましょう。", "縮尺"); }
    if(lv === 1){ const s = pick([10000, 25000, 50000]), c = ri(2, 8); return L(`縮尺1：${s}の地図で${c}cmの長さは，実際には何kmですか。((${ds(c * s / 1000, 2)}km))`, "つぎの問題に答えましょう。", "縮尺"); }
    const s = pick([10000, 25000, 50000]), c = ri(2, 8), km = ds(c * s / 1000, 2);
    return L(`実際の長さが${km}kmの道のりは，縮尺1：${s}の地図では何cmですか。((${c}cm))`, "つぎの問題に答えましょう。", "縮尺");
  }},
  {id:"c", name:"方眼に拡大図・縮図をかく", gen(lv){ return genGridScale(lv); }}
]);

/* ---------- 比例と反比例 ---------- */
const PROP6 = [
  k => ({t:`1mのねだんが${k}円の布を買うときの，長さxmと代金y円`, k}),
  k => ({t:`1分間に${k}Lずつ水を入れるときの，時間x分と水の量yL`, k}),
  k => ({t:`時速${k}kmで走るときの，時間x時間と道のりykm`, k})
];
function drawPropGraph(G, x, y, w, h, fs, k, xmax, ymaxStep){
  const ymax = k * xmax, ox = x + 9, oy = y + h - 6, gw = w - 14, gh = h - 10;
  for(let i = 0; i <= xmax; i++){ const xx = ox + gw * i / xmax; G.line(xx, oy, xx, oy - gh, {w:0.1, color:GRID}); G.text(String(i), xx, oy + 2.4, {size:fs * 0.5, align:"center"}); }
  for(let v = 0; v <= ymax; v += k){ const yy = oy - gh * v / ymax; G.line(ox, yy, ox + gw, yy, {w:0.1, color:GRID}); if(v % (ymaxStep || k) === 0) G.text(String(v), ox - 1.5, yy, {size:fs * 0.5, align:"right"}); }
  G.line(ox, oy, ox + gw + 2, oy, {w:0.4}); G.line(ox, oy, ox, oy - gh - 2, {w:0.4});
  G.text("x", ox + gw + 3, oy, {size:fs * 0.6}); G.text("y", ox, oy - gh - 3.5, {size:fs * 0.6, align:"center"});
  G.line(ox, oy, ox + gw, oy - gh, {w:0.5});
}
unit6(13, "比例と反比例", "12月", "比例と反比例の式やグラフを調べよう", [
  {id:"a", name:"比例の式", gen(lv){
    const k = lv === 2 ? pick(["1.5", "2.5", "0.8", "1.2"]) : String(ri(2, 9) * (lv === 1 ? 10 : 1));
    const S = pick(PROP6)(k), xs = [1, 2, 3, 4, 5, 6];
    const rows = [["x"].concat(xs.map(String)), ["y"].concat(xs.map(v => dmul(v, k)))];
    const v = ri(8, 15), subs = [`yをxの式で表しましょう。((y＝${k}×x))`];
    if(lv >= 1) subs.push(`xが${v}のときのyの値((${dmul(v, k)}))`);
    if(lv === 2){ const w = ri(8, 20); subs.push(`yが${dmul(w, k)}のときのxの値((${w}))`); }
    return tableItem(`${S.t}の関係を表にしました。yはxに比例しています。`, rows, subs, {inst:"つぎの問題に答えましょう。", lead:"比例の式"});
  }},
  {id:"b", name:"比例のグラフ", gen(lv){
    const k = ri(2, 5) * (lv === 2 ? 10 : 1), xmax = 8, a = ri(2, 7), b = ri(1, 7) * k;
    const subs = [`xが${a}のときのyの値((${a * k}))`, `yが${b}のときのxの値((${b / k}))`];
    if(lv >= 1) subs.push(`yをxの式で表しましょう。((y＝${k}×x))`);
    return setItem(70, 58, (G, x, y, w, h, fs) => drawPropGraph(G, x, y, w, h, fs, k, xmax, k * 2), subs,
      {inst:"下のグラフは，yがxに比例する関係を表しています。", lead:"比例のグラフ", sig:"g" + k + a + b});
  }},
  {id:"c", name:"反比例", gen(lv){
    const c = pick(lv === 0 ? [12, 24, 36] : [24, 36, 48, 60, 72]), xs = [1, 2, 3, 4, 6];
    const giv = lv === 0 ? [0, 1] : [ri(1, 3)];
    const rows = [["x"].concat(xs.map(String)), ["y"].concat(xs.map((v, i) => giv.includes(i) ? String(c / v) : `[[${c / v}]]`))];
    const subs = ["表のあいているところに，あてはまる数を書きましょう。", `yをxの式で表しましょう。((y＝${c}÷x))`];
    if(lv === 2){ const x2 = pick([5, 8, 10, 12].filter(v => (c * 10) % v === 0)); subs.push(`xが${x2}のときのyの値((${ds(c * 10 / x2, 1)}))`); }
    return tableItem(`面積が${c}cm^2の長方形の，たての長さxcmと横の長さycmの関係を表にしました。yはxに反比例しています。`, rows, subs, {inst:"つぎの問題に答えましょう。", lead:"反比例"});
  }},
  {id:"d", name:"比例か反比例か", gen(lv){
    const list = [
      ["1mのねだんが80円の布の，長さxmと代金y円", "比例"], ["時速40kmで走る自動車の，走る時間x時間と道のりykm", "比例"], ["正三角形の1辺の長さxcmと，まわりの長さycm", "比例"],
      ["面積が24cm^2の長方形の，たての長さxcmと横の長さycm", "反比例"], ["120kmの道のりを走るときの，時速xkmとかかる時間y時間", "反比例"], ["36Lの水そうに，1分間にxLずつ水を入れるときの，いっぱいになるまでの時間y分", "反比例"],
      ["1000円持っていて，x円使ったときの残りのお金y円", "どちらでもない"], ["正方形の1辺の長さxcmと，面積ycm^2", "どちらでもない"], ["兄は弟より3才年上です。弟の年れいx才と，兄の年れいy才", "どちらでもない"]
    ];
    const S = pick(lv === 0 ? list.filter(v => v[1] !== "どちらでもない") : list);
    return L(`${S[0]}((${S[1]}))`, lv === 0 ? "yはxに比例していますか，反比例していますか。" : "yはxに比例していますか，反比例していますか。どちらでもないときは「どちらでもない」と答えましょう。", "比例か反比例か");
  }},
  {id:"e", name:"比例の性質の利用", gen(lv){
    if(lv === 0){ const n = pick([10, 20]), w = ri(2, 9) * n / 10 * 3, m = n * ri(3, 15); return W_(`同じくぎ${n}本の重さをはかったら，${w}gでした。このくぎ${m}本の重さは何gですか。`, [`${m}÷${n}＝${m / n}`, `${w}×${m / n}＝${w * m / n}`], `${w * m / n}g`, "比例の利用"); }
    if(lv === 1){ const n = 10, t = rdec(8, 15, 1), m = ri(5, 30) * 10; return W_(`画用紙${n}まいの厚さをはかったら，${t}mmでした。この画用紙${m}まいの厚さは何mmですか。`, [`${m}÷${n}＝${m / n}`, `${t}×${m / n}＝${dmul(t, m / n)}`], `${dmul(t, m / n)}mm`, "比例の利用"); }
    const n = 20, w = ri(3, 8) * 20, m = ri(5, 20) * 20, W2 = w * m / n; return W_(`同じ紙${n}まいの重さは${w}gでした。この紙の束の重さをはかったら${W2}gでした。紙は何まいありますか。`, [`${W2}÷${w}＝${W2 / w}`, `${n}×${W2 / w}＝${m}`], `${m}まい`, "比例の利用");
  }}
]);

/* ---------- データの活用 ---------- */
unit6(14, "データの活用", "1月", "データを整理して，問題の解決に生かそう", [
  {id:"a", name:"2つの組の記録をくらべる", gen(lv){
    const A = makeData(9, 15, 35, false), B = makeData(9, 15, 35, false);
    if(!A || !B || A.med === B.med || A.mean === B.mean) return this.gen(lv);
    const subs = [`1組の平均値((${A.mean}m))`, `2組の平均値((${B.mean}m))`];
    if(lv >= 1) subs.push(`1組の中央値((${A.med}m))`, `2組の中央値((${B.med}m))`);
    if(lv === 2) subs.push(`中央値でくらべると，記録がよいのはどちらの組ですか。((${+A.med > +B.med ? "1組" : "2組"}))`);
    return setItem(0, 0, () => {}, subs, {stack:true, inst:"つぎの問題に答えましょう。", lead:"データの活用", sig:A.d.join() + B.d.join(),
      text:`下の記録は，1組と2組の9人ずつのソフトボール投げの記録です。\n1組：${A.d.join("，")}（m）\n2組：${B.d.join("，")}（m）`});
  }}
]);

/* ---------- 算数のまとめ ---------- */
unit6(15, "算数のまとめ", "1月", "小学校の算数をふりかえって，たしかめよう", [
  Object.assign({id:"a", name:"数と計算"}, pool(["6-3.a", "6-3.b", "6-4.a", "6-5.a", "6-8.a", "6-11.b", "5-11.d", "5-11.e", "5-7.b", "5-8.b", "6-2.c"])),
  Object.assign({id:"b", name:"図形"}, pool(["6-1.c", "6-9.a", "6-9.c", "6-10.a", "6-10.b", "6-12.b", "5-14.b", "5-9.a"])),
  Object.assign({id:"c", name:"変化と関係"}, pool(["6-11.c", "6-11.d", "6-13.a", "6-13.c", "6-13.d", "5-10.a", "5-17.a", "5-17.c"])),
  Object.assign({id:"d", name:"データの活用"}, pool(["6-6.a", "6-6.c", "6-7.a", "6-7.b", "5-18.a"]))
]);

const GRADES = {1:null, 2:null, 3:null, 4:null, 5:U5, 6:U6};
