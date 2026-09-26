/* ================= 5年の単元と問題 ================= */
const L = (mk, inst, lead, o) => lineItem(mk, Object.assign({inst, lead}, o || {}));
const W_ = (text, shiki, ans, lead) => wordItem(text, shiki, ans, {inst:"つぎの問題に答えましょう。", lead:lead || "文章題"});
const K_BOX = "[[ ]]にあう数を書きましょう。";
const K_CALC = "つぎの計算をしましょう。";
const K_Q = "つぎの問題に答えましょう。";
const joinN = a => a.join("，");
/* 真分数（約分できない） */
function rfrac(maxD, minD){ for(;;){ const d = ri(minD || 2, maxD), n = ri(1, d - 1); if(gcd(n, d) === 1) return [n, d]; } }
function divisors(n){ const r = []; for(let i = 1; i <= n; i++) if(n % i === 0) r.push(i); return r; }
function mixedStr(n, d){ const g = gcd(n, d); n /= g; d /= g; if(d === 1) return String(n); const w = Math.floor(n / d); return w ? MX(w, n % d, d) : F(n, d); }

const U5 = [];
function unit5(no, name, month, meate, subs){ U5.push({id:"5-" + no, no, name, month, meate, subs}); }

/* 1 小数と整数 */
unit5(1, "小数と整数", "4月", "小数と整数のしくみを調べよう", [
  {id:"a", name:"小数のしくみ", gen(lv){
    if(lv === 0){ const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9); return L(`${a}.${b}${c}は，1を[[${a}]]こ，0.1を[[${b}]]こ，0.01を[[${c}]]こあわせた数です。`, K_BOX, "□にあう数"); }
    if(lv === 1){ const t = ri(1, 9), a = ri(0, 9), b = ri(1, 9), c = ri(0, 9), e = ri(1, 9); return L(`${t}${a}.${b}${c}${e}は，10を[[${t}]]こ，1を[[${a}]]こ，0.1を[[${b}]]こ，0.01を[[${c}]]こ，0.001を[[${e}]]こあわせた数です。`, K_BOX, "□にあう数"); }
    const s = pick([2, 3]), n = ri(101, 9999), u = s === 2 ? "0.01" : "0.001";
    if(n % 10 === 0) return this.gen(lv);
    return R() < 0.5 ? L(`${u}を[[${n}]]こ集めた数は，${ds(n, s)}です。`, K_BOX, "□にあう数") : L(`${u}を${n}こ集めた数は，[[${ds(n, s)}]]です。`, K_BOX, "□にあう数");
  }},
  {id:"b", name:"10倍・100倍・1000倍", gen(lv){
    const m = lv === 0 ? pick([10, 100]) : pick([100, 1000]);
    const x = lv === 0 ? rdec(11, 999, 2) : rdec(1, 99, pick([2, 3]));
    if(lv === 2) return L(`[[${x}]]を${m}倍すると，${dmul(x, m)}になります。`, K_BOX, "□にあう数");
    return L(`${x}を${m}倍した数((${dmul(x, m)}))`, "つぎの数を書きましょう。", "つぎの数");
  }},
  {id:"c", name:"10分の1・100分の1", gen(lv){
    const m = lv === 0 ? pick([10, 100]) : pick([100, 1000]), k = String(m).length - 1;
    const x = lv === 0 ? rdec(11, 9999, pick([0, 1])) : rdec(11, 999, pick([1, 2]));
    const [xi, s] = dparse(x), y = ds(xi, s + k);
    if(lv === 2) return L(`[[${x}]]の${F(1, m)}は，${y}です。`, K_BOX, "□にあう数");
    return L(`${x}の${F(1, m)}の数((${y}))`, "つぎの数を書きましょう。", "つぎの数");
  }}
]);

/* 2 合同な図形 */
unit5(2, "合同な図形", "4月", "合同な図形の対応する辺や角を調べよう", [
  {id:"a", name:"対応するちょう点・辺・角", gen(lv){ return genCongruent(lv, "corr"); }},
  {id:"b", name:"辺の長さと角の大きさ", gen(lv){ return genCongruent(lv, "len"); }}
]);

/* 3 比例 */
const PROP_SIT = [
  k => ({t:`1mのねだんが${k}円のリボンを買います。買う長さ□mと代金○円`, a:"長さ□(m)", b:"代金○(円)", k}),
  k => ({t:`1さつ${k}円のノートを買います。買うさつ数□さつと代金○円`, a:"さつ数□(さつ)", b:"代金○(円)", k}),
  k => ({t:`水そうに，1分間に${k}Lずつ水を入れます。水を入れる時間□分と，たまった水の量○L`, a:"時間□(分)", b:"水の量○(L)", k:k}),
  k => ({t:`たての長さが${k}cmの長方形があります。横の長さ□cmと面積○cm^2`, a:"横の長さ□(cm)", b:"面積○(cm^2)", k})
];
unit5(3, "比例", "5月", "ともなって変わる2つの量の関係を調べよう", [
  {id:"a", name:"比例の表をかんせいさせる", gen(lv){
    const si = pick([0, 1, 2, 3]), k = si === 0 ? pick([60, 80, 120, 150]) : si === 1 ? pick([90, 120, 150, 160]) : si === 2 ? ri(2, 9) : ri(3, 9);
    const S = PROP_SIT[si](k), xs = lv === 2 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    const giv = lv === 0 ? [0, 1] : lv === 1 ? [pick([1, 2])] : [2];
    const rowA = [S.a].concat(xs.map((x, i) => lv === 2 && (i === 4) ? `[[${x}]]` : String(x)));
    const rowB = [S.b].concat(xs.map((x, i) => giv.includes(i) || (lv === 2 && i === 4) ? String(x * k) : `[[${x * k}]]`));
    return tableItem(S.t + "の関係を表にしました。", [rowA, rowB], ["○は□に比例しています。"], {inst:"表のあいているところに，あてはまる数を書きましょう。", lead:"比例の表"});
  }},
  {id:"b", name:"比例しているかどうか", gen(lv){
    const list = [
      {t:"正方形の1辺の長さ□cmと，まわりの長さ○cm", f:x => 4 * x, y:true},
      {t:"1本60円のえんぴつを買うときの，本数□本と代金○円", f:x => 60 * x, y:true},
      {t:"分速80mで歩くときの，歩いた時間□分と道のり○m", f:x => 80 * x, y:true},
      {t:"正方形の1辺の長さ□cmと，面積○cm^2", f:x => x * x, y:false},
      {t:"20cmのろうそくの，もえた長さ□cmと，残りの長さ○cm", f:x => 20 - x, y:false},
      {t:"兄は弟より3才年上です。弟の年れい□才と，兄の年れい○才", f:x => x + 3, y:false},
      {t:"まわりの長さが20cmの長方形の，たての長さ□cmと横の長さ○cm", f:x => 10 - x, y:false}
    ];
    const S = pick(list);
    return tableItem(S.t + "の関係を表にしました。", [["□"].concat([1, 2, 3, 4, 5].map(String)), ["○"].concat([1, 2, 3, 4, 5].map(x => String(S.f(x))))],
      ["○は□に比例していますか。((" + (S.y ? "比例している" : "比例していない") + "))"], {inst:K_Q, lead:"比例しているか"});
  }}
]);

