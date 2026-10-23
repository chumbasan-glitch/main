const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file:///home/user/main/shuan-maker/スマート週案簿_v9.4.html');
  const out = await p.evaluate(() => {
    D = newData(); D.school = defaultSchool(2026); D = normalize(D); D.school.confirmed = true;
    D.cls.grade = 4; D.cls.kumi = '1'; D.cls.teacher = 'テスト 先生'; D.cls.theme = 'midori';
    loadGradePresets(4, true);
    const sub = n => subjByName(n);
    sub('音楽').fixed = '音楽専科の先生のご指導による';
    D.timetable = {
      1: ['国語', '国語', '算数', '社会', '体育', '理科', '総合'],
      2: ['全校朝会', '算数', '国語', '音楽', '図工', '図工', '学級'],
      3: ['国語', '国語', '算数', '理科', '社会', '外国語', ''],
      4: ['国語', '算数', '国語', '体育', '音楽', '道徳', '総合'],
      5: ['児童集会', '社会', '算数', '国語', '理科', '体育', ''],
    };
    const ws = weeksOfYear().filter(w => w <= '2026-10-19');
    // 最初の週：教科ごとに最初のコマへ1単元目の1時間目を入れて、あとは「続き」で入れる
    const seen = {};
    for (const d of ws.slice(0, 3).flatMap(w => weekDays(w))) { if (!isSchoolDay(d)) continue; slotsOf(d).forEach((x, i) => { if (i && x.s && !seen[x.s] && (D.units[x.s] || []).length) { seen[x.s] = 1; const s = ensureSlots(d)[i]; s.unit = D.units[x.s][0].name; s.no = '1'; } }); }
    // 算数は3展開のコースを1つ入れておく
    D.cls.courses['算数'] = { [D.units['算数'][1].name]: 'ステップ' };
    // 行事・休み時間・備考・メモなど
    const ev = { '2026-04-07': '始業式\n学級開き', '2026-04-08': '入学式', '2026-04-21': '避難訓練（2校時）', '2026-05-22': '遠足（雨天延期）', '2026-06-12': '学校公開', '2026-07-17': '夏休み前集会', '2026-09-01': '前期後半はじまり', '2026-09-26': '運動会', '2026-10-09': '前期終業式', '2026-10-13': '後期始業式', '2026-10-21': 'クラブ⑤\n委員会' };
    for (const d in ev) ensureDay(d).event = ev[d];
    ensureDay('2026-05-22').note = '雨天の場合は通常授業';
    ensureDay('2026-10-20').naka = '外遊び'; ensureDay('2026-10-22').hiru = '図書室開放';
    ensureWeek('2026-10-19').memo = '・22日 体育着\n・23日 図工の材料（空き箱）';
    ensureWeek('2026-10-19').rec = '算数の小数の理解に個人差あり。次週は練習問題を多めに。';
    // 遠足の日は授業なし（行事で1日）
    ensureSlots('2026-05-22').forEach((x, i) => { if (i) { x.s = i <= 4 ? '行事' : ''; delete x.unit; delete x.no; x.t = i === 1 ? '遠足' : ''; } });
    // 避難訓練：2校時を国語1/2・行事1/2に分ける
    { const x = ensureSlots('2026-04-21')[2]; x.h = '1/2'; x.parts = [{ s: '行事', h: '1/2', t: '避難訓練' }]; }
    // 振替休業日（運動会の振替）
    { const r = ensureDay('2026-09-28'); r.off = true; r.offName = '振替休業日'; }
    // 週ごとに「前週の単元の続き」で埋める
    for (const w of ws) fillContinue(w);
    // 運動会の練習を何コマか分けておく
    for (const d of ['2026-09-15', '2026-09-17']) { const x = ensureSlots(d)[4]; x.s = '体育'; x.h = '1/2'; x.parts = [{ s: '行事', h: '1/2', t: '運動会練習' }]; }
    CY = null; D.rev = 1; D.savedAt = '2026-10-23T09:00'; curWeek = '';
    const html = buildHtml(D);
    const tot = sumCounts(yearStart(), '2026-10-25', true);
    return { html, tot: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, fr(v)])) };
  });
  fs.writeFileSync('/home/user/main/shuan-maker/スマート週案簿_v9.4_テストデータ.html', out.html);
  console.log(JSON.stringify(out.tot), errs); await b.close(); })();
