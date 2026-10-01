import random
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.pagebreak import Break, RowBreak
from openpyxl.utils import get_column_letter as CL

OUT = '/home/user/main/委員会名簿/委員会名簿作成ツール（テストデータ入り）.xlsx'
FONT = '游ゴシック'
NC, NS, NW, NM = 20, 300, 400, 40     # 委員会数, 児童数, 希望行数, 1委員会の人数
random.seed(7)

f = lambda **k: Font(name=FONT, **{'size': 11, **k})
YEL = PatternFill('solid', fgColor='FFF2CC')
GRY = PatternFill('solid', fgColor='EDEDED')
HDR = PatternFill('solid', fgColor='DDEBF7')
RED = PatternFill('solid', fgColor='F8CBAD')
thin = Side(style='thin', color='808080')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
CEN = Alignment(horizontal='center', vertical='center')
LFT = Alignment(horizontal='left', vertical='center')
WRAP = Alignment(wrap_text=True, vertical='top')

wb = Workbook()
def sheet(name, first=False):
    ws = wb.active if first else wb.create_sheet(name)
    ws.title = name
    return ws
def put(ws, ref, v, font=None, fill=None, al=None, box=False, unlock=False):
    c = ws[ref]; c.value = v; c.font = font or f()
    if fill: c.fill = fill
    if al: c.alignment = al
    if box: c.border = BOX
    if unlock: c.protection = Protection(locked=False)
    return c
def protect(ws, filt=False):
    ws.protection.sheet = True
    if filt:
        ws.protection.autoFilter = False
        ws.protection.sort = False
    ws.protection.formatColumns = False
    ws.protection.formatRows = False
def cf(ws, rng, formula, fill=None, font=None):
    ws.conditional_formatting.add(rng, FormulaRule(formula=[formula], fill=fill, font=font))

S = '設定'
CNAMES = f"{S}!$G$8:$G$27"

# ---------------- テストデータ ----------------
COMM = [  # 名称, 6年, 5年, 担当, 場所
 ('代表', 8, 8, '6梅', '会議室'), ('集会', 12, 12, '6月', '体育館'), ('放送', 12, 12, '5竹', '放送室'),
 ('音楽', 8, 8, '5松', '音楽室'), ('飼育', 16, 16, '6竹', '飼育小屋'), ('図書', 12, 12, '5梅', '図書室'),
 ('体育', 14, 13, '6松', '体育倉庫前'), ('保健', 8, 8, '5月', '保健室'), ('環境', 10, 10, '6竹', '理科室'),
 ('給食', 12, 12, '5松', '家庭科室'), ('掲示', 9, 9, '6月', '図工室'), ('広報', 10, 10, '5竹', 'パソコン室')]
CLASSES = ['松', '竹', '梅', '月']
SUR = '佐藤 鈴木 高橋 田中 伊藤 渡辺 山本 中村 小林 加藤 吉田 山田 佐々木 山口 松本 井上 木村 林 斎藤 清水 山崎 森 池田 橋本 阿部 石川 山下 中島 石井 小川 前田 岡田 長谷川 藤田 後藤 近藤 村上 遠藤 青木 坂本'.split()
GIV = '蓮 陽翔 湊 蒼 樹 大和 悠真 陽太 朝陽 律 颯太 結翔 優斗 奏太 新 陸 海斗 健太 拓海 航 陽葵 凛 結菜 芽依 葵 紬 澪 結衣 咲良 美月 心春 杏 莉子 彩花 花音 柚葉 千尋 楓 真央 さくら'.split()
students = []   # (学年, 組, 番号, 名前)
used = set()
for g in (6, 5):
    for c in CLASSES:
        for n in range(1, 31):
            while True:
                nm = random.choice(SUR) + '　' + random.choice(GIV)
                if nm not in used: used.add(nm); break
            students.append((g, c, n, nm))
names = [x[0] for x in COMM]
unsub = {(6, '竹', 12), (6, '月', 27), (5, '松', 5), (5, '梅', 18)}
OVER = {6: {'飼育': 4, '体育': 3}, 5: {'図書': 3}}   # 第1希望で定員を超える人数
def first_list(g, n_kids):
    caps = {c[0]: (c[1] if g == 6 else c[2]) for c in COMM}
    cnt = {n: caps[n] + OVER[g].get(n, 0) for n in names}
    # 合計が人数になるまで、オーバー以外の委員会から1人ずつ減らす
    while sum(cnt.values()) > n_kids:
        n = random.choice([x for x in names if x not in OVER[g] and cnt[x] > 2])
        cnt[n] -= 1
    lst = [n for n in names for _ in range(cnt[n])]
    random.shuffle(lst)
    return lst