/* 4 平均 */
unit5(4, "平均", "5月", "平均を使って，ならした大きさを考えよう", [
  {id:"a", name:"平均を求める", gen(lv){
    const u = pick(["g", "cm", "点", "こ"]);
    for(;;){
      const n = pick([4, 5]);
      let vals;
      if(lv === 2){ vals = Array.from({length:n}, () => rdec(10, 99, 1)); const sm = vals.reduce((a, v) => dadd(a, v), "0"); const av = ddiv(sm, n); if(av && dparse(av)[1] <= 2) return L(`${joinN(vals.map(v => v + (u === "こ" ? "kg" : u === "点" ? "m" : u)))}の平均((${av}${u === "こ" ? "kg" : u === "点" ? "m" : u}))`, "つぎの平均を求めましょう。", "平均"); continue; }
      const base = u === "g" ? ri(50, 70) : u === "cm" ? ri(120, 150) : u === "点" ? ri(60, 90) : ri(3, 12);
      vals = Array.from({length:n}, () => base + ri(-6, 6)).map(v => Math.max(u === "こ" ? 0 : 1, v));
      const sum = vals.reduce((a, b) => a + b, 0);
      if(lv === 0 && sum % n) continue;
      if(lv === 1 && (sum % n === 0 || (sum * 10) % n)) continue;
      return L(`${joinN(vals.map(v => v + u))}の平均((${ds(sum * 10 / n, 1)}${u}))`, "つぎの平均を求めましょう。", "平均");
    }
  }},
  {id:"b", name:"平均を使った問題", gen(lv){
    if(lv === 0){
      if(R() < 0.5){ const m = ri(52, 64), k = pick([10, 20, 30, 40, 50]); return W_(`1こ平均${m}gのたまごがあります。このたまご${k}こ分の重さは，何gと考えられますか。`, `${m}×${k}＝${m * k}`, `${m * k}g`, "平均"); }
      const m = ri(60, 90), k = ri(3, 6); return W_(`${k}回のテストの平均点は${m}点でした。${k}回のテストの合計は何点ですか。`, `${m}×${k}＝${m * k}`, `${m * k}点`, "平均");
    }
    if(lv === 1){
      for(;;){ const v = [ri(58, 68), ri(58, 68), ri(58, 68)], s = v[0] + v[1] + v[2]; if(s % 3) continue; const av = ds(s / 3, 1);
        return W_(`10歩の長さを3回はかったら，${ds(v[0], 1)}m，${ds(v[1], 1)}m，${ds(v[2], 1)}mでした。この人の歩はばは，約何mですか。`, [`（${ds(v[0], 1)}＋${ds(v[1], 1)}＋${ds(v[2], 1)}）÷3＝${av}`, `${av}÷10＝${ds(s / 3, 2)}`], `約${ds(s / 3, 2)}m`, "平均"); }
    }
    for(;;){ const k = ri(3, 5), m = ri(70, 85), m2 = m + ri(1, 3), x = m2 * (k + 1) - m * k; if(x > 100) continue;
      return W_(`${k}回のテストの平均点は${m}点でした。${k + 1}回目のテストで何点をとれば，${k + 1}回の平均点が${m2}点になりますか。`, [`${m2}×${k + 1}＝${m2 * (k + 1)}`, `${m}×${k}＝${m * k}`, `${m2 * (k + 1)}－${m * k}＝${x}`], `${x}点`, "平均"); }
  }}
]);

/* 5 倍数と約数 */
unit5(5, "倍数と約数", "5月", "倍数や約数の見つけ方を考えよう", [
  {id:"a", name:"ぐう数とき数", gen(lv){
    const hi = lv === 0 ? 30 : lv === 1 ? 200 : 999;
    const set = new Set(); while(set.size < 6) set.add(ri(lv === 2 ? 0 : 1, hi));
    const nums = shuffle([...set]), ev = nums.filter(v => v % 2 === 0).sort((a, b) => a - b), od = nums.filter(v => v % 2).sort((a, b) => a - b);
    if(!ev.length || !od.length) return this.gen(lv);
    return L(`〔 ${joinN(nums)} 〕\nぐう数((${joinN(ev)}))　き数((${joinN(od)}))`, "つぎの数を，ぐう数とき数に分けましょう。", "ぐう数とき数");
  }},
  {id:"b", name:"倍数", gen(lv){
    const a = ri(3, 9);
    if(lv === 0) return L(`${a}の倍数を，小さい順に3つ((${joinN([a, 2 * a, 3 * a])}))`, K_Q, "倍数");
    if(lv === 1){ const lo = ri(2, 5) * 10, hi = lo + 30, r = []; for(let v = lo; v <= hi; v++) if(v % a === 0) r.push(v); return L(`${lo}から${hi}までの整数で，${a}の倍数を全部((${joinN(r)}))`, K_Q, "倍数"); }
    const N = ri(5, 20) * 10; return L(`1から${N}までの整数で，${a}の倍数は何こありますか。((${Math.floor(N / a)}こ))`, K_Q, "倍数");
  }},
  {id:"c", name:"公倍数・最小公倍数", gen(lv){
    let a, b; do{ a = ri(2, 12); b = ri(2, 15); } while(a === b || a % b === 0 || b % a === 0 || lcm(a, b) > 60);
    if(lv === 0) return L(`（${a}，${b}）の最小公倍数((${lcm(a, b)}))`, K_Q, "最小公倍数");
    if(lv === 1){ const l = lcm(a, b); return L(`（${a}，${b}）の公倍数を，小さい順に3つ((${joinN([l, 2 * l, 3 * l])}))`, K_Q, "公倍数"); }
    let c; do{ c = ri(2, 10); } while(c === a || c === b || lcm(lcm(a, b), c) > 120);
    return L(`（${a}，${b}，${c}）の最小公倍数((${lcm(lcm(a, b), c)}))`, K_Q, "最小公倍数");
  }},
  {id:"d", name:"約数", gen(lv){
    let n; do{ n = lv === 0 ? ri(8, 30) : lv === 1 ? ri(24, 60) : ri(48, 100); } while(divisors(n).length < 4);
    return L(`${n}の約数を全部((${joinN(divisors(n))}))`, K_Q, "約数");
  }},
  {id:"e", name:"公約数・最大公約数", gen(lv){
    let a, b; do{ const g = ri(2, 12); a = g * ri(1, 6); b = g * ri(1, 7); } while(a === b || gcd(a, b) < 2 || a < 8 || b < 8 || a > 96 || b > 96);
    if(lv === 0) return L(`（${a}，${b}）の最大公約数((${gcd(a, b)}))`, K_Q, "最大公約数");
    if(lv === 1) return L(`（${a}，${b}）の公約数を全部((${joinN(divisors(gcd(a, b)))}))`, K_Q, "公約数");
    const g = gcd(a, b), c = g * ri(2, 8); if(c === a || c === b) return this.gen(lv);
    return L(`（${a}，${b}，${c}）の最大公約数((${gcd(g, c)}))`, K_Q, "最大公約数");
  }}
]);

