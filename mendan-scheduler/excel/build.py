"""面談日程ツール（Excel版・マクロなし）を作るスクリプト。

  python3 build.py [出力ファイル]

日数は最大10日、1日の枠は最大24枠（時間帯は2つまで）、児童は最大45人。
"""
import sys
import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.utils import get_column_letter as CL

D, T, NS = 10, 24, 45          # 日数・1日の枠数・児童数の上限
N = D * T                      # 枠の総数
BLK = T + 4                    # ×入力シートの1人分の行数
FONT = "BIZ UDPゴシック"
OUT = sys.argv[1] if len(sys.argv) > 1 else "面談日程ツール.xlsx"

SET, ROS, INP, ASG, AUT, CA, CB = "設定", "名簿", "×入力", "調整・決定", "自動案A", "計算A", "計算B"
AUTB, CC = "自動案B", "計算C"      # 自動案B（散らす）とその計算
SIB = "印刷（兄弟確認）"
q = lambda s: "'" + s + "'!"   # シート参照
GL = 5 + T                       # 調整・決定／自動案の表の最後の行
GRID = q(ASG) + f"$C$6:$L${GL}"   # 調整・決定の表


# ×入力の1人分：base=名前の行、+1=「この日全部×」、+2=日付の見出し、+3〜=時刻の行（A列が「この時間全部×」）
def base(i):                   # ×入力シートで i 人目のブロックの先頭行
    return 5 + (i - 1) * BLK


def sj(d, t):                  # 枠番号（1〜120）
    return (d - 1) * T + t


def jc(j):                     # 計算A で枠 j の列
    return CL(3 + j)


JA, JZ = jc(1), jc(N)          # D 〜 DS
HOPES = ["早い時刻", "遅い時刻", "早い日", "遅い日"]
# 計算A の枠ごとの行（1〜8行目のほか）
ROW_NEXT = 106                 # 同じ日に次の枠がある
ROW_AUTOBLK = 107              # 自動案Aで「後ろを空ける」枠になった
ROW_AUTOBLK_B = 116            # 自動案Bで「後ろを空ける」枠になった
ROW_GAPBLK = 108               # 決定済みの人の「後ろを空ける」枠
ROW_OCC = 109                  # 調整・決定の表に人が入っている
ROW_PRIO = 110                 # 110:全体の詰め方 111〜114:希望ごとの優先順
ROW_EXIST = 115                # 設定した日付・時間にある枠（ない枠は表で見えなくする）
ROW_NB = 117                   # 同じ日・同じ時間帯に、時間として次の枠がある（先生の都合は見ない）
INPR = q("×入力") + "$A$1:$L$1300"  # ×入力シート全体
TL = 10 + T                       # 設定シートの時刻の表の最後の行
TBLK = f"'設定'!$M$11:$V${TL}"      # 先生の都合で使えない枠
TDAY = "'設定'!$M$9:$V$9"           # この日は組まない
TTIME = f"'設定'!$K$11:$K${TL}"     # この時間は組まない
N1, N2 = "'計算A'!$A$3", "'計算A'!$A$4"   # 時間帯1・2の枠の数

f = lambda **k: Font(name=FONT, **k)
fill = lambda c: PatternFill("solid", start_color=c, end_color=c)
thin = Side(style="thin", color="B4C3D6")
box = Border(left=thin, right=thin, top=thin, bottom=thin)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
INPUT = fill("FFF8D6")         # 入力するセル
HEAD = fill("E8EEF7")            # 時刻などの見出し（うすい青）
PRIMARY, PRIMARY_D, LIGHT = "2B5797", "1B365D", "DCE6F2"
ACCENT, CARD = "3A6DB5", "F4F7FC"   # ボタン・カードの色
HEAD_D = fill(PRIMARY)             # 日付などの見出し（こい青）
HOME = "ホーム"
GRAY = fill("D9D9D9")

wb = Workbook()


