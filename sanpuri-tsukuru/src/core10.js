/* ================= 2年の単元と問題（分かち書き） ================= */
const U2 = [];
function unit2(no, name, month, meate, subs){ U2.push({id:"2-" + no, no, name, month, meate, subs}); }
const K2_CALC = "つぎの　計算を　しましょう。", K2_BOX = "[[ ]]に　あう　数を　書きましょう。", K2_Q = "つぎの　もんだいに　答えましょう。";
const L2 = (mk, inst, lead) => lineItem(mk, {inst, lead});
const W2 = (text, shiki, ans, lead) => wordItem(text, shiki, ans, {inst:K2_Q, lead:lead || "文しょうだい"});
const KURA2 = "【位|くらい】", MEN = "【面|めん】";
const FRUITS = ["りんご", "みかん", "いちご", "バナナ", "ぶどう"];

/* ○のグラフ（1・2年共通） */
function pictoItem(g, lv){
  const n = 4, labels = shuffle(FRUITS).slice(0, n), vals = labels.map(() => ri(2, 8));
  const mx = vals.indexOf(Math.max(...vals)), mn = vals.indexOf(Math.min(...vals));
  if(vals.filter(v => v === vals[mx]).length > 1 || vals.filter(v => v === vals[mn]).length > 1) return pictoItem(g, lv);
  const i1 = ri(0, 3); let i2; do{ i2 = ri(0, 3); } while(i2 === i1);
  const one = g === 1;
  const subs = one ? [`${labels[i1]}は　なん人ですか。((${vals[i1]}にん))`.replace("なん人", "なんにん"), `いちばん　おおいのは　どれですか。((${labels[mx]}))`]
                   : [`${labels[i1]}が　すきな　人は　何人ですか。((${vals[i1]}人))`, `いちばん　多いのは　どれですか。((${labels[mx]}))`];
  if(lv >= 1) subs.push(one ? `${labels[i1]}と　${labels[i2]}の　ちがいは　なんにんですか。((${Math.abs(vals[i1] - vals[i2])}にん))` : `${labels[i1]}と　${labels[i2]}の　ちがいは　何人ですか。((${Math.abs(vals[i1] - vals[i2])}人))`);
  if(lv === 2) subs.push(one ? `いちばん　すくないのは　どれですか。((${labels[mn]}))` : `いちばん　少ないのは　どれですか。((${labels[mn]}))`);
  return setItem(56, 44, (G, x, y, w, h, fs) => drawPicto(G, x, y, w, h, fs, labels, vals), subs,
    {inst:one ? "つぎの　もんだいに　こたえましょう。" : K2_Q, lead:one ? "かずしらべ" : "グラフ", text:one ? "すきな　くだものを　しらべて，○で　あらわしました。" : "すきな　くだものを　しらべて，○を　つかった　グラフに　あらわしました。", sig:labels.join() + vals.join()});
}

unit2(1, "ひょうと グラフ", "4月", "しらべた　ことを　ひょうや　グラフに　かこう", [
  {id:"a", name:"グラフを　読む", gen(lv){ return pictoItem(2, lv); }},
  {id:"b", name:"ひょうに　まとめる", gen(lv){
    const labels = shuffle(FRUITS).slice(0, 4), vals = labels.map(() => ri(2, 7)), list = shuffle(labels.flatMap((l, i) => Array(vals[i]).fill(l)));
    const rows = [["くだもの"].concat(labels), ["人数（人）"].concat(vals.map(v => `[[${v}]]`))];
    return tableItem(`すきな　くだものを　しらべました。\n${list.join("，")}`, rows, ["ひょうに　数を　書きましょう。"], {inst:K2_Q, lead:"ひょう", headRow:true});
  }}
]);