/* 6 単位量あたりの大きさ（１） */
unit5(6, "単位量あたりの大きさ（１）", "6月", "こみぐあいなどを，単位量あたりの大きさで比べよう", [
  {id:"a", name:"こみぐあい", gen(lv){
    const areas = [8, 10, 16, 20, 25, 40, 50];
    for(;;){
      const a1 = pick(areas), a2 = pick(areas), p1 = ri(5, 30), p2 = ri(5, 30);
      if(a1 === a2) continue;
      if(lv === 2){
        const ok = [2, 4, 5, 8, 10, 16, 20, 25]; if(!ok.includes(p1) || !ok.includes(p2)) continue;
        const d1 = ddiv(a1, p1), d2 = ddiv(a2, p2); if(!d1 || !d2 || d1 === d2) continue;
        return W_(`Aの部屋は${a1}m^2に${p1}人，Bの部屋は${a2}m^2に${p2}人います。1人あたりの面積で比べると，どちらの部屋のほうがこんでいますか。`, [`A　${a1}÷${p1}＝${d1}`, `B　${a2}÷${p2}＝${d2}`], (+d1 < +d2 ? "A" : "B") + "の部屋", "こみぐあい");
      }
      const d1 = ddiv(p1, a1), d2 = ddiv(p2, a2); if(!d1 || !d2 || d1 === d2 || dparse(d1)[1] > 3 || dparse(d2)[1] > 3) continue;
      if(lv === 0) return W_(`Aの部屋は${a1}m^2に${p1}人，Bの部屋は${a2}m^2に${p2}人います。1m^2あたりの人数で比べると，どちらの部屋のほうがこんでいますか。`, [`A　${p1}÷${a1}＝${d1}`, `B　${p2}÷${a2}＝${d2}`], (+d1 > +d2 ? "A" : "B") + "の部屋", "こみぐあい");
      return W_(`Aの畑は${a1}m^2で${p1}kgのいもがとれ，Bの畑は${a2}m^2で${p2}kgのいもがとれました。1m^2あたりでよくとれたのは，どちらの畑ですか。`, [`A　${p1}÷${a1}＝${d1}`, `B　${p2}÷${a2}＝${d2}`], (+d1 > +d2 ? "A" : "B") + "の畑", "こみぐあい");
    }
  }},
  {id:"b", name:"人口みつ度", gen(lv){
    const a = pick([20, 25, 40, 50, 80, 125]);
    if(lv === 0){ const d = ri(12, 90) * 10, pop = d * a; return W_(`面積が${a}km^2で，人口が${pop}人の町があります。この町の人口みつ度を求めましょう。`, `${pop}÷${a}＝${d}`, `${d}人`, "人口みつ度"); }
    if(lv === 1){ const ar = ri(12, 48), pop = ri(4000, 30000); const q = pop / ar, rd = Math.round(q); if(Number.isInteger(q)) return this.gen(lv);
      return W_(`面積が${ar}km^2で，人口が${pop}人の市があります。この市の人口みつ度を，四しゃ五入して整数で求めましょう。`, `${pop}÷${ar}＝${q.toFixed(2).replace(/0+$/, "")}…`, `約${rd}人`, "人口みつ度"); }
    const a2 = pick([20, 25, 40, 50].filter(v => v !== a)), d1 = ri(20, 80) * 10, d2 = d1 + pick([-1, 1]) * ri(2, 8) * 10;
    return W_(`A町は面積が${a}km^2で人口が${d1 * a}人，B町は面積が${a2}km^2で人口が${d2 * a2}人です。人口みつ度が高いのは，どちらの町ですか。`, [`A　${d1 * a}÷${a}＝${d1}`, `B　${d2 * a2}÷${a2}＝${d2}`], d1 > d2 ? "A町" : "B町", "人口みつ度");
  }},
  {id:"c", name:"単位量あたりの大きさを使う", gen(lv){
    const k = rdec(2, 9, 1), a = ri(4, 30);
    if(lv === 0) return W_(`1m^2あたり${k}kgのひ料をまきます。${a}m^2の畑にまくには，ひ料は何kgいりますか。`, `${k}×${a}＝${dmul(k, a)}`, `${dmul(k, a)}kg`, "単位量あたり");
    if(lv === 1) return W_(`1m^2あたり${k}kgのひ料をまきます。${dmul(k, a)}kgのひ料では，何m^2の畑にまけますか。`, `${dmul(k, a)}÷${k}＝${a}`, `${a}m^2`, "単位量あたり");
    for(;;){ const n1 = ri(3, 8), n2 = ri(3, 8), u1 = ri(6, 15) * 10, u2 = ri(6, 15) * 10; if(n1 === n2 || u1 === u2) continue;
      return W_(`${n1}本で${n1 * u1}円のえんぴつAと，${n2}本で${n2 * u2}円のえんぴつBがあります。1本あたりのねだんが安いのは，どちらですか。`, [`A　${n1 * u1}÷${n1}＝${u1}`, `B　${n2 * u2}÷${n2}＝${u2}`], u1 < u2 ? "えんぴつA" : "えんぴつB", "単位量あたり"); }
  }}
]);

/* 7 小数のかけ算 */
unit5(7, "小数のかけ算", "6月", "小数をかける計算のしかたを考えよう", [
  {id:"a", name:"整数×小数（筆算）", gen(lv){
    const a = String(lv === 1 ? ri(102, 999) : ri(12, 98)), b = lv === 2 ? rdec(11, 399, 2) : rdec(11, 99, 1);
    return hissanMulItem(a, b);
  }},
  {id:"b", name:"小数×小数（筆算）", gen(lv){
    if(lv === 0) return hissanMulItem(rdec(11, 99, 1), rdec(11, 99, 1));
    if(lv === 1) return hissanMulItem(rdec(101, 999, 2), rdec(11, 99, 1));
    return R() < 0.5 ? hissanMulItem(rdec(11, 99, 2), rdec(1, 9, 1)) : hissanMulItem(pick(["2.5", "1.5", "3.5", "4.5", "7.5"]), pick(["3.6", "2.4", "4.8", "1.6", "5.2"]));
  }},
  {id:"c", name:"小数のかけ算（暗算）", gen(lv){
    let a, b;
    if(lv === 0){ a = "0." + ri(2, 9); b = String(ri(2, 9)); }
    else if(lv === 1){ a = "0." + ri(2, 9); b = "0." + ri(2, 9); }
    else { a = pick(["0.0" + ri(2, 9), "1." + ri(1, 9), "0." + ri(2, 9)]); b = pick(["0." + ri(2, 9), String(ri(2, 9) * 10), "0.0" + ri(2, 9)]); }
    return L(`${a}×${b}＝<<${dmul(a, b)}>>`, K_CALC, "計算");
  }},
  {id:"d", name:"計算のきまり", gen(lv){
    if(lv === 0){ const [p, q] = pick([["2.5", "4"], ["0.25", "4"], ["1.25", "8"], ["0.5", "2"]]); const x = rdec(11, 99, 1); return L(`${p}×${x}×${q}＝<<${dmul(dmul(p, q), x)}>>`, "くふうして計算しましょう。", "くふうして"); }
    if(lv === 1){ const x = rdec(11, 99, 1), a = rdec(11, 89, 1), b = dadd("10", a, -1); return L(`${x}×${a}＋${x}×${b}＝<<${dmul(x, 10)}>>`, "くふうして計算しましょう。", "くふうして"); }
    const x = String(ri(12, 48)), c = pick(["9.9", "10.1", "4.9", "5.1"]); return L(`${x}×${c}＝<<${dmul(x, c)}>>`, "くふうして計算しましょう。", "くふうして");
  }},
  {id:"e", name:"文章題", gen(lv){
    if(lv === 0){ for(;;){ const p = pick([80, 120, 150, 250, 60, 90]), x = rdec(12, 49, 1), c = dmul(p, x); if(c.includes(".")) continue; return W_(`1mのねだんが${p}円のリボンを${x}m買います。代金は何円ですか。`, `${p}×${x}＝${c}`, `${c}円`, "かけ算"); } }
    if(lv === 1){ if(R() < 0.5){ const k = rdec(11, 29, 1), x = rdec(12, 49, 1); return W_(`1dLで${k}m^2のかべをぬれるペンキがあります。このペンキ${x}dLでは，何m^2ぬれますか。`, `${k}×${x}＝${dmul(k, x)}`, `${dmul(k, x)}m^2`, "かけ算"); }
      const a = rdec(12, 49, 1), b = rdec(12, 49, 1); return W_(`たて${a}m，横${b}mの長方形の花だんがあります。この花だんの面積は何m^2ですか。`, `${a}×${b}＝${dmul(a, b)}`, `${dmul(a, b)}m^2`, "かけ算"); }
    const w = rdec(11, 39, 1), x = "0." + ri(2, 9); return W_(`1mの重さが${w}kgのぼうがあります。このぼう${x}mの重さは何kgですか。`, `${w}×${x}＝${dmul(w, x)}`, `${dmul(w, x)}kg`, "かけ算");
  }}
]);

