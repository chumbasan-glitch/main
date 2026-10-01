import random
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.pagebreak import Break
from openpyxl.utils import get_column_letter as CL

OUT = '/home/user/main/クラブ名簿/クラブ名簿作成ツール（テストデータ入り）.xlsx'
FONT = '游ゴシック'
NC, NS, NW, NN, NM = 20, 450, 550, 450, 50   # クラブ数, 前年度名簿, 希望行, 新年度名簿, 1クラブ人数
random.seed(11)

f = lambda **k: Font(name=FONT, **{'size': 11, **k})
YEL = PatternFill('solid', fgColor='FFF2CC')
GRY = PatternFill('solid', fgColor='EDEDED')
HDR = PatternFill('solid', fgColor='DDEBF7')
RED = PatternFill('solid', fgColor='F8CBAD')
LRED = PatternFill('solid', fgColor='FCE4D6')
DGRY = PatternFill('solid', fgColor='D9D9D9')
thin = Side(style='thin', color='808080')
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
CEN = Alignment(horizontal='center', vertical='center')
LFT = Alignment(horizontal='left', vertical='center')
SMALLF = dict(size=9, color='808080')

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
def page(ws, size, orient, tall=1):
    ws.page_setup.paperSize = size; ws.page_setup.orientation = orient
    ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = tall
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True

S = '設定'

# ---- クラスカラー ----
COLORS = [('黒', '000000'), ('赤', 'D00000'), ('青', '0050D0'), ('緑', '008A3E'),
          ('黄', 'BF8F00'), ('橙', 'E46C0A'), ('紫', '7030A0'), ('茶', '8B4513')]
COLOR_LIST = '"' + ','.join(n for n, _ in COLORS) + '"'
TESTCOLOR = {'松': '緑', '竹': '青', '梅': '赤', '月': '黄'}
def colorcf(ws, rng, expr):
    """expr: 色の名前を返す式（範囲の左上セル基準）"""
    for name, hexc in COLORS:
        ws.conditional_formatting.add(rng, FormulaRule(formula=[f'{expr}="{name}"'], font=Font(name=FONT, bold=True, color=hexc)))
CN = f'{S}!$P$8:$P$27'          # クラブ名
CAPR = f'{S}!$Q$8:$Q$27'        # 定員
TOLR = f'{S}!$R$8:$R$27'        # 融通
PRI = f'OR({S}!$C$14="〇",{S}!$C$14="○")'
SEATS = lambda x: f'(INDEX({CAPR},MATCH({x},{CN},0))+N(INDEX({TOLR},MATCH({x},{CN},0))))'
MODE = '計算用!$B$1'            # 1=新年度名簿あり
NSP = lambda x: f'SUBSTITUTE(SUBSTITUTE({x}," ",""),"　","")'
O2, OL = 2, NS + 1              # 前年度名簿 行範囲
W2, WL = 2, NW + 1              # 希望入力
N2, NL = 2, NN + 1              # 新年度名簿
F0, FL = 7, NS + 6              # 振り分け（見出しは6行目）
rg = lambda sh, c, a, b: f"{sh}!${c}${a}:${c}${b}"

# ---------------- テストデータ ----------------
CLUBS = [('科学', 35, '3松', '理科室'), ('料理', 35, '5竹', '家庭科室'), ('手芸', 25, '4梅', '図工室'),
         ('イラスト', 35, '6月', '多目的室'), ('卓球', 30, '4松', '体育館ステージ'), ('バドミントン', 30, '6竹', '体育館'),
         ('サッカー', 40, '5松', '運動場'), ('バスケットボール', 35, '6松', '体育館'), ('将棋囲碁', 25, '3竹', '会議室'),
         ('パソコン', 40, '5梅', 'パソコン室'), ('音楽', 30, '4月', '音楽室'), ('室内ゲーム', 40, '6梅', '学習室')]
TOL = {'サッカー': 3, '手芸': 0}
CLUBS = [(n, cap, TOL.get(n, 2), t, p) for (n, cap, t, p) in CLUBS]
names = [c[0] for c in CLUBS]
CLS = ['松', '竹', '梅', '月']
SUR = ('佐藤 鈴木 高橋 田中 伊藤 渡辺 山本 中村 小林 加藤 吉田 山田 佐々木 山口 松本 井上 木村 林 斎藤 清水 山崎 森 池田 橋本 阿部 '
       '石川 山下 中島 石井 小川 前田 岡田 長谷川 藤田 後藤 近藤 村上 遠藤 青木 坂本 福田 太田 西村 藤井 岡本 中野 原田 小野 竹内 金子').split()
GIV = ('蓮 陽翔 湊 蒼 樹 大和 悠真 陽太 朝陽 律 颯太 結翔 優斗 奏太 新 陸 海斗 健太 拓海 航 陽葵 凛 結菜 芽依 葵 紬 澪 結衣 '
       '咲良 美月 心春 杏 莉子 彩花 花音 柚葉 千尋 楓 真央 さくら 大翔 悠人 碧 一花 琴音 美咲 翼 晴').split()
used = set()
def newname():
    while True:
        n = random.choice(SUR) + '　' + random.choice(GIV)
        if n not in used: used.add(n); return n
old = []                                  # 前年度 (学年, 組, 番号, 名前)
for g in (5, 4, 3):
    for c in CLS:
        for n in range(1, 31):
            old.append((g, c, n, newname()))
# 名前の書き方ちがい用：高橋さんを1人確保
taka = next(s for s in old if s[3].startswith('高橋'))
moved_out = next(s for s in old if s[0] == 4 and s[1] == '竹' and s[2] == 14)
# 新年度名簿（クラス替え）
new = []
for g in (5, 4, 3):
    kids = [s for s in old if s[0] == g and s != moved_out]
    random.shuffle(kids)
    for i, c in enumerate(CLS):
        grp = kids[i::4]
        if g == 5 and c == '竹': grp.append((None, None, None, newname()))   # 転入（手入力ずみ）
        if g == 3 and c == '月': grp.append((None, None, None, newname()))   # 転入（未入力）
        for n, s in enumerate(grp, start=1):
            nm = s[3]
            if s == taka: nm = nm.replace('高橋', '髙橋')
            new.append([g + 1, c, n, nm, None])
transfer = [r for r in new if r[3] not in {s[3] for s in old} and not r[3].startswith('髙')]
transfer[0][4] = '卓球'
# 希望
unsub = {(5, '梅', 7), (4, '月', 22), (3, '松', 3), (3, '竹', 19)}
OVER = {'サッカー': 3, 'パソコン': 3, '料理': 2}
subs = [s for s in old if s[:3] not in unsub]
cnt = {n: cap + tol + OVER.get(n, 0) for (n, cap, tol, _, _) in CLUBS}
while sum(cnt.values()) > len(subs):
    n = random.choice([x for x in names if x not in OVER and cnt[x] > 15]); cnt[n] -= 1