unit2(2, "時こくと 時間（１）", "5月", "時こくと　時間の　ちがいを　知ろう", [
  {id:"a", name:"時計を　読む", gen(lv){ const h = ri(1, 12), m = lv === 0 ? ri(0, 11) * 5 : ri(0, 59); return clockItem(h, m, `((${timeStr(h, m, true)}))`, {inst:"時計を　読みましょう。", lead:"時計"}); }},
  {id:"b", name:"時こくと　時間", gen(lv){
    const h = ri(7, 10), m = ri(0, 5) * 5, d = pick([10, 15, 20, 30]);
    if(lv === 0) return L2(`${h}時から　${h}時${d}分までの　時間((${d}分))`, K2_Q, "時間");
    let M = m + d, H = h; if(M >= 60){ M -= 60; H++; }
    return L2(`${h}時${m ? m + "分" : ""}の　${d}分後の　時こく((${H}時${M ? M + "分" : ""}))`, K2_Q, "時こく");
  }},
  {id:"c", name:"1日の　時間", gen(lv){ return pick([() => L2(`1時間＝[[60]]分`, K2_BOX, "□に　あう　数"), () => L2(`1日＝[[24]]時間`, K2_BOX, "□に　あう　数"), () => L2(`午前は　[[12]]時間`, K2_BOX, "□に　あう　数")])(); }}
]);

unit2(3, "２けたの たし算と ひき算", "5月", "10の　まとまりを　つかって　計算しよう", [
  {id:"a", name:"たし算", gen(lv){ const a = ri(1, 8) * 10, b = ri(1, 9 - a / 10) * 10, c = ri(1, 9); return lv === 0 ? L2(`${a}＋${b}＝<<${a + b}>>`, K2_CALC, "計算") : L2(`${a + c}＋${b}＝<<${a + b + c}>>`, K2_CALC, "計算"); }},
  {id:"b", name:"ひき算", gen(lv){ const a = ri(3, 9) * 10, b = ri(1, a / 10 - 1) * 10, c = ri(1, 9); return lv === 0 ? L2(`${a}－${b}＝<<${a - b}>>`, K2_CALC, "計算") : L2(`${a + c}－${b}＝<<${a + c - b}>>`, K2_CALC, "計算"); }}
]);

unit2(4, "たし算の ひっ算", "6月", "くらいを　そろえて　たし算の　ひっ算を　しよう", [
  {id:"a", name:"2けたの　たし算", gen(lv){ for(;;){ const a = ri(lv === 2 ? 1 : 10, 89), b = ri(10, 89), c = (a % 10) + (b % 10) >= 10; if(a + b > 99) continue; if(lv === 0 && c) continue; if(lv === 1 && !c) continue; return hissanAddItem(a, b, "+"); } }},
  {id:"b", name:"たし算の　きまり", gen(lv){ const a = ri(12, 60), b = ri(12, 39), c = ri(2, 9); return lv === 0 ? L2(`${a}＋${b}＝${b}＋[[${a}]]`, K2_BOX, "□に　あう　数") : L2(`（${a}＋${c}）＋${10 - c}＝${a}＋（${c}＋[[${10 - c}]]）`, K2_BOX, "□に　あう　数"); }}
]);

unit2(5, "ひき算の ひっ算", "6月", "くらいを　そろえて　ひき算の　ひっ算を　しよう", [
  {id:"a", name:"2けたの　ひき算", gen(lv){ for(;;){ const a = ri(20, 99), b = ri(lv === 2 ? 1 : 10, a - 1), br = (a % 10) < (b % 10); if(lv === 0 && br) continue; if(lv === 1 && !br) continue; return hissanAddItem(a, b, "-"); } }},
  {id:"b", name:"たし算と　ひき算の　かんけい", gen(lv){ const a = ri(40, 99), b = ri(11, a - 10); return L2(`${a}－${b}＝${a - b}　答えの　たしかめの　しき((${a - b}＋${b}＝${a}))`, "ひき算の　答えを　たし算で　たしかめましょう。", "たしかめ"); }}
]);