/* 8 小数のわり算 */
function divPair(dLo, dHi, dS, qLo, qHi, qS, cond){
  for(let i = 0; i < 500; i++){
    const d = rdec(dLo, dHi, dS), q = rdec(qLo, qHi, qS), n = dmul(q, d);
    if(!cond || cond(n, d, q)) return {n, d, q};
  }
  return {n:"7.2", d:"2.4", q:"3"};
}
unit5(8, "小数のわり算", "7月", "小数でわる計算のしかたを考えよう", [
  {id:"a", name:"整数÷小数（筆算）", gen(lv){
    const P = lv === 0 ? divPair(11, 49, 1, 2, 9, 0, n => !n.includes(".")) : lv === 1 ? divPair(11, 49, 1, 12, 60, 0, n => !n.includes(".")) : divPair(11, 49, 2, 4, 90, 0, n => !n.includes(".") && n.length <= 3);
    return hissanDivItem(P.n, P.d, "exact");
  }},
  {id:"b", name:"小数÷小数（筆算）", gen(lv){
    const P = lv === 0 ? divPair(11, 49, 1, 2, 9, 0) : lv === 1 ? divPair(11, 49, 1, 12, 99, 1, n => dparse(n)[1] <= 2) : divPair(2, 9, 1, 12, 60, 0);
    return hissanDivItem(P.n, P.d, "exact");
  }},
  {id:"c", name:"わり進むわり算", gen(lv){
    const P = divPair(2, lv === 0 ? 9 : 49, 1, 11, 99, lv === 2 ? 2 : 1, (n, d, q) => dparse(n)[1] <= dparse(d)[1] && dparse(q)[1] > 0 && dparse(n)[0] > 0);
    return hissanDivItem(P.n, P.d, "exact");
  }},
  {id:"d", name:"商をがい数で求める", gen(lv){
    for(;;){
      const d = rdec(11, 89, 1), n = rdec(11, 999, 1), r = lv === 2 ? 2 : 1;
      const S = divSolve(n, d, "exact");
      if(S.qDec <= r + 1 && S.rem === 0) continue;
      if(dparse(n)[0] < dparse(d)[0]) continue;
      return hissanDivItem(n, d, "round", r);
    }
  }},
  {id:"e", name:"あまりのあるわり算", gen(lv){
    for(;;){
      const d = lv === 2 ? "0." + ri(3, 9) : rdec(11, 49, 1), n = rdec(lv === 2 ? 21 : 51, lv === 0 ? 199 : 499, 1);
      const S = divSolve(n, d, "rem"); if(S.rem === 0 || S.qInt < 2 || S.qInt > 60) continue;
      return hissanDivItem(n, d, "rem");
    }
  }},
  {id:"f", name:"文章題", gen(lv){
    if(lv === 0){ for(;;){ const x = rdec(12, 49, 1), u = pick([60, 80, 120, 150, 250]), p = dmul(u, x); if(p.includes(".")) continue; return W_(`${x}mで${p}円のリボンがあります。このリボン1mのねだんは何円ですか。`, `${p}÷${x}＝${u}`, `${u}円`, "わり算"); } }
    if(lv === 1){ const k = rdec(2, 9, 1), n = ri(6, 30), w = dmul(k, n); return W_(`${w}kgの米を，1ふくろに${k}kgずつ入れます。何ふくろできますか。`, `${w}÷${k}＝${n}`, `${n}ふくろ`, "わり算"); }
    for(;;){ const k = "0." + ri(2, 4), v = rdec(21, 79, 1), S = divSolve(v, k, "rem"); if(!S.rem) continue; const rem = ds(S.rem, 1);
      return W_(`${v}Lのジュースを，${k}Lずつコップに分けます。何はいできて，何Lあまりますか。`, `${v}÷${k}＝${S.qInt}あまり${rem}`, `${S.qInt}はいできて，${rem}Lあまる`, "わり算"); }
  }}
]);

/* ○倍の計算 小数倍 */
U5.push({id:"5-x1", no:"○", name:"○倍の計算（小数倍）", month:"7月", meate:"何倍かを小数で表して考えよう", subs:[
  {id:"a", name:"何倍かを求める", gen(lv){
    for(;;){
      const a = lv === 2 ? rdec(12, 60, 1) : String(ri(2, 12)), b = lv === 2 ? rdec(12, 90, 1) : String(ri(2, 30));
      if(a === b) continue; if(lv === 0 && +b < +a) continue; if(lv === 1 && +b > +a) continue;
      const q = ddiv(b, a); if(!q || dparse(q)[1] > 2 || !q.includes(".")) continue;
      return W_(`赤いテープの長さは${a}m，青いテープの長さは${b}mです。青いテープの長さは，赤いテープの長さの何倍ですか。`, `${b}÷${a}＝${q}`, `${q}倍`, "何倍");
    }
  }},
  {id:"b", name:"もとにする量・比べられる量", gen(lv){
    const k = lv === 2 ? "0." + ri(2, 8) : rdec(12, 39, 1), a = String(ri(2, 20)), b = dmul(a, k);
    if(lv === 0) return W_(`Aのテープは${a}mです。Bのテープの長さは，Aのテープの長さの${k}倍です。Bのテープは何mですか。`, `${a}×${k}＝${b}`, `${b}m`, "何倍");
    return W_(`Bのテープは${b}mで，これはAのテープの長さの${k}倍です。Aのテープは何mですか。`, `${b}÷${k}＝${a}`, `${a}m`, "何倍");
  }}
]});

/* 9 図形の角 */
const POLY = ["", "", "", "三角形", "四角形", "五角形", "六角形", "七角形", "八角形", "九角形", "十角形", "", "十二角形"];
unit5(9, "図形の角", "9月", "三角形や四角形の角の大きさの和を使って考えよう", [
  {id:"a", name:"三角形の角", gen(lv){ return genTriAngle(lv); }},
  {id:"b", name:"四角形の角", gen(lv){ return genQuadAngle(lv); }},
  {id:"c", name:"多角形の角の大きさの和", gen(lv){
    if(lv === 2){ const n = pick([5, 6, 8, 9, 10, 12]); return L(`正${POLY[n]}の1つの角の大きさ((${180 * (n - 2) / n}°))`, K_Q, "多角形の角"); }
    const n = lv === 0 ? ri(5, 8) : ri(6, 10); return L(`${POLY[n]}の角の大きさの和((${180 * (n - 2)}°))`, K_Q, "多角形の角");
  }}
]);

