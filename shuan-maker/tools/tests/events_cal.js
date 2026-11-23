// 行事予定（カレンダーの「＋行事」・時間・教科・扱い・休み・土曜授業・週案の画面で直す）を確かめ、画面と印刷を写す
// 使い方: NODE_PATH=$(npm root -g) node events_cal.js <スマート週案簿のファイル名> <画像を置くフォルダ>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const DIR = path.resolve(__dirname, '../..'); const FILE = process.argv[2], OUT = process.argv[3] || '.';
let bad = 0; const ok = (name, c, info = '') => { if (!c) bad++; console.log((c ? '○ ' : '× ') + name + (info ? '  ' + info : '')); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + path.join(DIR, FILE));
  const data = JSON.parse(fs.readFileSync(path.join(DIR, 'スマート週案簿_v9.4_テストデータ.html'), 'utf8').match(/<script id="shuan-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  await p.evaluate(data => { D = normalize(JSON.parse(JSON.stringify(data))); D.cls.sheet = 'classic'; D.school.events = []; curWeek = '2026-11-30'; changed(); }, data);
  await p.click('[data-tab=events]');
  await p.selectOption('#calSel', '2026-12');
  // 「＋行事」→ 小さな画面で入れる
  const add = async (d, name, { grades = [], slots = [], subj = '行事', share = '' } = {}) => {
    await p.click(`.cadd[data-d="${d}"]`);
    await p.fill('#eeName', name);
    await p.check('#evEditor [data-ga]'); for (const g of grades) await p.check(`#evEditor [data-g="${g}"]`);
    for (const k of await p.$$eval('#evEditor [data-sl]', x => x.map(i => i.dataset.sl))) await p.setChecked(`#evEditor [data-sl="${k}"]`, slots.includes(k));
    await p.selectOption('#eeSubj', subj); await p.selectOption('#eeShare', share);
    await p.click('#eeSave'); await p.waitForTimeout(60);
  };
  await add('2026-12-01', '避難訓練', { slots: ['2'], share: '1/2' });
  await add('2026-12-01', '委員会', { grades: [5, 6], slots: ['after'] });
  await add('2026-12-02', 'フレンドタイム', { slots: ['5'], subj: '総合' });
  await add('2026-12-03', '学芸会練習', { grades: [3, 4], slots: ['3', '4'] });
  await add('2026-12-03', '全校遊び', { slots: ['hiru'] });
  await add('2026-12-04', '読み聞かせ', { slots: ['asa'], subj: '' });
  await add('2026-12-04', '修学旅行説明会', { grades: [6], slots: ['5'] });
  ok('「＋行事」で登録', await p.evaluate(() => D.school.events.length) === 7, await p.evaluate(() => D.school.events.map(e => `${e.from.slice(5)} ${evChipText(e)} [${gradeLabel(e)}]`).join(' / ')));
  // 次に「＋行事」を押すと、前の学年・時間・教科・扱いが入っている
  await p.click('.cadd[data-d="2026-12-08"]');
  ok('次の「＋行事」は前の設定から始まる', await p.evaluate(() => $('#evEditor [data-g="6"]').checked && $('#evEditor [data-sl="5"]').checked));
  await p.click('#eeCancel');
  // 日にちの数字：休み・土曜授業
  await p.click('.dnum[data-day="2026-12-07"]'); await p.fill('#dmName', '開校記念日'); await p.click('[data-dm="off"]'); await p.waitForTimeout(60);
  await p.click('.dnum[data-day="2026-12-12"]'); await p.click('[data-dm="on"]'); await p.waitForTimeout(60);
  ok('カレンダーで休み（12/7 開校記念日）・土曜授業（12/12）', await p.evaluate(() => !isSchoolDay('2026-12-07') && offName('2026-12-07') === '開校記念日' && isSchoolDay('2026-12-12') && weekDays('2026-12-07').length === 6));
  // 冬休みの日を授業日にもどす、など
  await p.selectOption('#calSel', '2026-12');
  await p.screenshot({ path: path.join(OUT, '画面_行事予定カレンダー.png'), fullPage: false });
  // 「＋行事」の小さな画面を写す
  await p.click('.cadd[data-d="2026-12-09"]'); await p.fill('#eeName', 'フレンドタイム');
  await p.setChecked('#evEditor [data-sl="5"]', false); await p.check('#evEditor [data-sl="6"]'); await p.selectOption('#eeSubj', '総合');
  await p.screenshot({ path: path.join(OUT, '画面_行事を入れる.png'), clip: { x: 300, y: 120, width: 700, height: 560 } });
  await p.click('#eeCancel');
  // 週案への反映（4年）
  const v = await p.evaluate(() => {
    const ss = d => slotsOf(d).map((x, i) => i + ':' + (x.ev ? '[' + x.s + (x.h ? ' ' + x.h : '') + (x.parts ? '+' + x.parts[0].s + ' ' + x.parts[0].h + ' ' + x.parts[0].t : ' ' + x.t) + ']' : x.s)).join(' ');
    CY = null;
    return { ev1: eventText('2026-12-01'), ev3: eventText('2026-12-03'), ev4: eventText('2026-12-04'), d1: ss('2026-12-01'), d2: ss('2026-12-02'), d3: ss('2026-12-03'), d4: ss('2026-12-04'), c1: cy().counts['2026-12-01'], c2: cy().counts['2026-12-02'], c4: cy().counts['2026-12-04'] };
  });
  ok('行事の欄に「◯校時」が出ない・4年の分だけ', v.ev1 === '避難訓練' && v.ev3 === '学芸会練習\n全校遊び' && v.ev4 === '読み聞かせ', JSON.stringify([v.ev1, v.ev3, v.ev4]));
  ok('1/2扱い：上＝時間割の教科（国語）1/2、下＝行事1/2', /2:\[国語 1\/2\+行事 1\/2 避難訓練\]/.test(v.d1), v.d1);
  ok('フレンドタイムは総合でとる', /5:\[総合 フレンドタイム\]/.test(v.d2) && v.c2['総合'] === 12, v.d2);
  ok('3・4校時をまとめて', /3:\[行事 学芸会練習\]/.test(v.d3) && /4:\[行事 学芸会練習\]/.test(v.d3), v.d3);
  ok('朝の読み聞かせは時数に数えない・6年の行事は入らない', /0:\[ 読み聞かせ\]/.test(v.d4) && !/修学旅行/.test(v.d4) && !('' in v.c4), v.d4 + ' ' + JSON.stringify(v.c4));
  ok('時数：避難訓練の日は国語1/2・行事1/2', v.c1['国語'] === 6 && v.c1['行事'] === 6, JSON.stringify(v.c1));
  // 週案の画面
  await p.click('[data-tab=week]'); await p.waitForTimeout(100);
  const tb = await p.$('table.wk'); const bb = await tb.boundingBox();
  await p.screenshot({ path: path.join(OUT, '画面_週案（行事予定が入った週）.png'), clip: { x: bb.x, y: bb.y, width: Math.min(bb.width, 1010), height: 760 } });
  ok('週案の行事の欄に「校時」が出ない', await p.evaluate(() => !Array.from(document.querySelectorAll('.evchip')).some(c => /校時/.test(c.textContent))));
  // このコマを自分で直す → ふつうの分けたコマになる
  await p.click('.evslot[data-d="2026-12-01"][data-i="2"] [data-evdetach]'); await p.waitForTimeout(80);
  const det = await p.evaluate(() => JSON.stringify(ensureSlots('2026-12-01')[2]));
  ok('このコマを自分で直す（ふつうの分けたコマになる）', /"s":"国語"/.test(det) && /避難訓練/.test(det) && !/"ev"/.test(det), det);
  await p.fill('.slot[data-d="2026-12-01"][data-i="2"] input.subj', '算数'); await p.press('.slot[data-d="2026-12-01"][data-i="2"] input.subj', 'Enter'); await p.waitForTimeout(80);
  ok('  上の教科を算数に直せる', await p.evaluate(() => ensureSlots('2026-12-01')[2].s === '算数' && ensureSlots('2026-12-01')[2].parts[0].t === '避難訓練'));
  // 週案の画面から時間を直す
  await p.click('.evslot[data-d="2026-12-02"] [data-evopen]');
  await p.uncheck('#evEditor [data-sl="5"]'); await p.check('#evEditor [data-sl="6"]'); await p.click('#eeSave'); await p.waitForTimeout(80);
  ok('週案の画面から時間を直す（5校時→6校時）', await p.evaluate(() => slotsOf('2026-12-02')[6].ev && !slotsOf('2026-12-02')[5].ev));
  // 土曜授業の週
  await p.evaluate(() => { curWeek = '2026-12-07'; render(); });
  ok('土曜授業にした週は、はじめから土曜日が出る', await p.$$eval('table.wk thead th', x => x.length) === 7 && await p.evaluate(() => $('#wSat').checked && $('#wSat').disabled));
  // 印刷
  await p.evaluate(() => { curWeek = '2026-11-30'; render(); });
  await p.emulateMedia({ media: 'print' });
  for (const k of ['classic', 'stripe']) {
    await p.evaluate(k => { D.cls.sheet = k; renderPrint(); }, k);
    const txt = await p.evaluate(() => document.querySelector('#print').innerText);
    ok(`印刷（${k}）に「校時」が出ない`, !/校時/.test(txt));
    await p.pdf({ path: path.join(OUT, `印刷_${k}.pdf`), preferCSSPageSize: true, printBackground: true });
  }
  ok('エラーが出ない', !errs.length, errs.join(' / '));
  await b.close();
  console.log(bad ? `\n${bad}件 不合格` : '\nすべて合格'); process.exit(bad ? 1 : 0);
})();