wishes = []
for g in (6, 5):
    kids = [s for s in students if s[0] == g and s[:3] not in unsub]
    firsts = first_list(g, len(kids))
    for st, f1 in zip(kids, firsts):
        rest = random.sample([n for n in names if n != f1], 2)
        wishes.append([g, st[1], st[2], f1] + rest)
random.shuffle(wishes)
# 入力ミスの例
dup = next(w for w in wishes if w[0] == 6 and w[1] == '梅' and w[2] == 9)
wishes.insert(10, [6, '梅', 9, '掲示', '広報', '環境'])        # 先に出した分（後の行が採用される）
wishes.append([5, '竹', 35, '放送', '給食', '保健'])            # 名簿にいない
for w in wishes:
    if w[0] == 5 and w[1] == '月' and w[2] == 21:
        w[3:] = ['給食', '給食', '掲示']                         # 重複希望
        break

# ---------------- 1. 使い方 ----------------
ws = sheet('使い方', first=True)
ws.column_dimensions['A'].width = 4; ws.column_dimensions['B'].width = 100
put(ws, 'B1', '委員会名簿作成ツール　使い方', f(size=16, bold=True))
lines = [
 ('■ 色のきまり', True),
 ('黄色いセル＝先生が入力する所です。それ以外のセルには数式が入っているので、変更できないように保護しています。', False),
 ('（保護を外すときは「校閲」→「シート保護の解除」。パスワードはありません）', False),
 ('', False),
 ('■ 手順', True),
 ('① 【設定】年度、呼び名（委員会／クラブ）、学年、組、委員会の名前・定員・担当・活動場所を入力します。', False),
 ('　 ・委員会を増やす：空いている行に書きこむ　　・減らす：行の中身を消す　　・名前を変える：書きかえる', False),
 ('　 ・片方の学年だけの委員会は、もう片方の定員を 0 にします。', False),
 ('② 【児童名簿】5・6年全員の「学年・組・番号・名前」を貼り付けます（並び順はばらばらでかまいません）。', False),
 ('　 ・学年は数字（6、5）、組は設定シートと同じ書き方（松、竹…）で入れます。', False),
 ('③ 【希望入力】学年・組・番号・第1〜第3希望を入れます。', False),
 ('　 ・紙の場合：打ち込みます（希望はプルダウンで選べます）。', False),
 ('　 ・Formsの場合：結果の表から「学年〜第3希望」の6列をコピーし、A列の2行目に「値の貼り付け」をします。', False),
 ('　 ・右側の「チェック」欄に「名簿にいない」「2回提出」などが出たら確認してください。2回提出は下の行（後から出したほう）が使われます。', False),
 ('④ 【振り分け】第1希望が定員内の子は自動で決まります。定員オーバーの委員会を希望した子は「要調整」（赤）になります。', False),
 ('　 ・見出しのフィルター（▼）で「第1希望」を絞りこむと、同じ委員会を希望した子だけが並びます。', False),
 ('　 ・「第2希望の空き」「第3希望の空き」に、その学年であと何人入れるかが出ます。', False),
 ('　 ・話し合いなどで決まったら、残る子にも移る子にも「先生の決定」欄へ委員会を入れます（プルダウン）。', False),
 ('　 ・未提出の子も「先生の決定」欄に入れれば決定になります。', False),
 ('⑤ 【定員チェック】「未提出」「要調整」「定員オーバー」が 0 になれば完成です。', False),
 ('⑥ 【一覧名簿】【委員会①〜⑳】を印刷します。一覧名簿はA3横で、上段（①〜⑩）が1ページ目、下段（⑪〜⑳）が2ページ目です。', False),
 ('　 ・委員会が10以下のときは、1ページ目だけ印刷してください。', False),
 ('　 ・委員会①〜⑳のタブ名は、右クリック→「名前の変更」で「飼育」などに変えてもかまいません。', False),
 ('', False),
 ('■ Microsoft Forms の作り方（希望を集める場合）', True),
 ('質問を次の順番で作ってください。結果をExcelで開いたときに、この6列が横に並びます。', False),
 ('　1. 学年（選択肢：6／5）　2. 組（選択肢：松／竹／梅／月 など設定と同じ）　3. 番号（数値）', False),
 ('　4. 第1希望　5. 第2希望　6. 第3希望（選択肢：委員会名を設定シートと同じ書き方で）', False),
 ('※ Formsのデータは学校のMicrosoft 365に保存されます。使ってよいかは学校のルールを確認してください。', False),
 ('', False),
 ('■ 上限', True),
 ('委員会 20／1学年の組 8／児童 300人／希望入力 400行／1つの委員会 40人', False),
 ('', False),
 ('■ テストデータについて', True),
 ('名前はすべて架空です。本番で使うときは、【児童名簿】【希望入力】のデータと、【振り分け】の「先生の決定」欄を消してから使ってください。', False),
]
for i, (t, b) in enumerate(lines, start=3):
    put(ws, f'B{i}', t, f(bold=b, size=12 if b else 11))
