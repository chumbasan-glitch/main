// スマート週案簿のまとめ確認（直したあとに、前からある機能がこわれていないかを調べる）
// 使い方: NODE_PATH=$(npm root -g) node regress.js <スマート週案簿のファイル名> [PDFを置くフォルダ]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const DIR = path.resolve(__dirname, '../..');
const FILE = process.argv[2], OUT = process.argv[3] || fs.mkdtempSync('/tmp/regress-');
const TEST = path.join(DIR, 'スマート週案簿_v9.4_テストデータ.html');
const results = [];
const check = (name, ok, info = '') => { results.push([ok, name, info]); console.log((ok ? '○ ' : '× ') + name + (info ? '  ' + info : '')); };
(async () => {
  const b = await chromium.launch();
  const newPage = async () => {
    const p = await (await b.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto('file://' + path.join(DIR, FILE)); return p;
  };
  const data = JSON.parse(fs.readFileSync(TEST, 'utf8').match(/<script id="shuan-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const hasSheets = fs.readFileSync(path.join(DIR, FILE), 'utf8').includes('const SHEETS = {');
  const locked = fs.readFileSync(path.join(DIR, FILE), 'utf8').includes('const SHEET_LOCK = true;');   // 今年度用（いつも「これまでのシート」）
  const hasEvents = fs.readFileSync(path.join(DIR, FILE), 'utf8').includes('function renderEvents');

  // 1 はじめの画面：学年を選ぶと単元計画が入る
  let p = await newPage();
  await p.selectOption('#bnGrade', '3'); await p.fill('#bnKumi', '1');
  if (hasSheets && !locked) await p.click('.banner .sp:has(input[value="classic"])');
  if (locked) check('今年度用：週案シートを選ぶところが出ない', !(await p.$('.banner .sheetpick')));
  await p.click('#bnGo');
  const units = await p.evaluate(() => Object.keys(D.units).length);
  check('はじめの画面：学年を選ぶと教科書の単元計画が入る', units >= 4, units + '教科');
  // 2 朝：教科は1/3、朝会は数えない
  await p.evaluate(() => { D.school.breaks[0].to = '2026-04-05'; D.timetable[1] = ['国語', '国語', '算数']; D.timetable[2] = ['全校朝会', '国語']; curWeek = '2026-10-19'; changed(); });
  const cnt = await p.evaluate(() => JSON.stringify(sumCounts('2026-10-19', '2026-10-20')));
  check('朝：教科は1/3、朝会は時数に数えない', cnt === '{"国語":28,"算数":12}', cnt);
  // 3 コマを分ける：2つで1/2ずつ、3つで1/3ずつ、×で戻す
  await p.click('[data-tab=week]');
  const sl = '.slot[data-d="2026-10-21"][data-i="1"]';
  await p.evaluate(() => { D.timetable[3] = ['', '音楽']; changed(); });
  await p.click(sl + ' .psplit'); await p.waitForTimeout(50);
  const s2 = await p.evaluate(() => [ensureSlots('2026-10-21')[1].h, ...ensureSlots('2026-10-21')[1].parts.map(x => x.h)].join(','));
  await p.click(sl + ' .psplit'); await p.waitForTimeout(50);
  const s3 = await p.evaluate(() => [ensureSlots('2026-10-21')[1].h, ...ensureSlots('2026-10-21')[1].parts.map(x => x.h)].join(','));
  await p.click(sl + ' .part[data-k="1"] .pdel'); await p.waitForTimeout(50);
  const s4 = await p.evaluate(() => [ensureSlots('2026-10-21')[1].h, ...ensureSlots('2026-10-21')[1].parts.map(x => x.h)].join(','));
  check('コマを分ける：1/2ずつ→1/3ずつ→×で1/2ずつ', s2 === '1/2,1/2' && s3 === '1/3,1/3,1/3' && s4 === '1/2,1/2', [s2, s3, s4].join(' / '));
  // 4 入力が消えない：空のコマに教科を入れてすぐ内容の欄をクリックして打つ
  const e6 = '.slot[data-d="2026-10-22"][data-i="2"]';
  await p.click(e6 + ' input.subj'); await p.keyboard.type('学級');
  await p.click(e6 + ' textarea.ct'); await p.keyboard.type('係活動');
  await p.waitForTimeout(80);
  const t6 = await p.evaluate(() => JSON.stringify(ensureSlots('2026-10-22')[2]));
  check('入力が消えない（教科→すぐ内容の欄）', /学級/.test(t6) && /係活動/.test(t6), t6);
  check('週案の画面でエラーが出ない', !p.errs.length, p.errs.join(' / '));

  // 5 テストデータで：前週の続き・ねらいの文の切りかえ
  p = await newPage();
  await p.evaluate(data => { D = normalize(JSON.parse(JSON.stringify(data))); if (typeof SHEETS !== 'undefined') D.cls.sheet = 'classic'; curWeek = '2026-10-26'; render(); }, data);
  const n = await p.evaluate(() => fillContinue('2026-10-26'));
  const n2 = await p.evaluate(() => fillContinue('2026-10-26'));
  check('前週の単元の続きを入れる（2回目は入らない）', n > 5 && n2 === 0, n + 'コマ / 2回目 ' + n2);
  const aim = await p.evaluate(() => { CY = null; const k = Object.keys(cy().info).find(k => k.startsWith('2026-10-26') && cy().info[k].auto); const s = k && slotsOf(k.split('|')[0])[+k.split('|')[1]].s; const a = !!cy().info[k].auto; D.cls.noAim[s] = true; CY = null; const b = cy().info[k].auto; delete D.cls.noAim[s]; return a && !b; });
  check('ねらいの文を入れる教科の切りかえ', aim);
  // 6 印刷：どのシートでもB5の1枚・文字が切れない
  const sheets = hasSheets && !locked ? ['classic', 'line', 'wide', 'stripe', 'note', 'card'] : ['classic'];
  await p.emulateMedia({ media: 'print' });
  for (const pm of ['full', 'nohours', 'gridonly']) for (const k of sheets) {
    const clip = await p.evaluate(([k, pm]) => { if (typeof SHEETS !== 'undefined') { D.cls.sheet = k; D.cls.sheetExtras = pm === 'nohours'; } D.cls.printMode = pm; curWeek = '2026-10-19'; renderPrint(); return Array.from(document.querySelectorAll('#print .tx')).filter(t => t.scrollHeight > t.clientHeight + 2).length; }, [k, pm]);
    const f = path.join(OUT, `${k}_${pm}.pdf`);
    await p.pdf({ path: f, preferCSSPageSize: true, printBackground: true });
    const pages = +execSync(`pdfinfo "${f}" | grep Pages | awk '{print $2}'`).toString().trim();
    check(`印刷 ${k} ${pm}：1枚・文字が切れない`, pages === 1 && clip === 0, `${pages}枚 切れ${clip}`);
  }
  await p.emulateMedia({ media: 'screen' });

  // 7 保存：自動保存・別のファイルへの上書き確認
  p = await newPage();
  const sv = await p.evaluate(async () => {
    const mk = (name, text) => { const o = { name, text, queryPermission: async () => 'granted', requestPermission: async () => 'granted', getFile: async () => ({ text: async () => o.text }), createWritable: async () => ({ write: async t => { o.text = t; }, close: async () => {} }) }; return o; };
    const F = mk('me.html', '<script id="shuan-data" type="application/json">null</script>');
    window.showSaveFilePicker = async () => F;
    D.cls.grade = 4; if (typeof SHEETS !== 'undefined') D.cls.sheet = 'classic'; changed();
    await save(); const first = F.text.includes('"grade":4');
    const other = mk('B.html', '<script id="shuan-data" type="application/json">' + JSON.stringify({ app: 'shuan-tsukuru', fileId: 'zz', savedAt: '2099-01-01T00:00' }) + '</script>');
    return { first, F, other };
  }).catch(e => ({ err: String(e) }));
  check('保存できる', sv && sv.first, sv && sv.err || '');
  if (await p.evaluate(() => typeof autoSave === 'function')) {
    await p.evaluate(() => { ensureWeek('2026-10-19').memo = 'AUTO'; changed(); });
    await p.waitForTimeout(3600);
    const auto = await p.evaluate(() => !dirty && $('#saveState').textContent.startsWith('保存済み'));
    check('自動保存（3秒後に保存済み）', auto);
  }
  const ow = await p.evaluate(async () => { const o = { name: 'B.html', text: '<script id="shuan-data" type="application/json">' + JSON.stringify({ app: 'shuan-tsukuru', fileId: 'zz', savedAt: '2099-01-01T00:00' }) + '</script>', getFile: async () => ({ text: async () => o.text }) }; let asked = false; const c = window.confirm; window.confirm = () => { asked = true; return false; }; const r = await safeToOverwrite(o); window.confirm = c; return asked && !r; });
  check('別のデータが入ったファイルには確認を出す', ow);
  check('保存まわりでエラーが出ない', !p.errs.length, p.errs.join(' / '));

  // 8 行事予定
  if (hasEvents) {
    p = await newPage();
    const ev = await p.evaluate(() => {
      D.cls.grade = 4; if (typeof SHEETS !== 'undefined') D.cls.sheet = 'classic'; D.school.events = [];
      importEvents('12/1\t\t避難訓練\t全\n12/2\t\t社会科見学\t4\n12/3\t12/4\t作品展\t中学年\n12/3\t\t修学旅行説明会\t6', false);
      ensureDay('2026-12-01').event = '学級会';
      return ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'].map(d => eventText(d).replace(/\n/g, '+')).join('|');
    });
    check('行事予定：学年で絞って週案の行事に入る', ev === '避難訓練+学級会|社会科見学|作品展|作品展', ev);
    check('行事予定でエラーが出ない', !p.errs.length, p.errs.join(' / '));
  }
  await b.close();
  const bad = results.filter(r => !r[0]);
  console.log(`\n${results.length - bad.length}/${results.length} 合格` + (bad.length ? '  不合格：' + bad.map(r => r[1]).join('、') : ''));
  process.exit(bad.length ? 1 : 0);
})();