def sheet(name, first=False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = name
    ws.sheet_view.showGridLines = False
    return ws


def put(ws, ref, v, **style):
    c = ws[ref]
    c.value = v
    c.font = style.get("font", f())
    for k in ("fill", "alignment", "border", "number_format"):
        if k in style:
            setattr(c, k, style[k])
    return c


def arr(ws, ref, formula, **style):
    put(ws, ref, ArrayFormula(ref, formula), **style)


WHITE = fill("FFFFFF")
PASTE_STEPS = [
    "「調整・決定」への貼り付けかた",
    "① 自動案の表を選んで Ctrl + C（名前ボックスで「自動案Aの表」などを選ぶと全体を選べます）",
    "② 「調整・決定」の表の左上（いちばん早い日・時刻のマス）をクリック",
    "③ 右クリック →［貼り付けのオプション］の「値」（123 の絵）。または Ctrl + Shift + V",
    "※ ふつうの貼り付け（Ctrl + V）は×。「循環参照」の注意が出たら、すぐ Ctrl + Z で元に戻します。",
]


def paste_box(ws, col, row, width_cols):
    """［値の貼り付け］のやり方を、目立つ枠で書く"""
    last = CL(col + width_cols - 1)
    for k, text in enumerate(PASTE_STEPS):
        r = row + k
        put(ws, f"{CL(col)}{r}", text, font=f(size=10 if k == 0 else 9, bold=(k == 0 or k == 4), color="B23A3A" if k == 4 else PRIMARY_D),
            fill=fill("FFF4D6"), alignment=Alignment(wrap_text=True, vertical="center", indent=1))
        ws.merge_cells(f"{CL(col)}{r}:{last}{r}")

ALLX = fill("FDECEA")          # まとめて×の入力欄


def hide_rules(ws, rng, unused, rules, frame=True):
    """使わない枠は白く（見えなく）し、使う枠には線を引いて色分けする条件付き書式"""
    ws.conditional_formatting.add(rng, FormulaRule(formula=[unused], fill=WHITE, stopIfTrue=True))
    for fo, fi, fn in rules:
        ws.conditional_formatting.add(rng, FormulaRule(formula=[fo], fill=fi, font=fn, border=box if frame else None, stopIfTrue=True))
    if frame:
        ws.conditional_formatting.add(rng, FormulaRule(formula=["TRUE"], border=box))


def EXIST(jexpr):              # その枠が設定した日付・時間にあるか
    return f"INDEX({q(CA)}${JA}${ROW_EXIST}:${JZ}${ROW_EXIST},{jexpr})"


# ---------------------------------------------------------------- ホーム
ws = sheet(HOME, first=True)
ws.column_dimensions["A"].width = 3
for c in range(2, 14):
    ws.column_dimensions[CL(c)].width = 11
lines = [
    ("面談日程ツール（Excel版）", f(size=18, bold=True)),
    ("マクロは使っていません。ふつうのExcelファイルとして開けます。黄色のセルが入力する場所です。", f(size=11)),
    ("", None),
    ("1. 「設定」シート", f(bold=True, size=12)),
    ("・面談の日付（上から順に、最大10日）、時間帯（午前と午後に分けるときは2つ）と1枠の長さを入れます（1日最大24枠）。", None),
    ("・空けたい日や休憩の時刻には「〇」を選びます。自動案では、ほかに入る枠がないときだけ使われます。", None),
    ("・出張や会議などで面談を組まない日・時間・枠は、右の「先生の都合で使えない枠」で「×」を選びます。止めた枠は、×入力・自動案・調整・決定で灰色になり、使われません。", None),
    ("2. 「名簿」シート", f(bold=True, size=12)),
    ("・Excelの名簿から「出席番号」と「名前」をコピーして、「番号」の列のいちばん上のマスに貼り付けます（最大45人）。", None),
    ("・他のクラスに兄弟がいる家庭は、「兄弟」の列で「〇」を選び、「兄弟メモ」に兄弟のクラスなどをメモします。", None),
    ("・「希望」：早い時刻／遅い時刻／早い日／遅い日 から選べます。自動案で、×のない枠の中からできるだけ希望に合う枠を選びます（希望なので、合わないこともあります）。", None),
    ("・「後ろを空ける」：話が長引きそうな家庭は、同じ日のすぐ次の枠を空けます。「必ず空けたい」「出来れば空けたい」から選びます（出来れば空けたいは、空けられないときは詰めて入れます）。日の最後の枠なら空ける必要はありません。", None),
    ("・名簿の行は並べ替えないでください（×入力の内容とずれてしまいます）。絞り込み（フィルター）は使えます。", None),
    ("・自動案や調整・決定には名前だけが出ます。同じ名前の児童がいるときだけ、「番号 名前」で区別して表示します。", None),
    ("3. 「×入力」シート", f(bold=True, size=12)),
    ("・1人ずつ、予定表と同じ形の表があります。名簿の「×入力へ」をクリックすると、その人の表に移動します。", None),
    ("・都合の悪い枠に「×」を入れます（何か文字が入っていれば×として扱います）。消すときは Delete キー。", None),
    ("・まとめて入れるとき：マウスでなぞって範囲を選び、「×」と打って Ctrl + Enter を押すと、選んだ枠が全部×になります。", None),
    ("・その日全部：日付の上の「この日全部」の欄で「×」を選びます。その時間全部：時刻の左の「この時間全部」の欄で「×」を選びます（表のマスはピンクになります）。", None),
    ("・×が1つもない家庭は「提出状況」で「×なし（どこでもOK）」、提出していない家庭は「未提出」を選びます。", None),
    ("4. 「自動案A」「自動案B」シート", f(bold=True, size=12)),
    ("・自動で組んだ案が2つ出ます（どちらも、入れられる枠が少ない家庭から先に決めます。未入力・未提出の家庭は外れます）。", None),
    ("・自動案A（詰める）：設定の「詰め方」に従って、早い時間や前の日から詰めて組みます。", None),
    ("・自動案B（散らす）：日ごとの人数がそろい、面談と面談のあいだがなるべく空くように組みます（希望がある家庭は希望を優先）。", None),
    ("・よいほうの表をコピーして、「調整・決定」シートの表の左上（いちばん早い日・時刻のマス）に［値の貼り付け］（右クリック →「値」、または Ctrl + Shift + V）をします。左上の名前ボックスで「自動案Aの表」「自動案Bの表」を選ぶと、表全体をまとめて選べます。", None),
    ("・ふつうの貼り付け（Ctrl + V）は使わないでください。計算式ごと貼り付けられて「循環参照」の注意が出て、色分けも消えます。出てしまったら、すぐ Ctrl + Z で元に戻します。", f(size=10.5, bold=True, color="B23A3A")),
    ("・「調整・決定」シートですでに決めた人はそのまま残り、残りの人だけで案が作られます。やり直したいときは調整・決定の表を消します。", None),
    ("5. 「調整・決定」シート", f(bold=True, size=12)),
    ("・各枠のセルで、プルダウンから児童を選びます。", None),
    ("・右の「児童を選ぶ」で児童を選ぶと、表の色が変わります：緑＝入れられる空き枠／黄＝入れられる（ほかの人がいる）／ピンク＝×の枠／青＝今いる枠。", None),
    ("・赤い枠は「×の枠に入れてしまった」、オレンジの枠は「同じ人が2か所に入っている」です。", None),
    ("・青い斜線の枠は「前の人の後ろを空ける枠」です。紫の枠は、空けるはずの枠に人が入っています。", None),
    ("・下の「候補」の表には、その枠に入れられる、まだ決まっていない児童が表示されます。「1人」の枠は先に決めると楽です。", None),
    ("6. 「印刷（兄弟確認）」シート", f(bold=True, size=12)),
    ("・調整・決定で決めた日程が、予定表と同じ形で出ます。兄弟がいる子は色付きで、名前の下に兄弟のクラスが出ます（名簿の「兄弟メモ」にはクラス名だけを書きます。例：2年1組）。", None),
    ("・兄弟の担任から面談の日時を聞いたら、名簿の「兄弟の日付」「兄弟の時刻」を選びます。自動案では、できるだけ兄弟のすぐ前かすぐ後に入れます。", None),
    ("・Word の表に名前を入れるときは、「調整・決定」の名前のマスを選んでコピーし、Word の表の左上のマスで右クリック →「セルの上書き」で貼り付けます。", None),
    ("7. 結果", f(bold=True, size=12)),
    ("・「名簿」シートの右側に、決まった日時・注意（×の枠／2か所／後ろが空いていない／使えない枠／未決定）・自動案が表示されます。", None),
    ("・CSVが必要なときは「名簿」シートを開いて［ファイル］→［名前を付けて保存］→ 種類を「CSV UTF-8」にします。", None),
    ("・兄弟ありの家庭だけ見たいときは、名簿の「兄弟」の列でフィルターをかけます。", None),
    ("", None),
    ("※ 「計算A」「計算B」「計算C」は計算用の隠しシートです。さわらないでください。", f(color="9A6A00")),
]
put(ws, "A1", "面談日程ツール")
put(ws, "A2", "×のついた予定表から、個人面談の日程を組むツールです（マクロなし）。黄色のマスが入力する場所です。")
# いまの状況
put(ws, "B4", "いまの状況", font=f(size=13, bold=True, color=PRIMARY_D))
R = q(ROS)
tiles = [
    ("名簿の人数", f'=COUNTIF({R}$B$5:$B$49,"?*")', None),
    ("×入力済み", f'=COUNTIF({R}$J$5:$J$49,"入力済み")+COUNTIF({R}$J$5:$J$49,"×なし")', None),
    ("未入力", f'=COUNTIF({R}$J$5:$J$49,"未入力")', "9A6A00"),
    ("未提出", f'=COUNTIF({R}$J$5:$J$49,"未提出")', "9A6A00"),
    ("決定済み", f'=SUMPRODUCT(({R}$N$5:$N$49<>"")*1)', None),
    ("未決定", f'=COUNTIF({R}$P$5:$P$49,"未決定")', "B23A3A"),
]
for k, (lab, fo, warn) in enumerate(tiles):
    c1, c2 = CL(2 + 2 * k), CL(3 + 2 * k)
    put(ws, f"{c1}5", lab, font=f(size=10, bold=True, color=PRIMARY_D), fill=fill(LIGHT), alignment=center)
    ws.merge_cells(f"{c1}5:{c2}5")
    put(ws, f"{c1}6", fo, font=f(size=24, bold=True, color=PRIMARY_D), fill=fill("FFFFFF"), alignment=center, number_format='0"人"')
    ws.merge_cells(f"{c1}6:{c2}6")
    for rr in (5, 6):
        for cc in (c1, c2):
            ws[f"{cc}{rr}"].border = Border(left=Side(style="thin", color="FFFFFF"), right=Side(style="thin", color="FFFFFF"),
                                            top=Side(style="thin", color=LIGHT), bottom=Side(style="medium", color=PRIMARY) if rr == 6 else None)
    if warn:
        ws.conditional_formatting.add(f"{c1}6", FormulaRule(formula=[f"{c1}6>0"], font=Font(name=FONT, size=24, bold=True, color=warn)))
ws.row_dimensions[5].height = 22
ws.row_dimensions[6].height = 46
# 使う順番
put(ws, "B8", "使う順番", font=f(size=13, bold=True, color=PRIMARY_D))
steps = [
    (SET, "日付と時間枠を決める", "面談する日付、時間帯（2つまで）、1枠の長さ。出張などで組まない日・時間もここで止めます。"),
    (ROS, "名簿を貼り付ける", "番号と名前を貼り付けます。兄弟・希望の時間・後ろを空けるもここで選びます。"),
    (INP, "×を入力する", "予定表と同じ形の表に「×」。日付の上・時刻の左の欄で、1日全部・その時間全部も一度に×にできます。"),
    (AUT, "自動案を見る（A：詰める／B：散らす）", "入れられる枠が少ない家庭から順に自動で組んだ案が2つ。よいほうを調整・決定に貼り付けます。"),
    (ASG, "調整して決定する", "プルダウンで手直しして日程を決めます。児童を選ぶと、入れられる枠に色がつきます。"),
    (SIB, "印刷して兄弟を確認する", "決めた日程を予定表の形で印刷。兄弟がいる子は色付きで、兄弟のクラスも出ます。"),
]
for k, (sh, title, desc) in enumerate(steps):
    r = 9 + 3 * k
    put(ws, f"B{r}", k + 1, font=f(size=20, bold=True, color="FFFFFF"), fill=HEAD_D, alignment=center)
    ws.merge_cells(f"B{r}:B{r+1}")
    put(ws, f"C{r}", title, font=f(size=13, bold=True), fill=fill(CARD), alignment=Alignment(vertical="bottom", indent=1))
    put(ws, f"C{r+1}", desc, font=f(size=10, color="4A5568"), fill=fill(CARD), alignment=Alignment(vertical="top", indent=1, wrap_text=True))
    ws.merge_cells(f"C{r}:J{r}"); ws.merge_cells(f"C{r+1}:J{r+1}")
    if sh == AUT:   # 自動案は A・B の2つ
        put(ws, f"K{r}", f'=HYPERLINK("#\'{AUT}\'!A1","案A ▶")', font=f(size=12, bold=True, color="FFFFFF"), fill=fill(ACCENT), alignment=center)
        put(ws, f"L{r}", f'=HYPERLINK("#\'{AUTB}\'!A1","案B ▶")', font=f(size=12, bold=True, color="FFFFFF"), fill=fill("5B8BD0"), alignment=center)
        ws.merge_cells(f"K{r}:K{r+1}"); ws.merge_cells(f"L{r}:L{r+1}")
    else:
        put(ws, f"K{r}", f'=HYPERLINK("#\'{sh}\'!A1","開く ▶")', font=f(size=12, bold=True, color="FFFFFF"), fill=fill(ACCENT), alignment=center)
        ws.merge_cells(f"K{r}:L{r+1}")
    ws.row_dimensions[r].height = 24; ws.row_dimensions[r + 1].height = 30
    for cc in "CDEFGHIJ":
        ws[f"{cc}{r+1}"].border = Border(bottom=Side(style="thin", color="D3DEEC"))
# くわしい使い方
r0 = 29
put(ws, f"B{r0}", "くわしい使い方", font=f(size=13, bold=True, color=PRIMARY_D))
for k, (t, fo) in enumerate(lines[3:]):
    r = r0 + 1 + k
    put(ws, f"B{r}", t, font=fo or f(size=10.5), alignment=Alignment(wrap_text=True, vertical="top"))
    ws.merge_cells(f"B{r}:M{r}")
    if t and len(t) > 70:
        ws.row_dimensions[r].height = 30

# ---------------------------------------------------------------- 設定
ws = sheet(SET)
for col, w in zip("ABCDEFGHI", [25, 10, 4, 10, 18, 4, 10, 12, 10]):
    ws.column_dimensions[col].width = w
put(ws, "A1", "設定", font=f(size=16, bold=True))
put(ws, "A2", "面談の日付と時間枠を決めます。黄色のマスを入力してください。")
put(ws, "A3", "時間帯1")
put(ws, "A4", "時間帯2（なければ空欄）")
for r, v1, v2 in ((3, datetime.time(13, 30), datetime.time(15, 30)), (4, None, None)):
    put(ws, f"B{r}", v1, fill=INPUT, border=box, number_format="h:mm", alignment=center)
    put(ws, f"C{r}", "〜", alignment=center)
    put(ws, f"D{r}", v2, fill=INPUT, border=box, number_format="h:mm", alignment=center)
put(ws, "A5", "1枠の長さ（分）")
put(ws, "B5", 15, fill=INPUT, border=box, number_format="0", alignment=center)
put(ws, "A6", "1日の枠の数")
put(ws, "B6", f"=MIN({T},{N1}+{N2})", alignment=center)
put(ws, "D6", f"（最大{T}枠）", font=f(color="666666", size=9))
# 入力ミスの注意と、入力できる値の制限
warn = f(size=10, bold=True, color="B23A3A")
put(ws, "E3", '=IF(OR(NOT(ISNUMBER(B3)),NOT(ISNUMBER(D3))),"← 始まりと終わりの時刻を入れてください",IF(D3<B3,"← 終わりは始まりより後の時刻にしてください",""))', font=warn)
put(ws, "E4", '=IF(AND(B4="",D4=""),"",IF(OR(NOT(ISNUMBER(B4)),NOT(ISNUMBER(D4))),"← 始まりと終わりの両方を入れてください",IF(D4<B4,"← 終わりは始まりより後の時刻にしてください",IF(AND(ISNUMBER(D3),B4<=D3),"← 時間帯1より後の時刻にしてください",""))))', font=warn)
put(ws, "E5", '=IF(AND(ISNUMBER(B5),B5>0),"","← 5〜120の数字を入れてください")', font=warn)
put(ws, "E6", f'=IF({N1}+{N2}>{T},"← 枠が{T}をこえています。こえた分は使いません","")', font=warn)
dv_time = DataValidation(type="time", operator="between", formula1="0", formula2="0.999988426")
dv_time.error = "時刻を「13:30」のように入れてください。"; dv_time.showErrorMessage = True
dv_step = DataValidation(type="whole", operator="between", formula1="5", formula2="120")
dv_step.error = "5〜120の数字（分）を入れてください。"; dv_step.showErrorMessage = True
dv_date = DataValidation(type="date", operator="greaterThan", formula1="36526")
dv_date.error = "日付を「11/24」のように入れてください。"; dv_date.showErrorMessage = True
for dv_, ref in ((dv_time, "B3:B4"), (dv_time, "D3:D4"), (dv_step, "B5"), (dv_date, "B11:B20")):
    if dv_ not in ws.data_validations.dataValidation:
        ws.add_data_validation(dv_)
    dv_.add(ref)
put(ws, "A8", "自動案の詰め方")
modes = ["早い時間から（各日の最後を空ける）", "日付順に詰める（後ろの日を空ける）"]
put(ws, "B8", modes[0], fill=INPUT, border=box)
ws.merge_cells("B8:E8")
dv = DataValidation(type="list", formula1='"' + ",".join(modes) + '"', allow_blank=False)
ws.add_data_validation(dv); dv.add("B8")

for ref, v in zip(["A10", "B10", "C10", "D10", "E10", "F10", "G10", "H10", "I10"],
                  ["", "日付", "曜日", "なるべく空ける", "表示", "", "時刻", "休憩（なるべく空ける）", "表示"]):
    if v:
        put(ws, ref, v, font=f(bold=True), fill=HEAD, border=box, alignment=center)
dates = [datetime.date(2026, 11, d) for d in (24, 25, 26, 27, 30)]
dv_mark = DataValidation(type="list", formula1='"〇"', allow_blank=True)
ws.add_data_validation(dv_mark)
for d in range(1, D + 1):
    r = 10 + d
    put(ws, f"A{r}", f"{d}日目", alignment=center)
    put(ws, f"B{r}", dates[d - 1] if d <= len(dates) else None, fill=INPUT, border=box, number_format="m/d", alignment=center)
    put(ws, f"C{r}", f'=IF(B{r}="","",CHOOSE(WEEKDAY(B{r}),"日","月","火","水","木","金","土"))', alignment=center, border=box)
    put(ws, f"D{r}", None, fill=INPUT, border=box, alignment=center); dv_mark.add(f"D{r}")
    put(ws, f"E{r}", f'=IF(B{r}="","",MONTH(B{r})&"月"&DAY(B{r})&"日（"&C{r}&"）")', border=box)
for t in range(1, T + 1):
    r = 10 + t
    put(ws, f"F{r}", t, font=f(color="999999", size=9), alignment=center)
    put(ws, f"G{r}", f'=IF(F{r}<=MIN({N1},{T}),$B$3+(F{r}-1)*$B$5/1440,IF(F{r}<=$B$6,$B$4+(F{r}-{N1}-1)*$B$5/1440,""))',
        number_format="h:mm", border=box, alignment=center)
    put(ws, f"H{r}", None, fill=INPUT, border=box, alignment=center); dv_mark.add(f"H{r}")
    put(ws, f"I{r}", f'=IF(G{r}="","",TEXT(G{r},"h:mm")&"〜")', border=box, alignment=center)
ws.conditional_formatting.add(f"G11:I{TL}", FormulaRule(formula=['$G11=""'], fill=fill("FFFFFF"), font=Font(name=FONT, color="BBBBBB")))
note = Alignment(wrap_text=True, vertical="top")
put(ws, "A22", "※ 日付は上から詰めて入れてください。曜日・表示・時刻は自動で出ます。午前と午後に分けるときは、時間帯2も入れます（昼休みは表に出ません）。", font=f(color="666666", size=9), alignment=note)
ws.merge_cells("A22:E24")
put(ws, "A25", "※「なるべく空ける」「休憩」は、ほかに入る枠がないときだけ使います。必ず使わない枠は、右の「先生の都合で使えない枠」で止めてください。", font=f(color="666666", size=9), alignment=note)
ws.merge_cells("A25:E27")

# 先生の都合で使えない枠（出張・会議など）
ws.column_dimensions["J"].width = 3
ws.column_dimensions["K"].width = 11
ws.column_dimensions["L"].width = 9
for d in range(D):
    ws.column_dimensions[CL(13 + d)].width = 14
put(ws, "K7", "先生の都合で使えない枠（出張・会議など）", font=f(size=13, bold=True, color=PRIMARY_D))
put(ws, "K8", "「×」を選んだ日・時間・枠は、自動案にも調整・決定にも使いません。", font=f(size=9, color="666666"))
dv_x = DataValidation(type="list", formula1='"×"', allow_blank=True)
ws.add_data_validation(dv_x)
put(ws, "K9", "この日は組まない ▶", font=f(size=9, bold=True, color="B23A3A"), alignment=Alignment(horizontal="right", vertical="center"))
ws.merge_cells("K9:L9")
put(ws, "K10", "この時間は\n組まない ▼", font=f(size=9, bold=True, color="B23A3A"), fill=HEAD, border=box, alignment=center)
put(ws, "L10", "", fill=HEAD)
ws.row_dimensions[10].height = 44
XF = f(size=14, bold=True, color="B23A3A")
for d in range(1, D + 1):
    c = CL(12 + d)
    put(ws, f"{c}9", None, fill=ALLX, alignment=center, font=XF)
    put(ws, f"{c}10", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, alignment=center)
    for t in range(1, T + 1):
        put(ws, f"{c}{10+t}", None, alignment=center, font=XF)
dv_x.add("M9:V9"); dv_x.add(f"K11:K{TL}"); dv_x.add(f"M11:V{TL}")
for t in range(1, T + 1):
    put(ws, f"K{10+t}", None, fill=ALLX, alignment=center, font=XF)
    put(ws, f"L{10+t}", f"=$I${10+t}", font=f(bold=True), fill=HEAD, alignment=center)
hide_rules(ws, "M9:V9", 'INDEX($B$11:$B$20,COLUMN(M9)-12)=""', [])
hide_rules(ws, f"K11:K{TL}", '$L11=""', [])
hide_rules(ws, f"L11:L{TL}", '$L11=""', [], frame=False)
hide_rules(ws, f"M11:V{TL}", 'OR(INDEX($B$11:$B$20,COLUMN(M11)-12)="",ROW(M11)-10>$B$6)',
           [('OR(M11<>"",M$9<>"",$K11<>"")', fill("F6DEDB"), None)])

# ---------------------------------------------------------------- 名簿
# A番号 B名前 C兄弟 D兄弟メモ E兄弟の日付 F兄弟の時刻 G希望 H後ろを空ける（ここまで入力）
# I表示名 J状況 K×の数 L入れられる空き枠 M決める順 N日付 O時刻 P注意 Q自動案A R自動案B Sリンク
ws = sheet(ROS)
heads = ["番号", "名前", "兄弟", "兄弟メモ（クラス）", "兄弟の日付", "兄弟の時刻", "希望", "後ろを空ける", "表示名", "状況", "×の数", "入れられる空き枠", "決める順",
         "日付", "時刻", "注意", "自動案A（詰める）", "自動案B（散らす）", ""]
widths = [6, 16, 6, 16, 15, 9, 10, 16, 18, 10, 7, 9, 7, 15, 8, 30, 22, 22, 9]
for i, (h, w) in enumerate(zip(heads, widths), start=1):
    ws.column_dimensions[CL(i)].width = w
    if h:
        put(ws, f"{CL(i)}4", h, font=f(bold=True), fill=HEAD, border=box, alignment=center)
ws.row_dimensions[4].height = 32
put(ws, "A1", "名簿・結果", font=f(size=16, bold=True))
put(ws, "A2", "黄色の列（番号〜後ろを空ける）を入力します。Excelの名簿から番号と名前を「番号」の列のいちばん上に貼り付けてください（最大45人）。行の並べ替えはしないでください。", font=f(size=10, color="444444"))
put(ws, "A3", "兄弟メモ：兄弟のクラス名（例 2年1組）。兄弟の日付・時刻：兄弟の担任から聞いた面談の日時。希望：早い時刻／遅い時刻／早い日／遅い日。後ろを空ける：必ず空けたい／出来れば空けたい。", font=f(size=10, color="444444"))
dv_sib = DataValidation(type="list", formula1='"〇"', allow_blank=True)
dv_sday = DataValidation(type="list", formula1=f"={q(SET)}$E$11:$E$20", allow_blank=True)
dv_stime = DataValidation(type="list", formula1=f"={q(SET)}$I$11:$I${TL}", allow_blank=True)
dv_hope = DataValidation(type="list", formula1='"' + ",".join(HOPES) + '"', allow_blank=True)
dv_gap = DataValidation(type="list", formula1='"必ず空けたい,出来れば空けたい"', allow_blank=True)
for dv_ in (dv_sib, dv_sday, dv_stime, dv_hope, dv_gap):
    ws.add_data_validation(dv_)
for i in range(1, NS + 1):
    r, a = 4 + i, 9 + i          # a: 計算Aの行
    b = base(i)
    for c in "ABCDEFGH":
        put(ws, f"{c}{r}", None, fill=INPUT, border=box, alignment=Alignment(vertical="center") if c in "BD" else Alignment(horizontal="center", vertical="center", shrink_to_fit=True))
    dv_sib.add(f"C{r}"); dv_sday.add(f"E{r}"); dv_stime.add(f"F{r}"); dv_hope.add(f"G{r}"); dv_gap.add(f"H{r}")
    put(ws, f"I{r}", f'=IF(B{r}="","",IF(COUNTIF($B$5:$B$49,B{r})>1,IF(A{r}="","",A{r}&" ")&B{r},B{r}))', border=box)   # 同じ名前がいるときだけ番号をつける
    put(ws, f"J{r}", f'=IF(B{r}="","",IF({q(INP)}F{b}="未提出","未提出",IF(K{r}>0,"入力済み",IF({q(INP)}F{b}="×なし（どこでもOK）","×なし","未入力"))))', border=box, alignment=center)
    put(ws, f"K{r}", f'=IF(B{r}="","",{q(CA)}IN{a})', border=box, alignment=center)
    put(ws, f"L{r}", f'=IF(OR(J{r}="入力済み",J{r}="×なし"),{q(CA)}IM{a},"")', border=box, alignment=center)
    put(ws, f"M{r}", f'=IF({q(CA)}C{a}=1,COUNTIFS({q(CA)}$C$10:$C$54,1,{q(CA)}$IM$10:$IM$54,"<"&{q(CA)}IM{a})+1,"")', border=box, alignment=center)
    put(ws, f"N{r}", f'=IF({q(CA)}IO{a}=0,"",INDEX({q(SET)}$E$11:$E$20,INDEX({q(CA)}$D$2:$II$2,{q(CA)}IO{a})))', border=box)
    put(ws, f"O{r}", f'=IF({q(CA)}IO{a}=0,"",INDEX({q(SET)}$I$11:$I${TL},INDEX({q(CA)}$D$3:$II$3,{q(CA)}IO{a})))', border=box, alignment=center)
    gapng = (f'AND(H{r}<>"",INDEX({q(CA)}${JA}${ROW_NEXT}:${JZ}${ROW_NEXT},{q(CA)}IO{a})=1,'
             f'INDEX({q(CA)}${JA}${ROW_OCC}:${JZ}${ROW_OCC},{q(CA)}IO{a}+1)=1)')
    put(ws, f"P{r}", f'=IF(I{r}="","",IF({q(CA)}IT{a}<0,"兄弟の日付・時刻が表にありません",IF(COUNTIF({GRID},I{r})>1,"2か所以上に入っています",IF({q(CA)}IO{a}>0,'
                     f'IF(INDEX({q(CA)}$D$4:$II$4,{q(CA)}IO{a})=0,"使えない枠に入っています",IF(INDEX({q(CA)}$D${a}:$II${a},{q(CA)}IO{a})=1,"×の枠に入っています",'
                     f'IF({q(CA)}IV{a}=0,"（出来れば）兄弟の前後ではありません",IF({gapng},IF(H{r}="必ず空けたい","後ろの枠が空いていません","（出来れば）後ろが空いていません"),"")))),'
                     f'IF(OR(J{r}="入力済み",J{r}="×なし"),"未決定","")))))', border=box)
    put(ws, f"Q{r}", f'=IF({q(CA)}IK{a}=0,IF({q(CA)}IL{a}=1,"入る枠がありません",""),INDEX({q(CA)}$D$8:$II$8,{q(CA)}IK{a}))', border=box)
    put(ws, f"R{r}", f'=IF({q(CA)}IR{a}=0,IF({q(CA)}IS{a}=1,"入る枠がありません",""),INDEX({q(CA)}$D$8:$II$8,{q(CA)}IR{a}))', border=box)
    put(ws, f"S{r}", f'=HYPERLINK("#\'{INP}\'!B{b}","×入力へ")', font=f(color="2D5FA8", underline="single"), alignment=center)
ws.freeze_panes = "C5"
ws.auto_filter.ref = "A4:R49"
red_txt = Font(name=FONT, color="B23A3A", bold=True)
ws.conditional_formatting.add("P5:P49", FormulaRule(formula=['OR(P5="未決定",LEFT(P5,6)="（出来れば）")'], font=Font(name=FONT, color="9A6A00", bold=True)))
ws.conditional_formatting.add("P5:P49", FormulaRule(formula=['P5<>""'], font=red_txt))
ws.conditional_formatting.add("Q5:R49", FormulaRule(formula=['Q5="入る枠がありません"'], font=red_txt))
ws.conditional_formatting.add("J5:J49", FormulaRule(formula=['OR(J5="未入力",J5="未提出")'], fill=fill("FBEFC9")))
ws.conditional_formatting.add("L5:L49", FormulaRule(formula=['AND(M5<>"",L5<=2)'], fill=fill("F6DEDB")))

# ---------------------------------------------------------------- ×入力
ws = sheet(INP)
ws.column_dimensions["A"].width = 10
ws.column_dimensions["B"].width = 9
for d in range(D):
    ws.column_dimensions[CL(3 + d)].width = 15
put(ws, "B1", "×入力", font=f(size=16, bold=True))
put(ws, "B2", "都合の悪い枠に「×」。日付の上の欄で「×」→その日全部、時刻の左の欄で「×」→その時間全部が×になります。消すときは Delete。", font=f(size=10, color="444444"))
put(ws, "B3", "×が1つもない家庭は「提出状況」で「×なし（どこでもOK）」、出していない家庭は「未提出」を選びます。右上の「次の人へ ▼」で次の児童に移れます。", font=f(size=10, color="444444"))
dv_st = DataValidation(type="list", formula1='"×なし（どこでもOK）,未提出"', allow_blank=True)
dv_x = DataValidation(type="list", formula1='"×"', allow_blank=True)
dv_x.error = "「×」を選んでください（消すときは Delete）。"; dv_x.showErrorMessage = True
ws.add_data_validation(dv_st); ws.add_data_validation(dv_x)
XF = f(size=13, bold=True, color="B23A3A")
grid_r, day_r, time_r, lab_r = [], [], [], []
for i in range(1, NS + 1):
    b = base(i)
    put(ws, f"B{b}", f'=IF({q(ROS)}B{4+i}="","（名簿 {i}行目：なし）",{q(ROS)}I{4+i})', font=f(size=14, bold=True))
    put(ws, f"E{b}", "提出状況 ▶", alignment=Alignment(horizontal="right", vertical="center"))
    put(ws, f"F{b}", None, fill=INPUT, border=box, alignment=center)
    ws.merge_cells(f"F{b}:G{b}")
    dv_st.add(f"F{b}")
    put(ws, f"H{b}", "状況：", alignment=Alignment(horizontal="right"))
    put(ws, f"I{b}", f"={q(ROS)}J{4+i}", font=f(bold=True))
    put(ws, f"J{b}", "×の数：", alignment=Alignment(horizontal="right"))
    put(ws, f"K{b}", f"={q(ROS)}K{4+i}", font=f(bold=True), alignment=Alignment(horizontal="left"))
    if i < NS:
        put(ws, f"L{b}", f'=HYPERLINK("#\'{INP}\'!B{base(i+1)}","次の人へ ▼")', font=f(bold=True, color=ACCENT, underline="single"), alignment=center)
    ws.row_dimensions[b].height = 26
    # この日全部×
    put(ws, f"A{b+1}", "この日全部 ▶", font=f(size=9, bold=True, color="B23A3A"), alignment=Alignment(horizontal="right", vertical="center"))
    ws.merge_cells(f"A{b+1}:B{b+1}")
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{b+1}", None, fill=ALLX, alignment=center, font=XF)
    dv_x.add(f"C{b+1}:L{b+1}")
    ws.row_dimensions[b + 1].height = 22
    # 見出し
    put(ws, f"A{b+2}", "この時間\n全部 ▼", font=f(size=9, bold=True, color="B23A3A"), fill=HEAD, border=box, alignment=center)
    put(ws, f"B{b+2}", "", fill=HEAD)
    ws.row_dimensions[b + 2].height = 28
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{b+2}", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, alignment=center)
    for t in range(1, T + 1):
        r = b + 2 + t
        put(ws, f"A{r}", None, fill=ALLX, alignment=center, font=XF)
        put(ws, f"B{r}", f"={q(SET)}$I${10+t}", font=f(bold=True), fill=HEAD, alignment=center)
        for d in range(1, D + 1):
            put(ws, f"{CL(2+d)}{r}", None, font=f(size=16, bold=True, color="B23A3A"), alignment=center)
        ws.row_dimensions[r].height = 21
    dv_x.add(f"A{b+3}:A{b+2+T}")
    grid_r.append(f"C{b+3}:L{b+2+T}"); day_r.append(f"C{b+1}:L{b+1}")
    time_r.append(f"A{b+3}:A{b+2+T}"); lab_r.append(f"B{b+3}:B{b+2+T}")
b1 = base(1)
tl = f"C{b1+3}"
jx = f"(COLUMN({tl})-3)*{T}+MOD(ROW({tl})-5,{BLK})-2"
hide_rules(ws, " ".join(grid_r), f"{EXIST(jx)}=0", [
    (f"INDEX({q(CA)}${JA}$4:${JZ}$4,{jx})=0", GRAY, None),
    (f'OR({tl}<>"",$A{b1+3}<>"",INDEX($A$1:$L$1300,ROW({tl})-MOD(ROW({tl})-5,{BLK})+1,COLUMN({tl}))<>"")', fill("F6DEDB"), None),
])
hide_rules(ws, " ".join(day_r), f'INDEX({q(SET)}$B$11:$B$20,COLUMN(C{b1+1})-2)=""', [])
hide_rules(ws, " ".join(time_r), f'$B{b1+3}=""', [])
hide_rules(ws, " ".join(lab_r), f'B{b1+3}=""', [], frame=False)
ws.freeze_panes = "A5"


# ---------------------------------------------------------------- 調整・決定・自動案 共通の表
def grid_frame(ws, title, note):
    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 9
    for d in range(D):
        ws.column_dimensions[CL(3 + d)].width = 15
    put(ws, "B1", title, font=f(size=16, bold=True))
    put(ws, "B2", note, font=f(size=10, color="444444"))
    put(ws, "B5", "", fill=HEAD)
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}5", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, alignment=center)
    for t in range(1, T + 1):
        put(ws, f"B{5+t}", f"={q(SET)}$I${10+t}", font=f(bold=True), fill=HEAD, alignment=center)
        ws.row_dimensions[5 + t].height = 26
    hide_rules(ws, f"B6:B{GL}", 'B6=""', [], frame=False)
    return "(COLUMN(C6)-3)*%d+ROW(C6)-5" % T