ws.sheet_view.showGridLines = False

# ---------------- 2. 設定 ----------------
ws = sheet(S)
for col, w in zip('ABCDEFGHIJKL', [8, 10, 14, 8, 3, 6, 16, 10, 10, 12, 16, 10]):
    ws.column_dimensions[col].width = w
put(ws, 'A1', '設定（黄色いセルを入力してください）', f(size=14, bold=True))
put(ws, 'A3', '年度など', f(bold=True)); put(ws, 'B3', '令和8年度', fill=YEL, box=True, unlock=True)
ws.merge_cells('B3:C3')
put(ws, 'A4', '呼び名', f(bold=True)); put(ws, 'B4', '委員会', fill=YEL, box=True, unlock=True)
dv = DataValidation(type='list', formula1='"委員会,クラブ"', allow_blank=False); ws.add_data_validation(dv); dv.add('B4')
put(ws, 'D4', '← 委員会／クラブ', f(color='808080', size=9))
put(ws, 'A6', '組の設定（上から名簿の並び順。学年ごとに最大8組）', f(bold=True))
for c, h in zip('ABCD', ['学年', '組', '名簿での表示', '（自動）']):
    put(ws, f'{c}7', h, f(bold=True), HDR, CEN, True)
for i in range(16):
    r = 8 + i
    put(ws, f'A{r}', '=$H$6' if i < 8 else '=$I$6', fill=GRY, al=CEN, box=True)
    cls = CLASSES[i % 8] if (i % 8) < 4 else None
    put(ws, f'B{r}', cls, fill=YEL, al=CEN, box=True, unlock=True)
    put(ws, f'C{r}', f'=IF(B{r}="","",A{r}&B{r})', fill=YEL, al=CEN, box=True, unlock=True)
    put(ws, f'D{r}', f'=IF(B{r}="","",A{r}&"-"&B{r})', f(color='808080', size=9), GRY, CEN, True)
put(ws, 'A25', '※「名簿での表示」は自動で「学年＋組」になります。「6-1」などにしたいときは書きかえてかまいません。', f(size=9, color='808080'))

put(ws, 'F6', '学年 →', f(bold=True), al=Alignment(horizontal='right'))
ws.merge_cells('F6:G6')
put(ws, 'H6', 6, f(bold=True), YEL, CEN, True, True)
put(ws, 'I6', 5, f(bold=True), YEL, CEN, True, True)
put(ws, 'J6', '← 上の学年／下の学年（数字）', f(color='808080', size=9))
for c, h in zip('FGHIJKL', ['No.', '委員会名', '=H6&"年定員"', '=I6&"年定員"', '担当', '活動場所', '定員合計']):
    put(ws, f'{c}7', h, f(bold=True), HDR, CEN, True)
for i in range(NC):
    r = 8 + i
    put(ws, f'F{r}', i + 1, fill=GRY, al=CEN, box=True)
    d = COMM[i] if i < len(COMM) else (None,) * 5
    for c, v in zip('GHIJK', d):
        put(ws, f'{c}{r}', v, fill=YEL, al=CEN, box=True, unlock=True)
    put(ws, f'L{r}', f'=IF(G{r}="","",H{r}+I{r})', fill=GRY, al=CEN, box=True)
put(ws, 'F29', '※ 委員会は上から順に「委員会①、②…」のシートに入ります。', f(size=9, color='808080'))
dv = DataValidation(type='whole', operator='between', formula1='0', formula2='40', allow_blank=True)
ws.add_data_validation(dv); dv.add('H8:I27')
cf(ws, 'G8:G27', 'AND(G8<>"",COUNTIF($G$8:$G$27,G8)>1)', RED)
protect(ws)

