# スマート専科用週案に行事予定を入れる（スマート週案簿の行事予定のしくみを、専科用に合わせて持ってくる）
#   使い方: python3 senkaEvents.py <スマート週案簿.html> <専科用 template.html> <古い版> <新しい版>
import sys, re
src, p, old_v, new_v = sys.argv[1:5]
W = open(src, encoding='utf-8').read()
s = open(p, encoding='utf-8').read()


def rep(a, b, n=1, t=None):
    global s
    assert s.count(a) == n, (a[:80], s.count(a))
    s = s.replace(a, b)


def mrep(m, a, b, n=1):
    assert m.count(a) == n, (a[:80], m.count(a))
    return m.replace(a, b)


# ---- 行事予定のしくみ（スマート週案簿から） ----
a = W.index('/* ---------- 行事予定（学校の予定。選んだ学年の週案に入る） ---------- */')
b = W.index('// 「1組」と打っても「組」が重ならないように')
M = W[a:b]
M = mrep(M, '/* ---------- 行事予定（学校の予定。選んだ学年の週案に入る） ---------- */',
         '/* ---------- 行事予定（学校の予定。担当している学年の週案の「行事」に入る。スマート週案簿と同じ形） ---------- */')
M = mrep(M, 'const evForMe = e => !D.cls.grade || evGrades(e).includes(D.cls.grade);',
         '''// 担当している学年（担当クラスの学年）。まだクラスがないときは全部
const myGrades = () => [...new Set(D.classes.map(c => +c.grade))].sort((a, b) => a - b);
const evForMe = e => { const g = myGrades(); return !g.length || evGrades(e).some(x => g.includes(x)); };
// 時数をとる教科（学級担任のスマート週案簿で使う。専科用では、行事予定をそのまま残すために全部の教科から選べる）
const EV_SUBJ = ["国語", "図書", "書写", "社会", "算数", "理科", "生活", "音楽", "図工", "家庭", "体育", "保健", "道徳", "外国語", "総合", "学級", "クラブ", "委員会"];
const evSubjNames = () => [...new Set([...EV_SUBJ, ...D.school.subjects.map(s => s.name)])].filter(n => n !== "行事");''')
M = mrep(M, '// その日に、この学級の週案に入る行事予定（この学級で「入れない」にしたものはのぞく）',
         '// その日に、自分の週案に入る行事予定（「入れない」にしたものはのぞく）')
M = mrep(M, 'const key = D.fileId + ":" + D.rev + ":" + D.cls.grade + ":" + (D.school.events || []).length;',
         'const key = D.fileId + ":" + D.rev + ":" + myGrades().join(",") + ":" + (D.school.events || []).length;')
M = mrep(M, '(D.cls.hideEv || {})[e.id]) continue;', '(D.me.hideEv || {})[e.id]) continue;')
# 授業のコマには入れない（行事・朝・休み時間の欄に名前だけ出す）
x = M.index('// 朝・何校時を指定した行事予定は、そのコマにも入れる')
y = M.index('const gradeLabel = e => {')
M = M[:x] + M[y:]
M = mrep(M, '''// 週案の「行事」に出す文：行事予定の名前のあとに、自分で書いたものを続ける（「◯校時」は書かない）''',
         '''// 週案の「行事」に出す文：行事予定の名前のあとに、自分で書いたものを続ける（「◯校時」は書かない）。授業のコマは変えない''')
M = mrep(M, '  const names = D.school.subjects.map(s => s.name);', '  const names = evSubjNames();')
M = mrep(M, '''${D.school.subjects.filter(s => s.name !== "行事").map(s => `<option${subj === s.name ? " selected" : ""}>${esc(s.name)}</option>`).join("")}''',
         '''${[...evSubjNames(), ...(subj && subj !== "行事" && subj !== "未定" && !evSubjNames().includes(subj) ? [subj] : [])].map(n => `<option${subj === n ? " selected" : ""}>${esc(n)}</option>`).join("")}''')
M = mrep(M, '''    <p class="hint">朝・何校時を選ぶと、週案のそのコマにも「時数をとる教科」で入ります（そのコマに単元や内容を入れていないとき）。教科があとから決まるときは「未定」にしておき、決まったら直します（未定のあいだは、どの教科の時数にも入りません）。「1/2扱い」などにすると、そのコマを分けて、上に時間割の教科、下にこの行事を入れます。ここで直すと、このファイルの行事予定が直ります。</p>''',
         '''    <p class="hint">専科の週案では、授業のコマは変わりません。行事の名前が「行事」の欄に出ます（朝・中休み・昼休みを選んだものは、その欄にも出ます）。<br>「時数をとる教科」と「扱い」は、学級担任のスマート週案簿で使います（行事予定ファイルで渡したとき、そのコマに入ります）。わからないときは、そのままでかまいません。</p>''')
