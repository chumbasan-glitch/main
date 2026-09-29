/* ================= 入試（私立中学入試レベル・6年） ================= */
function unitN(no, name, meate, subs){ U6.push({id:"6-n" + no, no:"入試", name:"入試：" + name, month:"発展", meate, subs}); }
const NQ = "つぎの問題に答えましょう。";
const WN = (text, shiki, ans, lead) => wordItem(text, shiki, ans, {inst:NQ, lead});
const NOU = "【濃|こ】さ";

/* 分数・小数のまじった式を作って計算する */
function randNum(lv){
  const t = ri(0, lv === 0 ? 1 : 2);
  if(t === 0){ const [a, b] = rfrac(9, 2); return {s:F(a, b), v:[a, b]}; }
  if(t === 1){ const d = pick(["0.5", "0.25", "0.75", "1.5", "0.2", "0.4", "1.2", "2.5"]); return {s:d, v:decFr(d)}; }
  const w = ri(1, 3), [a, b] = rfrac(6, 2); return {s:MX(w, a, b), v:[w * b + a, b]};
}
const OPS = [["＋", fadd], ["－", fsub], ["×", fmul], ["÷", fdiv]];

unitN(1, "計算", "くふうして正確に計算しよう", [
  {id:"a", name:"計算のくふう", gen(lv){
    if(lv === 0){ const b = ri(11, 89), c = 100 - b, a = pick(["3.14", "2.5", "1.8", "0.75"]); return L(`${a}×${b}＋${a}×${c}＝<<${dmul(a, 100)}>>`, "くふうして計算しましょう。", "計算のくふう"); }
    if(lv === 1){ const a = ri(12, 48), b = ri(21, 79), c = 100 - b; return pick([
      () => L(`${ds(a, 1)}×${b}＋${a}×${ds(c, 1)}＝<<${a * 10}>>`, "くふうして計算しましょう。", "計算のくふう"),
      () => { const n = ri(101, 199), m = n - 100, k = ri(12, 60); return L(`${n}×${k}－${m}×${k}＝<<${100 * k}>>`, "くふうして計算しましょう。", "計算のくふう"); },
      () => { const n = pick([99, 999, 98]); return L(`${n}×${n}＋${n}${n === 98 ? "×2" : ""}＝<<${n === 98 ? 98 * 100 : n * (n + 1)}>>`, "くふうして計算しましょう。", "計算のくふう"); }])(); }
    const n = ri(4, 9), terms = []; for(let i = 1; i <= Math.min(n, 5); i++) terms.push(F(1, i * (i + 1)));
    const s = n <= 5 ? terms.join("＋") : terms.slice(0, 3).join("＋") + "＋…＋" + F(1, n * (n + 1));
    return L(`${s}＝<<${F(n, n + 1)}>>`, "くふうして計算しましょう。", "計算のくふう");
  }},
  {id:"b", name:"分数・小数のまじった計算", gen(lv){
    for(let t = 0; t < 500; t++){
      const A = randNum(lv), B = randNum(lv), C = randNum(lv), D = randNum(lv);
      const [o1, f1] = pick(OPS.slice(0, 2)), [o2, f2] = pick(OPS.slice(2)), [o3, f3] = pick(OPS);
      let v, s;
      if(lv === 0){ v = f2(f1(A.v, B.v), C.v); s = `（${A.s}${o1}${B.s}）${o2}${C.s}`; }
      else { v = f3(f2(f1(A.v, B.v), C.v), D.v); s = `（${A.s}${o1}${B.s}）${o2}${C.s}${o3}${D.s}`; }
      if(v[0] <= 0 || v[1] > 12 || v[0] / v[1] > 30) continue;
      if(lv === 2 && v[1] !== 1) continue;
      return L(`${s}＝<<${fAD(v)}>>`, K_CALC, "計算");
    }
    return L(`（${F(3, 4)}－0.5）×8＝<<2>>`, K_CALC, "計算");
  }},
  {id:"c", name:"□を求める", gen(lv){
    if(lv === 0){ const x = ri(2, 30), a = ri(2, 20), b = ri(2, 6), c = ri(1, 30), r = (x + a) * b - c; return L(`（□＋${a}）×${b}－${c}＝${r}　　□＝<<${x}>>`, "□にあてはまる数を求めましょう。", "□を求める"); }
    if(lv === 1){ for(;;){ const x = randNum(1), a = randNum(1), b = randNum(1); const r = fmul(fsub(x.v, a.v), b.v); if(r[0] <= 0 || r[1] > 12) continue; return L(`（□－${a.s}）×${b.s}＝${fStr(r)}　　□＝<<${fAD(x.v)}>>`, "□にあてはまる数を求めましょう。", "□を求める"); } }
    for(;;){ const x = ri(2, 20), a = ri(2, 6), b = ri(1, 20), c = ri(2, 5), d = ri(1, 20), e = ri(2, 4);
      if((x * a - b) <= 0 || (x * a - b) % c) continue; const r = ((x * a - b) / c + d) * e;
      return L(`｛（□×${a}－${b}）÷${c}＋${d}｝×${e}＝${r}　　□＝<<${x}>>`, "□にあてはまる数を求めましょう。", "□を求める"); }
  }}
]);