# ---------------- 3. 児童名簿 ----------------
ws = sheet('児童名簿')
for col, w in zip('ABCDEFGH', [7, 7, 7, 18, 3, 12, 10, 22]):
    ws.column_dimensions[col].width = w
for c, h in zip('ABCD', ['学年', '組', '番号', '名前']):
    put(ws, f'{c}1', h, f(bold=True), HDR, CEN, True)
for c, h in zip('FGH', ['キー（自動）', '並び順（自動）', 'チェック（自動）']):
    put(ws, f'{c}1', h, f(bold=True, size=9), GRY, CEN, True)
for i in range(NS):
    r = 2 + i
    st = students[i] if i < len(students) else (None,) * 4
    for c, v in zip('ABCD', st):
        put(ws, f'{c}{r}', v, fill=YEL, al=CEN if c != 'D' else LFT, unlock=True)
    put(ws, f'F{r}', f'=IF(D{r}="","",A{r}&"-"&B{r}&"-"&C{r})', f(size=9, color='808080'))
    put(ws, f'G{r}', f'=IF(F{r}="","",IFERROR(MATCH(A{r}&"-"&B{r},{S}!$D$8:$D$23,0),99)*1000+C{r}+ROW()/100000)', f(size=9, color='808080'))
    put(ws, f'H{r}', f'=IF(F{r}="","",IF(ISERROR(MATCH(A{r}&"-"&B{r},{S}!$D$8:$D$23,0)),"設定にない学年・組",IF(COUNTIF($F$2:$F${NS+1},F{r})>1,"同じ学年・組・番号がいる","")))', f(size=9, color='C00000'))
ws.freeze_panes = 'A2'
cf(ws, f'A2:D{NS+1}', '$H2<>""', RED)
protect(ws)

# ---------------- 4. 希望入力 ----------------
ws = sheet('希望入力')
for col, w in zip('ABCDEFGHIJK', [7, 7, 7, 11, 11, 11, 16, 26, 3, 10, 10]):
    ws.column_dimensions[col].width = w
for c, h in zip('ABCDEF', ['学年', '組', '番号', '第1希望', '第2希望', '第3希望']):
    put(ws, f'{c}1', h, f(bold=True), HDR, CEN, True)
for c, h in zip('GHJK', ['名前（自動）', 'チェック（自動）', 'キー（自動）', '採用（自動）']):
    put(ws, f'{c}1', h, f(bold=True, size=9 if c in 'JK' else 11), GRY, CEN, True)
R2 = NW + 1
for i in range(NW):
    r = 2 + i
    w = wishes[i] if i < len(wishes) else (None,) * 6
    for c, v in zip('ABCDEF', w):
        put(ws, f'{c}{r}', v, fill=YEL, al=CEN, unlock=True)
    put(ws, f'J{r}', f'=IF(A{r}="","",A{r}&"-"&B{r}&"-"&C{r})', f(size=9, color='808080'))
    put(ws, f'G{r}', f'=IF(J{r}="","",IFERROR(INDEX(児童名簿!$D$2:$D${NS+1},MATCH(J{r},児童名簿!$F$2:$F${NS+1},0)),""))')
    bad = lambda c: f'AND({c}{r}<>"",COUNTIF({CNAMES},{c}{r})=0)'
    put(ws, f'H{r}', (f'=IF(J{r}="","",IF(G{r}="","名簿にいない",IF(COUNTIF(J{r+1}:J${R2+1},J{r})>0,"2回提出（下の行を使います）",'
                      f'IF(OR({bad("D")},{bad("E")},{bad("F")}),"委員会名がちがう",IF(D{r}="","第1希望がない",'
                      f'IF(OR(AND(D{r}<>"",D{r}=E{r}),AND(D{r}<>"",D{r}=F{r}),AND(E{r}<>"",E{r}=F{r})),"同じ委員会を重複して希望","OK"))))))'),
        al=LFT)
    put(ws, f'K{r}', f'=IF(OR(J{r}="",G{r}=""),"",IF(COUNTIF(J{r+1}:J${R2+1},J{r})=0,J{r},""))', f(size=9, color='808080'))
dv = DataValidation(type='list', formula1=CNAMES, allow_blank=True, showErrorMessage=False)
ws.add_data_validation(dv); dv.add(f'D2:F{R2}')
cf(ws, f'H2:H{R2}', 'AND(H2<>"",H2<>"OK")', RED)
ws.freeze_panes = 'A2'
protect(ws)