unit2(6, "長さ（1）", "7月", "cmや　mmを　つかって　長さを　はかろう", [
  {id:"a", name:"ものさしを　読む", gen(lv){ const Lmm = lv === 0 ? ri(3, 14) * 10 : ri(21, 145); if(Lmm % 10 === 0 && lv > 0) return this.gen(lv);
    return figItem(100, 22, (G, x, y, w, h, fs) => drawRuler(G, x, y, w, h, fs, 15, Lmm), `テープの　長さ((${Math.floor(Lmm / 10)}cm${Lmm % 10 ? Lmm % 10 + "mm" : ""}))`, {inst:"テープの　長さは　どれだけですか。", lead:"ものさし", sig:"r" + Lmm}); }},
  {id:"b", name:"長さの　たんい", gen(lv){ const c = ri(1, 15), m = ri(1, 9); return R() < 0.5 ? L2(`${c}cm${m}mm＝[[${c * 10 + m}]]mm`, K2_BOX, "□に　あう　数") : L2(`${c * 10 + m}mm＝[[${c}]]cm[[${m}]]mm`, K2_BOX, "□に　あう　数"); }},
  {id:"c", name:"長さの　計算", gen(lv){
    for(;;){ const a = ri(1, 9), am = ri(1, 9), b = ri(1, 9), bm = ri(1, 9);
      if(lv === 0 && am + bm >= 10) continue; if(lv >= 1 && am + bm < 10) continue; if((am + bm) % 10 === 0) continue;
      const t = a * 10 + am + b * 10 + bm;
      if(lv === 2){ const big = a * 10 + am + b * 10 + bm, sm = b * 10 + bm; return L2(`${Math.floor(big / 10)}cm${big % 10 ? big % 10 + "mm" : ""}－${b}cm${bm}mm＝[[${a}]]cm[[${am}]]mm`, K2_BOX, "□に　あう　数"); }
      return L2(`${a}cm${am}mm＋${b}cm${bm}mm＝[[${Math.floor(t / 10)}]]cm[[${t % 10}]]mm`, K2_BOX, "□に　あう　数"); }
  }}
]);

unit2(7, "たし算と ひき算（１）", "7月", "テープの　図に　かいて　考えよう", [
  {id:"a", name:"文しょうだい", gen(lv){
    const a = ri(10, 40), b = ri(5, 30);
    if(lv === 0) return W2(`あめが　${a}こ　あります。${b}こ　もらうと，ぜんぶで　何こに　なりますか。`, `${a}＋${b}＝${a + b}`, `${a + b}こ`);
    if(lv === 1) return W2(`あめを　何こか　もって　いました。${b}こ　もらったので，${a + b}こに　なりました。はじめに　何こ　もって　いましたか。`, `${a + b}－${b}＝${a}`, `${a}こ`);
    return W2(`色紙を　何まいか　もって　いました。${b}まい　つかったので，のこりが　${a}まいに　なりました。はじめに　何まい　もって　いましたか。`, `${a}＋${b}＝${a + b}`, `${a + b}まい`);
  }}
]);

unit2(8, "１０００までの 数", "9月", "1000までの　数の　しくみを　知ろう", [
  {id:"a", name:"数の　しくみ", gen(lv){
    const a = ri(1, 9), b = ri(0, 9), c = ri(0, 9);
    if(lv === 0) return L2(`100を　${a}こ，10を　${b}こ，1を　${c}こ　あわせた　数は　[[${a * 100 + b * 10 + c}]]です。`, K2_BOX, "□に　あう　数");
    if(lv === 1){ const n = ri(11, 99) * 10; return L2(`${n}は，10を　[[${n / 10}]]こ　あつめた　数です。`, K2_BOX, "□に　あう　数"); }
    const n = a * 100 + b * 10 + c; return L2(`${n}の　百の${KURA2}の　数字は　[[${a}]]です。`, K2_BOX, "□に　あう　数");
  }},
  {id:"b", name:"数の　線", gen(lv){
    const step = lv === 0 ? 10 : lv === 1 ? 1 : 5, start = lv === 1 ? ri(1, 8) * 100 : 0, n = 20, va = start + ri(1, 9) * step, vb = start + ri(11, 19) * step;
    return figItem(110, 16, (G, x, y, w, h, fs) => drawNumLine(G, x, y, w, fs, start, step, n, 10, [[va, "ア"], [vb, "イ"]]), `ア((${va}))　イ((${vb}))`, {inst:"数の　線の　ア，イが　あらわす　数を　書きましょう。", lead:"数の　線", sig:"nl" + va + vb});
  }},
  {id:"c", name:"数の　大小", gen(lv){ const a = ri(100, 999), b = ri(100, 999); if(a === b) return this.gen(lv); return L2(`${a}[[${a > b ? "＞" : "＜"}]]${b}`, "[[ ]]に，＞か　＜を　書きましょう。", "大小"); }},
  {id:"d", name:"何十・何百の　計算", gen(lv){
    const a = ri(2, 9), b = ri(2, 9);
    if(lv === 0) return L2(`${a * 10}＋${b * 10}＝<<${(a + b) * 10}>>`, K2_CALC, "計算");
    if(lv === 1) return a > b ? L2(`${a * 10 + 100}－${b * 10}＝<<${(a - b) * 10 + 100}>>`, K2_CALC, "計算") : L2(`${(a + b) * 10}－${b * 10}＝<<${a * 10}>>`, K2_CALC, "計算");
    if(a === b) return this.gen(lv);
    return a + b <= 10 ? L2(`${a * 100}＋${b * 100}＝<<${(a + b) * 100}>>`, K2_CALC, "計算") : L2(`${Math.max(a, b) * 100}－${Math.min(a, b) * 100}＝<<${Math.abs(a - b) * 100}>>`, K2_CALC, "計算");
  }}
]);