unitN(2, "特殊算", "問題の場面を図に表して考えよう", [
  {id:"a", name:"和差算", gen(lv){
    if(lv < 2){ const b = ri(10, 90), d = ri(4, 40), s = 2 * b + d; return WN(`大小2つの数があります。2つの数の和は${s}，差は${d}です。大きいほうの数はいくつですか。`, `（${s}＋${d}）÷2＝${b + d}`, `${b + d}`, "和差算"); }
    const c = ri(3, 20) * 10, b = c + ri(1, 9) * 10, a = b + ri(1, 9) * 10, t = a + b + c;
    return WN(`A，B，Cの3人の持っているお金の合計は${t}円です。AはBより${a - b}円多く，BはCより${b - c}円多く持っています。Aは何円持っていますか。`, [`Cを基準にすると，Bは${b - c}円，Aは${a - c}円多い`, `（${t}－${b - c}－${a - c}）÷3＝${c}`, `${c}＋${a - c}＝${a}`], `${a}円`, "和差算");
  }},
  {id:"b", name:"つるかめ算", gen(lv){
    if(lv < 2){ const p = pick([60, 80, 90]), q = p + pick([30, 40, 50, 60]), n = ri(10, 25), x = ri(2, n - 2), t = p * (n - x) + q * x;
      return WN(`1本${p}円のえんぴつと1本${q}円のボールペンを，合わせて${n}本買ったら，代金は${t}円でした。ボールペンを何本買いましたか。`, [`全部えんぴつだとすると　${p}×${n}＝${p * n}`, `（${t}－${p * n}）÷（${q}－${p}）＝${x}`], `${x}本`, "つるかめ算"); }
    const n = 20, w = ri(2, 8), g = 5, m = 2, sc = g * (n - w) - m * w;
    return WN(`${n}問のクイズで，正解すると${g}点もらえ，まちがえると${m}点引かれます。${n}問すべてに答えたら${sc}点でした。何問まちがえましたか。`, [`全部正解だと　${g}×${n}＝${g * n}`, `1問まちがえると　${g}＋${m}＝${g + m}点へる`, `（${g * n}－${sc}）÷${g + m}＝${w}`], `${w}問`, "つるかめ算");
  }},
  {id:"c", name:"旅人算", gen(lv){
    if(lv === 0){ const a = ri(5, 9) * 10, b = ri(5, 9) * 10, t = ri(5, 20), d = (a + b) * t; return WN(`${d}mはなれたところにいる兄と弟が，向かい合って同時に歩き始めました。兄は分速${a}m，弟は分速${b}mです。2人は何分後に出会いますか。`, `${d}÷（${a}＋${b}）＝${t}`, `${t}分後`, "旅人算"); }
    if(lv === 1){ const a = ri(5, 7) * 10, b = a + ri(2, 6) * 10, m = ri(4, 12), t = a * m / (b - a); if(!Number.isInteger(t)) return this.gen(lv);
      return WN(`弟が分速${a}mで家を出てから${m}分後に，兄が分速${b}mで同じ道を追いかけました。兄は家を出てから何分後に弟に追いつきますか。`, [`${a}×${m}＝${a * m}`, `${a * m}÷（${b}－${a}）＝${t}`], `${t}分後`, "旅人算"); }
    const a = ri(5, 9) * 10, b = ri(5, 9) * 10, t = ri(5, 15), Lp = (a + b) * t;
    if(a === b) return this.gen(lv);
    return WN(`まわりの長さが${Lp}mの池があります。Aさんは分速${a}m，Bさんは分速${b}mで，同じ地点から反対の向きに同時に歩き始めました。2人がはじめて出会うのは何分後ですか。`, `${Lp}÷（${a}＋${b}）＝${t}`, `${t}分後`, "旅人算");
  }},
  {id:"d", name:"通過算", gen(lv){
    if(lv < 2){ const v = ri(10, 25), t = ri(10, 40), Ln = ri(8, 20) * 10, B = v * t - Ln; if(B <= 50) return this.gen(lv);
      return lv === 0 ? WN(`長さ${Ln}mの列車が秒速${v}mで走っています。この列車が長さ${B}mの鉄橋をわたり始めてから，わたり終わるまでに何秒かかりますか。`, `（${Ln}＋${B}）÷${v}＝${t}`, `${t}秒`, "通過算")
        : WN(`秒速${v}mで走る列車が，長さ${B}mの鉄橋をわたり始めてから，わたり終わるまでに${t}秒かかりました。この列車の長さは何mですか。`, [`${v}×${t}＝${v * t}`, `${v * t}－${B}＝${Ln}`], `${Ln}m`, "通過算"); }
    const u = ri(15, 25), w = ri(10, 20), t = ri(4, 10), tot = (u + w) * t, a = ri(8, 14) * 10, b = tot - a; if(b < 80) return this.gen(lv);
    return WN(`長さ${a}mで秒速${u}mの列車Aと，長さ${b}mで秒速${w}mの列車Bが，向かい合って走っています。2つの列車が出会ってから，はなれるまでに何秒かかりますか。`, `（${a}＋${b}）÷（${u}＋${w}）＝${t}`, `${t}秒`, "通過算");
  }},
  {id:"e", name:"流水算", gen(lv){
    const v = ri(8, 20), c = ri(1, 4), t = ri(2, 6);
    if(lv === 0){ const d = (v - c) * t; return WN(`静水での速さが時速${v}kmの船があります。流れの速さが時速${c}kmの川を，${d}kmのぼるのに何時間かかりますか。`, [`上りの速さ　${v}－${c}＝${v - c}`, `${d}÷${v - c}＝${t}`], `${t}時間`, "流水算"); }
    if(lv === 1){ const d = (v + c) * t; return WN(`静水での速さが時速${v}kmの船が，流れの速さが時速${c}kmの川を${d}km下ります。何時間かかりますか。`, [`下りの速さ　${v}＋${c}＝${v + c}`, `${d}÷${v + c}＝${t}`], `${t}時間`, "流水算"); }
    const d = lcm(v - c, v + c) * ri(1, 2), tu = d / (v - c), td = d / (v + c); if(d > 200) return this.gen(lv);
    return WN(`ある川の${d}km上流と下流を船が往復します。上るのに${tu}時間，下るのに${td}時間かかりました。この川の流れの速さは時速何kmですか。`, [`上りの速さ　${d}÷${tu}＝${v - c}`, `下りの速さ　${d}÷${td}＝${v + c}`, `（${v + c}－${v - c}）÷2＝${c}`], `時速${c}km`, "流水算");
  }},
  {id:"f", name:"仕事算", gen(lv){
    const P = [[6, 12, 4], [10, 15, 6], [12, 24, 8], [20, 30, 12], [4, 12, 3], [9, 18, 6], [10, 40, 8], [12, 36, 9], [15, 30, 10]];
    const [a, b, t] = pick(P);
    if(lv < 2) return WN(`ある仕事を，Aさん1人ですると${a}日，Bさん1人ですると${b}日かかります。この仕事を2人でいっしょにすると，何日で終わりますか。`, [`全体の仕事の量を1とすると，1日にAは${F(1, a)}，Bは${F(1, b)}`, `1÷（${F(1, a)}＋${F(1, b)}）＝${t}`], `${t}日`, "仕事算");
    const x = ri(1, a - 1), rest = fsub([1, 1], FR(x, a)), d = fdiv(rest, FR(1, b));
    if(d[1] !== 1) return this.gen(lv);
    return WN(`ある仕事を，Aさん1人ですると${a}日，Bさん1人ですると${b}日かかります。はじめにAさんが${x}日仕事をして，残りをBさん1人でしました。Bさんは何日仕事をしましたか。`, [`Aさんがした仕事　${F(1, a)}×${x}＝${fStr(FR(x, a))}`, `残り　1－${fStr(FR(x, a))}＝${fStr(rest)}`, `${fStr(rest)}÷${F(1, b)}＝${d[0]}`], `${d[0]}日`, "仕事算");
  }},
  {id:"g", name:"年れい算", gen(lv){
    for(;;){ const k = lv === 0 ? 3 : pick([2, 3, 4]), c = ri(3, 12), f = ri(28, 45), n = (f - k * c) / (k - 1);
      if(!Number.isInteger(n) || n <= 0 || n > 20) continue;
      return WN(`今，父は${f}才，子どもは${c}才です。父の年れいが子どもの年れいの${k}倍になるのは，今から何年後ですか。`, [`年れいの差は変わらず　${f}－${c}＝${f - c}`, `そのとき子どもは　${f - c}÷（${k}－1）＝${(f - c) / (k - 1)}才`, `${(f - c) / (k - 1)}－${c}＝${n}`], `${n}年後`, "年れい算"); }
  }},
  {id:"h", name:"損益算", gen(lv){
    const C = ri(4, 30) * 100, p = pick([20, 25, 30, 40, 50]), q = pick([10, 20]), P = C * (100 + p) / 100, S = P * (100 - q) / 100;
    if(!Number.isInteger(P) || !Number.isInteger(S)) return this.gen(lv);
    if(lv < 2) return WN(`原価${C}円の品物に，原価の${p}%の利益を見こんで定価をつけました。しかし売れなかったので，定価の${q}%引きで売りました。利益は何円ですか。`, [`定価　${C}×${ds(100 + p, 2)}＝${P}`, `売り値　${P}×${ds(100 - q, 2)}＝${S}`, `${S}－${C}＝${S - C}`], `${S - C}円`, "損益算");
    return WN(`ある品物に，原価の${p}%の利益を見こんで定価をつけ，定価の${q}%引きで売ったところ，${S - C}円の利益がありました。この品物の原価は何円ですか。`, [`売り値は原価の　${ds(100 + p, 2)}×${ds(100 - q, 2)}＝${dmul(ds(100 + p, 2), ds(100 - q, 2))}（倍）`, `利益は原価の　${dmul(ds(100 + p, 2), ds(100 - q, 2))}－1＝${dadd(dmul(ds(100 + p, 2), ds(100 - q, 2)), "1", -1)}（倍）`, `${S - C}÷${dadd(dmul(ds(100 + p, 2), ds(100 - q, 2)), "1", -1)}＝${C}`], `${C}円`, "損益算");
  }},
  {id:"i", name:"食塩水", gen(lv){
    for(;;){
      const a = ri(2, 12), b = ri(2, 12), x = ri(1, 6) * 50, y = ri(1, 6) * 50; if(a === b) continue;
      const salt = a * x + b * y, tot = x + y, c = salt / tot; if(!Number.isInteger(c * 10)) continue;
      if(lv === 0) return WN(`${NOU}${a}%の食塩水${x}gには，食塩が何gとけていますか。`, `${x}×${ds(a, 2)}＝${ds(a * x, 2)}`, `${ds(a * x, 2)}g`, "食塩水");
      if(lv === 1) return WN(`${NOU}${a}%の食塩水${x}gと，${NOU}${b}%の食塩水${y}gをまぜると，${NOU}は何%になりますか。`, [`食塩の量　${x}×${ds(a, 2)}＋${y}×${ds(b, 2)}＝${ds(salt, 2)}`, `${ds(salt, 2)}÷${tot}×100＝${ds(c * 10, 1)}`], `${ds(c * 10, 1)}%`, "食塩水");
      const w = ri(1, 4) * 50, c2 = a * x / (x + w); if(!Number.isInteger(c2 * 10)) continue;
      return WN(`${NOU}${a}%の食塩水${x}gに，水を${w}g加えました。${NOU}は何%になりますか。`, [`食塩の量　${x}×${ds(a, 2)}＝${ds(a * x, 2)}`, `${ds(a * x, 2)}÷${x + w}×100＝${ds(c2 * 10, 1)}`], `${ds(c2 * 10, 1)}%`, "食塩水");
    }
  }},
  {id:"j", name:"過不足算", gen(lv){
    for(;;){ const p = ri(3, 6), q = p + ri(1, 3), n = ri(8, 30), r = ri(1, 15), total = p * n + r, s = q * n - total; if(s <= 0) continue;
      return WN(`何人かの子どもにあめを配ります。1人に${p}こずつ配ると${r}こあまり，1人に${q}こずつ配ると${s}こ足りません。子どもの人数とあめの数を求めましょう。`, [`（${r}＋${s}）÷（${q}－${p}）＝${n}`, `${p}×${n}＋${r}＝${total}`], `子ども${n}人，あめ${total}こ`, "過不足算"); }
  }}
]);

