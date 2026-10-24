/* ================= 問題の種類をふやす（意味のちがう問題を加える） =================
   数だけをかえるのではなく，問い方や場面・考え方のちがう問題を加える。
   もとの問題はそのまま残し，ほかの種類とまぜて出す。 */
const sceneN = (name, fns, lv) => {
  const keys = fns.map((_, i) => name + "#" + i), us = keys.map(k => SCENE_USE.get(k) || 0), m = Math.min(...us);
  const i = pick(fns.map((f, j) => j).filter(j => us[j] === m));
  SCENE_USE.set(keys[i], m + 1);
  return fns[i](lv);
};
/* もとの問題（base）と新しい種類（types）をまぜる。base は少し多めに出す */
function vary(ref, types, pBase){
  const s = findSub(ref), base = s.gen;
  s.gen = function(lv){
    if(R() < (pBase === undefined ? 0.4 : pBase)) return base.call(s, lv);
    return sceneN(ref, types, lv);
  };
}

/* ---------- 1年 ---------- */
/* 2れつの ○の かずくらべ */
function dotsCompare(lv){
  const a = ri(2, lv === 0 ? 7 : 10), b = ri(2, lv === 0 ? 7 : 10); if(a === b) return dotsCompare(lv);
  const draw = (G, x, y, w, h, fs) => { const s = Math.min(6, (w - 12) / 10); [["あ", a], ["い", b]].forEach(([nm, v], i) => { const yy = y + 2 + i * (s + 3) + s / 2; G.text(nm, x + 2, yy, {size:fs * 0.8}); for(let k = 0; k < v; k++) G.arc(x + 9 + (k + 0.5) * s, yy, s * 0.38, 0, 2 * Math.PI, {w:0.3, fill:"#dddddd"}); }); };
  const q = lv === 0 ? `おおい　ほうは　どちらですか。((${a > b ? "あ" : "い"}))` : `どちらが　いくつ　おおいですか。((${a > b ? "あ" : "い"}が　${Math.abs(a - b)}こ　おおい))`;
  return figItem(80, 20, draw, q, {inst:"あと　いの　○の　かずを　くらべましょう。", lead:"かずくらべ", sig:"dc" + a + b + lv});
}
vary("1-1.a", [
  lv => dotsCompare(lv),
  lv => { const n = ri(6, 10); return countItem(n, "dot", `5と　((${n - 5}))で　${n}`, {inst:"○を　みて　こたえましょう。", lead:"5と　いくつ", sig:"5i" + n}); },
  lv => { const n = ri(1, 9); return countItem(n, "flower", `あと　((${10 - n}))こで　10`, {inst:"はなは　あと　いくつで　10に　なりますか。", lead:"あと　いくつ", sig:"a10" + n}); }
]);
vary("1-1.b", [
  lv => { const v = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3); return L1(`${v.join("，")}の　なかで　いちばん　おおきい　かず((${Math.max(...v)}))`, K1_Q, "おおきさ"); },
  lv => { const v = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 3); return L1(`${v.join("，")}の　なかで　いちばん　ちいさい　かず((${Math.min(...v)}))`, K1_Q, "おおきさ"); },
  lv => { const a = ri(0, 8), d = ri(1, 2); return L1(`${a}より　${d}　おおきい　かず((${a + d}))`, K1_Q, "おおきさ"); },
  lv => { const a = ri(3, 10), d = ri(1, 2); return L1(`${a}より　${d}　ちいさい　かず((${a - d}))`, K1_Q, "おおきさ"); },
  lv => { const v = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4); return L1(`${v.join("，")}を　ちいさい　じゅんに　ならべましょう。((${[...v].sort((p, q) => p - q).join("，")}))`, K1_Q, "おおきさ"); }
]);
vary("1-1.c", [
  lv => { const a = ri(5, 10); return L1(`${a}，${a - 1}，[[${a - 2}]]，${a - 3}，[[${a - 4}]]`, K1_BOX, "かずの　ならび"); },
  lv => { const a = ri(0, 9); return L1(`${a}の　つぎの　かず((${a + 1}))`, K1_Q, "かずの　ならび"); },
  lv => { const a = ri(1, 10); return L1(`${a}の　まえの　かず((${a - 1}))`, K1_Q, "かずの　ならび"); },
  lv => { const a = ri(0, 4); return L1(`${a}，${a + 2}，[[${a + 4}]]，${a + 6}`, "2ずつ　ふえて　います。" + K1_BOX, "かずの　ならび"); }
]);
vary("1-2.a", [
  lv => { const n = lv === 2 ? 10 : ri(5, 9), a = ri(1, n - 1); return L1(`${a}と　${n - a}で　[[${n}]]`, K1_BOX, "いくつと　いくつ"); },
  lv => { const a = ri(1, 9); return L1(`${a}は　あと　[[${10 - a}]]で　10`, K1_BOX, "いくつと　いくつ"); },
  lv => { const a = ri(1, 9), b = 10 - a, c = ri(1, 9), d = ri(1, 9); if(c + d === 10 || c === a) return null;
    const ch = shuffle([`${a}と　${b}`, `${c}と　${d}`]); return L1(`〔${ch.join("，")}〕で，あわせて　10に　なるのは　どちらですか。((${a}と　${b}))`, K1_Q, "いくつと　いくつ"); },
  lv => { const n = ri(4, 6), ps = []; for(let a = 1; a < n; a++) ps.push(`${a}と　${n - a}`); return L1(`${n}を　2つの　かずに　わけます。わけかたは　ぜんぶで　なんとおり　ありますか。((${n - 1}とおり))`, K1_Q, "いくつと　いくつ"); }
]);
vary("1-3.a", [
  lv => { const row = shuffle(ANIMALS).slice(0, 6), k = ri(2, 4), side = R() < 0.5; const sel = side ? row.slice(0, k) : row.slice(-k);
    return L1(`まえ　〔${row.join("　")}〕　うしろ\n${side ? "まえ" : "うしろ"}から　${k}ひきを　ぜんぶ　かきましょう。((${sel.join("，")}))`, K1_Q, "なんばんめ"); },
  lv => { const row = shuffle(ANIMALS).slice(0, 6), k = ri(1, 4); return L1(`まえ　〔${row.join("　")}〕　うしろ\n${row[k]}の　まえには　なんびき　いますか。((${hiki(k)}))`, K1_Q, "なんばんめ"); },
  lv => { const row = shuffle(ANIMALS).slice(0, 6), k = ri(1, 4); return L1(`まえ　〔${row.join("　")}〕　うしろ\n${row[k]}の　すぐ　うしろは　どれですか。((${row[k + 1]}))`, K1_Q, "なんばんめ"); }
]);
const addTypes = (lo, hi, carry) => [
  lv => { for(;;){ const a = ri(lo, hi), b = ri(1, 9), c = a + b; if(carry ? c <= 10 || c > 18 : c > 10) continue; return L1(`${a}＋[[${b}]]＝${c}`, K1_BOX, "けいさん"); } },
  lv => { for(;;){ const a = ri(1, 9), b = ri(lo, hi), c = a + b; if(carry ? c <= 10 || c > 18 : c > 10) continue; return L1(`[[${a}]]＋${b}＝${c}`, K1_BOX, "けいさん"); } },
  lv => { for(;;){ const a = ri(lo, hi), b = ri(1, 9), c = ri(carry ? 11 : 2, carry ? 18 : 10); if(a + b === c || (carry ? a + b <= 10 || a + b > 18 : a + b > 10)) continue; return L1(`${a}＋${b}と　${c}では，どちらが　おおきいですか。((${a + b > c ? `${a}＋${b}` : c}))`, K1_Q, "けいさん"); } },
  lv => { for(;;){ const c = ri(carry ? 11 : 4, carry ? 18 : 10), a = ri(1, 9), b = c - a, d = ri(1, 9), e = ri(1, 9); if(b < 1 || b > 9 || d + e === c || (carry && d + e <= 10)) continue;
    const ch = shuffle([`${a}＋${b}`, `${d}＋${e}`]); return L1(`こたえが　${c}に　なる　しきは　どちらですか。〔${ch.join("，")}〕((${a}＋${b}))`, K1_Q, "けいさん"); } }
];
vary("1-4.a", addTypes(1, 8, false));
const subTypes = (carry) => [
  lv => { for(;;){ const a = carry ? ri(11, 18) : ri(3, 10), b = ri(1, 9), c = a - b; if(c < 1 || (carry && c >= 10)) continue; return L1(`${a}－[[${b}]]＝${c}`, K1_BOX, "けいさん"); } },
  lv => { for(;;){ const a = carry ? ri(11, 18) : ri(3, 10), b = ri(1, 9), c = a - b; if(c < 1 || (carry && c >= 10)) continue; return L1(`[[${a}]]－${b}＝${c}`, K1_BOX, "けいさん"); } },
  lv => { for(;;){ const a = carry ? ri(11, 18) : ri(3, 10), b = ri(1, 9), c = ri(1, 9); if(a - b < 1 || a - b === c || (carry && a - b >= 10)) continue; return L1(`${a}－${b}と　${c}では，どちらが　おおきいですか。((${a - b > c ? `${a}－${b}` : c}))`, K1_Q, "けいさん"); } },
  lv => { for(;;){ const a = carry ? ri(11, 18) : ri(4, 10), b = ri(1, 9), c = ri(1, 9); if(a - b < 1 || a - c < 1 || b === c || (carry && (a - b >= 10 || a - c >= 10))) continue;
    return L1(`${a}－${b}と　${a}－${c}では，こたえが　おおきいのは　どちらですか。((${b < c ? `${a}－${b}` : `${a}－${c}`}))`, K1_Q, "けいさん"); } }
];
vary("1-5.a", subTypes(false));
vary("1-7.a", [
  lv => { const b = ri(1, 9); return L1(`10より　${b}　おおきい　かず((${10 + b}))`, K1_Q, "10と　いくつ"); },
  lv => { const n = ri(11, 20); return L1(`${n}より　1　ちいさい　かず((${n - 1}))`, K1_Q, "10と　いくつ"); },
  lv => { const b = ri(0, 9); return L1(`10が　1こと　1が　${b}こで　[[${10 + b}]]`, K1_BOX, "10と　いくつ"); },
  lv => { const a = ri(11, 19), b = ri(11, 19); if(a === b) return null; return L1(`${a}と　${b}では，どちらが　おおきいですか。((${Math.max(a, b)}))`, K1_Q, "10と　いくつ"); }
]);
vary("1-7.b", [
  lv => { const a = pick([2, 4, 6]); return L1(`${a}，${a + 2}，${a + 4}，[[${a + 6}]]，[[${a + 8}]]`, "2ずつ　かぞえます。" + K1_BOX, "かぞえる"); },
  lv => L1(`5，10，[[15]]，[[20]]`, "5ずつ　かぞえます。" + K1_BOX, "かぞえる"),
  lv => { const a = ri(14, 20); return L1(`${a}，${a - 1}，[[${a - 2}]]，${a - 3}，[[${a - 4}]]`, K1_BOX, "かぞえる"); }
]);
vary("1-7.c", [
  lv => { const b = ri(1, 7), c = ri(1, 9 - b); return L1(`${10 + b}＋${c}＝<<${10 + b + c}>>`, K1_CALC, "けいさん"); },
  lv => { const b = ri(2, 9), c = ri(1, b - 1); return L1(`${10 + b}－${c}＝<<${10 + b - c}>>`, K1_CALC, "けいさん"); },
  lv => { const b = ri(1, 9); return L1(`10＋[[${b}]]＝${10 + b}`, K1_BOX, "けいさん"); },
  lv => { const b = ri(3, 9), c = ri(1, b - 1); return L1(`${10 + b}－[[${c}]]＝${10 + b - c}`, K1_BOX, "けいさん"); },
  lv => { const b = ri(1, 8), c = ri(1, 9 - b), d = 10 + b + c + pick([-2, -1, 1, 2]); return L1(`${10 + b}＋${c}と　${d}では，どちらが　おおきいですか。((${10 + b + c > d ? `${10 + b}＋${c}` : d}))`, K1_Q, "けいさん"); }
]);
vary("1-8.a", [
  lv => { const h = ri(1, 12); return L1(`みじかい　はりが　${h}，ながい　はりが　12を　さして　います。なんじですか。((${h}じ))`, K1_Q, "とけい"); },
  lv => { const h = ri(1, 12); return L1(`${h}じはんの　とき，ながい　はりは　どの　すうじを　さして　いますか。((6))`, K1_Q, "とけい"); },
  lv => { const h = ri(1, 11); return L1(`${h}じの　つぎに　ながい　はりが　12を　さすのは　なんじですか。((${h + 1}じ))`, K1_Q, "とけい"); }
]);
const SHAPE_OBJ = {"はこの　かたち":["ティッシュの　はこ", "さいころ", "きゅうしょくの　ぎゅうにゅうパック", "つみき（しかく）", "おかしの　はこ"], "つつの　かたち":["ジュースの　かん", "トイレットペーパーの　しん", "のりの　いれもの", "ラップの　しん", "ちょきんばこ（まるい）"], "ボールの　かたち":["サッカーボール", "ビーだま", "みかん", "スーパーボール", "ゴムまり"]};
vary("1-9.a", [
  lv => { const ks = Object.keys(SHAPE_OBJ), k = pick(ks), right = pick(SHAPE_OBJ[k]), others = ks.filter(x => x !== k).map(x => pick(SHAPE_OBJ[x]));
    return L1(`${k}の　ものは　どれですか。〔${shuffle([right, ...others]).join("，")}〕((${right}))`, K1_Q, "かたち"); },
  lv => { const ks = Object.keys(SHAPE_OBJ), k = pick(ks), o = pick(SHAPE_OBJ[k]); return L1(`「${o}」は，〔はこの　かたち，つつの　かたち，ボールの　かたち〕の　どれの　なかまですか。((${k}))`, K1_Q, "かたち"); },
  lv => L1(`どの　むきにも　よく　ころがるのは，〔はこの　かたち，つつの　かたち，ボールの　かたち〕の　どれですか。((ボールの　かたち))`, K1_Q, "かたち"),
  lv => L1(`しかくが　うつしとれるのは，〔はこの　かたち，つつの　かたち，ボールの　かたち〕の　どれですか。((はこの　かたち))`, K1_Q, "かたち")
], 0.3);
vary("1-10.a", [
  lv => { for(;;){ const a = ri(3, 9), b = ri(1, a), c = ri(1, 9); if(a - b + c > 10) continue; return L1(`${a}－${b}＋${c}＝<<${a - b + c}>>`, K1_CALC, "けいさん"); } },
  lv => { for(;;){ const a = ri(1, 6), b = ri(1, 6), c = ri(1, 9); if(a + b + c > 10) continue; return L1(`${a}＋${b}＋[[${c}]]＝${a + b + c}`, K1_BOX, "けいさん"); } },
  lv => { for(;;){ const a = ri(5, 10), b = ri(1, 4), c = ri(1, 4); if(a - b - c < 0) continue; return L1(`${a}－${b}－[[${c}]]＝${a - b - c}`, K1_BOX, "けいさん"); } }
]);
vary("1-10.b", [
  lv => { for(;;){ const a = ri(4, 9), b = ri(1, 4), c = ri(1, 4); if(a - b - c < 1) continue; return W1(`くりが　${a}こ　あります。おとうとが　${b}こ，いもうとが　${c}こ　たべました。くりは　なんこ　のこって　いますか。`, `${a}－${b}－${c}＝${a - b - c}`, `${a - b - c}こ`, "3つの　かず"); } },
  lv => { for(;;){ const a = ri(4, 9), b = ri(1, 4), c = ri(1, 5); if(a - b + c > 10 || a - b < 1) continue; return W1(`こうえんで　こどもが　${a}にん　あそんで　いました。${b}にん　かえって，そのあと　${c}にん　きました。いま　なんにん　いますか。`, `${a}－${b}＋${c}＝${a - b + c}`, `${a - b + c}にん`, "3つの　かず"); } },
  lv => { for(;;){ const a = ri(1, 4), b = ri(1, 4), c = ri(1, 4); if(a + b + c > 10) continue; return W1(`おりがみで　つるを　あさ　${a}わ，ひるに　${b}わ，よるに　${c}わ　おりました。ぜんぶで　なんわ　おりましたか。`, `${a}＋${b}＋${c}＝${a + b + c}`, `${a + b + c}わ`, "3つの　かず"); } }
], 0.3);
vary("1-11.a", addTypes(2, 9, true).concat([
  lv => { for(;;){ const a = ri(7, 9), b = ri(2, 9); if(a + b <= 10) continue; const k = 10 - a; return L1(`${a}＋${b}の　けいさん：${b}を　${k}と　[[${b - k}]]に　わける。${a}と　${k}で　10。10と　${b - k}で　[[${a + b}]]`, K1_BOX, "10を　つくる"); } }
]));
vary("1-12.a", subTypes(true).concat([
  lv => { for(;;){ const a = ri(11, 18), b = ri(2, 9); if(a - b >= 10) continue; const o = a - 10; return L1(`${a}－${b}の　けいさん：${a}を　10と　[[${o}]]に　わける。10－${b}で　[[${10 - b}]]。${10 - b}と　${o}で　[[${a - b}]]`, K1_BOX, "10から　ひく"); } }
]));
vary("1-11.b", [
  lv => { for(;;){ const a = ri(5, 9), b = ri(3, 9); if(a + b <= 10) continue; return W1(`バスに　${a}にん　のって　います。つぎの　ていりゅうじょで　${b}にん　のって　きました。バスには　なんにん　のって　いますか。`, `${a}＋${b}＝${a + b}`, `${a + b}にん`, "ふえると"); } },
  lv => { for(;;){ const a = ri(5, 9), b = ri(3, 9); if(a + b <= 10) continue; return W1(`えんぴつを　${hon(a)}　もって　います。おにいさんから　${hon(b)}　もらいました。えんぴつは　なんぼんに　なりましたか。`, `${a}＋${b}＝${a + b}`, hon(a + b), "ふえると"); } },
  lv => { for(;;){ const a = ri(5, 9), b = ri(3, 9); if(a + b <= 10) continue; return W1(`クッキーを　あねは　${a}まい，わたしは　あねより　${b}まい　おおく　やきました。わたしは　なんまい　やきましたか。`, `${a}＋${b}＝${a + b}`, `${a + b}まい`, "おおい　ほう"); } }
], 0.3);
vary("1-12.b", [
  lv => { for(;;){ const a = ri(11, 18), b = ri(3, 9); if(a - b >= 10) continue; return W1(`あかい　ふうせんが　${a}こ，あおい　ふうせんが　${b}こ　あります。あかい　ふうせんは　なんこ　おおいですか。`, `${a}－${b}＝${a - b}`, `${a - b}こ`, "ちがいは"); } },
  lv => { for(;;){ const a = ri(11, 18), b = ri(3, 9); if(a - b >= 10) continue; return W1(`${a}にんで　かくれんぼを　します。おにが　${b}にん　みつけました。まだ　みつかって　いないのは　なんにんですか。`, `${a}－${b}＝${a - b}`, `${a - b}にん`, "のこりは"); } },
  lv => { for(;;){ const a = ri(11, 18), b = ri(3, 9); if(a - b >= 10) continue; return W1(`シールが　${a}まい　あります。そのうち　${b}まいは　ほしの　シールです。ほしでは　ない　シールは　なんまいですか。`, `${a}－${b}＝${a - b}`, `${a - b}まい`, "のこりは"); } }
], 0.3);
vary("1-13.a", [
  lv => { const v = shuffle([5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 3), nm = ["あ", "い", "う"];
    const draw = (G, x, y, w, h, fs) => { const s = Math.min(5, (w - 10) / 13); v.forEach((n, i) => { const yy = y + 2 + i * (s + 3); G.text(nm[i], x + 2, yy + s / 2, {size:fs * 0.8}); for(let k = 0; k < n; k++) G.rect(x + 7 + k * s, yy, s, s, {w:0.3, fill:"#e4e4e4"}); }); };
    const mx = v.indexOf(Math.max(...v)), mn = v.indexOf(Math.min(...v));
    return figItem(80, 26, draw, lv === 0 ? `いちばん　ながいのは　どれですか。((${nm[mx]}))` : `いちばん　ながい　テープと　いちばん　みじかい　テープの　ちがいは　ますの　いくつぶんですか。((${v[mx] - v[mn]}つぶん))`, {inst:"あ，い，うの　テープの　ながさを　くらべましょう。", lead:"ながさくらべ", sig:"t3" + v.join() + lv}); },
  lv => { const a = ri(5, 12), b = ri(5, 12); if(a === b) return null; return L1(`えんぴつ　あは　けしゴム　${a}こぶん，えんぴつ　いは　けしゴム　${b}こぶんの　ながさです。どちらが　けしゴム　なんこぶん　ながいですか。((${a > b ? "あ" : "い"}が　${Math.abs(a - b)}こぶん))`, K1_Q, "ながさくらべ"); },
  lv => L1(`つくえの　たてと　よこの　ながさを　くらべます。うごかせない　ものの　ながさを　くらべる　ときは，なにを　つかうと　よいですか。〔テープ，みず，コップ〕((テープ))`, K1_Q, "ながさくらべ")
], 0.5);
vary("1-13.b", [
  lv => { const p = pick([["やかん", "ポット"], ["すいとう", "びん"], ["バケツ", "なべ"]]); return L1(`${p[0]}に　みずを　いっぱい　いれて，${p[1]}に　うつしたら，${p[1]}から　みずが　あふれました。おおく　はいるのは　どちらですか。((${p[0]}))`, K1_Q, "かさくらべ"); },
  lv => { const a = ri(3, 9), b = ri(3, 9), c = ri(3, 9); if(new Set([a, b, c]).size < 3) return null; const nm = ["あ", "い", "う"], v = [a, b, c], mx = v.indexOf(Math.max(...v));
    return L1(`みずを　コップで　はかったら，あは　${a}はいぶん，いは　${b}はいぶん，うは　${c}はいぶんでした。いちばん　おおく　はいるのは　どれですか。((${nm[mx]}))`, K1_Q, "かさくらべ"); }
], 0.5);
vary("1-14.a", [
  lv => { const n = ri(1, 3); return L1(`ぼうを　3ぼん　つかうと，さんかくが　1つ　できます。はなれた　さんかくを　${n}つ　つくるには，ぼうは　なんぼん　いりますか。((${hon(3 * n)}))`, K1_Q, "かたちづくり"); },
  lv => { const n = ri(1, 2); return L1(`ぼうを　4ほん　つかうと，しかくが　1つ　できます。はなれた　しかくを　${n}つ　つくるには，ぼうは　なんぼん　いりますか。((${hon(4 * n)}))`, K1_Q, "かたちづくり"); },
  lv => { const n = ri(1, 4); return L1(`さんかくの　いろいた　2まいで，しかくが　1つ　できます。しかくを　${n}つ　つくるには，さんかくの　いろいたは　なんまい　いりますか。((${2 * n}まい))`, K1_Q, "いろいた"); }
], 0.4);
vary("1-15.a", [
  lv => { const a = ri(2, 9), b = ri(0, 9); return L1(`10えんだまが　${a}こと，1えんだまが　${b}こで　なんえんですか。((${a * 10 + b}えん))`, K1_Q, "かずの　しくみ"); },
  lv => { const a = ri(2, 9), b = ri(1, 9); return L1(`${a * 10 + b}は　${a * 10}と　[[${b}]]`, K1_BOX, "かずの　しくみ"); },
  lv => { const a = ri(1, 9), b = ri(0, 9); return L1(`十の　くらいが　${a}，一の　くらいが　${b}の　かず((${a * 10 + b}))`.replace(/十/g, "じゅう").replace(/一の/g, "いちの"), K1_Q, "かずの　しくみ"); },
  lv => L1(`100は　10を　[[10]]こ　あつめた　かず`, K1_BOX, "かずの　しくみ")
]);
vary("1-15.b", [
  lv => { const a = ri(40, 100), d = lv === 0 ? 1 : lv === 1 ? 2 : 5; if(a - 4 * d < 20) return null; return L1(`${a}，${a - d}，[[${a - 2 * d}]]，${a - 3 * d}，[[${a - 4 * d}]]`, K1_BOX, "かずの　ならび"); },
  lv => { const a = ri(1, 9), b = ri(1, 9); if(a === b) return null; return L1(`${a * 10 + b}と　${b * 10 + a}では，どちらが　おおきいですか。((${Math.max(a * 10 + b, b * 10 + a)}))`, K1_Q, "かずの　ならび"); },
  lv => { const a = ri(30, 99), d = pick([1, 2, 10]); return L1(`${a}より　${d}　ちいさい　かず((${a - d}))`, K1_Q, "かずの　ならび"); }
]);
vary("1-15.c", [
  lv => { const a = ri(2, 8), b = ri(1, 9 - a); return L1(`${a * 10}＋[[${b * 10}]]＝${(a + b) * 10}`, K1_BOX, "けいさん"); },
  lv => { const a = ri(2, 9), c = ri(2, 9), d = ri(1, c - 1); return L1(`${a * 10 + c}－${d}＝<<${a * 10 + c - d}>>`, K1_CALC, "けいさん"); },
  lv => { const a = ri(2, 9), c = ri(1, 9); return L1(`${a * 10 + c}－${c}＝<<${a * 10}>>`, K1_CALC, "けいさん"); }
]);
vary("1-15.d", [
  lv => { const b = ri(1, 20); return L1(`100と　${b}で　[[${100 + b}]]`, K1_BOX, "おおきい　かず"); },
  lv => { const n = ri(101, 120); return L1(`${n}より　1　ちいさい　かず((${n - 1}))`, K1_Q, "おおきい　かず"); },
  lv => { const n = ri(102, 118); return L1(`${n - 1}，${n}，[[${n + 1}]]，[[${n + 2}]]`, K1_BOX, "おおきい　かず"); }
]);
vary("1-16.a", [
  lv => { const h = ri(1, 12), k = ri(1, 11); return L1(`みじかい　はりが　${h}と　${h % 12 + 1}の　あいだ，ながい　はりが　${k}を　さして　います。なんじなんぷんですか。((${timeStrH(h, k * 5)}))`, K1_Q, "とけい"); },
  lv => { const h = ri(1, 12), k = ri(1, 11); return L1(`${timeStrH(h, k * 5)}の　とき，ながい　はりは　どの　すうじを　さして　いますか。((${k}))`, K1_Q, "とけい"); }
], 0.5);
vary("1-17.a", [
  lv => { const a = ri(2, 6), b = ri(2, 6); return W1(`こどもが　1れつに　ならんで　います。あおいさんは　まえから　${a}ばんめで，うしろから　${b}ばんめです。こどもは　ぜんぶで　なんにん　いますか。`, `${a}＋${b}－1＝${a + b - 1}`, `${a + b - 1}にん`, "ずに　かいて"); },
  lv => { const n = ri(7, 10), k = ri(2, n - 2); return W1(`${n}にんが　1れつに　ならんで　います。けんとさんは　まえから　${k}ばんめです。けんとさんの　うしろには　なんにん　いますか。`, `${n}－${k}＝${n - k}`, `${n - k}にん`, "ずに　かいて"); },
  lv => { const a = ri(3, 8), b = ri(2, 5); return W1(`ケーキが　${a}こ　あります。おさらは　ケーキより　${b}まい　おおいです。おさらは　なんまい　ありますか。`, `${a}＋${b}＝${a + b}`, `${a + b}まい`, "ずに　かいて"); }
], 0.4);
vary("1-17.b", [
  lv => { const k = pick([2, 3]), n = ri(2, 5); return L1(`${n * k}この　あめを，1にんに　${k}こずつ　くばります。なんにんに　くばれますか。((${n}にん))`, K1_Q, "わけかた"); },
  lv => { const k = pick([2, 3]), n = ri(2, 4); return L1(`1にんに　${k}こずつ，${n}にんに　あめを　くばります。あめは　ぜんぶで　なんこ　いりますか。((${n * k}こ))`, K1_Q, "わけかた"); }
], 0.4);

/* ---------- 2年 ---------- */
const FR2 = ["りんご", "みかん", "いちご", "バナナ", "ぶどう", "もも"];
vary("2-1.b", [
  lv => { const f = shuffle(FR2).slice(0, 4), v = f.map(() => ri(2, 9)); if(new Set(v).size < 4) return null; const mx = v.indexOf(Math.max(...v));
    return L2(`すきな　くだもの　〔${f.map((x, i) => `${x}　${v[i]}人`).join("，")}〕\nいちばん　多いのは　どれですか。((${f[mx]}))`, K2_Q, "ひょう"); },
  lv => { const f = shuffle(FR2).slice(0, 4), v = f.map(() => ri(2, 9)); if(v[0] === v[1]) return null;
    return L2(`すきな　くだもの　〔${f.map((x, i) => `${x}　${v[i]}人`).join("，")}〕\n${f[0]}と　${f[1]}の　人数の　ちがいは　何人ですか。((${Math.abs(v[0] - v[1])}人))`, K2_Q, "ひょう"); },
  lv => { const f = shuffle(FR2).slice(0, 4), v = f.map(() => ri(2, 9));
    return L2(`すきな　くだもの　〔${f.map((x, i) => `${x}　${v[i]}人`).join("，")}〕\nしらべた　人数は　ぜんぶで　何人ですか。((${v.reduce((p, q) => p + q, 0)}人))`, K2_Q, "ひょう"); }
], 0.4);
vary("2-2.a", [
  lv => { const h = ri(1, 12), k = ri(1, 11); return L2(`みじかい　はりが　${h}と　${h % 12 + 1}の　間，長い　はりが　${k}を　さして　います。何時何分ですか。((${h}時${k * 5}分))`, K2_Q, "時計"); },
  lv => L2(`長い　はりが　1まわりする　時間は　何分ですか。((60分))`, K2_Q, "時計"),
  lv => { const m = ri(1, 11) * 5; return L2(`長い　はりが　${m / 5}を　さして　いる　とき，何分を　あらわしますか。((${m}分))`, K2_Q, "時計"); }
], 0.5);
vary("2-2.b", [
  lv => { const h = ri(7, 8), m1 = ri(0, 3) * 5, d = ri(2, 8) * 5; return L2(`家を　${h}時${m1 ? m1 + "分" : ""}に　出て，学校に　${h}時${m1 + d}分に　つきました。何分　かかりましたか。((${d}分))`, K2_Q, "時間"); },
  lv => { const h = ri(2, 10), m = ri(4, 11) * 5, d = pick([10, 20, 30]); if(m - d < 0) return null; return L2(`${h}時${m}分の　${d}分前の　時こく((${h}時${m - d === 0 ? "" : (m - d) + "分"}))`.replace(/時\(\(/, "時(("), K2_Q, "時こく"); },
  lv => { const a = ri(8, 11), b = ri(1, 4); return L2(`午前${a}時から　午後${b}時までは　何時間ですか。((${12 - a + b}時間))`, K2_Q, "時間"); },
  lv => { const h = ri(1, 9), d = ri(1, 3); return L2(`午後${h}時の　${d}時間あとの　時こく((午後${h + d}時))`, K2_Q, "時こく"); }
], 0.4);
vary("2-2.c", [
  lv => L2(`正午は，午前　何時と　同じですか。((午前12時))`, K2_Q, "1日の　時間"),
  lv => L2(`みじかい　はりは，1日に　何回　まわりますか。((2回))`, K2_Q, "1日の　時間"),
  lv => L2(`長い　はりは，1日に　何回　まわりますか。((24回))`, K2_Q, "1日の　時間"),
  lv => L2(`1時間＝[[60]]分，1日＝[[24]]時間`, K2_BOX, "□に　あう　数"),
  lv => { const h = ri(8, 11), d = ri(2, 3); return L2(`午前${h}時から　${d}時間あとは，午前ですか　午後ですか。((${h + d >= 12 ? "午後" : "午前"}))`, K2_Q, "1日の　時間"); }
], 0.3);
const add2Types = sub => [
  lv => { const a = ri(2, 8) * 10, b = ri(1, 9 - a / 10) * 10; return sub ? L2(`${a + b}－[[${b}]]＝${a}`, K2_BOX, "□に　あう　数") : L2(`${a}＋[[${b}]]＝${a + b}`, K2_BOX, "□に　あう　数"); },
  lv => { const a = ri(2, 8), b = ri(1, 9 - a); return sub ? L2(`${(a + b) * 10}－${b * 10}は，10の　まとまりで　考えると　${a + b}－${b}＝[[${a}]]だから，[[${a * 10}]]`, K2_BOX, "考え方") : L2(`${a * 10}＋${b * 10}は，10の　まとまりで　考えると　${a}＋${b}＝[[${a + b}]]だから，[[${(a + b) * 10}]]`, K2_BOX, "考え方"); },
  lv => { const a = ri(2, 8) * 10, b = ri(1, 9 - a / 10) * 10; return sub ? L2(`${a + b}円　もって　います。${b}円の　あめを　買うと，のこりは　何円ですか。((${a}円))`, K2_Q, "計算") : L2(`${a}円の　ノートと　${b}円の　けしゴムを　買います。あわせて　何円ですか。((${a + b}円))`, K2_Q, "計算"); }
];
vary("2-3.a", add2Types(false));
vary("2-3.b", add2Types(true));
vary("2-4.a", [
  lv => { for(;;){ const a = ri(11, 69), b = ri(11, 29); if(a + b > 99 || (a % 10) + (b % 10) < 10) continue; return L2(`${a}＋${b}の　ひっ算で，一の${KURA2}は　${a % 10}＋${b % 10}＝${(a % 10) + (b % 10)}。十の${KURA2}に　[[1]]　くり上げる。答えは　[[${a + b}]]`, K2_BOX, "ひっ算の　しかた"); } },
  lv => { for(;;){ const a = ri(11, 69), b = ri(11, 29); if(a + b > 99) continue; const s = String(a); return L2(`${s[0]}[[${s[1]}]]＋${b}＝${a + b}`, K2_BOX, "□に　あう　数"); } },
  lv => { for(;;){ const a = ri(11, 69), b = ri(11, 29); if(a + b > 99) continue; return L2(`${a}＋${b}の　答えは，${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10}より　大きいですか，小さいですか。((大きい))`, K2_Q, "見つもり"); } }
], 0.5);
vary("2-4.b", [
  lv => { const a = ri(12, 40), b = ri(2, 8), c = 10 - b; return L2(`${a}＋${b}＋${c}は，${b}＋${c}を　先に　計算すると　かんたんです。答え((${a + 10}))`, K2_Q, "くふう"); },
  lv => { const a = ri(11, 30), b = ri(11, 30), c = ri(2, 9); return L2(`（${a}＋${b}）＋${c}＝${a}＋（${b}＋[[${c}]]）`, K2_BOX, "□に　あう　数"); }
]);
vary("2-5.a", [
  lv => { for(;;){ const a = ri(30, 99), b = ri(11, a - 10); if((a % 10) >= (b % 10)) continue; return L2(`${a}－${b}の　ひっ算で，一の${KURA2}は　${a % 10}から　${b % 10}が　ひけないので，十の${KURA2}から　[[1]]　くり下げて　${10 + a % 10}－${b % 10}＝[[${10 + a % 10 - b % 10}]]`, K2_BOX, "ひっ算の　しかた"); } },
  lv => { const a = ri(30, 99), b = ri(11, a - 10), s = String(b); return L2(`${a}－${s[0]}[[${s[1]}]]＝${a - b}`, K2_BOX, "□に　あう　数"); }
], 0.5);
vary("2-5.b", [
  lv => { const a = ri(20, 60), b = ri(11, 39); return L2(`${a}＋${b}＝${a + b}　のとき，${a + b}－${b}＝[[${a}]]`, K2_BOX, "かんけい"); },
  lv => { const a = ri(40, 99), b = ri(11, a - 10); return L2(`□－${b}＝${a - b}の　□に　入る　数((${a}))`, K2_Q, "かんけい"); }
], 0.4);
vary("2-6.a", [
  lv => L2(`1cmを　同じ　長さに　10に　分けた　1つ分の　長さは　何mmですか。((1mm))`, K2_Q, "長さ"),
  lv => { const a = ri(2, 6), b = ri(a + 2, 12), m = ri(1, 9); return L2(`ものさしの　${a}cmの　めもりから　${b}cm${m}mmの　めもりまでの　長さ((${b - a}cm${m}mm))`, K2_Q, "長さ"); }
], 0.6);
vary("2-6.b", [
  lv => { const it = pick([["ノートの　あつさ", 5, "mm"], ["えんぴつの　長さ", 17, "cm"], ["つくえの　よこの　長さ", 60, "cm"], ["1円玉の　あつさ", 1, "mm"], ["けしゴムの　長さ", 4, "cm"]]); return L2(`${it[0]}は　${it[1]}[[${it[2]}]]`, "[[ ]]に　あう　たんい（cmか　mm）を　書きましょう。", "たんい"); },
  lv => { const c = ri(3, 12), m = ri(1, 9), d = c * 10 + m + pick([-3, -1, 2, 5]); if(d === c * 10 + m) return null; return L2(`${c}cm${m}mmと　${d}mmでは，どちらが　長いですか。((${d > c * 10 + m ? d + "mm" : c + "cm" + m + "mm"}))`, K2_Q, "たんい"); }
]);
vary("2-6.c", [
  lv => { const a = ri(4, 12), b = ri(2, 8), m = ri(1, 9); return L2(`${a}cmの　テープと　${b}cm${m}mmの　テープを　つなぎます。ぜんぶで　何cm何mmですか。（のりしろは　考えません）((${a + b}cm${m}mm))`, K2_Q, "長さの　計算"); },
  lv => { const a = ri(8, 15), m = ri(1, 9), b = ri(2, a - 2); return L2(`${a}cm${m}mmの　ひもから　${b}cm　切りとると，のこりは　何cm何mmですか。((${a - b}cm${m}mm))`, K2_Q, "長さの　計算"); }
], 0.4);
vary("2-8.a", [
  lv => { const a = ri(1, 9), b = ri(0, 9), c = ri(0, 9); return L2(`100を　${a}こ，10を　${b}こ，1を　${c}こ　あわせた　数((${a * 100 + b * 10 + c}))`, K2_Q, "数の　しくみ"); },
  lv => { const n = ri(12, 60); return L2(`10を　${n}こ　あつめた　数((${n * 10}))`, K2_Q, "数の　しくみ"); },
  lv => { const n = ri(100, 999), k = pick(["百", "十", "一"]), d = k === "百" ? Math.floor(n / 100) : k === "十" ? Math.floor(n / 10) % 10 : n % 10; return L2(`${n}の　${k}の${KURA2}の　数字((${d}))`, K2_Q, "数の　しくみ"); },
  lv => { const a = ri(2, 9); return L2(`${a * 100}は　100を　[[${a}]]こ　あつめた　数`, K2_BOX, "数の　しくみ"); }
]);
vary("2-8.c", [
  lv => { const v = shuffle([ri(100, 999), ri(100, 999), ri(100, 999)]); if(new Set(v).size < 3) return null; return L2(`${v.join("，")}を　大きい　じゅんに　ならべましょう。((${[...v].sort((p, q) => q - p).join("，")}))`, K2_Q, "数の　大小"); },
  lv => { const a = ri(1, 9), b = ri(0, 8), c = ri(b + 1, 9); return L2(`${a}${b}□は　${a}${c}0より　小さい。□に　入る　数字は　ぜんぶで　何こ　ありますか。((10こ))`, K2_Q, "数の　大小"); }
]);
vary("2-8.d", [
  lv => { const a = ri(5, 9), b = ri(10 - a + 1, 9); return L2(`${a * 10}＋${b * 10}＝<<${(a + b) * 10}>>`, K2_CALC, "計算"); },
  lv => { const n = ri(11, 25); return L2(`10円玉が　${n}こで　何円ですか。((${n * 10}円))`, K2_Q, "計算"); },
  lv => { const a = ri(11, 18), b = ri(a - 9, 9); return L2(`${a * 10}－${b * 10}＝<<${(a - b) * 10}>>`, K2_CALC, "計算"); }
]);
const word2 = (a, b, op) => op === "+" ? pick([`${a}円の　ノートと　${b}円の　えんぴつを　買います。あわせて　何円ですか。`, `${a}さつの　本が　ある　本だなに，${b}さつ　ふやしました。本は　何さつに　なりましたか。`]) : pick([`${a}円　もって　います。${b}円の　おかしを　買うと，のこりは　何円ですか。`, `ちゅう車場に　車が　${a}台　とまって　います。${b}台　出て　いくと，のこりは　何台ですか。`]);
vary("2-9.a", [ lv => { for(;;){ const a = ri(40, 99), b = ri(20, 99); if(a + b < 100 || a + b > 199) continue; return L2(word2(a, b, "+") + `((${a + b}${/円/.test(word2(a, b, "+")) ? "" : ""}))`.replace(/\(\((\d+)\)\)/, (m, v) => `((${v}))`), K2_Q, "計算"); } },
  lv => { for(;;){ const a = ri(11, 99), b = ri(11, 99); if(a + b < 100) continue; const s = String(b); return L2(`${a}＋${s[0]}[[${s[1]}]]＝${a + b}`, K2_BOX, "□に　あう　数"); } } ], 0.6);
vary("2-9.b", [ lv => { for(;;){ const a = ri(100, 180), b = ri(20, 99); if(a - b < 1 || a - b >= 100) continue; return L2(`${a}円　もって　います。${b}円の　おかしを　買うと，のこりは　何円ですか。((${a - b}円))`, K2_Q, "計算"); } },
  lv => { for(;;){ const a = ri(100, 180), b = ri(20, 99); if(a - b < 1 || a - b >= 100) continue; return L2(`ちゅう車場に　車が　${a}台　とまって　います。${b}台　出て　いくと，のこりは　何台ですか。((${a - b}台))`, K2_Q, "計算"); } } ], 0.6);
vary("2-9.c", [ lv => { for(;;){ const a = ri(101, 899), b = ri(11, 99); if((a % 100) + b >= 100) continue; return L2(`${a}まいの　シールに，${b}まい　ふえると　何まいですか。((${a + b}まい))`, K2_Q, "計算"); } } ], 0.7);
vary("2-10.a", [
  lv => { const it = pick([["バケツに　入る　水", 8, "L"], ["コップに　入る　水", 2, "dL"], ["ペットボトルに　入る　お茶", 500, "mL"], ["おふろに　入る　水", 200, "L"], ["ぎゅうにゅうパック（小）", 2, "dL"]]); return L2(`${it[0]}は　${it[1]}[[${it[2]}]]`, "[[ ]]に　あう　たんい（L，dL，mL）を　書きましょう。", "たんい"); },
  lv => { const a = ri(1, 4), d = a * 10 + pick([-2, -1, 1, 3]); return L2(`${a}Lと　${d}dLでは，どちらが　多いですか。((${d > a * 10 ? d + "dL" : a + "L"}))`, K2_Q, "たんい"); }
]);
vary("2-10.b", [
  lv => { for(;;){ const a = ri(2, 5), ad = ri(1, 9), b = ri(1, a - 1), bd = ri(1, ad); return L2(`水が　${a}L${ad}dL　あります。${b}L${bd}dL　つかうと，のこりは　何L何dLですか。((${a - b}L${ad - bd ? (ad - bd) + "dL" : ""}))`.replace(/L\)\)/, "L))"), K2_Q, "かさの　計算"); } },
  lv => { const a = ri(1, 3), ad = ri(1, 9), bd = ri(1, 9); return L2(`やかんに　${a}L${ad}dL，ポットに　${bd}dLの　お茶が　あります。あわせて　何L何dLですか。((${a + Math.floor((ad + bd) / 10)}L${(ad + bd) % 10 ? (ad + bd) % 10 + "dL" : ""}))`, K2_Q, "かさの　計算"); }
], 0.5);
vary("2-11.a", [
  lv => L2(`3本の　直線で　かこまれた　形を　何と　いいますか。((三角形))`, K2_Q, "形"),
  lv => L2(`4本の　直線で　かこまれた　形を　何と　いいますか。((四角形))`, K2_Q, "形"),
  lv => L2(`4つの　かどが　みんな　直角で，4つの　へんの　長さが　みんな　同じ　四角形を　何と　いいますか。((正方形))`, K2_Q, "形"),
  lv => L2(`4つの　かどが　みんな　直角な　四角形を　何と　いいますか。((長方形))`, K2_Q, "形"),
  lv => L2(`直角の　かどが　ある　三角形を　何と　いいますか。((直角三角形))`, K2_Q, "形")
], 0.5);
vary("2-11.b", [
  lv => L2(`三角形と　四角形の　ちょう点の　数を　あわせると　いくつですか。((7つ))`, K2_Q, "へんと　ちょう点"),
  lv => L2(`四角形に　1本の　直線を　ひいて，2つの　三角形に　分けます。ちょう点と　ちょう点を　むすぶ　直線は，何本　ひけますか。((2本))`, K2_Q, "へんと　ちょう点"),
  lv => L2(`紙を　2回　おって　できた　かどの　形を　何と　いいますか。((直角))`, K2_Q, "直角")
], 0.4);
vary("2-11.c", [
  lv => { const a = ri(2, 9); return L2(`まわりの　長さが　${4 * a}cmの　正方形の　1つの　へんの　長さ((${a}cm))`, K2_Q, "へんの　長さ"); },
  lv => { const a = ri(3, 9), b = ri(2, a - 1); return L2(`たて　${b}cm，よこ　${a}cmの　長方形の　まわりの　長さ((${2 * (a + b)}cm))`, K2_Q, "へんの　長さ"); },
  lv => { const a = ri(2, 6); return L2(`1つの　へんが　${a}cmの　正方形を　2つ　ならべて　長方形を　作りました。長方形の　よこの　長さ((${2 * a}cm))`, K2_Q, "へんの　長さ"); }
]);
const danTypes = (lo, hi) => [
  lv => { const a = ri(lo, hi), b = ri(1, 9); return L2(`${a}×[[${b}]]＝${a * b}`, K2_BOX, "□に　あう　数"); },
  lv => { const a = ri(lo, hi), b = ri(2, 9); return L2(`${a}の　だんで，答えが　${a * b}に　なる　九九((${a}×${b}))`, K2_Q, "九九"); },
  lv => { const a = ri(lo, hi), b = ri(2, 9); return L2(`${a}×${b}は，${a}×${b - 1}より　[[${a}]]　大きい`, K2_BOX, "九九の　きまり"); },
  lv => { const a = ri(lo, hi), b = ri(2, 9); return W2(`1人に　${a}こずつ，${b}人に　あめを　くばります。あめは　何こ　いりますか。`, `${a}×${b}＝${a * b}`, `${a * b}こ`, "かけ算"); },
  lv => { const a = ri(lo, hi), b = ri(2, 9); return L2(`${a}こずつ　${b}れつ　ならんだ　いすの　数を　あらわす　かけ算の　しき((${a}×${b}))`, K2_Q, "かけ算の　しき"); }
];
for(const [ref, lo, hi] of [["2-12.a", 5, 5], ["2-12.b", 2, 2], ["2-12.c", 3, 3], ["2-12.d", 4, 4], ["2-13.a", 6, 6], ["2-13.b", 7, 7], ["2-13.c", 8, 8], ["2-13.d", 9, 9], ["2-13.e", 1, 1], ["2-13.f", 2, 9]]) vary(ref, danTypes(lo, hi), 0.35);
vary("2-14.a", [
  lv => { const n = pick([6, 8, 12, 16, 18, 24, 36]), c = []; for(let a = 1; a <= 9; a++) for(let b = 1; b <= 9; b++) if(a * b === n) c.push(a); return L2(`九九の　ひょうで，答えが　${n}に　なる　ところは　何こ　ありますか。((${c.length}こ))`, K2_Q, "九九の　ひょう"); },
  lv => { const a = ri(2, 9); return L2(`${a}の　だんの　答えは，[[${a}]]ずつ　大きく　なって　いる。`, K2_BOX, "九九の　ひょう"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L2(`${a}×${b}と　答えが　同じに　なる　九九((${b}×${a}))`, K2_Q, "九九の　ひょう"); }
]);
vary("2-14.b", [
  lv => { const a = ri(2, 9), b = ri(10, 12); return L2(`${a}×${b}は，${a}×10と　${a}×[[${b - 10}]]を　あわせた　数`, K2_BOX, "考え方"); },
  lv => { const a = ri(2, 9), b = ri(10, 12); return W2(`1こ　${a}円の　シールを　${b}まい　買います。何円に　なりますか。`, `${a}×${b}＝${a * b}`, `${a * b}円`, "かけ算"); }
]);
vary("2-14.c", [
  lv => { const a = ri(2, 9), b = ri(2, 8); return L2(`${a}×${b}＋${a}＝${a}×[[${b + 1}]]`, K2_BOX, "かけ算の　きまり"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L2(`${a}×${b}の　かける数が　1　ふえると，答えは　[[${a}]]　ふえる`, K2_BOX, "かけ算の　きまり"); }
]);
vary("2-15.a", [
  lv => { const n = pick([2, 4, 8]); return L2(`もとの　大きさの　${F(1, n)}を　${n}こ　あつめると，もとの　大きさに　なります。○か　×か((○))`, K2_Q, "分数"); },
  lv => { const n = pick([2, 3, 4]); return L2(`同じ　大きさに　${n}つに　分けた　1つ分を，分数で　書きましょう。((${F(1, n)}))`, K2_Q, "分数"); },
  lv => { const a = pick([[2, 4], [2, 8], [4, 8]]); return L2(`${F(1, a[0])}と　${F(1, a[1])}では，どちらが　大きいですか。((${F(1, a[0])}))`, K2_Q, "分数"); }
], 0.4);
vary("2-15.b", [
  lv => { const n = pick([2, 4]), k = ri(2, 8); return L2(`${n * k}cmの　テープの　${F(1, n)}の　長さ((${k}cm))`, K2_Q, "分数"); },
  lv => { const k = ri(2, 9); return L2(`${k}cmは，${2 * k}cmの　何分の一ですか。((${F(1, 2)}))`, K2_Q, "分数"); }
]);
vary("2-16.b", [
  lv => { const h = ri(1, 10), m = ri(1, 5) * 10, d = ri(1, 4) * 10; if(m + d >= 60) return null; return L2(`${h}時${m}分から　${d}分間　本を　読みました。読みおわった　時こく((${h}時${m + d}分))`, K2_Q, "時こく"); },
  lv => { const a = ri(20, 50), b = ri(20, 50); if(a + b < 60) return null; return L2(`${a}分と　${b}分を　あわせると　何時間何分ですか。((1時間${a + b - 60 ? a + b - 60 + "分" : ""}))`, K2_Q, "時間"); },
  lv => { const h = ri(1, 3); return L2(`${h}時間＝[[${h * 60}]]分`, K2_BOX, "□に　あう　数"); }
], 0.4);
vary("2-17.a", [
  lv => { const a = ri(1, 9), b = ri(0, 9), c = ri(0, 9); return L2(`1000を　${a}こ，100を　${b}こ，1を　${c}こ　あわせた　数((${a * 1000 + b * 100 + c}))`, K2_Q, "数の　しくみ"); },
  lv => { const n = ri(12, 60); return L2(`100を　${n}こ　あつめた　数((${n * 100}))`, K2_Q, "数の　しくみ"); },
  lv => L2(`10000は　1000を　[[10]]こ　あつめた　数`, K2_BOX, "数の　しくみ"),
  lv => { const n = ri(1001, 9999), k = pick(["千", "百", "十"]), d = k === "千" ? Math.floor(n / 1000) : k === "百" ? Math.floor(n / 100) % 10 : Math.floor(n / 10) % 10; return L2(`${n}の　${k}の${KURA2}の　数字((${d}))`, K2_Q, "数の　しくみ"); }
]);
vary("2-17.c", [
  lv => { const v = [ri(1000, 9999), ri(1000, 9999), ri(1000, 9999)]; if(new Set(v).size < 3) return null; return L2(`${v.join("，")}を　小さい　じゅんに　ならべましょう。((${[...v].sort((p, q) => p - q).join("，")}))`, K2_Q, "数の　大小"); },
  lv => { const n = ri(1001, 9998); return L2(`${n}より　1　大きい　数((${n + 1}))`, K2_Q, "数の　大小"); }
]);
vary("2-17.d", [
  lv => { const a = ri(1, 9); return L2(`1000－${a * 100}＝<<${1000 - a * 100}>>`, K2_CALC, "計算"); },
  lv => { const a = ri(2, 9), b = ri(10 - a + 1, 9); return L2(`${a * 100}＋${b * 100}＝<<${(a + b) * 100}>>`, K2_CALC, "計算"); },
  lv => { const n = ri(11, 40); return L2(`100円玉が　${n}こで　何円ですか。((${n * 100}円))`, K2_Q, "計算"); }
]);
vary("2-18.a", [
  lv => { const it = pick([["プールの　たての　長さ", 25, "m"], ["きょうかしょの　よこの　長さ", 18, "cm"], ["ろうかの　長さ", 40, "m"], ["ノートの　あつさ", 4, "mm"], ["ろうかの　はばの　長さ", 3, "m"]]); return L2(`${it[0]}は　${it[1]}[[${it[2]}]]`, "[[ ]]に　あう　たんい（m，cm，mm）を　書きましょう。", "たんい"); },
  lv => { const m = ri(1, 3), c = ri(10, 90), d = m * 100 + c + pick([-5, 5, 10, -10]); return L2(`${m}m${c}cmと　${d}cmでは，どちらが　長いですか。((${d > m * 100 + c ? d + "cm" : m + "m" + c + "cm"}))`, K2_Q, "たんい"); }
]);
vary("2-18.b", [
  lv => { const m = ri(1, 2), c = ri(10, 50), d = ri(10, 40); return L2(`${m}m${c}cmの　ぼうと　${d}cmの　ぼうを　つなぐと，何m何cmですか。((${m}m${c + d}cm))`, K2_Q, "長さの　計算"); },
  lv => { const m = ri(2, 4), c = ri(30, 90), d = ri(10, c - 10); return L2(`${m}m${c}cmの　ロープから　${d}cm　切りとると，のこりは　何m何cmですか。((${m}m${c - d}cm))`, K2_Q, "長さの　計算"); }
], 0.5);
vary("2-21.a", [
  lv => L2(`さいころの　形の　${MEN}は，どんな　形ですか。((正方形))`, K2_Q, "はこの　形"),
  lv => L2(`はこの　形で，同じ　形の　${MEN}は，いくつずつ　ありますか。((2つずつ))`, K2_Q, "はこの　形"),
  lv => L2(`ひごと　ねん土玉で　はこの　形を　作ります。ねん土玉は　何こ　いりますか。((8こ))`, K2_Q, "はこの　形"),
  lv => { const a = ri(3, 8); return L2(`1つの　へんが　${a}cmの　さいころの　形を，ひごで　作ります。${a}cmの　ひごは　何本　いりますか。((12本))`, K2_Q, "はこの　形"); },
  lv => { const a = ri(2, 6), b = ri(7, 10), c = ri(2, 6); if(a === c) return null; return L2(`たて　${a}cm，よこ　${b}cm，高さ　${c}cmの　はこの　形を　ひごで　作ります。${b}cmの　ひごは　何本　いりますか。((4本))`, K2_Q, "はこの　形"); }
], 0.3);

/* 数の線：1目もりの大きさ・2つの点のちがい */
const nlTypes = (opts, inst1) => [
  lv => { const [start, step] = opts(lv), va = start + ri(1, 9) * step; return figItem(110, 16, (G, x, y, w, h, fs) => drawNumLine(G, x, y, w, fs, start, step, 20, 10, [[va, inst1 ? "ア" : "ア"]]), `1目もりの　大きさ((${step}))`, {inst:knows("数") ? "数の　線を　見て　答えましょう。" : "かずの　せんを　みて　こたえましょう。", lead:knows("数") ? "数の　線" : "かずの　せん", sig:"nl1" + start + step}); },
  lv => { const [start, step] = opts(lv), a = ri(1, 9), b = ri(11, 19), va = start + a * step, vb = start + b * step; return figItem(110, 16, (G, x, y, w, h, fs) => drawNumLine(G, x, y, w, fs, start, step, 20, 10, [[va, "ア"], [vb, "イ"]]), knows("数") ? `アと　イの　ちがいは　いくつですか。((${(b - a) * step}))` : `アと　イの　ちがいは　いくつですか。((${(b - a) * step}))`, {inst:knows("数") ? "数の　線を　見て　答えましょう。" : "かずの　せんを　みて　こたえましょう。", lead:knows("数") ? "数の　線" : "かずの　せん", sig:"nl2" + va + vb}); }
];
vary("1-7.d", nlTypes(lv => [0, 1]));
vary("2-8.b", nlTypes(lv => lv === 0 ? [0, 10] : lv === 1 ? [ri(1, 8) * 100, 1] : [0, 5]));
vary("2-17.b", nlTypes(lv => lv === 0 ? [0, 100] : lv === 1 ? [ri(1, 8) * 1000, 10] : [0, 50]));
vary("2-16.a", [
  lv => { const h = ri(1, 12), m = ri(1, 59); if(m % 5 === 0) return null; return L2(`みじかい　はりが　${h}と　${h % 12 + 1}の　間，長い　はりが　${Math.floor(m / 5)}と　${Math.floor(m / 5) + 1}の　間の　小さい　めもり　${m % 5}つ分の　ところを　さして　います。何時何分ですか。((${h}時${m}分))`, K2_Q, "時計"); },
  lv => { const h = ri(1, 11), m = ri(41, 59); return L2(`${h}時${m}分から　あと　何分で　${h + 1}時に　なりますか。((${60 - m}分))`, K2_Q, "時計"); }
], 0.5);
vary("2-9.c", [
  lv => { for(;;){ const a = ri(101, 899), b = ri(11, 99); if((a % 100) < b) continue; const s = String(b); return L2(`${a}－${s[0]}[[${s[1]}]]＝${a - b}`, K2_BOX, "□に　あう　数"); } },
  lv => { for(;;){ const a = ri(301, 899), b = ri(11, 99); if((a % 100) < b) continue; return L2(`${a}円の　本を　買おうと　思います。${b}円　ねびきして　もらうと，何円に　なりますか。((${a - b}円))`, K2_Q, "計算"); } }
], 0.5);

/* ---------- 3年 ---------- */
vary("3-1.a", [
  lv => { const a = ri(2, 9), b = ri(2, 8); return L(`${a}×${b + 1}＝${a}×${b}＋[[${a}]]`, K_BOX, "かけ算のきまり"); },
  lv => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, b - 1 > 1 ? b - 1 : 2); if(c >= b) return null; return L(`${a}×${b}＝${a}×${c}＋${a}×[[${b - c}]]`, K_BOX, "かけ算のきまり"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a}×${b}の答えは，${b}×[[${a}]]の答えと同じ`, K_BOX, "かけ算のきまり"); }
]);
vary("3-1.b", [
  lv => { const a = ri(2, 9); return L(`${a}×0＝<<0>>，0×${a}＝<<0>>`, K_CALC, "0のかけ算"); },
  lv => { const a = ri(2, 9); return L(`${a}×10は，${a}×9より[[${a}]]大きい`, K_BOX, "10のかけ算"); },
  lv => { const n = ri(2, 5); return L(`玉入れで，0点のところに${n}こ，5点のところに0こ入りました。とく点は何点ですか。((0点))`, K_Q, "0のかけ算"); },
  lv => { const a = ri(2, 9); return L(`10円玉が${a}まいで何円ですか。式((10×${a}＝${10 * a}))`, K_Q, "10のかけ算"); }
]);
vary("3-2.a", [
  lv => { const h = ri(1, 10), m = ri(2, 5) * 10, d = ri(3, 5) * 10; if(m + d < 60) return null; return L(`午前${h}時${m}分から${d}分後の時こく((午前${h + 1}時${m + d - 60 ? (m + d - 60) + "分" : ""}))`, K_Q, "時こく"); },
  lv => { const h = ri(2, 10), m = ri(1, 3) * 10, d = ri(m / 10 + 1, 5) * 10; return L(`午後${h}時${m}分の${d}分前の時こく((午後${h - 1}時${m + 60 - d}分))`, K_Q, "時こく"); },
  lv => { const a = ri(8, 10), b = ri(10, 30); return L(`午前${a}時${b}分に家を出て，40分歩いて公園に着きました。着いた時こく((午前${b + 40 >= 60 ? a + 1 : a}時${(b + 40) % 60 ? (b + 40) % 60 + "分" : ""}))`, K_Q, "時こく"); }
]);
vary("3-2.c", [
  lv => { const m = ri(1, 3), s = ri(5, 55); return L(`${m}分${s}秒＝[[${m * 60 + s}]]秒`, K_BOX, "秒"); },
  lv => { const t = ri(70, 170); return L(`${t}秒＝[[${Math.floor(t / 60)}]]分[[${t % 60}]]秒`, K_BOX, "秒"); },
  lv => { const it = pick([["100mを走る時間", 18, "秒"], ["学校の休み時間", 20, "分"], ["1日にねる時間", 9, "時間"], ["はをみがく時間", 3, "分"]]); return L(`${it[0]}：${it[1]}[[${it[2]}]]`, "[[ ]]にあう時間のたんい（秒，分，時間）を書きましょう。", "時間のたんい"); },
  lv => { const a = ri(40, 59), b = ri(40, 59); return L(`Aさんは${a}秒，Bさんは1分${b - 40}秒でした。どちらが何秒速いですか。((${a < 60 + b - 40 ? "Aさん" : "Bさん"}が${Math.abs(a - (60 + b - 40))}秒))`, K_Q, "秒"); }
]);
vary("3-3.a", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b}÷[[${a}]]＝${b}`, K_BOX, "わり算"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b}÷${a}の答えは，${a}のだんの九九で見つけます。${a}×[[${b}]]＝${a * b}`, K_BOX, "わり算"); },
  lv => { const a = ri(2, 9); return L(`${a}÷${a}＝<<1>>，0÷${a}＝<<0>>`, K_CALC, "わり算"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b}このあめを${a}人で同じ数ずつ分ける式((${a * b}÷${a}))`, K_Q, "わり算の式"); }
]);
const hissanTypes3 = (mk) => [
  lv => { const [a, b, op] = mk(); const r = op === "+" ? a + b : a - b, s = String(b), k = ri(0, s.length - 1); return L(`${a}${op === "+" ? "＋" : "－"}${s.slice(0, k)}[[${s[k]}]]${s.slice(k + 1)}＝${r}`, K_BOX, "□にあう数"); },
  lv => { const [a, b, op] = mk(); const r = op === "+" ? a + b : a - b, ap = Math.round(a / 100) * 100, bp = Math.round(b / 100) * 100; return L(`${a}${op === "+" ? "＋" : "－"}${b}の答えは，およそ何百ですか。（${a}を${ap}，${b}を${bp}と見て）((${op === "+" ? ap + bp : ap - bp}))`, K_Q, "見つもり"); },
  lv => { const [a, b, op] = mk(); const r = op === "+" ? a + b : a - b; return L(`${op === "+" ? `${a}円の本と${b}円のノートを買うと，代金は何円ですか` : `${a}円持っています。${b}円使うと，のこりは何円ですか`}。((${r}円))`, K_Q, "文章題"); }
];
vary("3-4.a", hissanTypes3(() => [ri(120, 680), ri(110, 300), "+"]), 0.5);
vary("3-4.b", hissanTypes3(() => { const a = ri(400, 980); return [a, ri(110, a - 100), "-"]; }), 0.5);
vary("3-4.c", hissanTypes3(() => [ri(1200, 6800), ri(1100, 3000), "+"]), 0.5);
vary("3-4.d", [
  lv => { const a = ri(120, 480), b = pick([98, 99, 198, 199]); return L(`${a}＋${b}は，${a}＋${Math.ceil(b / 100) * 100}－[[${Math.ceil(b / 100) * 100 - b}]]と考えると計算しやすい。答え[[${a + b}]]`, K_BOX, "計算のくふう"); },
  lv => { const a = ri(300, 800), b = pick([98, 99, 198]); return L(`${a}－${b}は，${a}－${Math.ceil(b / 100) * 100}＋[[${Math.ceil(b / 100) * 100 - b}]]と考える。答え[[${a - b}]]`, K_BOX, "計算のくふう"); }
]);
vary("3-5.b", [
  lv => { const it = shuffle(["犬", "ねこ", "うさぎ", "金魚", "小鳥"]).slice(0, 4), v = it.map(() => ri(3, 15)); if(new Set(v).size < 4) return null; const s = v.reduce((p, q) => p + q, 0);
    return L(`かいたい動物の表〔${it.map((x, i) => `${x} ${v[i]}人`).join("，")}〕\n合計は何人ですか。((${s}人))`, K_Q, "表"); },
  lv => { const it = shuffle(["犬", "ねこ", "うさぎ", "金魚", "小鳥"]).slice(0, 4), v = it.map(() => ri(3, 15)); if(new Set(v).size < 4) return null; const mx = v.indexOf(Math.max(...v)), mn = v.indexOf(Math.min(...v));
    return L(`かいたい動物の表〔${it.map((x, i) => `${x} ${v[i]}人`).join("，")}〕\nいちばん多い動物といちばん少ない動物のちがいは何人ですか。((${v[mx] - v[mn]}人))`, K_Q, "表"); }
], 0.4);
vary("3-6.a", [
  lv => { const it = pick([["家から駅までの道のり", 2, "km"], ["えんぴつの長さ", 17, "cm"], ["プールのたての長さ", 25, "m"], ["となりの町までのきょり", 8, "km"], ["ノートのあつさ", 3, "mm"]]); return L(`${it[0]}：${it[1]}[[${it[2]}]]`, "[[ ]]にあう長さのたんいを書きましょう。", "長さのたんい"); },
  lv => { const k = ri(1, 3), m = ri(100, 900), d = k * 1000 + m + pick([-50, 50, 100]); return L(`${k}km${m}mと${d}mでは，どちらが長いですか。((${d > k * 1000 + m ? d + "m" : k + "km" + m + "m"}))`, K_Q, "長さ"); },
  lv => L(`道にそってはかった長さを[[道のり]]，まっすぐにはかった長さを[[きょり]]といいます。`, "[[ ]]にあうことばを書きましょう。", "道のり")
]);
vary("3-7.a", [
  lv => L(`円の中心を通り，まわりからまわりまでひいた直線を[[直${KEI}]]といいます。`, "[[ ]]にあうことばを書きましょう。", "円"),
  lv => { const r = ri(2, 9); return L(`半${KEI}${r}cmの円を，たてに2つならべてかきます。ならべた円の高さは何cmですか。((${4 * r}cm))`, K_Q, "円"); },
  lv => L(`1つの円で，直${KEI}は半${KEI}の何倍ですか。((2倍))`, K_Q, "円"),
  lv => L(`球をどこで切っても，切り口はいつも何の形になりますか。((円))`, K_Q, "球")
], 0.4);
vary("3-8.a", [
  lv => { const b = ri(3, 9), q = ri(2, 9), r = ri(1, b - 1); return L(`${b * q + r}÷${b}のあまりが${b}より小さくなっているか，答え${q}あまり${r}をたしかめましょう。${b}×${q}＋${r}＝[[${b * q + r}]]`, K_BOX, "たしかめ"); },
  lv => { const b = ri(3, 9); return L(`${b}でわるわり算で，あまりになることがある数のうち，いちばん大きい数((${b - 1}))`, K_Q, "あまり"); },
  lv => { const b = ri(3, 9), q = ri(2, 9), r = ri(1, b - 1); return L(`□÷${b}＝${q}あまり${r}の□にあう数((${b * q + r}))`, K_Q, "あまり"); }
]);
vary("3-8.b", [
  lv => { const b = ri(3, 9), q = ri(2, 9), r = ri(1, b - 1), wr = r + b; return L(`${b * q + r}÷${b}＝${q - 1}あまり${wr}　この答えはまちがっています。正しい答え((${q}あまり${r}))`, K_Q, "たしかめ"); }
]);
const mulTypes = (mk) => [
  lv => { const [a, b] = mk(); const s = String(a), k = ri(0, s.length - 1); return L(`${s.slice(0, k)}[[${s[k]}]]${s.slice(k + 1)}×${b}＝${a * b}`, K_BOX, "□にあう数"); },
  lv => { const [a, b] = mk(); return L(`1こ${a}円のおかしを${b}こ買います。代金は何円ですか。((${a * b}円))`, K_Q, "文章題"); },
  lv => { const [a, b] = mk(); const ap = Math.round(a / 10 ** (String(a).length - 1)) * 10 ** (String(a).length - 1); return L(`${a}×${b}の答えは，およそいくつですか。（${a}を${ap}と見て）((${ap * b}))`, K_Q, "見つもり"); }
];
vary("3-9.a", mulTypes(() => [ri(12, 49), ri(2, 9)]), 0.5);
vary("3-10.a", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * 10}×${b}は，10が${a}×${b}＝[[${a * b}]]こだから[[${a * b * 10}]]`, K_BOX, "考え方"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * 100}×${b}は，100が[[${a * b}]]こ`, K_BOX, "考え方"); }
]);
vary("3-10.b", mulTypes(() => [ri(12, 98), ri(2, 9)]), 0.5);
vary("3-10.c", mulTypes(() => [ri(112, 898), ri(2, 9)]), 0.5);
vary("3-11.b", [
  lv => { const a = ri(1, 9), b = ri(0, 9), c = ri(1, 9); return L(`1万を${a}こ，1000を${b}こ，10を${c}こあわせた数((${a * 10000 + b * 1000 + c * 10}))`, K_Q, "大きい数"); },
  lv => { const n = ri(12, 99); return L(`1000を${n}こ集めた数((${n * 1000}))`, K_Q, "大きい数"); },
  lv => { const n = ri(2, 9) * 10; return L(`${n}万は，1万を[[${n}]]こ集めた数`, K_BOX, "大きい数"); },
  lv => { const n = ri(12, 98); return L(`${n}0を10倍した数((${n * 100}))，${n}0を10でわった数((${n}))`, K_Q, "10倍・10でわる"); }
]);
vary("3-11.c", nlTypes(lv => lv === 0 ? [0, 1000] : lv === 1 ? [ri(1, 8) * 10000, 100] : [0, 5000]));
vary("3-11.d", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a}万＋${b}万＝[[${a + b}]]万`, K_BOX, "大きい数の計算"); },
  lv => { const a = ri(12, 98); return L(`${a}×10＝<<${a * 10}>>，${a}×100＝<<${a * 100}>>`, K_CALC, "10倍・100倍"); }
]);
vary("3-12.a", [
  lv => { const a = ri(1, 9), b = ri(1, 9); return L(`1を${a}こと0.1を${b}こあわせた数((${a}.${b}))`, K_Q, "小数のしくみ"); },
  lv => { const n = ri(11, 49); return L(`0.1を${n}こ集めた数((${ds(n, 1)}))`, K_Q, "小数のしくみ"); },
  lv => { const a = ri(1, 9), b = ri(1, 9); return L(`${a}.${b}の小数第一${KURA}の数字((${b}))`, K_Q, "小数のしくみ"); },
  lv => { const a = ri(1, 9); return L(`1Lを10等分した${a}こ分のかさは何Lですか。((${ds(a, 1)}L))`, K_Q, "小数のしくみ"); }
]);
vary("3-12.c", [
  lv => { const a = ri(11, 49), b = ri(11, 49); return L(`ジュースが${ds(a, 1)}Lと${ds(b, 1)}Lあります。あわせて何Lですか。((${ds(a + b, 1)}L))`, K_Q, "小数の計算"); },
  lv => { const a = ri(30, 90), b = ri(11, a - 5); return L(`${ds(a, 1)}mのテープから${ds(b, 1)}m使うと，のこりは何mですか。((${ds(a - b, 1)}m))`, K_Q, "小数の計算"); },
  lv => { const a = ri(11, 49), b = ri(11, 49); return L(`${ds(a, 1)}＋[[${ds(b, 1)}]]＝${ds(a + b, 1)}`, K_BOX, "□にあう数"); }
]);
vary("3-12.d", [
  lv => { const v = shuffle([ri(1, 30), ri(1, 30), ri(1, 30)]); if(new Set(v).size < 3) return null; return L(`${v.map(x => ds(x, 1)).join("，")}を小さいじゅんにならべましょう。((${[...v].sort((p, q) => p - q).map(x => ds(x, 1)).join("，")}))`, K_Q, "小数の大小"); },
  lv => { const a = ri(1, 9); return L(`${ds(a * 10 + 10, 1)}より0.1小さい数((${ds(a * 10 + 9, 1)}))`, K_Q, "小数の大小"); }
]);
vary("3-13.a", [
  lv => L(`3つの${HEN}の長さが等しい三角形を何といいますか。((正三角形))`, K_Q, "三角形"),
  lv => L(`2つの${HEN}の長さが等しい三角形を何といいますか。((二等${HEN}三角形))`, K_Q, "三角形"),
  lv => { const a = ri(3, 9); return L(`1つの${HEN}が${a}cmの正三角形の，まわりの長さ((${3 * a}cm))`, K_Q, "三角形"); },
  lv => { const a = ri(4, 9), b = ri(2, a - 1); return L(`2つの${HEN}が${a}cm，のこりの${HEN}が${b}cmの二等${HEN}三角形のまわりの長さ((${2 * a + b}cm))`, K_Q, "三角形"); }
]);
vary("3-13.b", [
  lv => { const r = ri(2, 6); return L(`半${KEI}${r}cmの円の中心と，円のまわりの2つの点をむすんで三角形をかきます。この三角形の2つの${HEN}は何cmですか。((${r}cm))`, K_Q, "円と三角形"); },
  lv => L(`円の中心と，まわりの2つの点をむすんでできる三角形は，かならず何三角形になりますか。((二等${HEN}三角形))`, K_Q, "円と三角形")
], 0.4);
vary("3-13.c", [
  lv => L(`正三角形の3つの角の大きさは，どうなっていますか。((みんな等しい))`, K_Q, "角"),
  lv => L(`二等${HEN}三角形で，大きさが等しい角はいくつありますか。((2つ))`, K_Q, "角"),
  lv => L(`1つの点から出ている2つの${HEN}がつくる形を何といいますか。((角))`, K_Q, "角")
], 0.4);
vary("3-14.a", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a}×${b * 10}は，${a}×${b}の答えを[[10]]倍した数`, K_BOX, "考え方"); },
  lv => { const a = ri(12, 49), b = ri(2, 9); return L(`1こ${a}円のおかしを${b * 10}こ買うと，代金は何円ですか。((${a * b * 10}円))`, K_Q, "文章題"); }
]);
vary("3-14.b", mulTypes(() => [ri(12, 98), ri(12, 98)]), 0.5);
vary("3-14.c", mulTypes(() => [ri(112, 698), ri(12, 49)]), 0.5);
vary("3-15.a", [
  lv => { const n = pick([3, 4, 5, 6, 8]), k = ri(1, n - 1); return L(`${F(1, n)}mの${k}こ分の長さ((${F(k, n)}m))`, K_Q, "分数"); },
  lv => { const n = pick([3, 4, 5]); return L(`1mを${n}等分した1こ分の長さ((${F(1, n)}m))`, K_Q, "分数"); },
  lv => { const n = pick([3, 4, 5, 6, 8]); return L(`${F(n, n)}は，1と[[等しい]]（大きい・小さい・等しい）`, "[[ ]]にあうことばを書きましょう。", "分数"); }
], 0.4);
vary("3-15.b", [
  lv => { const n = pick([5, 6, 8, 10]), a = ri(1, n - 1), b = ri(1, n - 1); if(a === b) return null; return L(`${F(a, n)}と${F(b, n)}では，どちらが大きいですか。((${F(Math.max(a, b), n)}))`, K_Q, "分数の大小"); },
  lv => { const a = pick([2, 3, 4, 5]), b = pick([6, 8, 10]); return L(`${F(1, a)}と${F(1, b)}では，どちらが大きいですか。((${F(1, a)}))`, K_Q, "分数の大小"); },
  lv => { const n = 10, a = ri(1, 9); return L(`${F(a, n)}を小数で表すと((${ds(a, 1)}))`, K_Q, "分数と小数"); }
]);
vary("3-15.c", [
  lv => { const n = pick([5, 6, 7, 8]), a = ri(1, n - 2), b = ri(1, n - 1 - a); return L(`ジュースを${F(a, n)}L飲み，あとで${F(b, n)}L飲みました。あわせて何L飲みましたか。((${F(a + b, n)}L))`, K_Q, "分数の計算"); },
  lv => { const n = pick([5, 6, 7, 8]), a = ri(1, n - 1); return L(`1－${F(a, n)}＝<<${F(n - a, n)}>>`, K_CALC, "分数の計算"); }
]);
vary("3-16.a", [
  lv => { const it = pick([["1円玉1まい", 1, "g"], ["ランドセル", 1, "kg"], ["りんご1こ", 300, "g"], ["自動車", 1, "t"], ["子どもの体重", 30, "kg"]]); return L(`${it[0]}の重さ：${it[1]}[[${it[2]}]]`, "[[ ]]にあう重さのたんい（g，kg，t）を書きましょう。", "重さのたんい"); },
  lv => { const a = ri(200, 800), b = ri(100, 400); return L(`${a}gのかごに，${b}gのりんごを入れると，重さは何gですか。((${a + b}g))`, K_Q, "重さの計算"); }
], 0.5);
vary("3-16.b", [
  lv => { const k = ri(1, 3), g = ri(100, 900), d = k * 1000 + g + pick([-50, 50]); return L(`${k}kg${g}gと${d}gでは，どちらが重いですか。((${d > k * 1000 + g ? d + "g" : k + "kg" + g + "g"}))`, K_Q, "重さ"); },
  lv => L(`1t＝[[1000]]kg`, K_BOX, "重さのたんい"),
  lv => { const a = ri(2, 5), g = ri(100, 800), b = ri(1, a - 1); return L(`${a}kg${g}gの荷物から${b}kgの荷物をおろすと，のこりは何kg何gですか。((${a - b}kg${g}g))`, K_Q, "重さの計算"); }
]);
vary("3-17.a", [
  lv => { const a = ri(20, 80), b = ri(10, 60); return L(`□＋${a}＝${a + b}の□にあう数((${b}))`, K_Q, "□を使った式"); },
  lv => { const a = ri(3, 9), b = ri(3, 9); return L(`□×${a}＝${a * b}の□にあう数((${b}))`, K_Q, "□を使った式"); },
  lv => { const a = ri(3, 9), b = ri(3, 9); return L(`□÷${a}＝${b}の□にあう数((${a * b}))`, K_Q, "□を使った式"); }
]);
vary("3-19.a", [
  lv => L(`そろばんで，上の玉1つは[[5]]を表します。`, K_BOX, "そろばん"),
  lv => L(`そろばんで，下の玉1つは[[1]]を表します。`, K_BOX, "そろばん")
], 0.6);