# ---------------- 5. 振り分け ----------------
ws = sheet('振り分け')
F0, FL = 3, 2 + NS
heads = ['組', '番号', '名前', '第1希望', '第2希望', '第3希望', '自動仮決定', '先生の決定', '最終決定', '状態', '第2希望の空き', '第3希望の空き',
         '学年', '名簿行', '希望行', 'キー', '委員会No', '委員会内順', '一覧キー']
for col, w in zip('ABCDEFGHIJKLMNOPQRS', [6, 6, 16, 10, 10, 10, 11, 12, 11, 9, 9, 9, 6, 6, 6, 9, 6, 6, 8]):
    ws.column_dimensions[col].width = w
put(ws, 'A1', '振り分け　　「要調整」の子は、話し合いなどで決まったら「先生の決定」（黄色）にプルダウンで委員会を入れてください。', f(bold=True))
for i, h in enumerate(heads):
    c = CL(i + 1)
    put(ws, f'{c}2', h, f(bold=True, size=9 if i >= 12 else 11), YEL if c == 'H' else (GRY if i >= 12 else HDR),
        Alignment(horizontal='center', vertical='center', wrap_text=True), True)
ws.row_dimensions[2].height = 30
CAP = lambda comm, r: f'INDEX({S}!$H$8:$I$27,MATCH({comm},{CNAMES},0),IF($M{r}={S}!$H$6&"",1,2))'
for r in range(F0, FL + 1):
    k = r - F0 + 1
    put(ws, f'N{r}', f'=IFERROR(MATCH(SMALL(児童名簿!$G$2:$G${NS+1},{k}),児童名簿!$G$2:$G${NS+1},0),"")')
    put(ws, f'P{r}', f'=IF(N{r}="","",INDEX(児童名簿!$F$2:$F${NS+1},N{r}))')
    put(ws, f'M{r}', f'=IF(N{r}="","",INDEX(児童名簿!$A$2:$A${NS+1},N{r})&"")')
    put(ws, f'O{r}', f'=IF(P{r}="","",IFERROR(MATCH(P{r},希望入力!$K$2:$K${R2},0),""))')
    put(ws, f'A{r}', f'=IF(N{r}="","",IFERROR(INDEX({S}!$C$8:$C$23,INT(INDEX(児童名簿!$G$2:$G${NS+1},N{r})/1000)),M{r}&INDEX(児童名簿!$B$2:$B${NS+1},N{r})))', al=CEN)
    put(ws, f'B{r}', f'=IF(N{r}="","",INDEX(児童名簿!$C$2:$C${NS+1},N{r}))', al=CEN)
    put(ws, f'C{r}', f'=IF(N{r}="","",INDEX(児童名簿!$D$2:$D${NS+1},N{r}))')
    for c, src in zip('DEF', 'DEF'):
        put(ws, f'{c}{r}', f'=IF(O{r}="","",INDEX(希望入力!${src}$2:${src}${R2},O{r})&"")', al=CEN)
    put(ws, f'G{r}', f'=IF(O{r}="","",IF(D{r}="","要調整",IFERROR(IF(COUNTIFS($M${F0}:$M${FL},M{r},$D${F0}:$D${FL},D{r})<={CAP(f"D{r}", r)},D{r},"要調整"),"要調整")))', al=CEN)
    put(ws, f'H{r}', None, fill=YEL, al=CEN, unlock=True)
    put(ws, f'I{r}', f'=IF(N{r}="","",IF(H{r}<>"",H{r},IF(OR(G{r}="",G{r}="要調整"),"",G{r})))', f(bold=True), al=CEN)
    put(ws, f'J{r}', f'=IF(N{r}="","",IF(I{r}<>"","決定",IF(O{r}="","未提出","要調整")))', al=CEN)
    for c, src in (('K', 'E'), ('L', 'F')):
        put(ws, f'{c}{r}', f'=IF(OR(J{r}<>"要調整",{src}{r}=""),"",IFERROR({CAP(f"{src}{r}", r)}-COUNTIFS($M${F0}:$M${FL},M{r},$I${F0}:$I${FL},{src}{r}),""))', al=CEN)
    put(ws, f'Q{r}', f'=IF(I{r}="","",IFERROR(MATCH(I{r},{CNAMES},0),""))', f(size=9, color='808080'))
    put(ws, f'R{r}', f'=IF(Q{r}="","",COUNTIF($Q${F0}:Q{r},Q{r}))', f(size=9, color='808080'))
    put(ws, f'S{r}', f'=IF(Q{r}="","",Q{r}*1000+R{r})', f(size=9, color='808080'))
    for c in 'MNOP':
        ws[f'{c}{r}'].font = f(size=9, color='808080')