firsts = [n for n in names for _ in range(cnt[n])]
random.shuffle(firsts)
wishes = [[s[0], s[1], s[2], f1] + random.sample([n for n in names if n != f1], 2) for s, f1 in zip(subs, firsts)]
random.shuffle(wishes)
wishes.insert(15, [5, '松', 9, '音楽', '手芸', '科学'])          # 2回提出（先に出した分）
for w in wishes:
    if w[:3] == [5, '松', 9]: pass
wishes.append([4, '梅', 33, 'サッカー', '卓球', '科学'])        # 名簿にいない
for w in wishes:
    if w[:3] == [3, '梅', 12]:
        w[3:] = ['イラスト', 'イラスト', '手芸']; break        # 重複希望
# 2回提出の「後の行」を末尾へ移して確実に後にする
idx = [i for i, w in enumerate(wishes) if w[:3] == [5, '松', 9]]
if len(idx) == 2 and idx[0] != 15:
    pass
last = [w for w in wishes if w[:3] == [5, '松', 9] and w[3] != '音楽']
for w in last: wishes.remove(w); wishes.append(w)

six = [w for w in wishes if w[0] == 5 and w[3] not in ('料理', '手芸')]
need = 28 - sum(1 for w in wishes if w[0] == 5 and w[3] == '手芸')
for w in six[:max(0, need)]:
    if '手芸' in w[4:]: w[4:] = [x if x != '手芸' else w[3] for x in w[4:]]
    w[3] = '手芸'
NUM = {n: i + 1 for i, n in enumerate(names)}
for i, w in enumerate(wishes):
    if i in (40, 41, 42):            # Formsの例：クラブ名のまま
        continue
    w[3:] = [NUM[x] for x in w[3:]]
wishes[60][4] = 25                    # 番号の打ちまちがい

# ---------------- 1. 使い方 ----------------
ws = sheet('使い方', first=True)
ws.column_dimensions['A'].width = 4; ws.column_dimensions['B'].width = 104
put(ws, 'B1', 'クラブ名簿作成ツール　使い方', f(size=16, bold=True))
lines = [
 ('■ 色のきまり', True),
 ('黄色いセル＝先生が入力する所です。それ以外のセルには数式が入っているので、保護しています（「校閲」→「シート保護の解除」で外せます。パスワードなし）。', False),
 ('', False),
 ('■ 前年度（1〜3月）にすること', True),
 ('① 【設定】年度（新年度）、新年度の学年（6・5・4）、前年度の組・新年度の組、クラブの名前・定員・担当・活動場所を入力します。', False),
 ('　 ・クラブを増やす：空いている行に書きこむ　　減らす：行の中身を消す　　名前を変える：書きかえる', False),
 ('② 【前年度名簿】アンケートをとる学年（3〜5年）全員の「学年・組・番号・名前」を貼り付けます。学年は数字で入れます。', False),
 ('　 ・「定員」と「融通」（何人まで超えてよいか）、「上の学年から優先」（〇で有効）、希望調査用紙の注意書きも設定します。', False),
 ('　 ・【希望調査用紙】を印刷して配ります。クラブの番号は設定シートの No. です（配ったあとは順番を変えないでください）。', False),
 ('③ 【希望入力】前年度の学年・組・番号と、第1〜第3希望を入れます。', False),
 ('　 ・紙の場合：希望はクラブの「番号」を打つだけでかまいません。右側にクラブ名が出るので確認してください。', False),
 ('　 ・Formsの場合：結果の表から「学年〜第3希望」の6列をコピーし、A列の2行目に「値の貼り付け」をします。', False),
 ('　 ・「チェック」欄に「名簿にいない」「2回提出」などが出たら確認してください。2回提出は下の行（後から出したほう）が使われます。', False),
 ('④ 【振り分け】第1希望の人数が「定員＋融通」以内なら自動で決まります。超えたクラブを希望した子は「要調整」（赤）になります。', False),
 ('　 ・「上の学年から優先」が〇なら、6年→5年→4年の順に枠を埋め、入りきらない学年の子だけが要調整になります。', False),
 ('　 ・要調整の子の第2・第3希望が緑なら、そのクラブには空きがあります。色がなければ第1希望の子でいっぱいです。', False),
 ('　 ・見出しの▼で「第1希望」を絞りこむと、そのクラブを希望した子が6年→5年→4年の順に並びます（6年優先の目安にしてください）。', False),
 ('　 ・「第2希望の空き」「第3希望の空き」は、定員から「決定した人数」と「そのクラブを第1希望にしている要調整の子」を引いた数です。', False),
 ('　 ・決まったら、残る子にも移る子にも「先生の決定」欄へクラブを入れます（プルダウン）。未提出の子も同じです。', False),
 ('　 ・この段階では、名簿は前年度の組で表示され、タイトルに「（仮・前年度の組）」と出ます。', False),
 ('', False),
 ('■ 新年度（4月）にすること', True),
 ('⑤ 【新年度名簿】新しい名簿（4〜6年）の「学年・組・番号・名前」を貼り付けます。前年度名簿と名前・学年で自動的につながります。', False),
 ('　 ・名前の空白（全角・半角）のちがいは自動で無視します。', False),
 ('　 ・「前年度名簿にいない」（赤）：転入生なら「クラブ（手入力）」欄にクラブを入れます。名前の字がちがう（髙／高など）ときは、どちらかの名簿の名前を直します。', False),
 ('　 ・「同姓同名あり」：自動でつなげられないので、「クラブ（手入力）」欄にクラブを入れてください。', False),
 ('　 ・振り分けシートで「転出」と出た子は、新年度名簿にいなかった子です（名前の字ちがいのこともあるので確認してください）。', False),
 ('⑥ 【定員チェック】「未提出」「要調整」「定員オーバー」「新年度名簿の要確認」が 0 になれば完成です。', False),
 ('⑦ 【一覧名簿】【クラブ①〜⑳】を印刷します。新しい組・番号で、6年→5年→4年、組順・番号順に並びます。', False),
 ('　 ・一覧名簿はA3横。上段（①〜⑩）が1ページ目、下段（⑪〜⑳）が2ページ目です。クラブが10以下なら1ページ目だけ印刷します。', False),
 ('', False),
 ('■ Microsoft Forms の作り方（希望を集める場合）', True),
 ('質問を「1. 学年　2. 組　3. 番号　4. 第1希望　5. 第2希望　6. 第3希望」の順に作ります（学年・組・番号はアンケート時のもの）。', False),
 ('選択肢は設定シートと同じ書き方にしてください。Formsのデータは学校のMicrosoft 365に保存されます。使ってよいかは学校のルールを確認してください。', False),
 ('', False),
 ('■ 上限', True),
 ('クラブ 20／1学年の組 8／前年度名簿・新年度名簿 各450人／希望入力 550行／1つのクラブ 50人', False),
 ('', False),
 ('■ テストデータについて', True),
 ('名前はすべて架空です。新年度名簿まで入っているので、名簿は新しい組で表示されています。前年度の段階を試すときは、新年度名簿の黄色い所を消してください。', False),
 ('本番で使うときは、【前年度名簿】【希望入力】【新年度名簿】のデータと、【振り分け】の「先生の決定」欄を消してから使ってください。', False),
]
for i, (t, b) in enumerate(lines, start=3):
    put(ws, f'B{i}', t, f(bold=b, size=12 if b else 11))