/* 10 単位量あたりの大きさ（２） */
unit5(10, "単位量あたりの大きさ（２）", "9月", "速さの比べ方や表し方を考えよう", [
  {id:"a", name:"速さを求める", gen(lv){
    if(lv === 0){ const v = ri(4, 9) * 10, t = ri(2, 5); return W_(`${v * t}kmを${t}時間で走る自動車があります。この自動車の時速を求めましょう。`, `${v * t}÷${t}＝${v}`, `時速${v}km`, "速さ"); }
    if(lv === 1){ if(R() < 0.5){ const v = ri(6, 9) * 10, t = ri(10, 25); return W_(`${v * t}mを${t}分で歩く人がいます。この人の分速を求めましょう。`, `${v * t}÷${t}＝${v}`, `分速${v}m`, "速さ"); }
      const v = ri(5, 9), t = ri(8, 20); return W_(`${v * t}mを${t}秒で走る人がいます。この人の秒速を求めましょう。`, `${v * t}÷${t}＝${v}`, `秒速${v}m`, "速さ"); }
    for(;;){ const v1 = ri(5, 8), v2 = ri(5, 8), t1 = ri(10, 20), t2 = ri(10, 20); if(v1 === v2) continue;
      return W_(`Aさんは${v1 * t1}mを${t1}秒で，Bさんは${v2 * t2}mを${t2}秒で走りました。速いのはどちらですか。`, [`A　${v1 * t1}÷${t1}＝${v1}`, `B　${v2 * t2}÷${t2}＝${v2}`], v1 > v2 ? "Aさん" : "Bさん", "速さ"); }
  }},
  {id:"b", name:"道のりを求める", gen(lv){
    if(lv === 0){ const v = ri(4, 9) * 10, t = ri(2, 6); return W_(`時速${v}kmで走る自動車が，${t}時間に進む道のりは何kmですか。`, `${v}×${t}＝${v * t}`, `${v * t}km`, "道のり"); }
    if(lv === 1){ const v = ri(4, 9) * 10, t = pick(["1.5", "2.5", "3.5", "0.5"]); return W_(`時速${v}kmで走る自動車が，${t}時間に進む道のりは何kmですか。`, `${v}×${t}＝${dmul(v, t)}`, `${dmul(v, t)}km`, "道のり"); }
    const v = pick([30, 36, 48, 54, 60, 72]), m = pick([10, 20, 30, 40, 50]); const km = v * m / 60;
    return W_(`時速${v}kmで走る自動車が，${m}分間に進む道のりは何kmですか。`, [`${m}分＝${F(m / gcd(m, 60), 60 / gcd(m, 60))}時間`, `${v}×${F(m / gcd(m, 60), 60 / gcd(m, 60))}＝${km}`], `${km}km`, "道のり");
  }},
  {id:"c", name:"時間を求める", gen(lv){
    if(lv === 0){ const v = ri(4, 9) * 10, t = ri(2, 6); return W_(`${v * t}kmの道のりを，時速${v}kmで走ると，何時間かかりますか。`, `${v * t}÷${v}＝${t}`, `${t}時間`, "時間"); }
    if(lv === 1){ const v = ri(4, 8) * 10, t = pick(["1.5", "2.5", "0.5", "3.5"]); return W_(`${dmul(v, t)}kmの道のりを，時速${v}kmで走ると，何時間かかりますか。`, `${dmul(v, t)}÷${v}＝${t}`, `${t}時間`, "時間"); }
    const v = ri(6, 9) * 10, t = ri(12, 30); return W_(`家から駅まで${v * t}mあります。分速${v}mで歩くと，何分かかりますか。`, `${v * t}÷${v}＝${t}`, `${t}分`, "時間");
  }},
  {id:"d", name:"時速・分速・秒速", gen(lv){
    if(lv === 0){ if(R() < 0.5){ const s = ri(3, 15); return L(`秒速${s}m＝分速[[${s * 60}]]m`, K_BOX, "□にあう数"); } const m = ri(2, 9) * 60; return L(`分速${m}m＝秒速[[${m / 60}]]m`, K_BOX, "□にあう数"); }
    if(lv === 1){ if(R() < 0.5){ const m = ri(4, 20) * 50; return L(`分速${m}m＝時速[[${ds(m * 60 / 100, 1)}]]km`, K_BOX, "□にあう数"); } const v = ri(2, 12) * 6; return L(`時速${v}km＝分速[[${v * 1000 / 60}]]m`, K_BOX, "□にあう数"); }
    if(R() < 0.5){ const s = ri(5, 25); return L(`秒速${s}m＝時速[[${dmul(s, "3.6")}]]km`, K_BOX, "□にあう数"); }
    const v = ri(1, 20) * 18; return L(`時速${v}km＝秒速[[${v / 3.6}]]m`, K_BOX, "□にあう数");
  }}
]);