unitN(3, "割合と比", "割合や比を使って，問題を解決しよう", [
  {id:"a", name:"相当算", gen(lv){
    for(;;){ const [p, q] = rfrac(5, 2), [r, s] = rfrac(5, 2), T = q * s * ri(2, 10) * 10;
      const left = T * (q - p) / q * (s - r) / s;
      if(lv === 0) return WN(`持っていたお金の${F(p, q)}を使ったら，${T * (q - p) / q}円残りました。はじめに何円持っていましたか。`, `${T * (q - p) / q}÷（1－${F(p, q)}）＝${T}`, `${T}円`, "相当算");
      if(!Number.isInteger(left)) continue;
      return WN(`持っていたお金の${F(p, q)}で本を買い，残りのお金の${F(r, s)}でノートを買ったら，${left}円残りました。はじめに何円持っていましたか。`, [`${left}÷（1－${F(r, s)}）＝${T * (q - p) / q}`, `${T * (q - p) / q}÷（1－${F(p, q)}）＝${T}`], `${T}円`, "相当算"); }
  }},
  {id:"b", name:"比の文章題", gen(lv){
    for(let t = 0; t < 500; t++){
      let p, q, r, s; do{ p = ri(2, 7); q = ri(2, 7); } while(p === q || gcd(p, q) > 1); do{ r = ri(1, 7); s = ri(1, 7); } while(r === s || gcd(r, s) > 1);
      const Lc = lcm(p + q, r + s), T = Lc * ri(1, 4) * 100, A = T * p / (p + q), A2 = T * r / (r + s), x = A - A2;
      if(x <= 0 || T > 20000) continue;
      if(lv === 0) return WN(`AさんとBさんの持っているお金の比は${p}：${q}で，2人の合計は${T}円です。Aさんは何円持っていますか。`, `${T}×${F(p, p + q)}＝${A}`, `${A}円`, "比");
      return WN(`AさんとBさんの持っているお金の比は${p}：${q}です。AさんがBさんに${x}円わたしたので，2人の持っているお金の比は${r}：${s}になりました。Aさんは，はじめに何円持っていましたか。`, [`2人の合計は変わらない。合計を${p + q}と${r + s}の最小公倍数${Lc}にそろえる`, `はじめ　${p * Lc / (p + q)}：${q * Lc / (p + q)}，あと　${r * Lc / (r + s)}：${s * Lc / (r + s)}`, `${p * Lc / (p + q) - r * Lc / (r + s)}が${x}円にあたるので，1は${x / (p * Lc / (p + q) - r * Lc / (r + s))}円`, `${x / (p * Lc / (p + q) - r * Lc / (r + s))}×${p * Lc / (p + q)}＝${A}`], `${A}円`, "比");
    }
    return this.gen(0);
  }},
  {id:"c", name:"売買と割合", gen(lv){
    const C = ri(4, 20) * 100, p = pick([20, 40, 60]), P = C * (100 + p) / 80;
    if(!Number.isInteger(P)) return this.gen(lv);
    return WN(`原価${C}円の品物を，定価の2割引きで売っても，原価の${p}%の利益が出るようにしたいと思います。定価を何円にすればよいですか。`, [`売り値　${C}×${ds(100 + p, 2)}＝${C * (100 + p) / 100}`, `定価　${C * (100 + p) / 100}÷0.8＝${P}`], `${P}円`, "売買と割合");
  }},
  {id:"d", name:"速さと比", gen(lv){
    let p, q; do{ p = ri(2, 7); q = ri(2, 7); } while(p === q || gcd(p, q) > 1);
    if(lv === 0) return L(`同じ道のりを，AとBが歩きます。AとBの速さの比が${p}：${q}のとき，かかる時間の比((${q}：${p}))`, NQ, "速さと比");
    const m = p * ri(2, 8);
    return WN(`AとBの歩く速さの比は${p}：${q}です。Aが家から駅まで歩くと${m}分かかります。Bが同じ道のりを歩くと何分かかりますか。`, [`時間の比は速さの比の逆で　${q}：${p}`, `${m}×${F(q, p)}＝${m * q / p}`], `${m * q / p}分`, "速さと比");
  }}
]);

