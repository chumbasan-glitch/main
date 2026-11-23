// 行事予定タブ：追加・学年の絞りこみ・週案への反映・印刷・この学級では入れない・貼り付け・配布用ファイル
const { chromium } = require('playwright'); const fs = require('fs');
const FILE = process.argv[2], SHEET = process.argv[3] || 'classic';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/main/shuan-maker/' + FILE);
  await p.evaluate(sheet => { D.cls.grade = 4; D.cls.kumi = '1'; D.cls.teacher = 'T'; D.cls.sheet = sheet; D.timetable[1] = ['', '国語']; curWeek = '2026-11-30'; changed(); }, SHEET);
  await p.click('[data-tab=events]');
  // フォームで追加：全学年
  await p.fill('#evFrom', '2026-12-01'); await p.fill('#evName', '避難訓練'); await p.click('#evAdd');
  // 4年だけ
  await p.fill('#evFrom', '2026-12-02'); await p.fill('#evName', '4年 社会科見学');
  await p.check('.evadd [data-g="4"]'); await p.click('#evAdd');
  // 6年だけ
  await p.fill('#evFrom', '2026-12-03'); await p.fill('#evName', '6年 修学旅行説明会'); await p.check('.evadd [data-g="6"]'); await p.click('#evAdd');
  // 何日か続く（3・4年）
  await p.fill('#evFrom', '2026-12-03'); await p.fill('#evTo', '2026-12-04'); await p.fill('#evName', '中学年 作品展'); await p.check('.evadd [data-g="3"]'); await p.check('.evadd [data-g="4"]'); await p.click('#evAdd');
  console.log('登録:', await p.evaluate(() => D.school.events.map(e => `${e.from}${e.to ? '〜' + e.to : ''} ${e.name} [${gradeLabel(e)}]`).join(' / ')));
  // 貼り付け
  await p.click('details.paste summary').catch(() => {});
  await p.fill('#evPaste', '日付\t終わりの日\t行事名\t学年\n2026/12/7\t\t身体測定\t全\n12月8日\t\t低学年 遠足\t低学年\n12/9\t12/10\t5・6年 宿泊\t高学年\n12/11\t\t学校公開\t\n2027/1/12\t\t書き初め大会\t3,4,5,6\nあいう\t\tまちがい\t');
  await p.click('#evImpAdd');
  console.log('貼り付け:', (await p.textContent('.msg')).replace(/\s+/g, ' '));
  console.log('  ', await p.evaluate(() => D.school.events.slice(4).map(e => `${e.from}${e.to ? '〜' + e.to : ''} ${e.name} [${gradeLabel(e)}]`).join(' / ')));
  // 自分の学年だけ表示
  await p.check('#evMine'); await p.waitForTimeout(100);
  console.log('4年だけ表示:', await p.$$eval('tr[data-ev] input.en', x => x.map(i => i.value).join(',')));
  // 週案への反映
  await p.click('[data-tab=week]');
  const chips = await p.evaluate(() => ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'].map(d => d.slice(5) + ':' + Array.from(document.querySelectorAll(`textarea.ev[data-d="${d}"]`)[0].parentElement.querySelectorAll('.evchip')).map(c => c.firstChild.textContent).join('+')).join('  '));
  console.log('週案（4年）:', chips);
  await p.fill('textarea.ev[data-d="2026-12-01"]', '学級会');
  // 印刷
  await p.emulateMedia({ media: 'print' }); await p.evaluate(() => renderPrint());
  console.log('印刷の行事:', await p.evaluate(() => ['2026-12-01', '2026-12-02', '2026-12-03'].map(d => eventText(d).replace(/\n/g, '+')).join(' | ')), '/ 印刷に入っている', await p.evaluate(() => document.querySelector('#print').innerText.includes('社会科見学') && !document.querySelector('#print').innerText.includes('修学旅行')));
  await p.pdf({ path: `ev_${SHEET}.pdf`, preferCSSPageSize: true, printBackground: true });
  await p.emulateMedia({ media: 'screen' });
  // この学級では入れない（×）→ 行事予定タブで戻す
  await p.click('[data-hideev]'); await p.waitForTimeout(100);
  console.log('× のあと 12/01:', await p.evaluate(() => eventText('2026-12-01').replace(/\n/g, '+')));
  await p.click('[data-tab=events]'); await p.uncheck('#evMine').catch(() => {});
  const id = await p.evaluate(() => D.school.events[0].id);
  await p.uncheck(`tr[data-ev="${id}"] .eh`);
  console.log('戻したあと 12/01:', await p.evaluate(() => eventText('2026-12-01').replace(/\n/g, '+')));
  // 学年を変えると
  await p.evaluate(() => { D.cls.grade = 6; CY = null; });
  console.log('6年なら 12/02〜03:', await p.evaluate(() => ['2026-12-02', '2026-12-03'].map(d => eventText(d).replace(/\n/g, '+')).join(' | ')));
  await p.evaluate(() => { D.cls.grade = 4; render(); });
  // 配布用ファイル
  await p.click('[data-tab=set]');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#sDist')]);
  const path = await dl.path(); const html = fs.readFileSync(path, 'utf8');
  const nd = JSON.parse(html.match(/<script id="shuan-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  console.log('配布用に入った行事予定:', nd.school.events.length, '件 / 組・担任', JSON.stringify([nd.cls.kumi, nd.cls.teacher]));
  fs.writeFileSync('dist_test.html', html);
  // 配布用を開くと（5年の先生）
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message)); p2.on('dialog', d => d.accept());
  await p2.goto('file://' + process.cwd() + '/dist_test.html');
  await p2.evaluate(() => { D.cls.grade = 5; D.cls.sheet = D.cls.sheet || 'classic'; curWeek = '2026-12-07'; render(); });
  console.log('配布先（5年）12/7〜10:', await p2.evaluate(() => ['2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10'].map(d => eventText(d).replace(/\n/g, '+') || '-').join(' | ')));
  // ほかのファイルの行事予定を読み込む
  await p.click('[data-tab=events]');
  await p.evaluate(() => { D.school.events = []; render(); });
  await p.setInputFiles('#evFile', 'dist_test.html'); await p.waitForTimeout(300);
  console.log('ほかのファイルから:', await p.evaluate(() => D.school.events.length), '件', (await p.textContent('.msg')).trim());
  console.log('errors', errs); await b.close();
})();