/* 11 分数のたし算とひき算 */
function fracAddGen(lv, op){
  for(let t = 0; t < 400; t++){
    const [a, b] = rfrac(lv === 0 ? 8 : 12), [c, d] = rfrac(lv === 0 ? 8 : 12);
    if(b === d) continue;
    const L2 = lcm(b, d); if(L2 > 60) continue;
    const num = op > 0 ? a * L2 / b + c * L2 / d : a * L2 / b - c * L2 / d;
    if(num <= 0) continue;
    const g = gcd(num, L2);
    if(lv === 0 && (g > 1 || num >= L2)) continue;
    if(lv === 1 && (g === 1 || num >= L2)) continue;
    if(lv === 2 && op > 0 && num <= L2) continue;
    if(lv === 2 && op < 0 && g === 1) continue;
    return L(`${F(a, b)}${op > 0 ? "＋" : "－"}${F(c, d)}＝<<${fAns(num, L2)}>>`, K_CALC, "計算");
  }
  return L(`${F(1, 2)}＋${F(1, 3)}＝<<${F(5, 6)}>>`, K_CALC, "計算");
}
unit5(11, "分数のたし算とひき算", "10月", "分母のちがう分数のたし算やひき算のしかたを考えよう", [
  {id:"a", name:"約分", gen(lv){
    const [n, d] = rfrac(lv === 0 ? 7 : 12), k = lv === 0 ? ri(2, 5) : ri(4, 12);
    if(lv === 2){ const w = ri(1, 4); return L(`${MX(w, n * k, d * k)}＝<<${MX(w, n, d)}>>`, "約分しましょう。", "約分"); }
    return L(`${F(n * k, d * k)}＝<<${F(n, d)}>>`, "約分しましょう。", "約分");
  }},
  {id:"b", name:"通分", gen(lv){
    for(;;){
      const fr = [rfrac(lv === 0 ? 8 : 12), rfrac(lv === 0 ? 8 : 12)].concat(lv === 2 ? [rfrac(8)] : []);
      const ds_ = fr.map(f => f[1]); if(new Set(ds_).size < fr.length) continue;
      const Lc = ds_.reduce(lcm); if(Lc > (lv === 2 ? 48 : 40)) continue;
      if(lv === 1 && Lc === ds_.reduce((p, q) => p * q, 1)) continue;
      const q = "（" + fr.map(f => F(f[0], f[1])).join("，") + "）", a = "（" + fr.map(f => F(f[0] * Lc / f[1], Lc)).join("，") + "）";
      return L(`${q}→<<${a}>>`, "（　）の中の分数を通分しましょう。", "通分");
    }
  }},
  {id:"c", name:"分数の大小", gen(lv){
    for(;;){
      const [a, b] = rfrac(12), [c, d] = rfrac(12); if(b === d || a * d === b * c) continue;
      const sg = a * d > b * c ? "＞" : "＜";
      if(lv === 2){ const w = ri(1, 3); return L(`${MX(w, a, b)}[[${sg}]]${MX(w, c, d)}`, "[[ ]]に不等号を書きましょう。", "不等号"); }
      if(lv === 0 && lcm(b, d) > 30) continue;
      return L(`${F(a, b)}[[${sg}]]${F(c, d)}`, "[[ ]]に不等号を書きましょう。", "不等号");
    }
  }},
  {id:"d", name:"たし算", gen(lv){ return fracAddGen(lv, 1); }},
  {id:"e", name:"ひき算", gen(lv){ return fracAddGen(lv, -1); }},
  {id:"f", name:"帯分数のたし算・ひき算", gen(lv){
    for(let t = 0; t < 400; t++){
      const op = R() < 0.5 ? 1 : -1, [a, b] = rfrac(10), [c, d] = rfrac(10); if(b === d) continue;
      const Lc = lcm(b, d); if(Lc > 40) continue;
      const w1 = ri(1, 4), w2 = ri(1, 3);
      const x = w1 * Lc + a * Lc / b, y = w2 * Lc + c * Lc / d, r = op > 0 ? x + y : x - y;
      if(r <= Lc) continue;
      const fx = a * Lc / b, fy = c * Lc / d, carry = op > 0 ? fx + fy >= Lc : fx < fy;
      if(lv === 0 && (carry || gcd(r, Lc) > 1)) continue;
      if(lv === 1 && !carry) continue;
      if(lv === 2 && (!carry || gcd(r % Lc, Lc) === 1)) continue;
      return L(`${MX(w1, a, b)}${op > 0 ? "＋" : "－"}${MX(w2, c, d)}＝<<${mixedStr(r, Lc)}>>`, K_CALC, "計算");
    }
    return L(`${MX(1, 1, 2)}＋${MX(1, 1, 3)}＝<<${MX(2, 5, 6)}>>`, K_CALC, "計算");
  }},
  {id:"g", name:"3つの分数の計算", gen(lv){
    for(let t = 0; t < 400; t++){
      const fr = [rfrac(lv === 0 ? 6 : 10), rfrac(lv === 0 ? 6 : 10), rfrac(lv === 0 ? 6 : 10)];
      const Lc = fr.map(f => f[1]).reduce(lcm); if(Lc > (lv === 2 ? 60 : 36)) continue;
      const ops = lv === 0 ? [1, 1] : [pick([1, -1]), pick([1, -1])];
      const v = fr.map(f => f[0] * Lc / f[1]); const r = v[0] + ops[0] * v[1] + ops[1] * v[2];
      if(r <= 0) continue;
      const s = F(...fr[0]) + (ops[0] > 0 ? "＋" : "－") + F(...fr[1]) + (ops[1] > 0 ? "＋" : "－") + F(...fr[2]);
      return L(`${s}＝<<${fAns(r, Lc)}>>`, K_CALC, "計算");
    }
    return L(`${F(1, 2)}＋${F(1, 3)}－${F(1, 4)}＝<<${F(7, 12)}>>`, K_CALC, "計算");
  }}
]);

/* 12 分数と小数・整数 */
unit5(12, "分数と小数・整数", "10月", "分数と小数・整数の関係を調べよう", [
  {id:"a", name:"わり算の商を分数で", gen(lv){
    for(;;){ const a = ri(1, 15), b = ri(2, 12); if(a === b) continue;
      if(lv === 0 && (a > b || gcd(a, b) > 1)) continue; if(lv === 1 && (a < b || gcd(a, b) > 1)) continue; if(lv === 2 && gcd(a, b) === 1) continue;
      if(a % b === 0) continue;
      return L(`${a}÷${b}＝<<${fAns(a, b)}>>`, "わり算の商を分数で表しましょう。", "商を分数で"); }
  }},
  {id:"b", name:"分数を小数で", gen(lv){
    const d = pick([2, 4, 5, 8, 10, 20, 25]); let n; do{ n = ri(1, d - 1); } while(gcd(n, d) > 1 && d !== 10);
    if(gcd(n, d) > 1) return this.gen(lv);
    const dec = ddiv(n, d);
    if(lv === 2){ const w = ri(1, 3); return L(`${MX(w, n, d)}＝<<${dadd(w, dec)}>>`, "分数を小数で表しましょう。", "小数で"); }
    if(lv === 0 && ![2, 4, 5, 10].includes(d)) return this.gen(lv);
    return L(`${F(n, d)}＝<<${dec}>>`, "分数を小数で表しましょう。", "小数で");
  }},
  {id:"c", name:"小数・整数を分数で", gen(lv){
    if(lv === 0){ const x = ri(1, 9); return L(`0.${x}＝<<${F(x / gcd(x, 10), 10 / gcd(x, 10))}>>`, "小数や整数を分数で表しましょう。", "分数で"); }
    if(lv === 1){ const x = pick([ri(11, 99), ri(101, 299)]); if(x % 10 === 0) return this.gen(lv); return L(`${ds(x, 2)}＝<<${fAns(x, 100)}>>`, "小数や整数を分数で表しましょう。", "分数で"); }
    const n = ri(2, 9), d = ri(2, 9); return L(`${n}を，分母が${d}の分数で表しましょう。((${F(n * d, d)}))`, "小数や整数を分数で表しましょう。", "分数で");
  }},
  {id:"d", name:"分数倍", gen(lv){
    for(;;){ const a = ri(2, 12), b = ri(2, 15); if(a === b || b % a === 0 || (b * 10) % a === 0 && lv === 0) continue;
      if(lv === 1 && b > a) continue;
      return W_(`赤いリボンは${a}m，白いリボンは${b}mです。白いリボンの長さは，赤いリボンの長さの何倍ですか。分数で答えましょう。`, `${b}÷${a}＝${fAns(b, a)}`, `${fAns(b, a)}倍`, "分数倍"); }
  }},
  {id:"e", name:"分数と小数の大小", gen(lv){
    for(;;){ const [n, d] = rfrac(9, 3), x = "0." + ri(1, 9); const xv = +x; if(Math.abs(xv - n / d) < 1e-9) continue;
      const sg = xv > n / d ? "＞" : "＜";
      if(lv === 2){ const w = ri(1, 2); return L(`${w}${x.slice(1)}[[${sg}]]${MX(w, n, d)}`, "[[ ]]に不等号を書きましょう。", "不等号"); }
      return R() < 0.5 ? L(`${x}[[${sg}]]${F(n, d)}`, "[[ ]]に不等号を書きましょう。", "不等号") : L(`${F(n, d)}[[${sg === "＞" ? "＜" : "＞"}]]${x}`, "[[ ]]に不等号を書きましょう。", "不等号"); }
  }}
]);

