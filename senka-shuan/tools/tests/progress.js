// 単元の進み具合（週案の画面・印刷）と、上のボタンの並びを、スマート週案簿とスマート専科用週案の両方で確かめる
// 使い方: NODE_PATH=$(npm root -g) node progress.js <画像・PDFを置くフォルダ>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const SHUAN = path.join(ROOT, 'shuan-maker', fs.readdirSync(path.join(ROOT, 'shuan-maker')).filter(f => /^スマート週案簿_v[\d.]+\.html$/.test(f)).sort((a, b) => { const v = f => f.match(/v(\d+)\.(\d+)/).slice(1).map(Number); const [x, y] = [v(a), v(b)]; return x[0] - y[0] || x[1] - y[1]; }).pop());
const SENKA = path.join(ROOT, 'senka-shuan', 'スマート専科用週案.html');
const TESTDATA = path.join(ROOT, 'shuan-maker', 'スマート週案簿_v9.4_テストデータ.html');
const OUT = process.argv[2] || fs.mkdtempSync('/tmp/prog-'); fs.mkdirSync(OUT, { recursive: true });
let bad = 0; const ok = (name, c, info = '') => { if (!c) bad++; console.log((c ? '○ ' : '× ') + name + (info ? '  ' + info : '')); };
const SHEETS = ['classic', 'line', 'wide', 'stripe', 'note', 'card'];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
  const errs = [];
  const newPage = async file => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(path.basename(file) + ': ' + e.message)); p.on('dialog', d => d.accept()); await p.goto('file://' + file); return p; };
  const data = JSON.parse(fs.readFileSync(TESTDATA, 'utf8').match(/<script id="shuan-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  console.log('スマート週案簿：' + path.basename(SHUAN));
  // 印刷：どのシートでも1枚・文字が切れない・進み具合の表がはみ出さない
  const prints = async (p, X, tag, want) => {
    await p.emulateMedia({ media: 'print' });
    for (const k of SHEETS) for (const on of [true, false]) {
      const r = await p.evaluate(([X, k, on]) => {
        const c = X === 'me' ? D.me : D.cls; c.sheet = k; c.printMode = 'full'; c.printProg = on; curWeek = '2026-11-30'; renderPrint();
        const pr = document.querySelector('#print'); const t = pr.textContent;
        const pg = document.querySelector('#print .pgx, #print tr.pg');
        const sd = document.querySelector('#print .side'); const sx = document.querySelector('#print .sx, #print .pbody');
        const out = pg && sd && pg.closest('.side') ? pg.getBoundingClientRect().bottom - sd.getBoundingClientRect().bottom : 0;
        const cut = Array.from(document.querySelectorAll('#print table.pgt td.u, #print table.hb tr.pg td > div')).filter(td => td.scrollWidth > td.clientWidth + 1 || td.scrollHeight > td.clientHeight + 1).length;
        return { has: /単元の進み具合|進み/.test(t) && !!pg, out, cut, clip: Array.from(document.querySelectorAll('#print .tx')).filter(t => t.scrollHeight > t.clientHeight + 2).length };
      }, [X, k, on]);
      const f = path.join(OUT, `${tag}_${k}_${on ? '進みあり' : '進みなし'}.pdf`);
      await p.pdf({ path: f, preferCSSPageSize: true, printBackground: true });
      const pages = +execSync(`pdfinfo "${f}" | grep Pages | awk '{print $2}'`).toString().trim();
      ok(`${tag} 印刷 ${k}（進み具合を${on ? '入れる' : '入れない'}）：1枚・切れない${on ? '・進み具合が入る' : ''}`, pages === 1 && r.clip === 0 && r.has === on && r.out <= 0.5 && r.cut === 0, `${pages}枚 切れ${r.clip} はみ出し${r.out.toFixed(1)} 単元名の切れ${r.cut}`);
      if (on && (k === 'classic' || k === 'wide' || k === 'line')) execSync(`pdftoppm -r 110 -png -singlefile "${f}" "${f.replace(/\.pdf$/, '')}"`);
    }
    await p.emulateMedia({ media: 'screen' });
  };

  // 1 スマート週案簿
  const w = await newPage(SHUAN);
  await w.evaluate(data => { D = normalize(JSON.parse(JSON.stringify(data))); D.cls.sheet = 'classic'; for (const m of ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-24', '2026-11-30']) fillContinue(m); curWeek = '2026-11-30'; changed(); }, data);
  const ws = await w.evaluate(() => ({ h: !!document.querySelector('.side table.prog'), rows: Array.from(document.querySelectorAll('.side table.prog tr')).slice(1).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()).join(' ')) }));
  ok('スマート週案簿：週案の画面の右に、教科ごとの単元の進み具合が出る', ws.h && ws.rows.some(r => /^国語 \S+ \d+\/\d+$/.test(r)) && ws.rows.some(r => /^算数 /.test(r)), ws.rows.slice(0, 5).join(' | '));
  const sideBox = await (await w.$('.side')).boundingBox();
  await w.screenshot({ path: path.join(OUT, '週案簿_画面_進み具合.png'), clip: { x: sideBox.x - 4, y: sideBox.y - 4, width: sideBox.width + 8, height: Math.min(sideBox.height + 8, 1400) }, fullPage: true });
  ok('スマート週案簿：はじめは印刷に入れない（設定で選ぶ）', await w.evaluate(() => !progOn()));
  await w.click('[data-tab=set]');
  await w.check('#sPrProg'); await w.waitForTimeout(80);
  ok('スマート週案簿：設定の「印刷に入れるもの」で進み具合にチェックできる', await w.evaluate(() => D.cls.printProg === true));
  await prints(w, 'cls', '週案簿', true);
  // 2 スマート専科用週案
  const s = await newPage(SENKA);
  await s.evaluate(() => {
    D = normalize(newData()); D.school.year = 2026; D.school.week1 = mondayOf('2026-04-07'); D.me.subject = '音楽'; D.me.teacher = '音楽 花子'; D.me.sheet = 'classic';
    const cs = [3, 3, 4, 4, 5, 5, 6, 6].map((g, k) => addClass(g, String(k % 2 + 1), '音楽')); cs.forEach(loadPresetFor);
    D.timetable[1] = ['', cs[0].id, cs[1].id, cs[2].id, '', cs[3].id, '']; D.timetable[2] = ['', cs[4].id, cs[5].id, cs[6].id, cs[7].id, '', '']; D.timetable[3] = ['', cs[0].id, cs[2].id, cs[4].id, cs[6].id, '', ''];
    D.timetable[4] = ['', cs[1].id, cs[3].id, cs[5].id, cs[7].id, '', '']; D.timetable[5] = ['', '会議', cs[0].id, cs[1].id, '', '', ''];
    for (let m = '2026-04-06'; m <= '2026-11-30'; m = addDays(m, 7)) fillWeek(m);
    curWeek = '2026-11-30'; changed();
  });
  const ss = await s.evaluate(() => Array.from(document.querySelectorAll('.side table.prog tr')).slice(1).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()).join(' ')));
  ok('専科用：週案の画面の右に、クラスごとの進み具合が出る（3/8 の形）', ss.length === 8 && ss.every(r => / \d+\/\d+$/.test(r)), ss.slice(0, 3).join(' | '));
  ok('専科用：はじめから印刷に入れる', await s.evaluate(() => progOn()));
  await prints(s, 'me', '専科', true);
  // 3 設定：印刷に入れるもの（チェック）。前の「印刷の形」からはじめの値が決まる・どの組み合わせでも1枚
  for (const [p, X, tag] of [[w, 'cls', '週案簿'], [s, 'me', '専科']]) {
    await p.evaluate(X => { const c = X === 'me' ? D.me : D.cls; delete c.printHours; delete c.printRec; c.printMode = 'nohours'; c.sheet = 'classic'; switchTab('set'); }, X);
    const st0 = await p.evaluate(() => ({ h: document.querySelector('#sPrHours').checked, r: document.querySelector('#sPrRec').checked, pg: document.querySelector('#sPrProg').disabled, old: !!document.querySelector('#sPrintMode') }));
    ok(`${tag} 設定：「印刷の形」の選ぶ欄はなく、チェックになっている（前の「時数表なし」→時数表のチェックが外れ、進み具合は選べない）`, !st0.old && !st0.h && st0.r && st0.pg, JSON.stringify(st0));
    await p.check('#sPrHours'); await p.waitForTimeout(60);
    ok(`${tag} 設定：時数表にチェックすると、進み具合も選べる`, await p.evaluate(() => !document.querySelector('#sPrProg').disabled));
    await p.uncheck('#sPrRec'); await p.waitForTimeout(60);
    ok(`${tag} 設定：記録欄のチェックを外せる（時数表あり・記録欄なし）`, await p.evaluate(X => { const c = X === 'me' ? D.me : D.cls; return c.printHours === true && c.printRec === false; }, X));
    await p.emulateMedia({ media: 'print' });
    for (const [hh, rr] of [[true, false], [false, true], [false, false], [true, true]]) for (const k of SHEETS) {
      const r = await p.evaluate(([X, k, hh, rr]) => { const c = X === 'me' ? D.me : D.cls; c.sheet = k; c.sheetExtras = true; c.printHours = hh; c.printRec = rr; c.printProg = true; curWeek = '2026-11-30'; renderPrint(); const t = document.querySelector('#print').textContent;
        return { side: !!document.querySelector('#print .side, #print table.hb, #print table.pt2'), rec: k === 'classic' ? /記録欄/.test(t) : !!document.querySelector('#print .ex'), clip: Array.from(document.querySelectorAll('#print .tx')).filter(t => t.scrollHeight > t.clientHeight + 2).length }; }, [X, k, hh, rr]);
      const f = path.join(OUT, `${tag}_chk_${k}_${hh ? '時数' : 'x'}_${rr ? '記録' : 'x'}.pdf`); await p.pdf({ path: f, preferCSSPageSize: true, printBackground: true });
      const pages = +execSync(`pdfinfo "${f}" | grep Pages | awk '{print $2}'`).toString().trim();
      ok(`${tag} 印刷 ${k}：時数表${hh ? 'あり' : 'なし'}・記録欄${rr ? 'あり' : 'なし'}`, pages === 1 && r.clip === 0 && r.side === hh && r.rec === rr, `${pages}枚 切れ${r.clip} 時数表${r.side} 記録欄${r.rec}`);
      if (k === 'classic' && hh && !rr) execSync(`pdftoppm -r 80 -png -singlefile "${f}" "${f.replace(/\.pdf$/, '')}"`);
    }
    await p.emulateMedia({ media: 'screen' });
    await p.evaluate(X => { const c = X === 'me' ? D.me : D.cls; c.printHours = true; c.printRec = true; c.printProg = true; render(); }, X);
    await (await p.$('.setgrid:has(.fset)')).screenshot({ path: path.join(OUT, `${tag}_設定_印刷に入れるもの.png`) });
  }
  // 3 上のボタンの並び
  const order = p => p.evaluate(() => { const wb = document.querySelector('.weekbar'); return Array.from(wb.children).map(e => e.id || (e.querySelector('input') ? e.querySelector('input').id : '') || e.className).join(' '); });
  await w.evaluate(() => switchTab('week')); await s.evaluate(() => switchTab('week')); const o1 = await order(w), o2 = await order(s);
  ok('上のボタンの並びがスマート週案簿と同じ', o1 === o2, o2);
  await (await s.$('.weekbar')).screenshot({ path: path.join(OUT, '専科_上のボタン.png') });
  await (await w.$('.weekbar')).screenshot({ path: path.join(OUT, '週案簿_上のボタン.png') });
  ok('エラーが出ない', !errs.length, errs.join(' / '));
  await b.close();
  console.log(bad ? `\n${bad}件 だめ` : '\nすべて合格');
  process.exit(bad ? 1 : 0);
})();