ws.sheet_view.showGridLines = False

# ---------------- 2. 設定 ----------------
ws = sheet(S)
for col, w in zip('ABCDEFGHIJKLMNOPQRST', [8, 10, 10, 3, 7, 7, 12, 8, 3, 7, 7, 12, 8, 3, 5, 18, 7, 7, 10, 16]):
    ws.column_dimensions[col].width = w
put(ws, 'A1', '設定（黄色いセルを入力してください）', f(size=14, bold=True))
put(ws, 'A3', '年度', f(bold=True)); put(ws, 'B3', '令和9年度', fill=YEL, box=True, unlock=True); ws.merge_cells('B3:C3')
put(ws, 'E3', '← 名簿のタイトルに使う「新年度」', f(**SMALLF))
put(ws, 'A4', '呼び名', f(bold=True)); put(ws, 'B4', 'クラブ', fill=YEL, box=True, unlock=True)
put(ws, 'A6', '学年の設定', f(bold=True))
for c, h in zip('ABC', ['', '新年度', '前年度']):
    put(ws, f'{c}7', h, f(bold=True), HDR, CEN, True)
for i, (lab, g) in enumerate(zip(['上の学年', '中の学年', '下の学年'], [6, 5, 4])):
    r = 8 + i
    put(ws, f'A{r}', lab, fill=GRY, al=CEN, box=True)
    put(ws, f'B{r}', g, fill=YEL, al=CEN, box=True, unlock=True)
    put(ws, f'C{r}', f'=IF(B{r}="","",B{r}-1)', fill=GRY, al=CEN, box=True)
put(ws, 'A12', '※ 前年度の学年は自動で1つ下になります。', f(**SMALLF))
for (c0, title, gcol, kcol) in (('E', '前年度の組（アンケート時）', 'C', 'Y'), ('J', '新年度の組', 'B', 'Z')):
    cs = [CL(ws[f'{c0}1'].column + i) for i in range(4)]
    put(ws, f'{cs[0]}6', title, f(bold=True))
    for c, h in zip(cs, ['学年', '組', '名簿での表示', '色']):
        put(ws, f'{c}7', h, f(bold=True, size=10), HDR, CEN, True)
    for i in range(24):
        r = 8 + i
        put(ws, f'{cs[0]}{r}', f'=${gcol}${8 + i // 8}', fill=GRY, al=CEN, box=True)
        put(ws, f'{cs[1]}{r}', CLS[i % 8] if i % 8 < 4 else None, fill=YEL, al=CEN, box=True, unlock=True)
        put(ws, f'{cs[2]}{r}', f'=IF({cs[1]}{r}="","",{cs[0]}{r}&{cs[1]}{r})', fill=YEL, al=CEN, box=True, unlock=True)
        put(ws, f'{cs[3]}{r}', TESTCOLOR.get(CLS[i % 8]) if i % 8 < 4 else None, fill=YEL, al=CEN, box=True, unlock=True)
        put(ws, f'{kcol}{r}', f'=IF({cs[1]}{r}="","",{cs[0]}{r}&"-"&{cs[1]}{r})', f(**SMALLF))
    dv = DataValidation(type='list', formula1=COLOR_LIST, allow_blank=True); ws.add_data_validation(dv); dv.add(f'{cs[3]}8:{cs[3]}31')
    colorcf(ws, f'{cs[1]}8:{cs[2]}31', f'${cs[3]}8')
    ws.column_dimensions[kcol].hidden = True
put(ws, 'E34', '※「色」はプルダウンで選びます。名簿の組の文字がその色になります（空欄なら黒）。', f(**SMALLF))
put(ws, 'E33', '※ 上から名簿の並び順です（学年ごとに8行）。「名簿での表示」は「5-1」などに書きかえてもかまいません。', f(**SMALLF))
put(ws, 'O6', 'クラブの設定（上から順に「クラブ①、②…」のシートに入ります）', f(bold=True))
for c, h in zip('OPQRST', ['No.', 'クラブ名', '定員', '融通', '担当', '活動場所']):
    put(ws, f'{c}7', h, f(bold=True), HDR, CEN, True)
for i in range(NC):
    r = 8 + i
    put(ws, f'O{r}', i + 1, fill=GRY, al=CEN, box=True)
    d = CLUBS[i] if i < len(CLUBS) else (None,) * 5
    for c, v in zip('PQRST', d):
        put(ws, f'{c}{r}', v, fill=YEL, al=CEN, box=True, unlock=True)
put(ws, 'O28', '=" 定員の合計："&SUM(Q8:Q27)&"人"', f(**SMALLF))
dv = DataValidation(type='whole', operator='between', formula1='0', formula2=str(NM), allow_blank=True)
ws.add_data_validation(dv); dv.add('Q8:Q27')
cf(ws, 'P8:P27', 'AND(P8<>"",COUNTIF($P$8:$P$27,P8)>1)', RED)
dv = DataValidation(type='whole', operator='between', formula1='0', formula2='20', allow_blank=True)
ws.add_data_validation(dv); dv.add('R8:R27')
put(ws, 'O29', '※「融通」は、定員を何人まで超えてもよいかです（空欄は0人）。「定員＋融通」までなら自動で決定になります。', f(**SMALLF))
put(ws, 'O30', '※ No. は希望調査用紙のクラブ番号です。用紙を配ったあとは、クラブの順番を入れかえないでください。', f(size=9, color='C00000', bold=True))
put(ws, 'A14', '上の学年から優先', f(bold=True))
put(ws, 'A15', '（6年→5年→4年）', f(size=9))
put(ws, 'C14', '〇', f(bold=True, size=12), YEL, CEN, True, True)
put(ws, 'A16', '※ 〇を入れると、上の学年から順に「定員＋融通」の枠を埋めます。空欄なら全学年まとめて判定します。', f(**SMALLF))
dv = DataValidation(type='list', formula1='"〇"', allow_blank=True); ws.add_data_validation(dv); dv.add('C14')
put(ws, 'A18', '希望調査用紙の注意書き', f(bold=True))
ws.merge_cells('A19:C22')
put(ws, 'A19', '必ずしも第1希望が通るわけではありません。', fill=YEL, al=Alignment(wrap_text=True, vertical='top'), box=True, unlock=True)
for rr in range(19, 23):
    for cc in 'ABC':
        ws[f'{cc}{rr}'].border = BOX
protect(ws)


# ---------------- ★希望調査用紙 ----------------
ws = sheet('希望調査用紙')
for col, w in zip('ABCDEFGHI', [2, 9, 9, 22, 3, 9, 9, 22, 2]):
    ws.column_dimensions[col].width = w
