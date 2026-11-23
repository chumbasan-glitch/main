// 行事予定（カレンダー入力・時間の指定・コマへの反映・週案の画面で直す）を確かめ、画面と印刷を写す
// 使い方: NODE_PATH=$(npm root -g) node events_cal.js <スマート週案簿のファイル名> <画像を置くフォルダ>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = path.resolve(__dirname, '../..'); const FILE = process.argv[2], OUT = process.argv[3] || '.';
const ok = (name, c, info = '') => console.log((c ? '○ ' : '× ') + name + (info ? '  ' + info : ''));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.join(DIR, FILE));
  const data = JSON.parse(fs.readFileSync(path.join(DIR, 'スマート週案簿_v9.4_テストデータ.html'), 'utf8').match(/<script id="shuan-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  await p.evaluate(data => { D = normalize(JSON.parse(JSON.stringify(data))); D.cls.sheet = 'classic'; D.school.events = []; curWeek = '2026-11-30'; changed(); }, data);
  await p.click('[data-tab=events]');
  await p.selectOption('#calSel', '2026-12');
  const add = async (d, name, grades, slot) => {
    // 学年と時間を上で選んでから、日にちの欄に書いて Enter
    await p.check('.calset [data-ga]');
    for (const g of grades) await p.check(`.calset [data-g="${g}"]`);
    await p.selectOption('#calSlot', slot);
    await p.fill(`.cadd[data-d="${d}"]`, name); await p.press(`.cadd[data-d="${d}"]`, 'Enter'); await p.waitForTimeout(60);
  };
  await add('2026-12-01', '避難訓練', [], '2');
  await add('2026-12-01', '委員会', [5, 6], 'after');
  await add('2026-12-02', '読み聞かせ', [], 'asa');
  await add('2026-12-02', '社会科見学', [4], '');
  await add('2026-12-03', '全校遊び', [], 'hiru');
  await add('2026-12-03', '修学旅行説明会', [6], '5');
  await add('2026-12-04', '身体測定', [3, 4], '3');
  await add('2026-12-07', '学校公開', [], '');
  ok('カレンダーで登録', await p.evaluate(() => D.school.events.length) === 8, await p.evaluate(() => D.school.events.map(e => `${e.from.slice(5)} ${e.slot || '-'} ${e.name} [${gradeLabel(e)}]`).join(' / ')));
  await p.screenshot({ path: path.join(OUT, '画面_行事予定カレンダー.png'), fullPage: false });
  // 週案への反映（4年）
  const v = await p.evaluate(() => {
    const ss = d => slotsOf(d).map((x, i) => i + ':' + (x.ev ? '[' + x.s + ' ' + x.t + ']' : x.s)).join(' ');
    return { ev1: eventText('2026-12-01'), ev2: eventText('2026-12-02'), ev3: eventText('2026-12-03'), ev4: eventText('2026-12-04'), hiru3: bandText('2026-12-03', 'hiru'), d1: ss('2026-12-01'), d2: ss('2026-12-02'), d3: ss('2026-12-03'), d4: ss('2026-12-04') };
  });
  ok('行事の欄（時間つき・4年だけ）', v.ev1 === '2校時 避難訓練' && v.ev2 === '社会科見学\n朝 読み聞かせ' && v.ev3 === '昼休み 全校遊び' && v.ev4 === '3校時 身体測定', JSON.stringify([v.ev1, v.ev2, v.ev3, v.ev4]));
  ok('2校時・3校時が行事に、朝に読み聞かせ、6年の行事は入らない', /2:\[行事 避難訓練\]/.test(v.d1) && /0:\[ 読み聞かせ\]/.test(v.d2) && !/修学旅行/.test(v.d3) && /3:\[行事 身体測定\]/.test(v.d4), v.d1 + ' | ' + v.d2);
  ok('昼休みの帯に全校遊び', v.hiru3 === '全校遊び');
  const cnt = await p.evaluate(() => { CY = null; const c = cy().counts['2026-12-01']; return JSON.stringify(c); });
  ok('行事のコマは「行事」として数える', JSON.parse(cnt)['行事'] === 12, cnt);
  // 週案の画面
  await p.click('[data-tab=week]'); await p.waitForTimeout(100);
  const tb = await p.$('table.wk'); const bb = await tb.boundingBox();
  await p.screenshot({ path: path.join(OUT, '画面_週案（行事予定が入った週）.png'), clip: { x: bb.x, y: bb.y, width: Math.min(bb.width, 1010), height: 560 } });
  ok('週案の画面に行事予定のコマ', await p.$$eval('.evslot', x => x.length) >= 3);
  // 週案の画面から直す：避難訓練を3校時に
  await p.click('.evslot[data-d="2026-12-01"] [data-evopen]');
  await p.selectOption('#eeSlot', '3'); await p.click('#eeSave'); await p.waitForTimeout(80);
  ok('週案の画面から時間を直す（2校時→3校時）', await p.evaluate(() => eventText('2026-12-01') === '3校時 避難訓練' && slotsOf('2026-12-01')[3].ev && !slotsOf('2026-12-01')[2].ev));
  // 日付を直す
  await p.click('.evchip [data-evopen]'); await p.fill('#eeFrom', '2026-12-08'); await p.click('#eeSave'); await p.waitForTimeout(80);
  ok('週案の画面から日付を直す（12/1→12/8）', await p.evaluate(() => eventText('2026-12-01') === '' && /避難訓練/.test(eventText('2026-12-08'))));
  // この時間に入れない
  await p.click('.evslot[data-d="2026-12-04"] [data-evskip]'); await p.waitForTimeout(80);
  ok('この時間に入れない（コマは時間割に戻り、行事の欄には残る）', await p.evaluate(() => !slotsOf('2026-12-04')[3].ev && eventText('2026-12-04') === '3校時 身体測定'));
  // 先生が単元を入れたコマには入れない
  const keep = await p.evaluate(() => { const x = ensureSlots('2026-12-09')[2]; x.unit = 'テスト単元'; x.no = '1'; D.school.events.push({ id: 'ex1', from: '2026-12-09', slot: '2', name: '音楽鑑賞会', grades: [] }); changed(); return !slotsOf('2026-12-09')[2].ev && eventText('2026-12-09') === '2校時 音楽鑑賞会'; });
  ok('単元を入れたコマはそのまま（行事の欄にだけ入る）', keep);
  // 削除
  await p.evaluate(() => { curWeek = '2026-11-30'; render(); });
  await p.click('.evslot[data-d="2026-12-02"] [data-evopen]'); await p.click('#eeDel'); await p.waitForTimeout(80);
  ok('週案の画面から削除', await p.evaluate(() => !D.school.events.some(e => e.name === '読み聞かせ') && !slotsOf('2026-12-02')[0].ev));
  // 印刷（もう一度入れ直して写す）
  await p.evaluate(() => {
    D.school.events = []; importEvents('2026/12/1\t\t2\t避難訓練\t全\n12/1\t\t放課後\t委員会\t5,6\n12/2\t\t朝\t読み聞かせ\t全\n12/2\t\t\t社会科見学\t4\n12/3\t\t昼休み\t全校遊び\t全\n12/4\t\t3\t身体測定\t中学年', false);
    D.cls.hideEvSlot = {}; curWeek = '2026-11-30'; changed();
  });
  await p.emulateMedia({ media: 'print' });
  for (const k of ['classic', 'stripe']) {
    await p.evaluate(k => { D.cls.sheet = k; renderPrint(); }, k);
    await p.pdf({ path: path.join(OUT, `印刷_${k}.pdf`), preferCSSPageSize: true, printBackground: true });
  }
  ok('エラーが出ない', !errs.length, errs.join(' / '));
  await b.close();
})();