/* 13 割合（１） */
unit5(13, "割合（１）", "11月", "わり合の意味を知って，わり合を求めよう", [
  {id:"a", name:"わり合を求める", gen(lv){
    for(;;){
      if(lv === 0){ const b = pick([20, 25, 40, 50]), a = ri(5, b - 1), q = ddiv(a, b); return W_(`定員が${b}人のバスに，${a}人が乗っています。定員をもとにした，乗っている人数のわり合を求めましょう。`, `${a}÷${b}＝${q}`, q, "わり合"); }
      if(lv === 1){ const b = pick([10, 20, 25, 50]), a = ri(2, b - 1), q = ddiv(a, b); return W_(`シュートを${b}回して，${a}回入りました。入ったわり合を求めましょう。`, `${a}÷${b}＝${q}`, q, "わり合"); }
      const b = pick([40, 50, 80, 100]), a = b + ri(2, 30), q = ddiv(a, b); if(!q || dparse(q)[1] > 3) continue;
      return W_(`定員が${b}人の電車に，${a}人が乗っています。定員をもとにした，乗っている人数のわり合を求めましょう。`, `${a}÷${b}＝${q}`, q, "わり合");
    }
  }},
  {id:"b", name:"百分率と歩合", gen(lv){
    const t = ri(0, 1);
    if(lv === 0){ const p = ri(1, 99); return t ? L(`${ds(p, 2)}＝[[${p}]]%`, K_BOX, "□にあう数") : L(`${p}%＝[[${ds(p, 2)}]]`, K_BOX, "□にあう数"); }
    if(lv === 1){ if(t){ const w = ri(1, 9), b = ri(1, 9); return L(`0.${w}${b}＝[[${w}]]わり[[${b}]]分`, K_BOX, "□にあう数"); } const p = ri(101, 250); return L(`${ds(p, 2)}＝[[${p}]]%`, K_BOX, "□にあう数"); }
    const w = ri(1, 9), b = ri(0, 9), r = ri(1, 9);
    return t ? L(`0.${w}${b}${r}＝[[${w}]]わり[[${b}]]分[[${r}]]りん`, K_BOX, "□にあう数") : L(`${w}わり${b}分${r}りん＝[[${ds(w * 100 + b * 10 + r, 3)}]]`, K_BOX, "□にあう数");
  }},
  {id:"c", name:"百分率の文章題", gen(lv){
    const b = pick([20, 25, 40, 50]), a = ri(3, b - 2), p = a * 100 / b;
    if(lv === 2){ const q = ddiv(a, b); const [qi, s] = dparse(q); if(s > 3) return this.gen(lv);
      const v = Math.round(+q * 1000), w = Math.floor(v / 100), bu = Math.floor(v / 10) % 10, ri_ = v % 10;
      const ansW = w + "わり" + (bu || ri_ ? bu + "分" : "") + (ri_ ? ri_ + "りん" : "");
      return W_(`${b}人のクラスで，${a}人が犬をかっています。犬をかっている人のわり合を，歩合で表しましょう。`, `${a}÷${b}＝${q}`, ansW, "歩合");
    }
    return W_(`${b}人のクラスで，${a}人が犬をかっています。犬をかっている人は，クラス全体の何%ですか。`, [`${a}÷${b}＝${ddiv(a, b)}`, `${ddiv(a, b)}→${ds(p * 10, 1)}%`], `${ds(p * 10, 1)}%`, "百分率");
  }}
]);

/* 14 図形の面積 */
unit5(14, "図形の面積", "11月", "いろいろな図形の面積の求め方を考えよう", [
  {id:"a", name:"平行四辺形", gen(lv){ return genArea("para", lv); }},
  {id:"b", name:"三角形", gen(lv){ return genArea("tri", lv); }},
  {id:"c", name:"台形", gen(lv){ return genArea("trap", lv); }},
  {id:"d", name:"ひし形", gen(lv){ return genArea("rhombus", lv); }},
  {id:"e", name:"面積から長さを求める", gen(lv){
    const k = pick(["tri", "para"]), b = ri(4, 12), h = ri(3, 12), S = k === "tri" ? ds(b * h * 5, 1) : String(b * h);
    return L(`面積が${S}cm^2，底辺が${b}cmの${k === "tri" ? "三角形" : "平行四辺形"}の高さ((${h}cm))`, K_Q, "高さ");
  }}
]);

/* 15 正多角形と円 */
unit5(15, "正多角形と円", "12月", "正多角形や円の性質を調べよう", [
  {id:"a", name:"正多角形", gen(lv){
    const n = pick([5, 6, 8, 9, 10, 12]);
    if(lv === 2) return L(`円の中心のまわりの角を${360 / n}°ずつに分けてかいた正多角形の名前((正${POLY[n]}))`, K_Q, "正多角形");
    return L(`正${POLY[n]}をかくとき，円の中心のまわりの角を何度ずつに分けますか。((${360 / n}°))`, K_Q, "正多角形");
  }},
  {id:"b", name:"円周の長さ", gen(lv){ return genCircle(lv); }},
  {id:"c", name:"円周から直径を求める", gen(lv){
    const d = ri(2, 20); const c = dmul(d, "3.14");
    if(lv === 2) return L(`円周が${c}cmの円の半径((${ds(d * 5, 1)}cm))`, K_Q, "直径");
    return L(`円周が${c}cmの円の直径((${d}cm))`, K_Q, "直径");
  }}
]);

/* 16 体積 */
unit5(16, "体積", "1月", "直方体や立方体の体積の求め方を考えよう", [
  {id:"a", name:"直方体・立方体の体積", gen(lv){ return genBox(lv, false); }},
  {id:"b", name:"体積の単位", gen(lv){
    if(lv === 0){ const c = ri(0, 2); if(c === 0) return L(`1m^3＝[[1000000]]cm^3`, K_BOX, "□にあう数"); const n = ri(2, 9); return c === 1 ? L(`${n}L＝[[${n * 1000}]]cm^3`, K_BOX, "□にあう数") : L(`1L＝[[1000]]mL`, K_BOX, "□にあう数"); }
    if(lv === 1){ const x = rdec(11, 99, 1); return R() < 0.5 ? L(`${x}L＝[[${dmul(x, 1000)}]]cm^3`, K_BOX, "□にあう数") : L(`${dmul(x, 1000)}cm^3＝[[${x}]]L`, K_BOX, "□にあう数"); }
    if(R() < 0.5){ const x = rdec(11, 99, 1); return L(`${x}m^3＝[[${dmul(x, 1000)}]]L`, K_BOX, "□にあう数"); }
    const m = ri(2, 9) * 100; return L(`${m}mL＝[[${m}]]cm^3`, K_BOX, "□にあう数");
  }},
  {id:"c", name:"いろいろな形の体積", gen(lv){ return genBox(lv, true); }},
  {id:"d", name:"容積", gen(lv){
    if(lv < 2){ const a = ri(2, 6) * 10, b = ri(2, 6) * 10, c = ri(1, 4) * 10 + (lv === 1 ? 5 : 0), v = a * b * c;
      return W_(`内のりが，たて${a}cm，横${b}cm，深さ${c}cmの水そうがあります。この水そうの容積は何cm^3ですか。また，それは何Lですか。`, `${a}×${b}×${c}＝${v}`, `${v}cm^3，${ds(v, 3)}L`, "容積"); }
    const A = ri(12, 30), B = ri(12, 30), C = ri(8, 20), v = (A - 2) * (B - 2) * (C - 1);
    return W_(`厚さ1cmの板で，外のりが，たて${A}cm，横${B}cm，高さ${C}cmの直方体の形をした，ふたのない入れ物を作りました。この入れ物の容積は何cm^3ですか。`, [`内のり　たて${A - 2}cm，横${B - 2}cm，深さ${C - 1}cm`, `${A - 2}×${B - 2}×${C - 1}＝${v}`], `${v}cm^3`, "容積");
  }}
]);