ws.merge_cells('B1:H1')
put(ws, 'B1', f'={S}!B3&"　"&{S}!B4&"希望調査"', f(size=20, bold=True), al=CEN)
ws.row_dimensions[1].height = 36
ws.merge_cells('B3:H3')
put(ws, 'B3', '　　　年　　　組　　　番　　名前（　　　　　　　　　　　　　　）', f(size=14), al=LFT)
ws.row_dimensions[3].height = 32
ws.merge_cells('B5:H5')
put(ws, 'B5', f'={S}!B4&"一覧"', f(size=13, bold=True), HDR, CEN)
put(ws, 'J1', f'=ROUNDUP(COUNTIF({CN},"?*")/2,0)', f(size=8, color='FFFFFF'))
TH = Side(style='medium', color='000000')
for i in range(10):
    r = 6 + i
    ws.row_dimensions[r].height = 24
    put(ws, f'B{r}', f'=IF({i+1}>$J$1,"",{i+1})', f(size=13, bold=True), al=Alignment(horizontal='right', vertical='center'))
    ws.merge_cells(f'C{r}:D{r}')
    put(ws, f'C{r}', f'=IF({i+1}>$J$1,"","　"&INDEX({CN},{i+1}))', f(size=13), al=LFT)
    put(ws, f'F{r}', f'=IF({i+1}+$J$1>COUNTIF({CN},"?*"),"",{i+1}+$J$1)', f(size=13, bold=True), al=Alignment(horizontal='right', vertical='center'))
    ws.merge_cells(f'G{r}:H{r}')
    put(ws, f'G{r}', f'=IF({i+1}+$J$1>COUNTIF({CN},"?*"),"","　"&INDEX({CN},{i+1}+$J$1))', f(size=13), al=LFT)
for r in range(5, 16):
    for ci, c in enumerate('BCDEFGH'):
        b = ws[f'{c}{r}'].border
        ws[f'{c}{r}'].border = Border(left=TH if c == 'B' else b.left, right=TH if c == 'H' else b.right,
                                      top=TH if r == 5 else b.top, bottom=TH if r == 15 else (thin if r == 5 else b.bottom))
put(ws, 'B17', '希望', f(size=13, bold=True))
put(ws, 'C18', '番号', f(bold=True, size=12), HDR, CEN, True)
ws.merge_cells('D18:H18')
put(ws, 'D18', 'クラブ名', f(bold=True, size=12), HDR, CEN, True)
for i, lab in enumerate(['第1希望', '第2希望', '第3希望']):
    r = 19 + i
    ws.row_dimensions[r].height = 42
    put(ws, f'B{r}', lab, f(bold=True, size=13), al=CEN, box=True)
    put(ws, f'C{r}', None, box=True)
    ws.merge_cells(f'D{r}:H{r}')
    for c in 'DEFGH':
        ws[f'{c}{r}'].border = BOX
for c in 'DEFGH':
    ws[f'{c}18'].border = BOX
ws['B18'].border = BOX
ws.merge_cells('B24:H26')
put(ws, 'B24', f'=IF({S}!A19="","","※ "&{S}!A19)', f(size=12), al=Alignment(wrap_text=True, vertical='top'))
ws.print_area = 'A1:I27'
page(ws, ws.PAPERSIZE_A4, 'portrait', 1)
ws.sheet_view.showGridLines = False
protect(ws)

# ---------------- 3. 前年度名簿 ----------------
ws = sheet('前年度名簿')
for col, w in zip('ABCDEFGHIJ', [7, 7, 7, 18, 3, 11, 10, 8, 18, 22]):
    ws.column_dimensions[col].width = w
for c, h in zip('ABCD', ['学年', '組', '番号', '名前']):
    put(ws, f'{c}1', h, f(bold=True), HDR, CEN, True)
for c, h in zip('FGHIJ', ['キー', '並び順', '新学年', '名前キー', 'チェック（自動）']):
    put(ws, f'{c}1', h, f(bold=True, size=9), GRY, CEN, True)
for i in range(NS):
    r = O2 + i
    st = old[i] if i < len(old) else (None,) * 4
    for c, v in zip('ABCD', st):
        put(ws, f'{c}{r}', v, fill=YEL, al=CEN if c != 'D' else LFT, unlock=True)
    put(ws, f'F{r}', f'=IF(D{r}="","",A{r}&"-"&B{r}&"-"&C{r})', f(**SMALLF))
    put(ws, f'G{r}', f'=IF(D{r}="","",IFERROR(MATCH(A{r}&"-"&B{r},{S}!$Y$8:$Y$31,0),99)*1000+C{r}+ROW()/1000000)', f(**SMALLF))
    put(ws, f'H{r}', f'=IF(D{r}="","",A{r}+1)', f(**SMALLF))
    put(ws, f'I{r}', f'=IF(D{r}="","",H{r}&"|"&{NSP(f"D{r}")})', f(**SMALLF))
    put(ws, f'J{r}', (f'=IF(D{r}="","",IF(ISERROR(MATCH(A{r}&"-"&B{r},{S}!$Y$8:$Y$31,0)),"設定にない学年・組",'
                      f'IF(COUNTIF($F${O2}:$F${OL},F{r})>1,"同じ学年・組・番号がいる",IF(COUNTIF($I${O2}:$I${OL},I{r})>1,"同姓同名あり",""))))'),
        f(size=9, color='C00000'))
ws.freeze_panes = 'A2'
cf(ws, f'A{O2}:D{OL}', f'$J{O2}<>""', RED)
protect(ws)

# ---------------- 4. 希望入力 ----------------
ws = sheet('希望入力')
for col, w in zip('ABCDEFGHIJKLM', [7, 7, 7, 9, 9, 9, 16, 13, 13, 13, 26, 10, 10]):
    ws.column_dimensions[col].width = w
for c, h in zip('ABCDEF', ['学年', '組', '番号', '第1希望', '第2希望', '第3希望']):
    put(ws, f'{c}1', h, f(bold=True), HDR, CEN, True)
for c, h in zip('GHIJKLM', ['名前（自動）', '第1（クラブ名）', '第2（クラブ名）', '第3（クラブ名）', 'チェック（自動）', 'キー', '採用']):
    put(ws, f'{c}1', h, f(bold=True, size=9 if c in 'LM' else 10), GRY, CEN, True)
CONV = lambda x: (f'IF({x}="","",IF(ISERROR(VALUE({x})),{x}&"",IF(AND(VALUE({x})>=1,VALUE({x})<={NC}),'
                  f'IF(INDEX({CN},VALUE({x}))="","？",INDEX({CN},VALUE({x}))),"？")))')
