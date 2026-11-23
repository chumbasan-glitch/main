# 単元の進み具合を、週案の画面と印刷（時数表の下）に入れる。スマート週案簿・スマート専科用週案の両方に使う
#   使い方: python3 fixProg.py <ファイル> <shuan|senka> <古い版> <新しい版>
import sys
p, tool, old_v, new_v = sys.argv[1:5]
s = open(p, encoding='utf-8').read()
SENKA = tool == 'senka'
X = 'D.me' if SENKA else 'D.cls'


def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a))
    s = s.replace(a, b)


rep(f'const VERSION = "{old_v}";', f'const VERSION = "{new_v}";')

# ---- 進み具合を数える ----
if SENKA:
    rows_js = '''// 単元の進み具合：クラスごとに、その日までに入れた最後の単元・時
function progressRows(last) {
  return D.classes.map(c => {
    const l = lastOf(c.id, addDays(last, 1), 0); const un = l ? planOf(c).find(u => u.name === l.unit) : null;
    return {key: c.id, name: clsLabel(c), color: c.color, unit: l ? l.unit : "", no: l ? l.no : 0, total: un ? lessonCount(un) : 0, course: ""};
  });
}
const progOn = () => D.me.printProg !== false;   // 印刷に進み具合を入れる（専科用は、はじめから入れる）
'''
    head, col = 'クラス', 'クラスごと'
else:
    rows_js = '''// 単元の進み具合：教科ごとに、その日までに入れた最後の単元・時（単元計画のある教科）
function progressRows(last) {
  const st = {};
  for (const dd of Object.keys(D.days).sort()) {
    if (dd < yearStart()) continue;   // 前の年度の分は見ない
    if (dd > last) break;
    if (!isSchoolDay(dd)) continue;
    (D.days[dd].slots || []).slice(1, P() + 1).forEach(x => [x, ...(x.parts || [])].forEach(pt => { if (pt.s && pt.unit && parseNos(pt.no).length) st[pt.s] = {unit: pt.unit, no: Math.max(...parseNos(pt.no))}; }));
  }
  return gradeSubjects().filter(sj => (D.units[sj.name] || []).length || st[sj.name]).map(sj => {
    const l = st[sj.name]; const un = l ? (D.units[sj.name] || []).find(u => u.name === l.unit) : null;
    return {key: sj.name, name: sj.name, color: sj.color, unit: l ? l.unit : "", no: l ? l.no : 0, total: un ? lessonCount(un) : 0, course: l && hasCourse(sj.name) ? ((D.cls.courses[sj.name] || {})[l.unit] || "") : ""};
  });
}
const progOn = () => !!D.cls.printProg;   // 印刷に進み具合を入れる（設定で選ぶ。はじめは入れない）
'''
    head, col = '教科', '教科ごと'