unitN(4, "数の性質", "数のきまりや性質を見つけよう", [
  {id:"a", name:"あまりの問題", gen(lv){
    for(;;){ const a = ri(3, 9), b = ri(4, 12); if(a === b) continue; const l = lcm(a, b); if(l > 80) continue;
      if(lv < 2){ const r = ri(1, Math.min(a, b) - 1), dig = lv === 0 ? 2 : 3, lo = P10(dig - 1); let x = Math.ceil((lo - r) / l) * l + r; if(x < lo) x += l;
        return L(`${a}でわっても${b}でわっても${r}あまる整数のうち，いちばん小さい${dig}けたの整数((${x}))`, NQ, "あまり"); }
      const r1 = ri(1, a - 1), r2 = ri(1, b - 1); if(r1 === r2) continue; let x = 0; for(let v = 1; v <= l; v++) if(v % a === r1 && v % b === r2){ x = v; break; }
      if(!x) continue;
      return L(`${a}でわると${r1}あまり，${b}でわると${r2}あまる整数のうち，いちばん小さい整数((${x}))`, NQ, "あまり"); }
  }},
  {id:"b", name:"倍数の個数", gen(lv){
    for(;;){ const a = ri(2, 9), b = ri(3, 12), N = ri(10, 50) * 10; if(a === b || a % b === 0 || b % a === 0) continue;
      const na = Math.floor(N / a), nb = Math.floor(N / b), nab = Math.floor(N / lcm(a, b));
      if(lv === 0) return L(`1から${N}までの整数のうち，${a}の倍数でも${b}の倍数でもある数はいくつありますか。((${nab}こ))`, NQ, "倍数");
      if(lv === 1) return L(`1から${N}までの整数のうち，${a}または${b}でわり切れる数はいくつありますか。((${na + nb - nab}こ))`, NQ, "倍数");
      return L(`1から${N}までの整数のうち，${a}でも${b}でもわり切れない数はいくつありますか。((${N - (na + nb - nab)}こ))`, NQ, "倍数"); }
  }},
  {id:"c", name:"規則性", gen(lv){
    if(lv === 0){ const a = ri(1, 9), d = ri(2, 9), n = ri(20, 60); return L(`${[0, 1, 2, 3].map(i => a + d * i).join("，")}，…と，ある規則にしたがって数がならんでいます。${n}番目の数((${a + d * (n - 1)}))`, NQ, "規則性"); }
    if(lv === 1){ const a = ri(1, 9), d = ri(2, 6), n = ri(10, 30), last = a + d * (n - 1); return L(`${[0, 1, 2, 3].map(i => a + d * i).join("，")}，…と，ある規則にしたがって数がならんでいます。1番目から${n}番目までの数の和((${(a + last) * n / 2}))`, NQ, "規則性"); }
    const n = ri(20, 60); let k = 1; while(k * (k + 1) / 2 < n) k++;
    return L(`1，2，2，3，3，3，4，4，4，4，…と，数がならんでいます。${n}番目の数((${k}))`, NQ, "規則性");
  }},
  {id:"d", name:"約数の個数と和", gen(lv){
    const n = pick([12, 18, 20, 24, 28, 30, 36, 40, 42, 48, 60, 72, 84, 90, 96]), dv = divisors(n);
    if(lv < 2) return L(`${n}の約数の個数((${dv.length}こ))`, NQ, "約数");
    return L(`${n}の約数をすべてたした和((${dv.reduce((a, b) => a + b, 0)}))`, NQ, "約数");
  }}
]);