# ---------------------------------------------------------------- 調整・決定
ws = sheet(ASG)
jexpr = grid_frame(ws, "調整・決定", "自動案を貼り付けたあと、プルダウンで手直しして日程を決めます。右の「児童を選ぶ」で選んだ児童の入れられる枠に色がつきます。")
dv_name = DataValidation(type="list", formula1=f"={q(ROS)}$I$5:$I$49", allow_blank=True)
dv_name.error = "名簿にある児童を選んでください。"
dv_name.showErrorMessage = True
ws.add_data_validation(dv_name)
for t in range(1, T + 1):
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{5+t}", None, alignment=center)
dv_name.add(f"C6:L{GL}")
ws.column_dimensions["M"].width = 3
ws.column_dimensions["N"].width = 16
ws.column_dimensions["O"].width = 40
put(ws, "N4", "児童を選ぶ ▼", font=f(bold=True))
arr(ws, "C4", f'=IF(SUMPRODUCT(_xlfn.ISFORMULA(C6:L{GL})*1)>0,"⚠ ふつうの貼り付けになっています。すぐ Ctrl + Z で元に戻して、［値の貼り付け］（右クリック →「値」）をしてください。","")',
    font=f(size=11, bold=True, color="B23A3A"), alignment=Alignment(vertical="center"))