common = rows_js + '''const progNo = r => r.no ? r.no + (r.total ? "/" + r.total : "") : "";
const progFit = (t, w, base) => { const n = Math.max(1, Array.from(String(t)).length); return Math.max(3.6, Math.min(base, w / (n * 0.3528 * 0.95))).toFixed(1); };
// 週案の画面の右：進み具合の表
function progressHtml(last) {
  const rows = progressRows(last); if (!rows.length) return "";
  let h = `<h3>単元の進み具合（${md(last)}まで）</h3><table class="prog"><tr><th>''' + head + '''</th><th>単元</th><th>時</th></tr>`;
  for (const r of rows) h += `<tr><td><span class="chip" style="background:${r.color}"></span>${esc(r.name)}</td><td>${esc(r.unit || "―")}${r.course ? `<small>（${esc(r.course)}）</small>` : ""}</td><td>${esc(progNo(r))}</td></tr>`;
  return h + `</table><p class="hint">この週の終わりまでに入れた、いちばん新しい単元と時です（「3/8」は8時間のうちの3時間目）。印刷に入れるかは、設定の「印刷に単元の進み具合」で選べます。</p>`;
}
// 印刷：時数表の下に入れる小さな表（wmm＝欄の幅）。単元が入っている''' + col + '''の分だけ
function progPrintHtml(last, wmm, base = 6.3) {
  const rows = progressRows(last).filter(r => r.unit); if (!rows.length) return "";
  const nw = 9, hw = 6.5, uw = wmm - nw - hw;
  return `<div class="pgx"><div class="pgh">単元の進み具合</div><table class="pgt"><colgroup><col style="width:${nw}mm"><col><col style="width:${hw}mm"></colgroup>${rows.map(r => `<tr><td style="font-size:${progFit(r.name, nw - 0.6, base)}pt">${esc(r.name)}</td><td class="u" style="font-size:${progFit(r.unit, uw - 0.8, base)}pt">${esc(r.unit)}</td><td style="font-size:${progFit(progNo(r), hw - 0.5, base)}pt">${esc(progNo(r))}</td></tr>`).join("")}</table></div>`;
}
// 印刷（ワイド）：下の時数表に「進み」の行を足す
function progHbRow(all, last, colw) {
  const pm = {}; for (const r of progressRows(last)) if (r.unit) pm[r.key] = r;
  if (!Object.keys(pm).length) return "";
  return `<tr class="pg"><th class="l">進み</th>${all.map(r => { const x = pm[r.id || r.name]; return `<td>${x ? `<span style="font-size:${progFit(x.unit, colw, 5.5)}pt">${esc(x.unit)}</span><br>${esc(progNo(x))}` : ""}</td>`; }).join("")}<td></td></tr>`;
}
'''
if SENKA:
    a = s.index('function progressHtml(last) {')
    b = s.index('// コマの上の欄：一覧から選ぶことも、打ち込むこともできる', a)
    s = s[:a] + common + s[b:]
else:
    rep('function rateCell(', common + 'function rateCell(')
    rep('''  <div class="side">${weekTotalsHtml(mon)}</div></div>`;''', '''  <div class="side">${weekTotalsHtml(mon)}${progressHtml(addDays(mon, 6))}</div></div>`;''')
    rep('''.side h3{margin-top:0}''', '''.side h3{margin-top:0}
.side h3+table.prog,.side .hint+h3{margin-top:10px}
table.prog{border-collapse:collapse;width:100%;font-size:12px;margin-top:6px}
table.prog th,table.prog td{border:1px solid var(--line);padding:2px 5px;text-align:left}
table.prog th{background:var(--surface-2);text-align:center}
table.prog small{color:var(--ink-soft)}''')

# ---- 印刷：これまでのシート ----
rep('''  const SIDE = PM === "full", REC = PM !== "gridonly";''', '''  const SIDE = PM === "full", REC = PM !== "gridonly";
  const PROG = SIDE && progOn();''')
rep('''h += (SIDE ? `<div class="side">${t}<div class="memo">''', '''h += (SIDE ? `<div class="side">${t}${PROG ? progPrintHtml(last, 34) : ""}<div class="memo">''')
# ---- 印刷：新しいシート ----
rep('''  const HOURS = PM === "full";''', '''  const HOURS = PM === "full";
  const PROG = HOURS && progOn();''')
rep('''  const BOTTOM = (kind === "wide" && HOURS ? 19 : 0) + (EX ? 24 : 0);''', '''  const BOTTOM = (kind === "wide" && HOURS ? 19 : 0) + (kind === "wide" && PROG && progressRows(addDays(mon, 6)).some(r => r.unit) ? 7 : 0) + (EX ? 24 : 0);''')
rep('''        <tr class="r3"><th class="l">${rlab}</th>${all.map(r => `<td>${rateCell(r)}</td>`).join("")}<td></td></tr></table>`;''',
    '''        <tr class="r3"><th class="l">${rlab}</th>${all.map(r => `<td>${rateCell(r)}</td>`).join("")}<td></td></tr>${PROG ? progHbRow(all, last, (168 - FRAME - 21) / all.length - 0.8) : ""}</table>`;''')