/* 場合の数：カードでできる整数（数え上げで答えを出す） */
function cardCount(digs, k, cond){
  let cnt = 0; const used = new Array(digs.length).fill(false);
  const rec = (s) => {
    if(s.length === k){ if(s[0] !== "0" && cond(+s)) cnt++; return; }
    for(let i = 0; i < digs.length; i++) if(!used[i]){ used[i] = true; rec(s + digs[i]); used[i] = false; }
  };
  rec(""); return cnt;
}
function genGridPath(lv){
  const m = ri(3, lv === 0 ? 4 : 5), n = ri(2, lv === 0 ? 3 : 4);
  const bx = lv === 2 ? [ri(1, m - 1), ri(1, n - 1)] : null;
  let ans;
  if(!bx) ans = comb(m + n, m);
  else { const f = []; for(let i = 0; i <= m; i++){ f[i] = []; for(let j = 0; j <= n; j++){ f[i][j] = (i === 0 && j === 0) ? 1 : ((i ? f[i - 1][j] : 0) + (j ? f[i][j - 1] : 0)); if(i === bx[0] && j === bx[1]) f[i][j] = 0; } } ans = f[m][n]; }
  const draw = (G, x, y, w, h, fs) => {
    const c = Math.min((w - 12) / m, (h - 10) / n), ox = x + 6, oy = y + 4 + n * c;
    for(let i = 0; i <= m; i++) G.line(ox + i * c, oy, ox + i * c, oy - n * c, {w:0.35});
    for(let j = 0; j <= n; j++) G.line(ox, oy - j * c, ox + m * c, oy - j * c, {w:0.35});
    G.text("A", ox - 2.5, oy + 1.5, {size:fs * 0.8, align:"center"}); G.text("B", ox + m * c + 2.5, oy - n * c - 1.5, {size:fs * 0.8, align:"center"});
    if(bx){ const px = ox + bx[0] * c, py = oy - bx[1] * c; G.line(px - 1.3, py - 1.3, px + 1.3, py + 1.3, {w:0.5}); G.line(px - 1.3, py + 1.3, px + 1.3, py - 1.3, {w:0.5}); }
  };
  return figItem(FIGW + 8, FIGH + 6, draw, "((" + ans + "通り))", {inst:bx ? "AからBまで，遠回りをしないで行く道順は何通りありますか。×の地点は通れません。" : "AからBまで，遠回りをしないで行く道順は何通りありますか。", lead:"道順", sig:"g" + m + n + (bx || "")});
}
unitN(5, "場合の数", "もれや重なりがないように数えよう", [
  {id:"a", name:"道順", gen(lv){ return genGridPath(lv); }},
  {id:"b", name:"カードでできる整数", gen(lv){
    const digs = lv === 0 ? ["1", "2", "3", "4"] : ["0", "1", "2", "3", "4"].slice(0, lv === 1 ? 4 : 5), k = 3;
    const conds = [["【偶|ぐう】数", v => v % 2 === 0], ["3の倍数", v => v % 3 === 0], ["5の倍数", v => v % 5 === 0], ["300より大きい数", v => v > 300]];
    const [nm, f] = lv === 0 ? pick([conds[0], conds[3]]) : pick(conds);
    return L(`${digs.join("，")}の${digs.length}まいのカードから3まいを選んでならべ，3けたの整数をつくります。このうち${nm}は何通りできますか。((${cardCount(digs, k, f)}通り))`, NQ, "カードの整数");
  }},
  {id:"c", name:"硬貨でしはらえる金額", gen(lv){
    const a = ri(1, 3), b = ri(1, 2), c = ri(1, 3), set = new Set();
    for(let i = 0; i <= a; i++) for(let j = 0; j <= b; j++) for(let k = 0; k <= c; k++){ const v = 10 * i + 50 * j + 100 * k; if(v) set.add(v); }
    return L(`10円玉${a}まい，50円玉${b}まい，100円玉${c}まいがあります。これらの一部または全部を使って，ちょうどはらうことのできる金額は何通りありますか。((${set.size}通り))`, NQ, "金額");
  }},
  {id:"d", name:"図形と場合の数", gen(lv){
    const n = ri(5, 10);
    if(lv === 0) return L(`円のまわりに，${n}この点が等しい間かくでならんでいます。このうち2点を結んでできる直線は何本ありますか。((${comb(n, 2)}本))`, NQ, "図形と場合の数");
    if(lv === 1) return L(`正${POLY[n] ? POLY[n] : n + "角形"}の対角線は何本ありますか。((${n * (n - 3) / 2}本))`, NQ, "図形と場合の数");
    return L(`円のまわりに，${n}この点が等しい間かくでならんでいます。このうち3点を結んでできる三角形は何こありますか。((${comb(n, 3)}こ))`, NQ, "図形と場合の数");
  }}
]);