# 行事予定タブ（専科用のことば）
M = mrep(M, '  const el = $("#tab-events"); const c = D.cls;', '  const el = $("#tab-events"); const c = D.me; const mg = myGrades();')
M = mrep(M, '''  <p class="hint">行事名・学年・時間・時数をとる教科を入れると、その日の週案に自動で入ります。入るのは、自分の学年（設定の学年）に関係するものだけです。朝・何校時を選んだものは、そのコマにも入ります。<br>
  ここに入れた行事予定と、休み・土曜授業は、設定の「配布用のファイルを作る」で作ったファイルにも入ります。</p>''',
         '''  <p class="hint">行事名・学年・時間を入れると、その日の週案の「行事」の欄に自動で入ります（授業のコマは変わりません）。入るのは、担当しているクラスの学年${mg.length ? "（" + mg.map(g => g + "年").join("・") + "）" : ""}と全学年の行事だけです。<br>
  学級担任のスマート週案簿で作った行事予定は、「📥 行事予定ファイルを取り込む」で読み込めます。ここで入れた行事予定も、書き出して渡せます。休み・土曜授業も一緒に入ります。</p>''')
M = mrep(M, '''${c.grade ? c.grade + "年に関係するものだけ表示" : "自分の学年に関係するものだけ表示"}''', '''担当している学年に関係するものだけ表示''')
M = mrep(M, '''<th title="この学級の週案には入れない">この学級では<br>入れない</th>''', '''<th title="自分の週案には入れない">自分の週案には<br>入れない</th>''')
M = mrep(M, '''if ($(".eh", tr)) $(".eh", tr).onchange = ev => { const m = (D.cls.hideEv = D.cls.hideEv || {});''', '''if ($(".eh", tr)) $(".eh", tr).onchange = ev => { const m = (D.me.hideEv = D.me.hideEv || {});''')
M = mrep(M, '''  ・「取り込む」：書き出した行事予定ファイルのほか、スマート週案簿・スマート専科用週案のファイルやバックアップも選べます。行事予定と、休み・土曜授業だけを取り込みます（自分の週案の中身は変わりません）。''',
         '''  ・「取り込む」：書き出した行事予定ファイルのほか、スマート週案簿・スマート専科用週案のファイルやバックアップも選べます。行事予定と、休み・土曜授業だけを取り込みます（自分の週案・時間割・単元計画は変わりません）。''')
assert 'D.cls' not in M, re.findall(r'.{40}D\.cls.{40}', M)
for f in ['evOverlay', 'hideEvSlot']:
    assert f not in M, f

rep(f'const VERSION = "{old_v}";', f'const VERSION = "{new_v}";')
rep('''function renameSubject(ov, nv) {''', M + '''function renameSubject(ov, nv) {''')

# ---- データ ----
rep('''  if (d.me.sheet === undefined) d.me.sheet = d.savedAt ? "classic" : "";''', '''  if (d.me.sheet === undefined) d.me.sheet = d.savedAt ? "classic" : "";
  if (!Array.isArray(d.school.events)) d.school.events = [];   // 行事予定 [{id, from, to, name, grades, slots, subj, share}]（スマート週案簿と同じ形）
  for (const e of d.school.events) if (!Array.isArray(e.slots)) { e.slots = e.slot ? [e.slot] : []; delete e.slot; }
  if (!d.school.offDays) d.school.offDays = {};   // 学校全体の休み {日付: 名前}
  if (!d.school.onDays) d.school.onDays = {};     // 学校全体の授業日（土曜授業・祝日の授業日） {日付: true}
  if (!d.me.hideEv) d.me.hideEv = {};             // 自分の週案には入れない行事予定''')

# ---- 休み・土曜授業（学校全体） ----
rep('''function weekRec(mon) { return D.weeks[mon] || {}; }''', '''function weekRec(mon) { return D.weeks[mon] || {}; }
const satSchool = mon => !!(D.school.onDays || {})[addDays(mon, 5)];
const satWeek = mon => !!weekRec(mon).sat || satSchool(mon);''')
rep('''  if (w === 6 && !weekRec(mondayOf(s)).sat) return "土曜";
  return holiday(s) || breakOf(s) || "";''', '''  if (w === 6 && !satWeek(mondayOf(s))) return "土曜";
  if ((D.school.onDays || {})[s]) return "";
  return (D.school.offDays || {})[s] || holiday(s) || breakOf(s) || "";''')