for i in range(NW):
    r = W2 + i
    w = wishes[i] if i < len(wishes) else (None,) * 6
    for c, v in zip('ABCDEF', w):
        put(ws, f'{c}{r}', v, fill=YEL, al=CEN, unlock=True)
    put(ws, f'L{r}', f'=IF(A{r}="","",A{r}&"-"&B{r}&"-"&C{r})', f(**SMALLF))
    put(ws, f'G{r}', f'=IF(L{r}="","",IFERROR(INDEX({rg("前年度名簿","D",O2,OL)},MATCH(L{r},{rg("前年度名簿","F",O2,OL)},0)),""))')
    for c, src in zip('HIJ', 'DEF'):
        put(ws, f'{c}{r}', '=' + CONV(f'{src}{r}'), al=CEN)
    badn = lambda c: f'{c}{r}="？"'
    badc = lambda c: f'AND({c}{r}<>"",{c}{r}<>"？",COUNTIF({CN},{c}{r})=0)'
    put(ws, f'K{r}', (f'=IF(L{r}="","",IF(G{r}="","名簿にいない",IF(COUNTIF(L{r+1}:L${WL+1},L{r})>0,"2回提出（下の行を使います）",'
                      f'IF(OR({badn("H")},{badn("I")},{badn("J")}),"クラブ番号がちがう",IF(OR({badc("H")},{badc("I")},{badc("J")}),"クラブ名がちがう",IF(H{r}="","第1希望がない",'
                      f'IF(OR(AND(H{r}<>"",H{r}=I{r}),AND(H{r}<>"",H{r}=J{r}),AND(I{r}<>"",I{r}=J{r})),"同じクラブを重複して希望","OK")))))))'),
        al=LFT)
    put(ws, f'M{r}', f'=IF(OR(L{r}="",G{r}=""),"",IF(COUNTIF(L{r+1}:L${WL+1},L{r})=0,L{r},""))', f(**SMALLF))
cf(ws, f'K{W2}:K{WL}', f'AND(K{W2}<>"",K{W2}<>"OK")', RED)
cf(ws, f'H{W2}:J{WL}', f'H{W2}="？"', RED)
ws.freeze_panes = 'A2'
protect(ws)

# ---------------- 5. 振り分け ----------------
ws = sheet('振り分け')
heads = ['新学年', '前年度の組', '番号', '名前', '新年度の組', '新番号', '第1希望', '第2希望', '第3希望', '自動仮決定', '先生の決定',
         '最終決定', '状態', '第2希望の空き', '第3希望の空き', '名簿行', '希望行', 'キー', '名前キー', '新名簿行', 'クラブNo', '順', '一覧キー']
widths = [6, 7, 5, 16, 7, 6, 12, 12, 12, 12, 13, 12, 8, 8, 8, 5, 5, 9, 14, 5, 5, 5, 7]
for i, w in enumerate(widths):
    ws.column_dimensions[CL(i + 1)].width = w
HR = F0 - 1
put(ws, 'A1', '振り分け　　「要調整」の子は、決まったら「先生の決定」（黄色）にプルダウンでクラブを入れてください。', f(bold=True, size=12))
put(ws, 'A2', '■ 色の見方', f(bold=True))
put(ws, 'B3', '要調整', f(bold=True, color='FFFFFF'), PatternFill('solid', fgColor='C00000'), CEN)
put(ws, 'C3', '…第1希望のクラブが「定員＋融通」をこえています。話し合いなどで決めて、「先生の決定」にクラブを入れてください。')
put(ws, 'B4', 'クラブ名', f(bold=True, color='FFFFFF'), PatternFill('solid', fgColor='00803C'), CEN)
put(ws, 'C4', '…（第2・第3希望が緑地に白い字）そのクラブには、まだ空きがあります。色のないクラブは、第1希望の子でいっぱいです。')
put(ws, 'C5', '=IF(' + PRI + ',"※ 上の学年から優先：〇（6年→5年→4年の順に枠を埋めています）","※ 上の学年から優先：なし（全学年まとめて判定しています）")', f(size=10, color='808080'))
for i, h in enumerate(heads):
    c = CL(i + 1)
    put(ws, f'{c}{HR}', h, f(bold=True, size=9 if i >= 15 else 10), YEL if c == 'K' else (GRY if i >= 15 else HDR),
        Alignment(horizontal='center', vertical='center', wrap_text=True), True)
ws.row_dimensions[HR].height = 30
OLD = lambda c: rg('前年度名簿', c, O2, OL)
NEW = lambda c: rg('新年度名簿', c, N2, NL)
WIS = lambda c: rg('希望入力', c, W2, WL)
for r in range(F0, FL + 1):
    k = r - F0 + 1
    sm = f'font=f(**SMALLF)'
    put(ws, f'P{r}', f'=IFERROR(MATCH(SMALL({OLD("G")},{k}),{OLD("G")},0),"")', f(**SMALLF))
    put(ws, f'R{r}', f'=IF(P{r}="","",INDEX({OLD("F")},P{r}))', f(**SMALLF))
    put(ws, f'S{r}', f'=IF(P{r}="","",INDEX({OLD("I")},P{r}))', f(**SMALLF))
    put(ws, f'A{r}', f'=IF(P{r}="","",INDEX({OLD("H")},P{r}))', al=CEN)
    put(ws, f'B{r}', f'=IF(P{r}="","",IFERROR(INDEX({S}!$G$8:$G$31,INT(INDEX({OLD("G")},P{r})/1000)),INDEX({OLD("A")},P{r})&INDEX({OLD("B")},P{r})))', al=CEN)
    put(ws, f'C{r}', f'=IF(P{r}="","",INDEX({OLD("C")},P{r}))', al=CEN)
    put(ws, f'D{r}', f'=IF(P{r}="","",INDEX({OLD("D")},P{r}))')
    put(ws, f'T{r}', f'=IF(OR(P{r}="",{MODE}=0),"",IFERROR(MATCH(S{r},{NEW("H")},0),""))', f(**SMALLF))
    put(ws, f'E{r}', f'=IF(T{r}="","",INDEX({NEW("K")},T{r}))', al=CEN)
    put(ws, f'F{r}', f'=IF(T{r}="","",INDEX({NEW("C")},T{r}))', al=CEN)
    put(ws, f'Q{r}', f'=IF(R{r}="","",IFERROR(MATCH(R{r},{WIS("M")},0),""))', f(**SMALLF))
    for c, src in zip('GHI', 'HIJ'):
        put(ws, f'{c}{r}', f'=IF(Q{r}="","",INDEX({WIS(src)},Q{r})&"")', al=CEN)
    put(ws, f'J{r}', (f'=IF(Q{r}="","",IF(G{r}="","要調整",IFERROR(IF(IF({PRI},COUNTIFS($A${F0}:$A${FL},">="&A{r},$G${F0}:$G${FL},G{r}),'
                      f'COUNTIF($G${F0}:$G${FL},G{r}))<={SEATS(f"G{r}")},G{r},"要調整"),"要調整")))'), al=CEN)
    put(ws, f'K{r}', None, fill=YEL, al=CEN, unlock=True)
    put(ws, f'L{r}', f'=IF(P{r}="","",IF(K{r}<>"",K{r},IF(OR(J{r}="",J{r}="要調整"),"",J{r})))', f(bold=True), al=CEN)
    put(ws, f'M{r}', f'=IF(P{r}="","",IF(AND({MODE}=1,T{r}=""),"転出",IF(L{r}<>"","決定",IF(Q{r}="","未提出","要調整"))))', al=CEN)
    for c, src in (('N', 'H'), ('O', 'I')):
        put(ws, f'{c}{r}', f'=IF(OR(M{r}<>"要調整",{src}{r}=""),"",IFERROR({SEATS(f"{src}{r}")}-INDEX(定員チェック!$F$7:$F$26,MATCH({src}{r},{CN},0))-COUNTIFS($M${F0}:$M${FL},"要調整",$G${F0}:$G${FL},{src}{r}),""))', al=CEN)
    put(ws, f'U{r}', f'=IF(OR(L{r}="",M{r}="転出"),"",IFERROR(MATCH(L{r},{CN},0),""))', f(**SMALLF))
    put(ws, f'V{r}', f'=IF(U{r}="","",COUNTIF($U${F0}:U{r},U{r}))', f(**SMALLF))
    put(ws, f'W{r}', f'=IF(U{r}="","",U{r}*1000+V{r})', f(**SMALLF))