/* 17 割合（２） */
unit5(17, "割合（２）", "2月", "わり合を使って，比べられる量やもとにする量を求めよう", [
  {id:"a", name:"比べられる量を求める", gen(lv){
    const b = pick([40, 50, 80, 120, 150, 200]), p = lv === 2 ? pick([110, 120, 125, 130, 150]) : ri(2, 19) * 5, a = b * p / 100;
    if(!Number.isInteger(a)) return this.gen(lv);
    return W_(`定員が${b}人の電車に，定員の${p}%の人が乗っています。乗っている人は何人ですか。`, `${b}×${ds(p, 2)}＝${a}`, `${a}人`, "比べられる量");
  }},
  {id:"b", name:"もとにする量を求める", gen(lv){
    const T = pick([60, 75, 80, 90, 100, 120, 150]), p = pick([10, 20, 25, 30, 40, 60]), a = T * p / 100;
    if(!Number.isInteger(a)) return this.gen(lv);
    return W_(`ある学校の5年生で，めがねをかけている人は${a}人で，これは5年生全体の${p}%にあたります。5年生は全部で何人ですか。`, `${a}÷${ds(p, 2)}＝${T}`, `${T}人`, "もとにする量");
  }},
  {id:"c", name:"わり引き・ふえる量", gen(lv){
    const P = ri(8, 30) * 100, p = pick([10, 15, 20, 25, 30, 40]);
    if(lv === 0){ const a = P * (100 - p) / 100; return W_(`定価${P}円のシャツを，定価の${p}%引きで買いました。代金は何円ですか。`, `${P}×（1－${ds(p, 2)}）＝${a}`, `${a}円`, "わり引き"); }
    if(lv === 1){ const a = P * (100 + p) / 100; return W_(`去年の入場者は${P}人でした。今年は去年より${p}%ふえました。今年の入場者は何人ですか。`, `${P}×（1＋${ds(p, 2)}）＝${a}`, `${a}人`, "ふえる量"); }
    const a = P * (100 - p) / 100; return W_(`定価の${p}%引きのねだんで，${a}円でくつを買いました。このくつの定価は何円ですか。`, `${a}÷（1－${ds(p, 2)}）＝${P}`, `${P}円`, "わり引き");
  }}
]);

/* 18 いろいろなグラフ */
unit5(18, "いろいろなグラフ", "2月", "円グラフや帯グラフを読み取ろう", [
  {id:"a", name:"円グラフを読む", gen(lv){ return genGraph("pie", lv); }},
  {id:"b", name:"帯グラフを読む", gen(lv){ return genGraph("band", lv); }}
]);

/* 19 立体 */
unit5(19, "立体", "2月", "角柱や円柱のとくちょうを調べよう", [
  {id:"a", name:"角柱・円柱の数", gen(lv){
    const n = ri(3, 8), nm = POLY[n].replace("形", "柱");
    if(lv === 2){ const k = pick([["側面の数", n], ["ちょう点の数", 2 * n], ["辺の数", 3 * n]]); return L(`${k[0]}が${k[1]}の角柱の名前((${nm}))`, K_Q, "角柱"); }
    const k = pick(lv === 0 ? [["側面の数", n], ["ちょう点の数", 2 * n]] : [["辺の数", 3 * n], ["面の数", n + 2], ["ちょう点の数", 2 * n]]);
    return L(`${nm}の${k[0]}((${k[1]}))`, K_Q, "角柱");
  }},
  {id:"b", name:"てん開図と長さ", gen(lv){
    const d = ri(2, 12), h = ri(3, 12);
    return W_(`底面の直径が${d}cm，高さが${h}cmの円柱のてん開図をかきます。側面の長方形の横の長さは何cmですか。円周率は3.14とします。`, `${d}×3.14＝${dmul(d, "3.14")}`, `${dmul(d, "3.14")}cm`, "円柱");
  }}
]);

/* 20 データの活用 */
unit5(20, "データの活用", "3月", "データから，いろいろなことを読み取ろう", [
  {id:"a", name:"表から読み取る", gen(lv){
    for(;;){
      const subj = shuffle(["国語", "算数", "理科", "社会", "体育"]).slice(0, 4);
      const TA = 50, TB = 40;
      const A = [0, 0, 0].map(() => ri(5, 16)); A.push(TA - A.reduce((p, q) => p + q, 0));
      const B = [0, 0, 0].map(() => ri(2, 8) * 2); B.push(TB - B.reduce((p, q) => p + q, 0));
      if(A[3] < 3 || B[3] < 2 || B[3] % 2) continue;
      const k = ri(0, 3), pA = A[k] * 2, pB = B[k] * 2.5; if(pA === pB) continue;
      const rows = [["教科"].concat(subj).concat(["合計"]), ["A小学校(人)"].concat(A.map(String)).concat([String(TA)]), ["B小学校(人)"].concat(B.map(String)).concat([String(TB)])];
      const subs = [`A小学校で，${subj[k]}がすきな人のわり合は何%ですか。((${pA}%))`, `B小学校で，${subj[k]}がすきな人のわり合は何%ですか。((${pB}%))`];
      if(lv >= 1) subs.push(`${subj[k]}がすきな人のわり合が大きいのは，どちらの学校ですか。((${pA > pB ? "A小学校" : "B小学校"}))`);
      return tableItem("A小学校とB小学校の5年生に，すきな教科を1つずつ聞いて，表にまとめました。", rows, subs, {inst:K_Q, lead:"表の読み取り", headRow:true});
    }
  }}
]);

/* 21 5年のまとめ（ほかの単元の問題をまぜる） */
const pool = refs => ({gen(lv){ const [u, s] = pick(refs).split("."); return U5.find(x => x.id === u).subs.find(x => x.id === s).gen(lv); }});
unit5(21, "5年のまとめ", "3月", "5年で学習したことをふりかえろう", [
  Object.assign({id:"a", name:"数と計算"}, pool(["5-1.b", "5-1.c", "5-5.c", "5-5.e", "5-7.c", "5-7.b", "5-8.b", "5-11.a", "5-11.d", "5-11.e", "5-12.b", "5-12.a", "5-13.b"])),
  Object.assign({id:"b", name:"図形"}, pool(["5-9.a", "5-9.b", "5-14.a", "5-14.b", "5-14.c", "5-15.b", "5-16.a", "5-19.a"])),
  Object.assign({id:"c", name:"変化と関係"}, pool(["5-6.b", "5-6.c", "5-10.a", "5-10.b", "5-10.c", "5-13.a", "5-17.a", "5-17.b", "5-3.a"])),
  Object.assign({id:"d", name:"データの活用"}, pool(["5-4.a", "5-4.b", "5-18.a", "5-18.b"]))
]);

const GRADES = {1:null, 2:null, 3:null, 4:null, 5:U5, 6:null};