rep('''  if (wday(s) === 6 && !weekRec(mondayOf(s)).sat) return false;''', '''  if (wday(s) === 6 && !satWeek(mondayOf(s))) return false;''')
rep('''  const n = weekRec(mon).sat ? 6 : 5; const a = [];''', '''  const n = satWeek(mon) ? 6 : 5; const a = [];''')
rep('''<input type="checkbox" id="wSat"${wr.sat ? " checked" : ""}> 土曜授業がある</label>''', '''<input type="checkbox" id="wSat"${satWeek(mon) ? " checked" : ""}${satSchool(mon) ? ' disabled title="行事予定で土曜授業の日にしています"' : ""}> 土曜授業がある</label>''')

# ---- タブ ----
rep('''    <button data-tab="units">単元計画</button>
    <button data-tab="hours">時数</button>''', '''    <button data-tab="units">単元計画</button>
    <button data-tab="events">行事予定</button>
    <button data-tab="hours">時数</button>''')
rep('''    <section id="tab-units" hidden></section>''', '''    <section id="tab-units" hidden></section>
    <section id="tab-events" hidden></section>''')
rep('''  for (const k of ["week","tt","units","hours","set"]) $("#tab-" + k).hidden = k !== t;''', '''  for (const k of ["week","tt","units","events","hours","set"]) $("#tab-" + k).hidden = k !== t;''')
rep('''({week: renderWeek, tt: renderTT, units: renderUnits, hours: renderHours, set: renderSet})[curTab]();''', '''({week: renderWeek, tt: renderTT, units: renderUnits, events: renderEvents, hours: renderHours, set: renderSet})[curTab]();''')

# ---- 週案の画面：行事・朝・中休み・昼休みの欄に行事予定の名前（押すと直せる、×で自分の週案に入れない） ----
chip = '''`<span class="evchip" title="行事予定（${esc(gradeLabel(e))}）。押すと日付・時間を直せます"><button class="evn" data-evopen="${esc(e.id)}">${esc(e.name)}</button><button data-hideev="${esc(e.id)}" title="自分の週案には入れない">×</button></span>`'''
chip2 = '''`<span class="evchip"><button class="evn" data-evopen="${esc(e.id)}">${esc(e.name)}</button></span>`'''
rep('''    const hol = holiday(d) || breakOf(d);
    h += `<td class="${isSchoolDay(d) ? "" : "off"}"><textarea class="ev" data-d="${d}" placeholder="${esc(hol || "")}">''',
    '''    const hol = holiday(d) || breakOf(d);
    const evs = schoolEventsOn(d);
    h += `<td class="${isSchoolDay(d) ? "" : "off"}">${evs.map(e => ''' + chip + ''').join("")}<textarea class="ev" data-d="${d}" placeholder="${esc(evs.length ? "ほかの行事・予定" : (hol || ""))}">''')
rep('''  for (const d of days) h += `<td class="${isSchoolDay(d) ? "" : "off"}"><textarea class="asa" data-d="${d}" placeholder="打合せ・朝会など">''',
    '''  for (const d of days) h += `<td class="${isSchoolDay(d) ? "" : "off"}">${schoolEventsOn(d).filter(e => evSlotsOf(e).includes("asa")).map(e => ''' + chip2 + ''').join("")}<textarea class="asa" data-d="${d}" placeholder="打合せ・朝会など">''')
rep('''      for (const d of days) h += `<td class="${isSchoolDay(d) ? "" : "off"}"><textarea class="br" data-d="${d}" data-k="${key}" placeholder="${lab}休みの予定">''',
    '''      for (const d of days) h += `<td class="${isSchoolDay(d) ? "" : "off"}">${schoolEventsOn(d).filter(e => evSlotsOf(e).includes(key)).map(e => ''' + chip2 + ''').join("")}<textarea class="br" data-d="${d}" data-k="${key}" placeholder="${lab}休みの予定">''')
