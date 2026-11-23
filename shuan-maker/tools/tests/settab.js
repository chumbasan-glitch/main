// 設定タブ・行事予定タブが、今年度用・来年度用のどちらでもエラーなく開くか
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch();
  for (const f of process.argv.slice(2)) {
    const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(__dirname, '../..', f));
    await p.evaluate(() => { D.cls.grade = 4; D.cls.kumi = '1'; if (!D.cls.sheet) D.cls.sheet = 'classic'; changed(); });
    for (const t of ['set', 'events', 'tt', 'units', 'hours', 'week']) await p.click(`[data-tab=${t}]`);
    await p.click('[data-tab=set]');
    console.log(f, 'シートを選ぶところ:', await p.$('#tab-set .sheetpick') ? 'あり' : 'なし', '/ 版', await p.evaluate(() => VERSION), '/ errors', JSON.stringify(errs));
  }
  await b.close(); })();