ws.merge_cells("C4:L4")
ws.row_dimensions[4].height = 22
paste_box(ws, 14, 18, 2)
put(ws, "N5", None, fill=INPUT, border=box, font=f(size=12, bold=True))
ws.merge_cells("N5:O5")
dv_name.add("N5")
info = [
    (7, "状況", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$J$5:$J$49,{q(CA)}$B$8))'),
    (8, "×の数", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$K$5:$K$49,{q(CA)}$B$8))'),
    (9, "今の枠", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$N$5:$N$49,{q(CA)}$B$8)&" "&INDEX({q(ROS)}$O$5:$O$49,{q(CA)}$B$8))'),
    (10, "兄弟", f'=IF({q(CA)}$B$8=0,"",IF(INDEX({q(ROS)}$C$5:$C$49,{q(CA)}$B$8)="","",INDEX({q(ROS)}$D$5:$D$49,{q(CA)}$B$8)&"　"&INDEX({q(ROS)}$E$5:$E$49,{q(CA)}$B$8)&" "&INDEX({q(ROS)}$F$5:$F$49,{q(CA)}$B$8)))'),
]
for r, lab, fo in info:
    put(ws, f"N{r}", lab, font=f(color="666666"))
    put(ws, f"O{r}", fo, font=f(bold=True), alignment=Alignment(horizontal="left"))