unit2(9, "大きい 数の たし算と ひき算", "9月", "3けたの　数の　計算に　ちょうせんしよう", [
  {id:"a", name:"答えが　3けたに　なる　たし算", gen(lv){ for(;;){ const a = ri(20, 99), b = ri(20, 99); if(a + b < 100) continue; return hissanAddItem(a, b, "+"); } }},
  {id:"b", name:"100より　大きい　数から　ひく　ひき算", gen(lv){ for(;;){ const a = lv === 2 ? pick([100, 101, 102, 103, 104, 105]) : ri(100, 199), b = ri(lv === 2 ? 2 : 11, 99); if(a - b < 1 || a - b >= 100) continue; return hissanAddItem(a, b, "-"); } }},
  {id:"c", name:"3けたの　たし算と　ひき算", gen(lv){ for(;;){ const a = ri(101, 899), b = ri(1, 99); if(R() < 0.5){ if((a % 100) + b >= 100) continue; return hissanAddItem(a, b, "+"); } if((a % 100) < b) continue; return hissanAddItem(a, b, "-"); } }}
]);

unit2(10, "水の かさ", "10月", "Lや　dL，mLを　つかって　かさを　はかろう", [
  {id:"a", name:"かさの　たんい", gen(lv){
    if(lv === 0) return pick([() => L2(`1L＝[[10]]dL`, K2_BOX, "□に　あう　数"), () => L2(`1L＝[[1000]]mL`, K2_BOX, "□に　あう　数"), () => L2(`1dL＝[[100]]mL`, K2_BOX, "□に　あう　数")])();
    const a = ri(1, 9), b = ri(1, 9); return R() < 0.5 ? L2(`${a}L${b}dL＝[[${a * 10 + b}]]dL`, K2_BOX, "□に　あう　数") : L2(`${a * 10 + b}dL＝[[${a}]]L[[${b}]]dL`, K2_BOX, "□に　あう　数");
  }},
  {id:"b", name:"かさの　計算", gen(lv){
    for(;;){ const a = ri(1, 5), ad = ri(1, 9), b = ri(1, 4), bd = ri(1, 9); if(lv === 0 && ad + bd >= 10) continue;
      if(lv === 2){ if(ad < bd || a <= b) continue; return L2(`${a}L${ad}dL－${b}L${bd}dL＝[[${a - b}]]L[[${ad - bd}]]dL`.replace(/\[\[0\]\]L/, "[[0]]L"), K2_BOX, "□に　あう　数"); }
      const t = a * 10 + ad + b * 10 + bd; return L2(`${a}L${ad}dL＋${b}L${bd}dL＝[[${Math.floor(t / 10)}]]L[[${t % 10}]]dL`, K2_BOX, "□に　あう　数"); }
  }}
]);

