const B = require('../engine.js');
const a = `運動会

ぼくは、六年生最後の運動会でリレーの選手になりました。毎日、放課後に友達と練習しました。最初はバトンパスがうまくいかず、何度も落としてしまいました。でも、先生が「あわてなくていいよ。」と言ってくれたので、少しずつできるようになりました。
本番の日は、朝から雨がふりそうでしたが、晴れました。ぼくは三番目に走りました。前の人からバトンを受け取ったとき、むねがどきどきしました。ゴールしたとき、みんなが「やったね。」と喜んでくれて、とてもうれしかったです。
この運動会で、ぼくは練習の大切さを学びました。中学校でも、あきらめずにがんばろうと思います。`;
for (const style of ['da','dearu']) {
  const r = B.toPlain(a, {style});
  console.log(`==== ${style}\n` + B.render(r));
  for (const c of r.changes) if (!c.sure) console.log('  ?', c.from, '→', c.options.join(' / '), c.note);
}
const pl = B.render(B.toPlain(a,{style:'da'}));
const r2 = B.toPolite(pl);
console.log('==== back\n' + B.render(r2));
for (const c of r2.changes) if (!c.sure) console.log('  ?', c.from, '→', c.options.join(' / '), c.note);
console.log('same as original:', B.render(r2) === a);