rep('''  const exW = (168 - FRAME - 2) / 2 - 2.6;''', '''  if (PROG && side) side = side.replace(/<\\/div>$/, progPrintHtml(last, SIDEW - 1) + "</div>");
  const exW = (168 - FRAME - 2) / 2 - 2.6;''')
rep('''#print .k{font-weight:700}''', '''#print .k{font-weight:700}
#print .pgx{border-top:0.35mm solid var(--pl);margin-top:0.8mm;flex:none}
#print .pgx .pgh{font-size:6.3pt;font-weight:700;background:var(--ph);padding:0.4mm 1mm;line-height:1.2}
#print table.pgt{width:100%;border-collapse:collapse;table-layout:fixed}
#print table.pgt td{height:3.5mm;padding:0.3mm 0.4mm 0;border:none;border-bottom:0.2mm solid #BBB;white-space:nowrap;overflow:hidden;line-height:1.05;text-align:center;vertical-align:middle;letter-spacing:-0.02em;background:#fff}
#print table.pgt td.u{text-align:left}
#print table.hb tr.pg td{height:6.2mm;line-height:1.1;white-space:nowrap;overflow:hidden;font-size:5.5pt;vertical-align:middle}''')

# ---- 設定：印刷に入れるか ----
sel = '''<label class="f">印刷に単元の進み具合<select id="sProg"><option value="1"${progOn() ? " selected" : ""}>入れる（時数表の下）</option><option value="0"${progOn() ? "" : " selected"}>入れない</option></select></label>'''
if SENKA:
    rep('''.join("")}</select></label><label class="f" style="grid-column:span 2">週案のコマに入る学習内容''', '''.join("")}</select></label>''' + sel + '''<label class="f" style="grid-column:span 2">週案のコマに入る学習内容''')
    rep('''  $("#sPrintMode").onchange = upd(v => me.printMode = v);''', '''  $("#sPrintMode").onchange = upd(v => me.printMode = v);
  $("#sProg").onchange = upd(v => me.printProg = v === "1");''')
    # ---- 上のボタンの並び：スマート週案簿に合わせる ----
    rep('''    <span class="prbox"><button class="btn" id="wPrint">🖨 印刷（B5縦）</button><span class="b5note">印刷の画面で、用紙サイズを「B5」にするのを忘れずに！</span></span>
    <button class="btn" id="wPdf" title="印刷の画面で「PDFとして保存」を選ぶと、このファイル名で保存されます">📄 PDFで保存</button>''',
        '''    <button class="btn" id="wPrint">🖨 印刷（B5縦）</button>
    <button class="btn" id="wPdf" title="印刷の画面で「PDFとして保存」を選ぶと、このファイル名で保存されます">📄 PDFで保存</button>
    <span class="papernote" title="パソコンによっては、印刷の画面がA4になっていることがあります">印刷の画面で、用紙サイズを<b>「B5」</b>にするのを忘れずに！</span>''')
    rep('''.prbox{display:inline-flex;flex-direction:column;align-items:center;gap:3px}
''', '''.weekbar .papernote{width:100%;text-align:right;font-size:12.5px;color:#7A5200;margin-top:-4px}
.weekbar .papernote b{background:#FFF0C2;padding:0 4px;border-radius:3px}
''')
else:
    rep('''.join("")}</select></label></div>
  <h3>週案に単元計画のねらいの文を入れる教科</h3>''', '''.join("")}</select></label>''' + sel + '''</div>
  <h3>週案に単元計画のねらいの文を入れる教科</h3>''')
    rep('''  $("#sPrintMode").onchange = upd(v => c.printMode = v);''', '''  $("#sPrintMode").onchange = upd(v => c.printMode = v);
  $("#sProg").onchange = upd(v => c.printProg = v === "1");''')
open(p, 'w', encoding='utf-8').write(s)
print('ok', p)