dv = DataValidation(type='list', formula1=CNAMES, allow_blank=True)
ws.add_data_validation(dv); dv.add(f'H{F0}:H{FL}')
rng = f'A{F0}:L{FL}'
cf(ws, rng, f'$J{F0}="要調整"', RED)
cf(ws, rng, f'$J{F0}="未提出"', PatternFill('solid', fgColor='D9D9D9'))
cf(ws, f'H{F0}:H{FL}', f'H{F0}<>""', font=Font(name=FONT, bold=True, color='0000FF'))
ws.auto_filter.ref = f'A2:L{FL}'
ws.freeze_panes = 'D3'
ws.print_title_rows = '2:2'
ws.print_area = f'A1:L{FL}'
ws.page_setup.paperSize = ws.PAPERSIZE_A4; ws.page_setup.orientation = 'landscape'
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0; ws.sheet_properties.pageSetUpPr.fitToPage = True
protect(ws, filt=True)

# ---------------- 6. 定員チェック ----------------
ws = sheet('定員チェック')
for col, w in zip('ABCDEFGHIJK', [5, 12, 8, 9, 8, 8, 8, 9, 8, 8, 34]):
    ws.column_dimensions[col].width = w
put(ws, 'A1', '定員チェック', f(size=14, bold=True))
FR = f'振り分け!$J${F0}:$J${FL}'
summ = [('未提出', f'=COUNTIF({FR},"未提出")'), ('要調整', f'=COUNTIF({FR},"要調整")'),
        ('定員オーバーの委員会', '=COUNTIF($K$7:$K$26,"*オーバー*")'),
        ('希望入力のチェック 要確認', f'=SUMPRODUCT((希望入力!$H$2:$H${R2}<>"")*(希望入力!$H$2:$H${R2}<>"OK"))')]
for i, (lab, fm) in enumerate(summ):
    c1, c2 = ('B', 'E') if i < 2 else ('G', 'K')
    r = 3 + (i % 2)
    put(ws, f'{c1}{r}', lab, f(bold=True))
    put(ws, f'{"D" if i < 2 else "J"}{r}', fm, f(bold=True, size=12), al=CEN, box=True)
cf(ws, 'D3:D4', 'D3>0', RED); cf(ws, 'J3:J4', 'J3>0', RED)
put(ws, 'C5', '=H6年', f(bold=True), HDR, CEN, True)
ws['C5'] = f'={S}!H6&"年"'; ws.merge_cells('C5:F5')
put(ws, 'G5', f'={S}!I6&"年"', f(bold=True), HDR, CEN, True); ws.merge_cells('G5:J5')
for c, h in zip('ABCDEFGHIJK', ['No.', '委員会', '定員', '第1希望', '決定', '残り', '定員', '第1希望', '決定', '残り', '状態']):
    put(ws, f'{c}6', h, f(bold=True), HDR, CEN, True)