dv = DataValidation(type='list', formula1=CN, allow_blank=True)
ws.add_data_validation(dv); dv.add(f'K{F0}:K{FL}')
rng = f'A{F0}:O{FL}'
GRN = PatternFill('solid', fgColor='00803C')
cf(ws, f'J{F0}:J{FL}', f'J{F0}="要調整"', PatternFill('solid', fgColor='C00000'), Font(name=FONT, bold=True, color='FFFFFF'))
cf(ws, f'H{F0}:H{FL}', f'AND($M{F0}="要調整",N(N{F0})>0)', GRN, Font(name=FONT, bold=True, color='FFFFFF'))
cf(ws, f'I{F0}:I{FL}', f'AND($M{F0}="要調整",N(O{F0})>0)', GRN, Font(name=FONT, bold=True, color='FFFFFF'))
cf(ws, rng, f'$M{F0}="要調整"', RED)
cf(ws, rng, f'OR($M{F0}="未提出",$M{F0}="転出")', DGRY)
cf(ws, f'K{F0}:K{FL}', f'K{F0}<>""', font=Font(name=FONT, bold=True, color='0000FF'))
ws.auto_filter.ref = f'A{HR}:O{FL}'
ws.freeze_panes = f'E{F0}'
ws.print_title_rows = f'{HR}:{HR}'; ws.print_area = f'A1:O{FL}'
page(ws, ws.PAPERSIZE_A4, 'landscape', 0)
protect(ws, filt=True)

# ---------------- 6. 新年度名簿 ----------------
ws = sheet('新年度名簿')
for col, w in zip('ABCDEFGHIJK', [7, 7, 7, 18, 16, 30, 16, 14, 7, 9, 8]):
    ws.column_dimensions[col].width = w
for c, h in zip('ABCDE', ['学年', '組', '番号', '名前', 'クラブ（転入生などの手入力）']):
    put(ws, f'{c}1', h, f(bold=True, size=10), HDR, Alignment(horizontal='center', vertical='center', wrap_text=True), True)
for c, h in zip('FG', ['つながり（自動）', '決まったクラブ（自動）']):
    put(ws, f'{c}1', h, f(bold=True, size=10), GRY, CEN, True)
for c, h in zip('HIJK', ['名前キー', '振り分け行', '並び順', '組表示']):
    put(ws, f'{c}1', h, f(bold=True, size=9), GRY, CEN, True)
ws.row_dimensions[1].height = 30
FRS, FRL = rg('振り分け', 'S', F0, FL), rg('振り分け', 'L', F0, FL)
for i in range(NN):
    r = N2 + i
    st = new[i] if i < len(new) else (None,) * 5
    for c, v in zip('ABCDE', st):
        put(ws, f'{c}{r}', v, fill=YEL, al=LFT if c == 'D' else CEN, unlock=True)
    put(ws, f'H{r}', f'=IF(D{r}="","",A{r}&"|"&{NSP(f"D{r}")})', f(**SMALLF))
    put(ws, f'I{r}', f'=IF(H{r}="","",IFERROR(MATCH(H{r},{FRS},0),""))', f(**SMALLF))
    put(ws, f'F{r}', (f'=IF(D{r}="","",IF(E{r}<>"","手入力",IF(I{r}="","前年度名簿にいない",'
                      f'IF(OR(COUNTIF($H${N2}:$H${NL},H{r})>1,COUNTIF({FRS},H{r})>1),"同姓同名あり（手入力してください）","OK"))))'), al=LFT)
    put(ws, f'G{r}', f'=IF(D{r}="","",IF(E{r}<>"",E{r},IF(F{r}<>"OK","",IF(INDEX({FRL},I{r})="","未決定",INDEX({FRL},I{r})))))', al=CEN)
    put(ws, f'J{r}', f'=IF(D{r}="","",IFERROR(MATCH(A{r}&"-"&B{r},{S}!$Z$8:$Z$31,0),99)*1000+C{r}+ROW()/1000000)', f(**SMALLF))
    put(ws, f'K{r}', f'=IF(D{r}="","",IFERROR(INDEX({S}!$L$8:$L$31,MATCH(A{r}&"-"&B{r},{S}!$Z$8:$Z$31,0)),A{r}&B{r}))', f(**SMALLF))
dv = DataValidation(type='list', formula1=CN, allow_blank=True)
ws.add_data_validation(dv); dv.add(f'E{N2}:E{NL}')
cf(ws, f'A{N2}:G{NL}', f'AND($F{N2}<>"",$F{N2}<>"OK",$F{N2}<>"手入力")', RED)
cf(ws, f'G{N2}:G{NL}', f'G{N2}="未決定"', LRED)
ws.freeze_panes = 'A2'
ws.auto_filter.ref = f'A1:G{NL}'
protect(ws, filt=True)

# ---------------- 7. 定員チェック ----------------
ws = sheet('定員チェック')
for col, w in zip('ABCDEFGHIJK', [5, 16, 7, 7, 8, 7, 7, 7, 7, 7, 34]):
    ws.column_dimensions[col].width = w
put(ws, 'A1', '定員チェック', f(size=14, bold=True))
FM = rg('振り分け', 'M', F0, FL)
summ = [('未提出', f'=COUNTIF({FM},"未提出")'), ('要調整', f'=COUNTIF({FM},"要調整")'), ('転出', f'=COUNTIF({FM},"転出")'),
        ('定員オーバーのクラブ', '=COUNTIF($K$7:$K$26,"*オーバー*")'),
        ('新年度名簿の要確認', f'=COUNTIF({NEW("F")},"前年度*")+COUNTIF({NEW("F")},"同姓同名*")'),
        ('希望入力の要確認', f'=SUMPRODUCT(({WIS("K")}<>"")*({WIS("K")}<>"OK"))')]
for i, (lab, fm) in enumerate(summ):
    lc, vc = ('B', 'C') if i < 3 else ('G', 'J')
    r = 2 + (i % 3)
    put(ws, f'{lc}{r}', lab, f(bold=True))
    put(ws, f'{vc}{r}', fm, f(bold=True, size=12), al=CEN, box=True)
