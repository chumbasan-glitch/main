/* ================= 1年の単元と問題（ひらがな・分かち書き） ================= */
const U1 = [];
function unit1(no, name, month, meate, subs){ U1.push({id:"1-" + no, no, name, month, meate, subs}); }
const K1_CALC = "けいさんを　しましょう。", K1_BOX = "[[ ]]に　あう　かずを　かきましょう。", K1_Q = "つぎの　もんだいに　こたえましょう。";
const L1 = (mk, inst, lead) => lineItem(mk, {inst, lead});
const W1 = (text, shiki, ans, lead) => wordItem(text, shiki, ans, {inst:K1_Q, lead:lead || "ぶんしょうだい"});
const HON = n => [1, 6, 8, 10].includes(n % 10 === 0 ? 10 : n % 10) || n % 10 === 0 ? "ぽん" : n % 10 === 3 ? "ぼん" : "ほん";
const hon = n => n + HON(n);
const HIKI = n => [1, 6, 8].includes(n % 10) || n % 10 === 0 ? "ぴき" : n % 10 === 3 ? "びき" : "ひき";
const hiki = n => n + HIKI(n);

/* ものを かぞえる図（5こずつ・10のまとまり） */
function drawCount(G, x, y, w, h, fs, n, shape){
  const tens = Math.floor(n / 10), ones = n % 10, s = Math.min(6.5, (w - 12) / 11, (h - 2) / 2), r = s * 0.4;
  const one = (px, py) => {
    if(shape === "flower"){ for(let k = 0; k < 5; k++){ const a = k * 2 * Math.PI / 5; G.arc(px + r * 0.5 * Math.cos(a), py + r * 0.5 * Math.sin(a), r * 0.45, 0, 2 * Math.PI, {w:0.25, fill:"#e6e6e6"}); } G.arc(px, py, r * 0.3, 0, 2 * Math.PI, {w:0.25, fill:"#999999"}); }
    else G.arc(px, py, r, 0, 2 * Math.PI, {w:0.35, fill:"#dddddd"});
  };
  const oy = y + 1 + s / 2;
  let ox = x + 2;
  if(tens){ G.rect(ox, oy - s / 2 - 0.5, 5 * s + 1, 2 * s + 1, {w:0.3}); for(let k = 0; k < 10; k++) one(ox + 0.5 + (k % 5 + 0.5) * s, oy + Math.floor(k / 5) * s); ox += 5 * s + 5; }
  for(let k = 0; k < ones; k++) one(ox + (k % 5 + 0.5) * s, oy + Math.floor(k / 5) * s);
}
function countItem(n, shape, qmk, o){ return figItem(80, n > 5 ? 15 : 8, (G, x, y, w, h, fs) => drawCount(G, x, y, w, h, fs, n, shape), qmk, Object.assign({sig:"cnt" + n}, o)); }

/* テープの ながさくらべ（ますの かず） */
function genTapes(lv){
  const a = ri(4, 14), b = ri(4, 14); if(a === b) return genTapes(lv);
  const draw = (G, x, y, w, h, fs) => { const s = Math.min(5, (w - 10) / 15); [["あ", a], ["い", b]].forEach(([nm, v], i) => { const yy = y + 2 + i * (s + 4); G.text(nm, x + 2, yy + s / 2, {size:fs * 0.8}); for(let k = 0; k < v; k++) G.rect(x + 7 + k * s, yy, s, s, {w:0.3, fill:"#e4e4e4"}); }); };
  const q = lv === 0 ? `ながい　ほうは　どちらですか。((${a > b ? "あ" : "い"}))` : `どちらが　ますの　いくつぶん　ながいですか。((${a > b ? "あ" : "い"}が　${Math.abs(a - b)}つぶん))`;
  return figItem(90, 20, draw, q, {inst:"あと　いの　テープの　ながさを　くらべましょう。", lead:"ながさくらべ", sig:"tp" + a + b});
}
/* いろいたの かずを かぞえる（さんかくの いろいた） */
function genTiles(lv){
  const cells = [], k = lv === 0 ? 2 : lv === 1 ? 3 : 4, seen = new Set(["0,0"]); cells.push([0, 0]);
  while(cells.length < k){ const [cx, cy] = pick(cells), d = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), nc = [cx + d[0], cy + d[1]]; if(!seen.has(nc.join()) && Math.abs(nc[0]) < 3 && Math.abs(nc[1]) < 2){ seen.add(nc.join()); cells.push(nc); } }
  const extra = lv === 0 ? 0 : ri(1, 2), minY = Math.min(...cells.map(c => c[1])), tops = cells.filter(c => c[1] === minY).slice(0, extra);
  const draw = (G, x, y, w, h, fs) => {
    const xs = cells.map(c => c[0]), mnx = Math.min(...xs), mxx = Math.max(...xs), s = Math.min((w - 6) / (mxx - mnx + 1), (h - 4) / (Math.max(...cells.map(c => c[1])) - minY + 1 + (extra ? 1 : 0)));
    const ox = x + 3 - mnx * s, oy = y + 2 + (extra ? s : 0) - minY * s;
    for(const [cx, cy] of cells){ const X = ox + cx * s, Y = oy + cy * s; G.rect(X, Y, s, s, {w:0.35, fill:"#e0e0e0"}); G.line(X, Y + s, X + s, Y, {w:0.35}); }
    for(const [cx, cy] of tops){ const X = ox + cx * s, Y = oy + cy * s; G.poly([[X, Y], [X + s, Y], [X, Y - s]], {w:0.35, fill:"#e0e0e0"}); }
  };
  return figItem(50, 30, draw, `((${cells.length * 2 + tops.length}まい))`, {inst:"さんかくの　いろいたを　なんまい　つかって　いますか。", lead:"いろいた", sig:JSON.stringify(cells) + tops.length});
}