FM, FD, FI = f'振り分け!$M${F0}:$M${FL}', f'振り分け!$D${F0}:$D${FL}', f'振り分け!$I${F0}:$I${FL}'
for i in range(NC):
    r, sr = 7 + i, 8 + i
    put(ws, f'A{r}', i + 1, al=CEN, box=True)
    put(ws, f'B{r}', f'=IF({S}!G{sr}="","",{S}!G{sr})', al=CEN, box=True)
    for (cap, first, dec, rem, gcell, capc) in (('C', 'D', 'E', 'F', 'H6', 'H'), ('G', 'H', 'I', 'J', 'I6', 'I')):
        put(ws, f'{cap}{r}', f'=IF($B{r}="","",N({S}!{capc}{sr}))', al=CEN, box=True)
        put(ws, f'{first}{r}', f'=IF($B{r}="","",COUNTIFS({FM},{S}!${gcell[0]}$6&"",{FD},$B{r}))', al=CEN, box=True)
        put(ws, f'{dec}{r}', f'=IF($B{r}="","",COUNTIFS({FM},{S}!${gcell[0]}$6&"",{FI},$B{r}))', al=CEN, box=True)
        put(ws, f'{rem}{r}', f'=IF($B{r}="","",{cap}{r}-{dec}{r})', al=CEN, box=True)
        cf(ws, f'{first}{r}', f'AND($B{r}<>"",{first}{r}>{cap}{r})', RED)
        cf(ws, f'{rem}{r}', f'AND($B{r}<>"",{rem}{r}<0)', RED)
        cf(ws, f'{rem}{r}', f'AND($B{r}<>"",{rem}{r}>0)', PatternFill('solid', fgColor='FFF2CC'))
    g6, g5 = f'{S}!$H$6', f'{S}!$I$6'
    put(ws, f'K{r}', (f'=IF(B{r}="","",IF(OR(F{r}<0,J{r}<0),IF(F{r}<0,{g6}&"年 "&-F{r}&"人オーバー　","")&IF(J{r}<0,{g5}&"年 "&-J{r}&"人オーバー",""),'
                      f'IF(COUNTIFS({FR},"要調整",{FD},B{r})>0,"調整中（第1希望の要調整 "&COUNTIFS({FR},"要調整",{FD},B{r})&"人）",'
                      f'IF(OR(F{r}>0,J{r}>0),"空きあり "&(MAX(0,F{r})+MAX(0,J{r}))&"人","OK"))))'), box=True)
cf(ws, 'K7:K26', 'ISNUMBER(SEARCH("オーバー",K7))', RED)
cf(ws, 'K7:K26', 'ISNUMBER(SEARCH("調整中",K7))', PatternFill('solid', fgColor='FCE4D6'))
put(ws, 'A28', '※「第1希望」が赤い所は、第1希望だけで定員を超えている委員会です（＝その委員会を希望した子は要調整になります）。', f(size=9, color='808080'))
put(ws, 'A29', '※「残り」がマイナス（赤）は決定人数が定員を超えています。黄色は空きがあります。', f(size=9, color='808080'))
ws.page_setup.paperSize = ws.PAPERSIZE_A4; ws.page_setup.orientation = 'landscape'
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 1; ws.sheet_properties.pageSetUpPr.fitToPage = True
protect(ws)

# ---------------- 7. 一覧名簿 ----------------
ws = sheet('一覧名簿')
TIER = [(3, 0), (48, 10)]   # (開始行, 委員会オフセット)
for b in range(10):
    ws.column_dimensions[CL(2 * b + 1)].width = 5
    ws.column_dimensions[CL(2 * b + 2)].width = 13
put(ws, 'A1', f'={S}!B3&"　全"&{S}!B4&"担当者および児童名簿"', f(size=16, bold=True))
for (r0, off) in TIER:
    for b in range(10):
        k = off + b + 1; sr = 7 + k
        c1, c2 = CL(2 * b + 1), CL(2 * b + 2)
        ws.merge_cells(f'{c1}{r0}:{c2}{r0}'); ws.merge_cells(f'{c1}{r0+1}:{c2}{r0+1}'); ws.merge_cells(f'{c1}{r0+2}:{c2}{r0+2}')
        put(ws, f'{c1}{r0}', f'=IF({S}!$G${sr}="","",{S}!$G${sr}&"（"&COUNTIF({FI},{S}!$G${sr})&"名）")', f(bold=True), HDR, CEN)
        put(ws, f'{c1}{r0+1}', f'=IF({S}!$G${sr}="","","担当："&{S}!$J${sr})', f(size=10), al=CEN)
        put(ws, f'{c1}{r0+2}', f'=IF({S}!$G${sr}="","","場所："&{S}!$K${sr})', f(size=10), al=CEN)
        put(ws, f'{c1}{r0+3}', '組', f(bold=True, size=10), HDR, CEN)
        put(ws, f'{c2}{r0+3}', '名前', f(bold=True, size=10), HDR, CEN)
        for j in range(NM):
            r = r0 + 4 + j
            calc = f'計算用!${CL(k)}${j+2}'
            put(ws, f'{c1}{r}', f'=IF({calc}="","",INDEX(振り分け!$A${F0}:$A${FL},{calc}))', f(size=10), al=CEN, box=True)
            put(ws, f'{c2}{r}', f'=IF({calc}="","",INDEX(振り分け!$C${F0}:$C${FL},{calc}))', f(size=10), al=LFT, box=True)
        for rr in range(r0, r0 + 4):
            for cc in (c1, c2):
                ws[f'{cc}{rr}'].border = BOX