/* 形をえらぶ図（2年） */
const SHAPES2 = {
  tri:{pts:[[0.1, 0.9], [0.5, 0.1], [0.9, 0.9]], cls:["三角形"]},
  rtri:{pts:[[0.15, 0.9], [0.15, 0.15], [0.85, 0.9]], cls:["三角形", "直角三角形"], right:0},
  open3:{pts:[[0.1, 0.9], [0.5, 0.1], [0.9, 0.9], [0.25, 0.9]], cls:[], open:true},
  quad:{pts:[[0.1, 0.8], [0.3, 0.15], [0.9, 0.3], [0.75, 0.9]], cls:["四角形"]},
  rect:{pts:[[0.05, 0.25], [0.95, 0.25], [0.95, 0.8], [0.05, 0.8]], cls:["四角形", "長方形"]},
  sq:{pts:[[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85]], cls:["四角形", "正方形"]},
  open4:{pts:[[0.35, 0.15], [0.9, 0.2], [0.8, 0.85], [0.1, 0.8], [0.15, 0.3]], cls:[], open:true}
};
function genShapes2(lv){
  const keys = shuffle(Object.keys(SHAPES2)).slice(0, 6), names = ["あ", "い", "う", "え", "お", "か"];
  const target = lv === 0 ? pick(["三角形", "四角形"]) : lv === 1 ? pick(["三角形", "四角形", "直角三角形"]) : pick(["直角三角形", "正方形"]);
  const ans = keys.map((k, i) => SHAPES2[k].cls.includes(target) ? names[i] : null).filter(Boolean);
  if(!ans.length) return genShapes2(lv);
  const draw = (G, x, y, w, h, fs) => {
    const cw = w / keys.length, s = Math.min(cw - 2, h - 7);
    keys.forEach((k, i) => {
      const S = SHAPES2[k], ox = x + i * cw + (cw - s) / 2, oy = y;
      const P = S.pts.map(p => [ox + p[0] * s, oy + p[1] * s]);
      G.poly(P, {w:0.45, close:!S.open});
      if(S.right === 0){ const q = s * 0.1; G.poly([[P[0][0], P[0][1] - q], [P[0][0] + q, P[0][1] - q], [P[0][0] + q, P[0][1]]], {close:false, w:0.25}); }
      G.text(names[i], ox + s / 2, oy + s + 3.5, {size:fs * 0.75, align:"center"});
    });
  };
  return figItem(110, 26, draw, `${target}((${ans.join("，")}))`, {inst:"下の　形の　中から，えらんで　記ごうで　答えましょう。".replace("記ごう", "きごう"), lead:"形", sig:keys.join() + target});
}
unit2(11, "三角形と 四角形", "10月", "へんや　ちょう点に　目を　つけて　形を　分けよう", [
  {id:"a", name:"形を　えらぶ", gen(lv){ return genShapes2(lv); }},
  {id:"b", name:"へんと　ちょう点", gen(lv){ const [nm, v] = pick([["三角形", 3], ["四角形", 4]]); return pick([() => L2(`${nm}の　へんの　数((${v}つ))`, K2_Q, "へんと　ちょう点"), () => L2(`${nm}の　ちょう点の　数((${v}つ))`, K2_Q, "へんと　ちょう点"), () => L2(`長方形の　直角の　かどの　数((4つ))`, K2_Q, "直角")])(); }},
  {id:"c", name:"長方形と　正方形の　へんの　長さ", gen(lv){ const a = ri(2, 9), b = ri(2, 9); if(lv === 0) return L2(`1つの　へんの　長さが　${a}cmの　正方形の　まわりの　長さ((${4 * a}cm))`, K2_Q, "まわりの　長さ"); if(a === b) return this.gen(lv); return L2(`たて　${a}cm，よこ　${b}cmの　長方形の　まわりの　長さ((${2 * (a + b)}cm))`, K2_Q, "まわりの　長さ"); }}
]);