put(ws, "N11", "入れられる空き枠", font=f(color="666666"))
arr(ws, "O11", f'=IFERROR(IF({q(CA)}$B$8=0,"",_xlfn.TEXTJOIN("、",TRUE,IF((INDEX({q(CA)}${JA}$60:${JZ}$104,{q(CA)}$B$8,0)=1)*({q(CA)}${JA}$7:${JZ}$7=0),{q(CA)}${JA}$8:${JZ}$8,""))),"")',
    alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells("O11:O16")
legend = [("C3", "C5D7F4", "選んだ児童"), ("D3", "D6F0DF", "入れられる"), ("E3", "FBEFC9", "入れられる（他の人あり）"),
          ("F3", "F6DEDB", "×の枠"), ("G3", "B23A3A", "×・使えない枠に入れた！"), ("H3", "F2B36B", "2か所に入っている"),
          ("I3", "C9B3E6", "空けるはずの枠に人がいる"), ("K3", "D9D9D9", "先生の都合で使えない")]
for ref, col, lab in legend:
    put(ws, ref, lab, fill=fill(col), font=f(size=9, color="FFFFFF" if col == "B23A3A" else "000000", bold=True), alignment=center, border=box)
put(ws, "J3", "後ろを空ける枠", fill=PatternFill("lightUp", fgColor="5B8BD0"), font=f(size=9, bold=True), alignment=center, border=box)
ws.row_dimensions[3].height = 28
# 色分け：各マスの「色の番号」を見えない列（AA〜AJ）にふつうの式で出し、条件付き書式はその番号だけを見る
sel = f"{q(CA)}$B$8"
HC = lambda d: CL(26 + d)       # 色の番号を置く列（C→AA、D→AB …）
for t in range(1, T + 1):
    for d in range(1, D + 1):
        j = sj(d, t); c = jc(j); x = f"{CL(2+d)}{5+t}"
        A_ = lambda row: f"{q(CA)}{c}${row}"
        ngown = f'IF({x}="",0,IFERROR(INDEX({q(CA)}{c}$10:{c}$54,MATCH({x},{q(CA)}$B$10:$B$54,0)),0))'
        ngsel = f"IF({sel}>0,INDEX({q(CA)}{c}$10:{c}$54,{sel}),0)"
        oksel = f"IF({sel}>0,INDEX({q(CA)}{c}$60:{c}$104,{sel}),0)"
        ws[f"{HC(d)}{5+t}"] = (
            f'=IF(AND({x}="",{A_(ROW_EXIST)}=0),0,IF(AND({x}<>"",{A_(4)}=0),1,IF({ngown}=1,2,'
            f'IF(AND({x}<>"",COUNTIF($C$6:$L${GL},{x})>1),3,IF({A_(4)}=0,4,'
            f'IF(AND({x}<>"",{A_(ROW_GAPBLK)}=1),5,IF(AND({x}="",{A_(ROW_GAPBLK)}=1),6,'
            f'IF(AND({x}<>"",{x}=$N$5),7,IF({ngsel}=1,8,IF(AND({x}="",{oksel}=1),9,'
            f'IF(AND({x}<>"",{oksel}=1),10,IF(AND({x}="",{A_(5)}=1),11,12))))))))))))')
RED_F = Font(name=FONT, color="FFFFFF", bold=True)
hide_rules(ws, f"C6:L{GL}", "AA6=0", [
    ("AA6=1", fill("B23A3A"), RED_F),
    ("AA6=2", fill("B23A3A"), RED_F),
    ("AA6=3", fill("F2B36B"), None),
    ("AA6=4", GRAY, None),
    ("AA6=5", fill("C9B3E6"), None),
    ("AA6=6", PatternFill("lightUp", fgColor="5B8BD0"), None),
    ("AA6=7", fill("C5D7F4"), Font(name=FONT, bold=True, color="1F3F7A")),
    ("AA6=8", fill("F6DEDB"), None),
    ("AA6=9", fill("D6F0DF"), None),
    ("AA6=10", fill("FBEFC9"), None),
    ("AA6=11", PatternFill("lightUp", fgColor="BBBBBB"), None),
])

# 候補の表
CH = GL + 5                     # 候補の表の見出しの行
put(ws, f"B{CH-2}", "候補（その枠に入れられる、まだ決まっていない児童）", font=f(size=13, bold=True))
put(ws, f"B{CH-1}", "未入力・未提出の家庭は含みません。0人の枠は赤、1人の枠はオレンジです。", font=f(size=10, color="444444"))
put(ws, f"B{CH}", "", fill=HEAD)
for d in range(1, D + 1):
    put(ws, f"{CL(2+d)}{CH}", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, alignment=center)
for t in range(1, T + 1):
    r = CH + t
    put(ws, f"B{r}", f"={q(SET)}$I${10+t}", font=f(bold=True), fill=HEAD, alignment=center)
    ws.row_dimensions[r].height = 44
    for d in range(1, D + 1):
        j = sj(d, t); c = jc(j); g = f"{CL(2+d)}{5+t}"
        okc = f"{q(CA)}{c}$60:{c}$104"
        arr(ws, f"{CL(2+d)}{r}",
            f'=IF({q(CA)}{c}$4=0,"",IF({g}<>"","（決定）",IF({q(CA)}{c}${ROW_GAPBLK}=1,"（空ける）",SUMPRODUCT(({okc}=1)*({q(CA)}$C$10:$C$54=1))&"人："&_xlfn.TEXTJOIN("、",TRUE,IF(({okc}=1)*({q(CA)}$C$10:$C$54=1),{q(CA)}$B$10:$B$54,"")))))',
            font=f(size=9), alignment=Alignment(wrap_text=True, vertical="top"))
for t in range(1, T + 1):     # 候補の表の色の番号（0=ない枠 1=使えない 2=0人 3=1人 4=ふつう）
    for d in range(1, D + 1):
        c = jc(sj(d, t)); x = f"{CL(2+d)}{CH+t}"
        ws[f"{HC(d)}{CH+t}"] = (f'=IF({q(CA)}{c}${ROW_EXIST}=0,0,IF({q(CA)}{c}$4=0,1,'
                                f'IF(LEFT({x},2)="0人",2,IF(LEFT({x},2)="1人",3,4))))')
hide_rules(ws, f"C{CH+1}:L{CH+T}", f"AA{CH+1}=0", [
    (f"AA{CH+1}=1", GRAY, None),
    (f"AA{CH+1}=2", fill("F6DEDB"), red_txt),
    (f"AA{CH+1}=3", fill("FBE0C2"), None),
])
for d in range(1, D + 1):
    ws.column_dimensions[HC(d)].hidden = True
hide_rules(ws, f"B{CH+1}:B{CH+T}", f'B{CH+1}=""', [], frame=False)
ws.freeze_panes = "C6"

# ---------------------------------------------------------------- 自動案A・自動案B
def auto_sheet(name, title, note, eng, blk_row, slot_col, nofit_col, tname):
    ws = sheet(name)
    grid_frame(ws, title, note)
    for t in range(1, T + 1):
        for d in range(1, D + 1):
            j = sj(d, t); g = f"{q(ASG)}{CL(2+d)}{5+t}"
            put(ws, f"{CL(2+d)}{5+t}",
                f'=IF({q(CA)}{jc(j)}$4=0,"",IF({g}<>"",{g},IFERROR(INDEX({q(ROS)}$I$5:$I$49,INDEX({q(eng)}$B$3:$B$47,MATCH({j},{q(eng)}$C$3:$C$47,0))),"")))',
                alignment=center)
    hide_rules(ws, f"C6:L{GL}", f"{EXIST(jexpr)}=0", [
        (f"INDEX({q(CA)}${JA}$4:${JZ}$4,{jexpr})=0", GRAY, None),
        (f'AND(C6<>"",{q(ASG)}C6="")', fill("D6F0DF"), Font(name=FONT, bold=True)),
        (f'AND(C6="",INDEX({q(CA)}${JA}${blk_row}:${JZ}${blk_row},{jexpr})+INDEX({q(CA)}${JA}${ROW_GAPBLK}:${JZ}${ROW_GAPBLK},{jexpr})>0)', PatternFill("lightUp", fgColor="5B8BD0"), None),
        (f'AND(C6="",INDEX({q(CA)}${JA}$5:${JZ}$5,{jexpr})=1)', PatternFill("lightUp", fgColor="BBBBBB"), None),
    ])
    put(ws, "C3", "新しく入った人", fill=fill("D6F0DF"), font=f(size=9, bold=True), alignment=center, border=box)
    put(ws, "D3", "後ろを空ける枠", fill=PatternFill("lightUp", fgColor="5B8BD0"), font=f(size=9, bold=True), alignment=center, border=box)
    put(ws, "E3", "なるべく空ける日・休憩", fill=PatternFill("lightUp", fgColor="BBBBBB"), font=f(size=9, bold=True), alignment=center, border=box)
    put(ws, "F3", "先生の都合で使えない", fill=fill("D9D9D9"), font=f(size=9, bold=True), alignment=center, border=box)
    ws.row_dimensions[3].height = 24
    ws.column_dimensions["M"].width = 3
    ws.column_dimensions["N"].width = 22
    ws.column_dimensions["O"].width = 40
    put(ws, "N5", "決定済み（調整・決定シート）", font=f(color="666666"))
    put(ws, "O5", f'=SUMPRODUCT(({GRID}<>"")*1)&" 人"', font=f(bold=True))
    put(ws, "N6", "自動で新しく入った", font=f(color="666666"))
    put(ws, "O6", f'=SUMPRODUCT(({q(eng)}$B$3:$B$47>0)*({q(eng)}$C$3:$C$47>0))&" 人"', font=f(bold=True))
    put(ws, "N8", "入る枠がない（×・必ず空けたい）", font=f(color="B23A3A", bold=True))
    arr(ws, "O8", f'=_xlfn.TEXTJOIN("、",TRUE,IF({q(CA)}${nofit_col}$10:${nofit_col}$54=1,{q(CA)}$B$10:$B$54,""))', font=red_txt, alignment=Alignment(wrap_text=True, vertical="top"))
    put(ws, "N10", "未入力・未提出で外した", font=f(color="9A6A00", bold=True))
    arr(ws, "O10", f'=_xlfn.TEXTJOIN("、",TRUE,IF((({q(ROS)}$J$5:$J$49="未入力")+({q(ROS)}$J$5:$J$49="未提出"))*({q(CA)}$IO$10:$IO$54=0),{q(ROS)}$I$5:$I$49,""))', alignment=Alignment(wrap_text=True, vertical="top"))
    put(ws, "N12", "なるべく空けたい枠を使った", font=f(color="666666"))
    put(ws, "O12", f'=SUM({q(eng)}$D$3:$D$47)&" 枠"', font=f(bold=True))
    paste_box(ws, 14, 25, 2)
    put(ws, "N13", "日ごとの人数", font=f(color="666666"))
    for d in range(1, D + 1):    # 日ごとの人数（使っている日だけ）
        put(ws, f"N{13+d}", f'=IF({q(SET)}$E${10+d}="","",{q(SET)}$E${10+d})', font=f(size=10), alignment=Alignment(horizontal="right"))
        put(ws, f"O{13+d}", f'=IF(N{13+d}="","",COUNTIF({CL(2+d)}6:{CL(2+d)}{GL},"?*")&" 人")', font=f(size=10, bold=True))
    ws.merge_cells("O8:O9"); ws.merge_cells("O10:O11")
    ws.row_dimensions[8].height = 30; ws.row_dimensions[10].height = 30
    ws.freeze_panes = "C6"
    wb.defined_names[tname] = DefinedName(tname, attr_text=f"{q(name)}$C$6:$L${GL}")


from openpyxl.workbook.defined_name import DefinedName
auto_sheet(AUT, "自動案A（詰める）",
           "入れられる枠が少ない家庭から順に、設定の「詰め方」で詰めて組んだ案です。緑が新しく入った人。よければ表をコピーし（名前ボックスで「自動案Aの表」）、「調整・決定」の表の左上に［値の貼り付け］をします。",
           CB, ROW_AUTOBLK, "IK", "IL", "自動案Aの表")
auto_sheet(AUTB, "自動案B（散らす）",
           "日ごとの人数がそろい、面談と面談のあいだがなるべく空くように組んだ案です（希望がある家庭は希望を優先）。よければ表をコピーし（名前ボックスで「自動案Bの表」）、「調整・決定」の表の左上に［値の貼り付け］をします。",
           CC, ROW_AUTOBLK_B, "IR", "IS", "自動案Bの表")

# ---------------------------------------------------------------- 印刷（兄弟確認）：予定表の形で、決めた日程を印刷する
ws = sheet(SIB)
grid_frame(ws, "印刷（兄弟確認）", "「調整・決定」で決めた日程を、予定表と同じ形で印刷します。兄弟がいる子は色付きで、名前の下に兄弟のクラス（名簿の兄弟メモ）が出ます。")
put(ws, "B3", '="個人面談日程"&IF(O3="","","　"&O3)', font=f(size=14, bold=True, color=PRIMARY_D), alignment=Alignment(horizontal="left", vertical="center"))
ws.merge_cells("B3:L3")
ws.row_dimensions[3].height = 28
ws.column_dimensions["M"].width = 3
ws.column_dimensions["N"].width = 20
ws.column_dimensions["O"].width = 22
put(ws, "N3", "クラス・担任など ▶", font=f(size=10, bold=True, color=PRIMARY_D), alignment=Alignment(horizontal="right", vertical="center"))
put(ws, "O3", None, fill=INPUT, border=box)
for t in range(1, T + 1):
    for d in range(1, D + 1):
        x = f"{q(ASG)}{CL(2+d)}{5+t}"
        sib = f'IFERROR(INDEX({q(ROS)}$C$5:$C$49,MATCH({x},{q(ROS)}$I$5:$I$49,0))<>"",FALSE)'
        memo = f'INDEX({q(ROS)}$D$5:$D$49,MATCH({x},{q(ROS)}$I$5:$I$49,0))'
        put(ws, f"{CL(2+d)}{5+t}", f'=IF({x}="","",{x}&IF({sib},CHAR(10)&{memo},""))',
            alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
        # 見えない列（AA〜）：色の番号 0=ない枠 1=兄弟あり 2=ふつう
        ws[f"{CL(26+d)}{5+t}"] = f'=IF({q(CA)}{jc(sj(d, t))}${ROW_EXIST}=0,0,IF({sib},1,2))'
    ws.row_dimensions[5 + t].height = 34
hide_rules(ws, f"C6:L{GL}", "AA6=0", [("AA6=1", fill("E3D7F2"), Font(name=FONT, bold=True, color="3F2A66"))])
for d in range(1, D + 1):
    ws.column_dimensions[CL(26 + d)].hidden = True
# 印刷の範囲は、設定した日数・枠の数に合わせて変わる（下の「見た目の仕上げ」で名前を付ける）
ws.page_setup.orientation = "landscape"
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 1
ws.freeze_panes = "C6"

# ---------------------------------------------------------------- 計算A（×・入れられる枠・児童ごとの集計）
ws = sheet(CA)
put(ws, "A1", "計算用（さわらないでください）", font=f(bold=True, color="B23A3A"))
labels = {1: "枠番号", 2: "日", 3: "時", 4: "使える", 5: "空けたい", 6: "優先順", 7: "決定済み", 8: "表示"}
for r, lab in labels.items():
    put(ws, f"C{r}", lab)
put(ws, "A2", "時間帯の枠数"); put(ws, "B3", "←時間帯1"); put(ws, "B4", "←時間帯2")
ok3 = "AND(ISNUMBER('設定'!$B$3),ISNUMBER('設定'!$D$3),ISNUMBER('設定'!$B$5))"
put(ws, "A3", f"=IF({ok3},IF(AND('設定'!$B$5>0,'設定'!$D$3>='設定'!$B$3),ROUND(('設定'!$D$3-'設定'!$B$3)*1440/'設定'!$B$5,0)+1,0),0)")
put(ws, "A4", "=IF(AND(A3>0,ISNUMBER('設定'!$B$4),ISNUMBER('設定'!$D$4)),IF(AND('設定'!$D$4>='設定'!$B$4,'設定'!$B$4>'設定'!$D$3),ROUND(('設定'!$D$4-'設定'!$B$4)*1440/'設定'!$B$5,0)+1,0),0)")
put(ws, "A8", "選択中→"); put(ws, "B8", f'=IF({q(ASG)}$N$5="",0,IFERROR(MATCH({q(ASG)}$N$5,$B$10:$B$54,0),0))')
for j in range(1, N + 1):
    c = jc(j); d = (j - 1) // T + 1; t = (j - 1) % T + 1
    ws[f"{c}1"] = j; ws[f"{c}2"] = d; ws[f"{c}3"] = t
    ws[f"{c}{ROW_EXIST}"] = f'=IF(AND(INDEX({q(SET)}$B$11:$B$20,{c}2)<>"",{c}3<={q(SET)}$B$6),1,0)'
    ws[f"{c}4"] = (f'=IF(AND({c}{ROW_EXIST}=1,'
                   f'INDEX({TDAY},{c}2)="",INDEX({TTIME},{c}3)="",INDEX({TBLK},{c}3,{c}2)=""),1,0)')
    ws[f"{c}5"] = f'=IF(OR(INDEX({q(SET)}$D$11:$D$20,{c}2)<>"",INDEX({q(SET)}$H$11:$H${TL},{c}3)<>""),1,0)'
    ws[f"{c}6"] = f'=IF(LEFT({q(SET)}$B$8,3)="日付順",({c}2-1)*{T}+{c}3,({c}3-1)*{D}+{c}2)+{c}5*10000'
    ws[f"{c}7"] = f"=MAX({c}{ROW_OCC},{c}{ROW_GAPBLK})"
    ws[f"{c}{ROW_OCC}"] = f'=IF(INDEX({GRID},{c}3,{c}2)<>"",1,0)'
    if t > 1:   # 前の枠の人が「後ろを空ける」なら、この枠は空ける（昼休みをはさむときは空けない）
        prev = f"INDEX({GRID},{c}3-1,{c}2)"
        ws[f"{c}{ROW_GAPBLK}"] = f'=IF(OR({jc(j-1)}{ROW_NEXT}=0,{prev}=""),0,IF(IFERROR(INDEX({q(ROS)}$H$5:$H$49,MATCH({prev},{q(ROS)}$I$5:$I$49,0)),"")<>"",1,0))'
    else:
        ws[f"{c}{ROW_GAPBLK}"] = 0
    ws[f"{c}{ROW_NEXT}"] = (f"=IF(AND({jc(j+1)}4=1,OR({c}3<>$A$3,$A$4=0)),1,0)" if t < T else 0)
    ws[f"{c}{ROW_AUTOBLK}"] = f"=IF(COUNTIF({q(CB)}$G$3:$G$47,{j})>0,1,0)"
    ws[f"{c}{ROW_NB}"] = (f"=IF(AND({c}{ROW_EXIST}=1,{jc(j+1)}{ROW_EXIST}=1,OR({c}3<>$A$3,$A$4=0)),1,0)" if t < T else 0)
    ws[f"{c}{ROW_AUTOBLK_B}"] = f"=IF(COUNTIF({q(CC)}$G$3:$G$47,{j})>0,1,0)"
    ws[f"{c}{ROW_PRIO}"] = f"={c}6"
    ws[f"{c}{ROW_PRIO+1}"] = f"=({c}3-1)*{D}+{c}2+{c}5*10000"
    ws[f"{c}{ROW_PRIO+2}"] = f"=({T}-{c}3)*{D}+{c}2+{c}5*10000"
    ws[f"{c}{ROW_PRIO+3}"] = f"=({c}2-1)*{T}+{c}3+{c}5*10000"
    ws[f"{c}{ROW_PRIO+4}"] = f"=({D}-{c}2)*{T}+{c}3+{c}5*10000"
    ws[f"{c}8"] = f'=IF({c}4=1,INDEX({q(SET)}$E$11:$E$20,{c}2)&" "&INDEX({q(SET)}$I$11:$I${TL},{c}3),"")'
for r_, lab in {ROW_NEXT: "次の枠あり", ROW_AUTOBLK: "自動で空ける", ROW_GAPBLK: "後ろを空ける枠", ROW_OCC: "人がいる",
                ROW_PRIO: "優先：全体", ROW_PRIO+1: "早い時刻", ROW_PRIO+2: "遅い時刻", ROW_PRIO+3: "早い日", ROW_PRIO+4: "遅い日", ROW_EXIST: "設定にある枠", ROW_AUTOBLK_B: "自動Bで空ける", ROW_NB: "時間として次の枠"}.items():
    ws[f"C{r_}"] = lab
for k, lab in {"A9": "i", "B9": "表示名", "C9": "自動の対象", "IK9": "自動案Aの枠", "IL9": "Aで入らない", "IR9": "自動案Bの枠", "IS9": "Bで入らない", "IT9": "兄弟の枠", "IU9": "兄弟の日", "IV9": "兄弟の前後OK", "IW9": "兄弟あり", "IM9": "空き枠数", "IN9": "×の数", "IO9": "決定した枠", "IP9": "希望", "IQ9": "後ろ空け"}.items():
    ws[k] = lab
for i in range(1, NS + 1):
    r = 9 + i; ro = 4 + i; o = 59 + i
    ws[f"A{r}"] = i
    ws[f"B{r}"] = f"={q(ROS)}I{ro}"
    ws[f"C{r}"] = f'=IF(AND(B{r}<>"",OR({q(ROS)}J{ro}="入力済み",{q(ROS)}J{ro}="×なし"),IO{r}=0,COUNTIF({GRID},B{r})=0),1,0)'
    ws[f"A{o}"] = i
    for j in range(1, N + 1):
        c = jc(j)
        ws[f"{c}{r}"] = (f'=IF({c}$4=1,IF(OR(INDEX({INPR},{base(i)+2}+{c}$3,2+{c}$2)<>"",'
                         f'INDEX({INPR},{base(i)+1},2+{c}$2)<>"",INDEX({INPR},{base(i)+2}+{c}$3,1)<>""),1,0),0)')
        ws[f"{c}{o}"] = f"=IF(AND({c}$4=1,{c}{r}=0),1,0)"
    ws[f"IK{r}"] = f"=IFERROR(INDEX({q(CB)}$C$3:$C$47,MATCH(A{r},{q(CB)}$B$3:$B$47,0)),0)"
    ws[f"IL{r}"] = f"=IF(AND(C{r}=1,IK{r}=0),1,0)"
    ws[f"IR{r}"] = f"=IFERROR(INDEX({q(CC)}$C$3:$C$47,MATCH(A{r},{q(CC)}$B$3:$B$47,0)),0)"
    ws[f"IS{r}"] = f"=IF(AND(C{r}=1,IR{r}=0),1,0)"
    ws[f"IM{r}"] = f"=SUMPRODUCT({JA}{o}:{JZ}{o}*(1-${JA}$7:${JZ}$7))"
    ws[f"IN{r}"] = f"=SUM({JA}{r}:{JZ}{r})"
    ws[f"IP{r}"] = f'=IFERROR(MATCH({q(ROS)}G{ro},{{"' + '","'.join(HOPES) + f'"}},0),0)'
    ws[f"IQ{r}"] = f'=IF({q(ROS)}H{ro}="必ず空けたい",2,IF({q(ROS)}H{ro}="出来れば空けたい",1,0))'
    # 兄弟の面談の枠（0=なし、-1=表にない日時）とその日、決めた枠が兄弟の前後かどうか
    ws[f"IT{r}"] = (f'=IF(OR({q(ROS)}E{ro}="",{q(ROS)}F{ro}=""),0,IFERROR((MATCH({q(ROS)}E{ro},{q(SET)}$E$11:$E$20,0)-1)*{T}'
                    f'+MATCH({q(ROS)}F{ro},{q(SET)}$I$11:$I${TL},0),-1))')
    ws[f"IU{r}"] = f"=IF(IT{r}>0,INDEX(${JA}$2:${JZ}$2,IT{r}),0)"
    ws[f"IW{r}"] = f'=IF(AND({q(ROS)}C{ro}<>"",IT{r}<=0),1,0)'     # 兄弟あり（兄弟の時間はまだ）
    ws[f"IV{r}"] = (f"=IF(OR(IT{r}<=0,IO{r}=0),1,IF(AND(INDEX(${JA}$2:${JZ}$2,IO{r})=IU{r},OR(AND(IO{r}=IT{r}+1,OR(INDEX(${JA}$3:${JZ}$3,IT{r})<>$A$3,$A$4=0)),"
                    f"AND(IO{r}=IT{r}-1,OR(INDEX(${JA}$3:${JZ}$3,IO{r})<>$A$3,$A$4=0)))),1,0))")
    ws[f"IO{r}"] = f'=IF(B{r}="",0,IF(COUNTIF({GRID},B{r})=1,SUMPRODUCT(({GRID}=B{r})*((COLUMN({GRID})-3)*{T}+ROW({GRID})-5)),0))'
ws[f"A59"] = "入れられる枠（使える かつ ×なし）"

# ---------------------------------------------------------------- 計算B・計算C（自動案：入れられる枠が少ない児童から順に1人ずつ決める）
# A順番 B決めた児童 C入れた枠 D空けたい枠を使った E後ろ空け(2必ず/1出来れば) F希望 G後ろを空けた枠
# spread=True（計算C・自動案B）：希望のない家庭は、日ごとの人数が少ない日・前後が空いている枠を選ぶ
BIG = 1000000
PR0 = 12
SC0 = PR0 + NS + 1
FR0 = SC0 + NS + 1
NX0 = FR0 + N + 1
SS0 = NX0 + N + 1
LD0 = SS0 + N + 1
pr = lambda i: CL(PR0 + i - 1)
sc = lambda i: CL(SC0 + i - 1)
fr = lambda j: CL(FR0 + j - 1)
nx = lambda j: CL(NX0 + j - 1)
ss = lambda j: CL(SS0 + j - 1)
ld = lambda d: CL(LD0 + d - 1)
CAr = lambda row: f"{q(CA)}${JA}${row}:${JZ}${row}"


def engine(name, spread):
    ws = sheet(name)
    put(ws, "A1", "計算用（さわらないでください）", font=f(bold=True, color="B23A3A"))
    for k, lab in {"A2": "k", "B2": "児童", "C2": "枠", "D2": "空けたい枠", "E2": "後ろ空け", "F2": "希望", "G2": "空けた枠",
                   "H2": "兄弟あり", "I2": "兄弟の枠", "J2": "兄弟の日", "K2": "兄弟の時"}.items():
        ws[k] = lab
    for i in range(1, NS + 1):
        ws[f"{pr(i)}2"] = i; ws[f"{sc(i)}2"] = i
    for j in range(1, N + 1):
        ws[f"{fr(j)}2"] = j; ws[f"{nx(j)}2"] = j; ws[f"{ss(j)}2"] = j
    ws[f"{pr(1)}1"] = "済"; ws[f"{sc(1)}1"] = "点数（入れられる枠の数）"; ws[f"{fr(1)}1"] = "空き"
    ws[f"{nx(1)}1"] = "次の枠が空いている"; ws[f"{ss(1)}1"] = "枠の点数"
    if spread:
        ws[f"{ld(1)}1"] = "日ごとの人数"
        for d in range(1, D + 1):
            ws[f"{ld(d)}2"] = d
    for k in range(1, NS + 1):
        r = 2 + k
        ws[f"A{r}"] = k
        for i in range(1, NS + 1):
            ws[f"{pr(i)}{r}"] = (f"=1-{q(CA)}C{9+i}" if k == 1 else f"=MAX({pr(i)}{r-1},IF($B{r-1}={i},1,0))")
            ok = CAr(59 + i)
            # 兄弟の時間が入っている子を先に、そのあとは入れられる枠が少ない子から
            ws[f"{sc(i)}{r}"] = (f"=IF({pr(i)}{r}=1,{BIG},IF({q(CA)}$IT${9+i}>0,0,500000)+IF({q(CA)}$IQ${9+i}=2,"
                                 f"SUMPRODUCT({ok},${fr(1)}{r}:${fr(N)}{r},${nx(1)}{r}:${nx(N)}{r}),"
                                 f"SUMPRODUCT({ok},${fr(1)}{r}:${fr(N)}{r}))*1000+{i})")
        ws[f"B{r}"] = f"=IF(MIN({sc(1)}{r}:{sc(NS)}{r})>={BIG},0,MATCH(MIN({sc(1)}{r}:{sc(NS)}{r}),{sc(1)}{r}:{sc(NS)}{r},0))"
        ws[f"E{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IQ$10:$IQ$54,B{r}))"
        ws[f"F{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IP$10:$IP$54,B{r}))"
        ws[f"H{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IW$10:$IW$54,B{r}))"
        ws[f"I{r}"] = f"=IF(B{r}=0,0,MAX(0,INDEX({q(CA)}$IT$10:$IT$54,B{r})))"
        ws[f"J{r}"] = f"=IF(I{r}=0,0,INDEX({CAr(2)},I{r}))"
        ws[f"K{r}"] = f"=IF(I{r}=0,0,INDEX({CAr(3)},I{r}))"
        if spread:
            for d in range(1, D + 1):
                ws[f"{ld(d)}{r}"] = (f"=SUMPRODUCT(({CAr(2)}={d})*{CAr(ROW_OCC)})" if k == 1 else
                                     f"={ld(d)}{r-1}+IF($C{r-1}>0,IF(INDEX({CAr(2)},$C{r-1})={d},1,0),0)")
        for j in range(1, N + 1):
            d, t = (j - 1) // T + 1, (j - 1) % T + 1
            ws[f"{fr(j)}{r}"] = (f"=1-{q(CA)}{jc(j)}$7" if k == 1 else f"={fr(j)}{r-1}*IF(OR($C{r-1}={j},$G{r-1}={j}),0,1)")
            ws[f"{nx(j)}{r}"] = (f"=IF({q(CA)}{jc(j)}${ROW_NEXT}=1,{fr(j+1)}{r},1)" if j < N else 1)
            hope = f"INDEX({q(CA)}{jc(j)}${ROW_PRIO}:{jc(j)}${ROW_PRIO+4},$F{r}+1)+IF(AND($E{r}=1,{nx(j)}{r}=0),1000,0)"
            if spread:
                adj = []
                if t > 1:
                    adj.append(f"IF({q(CA)}{jc(j-1)}${ROW_NEXT}=1,1-{fr(j-1)}{r},0)")
                if t < T:
                    adj.append(f"IF({q(CA)}{jc(j)}${ROW_NEXT}=1,1-{fr(j+1)}{r},0)")
                score = (f"IF($F{r}>0,{hope},MIN({ld(d)}{r},20)*400+({'+'.join(adj)})*150+{t*10+d}"
                         f"+{q(CA)}{jc(j)}$5*100000+IF(AND($E{r}=1,{nx(j)}{r}=0),50000,0))")
            else:
                score = hope
            # 兄弟あり：×のすぐ前・すぐ後をなるべく避ける（兄弟も同じ時間に×をつけていることが多いため）
            nbx = []
            if t > 1:
                nbx.append(f"IF({q(CA)}{jc(j-1)}${ROW_NB}=1,INDEX({q(CA)}{jc(j-1)}$10:{jc(j-1)}$54,$B{r}),0)")
            if t < T:
                nbx.append(f"IF({q(CA)}{jc(j)}${ROW_NB}=1,INDEX({q(CA)}{jc(j+1)}$10:{jc(j+1)}$54,$B{r}),0)")
            score = f"{score}+IF($H{r}=1,({'+'.join(nbx)})*{4000 if spread else 500},0)"
            # 兄弟の時間が入っている子：兄弟のすぐ前・すぐ後 → 同じ日の近い時間 → ほかの日（兄弟と同じ時刻はいちばん後）
            near = (f"OR(AND({j}=$I{r}+1,OR($K{r}<>{q(CA)}$A$3,{q(CA)}$A$4=0)),"
                    f"AND({j}=$I{r}-1,OR({t}<>{q(CA)}$A$3,{q(CA)}$A$4=0)))")
            sib = (f"IF({d}=$J{r},IF({near},0,IF({t}=$K{r},200000,ABS({t}-$K{r})*100)),100000+ABS({d}-$J{r})*1000+{t*10})"
                   f"+{q(CA)}{jc(j)}$5*50+IF(AND($E{r}=1,{nx(j)}{r}=0),25,0)")
            score = f"IF($I{r}>0,{sib},{score})"
            ws[f"{ss(j)}{r}"] = (f"=IF($B{r}=0,{BIG},IF(INDEX({q(CA)}${JA}$60:${JZ}$104,$B{r},{j})*{fr(j)}{r}=1,"
                                 f"IF(AND($E{r}=2,{nx(j)}{r}=0),{BIG},{score}),{BIG}))")
        ws[f"C{r}"] = f"=IF(MIN({ss(1)}{r}:{ss(N)}{r})>={BIG},0,MATCH(MIN({ss(1)}{r}:{ss(N)}{r}),{ss(1)}{r}:{ss(N)}{r},0))"
        ws[f"D{r}"] = f"=IF(C{r}>0,INDEX({CAr(5)},C{r}),0)"
        ws[f"G{r}"] = f"=IF(AND(C{r}>0,E{r}>0),IF(AND(INDEX({CAr(ROW_NEXT)},C{r})=1,INDEX(${nx(1)}{r}:${nx(N)}{r},C{r})=1),C{r}+1,0),0)"


engine(CB, False)
engine(CC, True)

# ---------------------------------------------------------------- 見た目の仕上げ（タイトル帯・メニュー・見出しの色）

MENU = [(HOME, "ホーム"), (SET, "① 設定"), (ROS, "② 名簿"), (INP, "③ ×入力"), (AUT, "④ 自動案A"), (AUTB, "④ 自動案B"), (ASG, "⑤ 調整・決定"), (SIB, "⑥ 印刷")]
# シートごと：(タイトルのセル, 帯の右はしの列, メニューボタンの場所)
GRID_MENU = ["F1", "G1", "H1", "I1", "J1", "K1", "L1", "N1"]
LAYOUT = {
    HOME: ("A1", 13, None),
    SET: ("A1", 22, ["D1", "E1", "F1:G1", "H1", "I1", "K1:L1", "M1", "N1"]),
    ROS: ("A1", 19, ["E1", "F1:G1", "H1", "I1", "J1:K1", "L1:M1", "N1:O1", "P1"]),
    INP: ("B1", 14, GRID_MENU),
    SIB: ("B1", 15, GRID_MENU),
    AUT: ("B1", 15, GRID_MENU),
    AUTB: ("B1", 15, GRID_MENU),
    ASG: ("B1", 15, GRID_MENU),
}
TAB = {HOME: PRIMARY_D, SET: "7A8699", ROS: PRIMARY, INP: "B23A3A", AUT: ACCENT, AUTB: "5B8BD0", ASG: "C77D1A", SIB: "7A5BA8"}
date_ref = f"={q(SET)}$E$"
for name, (tref, last, menu) in LAYOUT.items():
    ws = wb[name]
    ws.sheet_properties.tabColor = TAB[name]
    ws.sheet_view.showRowColHeaders = False
    ws.row_dimensions[1].height = 44
    ws.row_dimensions[2].height = 24
    for c in range(1, last + 1):
        ws.cell(1, c).fill = fill(PRIMARY_D)
        ws.cell(2, c).fill = fill(LIGHT)
    t = ws[tref]
    t.font = f(size=18, bold=True, color="FFFFFF")
    t.alignment = Alignment(vertical="center", indent=1 if tref == "A1" else 0)
    for c in range(1, last + 1):
        cell = ws.cell(2, c)
        if cell.value:
            cell.font = f(size=10, color=PRIMARY_D)
            cell.alignment = Alignment(vertical="center", indent=1 if c == 1 else 0)
    if menu:
        for (sh, lab), ref in zip(MENU, menu):
            first = ref.split(":")[0]
            cur = (sh == name)
            put(ws, first, f'=HYPERLINK("#\'{sh}\'!A1","{lab}")',
                font=f(size=11, bold=True, color=PRIMARY_D if cur else "FFFFFF"),
                fill=fill("FFE9A8") if cur else fill(ACCENT), alignment=center,
                border=Border(left=Side(style="medium", color=PRIMARY_D), right=Side(style="medium", color=PRIMARY_D),
                              top=Side(style="medium", color=PRIMARY_D), bottom=Side(style="medium", color=PRIMARY_D)))
            if ":" in ref:
                ws.merge_cells(ref)
    # 見出しの色：日付の見出しと名簿・設定の列見出しをこい青に
    for row in ws.iter_rows(min_row=3):
        for cell in row:
            v = cell.value
            if isinstance(v, str) and v.startswith(date_ref):
                cell.fill = HEAD_D; cell.font = f(bold=True, color="FFFFFF")
for c in range(1, 20):
    cell = wb[ROS].cell(4, c)
    if cell.value:
        cell.fill = fill("B7791F") if c <= 8 else HEAD_D    # 入力する列は茶色、計算の列は青
        cell.font = f(bold=True, color="FFFFFF", size=10)
for ref in ["B10", "C10", "D10", "E10", "G10", "H10", "I10"]:
    wb[SET][ref].fill = HEAD_D; wb[SET][ref].font = f(bold=True, color="FFFFFF")
for ref in ["A3", "A4", "A5", "A6", "A8"]:
    wb[SET][ref].font = f(bold=True, color=PRIMARY_D)
# ×入力：1人分の見出し行をカード風に
for i in range(1, NS + 1):
    b = base(i)
    for c in range(2, 13):
        cell = wb[INP].cell(b, c)
        if cell.coordinate not in (f"F{b}", f"G{b}"):
            cell.fill = fill(LIGHT)
    wb[INP][f"B{b}"].font = f(size=14, bold=True, color=PRIMARY_D)
# 使わない日の見出しは灰色に
hdr = [(INP, " ".join(f"C{base(i)+2}:L{base(i)+2}" for i in range(1, NS + 1)), f"C{base(1)+2}"), (SET, "M10:V10", "M10"),
       (ASG, "C5:L5", "C5"), (ASG, f"C{CH}:L{CH}", f"C{CH}"), (AUT, "C5:L5", "C5"), (AUTB, "C5:L5", "C5"), (SIB, "C5:L5", "C5")]
for sh, rng, tl in hdr:
    wb[sh].conditional_formatting.add(rng, FormulaRule(formula=[f'{tl}=""'], fill=WHITE))
for i in range(1, NS + 1):
    wb[ROS].row_dimensions[4 + i].height = 19
# シートの順番：ホーム・設定・名簿・×入力・自動案・調整・決定・計算
order = [HOME, SET, ROS, INP, AUT, AUTB, ASG, SIB, CA, CB, CC]
wb._sheets = [wb[n] for n in order]
sib_idx = order.index(SIB)
wb[SIB].defined_names["_xlnm.Print_Area"] = DefinedName("_xlnm.Print_Area", localSheetId=sib_idx,
    attr_text=f"OFFSET({q(SIB)}$B$3,0,0,3+{q(SET)}$B$6,1+COUNT({q(SET)}$B$11:$B$20))")
wb.defined_names["決定の表"] = DefinedName("決定の表", attr_text=f"{q(ASG)}$C$6:$L${GL}")

wb[CA].sheet_state = "hidden"
wb[CB].sheet_state = "hidden"
wb[CC].sheet_state = "hidden"
wb.active = 0
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print("saved", OUT)