ws.print_area = 'A1:T91'
ws.row_breaks.append(Break(id=46))
ws.page_setup.paperSize = ws.PAPERSIZE_A3
ws.page_setup.orientation = 'landscape'
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.print_options.horizontalCentered = True
ws.page_margins.left = ws.page_margins.right = 0.4
ws.page_margins.top = ws.page_margins.bottom = 0.5
protect(ws)

# ---------------- 8. 委員会①〜⑳ ----------------
MARU = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
for k in range(1, NC + 1):
    ws = sheet(f'委員会{MARU[k-1]}')
    sr = 7 + k
    for col, w in zip('ABCD', [5, 6, 6, 18]):
        ws.column_dimensions[col].width = w
    for i in range(11):
        ws.column_dimensions[CL(5 + i)].width = 4.6
    ws.merge_cells('A1:O1')
    put(ws, 'A1', f'=IF({S}!$G${sr}="","",{S}!$B$3&"　"&{S}!$G${sr}&{S}!$B$4&"名簿")', f(size=16, bold=True), al=CEN)
    ws.merge_cells('A2:O2')
    put(ws, 'A2', f'=IF({S}!$G${sr}="","","担当："&{S}!$J${sr}&"　　活動場所："&{S}!$K${sr}&"　　人数："&COUNTIF({FI},{S}!$G${sr})&"名")', f(size=11), al=CEN)
    for i, h in enumerate(['No.', '組', '番号', '名前'] + list(MARU[:11])):
        put(ws, f'{CL(i+1)}4', h, f(bold=True), HDR, CEN, True)
    for j in range(NM):
        r = 5 + j
        calc = f'計算用!${CL(k)}${j+2}'
        put(ws, f'A{r}', f'=IF({calc}="","",{j+1})', al=CEN, box=True)
        put(ws, f'B{r}', f'=IF({calc}="","",INDEX(振り分け!$A${F0}:$A${FL},{calc}))', al=CEN, box=True)
        put(ws, f'C{r}', f'=IF({calc}="","",INDEX(振り分け!$B${F0}:$B${FL},{calc}))', al=CEN, box=True)
        put(ws, f'D{r}', f'=IF({calc}="","",INDEX(振り分け!$C${F0}:$C${FL},{calc}))', al=LFT, box=True)
        for i in range(11):
            ws[f'{CL(5+i)}{r}'].border = BOX
        ws.row_dimensions[r].height = 17
    ws.print_area = f'A1:O{4+NM}'
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.orientation = 'portrait'
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True
    protect(ws)

# ---------------- 計算用 ----------------
ws = sheet('計算用')
put(ws, 'A1', '委員会No→', f(size=9))
for k in range(1, NC + 1):
    put(ws, f'{CL(k)}1', k, f(size=9, bold=True), al=CEN)
for j in range(1, NM + 1):
    for k in range(1, NC + 1):
        put(ws, f'{CL(k)}{j+1}', f'=IFERROR(MATCH({k*1000+j},振り分け!$S${F0}:$S${FL},0),"")', f(size=9))
ws.sheet_state = 'hidden'
protect(ws)

# テスト用：先生の決定の例（6年飼育の定員オーバーを調整ずみにする）
caps = {(g, n): (c6 if g == 6 else c5) for (n, c6, c5, _, _) in COMM for g in (6, 5)}
order = sorted(students, key=lambda s: ((0 if s[0] == 6 else 1), CLASSES.index(s[1]), s[2]))
adopted = {}
for w in wishes:
    adopted[(w[0], w[1], w[2])] = w[3:]
first = {}
for st in order:
    w = adopted.get(st[:3])
    if w: first[(st[0], w[0])] = first.get((st[0], w[0]), 0) + 1
final = {}
for st in order:
    w = adopted.get(st[:3])
    if w and first[(st[0], w[0])] <= caps[(st[0], w[0])]:
        final[st[:3]] = w[0]
cnt = lambda g, n: sum(1 for k, v in final.items() if k[0] == g and v == n)
ws = wb['振り分け']
kept = 0
for i, st in enumerate(order):
    w = adopted.get(st[:3])
    if st[0] == 6 and w and w[0] == '飼育':
        if kept < caps[(6, '飼育')]:
            dec = '飼育'; kept += 1
        else:
            dec = next((x for x in w[1:] if cnt(6, x) < caps[(6, x)]), None)
        if dec:
            final[st[:3]] = dec
            ws[f'H{F0+i}'].value = dec
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('saved')