cf(ws, 'C2:C3', 'C2>0', RED); cf(ws, 'J2:J4', 'J2>0', RED)
G1, G2, G3 = f'{S}!$B$8', f'{S}!$B$9', f'{S}!$B$10'
hd = ['No.', 'クラブ', '定員', '融通', '第1希望', '決定', f'={G1}&"年"', f'={G2}&"年"', f'={G3}&"年"', '残り', '状態']
for c, h in zip('ABCDEFGHIJK', hd):
    put(ws, f'{c}6', h, f(bold=True), HDR, CEN, True)
NG, FA, FL_ = NEW('G'), rg('振り分け', 'A', F0, FL), rg('振り分け', 'L', F0, FL)
FG = rg('振り分け', 'G', F0, FL)
NA = NEW('A')
for i in range(NC):
    r, sr = 7 + i, 8 + i
    put(ws, f'A{r}', i + 1, al=CEN, box=True)
    put(ws, f'B{r}', f'=IF({S}!P{sr}="","",{S}!P{sr})', al=CEN, box=True)
    put(ws, f'C{r}', f'=IF(B{r}="","",N({S}!Q{sr}))', al=CEN, box=True)
    put(ws, f'D{r}', f'=IF(B{r}="","",N({S}!R{sr}))', al=CEN, box=True)
    put(ws, f'E{r}', f'=IF(B{r}="","",COUNTIF({FG},B{r}))', al=CEN, box=True)
    put(ws, f'F{r}', f'=IF(B{r}="","",IF({MODE}=1,COUNTIF({NG},B{r}),COUNTIFS({FL_},B{r},{FM},"<>転出")))', f(bold=True), al=CEN, box=True)
    for c, g in zip('GHI', (G1, G2, G3)):
        put(ws, f'{c}{r}', f'=IF(B{r}="","",IF({MODE}=1,COUNTIFS({NA},{g},{NG},B{r}),COUNTIFS({FA},{g},{FL_},B{r},{FM},"<>転出")))', al=CEN, box=True)
    put(ws, f'J{r}', f'=IF(B{r}="","",C{r}-F{r})', al=CEN, box=True)
    put(ws, f'K{r}', (f'=IF(B{r}="","",IF(F{r}>C{r}+D{r},(F{r}-C{r}-D{r})&"人オーバー",IF(COUNTIFS({FM},"要調整",{FG},B{r})>0,'
                      f'"調整中（第1希望の要調整 "&COUNTIFS({FM},"要調整",{FG},B{r})&"人）",IF(F{r}>C{r},"定員＋"&(F{r}-C{r})&"人（融通内）",'
                      f'IF(J{r}>0,"空きあり "&J{r}&"人","OK")))))'), box=True)
    cf(ws, f'E{r}', f'AND($B{r}<>"",E{r}>C{r}+D{r})', RED)
    cf(ws, f'J{r}', f'AND($B{r}<>"",J{r}<0)', YEL)
    cf(ws, f'J{r}', f'AND($B{r}<>"",J{r}>0)', PatternFill('solid', fgColor='E2EFDA'))
cf(ws, 'K7:K26', 'ISNUMBER(SEARCH("オーバー",K7))', RED)
cf(ws, 'K7:K26', 'ISNUMBER(SEARCH("調整中",K7))', LRED)
cf(ws, 'K7:K26', 'ISNUMBER(SEARCH("融通内",K7))', PatternFill('solid', fgColor='FFE699'))
put(ws, 'A28', '※「第1希望」が赤い所は、第1希望だけで「定員＋融通」を超えているクラブです。', f(**SMALLF))
put(ws, 'A29', '※「残り」は定員からの残りです（マイナスは定員を超えた人数）。融通の範囲内なら状態は黄色、超えると赤です。', f(**SMALLF))
put(ws, 'A30', '※「決定」と学年ごとの人数は、新年度名簿を貼ったあとは新年度名簿（転入生の手入力をふくむ）で数えます。', f(**SMALLF))
page(ws, ws.PAPERSIZE_A4, 'landscape', 1)
protect(ws)

# ---------------- 計算用（新年度の並べ替えと名簿の位置） ----------------
CALC_ROWS = (3, NN + 2)
def calc_sheet():
    ws = sheet('計算用')
    put(ws, 'A1', '新年度モード', f(size=9)); put(ws, 'B1', f'=IF(COUNTIF({NEW("D")},"?*")>0,1,0)', f(size=9, bold=True))
    for c, h in zip('ABCDEFGH', ['新名簿行', 'クラブ', 'No', '順', 'キー', '組', '番号', '名前']):
        put(ws, f'{c}2', h, f(size=9, bold=True))
    a, b = CALC_ROWS
    for r in range(a, b + 1):
        k = r - a + 1
        put(ws, f'A{r}', f'=IFERROR(MATCH(SMALL({NEW("J")},{k}),{NEW("J")},0),"")', f(size=9))
        put(ws, f'B{r}', f'=IF(A{r}="","",INDEX({NEW("G")},A{r}))', f(size=9))
        put(ws, f'C{r}', f'=IF(A{r}="","",IFERROR(MATCH(B{r},{CN},0),""))', f(size=9))
        put(ws, f'D{r}', f'=IF(C{r}="","",COUNTIF($C${a}:C{r},C{r}))', f(size=9))
        put(ws, f'E{r}', f'=IF(C{r}="","",C{r}*1000+D{r})', f(size=9))
        put(ws, f'F{r}', f'=IF(A{r}="","",INDEX({NEW("K")},A{r}))', f(size=9))
        put(ws, f'G{r}', f'=IF(A{r}="","",INDEX({NEW("C")},A{r}))', f(size=9))
        put(ws, f'H{r}', f'=IF(A{r}="","",INDEX({NEW("D")},A{r}))', f(size=9))
    # 位置グリッド：J列〜（クラブk）、3行目〜（j番目）
    for k in range(1, NC + 1):
        c = CL(9 + k)
        put(ws, f'{c}2', k, f(size=9, bold=True))
        for j in range(1, NM + 1):
            put(ws, f'{c}{j+2}', (f'=IF($B$1=1,IFERROR(MATCH({k*1000+j},$E${a}:$E${b},0),""),'
                                  f'IFERROR(MATCH({k*1000+j},振り分け!$W${F0}:$W${FL},0),""))'), f(size=9))
    ws.sheet_state = 'hidden'
    protect(ws)
    return ws
a, b = CALC_ROWS
POS = lambda k, j: f'計算用!${CL(9 + k)}${j + 2}'
def disp(kind, p):
    cm, fm = {'組': ('F', 'B'), '番号': ('G', 'C'), '名前': ('H', 'D')}[kind]
    return (f'=IF({p}="","",IF({MODE}=1,INDEX(計算用!${cm}${a}:${cm}${b},{p}),'
            f'INDEX(振り分け!${fm}${F0}:${fm}${FL},{p})))')

# ---------------- 8. 一覧名簿 ----------------
ws = sheet('一覧名簿')
T1, T2 = 3, 3 + 4 + NM + 1
for bk in range(10):
    ws.column_dimensions[CL(2 * bk + 1)].width = 5
    ws.column_dimensions[CL(2 * bk + 2)].width = 13