const DAN_Q = (lo, hi) => ({gen(lv){
  const a = ri(lo, hi), b = ri(1, 9);
  if(lv === 0) return L2(`${a}×${b}＝<<${a * b}>>`, K2_CALC, "計算");
  if(lv === 1) return W2(pick([`1はこに　${a}こずつ　入った　おかしが　${b}はこ　あります。ぜんぶで　何こ　ありますか。`, `1つの　さらに　${a}こずつ　${b}さら　あります。ぜんぶで　何こ　ありますか。`]), `${a}×${b}＝${a * b}`, `${a * b}こ`, "かけ算");
  return L2(`${a}の　${b}ばいの　数((${a * b}))`, K2_Q, "ばい");
}});
unit2(12, "かけ算（1）", "11月", "いくつ分を　かけ算の　しきに　かこう", [
  Object.assign({id:"a", name:"5の　だん"}, DAN_Q(5, 5)), Object.assign({id:"b", name:"2の　だん"}, DAN_Q(2, 2)),
  Object.assign({id:"c", name:"3の　だん"}, DAN_Q(3, 3)), Object.assign({id:"d", name:"4の　だん"}, DAN_Q(4, 4))
]);
unit2(13, "かけ算（2）", "11月", "6から　9の　だんの　九九を　作ろう", [
  Object.assign({id:"a", name:"6の　だん"}, DAN_Q(6, 6)), Object.assign({id:"b", name:"7の　だん"}, DAN_Q(7, 7)),
  Object.assign({id:"c", name:"8の　だん"}, DAN_Q(8, 8)), Object.assign({id:"d", name:"9の　だん"}, DAN_Q(9, 9)),
  Object.assign({id:"e", name:"1の　だん"}, DAN_Q(1, 1)), Object.assign({id:"f", name:"いろいろな　だん"}, DAN_Q(1, 9))
]);
unit2(14, "かけ算（3）", "12月", "九九の　ひょうから　きまりを　見つけよう", [
  {id:"a", name:"九九の　ひょう", gen(lv){
    const dans = shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort((a, b) => a - b), hideN = lv === 0 ? 2 : lv === 1 ? 4 : 6;
    const rows = [["かける数"].concat([1, 2, 3, 4, 5, 6, 7, 8, 9].map(String))];
    dans.forEach(d => { const hide = new Set(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, hideN)); rows.push([`${d}の　だん`].concat([1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => hide.has(k) ? `[[${d * k}]]` : String(d * k)))); });
    return tableItem("", rows, ["九九の　ひょうの　あいて　いる　ところに，数を　書きましょう。"], {inst:K2_Q, lead:"九九の　ひょう", headRow:true});
  }},
  {id:"b", name:"九九を　こえた　かけ算", gen(lv){ const a = ri(2, 9), b = ri(10, 12); return R() < 0.5 ? L2(`${a}×${b}＝<<${a * b}>>`, K2_CALC, "計算") : L2(`${b}×${a}＝<<${a * b}>>`, K2_CALC, "計算"); }},
  {id:"c", name:"かけ算の　きまり", gen(lv){ const a = ri(2, 9), b = ri(2, 9); return lv === 0 ? L2(`${a}×${b}＝${b}×[[${a}]]`, K2_BOX, "□に　あう　数") : lv === 1 ? L2(`${a}×${b}は，${a}×${b - 1}より　[[${a}]]大きい。`, K2_BOX, "□に　あう　数") : L2(`${a}×[[${b}]]＝${a * b}`, K2_BOX, "□に　あう　数"); }}
]);