unit1(1, "１０までの かず", "4月", "10までの　かずを　かぞえて　かこう", [
  {id:"a", name:"かずを　かぞえる", gen(lv){ const n = lv === 0 ? ri(1, 5) : ri(4, 10); return countItem(n, pick(["dot", "flower"]), `((${n}))`, {inst:"いくつ　ありますか。かずを　かきましょう。", lead:"かぞえる"}); }},
  {id:"b", name:"かずの　おおきさ", gen(lv){ const a = ri(0, 10), b = ri(0, 10); if(a === b) return this.gen(lv); return L1(`${a}と　${b}では，どちらが　おおきいですか。((${Math.max(a, b)}))`, K1_Q, "おおきさ"); }},
  {id:"c", name:"かずの　ならび", gen(lv){ const a = ri(0, 6); return L1(`${a}，${a + 1}，[[${a + 2}]]，${a + 3}，[[${a + 4}]]`, K1_BOX, "かずの　ならび"); }}
]);
unit1(2, "いくつと いくつ", "5月", "10を　2つの　かずに　わけて　みよう", [
  {id:"a", name:"いくつと　いくつ", gen(lv){ const n = lv === 0 ? ri(3, 6) : lv === 1 ? ri(6, 9) : 10, a = ri(1, n - 1); return R() < 0.5 ? L1(`${n}は　${a}と　[[${n - a}]]`, K1_BOX, "いくつと　いくつ") : L1(`${n}は　[[${a}]]と　${n - a}`, K1_BOX, "いくつと　いくつ"); }}
]);
const ANIMALS = ["ねこ", "いぬ", "うさぎ", "くま", "ぶた", "さる", "りす", "きつね"];
unit1(3, "なんばんめかな", "5月", "まえや　うしろから　なんばんめか　しらべよう", [
  {id:"a", name:"なんばんめ", gen(lv){
    const row = shuffle(ANIMALS).slice(0, 6), k = ri(2, 5), side = R() < 0.5;
    const q = lv < 2 ? `${side ? "まえ" : "うしろ"}から　${k}ばんめは　どれですか。((${side ? row[k - 1] : row[row.length - k]}))` : `${row[k - 1]}は，うしろから　なんばんめですか。((${row.length - k + 1}ばんめ))`;
    return L1(`まえ　〔${row.join("　")}〕　うしろ\n${q}`, K1_Q, "なんばんめ");
  }}
]);
unit1(4, "あわせて いくつ ふえると いくつ", "6月", "あわせる　ときや　ふえる　ときの　けいさんを　しよう", [
  {id:"a", name:"たしざん", gen(lv){ const a = ri(lv === 2 ? 0 : 1, 9), b = ri(lv === 2 ? 0 : 1, 10 - a); return L1(`${a}＋${b}＝<<${a + b}>>`, K1_CALC, "けいさん"); }},
  {id:"b", name:"ぶんしょうだい", gen(lv){ const a = ri(2, 7), b = ri(1, 10 - a);
    return lv === 0 ? W1(`あかい　はなが　${hon(a)}，しろい　はなが　${hon(b)}　あります。あわせて　なんぼん　ありますか。`, `${a}＋${b}＝${a + b}`, hon(a + b), "あわせて")
      : W1(`こどもが　${a}にん　あそんで　います。そこへ　${b}にん　きました。みんなで　なんにんに　なりましたか。`, `${a}＋${b}＝${a + b}`, `${a + b}にん`, "ふえると"); }}
]);
unit1(5, "のこりは いくつ ちがいは いくつ", "6月", "のこりや　ちがいを　けいさんで　もとめよう", [
  {id:"a", name:"ひきざん", gen(lv){ const a = ri(lv === 2 ? 0 : 2, 10), b = ri(lv === 2 ? 0 : 1, a); return L1(`${a}－${b}＝<<${a - b}>>`, K1_CALC, "けいさん"); }},
  {id:"b", name:"ぶんしょうだい", gen(lv){ const a = ri(4, 10), b = ri(1, a - 1);
    return lv === 0 ? W1(`あめが　${a}こ　あります。${b}こ　たべると，のこりは　なんこですか。`, `${a}－${b}＝${a - b}`, `${a - b}こ`, "のこりは")
      : W1(`いぬが　${hiki(a)}，ねこが　${hiki(b)}　います。どちらが　なんびき　おおいですか。`, `${a}－${b}＝${a - b}`, `いぬが　${hiki(a - b)}　おおい`, "ちがいは"); }}
]);
unit1(6, "いくつ あるかな", "7月", "かずを　えに　ならべて　くらべよう", [ {id:"a", name:"かずしらべ", gen(lv){ return pictoItem(1, lv); }} ]);
unit1(7, "１０より おおきい かずを かぞえよう", "7月", "20までの　かずを　かぞえて　かこう", [
  {id:"a", name:"10と　いくつ", gen(lv){ const b = ri(1, 9); return R() < 0.5 ? L1(`10と　${b}で　[[${10 + b}]]`, K1_BOX, "10と　いくつ") : L1(`${10 + b}は　10と　[[${b}]]`, K1_BOX, "10と　いくつ"); }},
  {id:"b", name:"かずを　かぞえる", gen(lv){ const n = ri(11, 20); return countItem(n, "dot", `((${n}))`, {inst:"いくつ　ありますか。かずを　かきましょう。", lead:"かぞえる"}); }},
  {id:"c", name:"たしざんと　ひきざん", gen(lv){ const b = ri(1, 9), c = ri(1, 9 - b > 0 ? 9 - b : 1); return pick([() => L1(`10＋${b}＝<<${10 + b}>>`, K1_CALC, "けいさん"), () => L1(`${10 + b}－${b}＝<<10>>`, K1_CALC, "けいさん"), () => L1(`${10 + b}＋${Math.min(c, 9 - b)}＝<<${10 + b + Math.min(c, 9 - b)}>>`, K1_CALC, "けいさん"), () => L1(`${10 + b}－${Math.min(c, b)}＝<<${10 + b - Math.min(c, b)}>>`, K1_CALC, "けいさん")])(); }},
  {id:"d", name:"かずのせん", gen(lv){ const va = ri(1, 9), vb = ri(11, 19); return figItem(110, 16, (G, x, y, w, h, fs) => drawNumLine(G, x, y, w, fs, 0, 1, 20, 5, [[va, "ア"], [vb, "イ"]]), `ア((${va}))　イ((${vb}))`, {inst:"ア，イの　ところの　かずを　かきましょう。", lead:"かずのせん", sig:"nl" + va + vb}); }}
]);
unit1(8, "なんじ なんじはん", "9月", "とけいで　なんじ，なんじはんを　よもう", [
  {id:"a", name:"とけいを　よむ", gen(lv){ const h = ri(1, 12), m = lv === 0 ? 0 : pick([0, 30]); return clockItem(h, m, `((${timeStrH(h, m)}))`, {inst:"なんじですか。", lead:"とけい"}); }}
]);
unit1(9, "かたちあそび", "9月", "かたちの　とくちょうを　みつけよう", [
  {id:"a", name:"かたちの　なかま", gen(lv){
    const Q = [["ころがる　かたち", "つつの　かたち，ボールの　かたち"], ["たかく　つめる　かたち", "はこの　かたち，つつの　かたち"], ["まるが　うつしとれる　かたち", "つつの　かたち"], ["どこから　みても　まるい　かたち", "ボールの　かたち"]];
    const [t, a] = pick(Q); return L1(`${t}を，〔はこの　かたち，つつの　かたち，ボールの　かたち〕から　ぜんぶ　えらびましょう。((${a}))`, K1_Q, "かたち");
  }}
]);
unit1(10, "たしたり ひいたり してみよう", "10月", "3つの　かずを　じゅんに　けいさんしよう", [
  {id:"a", name:"3つの　かずの　けいさん", gen(lv){
    for(;;){ const a = ri(1, 9), b = ri(1, 9), c = ri(1, 9);
      if(lv === 0 && a + b + c <= 10) return L1(`${a}＋${b}＋${c}＝<<${a + b + c}>>`, K1_CALC, "けいさん");
      if(lv === 1 && a - b - c >= 0 && a <= 10) return L1(`${a}－${b}－${c}＝<<${a - b - c}>>`, K1_CALC, "けいさん");
      if(lv === 2 && a + b <= 10 && a + b - c >= 0) return L1(`${a}＋${b}－${c}＝<<${a + b - c}>>`, K1_CALC, "けいさん"); }
  }},
  {id:"b", name:"ぶんしょうだい", gen(lv){ for(;;){ const a = ri(2, 6), b = ri(1, 4), c = ri(1, 4); if(a + b + c > 10) continue;
    return W1(`バスに　${a}にん　のって　います。つぎの　ていりゅうじょで　${b}にん　のって，そのつぎで　${c}にん　のりました。みんなで　なんにんに　なりましたか。`, `${a}＋${b}＋${c}＝${a + b + c}`, `${a + b + c}にん`, "3つの　かず"); } }}
]);
unit1(11, "たしざん", "11月", "10を　つくって　たしざんを　しよう", [
  {id:"a", name:"くりあがりの　ある　たしざん", gen(lv){ for(;;){ const a = ri(2, 9), b = ri(2, 9); if(a + b <= 10) continue; if(lv === 0 && a < 8) continue; return L1(`${a}＋${b}＝<<${a + b}>>`, K1_CALC, "けいさん"); } }},
  {id:"b", name:"ぶんしょうだい", gen(lv){ for(;;){ const a = ri(4, 9), b = ri(3, 9); if(a + b <= 10) continue; return W1(`みかんが　${a}こ，りんごが　${b}こ　あります。あわせて　なんこ　ありますか。`, `${a}＋${b}＝${a + b}`, `${a + b}こ`, "たしざん"); } }}
]);
unit1(12, "ひきざん", "11月", "10から　ひいて　ひきざんを　しよう", [
  {id:"a", name:"くりさがりの　ある　ひきざん", gen(lv){ for(;;){ const a = ri(11, 18), b = ri(2, 9); if(a - b >= 10 || a - b < 1) continue; if(lv === 0 && b < 7) continue; return L1(`${a}－${b}＝<<${a - b}>>`, K1_CALC, "けいさん"); } }},
  {id:"b", name:"ぶんしょうだい", gen(lv){ for(;;){ const a = ri(11, 18), b = ri(3, 9); if(a - b >= 10) continue; return W1(`いろがみが　${a}まい　あります。${b}まい　つかうと，のこりは　なんまいですか。`, `${a}－${b}＝${a - b}`, `${a - b}まい`, "ひきざん"); } }}
]);
unit1(13, "くらべてみよう", "12月", "どちらが　ながいか，おおいか　くらべかたを　かんがえよう", [
  {id:"a", name:"ながさくらべ", gen(lv){ return genTapes(lv); }},
  {id:"b", name:"かさくらべ", gen(lv){ const a = ri(4, 12), b = ri(4, 12); if(a === b) return this.gen(lv); return W1(`みずを　コップで　はかったら，やかんは　コップ　${a}はいぶん，ポットは　コップ　${b}はいぶん　はいりました。どちらが　コップ　なんはいぶん　おおく　はいりますか。`, `${Math.max(a, b)}－${Math.min(a, b)}＝${Math.abs(a - b)}`, `${a > b ? "やかん" : "ポット"}が　${Math.abs(a - b)}はいぶん　おおい`, "かさくらべ"); }}
]);
unit1(14, "かたちを つくろう", "1月", "いろいたを　ならべて　いろいろな　かたちを　つくろう", [ {id:"a", name:"いろいたの　かず", gen(lv){ return genTiles(lv); }} ]);
unit1(15, "大きい かずを かぞえよう", "1月", "100までの　かずの　かぞえかたや　かきかたを　しろう", [
  {id:"a", name:"かずの　しくみ", gen(lv){ const a = ri(2, 9), b = ri(0, 9); return R() < 0.5 ? L1(`10が　${a}こと　1が　${b}こで　[[${a * 10 + b}]]`, K1_BOX, "かずの　しくみ") : L1(`${a * 10 + b}は　10が　[[${a}]]こと　1が　[[${b}]]こ`, K1_BOX, "かずの　しくみ"); }},
  {id:"b", name:"かずの　ならび", gen(lv){ const a = ri(20, 95), d = lv === 0 ? 1 : lv === 1 ? 2 : 5; if(a + 4 * d > 120) return this.gen(lv); return L1(`${a}，${a + d}，[[${a + 2 * d}]]，${a + 3 * d}，[[${a + 4 * d}]]`, K1_BOX, "かずの　ならび"); }},
  {id:"c", name:"けいさん", gen(lv){ const a = ri(2, 7), b = ri(1, 9 - a), c = ri(1, 8), d = ri(1, 9 - c);
    return pick([() => L1(`${a * 10}＋${b * 10}＝<<${(a + b) * 10}>>`, K1_CALC, "けいさん"), () => L1(`${(a + b) * 10}－${b * 10}＝<<${a * 10}>>`, K1_CALC, "けいさん"), () => L1(`${a * 10 + c}＋${d}＝<<${a * 10 + c + d}>>`, K1_CALC, "けいさん"), () => L1(`${a * 10 + c + d}－${d}＝<<${a * 10 + c}>>`, K1_CALC, "けいさん")])(); }},
  {id:"d", name:"100より　大きい　かず", gen(lv){ const b = ri(1, 20); return L1(`100より　${b}　おおきい　かず((${100 + b}))`, K1_Q, "大きい　かず".replace("大きい", "おおきい")); }}
]);
unit1(16, "なんじなんぷん", "2月", "とけいで　なんじなんぷんを　よもう", [
  {id:"a", name:"とけいを　よむ", gen(lv){ const h = ri(1, 12), m = lv === 0 ? ri(1, 11) * 5 : ri(1, 59); return clockItem(h, m, `((${timeStrH(h, m)}))`, {inst:"なんじなんぷんですか。", lead:"とけい"}); }}
]);
unit1(17, "たすのかな ひくのかな ずに かいて かんがえよう", "2月", "ずを　つかって，たすか　ひくか　きめよう", [
  {id:"a", name:"ぶんしょうだい", gen(lv){
    const a = ri(3, 9), b = ri(2, 6);
    if(lv === 0) return W1(`こどもが　1れつに　ならんで　います。ゆうたさんは　まえから　${a}ばんめです。ゆうたさんの　うしろに　${b}にん　います。みんなで　なんにん　いますか。`, `${a}＋${b}＝${a + b}`, `${a + b}にん`, "ずに　かいて");
    if(lv === 1) return W1(`こどもが　${a + b}にん　います。いすが　${a}こ　あります。いすに　1にんずつ　すわると，いすに　すわれない　こどもは　なんにんですか。`, `${a + b}－${a}＝${b}`, `${b}にん`, "ずに　かいて");
    return W1(`あかい　はなが　${hon(a)}　あります。しろい　はなは，あかい　はなより　${hon(b)}　おおいです。しろい　はなは　なんぼんですか。`, `${a}＋${b}＝${a + b}`, hon(a + b), "ずに　かいて");
  }},
  {id:"b", name:"なかよく　わけよう", gen(lv){ const n = pick([2, 3]), k = ri(2, 6); return L1(`${n * k}この　あめを，${n}にんで　おなじ　かずずつ　わけます。1にん　なんこに　なりますか。((${k}こ))`, K1_Q, "わける"); }}
]);
unit1(18, "かずしらべ", "3月", "かずを　かぞえて　わかりやすく　ならべよう", [ {id:"a", name:"かずしらべ", gen(lv){ return pictoItem(1, lv); }} ]);
unit1(19, "１年の まとめを しよう", "3月", "1ねんで　ならった　ことを　たしかめよう", [
  Object.assign({id:"a", name:"かずと　けいさん"}, pool(["1-2.a", "1-4.a", "1-5.a", "1-11.a", "1-12.a", "1-15.a", "1-15.c"])),
  Object.assign({id:"b", name:"とけいと　かたち"}, pool(["1-8.a", "1-16.a", "1-13.a", "1-14.a"])),
  Object.assign({id:"c", name:"ぶんしょうだい"}, pool(["1-4.b", "1-5.b", "1-11.b", "1-12.b", "1-17.a"]))
]);
GRADES[1] = U1;