/* 図形の応用 */
function genSector(lv){
  for(;;){
    const th = pick([30, 45, 60, 90, 120, 135, 150, 210, 240, 270]), r = ri(2, 12);
    const areaOk = (r * r * th) % 360 === 0, perOk = (2 * r * th) % 360 === 0;
    const askPer = lv >= 1 && R() < 0.5;
    if(askPer ? !perOk : !areaOk) continue;
    const A = dmul(r * r * th / 360, "3.14"), Pm = dadd(dmul(2 * r * th / 360, "3.14"), 2 * r);
    const draw = (G, x, y, w, h, fs) => {
      const R_ = Math.min(w, h) / 2 - 4, cx = x + w / 2, cy = y + h / 2 + (th <= 180 ? R_ * 0.3 : 0);
      const s0 = -Math.PI / 2 - th * D2R / 2, s1 = s0 + th * D2R;
      G.arc(cx, cy, R_, s0, s1, {fill:SHADE, stroke:false});
      G.arc(cx, cy, R_, s0, s1, {w:0.4});
      G.line(cx, cy, cx + R_ * Math.cos(s0), cy + R_ * Math.sin(s0), {w:0.4}); G.line(cx, cy, cx + R_ * Math.cos(s1), cy + R_ * Math.sin(s1), {w:0.4});
      G.arc(cx, cy, 2.2, s0, s1, {w:0.25});
      const md = (s0 + s1) / 2; G.text(th + "°", cx + 5 * Math.cos(md), cy + 5 * Math.sin(md), {size:fs * 0.7, align:"center"});
      const mx = cx + R_ * 0.5 * Math.cos(s1), my = cy + R_ * 0.5 * Math.sin(s1);
      G.text(cm(r), mx + 1.5, my + 2.2, {size:fs * 0.75});
    };
    return figItem(FIGW, FIGH + 6, draw, (askPer ? "まわりの長さ" : "面積") + "((" + (askPer ? cm(Pm) : A + "cm^2") + "))", {inst:"つぎのおうぎ形について答えましょう。円周率は3.14とします。", lead:"おうぎ形", sig:"s" + th + r + askPer});
  }
}
function genParallelAngle(lv){
  const a = ri(25, 65), b = ri(25, 65), x = a + b;
  const draw = (G, x0, y, w, h, fs) => {
    const y1 = y + 4, y2 = y + h - 4, L_ = x0 + 2, R_ = x0 + w - 2;
    G.line(L_, y1, R_, y1, {w:0.4}); G.line(L_, y2, R_, y2, {w:0.4});
    G.text("ℓ", R_ - 1, y1 - 2, {size:fs * 0.7}); G.text("m", R_ - 1, y2 - 2, {size:fs * 0.7});
    const px = x0 + w * 0.7, py = (y1 + y2) / 2;
    const d1 = (py - y1) / Math.tan(a * D2R), d2 = (y2 - py) / Math.tan(b * D2R);
    const A = [px - d1, y1], B = [px - d2, y2], P = [px, py];
    G.line(...A, ...P, {w:0.4}); G.line(...P, ...B, {w:0.4});
    angleMark(G, A, [R_, y1], P, lv === 2 ? "ア" : a + "°", fs);
    angleMark(G, B, [R_, y2], P, b + "°", fs);
    angleMark(G, P, A, B, lv === 2 ? x + "°" : "ア", fs);
  };
  const q = lv === 2 ? `ア((${a}°))` : `ア((${x}°))`;
  return figItem(FIGW + 6, FIGH + 4, draw, q, {inst:"直線ℓと直線mは平行です。アの角度を求めましょう。", lead:"角度", sig:"p" + a + b + lv});
}
unitN(6, "図形の応用", "図形の性質を組み合わせて考えよう", [
  {id:"a", name:"おうぎ形", gen(lv){ return genSector(lv); }},
  {id:"b", name:"平行線と角", gen(lv){ return genParallelAngle(lv); }},
  {id:"c", name:"表面積", gen(lv){
    if(lv === 0){ const a = ri(2, 10), b = ri(2, 10), c = ri(2, 10); return L(`たて${a}cm，横${b}cm，高さ${c}cmの直方体の表面積((${2 * (a * b + b * c + c * a)}cm^2))`, NQ, "表面積"); }
    const r = ri(1, 6), h = ri(2, 12), S = dmul(2 * r * r + 2 * r * h, "3.14");
    return L(`底面の半径が${r}cm，高さが${h}cmの円柱の表面積((${S}cm^2))`, "つぎの問題に答えましょう。円周率は3.14とします。", "表面積");
  }},
  {id:"d", name:"水の深さ", gen(lv){
    for(;;){
      const a = ri(10, 30), b = ri(10, 30), c = ri(3, 8), h = ri(c, 20), rise = c * c * c / (a * b);
      if(!Number.isInteger(rise * 10)) continue;
      if(lv === 0){ const v = ri(2, 9) * 1000, d = v / (a * b); if(!Number.isInteger(d * 10)) continue; return WN(`内のりが，たて${a}cm，横${b}cmの直方体の形をした水そうに，${v / 1000}Lの水を入れると，水の深さは何cmになりますか。`, [`${v / 1000}L＝${v}cm^3`, `${v}÷（${a}×${b}）＝${ds(d * 10, 1)}`], `${ds(d * 10, 1)}cm`, "水の深さ"); }
      return WN(`内のりが，たて${a}cm，横${b}cmの直方体の形をした水そうに，深さ${h}cmまで水が入っています。この中に1辺が${c}cmの立方体の石をしずめると，水面は何cm上がりますか。`, [`石の体積　${c}×${c}×${c}＝${c * c * c}`, `${c * c * c}÷（${a}×${b}）＝${ds(rise * 10, 1)}`], `${ds(rise * 10, 1)}cm`, "水の深さ");
    }
  }}
]);