/* ---------- 4年 ---------- */
vary("4-1.b", [
  lv => { const a = ri(1, 9), b = ri(1, 9); return L(`1億を${a}こ，1万を${b}こあわせた数を数字で書きましょう。((${a}${"0".repeat(4)}${b}${"0".repeat(4)}))`.replace(/0000(\d)0000/, (m, d) => "0000" + d + "0000"), K_Q, "大きい数"); },
  lv => { const n = ri(12, 99); return L(`${n}億を10倍した数((${n * 10}億))，${n}億を10でわった数((${ds(n, 1).replace(/\.0$/, "")}億))`.replace(/\(\((\d+)\.(\d)億\)\)/, (m, a, b) => `((${a}億${b}000万))`), K_Q, "10倍・10でわる"); },
  lv => L(`1兆は1億を[[10000]]こ集めた数`, K_BOX, "大きい数")
]);
vary("4-1.c", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a}億×${b}＝[[${a * b}]]億`, K_BOX, "大きい数の計算"); },
  lv => { const a = ri(12, 60), b = ri(12, 40); return L(`${a}万＋${b}万＝[[${a + b}]]万`, K_BOX, "大きい数の計算"); }
]);
vary("4-3.a", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b * 10}÷${b * 10}＝${a * b}÷[[${b}]]`, K_BOX, "わり算のきまり"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`わられる数とわる数に同じ数をかけても，商は[[かわらない]]`, "[[ ]]にあうことばを書きましょう。", "わり算のきまり"); }
], 0.5);
vary("4-3.b", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b * 10}÷${a}は，10が[[${a * b}]]÷${a}＝${b}こだから[[${b * 10}]]`, K_BOX, "考え方"); },
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b * 100}円を${a}人で同じように分けると，1人何円ですか。((${b * 100}円))`, K_Q, "文章題"); }
]);
vary("4-4.b", [
  lv => L(`1回転の角度は[[360]]°`, K_BOX, "回転の角"),
  lv => L(`半回転の角度は[[180]]°`, K_BOX, "回転の角"),
  lv => { const k = ri(1, 3); return L(`直角${k}つ分の角度((${90 * k}°))`, K_Q, "直角"); },
  lv => L(`時計の長いはりが15分で回る角度((90°))`, K_Q, "回転の角")
]);
vary("4-4.c", [
  lv => L(`三角じょうぎの角は，30°，60°，90°と，45°，45°，[[90]]°`, K_BOX, "三角じょうぎ"),
  lv => { const p = pick([[30, 45], [45, 60], [60, 90], [30, 90], [45, 90]]); return L(`三角じょうぎの${p[0]}°と${p[1]}°の角を組み合わせてできる角度((${p[0] + p[1]}°))`, K_Q, "三角じょうぎ"); },
  lv => { const p = pick([[90, 45], [60, 45], [90, 30], [90, 60]]); return L(`三角じょうぎを重ねて，${p[0]}°－${p[1]}°の角をつくると何度ですか。((${p[0] - p[1]}°))`, K_Q, "三角じょうぎ"); }
], 0.4);
const divTypes = (mk) => [
  lv => { const [a, b] = mk(); const q = Math.floor(a / b), r = a % b; return L(`${a}÷${b}＝${q}${r ? "あまり" + r : ""}　答えのたしかめの式((${b}×${q}${r ? "＋" + r : ""}＝${a}))`, K_Q, "たしかめ"); },
  lv => { const [a, b] = mk(); const q = Math.floor(a / b), r = a % b; return L(r ? `${a}まいの色紙を${b}人で同じ数ずつ分けると，1人何まいで何まいあまりますか。((${q}まいで${r}まいあまる))` : `${a}まいの色紙を${b}人で同じ数ずつ分けると，1人何まいですか。((${q}まい))`, K_Q, "文章題"); },
  lv => { const [a, b] = mk(); const q = Math.floor(a / b); return L(`${a}÷${b}の商は何けたになりますか。((${String(q).length}けた))`, K_Q, "商のけた"); }
];
vary("4-5.a", divTypes(() => { const b = ri(2, 4), q = ri(11, 30); return [b * q, b]; }), 0.5);
vary("4-6.a", divTypes(() => { const b = ri(3, 9), q = ri(11, 99), r = ri(0, b - 1); return [b * q + r, b]; }), 0.5);
vary("4-6.b", divTypes(() => { const b = ri(3, 9), q = ri(101, 300), r = ri(0, b - 1); return [b * q + r, b]; }), 0.5);
vary("4-6.c", divTypes(() => { const b = ri(3, 9), q = pick([102, 105, 201, 208, 304, 106, 40, 50, 60, 70]), r = ri(0, b - 1); return [b * q + r, b]; }), 0.5);
vary("4-6.d", [ lv => { const b = ri(3, 9), q = ri(11, 99), r = ri(1, b - 1), wr = r + b; return L(`${b * q + r}÷${b}＝${q - 1}あまり${wr}　この答えは正しいですか。正しくなければ，正しい答えを書きましょう。((${q}あまり${r}))`, K_Q, "たしかめ"); } ], 0.6);
vary("4-8.a", divTypes(() => { const b = ri(2, 9) * 10, q = ri(2, 9), r = ri(0, 9) * 10 % b; return [b * q + r, b]; }), 0.5);
vary("4-8.b", divTypes(() => { const b = ri(12, 49), q = ri(2, 9), r = ri(0, b - 1); return [b * q + r, b]; }), 0.5);
vary("4-8.c", divTypes(() => { const b = ri(12, 39), q = ri(11, 30), r = ri(0, b - 1); return [b * q + r, b]; }), 0.5);
vary("4-8.d", [
  lv => { const a = ri(2, 9), b = ri(2, 9); return L(`${a * b * 100}÷${b * 100}の商は，${a * b}÷${b}の商と[[同じ]]`, "[[ ]]にあうことばを書きましょう。", "わり算のくふう"); },
  lv => { const b = ri(2, 9), q = ri(2, 9), r = ri(1, b - 1); return L(`${(b * q + r) * 100}÷${b * 100}＝${q}あまり[[${r * 100}]]`, K_BOX, "わり算のくふう"); }
]);
vary("4-9.b", [
  lv => L(`平行四辺形の向かい合った${"角"}の大きさは[[等しい]]`, "[[ ]]にあうことばを書きましょう。", "平行四辺形"),
  lv => { const a = ri(50, 80); return L(`平行四辺形の1つの角が${a}°のとき，となりの角は何度ですか。((${180 - a}°))`, K_Q, "平行四辺形"); },
  lv => { const a = ri(3, 9); return L(`1つの辺が${a}cmのひし形のまわりの長さ((${4 * a}cm))`, K_Q, "ひし形"); },
  lv => { const a = ri(3, 9), b = ri(3, 9); if(a === b) return null; return L(`となり合う辺が${a}cmと${b}cmの平行四辺形のまわりの長さ((${2 * (a + b)}cm))`, K_Q, "平行四辺形"); }
], 0.4);
vary("4-9.d", [
  lv => { const a = ri(40, 80); return L(`平行な2本の直線に1本の直線が交わっています。1つの角が${a}°のとき，同じ位置にある角は何度ですか。((${a}°))`, K_Q, "平行な直線と角"); },
  lv => L(`平行な直線のはばは，どこもかわらない。○か×か((○))`, K_Q, "平行"),
  lv => L(`1本の直線に${SUI}な2本の直線は，たがいにどんな関係ですか。((平行))`, K_Q, "平行")
], 0.5);
vary("4-10.a", [
  lv => { const n = ri(1000, 9999); return L(`${n}を${SHA}して，百の位までのがい数にしましょう。((${Math.round(n / 100) * 100}))`, K_Q, "がい数"); },
  lv => { const n = ri(10000, 99999); return L(`${n}を${SHA}して，上から2けたのがい数にしましょう。((${Math.round(n / 1000) * 1000}))`, K_Q, "がい数"); },
  lv => { const n = ri(1, 9) * 1000 + ri(0, 9) * 100 + 50; return L(`${n - 50}から${n + 49}までの数を${SHA}して百の位までのがい数にすると，いくつになりますか。((${Math.round(n / 100) * 100}))`.replace(/(\d+)\)\)/, (m, v) => v + "))"), K_Q, "がい数"); }
]);
vary("4-10.d", [
  lv => { const a = ri(210, 490), b = ri(110, 390), c = ri(110, 290); return L(`${a}円，${b}円，${c}円の品物を買います。それぞれを百の位までのがい数にして，代金はおよそ何円か見積もりましょう。((${Math.round(a / 100) * 100 + Math.round(b / 100) * 100 + Math.round(c / 100) * 100}円))`, K_Q, "見積もり"); },
  lv => { const a = ri(21, 49), b = ri(21, 49); return L(`1こ${a * 10}円のパンを${b}こ買います。代金はおよそ何円ですか。上から1けたのがい数にして見積もりましょう。((${Math.round(a / 10) * 100 * Math.round(b / 10) * 10}円))`, K_Q, "見積もり"); }
]);
vary("4-11.a", [
  lv => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9); return L(`${a}＋${b}×${c}＝<<${a + b * c}>>`, K_CALC, "計算の順じょ"); },
  lv => { const a = ri(2, 9), b = ri(2, 9), c = ri(2, 9); return L(`（${a}＋${b}）×${c}と${a}＋${b}×${c}では，どちらの答えが大きいですか。((（${a}＋${b}）×${c}))`, K_Q, "計算の順じょ"); }
]);
vary("4-11.b", [
  lv => { const a = ri(12, 49); return L(`${a}×25×4は，25×4を先に計算すると，${a}×[[100]]＝[[${a * 100}]]`, K_BOX, "くふう"); },
  lv => { const a = ri(11, 19), b = ri(2, 9); return L(`${a}×${b}＝（10＋${a - 10}）×${b}＝10×${b}＋[[${a - 10}]]×${b}＝[[${a * b}]]`, K_BOX, "くふう"); },
  lv => { const a = ri(2, 9); return L(`99×${a}＝（100－1）×${a}＝[[${99 * a}]]`, K_BOX, "くふう"); }
]);
vary("4-12.a", [
  lv => { const n = ri(101, 999); return L(`0.01を${n}こ集めた数((${ds(n, 2)}))`, K_Q, "小数のしくみ"); },
  lv => { const n = ri(1001, 9999); return L(`${ds(n, 3)}の小数第三位の数字((${n % 10}))`, K_Q, "小数のしくみ"); },
  lv => { const n = ri(11, 99); return L(`${ds(n, 2)}を10倍した数((${ds(n, 1)}))，${ds(n, 2)}を10でわった数((${ds(n, 3)}))`, K_Q, "10倍・10でわる"); }
]);
vary("4-12.c", [
  lv => { const a = ri(101, 499), b = ri(101, 499); return L(`${ds(a, 2)}kgと${ds(b, 2)}kgの荷物をあわせると何kgですか。((${ds(a + b, 2)}kg))`, K_Q, "小数の計算"); },
  lv => { const a = ri(300, 900), b = ri(101, a - 50); return L(`${ds(a, 2)}mのリボンから${ds(b, 2)}m使うと，のこりは何mですか。((${ds(a - b, 2)}m))`, K_Q, "小数の計算"); }
]);
vary("4-12.d", [
  lv => { const v = [ri(100, 999), ri(100, 999), ri(100, 999)]; if(new Set(v).size < 3) return null; return L(`${v.map(x => ds(x, 2)).join("，")}を大きいじゅんにならべましょう。((${[...v].sort((p, q) => q - p).map(x => ds(x, 2)).join("，")}))`, K_Q, "小数の大小"); },
  lv => { const a = ri(1, 9); return L(`${a}より0.01小さい数((${ds(a * 100 - 1, 2)}))`, K_Q, "小数の大小"); }
]);
vary("4-14.a", [
  lv => { const a = ri(3, 12), s = a * ri(2, 9); return L(`面積が${s}cm^2で，たてが${a}cmの長方形の横の長さ((${s / a}cm))`, K_Q, "面積"); },
  lv => { const a = ri(3, 9), b = ri(3, 9); if(a === b) return null; return L(`たて${a}cm，横${b}cmの長方形と，1辺${Math.round(Math.sqrt(a * b))}cmの正方形では，どちらが広いですか。((${a * b > Math.round(Math.sqrt(a * b)) ** 2 ? "長方形" : a * b < Math.round(Math.sqrt(a * b)) ** 2 ? "正方形" : "同じ"}))`, K_Q, "面積くらべ"); },
  lv => L(`1辺が1cmの正方形の面積を何といいますか。((1cm^2))`, K_Q, "面積の単位")
]);
vary("4-14.d", [
  lv => { const a = ri(3, 9); return L(`面積が${a * a}cm^2の正方形の1辺の長さ((${a}cm))`, K_Q, "面積"); },
  lv => { const a = ri(4, 12), b = ri(2, 9); return L(`まわりの長さが${2 * (a + b)}cmで，たてが${b}cmの長方形の面積((${a * b}cm^2))`, K_Q, "面積"); }
]);
const decTypes = (mul) => [
  lv => { const a = ri(11, 99), b = ri(2, 9); return mul ? L(`1本${ds(a, 1)}Lのジュースが${b}本あります。全部で何Lですか。((${ds(a * b, 1)}L))`, K_Q, "文章題") : L(`${ds(a * b, 1)}mのリボンを${b}人で同じ長さに分けると，1人何mですか。((${ds(a, 1)}m))`, K_Q, "文章題"); },
  lv => { const a = ri(11, 99), b = ri(2, 9); return mul ? L(`${ds(a, 1)}×${b}は，0.1が${a}×${b}＝[[${a * b}]]こ分`, K_BOX, "考え方") : L(`${ds(a * b, 1)}÷${b}は，0.1が${a * b}÷${b}＝[[${a}]]こ分`, K_BOX, "考え方"); }
];
vary("4-15.a", decTypes(true)); vary("4-15.b", decTypes(false));
vary("4-16.a", decTypes(true), 0.5); vary("4-16.b", decTypes(false), 0.5);
vary("4-17.a", [
  lv => { const n = pick([3, 4, 5, 6]), w = ri(1, 3), k = ri(1, n - 1); return L(`${F(w * n + k, n)}を帯分数で表すと((${MX(w, k, n)}))`, K_Q, "【仮|か】分数と帯分数"); },
  lv => L(`分子が分母より大きいか，分母と等しい分数を[[【仮|か】分数]]といいます。`, "[[ ]]にあうことばを書きましょう。", "【仮|か】分数"),
  lv => { const n = pick([3, 4, 5]); return L(`1と等しい分数で，分母が${n}のもの((${F(n, n)}))`, K_Q, "分数") ; }
], 0.4);
vary("4-17.b", [
  lv => { const p = pick([[1, 2, 2, 4], [1, 3, 2, 6], [2, 3, 4, 6], [1, 2, 3, 6], [1, 4, 2, 8]]); return L(`${F(p[0], p[1])}と${F(p[2], p[3])}の大きさをくらべましょう。((等しい))`, K_Q, "分数の大小"); },
  lv => { const n = pick([4, 5, 6]), w = ri(1, 2), k = ri(1, n - 1), m = w * n + k + pick([-1, 1]); return L(`${MX(w, k, n)}と${F(m, n)}では，どちらが大きいですか。((${m > w * n + k ? F(m, n) : MX(w, k, n)}))`, K_Q, "分数の大小"); }
]);
vary("4-17.c", [
  lv => { const n = pick([4, 5, 6, 7]), a = ri(1, n - 1), b = ri(1, n - 1); return L(`${F(a, n)}Lのジュースと${F(b, n)}Lのジュースをあわせると何Lですか。((${a + b >= n ? (a + b === n ? "1" : MX(1, a + b - n, n)) : F(a + b, n)}L))`, K_Q, "分数の計算"); },
  lv => { const n = pick([4, 5, 6]), w = ri(2, 3), k = ri(1, n - 1); return L(`${w}－${F(k, n)}＝<<${MX(w - 1, n - k, n)}>>`, K_CALC, "分数の計算"); }
]);
vary("4-18.b", [
  lv => L(`直方体で，1つの面に${SUI}な辺はいくつありますか。((4つ))`, K_Q, SUI + "・平行"),
  lv => L(`直方体で，1つの辺に平行な辺はいくつありますか。((3つ))`, K_Q, "平行"),
  lv => L(`直方体で，1つの面に平行な面はいくつありますか。((1つ))`, K_Q, "平行"),
  lv => L(`直方体で，1つの面に${SUI}な面はいくつありますか。((4つ))`, K_Q, SUI)
], 0.3);
vary("4-18.d", [
  lv => { const a = ri(1, 5), b = ri(1, 5), c = ri(1, 5); return L(`点Aをもとにして，横${a}cm，たて${b}cm，高さ${c}cmの位置を（横，たて，高さ）で表しましょう。((（${a}，${b}，${c}）))`, K_Q, "位置"); },
  lv => { const a = ri(1, 6), b = ri(1, 6); return L(`教室の前から${a}列目，左から${b}番目の席を（列，番）で表すと((（${a}，${b}）))`, K_Q, "位置"); }
], 0.4);
vary("4-19.a", [
  lv => { const k = ri(2, 6); return L(`1こ${k * 10}円のあめを□こ買ったときの代金を○円とします。□と○の関係を式に表しましょう。((${k * 10}×□＝○))`, K_Q, "式"); },
  lv => { const t = ri(10, 20); return L(`${t}このあめをAとBで分けます。Aの数を□こ，Bの数を○ことして，□と○の関係を式に表しましょう。((□＋○＝${t}))`, K_Q, "式"); },
  lv => { const a = ri(1, 5); return L(`1辺${a}cmの正方形をならべて，だんの数をふやします。1だんふえると，まわりの長さは何cmふえますか（1列にならべる）。((${2 * a}cm))`, K_Q, "変わり方"); }
], 0.4);
vary("3-7.b", [
  lv => { const d = ri(2, 8), n = ri(3, 6); return L(`直${KEI}${d}cmのボールが，${n}こ1れつにぴったり入る箱があります。箱の内がわの長さは何cmですか。((${d * n}cm))`, K_Q, "円と球"); },
  lv => { const r = ri(2, 6), n = ri(3, 5); return L(`横の長さが${2 * r * n}cmの箱に，同じ大きさのボールが${n}こ1れつにぴったり入っています。ボールの半${KEI}は何cmですか。((${r}cm))`, K_Q, "円と球"); }
], 0.5);
vary("4-14.b", [
  lv => { const a = ri(8, 15), b = ri(6, 12), w = ri(1, 2); return L(`たて${b}m，横${a}mの長方形の花だんに，はば${w}mの道を，たてと横に1本ずつ十字につくります。道をのぞいた花だんの面積((${(a - w) * (b - w)}m^2))`, K_Q, "いろいろな形の面積"); },
  lv => { const a = ri(6, 12), b = ri(4, 8), c = ri(2, a - 2), d = ri(1, b - 1); return L(`たて${b}cm，横${a}cmの長方形から，たて${d}cm，横${c}cmの長方形を切りとった形の面積((${a * b - c * d}cm^2))`, K_Q, "いろいろな形の面積"); }
], 0.5);
vary("4-16.c", [ lv => { const b = pick([4, 5, 8]), a = ri(3, 30); if(a % b === 0) return null; return L(`${a}mのリボンを${b}人で同じ長さに分けると，1人何mになりますか。わり切れるまで計算しましょう。((${String(a / b)}m))`, K_Q, "文章題"); } ], 0.6);
vary("4-16.d", [ lv => { const b = pick([3, 6, 7]), a = ri(10, 50); if(a % b === 0) return null; return L(`${a}Lのジュースを${b}人で同じように分けると，1人およそ何Lですか。四【捨|しゃ】五入して，上から2けたのがい数で答えましょう。((${(() => { const v = a / b; const k = Math.floor(Math.log10(v)); const p = 10 ** (k - 1); return String(Math.round(v / p) * p).replace(/(\.\d{0,3})\d*$/, "$1"); })()}L))`, K_Q, "文章題"); } ], 0.6);
vary("4-16.e", [ lv => { const b = ri(2, 6), q = ri(2, 9), r = ri(1, b * 10 - 1); const a = b * q * 10 + r; return L(`${ds(a, 1)}mのひもから${b}mのひもは何本とれて，何mあまりますか。((${q}本とれて${ds(r, 1)}mあまる))`, K_Q, "文章題"); } ], 0.6);
vary("4-12.b", [
  lv => { const n = ri(1001, 9999); return L(`${n}gは何kgですか。((${ds(n, 3)}kg))`, K_Q, "小数と単位"); },
  lv => { const n = ri(101, 999); return L(`${n}cmは何mですか。((${ds(n, 2)}m))`, K_Q, "小数と単位"); }
]);