/* 分数（2年）：テープの図 */
function genFracTape(lv){
  const n = pick(lv === 0 ? [2, 4] : [2, 3, 4, 8]);
  const draw = (G, x, y, w, h, fs) => {
    const bw = w - 4, bh = 8, bx = x + 2, by = y + 2;
    G.rect(bx, by, bw / n, bh, {fill:"#cccccc", stroke:false});
    G.rect(bx, by, bw, bh, {w:0.4});
    for(let i = 1; i < n; i++) G.line(bx + bw * i / n, by, bx + bw * i / n, by + bh, {w:0.3});
  };
  return figItem(70, 12, draw, `色を　ぬった　ところは，もとの　大きさの　((${F(1, n)}))`, {inst:"色を　ぬった　ところの　大きさを，分数で　書きましょう。", lead:"分数", sig:"ft" + n});
}
unit2(15, "分数", "1月", "もとの　大きさを　分けた　1つ分を　あらわそう", [
  {id:"a", name:"分数を　読む", gen(lv){ return genFracTape(lv); }},
  {id:"b", name:"分数の　大きさ", gen(lv){ const n = pick([2, 3, 4]), k = ri(2, 6); return L2(`${n * k}この　${F(1, n)}は　[[${k}]]こです。`, K2_BOX, "□に　あう　数"); }}
]);

unit2(16, "時こくと 時間（２）", "1月", "時計を　読んで　時こくや　時間を　もとめよう", [
  {id:"a", name:"時計を　読む", gen(lv){ const h = ri(1, 12), m = ri(0, 59); return clockItem(h, m, `((${timeStr(h, m, true)}))`, {inst:"時計を　読みましょう。", lead:"時計"}); }},
  {id:"b", name:"時こくと　時間の　計算", gen(lv){
    if(lv === 2){ const a = ri(8, 11), b = ri(1, 4); return L2(`午前${a}時から　午後${b}時までの　時間((${12 - a + b}時間))`, K2_Q, "時間"); }
    const h = ri(7, 10), m = ri(4, 11) * 5, d = ri(3, 8) * 5; let M = m + d, H = h; while(M >= 60){ M -= 60; H++; }
    return L2(`${h}時${m}分の　${d}分後の　時こく((${H}時${M ? M + "分" : ""}))`, K2_Q, "時こく");
  }}
]);

unit2(17, "１００００までの 数", "2月", "10000までの　数の　しくみを　知ろう", [
  {id:"a", name:"数の　しくみ", gen(lv){
    const a = ri(1, 9), b = ri(0, 9), c = ri(0, 9), d = ri(0, 9);
    if(lv === 0) return L2(`1000を　${a}こ，100を　${b}こ，10を　${c}こ，1を　${d}こ　あわせた　数は　[[${a * 1000 + b * 100 + c * 10 + d}]]です。`, K2_BOX, "□に　あう　数");
    if(lv === 1){ const n = ri(11, 99) * 100; return L2(`${n}は，100を　[[${n / 100}]]こ　あつめた　数です。`, K2_BOX, "□に　あう　数"); }
    return L2(`10000は，1000を　[[10]]こ　あつめた　数です。`, K2_BOX, "□に　あう　数");
  }},
  {id:"b", name:"数の　線", gen(lv){
    const step = lv === 0 ? 100 : lv === 1 ? 10 : 50, start = lv === 1 ? ri(1, 8) * 1000 : 0, va = start + ri(1, 9) * step, vb = start + ri(11, 19) * step;
    return figItem(110, 16, (G, x, y, w, h, fs) => drawNumLine(G, x, y, w, fs, start, step, 20, 10, [[va, "ア"], [vb, "イ"]]), `ア((${va}))　イ((${vb}))`, {inst:"数の　線の　ア，イが　あらわす　数を　書きましょう。", lead:"数の　線", sig:"nl" + va + vb});
  }},
  {id:"c", name:"数の　大小", gen(lv){ const a = ri(1000, 9999), b = lv === 2 ? a + pick([-1, 1]) * ri(1, 9) * 10 : ri(1000, 9999); if(a === b || b > 9999) return this.gen(lv); return L2(`${a}[[${a > b ? "＞" : "＜"}]]${b}`, "[[ ]]に，＞か　＜を　書きましょう。", "大小"); }},
  {id:"d", name:"何百の　計算", gen(lv){ const a = ri(2, 9), b = ri(2, 9); return R() < 0.5 ? L2(`${a * 100}＋${b * 100}＝<<${(a + b) * 100}>>`, K2_CALC, "計算") : L2(`${(a + b) * 100}－${b * 100}＝<<${a * 100}>>`, K2_CALC, "計算"); }}
]);