put(ws, 'A1', f'={S}!B3&"　全"&{S}!B4&"担当者および児童名簿"&IF({MODE}=0,"（仮・前年度の組）","")', f(size=16, bold=True))
for (r0, off) in ((T1, 0), (T2, 10)):
    for bk in range(10):
        k = off + bk + 1; sr = 7 + k; qr = 6 + k
        c1, c2 = CL(2 * bk + 1), CL(2 * bk + 2)
        for d in range(3):
            ws.merge_cells(f'{c1}{r0+d}:{c2}{r0+d}')
        put(ws, f'{c1}{r0}', f'=IF({S}!$P${sr}="","",{S}!$P${sr}&"（"&定員チェック!$F${qr}&"名）")', f(bold=True, size=10), HDR, CEN)
        put(ws, f'{c1}{r0+1}', f'=IF({S}!$P${sr}="","","担当："&{S}!$S${sr})', f(size=9), al=CEN)
        put(ws, f'{c1}{r0+2}', f'=IF({S}!$P${sr}="","","場所："&{S}!$T${sr})', f(size=9), al=CEN)
        put(ws, f'{c1}{r0+3}', '組', f(bold=True, size=10), HDR, CEN)
        put(ws, f'{c2}{r0+3}', '名前', f(bold=True, size=10), HDR, CEN)
        for j in range(1, NM + 1):
            r = r0 + 3 + j
            put(ws, f'{c1}{r}', disp('組', POS(k, j)), f(size=9), al=CEN, box=True)
            put(ws, f'{c2}{r}', disp('名前', POS(k, j)), f(size=9), al=LFT, box=True)
        for rr in range(r0, r0 + 4):
            for cc in (c1, c2):
                ws[f'{cc}{rr}'].border = BOX
for (r0, _) in ((T1, 0), (T2, 10)):
    for bk in range(10):
        c1 = CL(2 * bk + 1)
        colorcf(ws, f'{c1}{r0+4}:{c1}{r0+3+NM}', 'IF(計算用!$B$1=1,IFERROR(INDEX(設定!$M$8:$M$31,MATCH(' + f'{c1}{r0+4}' + ',設定!$L$8:$L$31,0)),""),IFERROR(INDEX(設定!$H$8:$H$31,MATCH(' + f'{c1}{r0+4}' + ',設定!$G$8:$G$31,0)),""))')
ws.print_area = f'A1:T{T2 + 3 + NM}'
ws.row_breaks.append(Break(id=T2 - 1))
page(ws, ws.PAPERSIZE_A3, 'landscape', 0)
ws.page_margins.left = ws.page_margins.right = 0.4
ws.page_margins.top = ws.page_margins.bottom = 0.4
protect(ws)

# ---------------- 9〜28. クラブ①〜⑳ ----------------
MARU = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
for k in range(1, NC + 1):
    ws = sheet(f'クラブ{MARU[k-1]}')
    sr, qr = 7 + k, 6 + k
    for col, w in zip('ABCD', [5, 6, 6, 18]):
        ws.column_dimensions[col].width = w
    for i in range(11):
        ws.column_dimensions[CL(5 + i)].width = 4.6
    ws.merge_cells('A1:O1'); ws.merge_cells('A2:O2')
    put(ws, 'A1', f'=IF({S}!$P${sr}="","",{S}!$B$3&"　"&{S}!$P${sr}&{S}!$B$4&"名簿"&IF({MODE}=0,"（仮・前年度の組）",""))', f(size=16, bold=True), al=CEN)
    put(ws, 'A2', (f'=IF({S}!$P${sr}="","","担当："&{S}!$S${sr}&"　　活動場所："&{S}!$T${sr}&"　　人数："&定員チェック!$F${qr}&"名（"'
                   f'&{G1}&"年"&定員チェック!$G${qr}&"・"&{G2}&"年"&定員チェック!$H${qr}&"・"&{G3}&"年"&定員チェック!$I${qr}&"）")'), f(size=11), al=CEN)
    for i, h in enumerate(['No.', '組', '番号', '名前'] + list(MARU[:11])):
        put(ws, f'{CL(i+1)}4', h, f(bold=True), HDR, CEN, True)
    for j in range(1, NM + 1):
        r = 4 + j; p = POS(k, j)
        put(ws, f'A{r}', f'=IF({p}="","",{j})', al=CEN, box=True)
        put(ws, f'B{r}', disp('組', p), al=CEN, box=True)
        put(ws, f'C{r}', disp('番号', p), al=CEN, box=True)
        put(ws, f'D{r}', disp('名前', p), al=LFT, box=True)
        for i in range(11):
            ws[f'{CL(5+i)}{r}'].border = BOX
        ws.row_dimensions[r].height = 15
    colorcf(ws, f'B5:B{4+NM}', 'IF(計算用!$B$1=1,IFERROR(INDEX(設定!$M$8:$M$31,MATCH(B5,設定!$L$8:$L$31,0)),""),IFERROR(INDEX(設定!$H$8:$H$31,MATCH(B5,設定!$G$8:$G$31,0)),""))')
    ws.print_area = f'A1:O{4+NM}'
    page(ws, ws.PAPERSIZE_A4, 'portrait', 1)
    protect(ws)

calc_sheet()

# ---------------- テスト用：先生の決定の例（料理の要調整を調整ずみにする） ----------------
seats = {n: c + t for (n, c, t, _, _) in CLUBS}
order = sorted(old, key=lambda s: ((5, 4, 3).index(s[0]), CLS.index(s[1]), s[2]))
INV = {i + 1: n for i, n in enumerate(names)}
nm = lambda x: INV.get(x, x) if isinstance(x, int) else x
adopted = {}
oldkeys = {s[:3] for s in old}
for w in wishes:
    if tuple(w[:3]) in oldkeys: adopted[tuple(w[:3])] = [nm(x) for x in w[3:]]
def auto(st):
    w = adopted.get(st[:3])
    if not w or w[0] not in seats: return None
    c = sum(1 for o in order if adopted.get(o[:3]) and adopted[o[:3]][0] == w[0] and o[0] >= st[0])
    return w[0] if c <= seats[w[0]] else None
final = {}
pending = []
for st in order:
    a_ = auto(st)
    if a_: final[st[:3]] = a_
    elif adopted.get(st[:3]): pending.append(st)
cnt = lambda n: sum(1 for v in final.values() if v == n)
pend_first = lambda n: sum(1 for p in pending if adopted[p[:3]][0] == n and p[:3] not in final)
ws = wb['振り分け']
for st in [p for p in pending if adopted[p[:3]][0] == '料理']:
    w = adopted[st[:3]]
    if cnt('料理') < seats['料理']:
        dec = '料理'
    else:
        ok = lambda x: x in seats and cnt(x) + pend_first(x) < seats[x]
        dec = next((x for x in w[1:] if ok(x)), None) or next(x for x in names if ok(x))
    final[st[:3]] = dec
    ws[f'K{F0 + order.index(st)}'].value = dec

wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print('saved')
