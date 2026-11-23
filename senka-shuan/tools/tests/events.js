// 行事予定：スマート週案簿で書き出した行事予定ファイルを、スマート専科用週案で取り込む（とその逆）を確かめる
// 使い方: NODE_PATH=$(npm root -g) node events.js <画像・PDFを置くフォルダ>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const SHUAN = path.join(ROOT, 'shuan-maker', fs.readdirSync(path.join(ROOT, 'shuan-maker')).filter(f => /^スマート週案簿_v[\d.]+\.html$/.test(f)).sort((a, b) => { const v = f => f.match(/v(\d+)\.(\d+)/).slice(1).map(Number); const [x, y] = [v(a), v(b)]; return x[0] - y[0] || x[1] - y[1]; }).pop());
const SENKA = path.join(ROOT, 'senka-shuan', 'スマート専科用週案.html');
const TESTDATA = path.join(ROOT, 'shuan-maker', 'スマート週案簿_v9.4_テストデータ.html');
const OUT = process.argv[2] || fs.mkdtempSync('/tmp/senka-ev-'); fs.mkdirSync(OUT, { recursive: true });
let bad = 0; const ok = (name, c, info = '') => { if (!c) bad++; console.log((c ? '○ ' : '× ') + name + (info ? '  ' + info : '')); };
const EVENTS = [
  { id: 'a1', from: '2026-12-01', name: '避難訓練', grades: [], slots: ['2'], share: '1/2' },
  { id: 'a2', from: '2026-12-01', name: 'フレンドタイム', grades: [], slots: ['6'], subj: '総合' },
  { id: 'a3', from: '2026-12-02', name: '社会科見学', grades: [4], slots: ['1', '2', '3', '4', '5'] },
  { id: 'a4', from: '2026-12-02', name: '委員会集会', grades: [5, 6], slots: ['hiru'] },
  { id: 'a5', from: '2026-12-03', name: '遠足', grades: [2], slots: ['1', '2', '3', '4'] },
  { id: 'a6', from: '2026-12-04', name: '職員会議', grades: [], slots: [] },
  { id: 'a7', from: '2026-12-04', name: '読み聞かせ', grades: [], slots: ['asa'], subj: '' },
  { id: 'a8', from: '2026-12-08', to: '2026-12-10', name: '作品展', grades: [5], slots: [] },
  { id: 'a9', from: '2026-12-15', name: '学年集会', grades: [1], slots: ['3'], subj: '未定' },
];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true });
  const errs = []; let dlg = 'accept'; const msgs = [];
  const newPage = async file => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(path.basename(file) + ': ' + e.message)); p.on('dialog', d => { msgs.push(d.message()); dlg === 'accept' ? d.accept() : d.dismiss(); }); await p.goto('file://' + file); return p; };
  const data = JSON.parse(fs.readFileSync(TESTDATA, 'utf8').match(/<script id="shuan-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  // 日本語の名前のファイルは、中身ごと渡す（ファイルの場所で渡すと、テストの道具がうまく渡せないため）
  const setFile = (p, f) => p.setInputFiles('#evFile', { name: path.basename(f), mimeType: /\.json$/.test(f) ? 'application/json' : 'text/html', buffer: fs.readFileSync(f) });
  const download = async (p, sel, name) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click(sel)]); const f = path.join(OUT, name); await d.saveAs(f); return { f, suggested: d.suggestedFilename() }; };
  console.log('スマート週案簿：' + path.basename(SHUAN));

  // 1 スマート週案簿で行事予定を入れて、書き出す
  let w = await newPage(SHUAN);
  await w.evaluate(([data, evs]) => { D = normalize(JSON.parse(JSON.stringify(data))); D.cls.sheet = 'classic'; D.school.events = evs; D.school.offDays = { '2026-12-07': '振替休業日' }; D.school.onDays = { '2026-12-05': true }; curWeek = '2026-11-30'; changed(); }, [data, EVENTS]);
  await w.click('[data-tab=events]');
  ok('スマート週案簿：「書き出す」「取り込む」のボタンがある', !!(await w.$('#evExport')) && !!(await w.$('#evFileBtn')));
  const ex1 = await download(w, '#evExport', '行事予定_週案簿から.json');
  const j1 = JSON.parse(fs.readFileSync(ex1.f, 'utf8'));
  ok('スマート週案簿：行事予定ファイルを書き出せる（行事・休み・土曜授業）', j1.app === 'shuan-events' && j1.year === 2026 && j1.events.length === 9 && j1.offDays['2026-12-07'] && j1.onDays['2026-12-05'], ex1.suggested);

  // 2 スマート専科用週案で取り込む
  const s = await newPage(SENKA);
  await s.evaluate(() => {
    D = normalize(newData()); D.school.year = 2026; D.school.week1 = mondayOf('2026-04-07'); D.me.subject = '音楽'; D.me.teacher = '音楽 花子'; D.me.sheet = 'classic';
    const c4 = addClass(4, '1', '音楽'), c5 = addClass(5, '1', '音楽');
    D.timetable[2] = ['', '', c4.id, '', '', c5.id, '']; D.timetable[3] = ['', c4.id, c5.id, '', '', '', '']; D.timetable[5] = ['', '', '', c5.id, '', '', ''];
    curWeek = '2026-11-30'; changed();
  });
  await s.click('[data-tab=events]');
  ok('専科用：行事予定のタブがあり、「書き出す」「取り込む」のボタンがある', !!(await s.$('#tab-events table.cal')) && !!(await s.$('#evExport')) && !!(await s.$('#evFileBtn')));
  await setFile(s, ex1.f); await s.waitForTimeout(200);
  const g1 = await s.evaluate(() => ({ n: D.school.events.length, off: D.school.offDays['2026-12-07'], on: D.school.onDays['2026-12-05'], msg: (document.querySelector('#tab-events .msg') || {}).textContent }));
  ok('専科用：スマート週案簿の行事予定ファイルを取り込める', g1.n === 9 && g1.off === '振替休業日' && g1.on === true, JSON.stringify(g1));
  await s.selectOption('#calSel', '2026-12'); await s.waitForTimeout(80);
  await s.screenshot({ path: path.join(OUT, '専科_行事予定カレンダー.png') });
  const cal = await s.evaluate(() => ({ other: Array.from(document.querySelectorAll('.cev.other')).map(b => b.textContent), mine: document.querySelectorAll('.cev:not(.other)').length }));
  ok('専科用カレンダー：担当していない学年の行事はうすく出る', cal.other.some(t => /遠足/.test(t)) && !cal.other.some(t => /社会科見学/.test(t)), cal.other.join(' / '));

  // 3 週案の画面：担当している学年（4年・5年）と全学年の行事だけ。授業のコマはそのまま
  await s.click('[data-tab=week]'); await s.waitForTimeout(100);
  const wk = await s.evaluate(() => {
    const row = lab => { const tr = Array.from(document.querySelectorAll('table.wk tbody tr')).find(r => r.querySelector('th.lab') && r.querySelector('th.lab').textContent.trim() === lab); return Array.from(tr.querySelectorAll('td')).map(td => Array.from(td.querySelectorAll('.evchip .evn')).map(x => x.textContent).join(',')); };
    return { ev: row('行事'), asa: row('朝'), hiru: row('昼'), cols: document.querySelectorAll('table.wk thead th').length, s12: slotsOf('2026-12-01')[2].s, c4: D.classes[0].id, s22: slotsOf('2026-12-02')[2].s, c5: D.classes[1].id };
  });
  ok('週案の行事の欄：4年・5年・全学年の行事だけ（2年の遠足・1年の学年集会は出ない）', wk.ev[1] === '避難訓練,フレンドタイム' && wk.ev[2] === '社会科見学,委員会集会' && wk.ev[3] === '' && /職員会議/.test(wk.ev[4]) && /読み聞かせ/.test(wk.ev[4]), wk.ev.join(' | '));
  ok('週案の朝・昼休みの欄にも出る', wk.asa[4] === '読み聞かせ' && wk.hiru[2] === '委員会集会', wk.asa.join('|') + ' / ' + wk.hiru.join('|'));
  ok('授業のコマはそのまま（12/1 2校時は4-1、12/2 2校時は5-1）', wk.s12 === wk.c4 && wk.s22 === wk.c5);
  ok('土曜授業の日がある週は、はじめから土曜日が出る', wk.cols === 7, wk.cols + '列');
  const tb = await s.$('table.wk'); const bb = await tb.boundingBox();
  await s.screenshot({ path: path.join(OUT, '専科_週案（行事予定が入った週）.png'), clip: { x: bb.x, y: bb.y, width: Math.min(bb.width, 1100), height: 520 } });
  const nx = await s.evaluate(() => { curWeek = '2026-12-07'; render(); return { off: !isSchoolDay('2026-12-07'), name: offName('2026-12-07'), ev: Array.from(document.querySelectorAll('table.wk tbody tr:first-child td')).map(td => td.textContent.trim()).join('|') }; });
  ok('学校全体の休み（12/7 振替休業日）、何日か続く行事（作品展 12/8〜10）', nx.off && nx.name === '振替休業日' && (nx.ev.match(/作品展/g) || []).length === 3, nx.name + ' ' + nx.ev);

  // 4 印刷：行事・朝・昼休みに入る。「校時」は出ない。どのシートでも1枚
  await s.emulateMedia({ media: 'print' });
  for (const k of ['classic', 'line', 'wide', 'stripe', 'note', 'card']) {
    const r = await s.evaluate(k => { D.me.sheet = k; curWeek = '2026-11-30'; render(); renderPrint(); const t = document.querySelector('#print').textContent; return { t: ['避難訓練', '社会科見学', '委員会集会', '読み聞かせ', '職員会議'].every(x => t.includes(x)), no: !/遠足|学年集会|校時/.test(t), clip: Array.from(document.querySelectorAll('#print .tx')).filter(t => t.scrollHeight > t.clientHeight + 2).length }; }, k);
    const f = path.join(OUT, `専科_印刷_${k}.pdf`); await s.pdf({ path: f, preferCSSPageSize: true, printBackground: true });
    const pages = +execSync(`pdfinfo "${f}" | grep Pages | awk '{print $2}'`).toString().trim();
    ok(`印刷 ${k}：行事予定が入る・ほかの学年の行事と「校時」は出ない・1枚`, r.t && r.no && pages === 1 && r.clip === 0, `${pages}枚 切れ${r.clip}`);
  }
  execSync(`pdftoppm -r 110 -png -singlefile "${path.join(OUT, '専科_印刷_classic.pdf')}" "${path.join(OUT, '専科_印刷_classic')}"`);
  await s.emulateMedia({ media: 'screen' });
  await s.evaluate(() => { D.me.sheet = 'classic'; curWeek = '2026-11-30'; render(); });

  // 5 専科用で直す：週案の画面から日付を変える、カレンダーで足す、自分の週案に入れない
  await s.click('.evchip [data-evopen="a3"]');
  const opts = await s.evaluate(() => Array.from(document.querySelectorAll('#eeSubj option')).map(o => o.textContent));
  ok('専科用の「直す」画面：時数をとる教科は全部の教科から選べる（総合・クラブなど）', ['行事', '国語', '総合', 'クラブ', '委員会', '音楽'].every(x => opts.includes(x)) && opts.some(o => /未定/.test(o)), opts.join(' '));
  await s.screenshot({ path: path.join(OUT, '専科_行事予定を直す.png'), clip: { x: 300, y: 100, width: 700, height: 560 } });
  await s.fill('#eeFrom', '2026-12-03'); await s.click('#eeSave'); await s.waitForTimeout(80);
  ok('週案の画面から日付を変える（社会科見学 12/2→12/3）', await s.evaluate(() => D.school.events.find(e => e.id === 'a3').from === '2026-12-03' && Array.from(document.querySelectorAll('table.wk tbody tr:first-child td'))[3].textContent.includes('社会科見学') && !Array.from(document.querySelectorAll('table.wk tbody tr:first-child td'))[2].textContent.includes('社会科見学')));
  await s.click('[data-tab=events]'); await s.selectOption('#calSel', '2026-12'); await s.click('.cadd[data-d="2026-12-11"]');
  await s.fill('#eeName', '音楽集会'); await s.check('#evEditor [data-g="4"]'); await s.check('#evEditor [data-sl="asa"]'); await s.click('#eeSave'); await s.waitForTimeout(80);
  ok('専科用のカレンダーで行事を足せる', await s.evaluate(() => { const e = D.school.events.find(e => e.name === '音楽集会'); return e && e.from === '2026-12-11' && e.grades.join() === '4' && e.slots.join() === 'asa'; }));
  await s.click('[data-tab=week]'); await s.click('.evchip [data-hideev="a6"]'); await s.waitForTimeout(80);
  ok('「×」で自分の週案に入れない（職員会議）', await s.evaluate(() => !eventText('2026-12-04').includes('職員会議') && D.me.hideEv.a6));
  const dist = await s.evaluate(() => { const nd = newData(); nd.school = JSON.parse(JSON.stringify(D.school)); return nd.school.events.length; });
  ok('専科用の配布用ファイルにも行事予定が入る', dist === 10, dist + '件');

  // 6 専科用で書き出して、スマート週案簿で取り込む（置きかえ）
  await s.click('[data-tab=events]');
  const ex2 = await download(s, '#evExport', '行事予定_専科から.json');
  const j2 = JSON.parse(fs.readFileSync(ex2.f, 'utf8'));
  ok('専科用：行事予定ファイルを書き出せる', j2.app === 'shuan-events' && j2.events.length === 10, ex2.suggested);
  await w.evaluate(() => { D.cls.hideEv = { a2: true }; changed(); }); await w.click('[data-tab=events]');
  dlg = 'accept'; await setFile(w, ex2.f); await w.waitForTimeout(200);
  const g2 = await w.evaluate(() => { CY = null; const f = D.school.events.find(e => e.id === 'a2'); const a3 = D.school.events.find(e => e.id === 'a3'); return { n: D.school.events.length, subj: f.subj, sh: D.school.events.find(e => e.id === 'a1').share, a3: a3.from, hide: !!D.cls.hideEv.a2, ov: slotsOf('2026-12-03')[2].ev, gaku: D.school.events.find(e => e.name === '音楽集会').grades.join() }; });
  ok('スマート週案簿：専科用の行事予定ファイルを取り込める（置きかえ。教科・扱い・「入れない」もそのまま）', g2.n === 10 && g2.subj === '総合' && g2.sh === '1/2' && g2.a3 === '2026-12-03' && g2.hide && g2.gaku === '4', JSON.stringify(g2));
  ok('  取り込んだ行事予定は、スマート週案簿ではそのコマにも入る（社会科見学 12/3）', g2.ov === 'a3');
  ok('  置きかえるか足すかを聞く', msgs.some(m => /置きかえる/.test(m)));

  // 7 専科用のファイル（.html）そのものからも、スマート週案簿のファイルからも取り込める
  const sh = path.join(OUT, '専科のファイル.html'); fs.writeFileSync(sh, await s.evaluate(() => buildHtml(D)));
  await w.evaluate(() => { D.school.events = []; changed(); }); await setFile(w, sh); await w.waitForTimeout(200);
  ok('スマート週案簿：専科用のファイル（.html）からも取り込める', await w.evaluate(() => D.school.events.length === 10));
  const wh = path.join(OUT, '週案簿のファイル.html'); fs.writeFileSync(wh, await w.evaluate(() => buildHtml(D)));
  await s.evaluate(() => { D.school.events = []; changed(); }); await setFile(s, wh); await s.waitForTimeout(200);
  ok('専科用：スマート週案簿のファイル（.html）からも取り込める', await s.evaluate(() => D.school.events.length === 10));
  // 8 年度がちがうファイルは確かめる（キャンセルなら取り込まない）
  const y27 = path.join(OUT, '行事予定_2027.json'); fs.writeFileSync(y27, JSON.stringify({ ...j2, year: 2027, events: [{ id: 'z', from: '2027-04-07', name: '始業式', grades: [], slots: [] }] }));
  dlg = 'dismiss'; msgs.length = 0; await setFile(s, y27); await s.waitForTimeout(200); dlg = 'accept';
  ok('年度がちがうファイルは確かめる（キャンセルなら取り込まない）', msgs.some(m => /2027年度/.test(m)) && await s.evaluate(() => D.school.events.length === 10), msgs[0]);
  const bad1 = path.join(OUT, 'ちがうファイル.json'); fs.writeFileSync(bad1, '{"a":1}');
  await setFile(s, bad1); await s.waitForTimeout(200);
  ok('行事予定の入っていないファイルは取り込まない', await s.evaluate(() => D.school.events.length === 10 && /入っていません/.test(document.querySelector('#toast').textContent)));
  // 9 専科用：保存して開き直しても行事予定が残る
  const reopen = path.join(OUT, '専科_保存.html'); fs.writeFileSync(reopen, await s.evaluate(() => { D.savedAt = '2026-11-23T10:00:00'; return buildHtml(D); }));
  const s2 = await newPage(reopen);
  ok('専科用：保存したファイルを開き直しても行事予定・休み・土曜授業が残る', await s2.evaluate(() => D.school.events.length === 10 && D.school.offDays['2026-12-07'] && D.school.onDays['2026-12-05'] && D.me.hideEv.a6));
  ok('エラーが出ない', !errs.length, errs.join(' / '));
  await b.close();
  console.log(bad ? `\n${bad}件 だめ` : '\nすべて合格');
  process.exit(bad ? 1 : 0);
})();