unit2(18, "長さ（2）", "2月", "mを　つかって　長い　ものを　はかろう", [
  {id:"a", name:"mと　cm", gen(lv){ const m = ri(1, 5), c = ri(1, 99); if(lv === 0) return L2(`${m}m＝[[${m * 100}]]cm`, K2_BOX, "□に　あう　数"); return R() < 0.5 ? L2(`${m}m${c}cm＝[[${m * 100 + c}]]cm`, K2_BOX, "□に　あう　数") : L2(`${m * 100 + c}cm＝[[${m}]]m[[${c}]]cm`, K2_BOX, "□に　あう　数"); }},
  {id:"b", name:"長さの　計算", gen(lv){ for(;;){ const m = ri(1, 3), c = ri(10, 80), d = ri(10, 90); if(c + d >= 100) continue; return R() < 0.5 ? L2(`${m}m${c}cm＋${d}cm＝[[${m}]]m[[${c + d}]]cm`, K2_BOX, "□に　あう　数") : L2(`${m}m${c + d}cm－${d}cm＝[[${m}]]m[[${c}]]cm`, K2_BOX, "□に　あう　数"); } }}
]);

unit2(19, "たし算と ひき算（２）", "3月", "図を　かいて，たすか　ひくかを　考えよう", [
  {id:"a", name:"文しょうだい", gen(lv){
    const a = ri(12, 40), b = ri(5, 25);
    if(lv === 0) return W2(`赤い　花が　${a}本，白い　花が　${b}本　さいて　います。赤い　花は　白い　花より　何本　多いですか。`.replace(/(\d+)本/g, "$1本"), `${a}－${b}＝${a - b}`, `${a - b}本`);
    if(lv === 1) return W2(`いちごが　何こか　ありました。${b}こ　食べたので，のこりが　${a}こに　なりました。はじめに　何こ　ありましたか。`, `${a}＋${b}＝${a + b}`, `${a + b}こ`);
    return W2(`子どもが　何人か　あそんで　いました。そこへ　${b}人　きたので，${a + b}人に　なりました。はじめに　何人　いましたか。`, `${a + b}－${b}＝${a}`, `${a}人`);
  }}
]);

unit2(20, "しりょうの せいり", "3月", "しらべた　ことを　わかりやすく　まとめよう", [
  {id:"a", name:"グラフと　ひょう", gen(lv){ return R() < 0.5 ? pictoItem(2, lv) : findSub("2-1.b").gen(lv); }}
]);

unit2(21, "はこの 形", "3月", "はこの　形の　めんや　へんを　しらべよう", [
  {id:"a", name:"はこの　形の　" + "面・へん・ちょう点", gen(lv){
    if(lv < 2) return pick([() => L2(`はこの　形には，${MEN}が　いくつ　ありますか。((6つ))`, K2_Q, "はこの　形"), () => L2(`はこの　形には，へんが　いくつ　ありますか。((12))`, K2_Q, "はこの　形"), () => L2(`はこの　形には，ちょう点が　いくつ　ありますか。((8つ))`, K2_Q, "はこの　形")])();
    const a = ri(2, 6), b = ri(2, 6); if(a === b) return this.gen(lv);
    return L2(`たて　${a}cm，よこ　${b}cm，高さ　${a}cmの　はこの　形で，${a}cmの　へんは　いくつ　ありますか。((8つ))`, K2_Q, "はこの　形");
  }}
]);

unit2(22, "２年の まとめ", "3月", "2年で　ならった　ことを　たしかめよう", [
  Object.assign({id:"a", name:"数と　計算"}, pool(["2-4.a", "2-5.a", "2-8.a", "2-9.a", "2-13.f", "2-17.a", "2-14.b"])),
  Object.assign({id:"b", name:"図形と　りょう"}, pool(["2-6.a", "2-6.b", "2-10.a", "2-11.a", "2-16.a", "2-18.a"])),
  Object.assign({id:"c", name:"文しょうだいと　グラフ"}, pool(["2-7.a", "2-19.a", "2-1.a"]))
]);
GRADES[2] = U2;
