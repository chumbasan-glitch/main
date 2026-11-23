# 「印刷の形」の選ぶ欄をやめて、印刷に入れるもの（時数表・メモ／記録欄／単元の進み具合）をチェックで選ぶ
#   使い方: python3 fixPrChk.py <ファイル> <shuan|senka> <古い版> <新しい版>
import sys, re
p, tool, old_v, new_v = sys.argv[1:5]
s = open(p, encoding='utf-8').read()
SENKA = tool == 'senka'
X = 'D.me' if SENKA else 'D.cls'
V = 'me' if SENKA else 'c'   # 設定の画面で使っている名前


def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a))
    s = s.replace(a, b)


rep(f'const VERSION = "{old_v}";', f'const VERSION = "{new_v}";')
# 前の「印刷の形」（full・nohours・gridonly）から、はじめの値を決める
rep('const progNo = r =>', f'''// 印刷に入れるもの（設定のチェック）。前の「印刷の形」で選んでいたときは、それに合わせる
const prHours = () => {X}.printHours ?? !["nohours", "gridonly"].includes({X}.printMode);   // 右の時数表・メモ
const prRec = () => {X}.printRec ?? {X}.printMode !== "gridonly";                          // 記録欄（新しいシートは、メモ・記録欄・備考）
const progNo = r =>''')
# これまでのシート
rep(f'''  const PM = ["nohours", "gridonly"].includes({X}.printMode) ? {X}.printMode : "full";
  const SIDE = PM === "full", REC = PM !== "gridonly";''', '''  const SIDE = prHours(), REC = prRec();''')
# 新しいシート
rep('''  const PM = ["nohours", "gridonly"].includes(c.printMode) ? c.printMode : "full";
  const HOURS = PM === "full";''', '''  const HOURS = prHours();''')
rep('''  const EX = PM !== "gridonly" && !!c.sheetExtras;''', '''  const EX = prRec() && !!c.sheetExtras;''')
# 設定の画面
m = re.search(r'<label class="f">印刷の形<select id="sPrintMode">.*?</select></label><label class="f">印刷に単元の進み具合<select id="sProg">.*?</select></label>', s)
assert m
s = s[:m.start()] + '''<div class="fset" style="grid-column:span 2">印刷に入れるもの<span class="prchk"><label><input type="checkbox" id="sPrHours"${prHours() ? " checked" : ""}> 時数表・メモ（右）</label><label><input type="checkbox" id="sPrRec"${prRec() ? " checked" : ""}> 記録欄（いちばん下）</label><label title="時数表を入れるときだけ入ります"><input type="checkbox" id="sPrProg"${progOn() ? " checked" : ""}${prHours() ? "" : " disabled"}> 単元の進み具合（時数表の下）</label></span></div>''' + s[m.end():]
rep(f'''  $("#sPrintMode").onchange = upd(v => {V}.printMode = v);
  $("#sProg").onchange = upd(v => {V}.printProg = v === "1");''', f'''  $("#sPrHours").onchange = e => {{ {V}.printHours = e.target.checked; changed(); }};
  $("#sPrRec").onchange = e => {{ {V}.printRec = e.target.checked; changed(); }};
  $("#sPrProg").onchange = e => {{ {V}.printProg = e.target.checked; changed(); }};''')
rep('''label.f>*{font-size:14px;color:var(--ink)}''', '''label.f>*{font-size:14px;color:var(--ink)}
.fset{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--ink-soft)}
.prchk{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:14px;color:var(--ink);padding:3px 0}
.prchk label{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.prchk label:has(input:disabled){color:var(--ink-soft)}''')
# 説明の文の「印刷の形」
for a in re.findall(r'[^\n]{0,60}印刷の形[^\n]{0,60}', s):
    print('  のこり:', a)
open(p, 'w', encoding='utf-8').write(s)
print('ok', p)