rep('''  $$("textarea.ev", el).forEach(t => t.oninput = () => { ensureDay(t.dataset.d).event = t.value; changed(false); });''',
    '''  $$("textarea.ev", el).forEach(t => t.oninput = () => { ensureDay(t.dataset.d).event = t.value; changed(false); });
  $$("[data-evopen]", el).forEach(b => b.onclick = () => { const e = (D.school.events || []).find(x => x.id === b.dataset.evopen); if (e) openEvEditor(e); });
  $$("[data-hideev]", el).forEach(b => b.onclick = () => {
    const e = (D.school.events || []).find(x => x.id === b.dataset.hideev); if (!e) return;
    if (!confirm(`「${e.name}」を自分の週案に入れないようにしますか？（行事予定のタブで、いつでも戻せます）`)) return;
    (D.me.hideEv = D.me.hideEv || {})[e.id] = true; changed();
  });''')

# ---- 印刷：行事・朝・休み時間の帯にも行事予定を ----
rep('''<div class="cb" style="${boxStyle(dayRec(d).event, 7)}">${esc(dayRec(d).event || "")}</div>''', '''<div class="cb" style="${boxStyle(eventText(d), 7)}">${esc(eventText(d))}</div>''')
rep('''<div class="cb" style="${boxStyle(dayRec(d).asa, 5, 6)};line-height:1.15">${esc(dayRec(d).asa || "")}</div>''', '''<div class="cb" style="${boxStyle(bandText(d, "asa"), 5, 6)};line-height:1.15">${esc(bandText(d, "asa"))}</div>''')
rep('''<div class="cb" style="${boxStyle(dayRec(d)[key], BH)}">${esc(dayRec(d)[key] || "")}</div>''', '''<div class="cb" style="${boxStyle(bandText(d, key), BH)}">${esc(bandText(d, key))}</div>''')
rep('''  const AS = school.some(d => (dayRec(d).asa || "").trim()) ? 10 : 6.5;''', '''  const AS = school.some(d => bandText(d, "asa").trim()) ? 10 : 6.5;''')
rep('''  const bandTexts = school.flatMap(d => BREAKS.map(([, key]) => (dayRec(d)[key] || "").trim())).filter(Boolean);''', '''  const bandTexts = school.flatMap(d => BREAKS.map(([, key]) => bandText(d, key).trim())).filter(Boolean);''')
rep('''    const v = dayRec(d)[key] || "";
    return `<td><div class="${kind === "note" ? "" : "in"}" style="padding:0.4mm 1mm">''', '''    const v = key === "event" ? eventText(d) : (key === "asa" || key === "naka" || key === "hiru") ? bandText(d, key) : (dayRec(d)[key] || "");
    return `<td><div class="${kind === "note" ? "" : "in"}" style="padding:0.4mm 1mm">''')

# ---- 年度を変えるとき：前の年度の行事予定・休み・授業日も消す ----
rep('''    if (confirm("前の年度の「使い始める日」「それまでの時数」「とちゅうから変わる時間割」を消します。よろしいですか？（「キャンセル」なら残します）")) {
      me.startDate = ""; me.init = {}; D.ttChanges = []; ttSel = -1;''', '''    if (confirm("前の年度の「使い始める日」「それまでの時数」「とちゅうから変わる時間割」「行事予定」を消します。よろしいですか？（「キャンセル」なら残します）")) {
      me.startDate = ""; me.init = {}; D.ttChanges = []; ttSel = -1;
      D.school.events = (D.school.events || []).filter(e => e.from >= yearStart()); me.hideEv = {};
      for (const k of ["offDays", "onDays"]) for (const d of Object.keys(D.school[k] || {})) if (d < yearStart()) delete D.school[k][d];''')
rep('''  <p class="hint">配布用のファイルには、学校の設定（年度・後期・休業日・教科と時数）だけが入ります。名前・時間割・週案は入りません。</p>''',
    '''  <p class="hint">配布用のファイルには、学校の設定（年度・後期・休業日・教科と時数）と、行事予定（休み・土曜授業もふくむ）だけが入ります。名前・時間割・週案は入りません。</p>''')

# ---- 見た目（スマート週案簿と同じ） ----
css = []
for line in W.split('\n'):
    if re.match(r'^(\.evchip|\.calbar|\.evslots|\.evsub|table\.cal|\.evmodal|\.evdlg|\.evgrid|\.evadd|\.evg\{|table\.evt)', line):
        css.append(line)
assert len(css) > 30, len(css)
rep('''.msg{white-space:pre-wrap;''', '\n'.join(css) + '''
.msg{white-space:pre-wrap;''')
open(p, 'w', encoding='utf-8').write(s)
print('ok', p, len(css))
