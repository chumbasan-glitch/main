"""面談日程ツール（Excel版・マクロなし）を作るスクリプト。

  python3 build.py [出力ファイル]

日数は最大10日、1日の枠は最大12枠、児童は最大45人。
"""
import sys
import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.utils import get_column_letter as CL

D, T, NS = 10, 12, 45          # 日数・1日の枠数・児童数の上限
N = D * T                      # 枠の総数
BLK = 15                       # ×入力シートの1人分の行数
FONT = "BIZ UDPゴシック"
OUT = sys.argv[1] if len(sys.argv) > 1 else "面談日程ツール.xlsx"

SET, ROS, INP, ASG, AUT, CA, CB = "設定", "名簿", "×入力", "割り当て", "自動案", "計算A", "計算B"
q = lambda s: "'" + s + "'!"   # シート参照
GRID = q(ASG) + "$C$6:$L$17"   # 割り当ての表


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
ROW_AUTOBLK = 107              # 自動案で「後ろを空ける」枠になった
ROW_GAPBLK = 108               # 割り当て済みの人の「後ろを空ける」枠
ROW_OCC = 109                  # 割り当ての表に人が入っている
ROW_PRIO = 110                 # 110:全体の詰め方 111〜114:希望ごとの優先順

f = lambda **k: Font(name=FONT, **k)
fill = lambda c: PatternFill("solid", start_color=c, end_color=c)
thin = Side(style="thin", color="888888")
box = Border(left=thin, right=thin, top=thin, bottom=thin)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
INPUT = fill("FFF8D6")         # 入力するセル
HEAD = fill("E3EAE6")
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


# ---------------------------------------------------------------- 使い方
ws = sheet("使い方", first=True)
ws.column_dimensions["A"].width = 3
ws.column_dimensions["B"].width = 110
lines = [
    ("面談日程ツール（Excel版）", f(size=18, bold=True)),
    ("マクロは使っていません。ふつうのExcelファイルとして開けます。黄色のセルが入力する場所です。", f(size=11)),
    ("", None),
    ("1. 「設定」シート", f(bold=True, size=12)),
    ("・面談の日付（上から順に、最大10日）、最初の枠・最後の枠の時刻、1枠の長さを入れます（1日最大12枠）。", None),
    ("・空けたい日や休憩の時刻には「〇」を選びます。自動案では、ほかに入る枠がないときだけ使われます。", None),
    ("2. 「名簿」シート", f(bold=True, size=12)),
    ("・Excelの名簿から「出席番号」と「名前」をコピーして、A列・B列（5行目から）に貼り付けます（最大45人）。", None),
    ("・他のクラスに兄弟がいる家庭は、C列で「〇」を選び、D列に兄弟のクラスなどをメモします。", None),
    ("・E列「希望」：早い時刻／遅い時刻／早い日／遅い日 から選べます。自動案で、×のない枠の中からできるだけ希望に合う枠を選びます（希望なので、合わないこともあります）。", None),
    ("・F列「後ろを空ける」：話が長引きそうな家庭は、同じ日のすぐ次の枠を空けます。「条件」は必ず空ける、「希望」はできれば空けます。日の最後の枠なら空ける必要はありません。", None),
    ("・名簿の行は並べ替えないでください（×入力の内容とずれてしまいます）。絞り込み（フィルター）は使えます。", None),
    ("3. 「×入力」シート", f(bold=True, size=12)),
    ("・1人ずつ、予定表と同じ形の表があります。名簿の「×入力へ」をクリックすると、その人の表に移動します。", None),
    ("・都合の悪い枠に「×」を入れます（何か文字が入っていれば×として扱います）。消すときは Delete キー。", None),
    ("・まとめて入れるとき：マウスでなぞって範囲を選び、「×」と打って Ctrl + Enter を押すと、選んだ枠が全部×になります。", None),
    ("・その日全部（縦の列）・その時間全部（横の列）も、同じようになぞって選んで Ctrl + Enter でできます。", None),
    ("・×が1つもない家庭は「提出状況」で「×なし（どこでもOK）」、提出していない家庭は「未提出」を選びます。", None),
    ("4. 「自動案」シート", f(bold=True, size=12)),
    ("・入れられる枠が少ない家庭から順に、自動で割り当てた案が表示されます（未入力・未提出の家庭は外れます）。", None),
    ("・案でよければ、表（C6:L17）をコピーして、「割り当て」シートの同じ場所に「値の貼り付け」をします。", None),
    ("・「割り当て」シートですでに決めた人はそのまま残り、残りの人だけで案が作られます。やり直したいときは割り当ての表を消します。", None),
    ("5. 「割り当て」シート", f(bold=True, size=12)),
    ("・各枠のセルで、プルダウンから児童を選びます。", None),
    ("・右の「児童を選ぶ」で児童を選ぶと、表の色が変わります：緑＝入れられる空き枠／黄＝入れられる（ほかの人がいる）／ピンク＝×の枠／青＝今いる枠。", None),
    ("・赤い枠は「×の枠に入れてしまった」、オレンジの枠は「同じ人が2か所に入っている」です。", None),
    ("・青い斜線の枠は「前の人の後ろを空ける枠」です。紫の枠は、空けるはずの枠に人が入っています。", None),
    ("・下の「候補」の表には、その枠に入れられる、まだ決まっていない児童が表示されます。「1人」の枠は先に決めると楽です。", None),
    ("6. 結果", f(bold=True, size=12)),
    ("・「名簿」シートの右側に、決まった日時・注意（×の枠／2か所／後ろが空いていない／未割り当て）・自動案が表示されます。", None),
    ("・CSVが必要なときは「名簿」シートを開いて［ファイル］→［名前を付けて保存］→ 種類を「CSV UTF-8」にします。", None),
    ("・兄弟ありの家庭だけ見たいときは、名簿の「兄弟」の列でフィルターをかけます。", None),
    ("", None),
    ("※ 「計算A」「計算B」は計算用の隠しシートです。さわらないでください。", f(color="9A6A00")),
]
for r, (t, fo) in enumerate(lines, start=1):
    put(ws, f"B{r}", t, font=fo or f(size=11), alignment=Alignment(wrap_text=True, vertical="top"))

# ---------------------------------------------------------------- 設定
ws = sheet(SET)
for col, w in zip("ABCDEFGHI", [16, 14, 7, 12, 18, 4, 10, 12, 10]):
    ws.column_dimensions[col].width = w
put(ws, "A1", "設定", font=f(size=16, bold=True))
items = [
    (3, "最初の枠", datetime.time(13, 30), "h:mm"),
    (4, "最後の枠", datetime.time(15, 30), "h:mm"),
    (5, "1枠の長さ（分）", 15, "0"),
]
for r, lab, v, nf in items:
    put(ws, f"A{r}", lab)
    put(ws, f"B{r}", v, fill=INPUT, border=box, number_format=nf, alignment=center)
put(ws, "A6", "1日の枠の数")
put(ws, "B6", f"=MIN({T},MAX(1,ROUND((B4-B3)*1440/B5,0)+1))", alignment=center)
put(ws, "C6", f"（最大{T}枠）", font=f(color="666666", size=9))
put(ws, "A8", "自動案の詰め方")
modes = ["早い時間から（各日の最後を空ける）", "日付順に詰める（後ろの日を空ける）"]
put(ws, "B8", modes[0], fill=INPUT, border=box)
ws.merge_cells("B8:E8")
dv = DataValidation(type="list", formula1='"' + ",".join(modes) + '"', allow_blank=False)
ws.add_data_validation(dv); dv.add("B8")

for ref, v in zip(["A10", "B10", "C10", "D10", "E10", "F10", "G10", "H10", "I10"],
                  ["", "日付", "曜日", "空ける日", "表示", "", "時刻", "休憩（空ける）", "表示"]):
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
    put(ws, f"G{r}", f'=IF(F{r}<=$B$6,$B$3+(F{r}-1)*$B$5/1440,"")', number_format="h:mm", border=box, alignment=center)
    put(ws, f"H{r}", None, fill=INPUT, border=box, alignment=center); dv_mark.add(f"H{r}")
    put(ws, f"I{r}", f'=IF(G{r}="","",TEXT(G{r},"h:mm")&"〜")', border=box, alignment=center)
put(ws, "A22", "※ 日付は上から詰めて入れてください。曜日・表示・時刻は自動で出ます。", font=f(color="666666", size=9))

# ---------------------------------------------------------------- 名簿
# A番号 B名前 C兄弟 D兄弟メモ E希望 F後ろを空ける（ここまで入力）
# G表示名 H状況 I×の数 J入れられる空き枠 K決める順 L日付 M時刻 N注意 O自動案 Pリンク
ws = sheet(ROS)
heads = ["番号", "名前", "兄弟", "兄弟メモ", "希望", "後ろを空ける", "表示名", "状況", "×の数", "入れられる空き枠", "決める順",
         "日付", "時刻", "注意", "自動案", ""]
widths = [6, 16, 6, 18, 10, 9, 18, 10, 7, 9, 7, 15, 8, 30, 22, 9]
for i, (h, w) in enumerate(zip(heads, widths), start=1):
    ws.column_dimensions[CL(i)].width = w
    if h:
        put(ws, f"{CL(i)}4", h, font=f(bold=True), fill=HEAD, border=box, alignment=center)
ws.row_dimensions[4].height = 32
put(ws, "A1", "名簿・結果", font=f(size=16, bold=True))
put(ws, "A2", "黄色の列（番号〜後ろを空ける）を入力します。Excelの名簿から番号と名前をA5に貼り付けてください（最大45人）。行の並べ替えはしないでください。", font=f(size=10, color="444444"))
put(ws, "A3", "希望：早い時刻／遅い時刻／早い日／遅い日。後ろを空ける：条件＝必ず同じ日の次の枠を空ける、希望＝できれば空ける。", font=f(size=10, color="444444"))
dv_sib = DataValidation(type="list", formula1='"〇"', allow_blank=True)
dv_hope = DataValidation(type="list", formula1='"' + ",".join(HOPES) + '"', allow_blank=True)
dv_gap = DataValidation(type="list", formula1='"条件,希望"', allow_blank=True)
for dv_ in (dv_sib, dv_hope, dv_gap):
    ws.add_data_validation(dv_)
for i in range(1, NS + 1):
    r, a = 4 + i, 9 + i          # a: 計算Aの行
    b = base(i)
    for c in "ABCDEF":
        put(ws, f"{c}{r}", None, fill=INPUT, border=box, alignment=Alignment(vertical="center") if c in "BD" else center)
    dv_sib.add(f"C{r}"); dv_hope.add(f"E{r}"); dv_gap.add(f"F{r}")
    put(ws, f"G{r}", f'=IF(B{r}="","",IF(A{r}="","",A{r}&" ")&B{r})', border=box)
    put(ws, f"H{r}", f'=IF(B{r}="","",IF({q(INP)}F{b}="未提出","未提出",IF(I{r}>0,"入力済み",IF({q(INP)}F{b}="×なし（どこでもOK）","×なし","未入力"))))', border=box, alignment=center)
    put(ws, f"I{r}", f'=IF(B{r}="","",{q(CA)}DX{a})', border=box, alignment=center)
    put(ws, f"J{r}", f'=IF(OR(H{r}="入力済み",H{r}="×なし"),{q(CA)}DW{a},"")', border=box, alignment=center)
    put(ws, f"K{r}", f'=IF({q(CA)}C{a}=1,COUNTIFS({q(CA)}$C$10:$C$54,1,{q(CA)}$DW$10:$DW$54,"<"&{q(CA)}DW{a})+1,"")', border=box, alignment=center)
    put(ws, f"L{r}", f'=IF({q(CA)}DY{a}=0,"",INDEX({q(SET)}$E$11:$E$20,INDEX({q(CA)}$D$2:$DS$2,{q(CA)}DY{a})))', border=box)
    put(ws, f"M{r}", f'=IF({q(CA)}DY{a}=0,"",INDEX({q(SET)}$I$11:$I$22,INDEX({q(CA)}$D$3:$DS$3,{q(CA)}DY{a})))', border=box, alignment=center)
    gapng = (f'AND(F{r}<>"",INDEX({q(CA)}${JA}${ROW_NEXT}:${JZ}${ROW_NEXT},{q(CA)}DY{a})=1,'
             f'INDEX({q(CA)}${JA}${ROW_OCC}:${JZ}${ROW_OCC},{q(CA)}DY{a}+1)=1)')
    put(ws, f"N{r}", f'=IF(G{r}="","",IF(COUNTIF({GRID},G{r})>1,"2か所以上に入っています",IF({q(CA)}DY{a}>0,'
                     f'IF(INDEX({q(CA)}$D${a}:$DS${a},{q(CA)}DY{a})=1,"×の枠に入っています",IF({gapng},IF(F{r}="条件","後ろの枠が空いていません","（希望）後ろが空いていません"),"")),'
                     f'IF(OR(H{r}="入力済み",H{r}="×なし"),"未割り当て",""))))', border=box)
    put(ws, f"O{r}", f'=IF({q(CA)}DU{a}=0,IF({q(CA)}DV{a}=1,"入る枠がありません",""),INDEX({q(CA)}$D$8:$DS$8,{q(CA)}DU{a}))', border=box)
    put(ws, f"P{r}", f'=HYPERLINK("#\'{INP}\'!B{b}","×入力へ")', font=f(color="2D5FA8", underline="single"), alignment=center)
ws.freeze_panes = "C5"
ws.auto_filter.ref = "A4:O49"
red_txt = Font(name=FONT, color="B23A3A", bold=True)
ws.conditional_formatting.add("N5:N49", FormulaRule(formula=['OR(N5="未割り当て",LEFT(N5,4)="（希望）")'], font=Font(name=FONT, color="9A6A00", bold=True)))
ws.conditional_formatting.add("N5:N49", FormulaRule(formula=['N5<>""'], font=red_txt))
ws.conditional_formatting.add("O5:O49", FormulaRule(formula=['O5="入る枠がありません"'], font=red_txt))
ws.conditional_formatting.add("H5:H49", FormulaRule(formula=['OR(H5="未入力",H5="未提出")'], fill=fill("FBEFC9")))
ws.conditional_formatting.add("J5:J49", FormulaRule(formula=['AND(K5<>"",J5<=2)'], fill=fill("F6DEDB")))

# ---------------------------------------------------------------- ×入力
ws = sheet(INP)
ws.column_dimensions["A"].width = 2
ws.column_dimensions["B"].width = 10
for d in range(D):
    ws.column_dimensions[CL(3 + d)].width = 15
put(ws, "B1", "×入力", font=f(size=16, bold=True))
put(ws, "B2", "都合の悪い枠に「×」。まとめて入れるときは、なぞって選んで「×」と打ち Ctrl + Enter。消すときは Delete。", font=f(size=10, color="444444"))
put(ws, "B3", "×が1つもない家庭は「提出状況」で「×なし（どこでもOK）」、出していない家庭は「未提出」を選びます。名簿の「×入力へ」で各児童の表に移動できます。", font=f(size=10, color="444444"))
dv_st = DataValidation(type="list", formula1='"×なし（どこでもOK）,未提出"', allow_blank=True)
ws.add_data_validation(dv_st)
grid_ranges = []
for i in range(1, NS + 1):
    b = base(i)
    put(ws, f"B{b}", f'=IF({q(ROS)}B{4+i}="","（名簿 {i}行目：なし）",{q(ROS)}G{4+i})', font=f(size=14, bold=True))
    put(ws, f"E{b}", "提出状況 ▶", alignment=Alignment(horizontal="right", vertical="center"))
    put(ws, f"F{b}", None, fill=INPUT, border=box, alignment=center)
    ws.merge_cells(f"F{b}:G{b}")
    dv_st.add(f"F{b}")
    put(ws, f"H{b}", "状況：", alignment=Alignment(horizontal="right"))
    put(ws, f"I{b}", f"={q(ROS)}H{4+i}", font=f(bold=True))
    put(ws, f"J{b}", "×の数：", alignment=Alignment(horizontal="right"))
    put(ws, f"K{b}", f"={q(ROS)}I{4+i}", font=f(bold=True))
    ws.row_dimensions[b].height = 26
    put(ws, f"B{b+1}", "", fill=HEAD, border=box)
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{b+1}", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, border=box, alignment=center)
    for t in range(1, T + 1):
        r = b + 1 + t
        put(ws, f"B{r}", f"={q(SET)}$I${10+t}", font=f(bold=True), fill=HEAD, border=box, alignment=center)
        for d in range(1, D + 1):
            put(ws, f"{CL(2+d)}{r}", None, font=f(size=16, bold=True, color="B23A3A"), border=box, alignment=center)
        ws.row_dimensions[r].height = 22
    grid_ranges.append(f"C{b+2}:L{b+1+T}")
rng = " ".join(grid_ranges)
tl = f"C{base(1)+2}"
ws.conditional_formatting.add(rng, FormulaRule(
    formula=[f'OR(INDEX({q(SET)}$B$11:$B$20,COLUMN({tl})-2)="",MOD(ROW({tl})-5,{BLK})-1>{q(SET)}$B$6)'], fill=GRAY, stopIfTrue=True))
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'{tl}<>""'], fill=fill("F6DEDB")))
ws.freeze_panes = "A5"

# ---------------------------------------------------------------- 割り当て・自動案 共通の表
def grid_frame(ws, title, note):
    ws.column_dimensions["A"].width = 2
    ws.column_dimensions["B"].width = 9
    for d in range(D):
        ws.column_dimensions[CL(3 + d)].width = 15
    put(ws, "B1", title, font=f(size=16, bold=True))
    put(ws, "B2", note, font=f(size=10, color="444444"))
    put(ws, "B5", "", fill=HEAD, border=box)
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}5", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, border=box, alignment=center)
    for t in range(1, T + 1):
        put(ws, f"B{5+t}", f"={q(SET)}$I${10+t}", font=f(bold=True), fill=HEAD, border=box, alignment=center)
        ws.row_dimensions[5 + t].height = 30
    jexpr = "(COLUMN(C6)-3)*%d+ROW(C6)-5" % T
    ws.conditional_formatting.add("C6:L17", FormulaRule(
        formula=[f"INDEX({q(CA)}$D$4:$DS$4,{jexpr})=0"], fill=GRAY, stopIfTrue=True))
    return jexpr


# ---------------------------------------------------------------- 割り当て
ws = sheet(ASG)
jexpr = grid_frame(ws, "割り当て", "各枠のプルダウンで児童を選びます。右の「児童を選ぶ」で選んだ児童の入れられる枠に色がつきます。")
dv_name = DataValidation(type="list", formula1=f"={q(ROS)}$G$5:$G$49", allow_blank=True)
dv_name.error = "名簿にある児童を選んでください。"
dv_name.showErrorMessage = True
ws.add_data_validation(dv_name)
for t in range(1, T + 1):
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{5+t}", None, border=box, alignment=center)
dv_name.add("C6:L17")
ws.column_dimensions["M"].width = 3
ws.column_dimensions["N"].width = 16
ws.column_dimensions["O"].width = 40
put(ws, "N4", "児童を選ぶ ▼", font=f(bold=True))
put(ws, "N5", None, fill=INPUT, border=box, font=f(size=12, bold=True))
ws.merge_cells("N5:O5")
dv_name.add("N5")
info = [
    (7, "状況", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$H$5:$H$49,{q(CA)}$B$8))'),
    (8, "×の数", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$I$5:$I$49,{q(CA)}$B$8))'),
    (9, "今の枠", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$L$5:$L$49,{q(CA)}$B$8)&" "&INDEX({q(ROS)}$M$5:$M$49,{q(CA)}$B$8))'),
    (10, "兄弟", f'=IF({q(CA)}$B$8=0,"",IF(INDEX({q(ROS)}$C$5:$C$49,{q(CA)}$B$8)="","",INDEX({q(ROS)}$C$5:$C$49,{q(CA)}$B$8)&" "&INDEX({q(ROS)}$D$5:$D$49,{q(CA)}$B$8)))'),
]
for r, lab, fo in info:
    put(ws, f"N{r}", lab, font=f(color="666666"))
    put(ws, f"O{r}", fo, font=f(bold=True))
put(ws, "N11", "入れられる空き枠", font=f(color="666666"))
arr(ws, "O11", f'=IFERROR(IF({q(CA)}$B$8=0,"",_xlfn.TEXTJOIN("、",TRUE,IF((INDEX({q(CA)}$D$60:$DS$104,{q(CA)}$B$8,0)=1)*({q(CA)}$D$7:$DS$7=0),{q(CA)}$D$8:$DS$8,""))),"")',
    alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells("O11:O17")
legend = [("C3", "C5D7F4", "選んだ児童"), ("D3", "D6F0DF", "入れられる"), ("E3", "FBEFC9", "入れられる（他の人あり）"),
          ("F3", "F6DEDB", "×の枠"), ("G3", "B23A3A", "×の枠に入れた！"), ("H3", "F2B36B", "2か所に入っている"),
          ("I3", "C9B3E6", "空けるはずの枠に人がいる")]
for ref, col, lab in legend:
    put(ws, ref, lab, fill=fill(col), font=f(size=9, color="FFFFFF" if col == "B23A3A" else "000000", bold=True), alignment=center, border=box)
put(ws, "J3", "後ろを空ける枠", fill=PatternFill("lightUp", fgColor="5B8BD0"), font=f(size=9, bold=True), alignment=center, border=box)
ws.row_dimensions[3].height = 28
sel = f"{q(CA)}$B$8"
okij = lambda idx: f"INDEX({q(CA)}$D$60:$DS$104,{idx},{jexpr})"
ngij = lambda idx: f"INDEX({q(CA)}$D$10:$DS$54,{idx},{jexpr})"
rules = [
    (f'AND(C6<>"",IFERROR({ngij(f"MATCH(C6,{q(CA)}$B$10:$B$54,0)")}=1,FALSE))', fill("B23A3A"), Font(name=FONT, color="FFFFFF", bold=True)),
    ('AND(C6<>"",COUNTIF($C$6:$L$17,C6)>1)', fill("F2B36B"), None),
    (f'AND(C6<>"",INDEX({q(CA)}$D${ROW_GAPBLK}:$DS${ROW_GAPBLK},{jexpr})=1)', fill("C9B3E6"), None),
    (f'AND(C6="",INDEX({q(CA)}$D${ROW_GAPBLK}:$DS${ROW_GAPBLK},{jexpr})=1)', PatternFill("lightUp", fgColor="5B8BD0"), None),
    ('AND(C6<>"",C6=$N$5)', fill("C5D7F4"), Font(name=FONT, bold=True, color="1F3F7A")),
    (f"IF({sel}>0,{ngij(sel)}=1,FALSE)", fill("F6DEDB"), None),
    (f'IF({sel}>0,AND(C6="",{okij(sel)}=1),FALSE)', fill("D6F0DF"), None),
    (f'IF({sel}>0,AND(C6<>"",{okij(sel)}=1),FALSE)', fill("FBEFC9"), None),
    (f'AND(C6="",INDEX({q(CA)}$D$5:$DS$5,{jexpr})=1)', PatternFill("lightUp", fgColor="BBBBBB"), None),
]
for fo, fi, fn in rules:
    ws.conditional_formatting.add("C6:L17", FormulaRule(formula=[fo], fill=fi, font=fn, stopIfTrue=True))

# 候補の表
put(ws, "B19", "候補（その枠に入れられる、まだ決まっていない児童）", font=f(size=13, bold=True))
put(ws, "B20", "未入力・未提出の家庭は含みません。0人の枠は赤、1人の枠はオレンジです。", font=f(size=10, color="444444"))
put(ws, "B21", "", fill=HEAD, border=box)
for d in range(1, D + 1):
    put(ws, f"{CL(2+d)}21", f"={q(SET)}$E${10+d}", font=f(bold=True), fill=HEAD, border=box, alignment=center)
for t in range(1, T + 1):
    r = 21 + t
    put(ws, f"B{r}", f"={q(SET)}$I${10+t}", font=f(bold=True), fill=HEAD, border=box, alignment=center)
    ws.row_dimensions[r].height = 48
    for d in range(1, D + 1):
        j = sj(d, t); c = jc(j); g = f"{CL(2+d)}{5+t}"
        okc = f"{q(CA)}{c}$60:{c}$104"
        arr(ws, f"{CL(2+d)}{r}",
            f'=IF({q(CA)}{c}$4=0,"",IF({g}<>"","（決定）",IF({q(CA)}{c}${ROW_GAPBLK}=1,"（空ける）",SUMPRODUCT(({okc}=1)*({q(CA)}$C$10:$C$54=1))&"人："&_xlfn.TEXTJOIN("、",TRUE,IF(({okc}=1)*({q(CA)}$C$10:$C$54=1),{q(CA)}$B$10:$B$54,"")))))',
            font=f(size=9), border=box, alignment=Alignment(wrap_text=True, vertical="top"))
ws.conditional_formatting.add("C22:L33", FormulaRule(formula=["INDEX(%s$D$4:$DS$4,(COLUMN(C22)-3)*%d+ROW(C22)-21)=0" % (q(CA), T)], fill=GRAY, stopIfTrue=True))
ws.conditional_formatting.add("C22:L33", FormulaRule(formula=['LEFT(C22,2)="0人"'], fill=fill("F6DEDB"), font=red_txt, stopIfTrue=True))
ws.conditional_formatting.add("C22:L33", FormulaRule(formula=['LEFT(C22,2)="1人"'], fill=fill("FBE0C2")))
ws.freeze_panes = "C6"

# ---------------------------------------------------------------- 自動案
ws = sheet(AUT)
grid_frame(ws, "自動案", "入れられる枠が少ない家庭から順に、自動で割り当てた案です。緑が新しく入った人。よければ表（C6:L17）をコピーし、「割り当て」の同じ場所に［値の貼り付け］をします。")
for t in range(1, T + 1):
    for d in range(1, D + 1):
        j = sj(d, t); g = f"{q(ASG)}{CL(2+d)}{5+t}"
        put(ws, f"{CL(2+d)}{5+t}",
            f'=IF({q(CA)}{jc(j)}$4=0,"",IF({g}<>"",{g},IFERROR(INDEX({q(ROS)}$G$5:$G$49,INDEX({q(CB)}$B$3:$B$47,MATCH({j},{q(CB)}$C$3:$C$47,0))),"")))',
            border=box, alignment=center)
ws.conditional_formatting.add("C6:L17", FormulaRule(formula=[f'AND(C6<>"",{q(ASG)}C6="")'], fill=fill("D6F0DF"), font=Font(name=FONT, bold=True)))
ws.conditional_formatting.add("C6:L17", FormulaRule(formula=[f'AND(C6="",INDEX({q(CA)}$D${ROW_AUTOBLK}:$DS${ROW_AUTOBLK},{jexpr})+INDEX({q(CA)}$D${ROW_GAPBLK}:$DS${ROW_GAPBLK},{jexpr})>0)'], fill=PatternFill("lightUp", fgColor="5B8BD0"), stopIfTrue=True))
ws.conditional_formatting.add("C6:L17", FormulaRule(formula=[f'AND(C6="",INDEX({q(CA)}$D$5:$DS$5,{jexpr})=1)'], fill=PatternFill("lightUp", fgColor="BBBBBB")))
put(ws, "C3", "新しく入った人", fill=fill("D6F0DF"), font=f(size=9, bold=True), alignment=center, border=box)
put(ws, "D3", "後ろを空ける枠", fill=PatternFill("lightUp", fgColor="5B8BD0"), font=f(size=9, bold=True), alignment=center, border=box)
put(ws, "E3", "空けたい日・休憩", fill=PatternFill("lightUp", fgColor="BBBBBB"), font=f(size=9, bold=True), alignment=center, border=box)
ws.row_dimensions[3].height = 24
ws.column_dimensions["M"].width = 3
ws.column_dimensions["N"].width = 22
ws.column_dimensions["O"].width = 40
put(ws, "N5", "割り当て済み（割り当てシート）", font=f(color="666666"))
put(ws, "O5", f'=SUMPRODUCT(({GRID}<>"")*1)&" 人"', font=f(bold=True))
put(ws, "N6", "自動で新しく入った", font=f(color="666666"))
put(ws, "O6", f'=SUMPRODUCT(({q(CB)}$B$3:$B$47>0)*({q(CB)}$C$3:$C$47>0))&" 人"', font=f(bold=True))
put(ws, "N8", "入る枠がない（×・後ろ空けの条件）", font=f(color="B23A3A", bold=True))
arr(ws, "O8", f'=_xlfn.TEXTJOIN("、",TRUE,IF({q(CA)}$DV$10:$DV$54=1,{q(CA)}$B$10:$B$54,""))', font=red_txt, alignment=Alignment(wrap_text=True, vertical="top"))
put(ws, "N10", "未入力・未提出で外した", font=f(color="9A6A00", bold=True))
arr(ws, "O10", f'=_xlfn.TEXTJOIN("、",TRUE,IF((({q(ROS)}$H$5:$H$49="未入力")+({q(ROS)}$H$5:$H$49="未提出"))*({q(CA)}$DY$10:$DY$54=0),{q(ROS)}$G$5:$G$49,""))', alignment=Alignment(wrap_text=True, vertical="top"))
put(ws, "N12", "空けたい枠を使った", font=f(color="666666"))
put(ws, "O12", f'=SUM({q(CB)}$D$3:$D$47)&" 枠"', font=f(bold=True))
ws.merge_cells("O8:O9"); ws.merge_cells("O10:O11")
ws.row_dimensions[8].height = 30; ws.row_dimensions[10].height = 30

# ---------------------------------------------------------------- 計算A（×・入れられる枠・児童ごとの集計）
ws = sheet(CA)
put(ws, "A1", "計算用（さわらないでください）", font=f(bold=True, color="B23A3A"))
labels = {1: "枠番号", 2: "日", 3: "時", 4: "使える", 5: "空けたい", 6: "優先順", 7: "決定済み", 8: "表示"}
for r, lab in labels.items():
    put(ws, f"C{r}", lab)
put(ws, "A8", "選択中→"); put(ws, "B8", f'=IFERROR(MATCH({q(ASG)}$N$5,$B$10:$B$54,0),0)')
for j in range(1, N + 1):
    c = jc(j); d = (j - 1) // T + 1; t = (j - 1) % T + 1
    ws[f"{c}1"] = j; ws[f"{c}2"] = d; ws[f"{c}3"] = t
    ws[f"{c}4"] = f'=IF(AND(INDEX({q(SET)}$B$11:$B$20,{c}2)<>"",{c}3<={q(SET)}$B$6),1,0)'
    ws[f"{c}5"] = f'=IF(OR(INDEX({q(SET)}$D$11:$D$20,{c}2)<>"",INDEX({q(SET)}$H$11:$H$22,{c}3)<>""),1,0)'
    ws[f"{c}6"] = f'=IF(LEFT({q(SET)}$B$8,3)="日付順",({c}2-1)*{T}+{c}3,({c}3-1)*{D}+{c}2)+{c}5*10000'
    ws[f"{c}7"] = f"=MAX({c}{ROW_OCC},{c}{ROW_GAPBLK})"
    ws[f"{c}{ROW_OCC}"] = f'=IF(INDEX({GRID},{c}3,{c}2)<>"",1,0)'
    if t > 1:   # 前の枠の人が「後ろを空ける」なら、この枠は空ける
        prev = f"INDEX({GRID},{c}3-1,{c}2)"
        ws[f"{c}{ROW_GAPBLK}"] = f'=IF({prev}="",0,IF(IFERROR(INDEX({q(ROS)}$F$5:$F$49,MATCH({prev},{q(ROS)}$G$5:$G$49,0)),"")<>"",1,0))'
    else:
        ws[f"{c}{ROW_GAPBLK}"] = 0
    ws[f"{c}{ROW_NEXT}"] = (f"=IF({jc(j+1)}4=1,1,0)" if t < T else 0)
    ws[f"{c}{ROW_AUTOBLK}"] = f"=IF(COUNTIF({q(CB)}$G$3:$G$47,{j})>0,1,0)"
    ws[f"{c}{ROW_PRIO}"] = f"={c}6"
    ws[f"{c}{ROW_PRIO+1}"] = f"=({c}3-1)*{D}+{c}2+{c}5*10000"
    ws[f"{c}{ROW_PRIO+2}"] = f"=({T}-{c}3)*{D}+{c}2+{c}5*10000"
    ws[f"{c}{ROW_PRIO+3}"] = f"=({c}2-1)*{T}+{c}3+{c}5*10000"
    ws[f"{c}{ROW_PRIO+4}"] = f"=({D}-{c}2)*{T}+{c}3+{c}5*10000"
    ws[f"{c}8"] = f'=IF({c}4=1,INDEX({q(SET)}$E$11:$E$20,{c}2)&" "&INDEX({q(SET)}$I$11:$I$22,{c}3),"")'
for r_, lab in {ROW_NEXT: "次の枠あり", ROW_AUTOBLK: "自動で空ける", ROW_GAPBLK: "後ろを空ける枠", ROW_OCC: "人がいる",
                ROW_PRIO: "優先：全体", ROW_PRIO+1: "早い時刻", ROW_PRIO+2: "遅い時刻", ROW_PRIO+3: "早い日", ROW_PRIO+4: "遅い日"}.items():
    ws[f"C{r_}"] = lab
for k, lab in {"A9": "i", "B9": "表示名", "C9": "自動の対象", "DU9": "自動案の枠", "DV9": "入らない", "DW9": "空き枠数", "DX9": "×の数", "DY9": "決定した枠", "DZ9": "希望", "EA9": "後ろ空け"}.items():
    ws[k] = lab
for i in range(1, NS + 1):
    r = 9 + i; ro = 4 + i; o = 59 + i
    ws[f"A{r}"] = i
    ws[f"B{r}"] = f"={q(ROS)}G{ro}"
    ws[f"C{r}"] = f'=IF(AND(B{r}<>"",OR({q(ROS)}H{ro}="入力済み",{q(ROS)}H{ro}="×なし"),DY{r}=0,COUNTIF({GRID},B{r})=0),1,0)'
    ws[f"A{o}"] = i
    for j in range(1, N + 1):
        c = jc(j)
        ws[f"{c}{r}"] = f'=IF({c}$4=1,IF(INDEX({q(INP)}$C$1:$L$700,{base(i)+1}+{c}$3,{c}$2)<>"",1,0),0)'
        ws[f"{c}{o}"] = f"=IF(AND({c}$4=1,{c}{r}=0),1,0)"
    ws[f"DU{r}"] = f"=IFERROR(INDEX({q(CB)}$C$3:$C$47,MATCH(A{r},{q(CB)}$B$3:$B$47,0)),0)"
    ws[f"DV{r}"] = f"=IF(AND(C{r}=1,DU{r}=0),1,0)"
    ws[f"DW{r}"] = f"=SUMPRODUCT({JA}{o}:{JZ}{o}*(1-${JA}$7:${JZ}$7))"
    ws[f"DX{r}"] = f"=SUM({JA}{r}:{JZ}{r})"
    ws[f"DZ{r}"] = f'=IFERROR(MATCH({q(ROS)}E{ro},{{"' + '","'.join(HOPES) + f'"}},0),0)'
    ws[f"EA{r}"] = f'=IF({q(ROS)}F{ro}="条件",2,IF({q(ROS)}F{ro}="希望",1,0))'
    ws[f"DY{r}"] = f'=IF(B{r}="",0,IF(COUNTIF({GRID},B{r})=1,SUMPRODUCT(({GRID}=B{r})*((COLUMN({GRID})-3)*{T}+ROW({GRID})-5)),0))'
ws[f"A59"] = "入れられる枠（使える かつ ×なし）"

# ---------------------------------------------------------------- 計算B（自動案：入れられる枠が少ない児童から順に1人ずつ決める）
# A順番 B決めた児童 C入れた枠 D空けたい枠を使った E後ろ空け(2条件/1希望) F希望 G後ろを空けた枠
ws = sheet(CB)
BIG = 1000000
PR0 = 9
SC0 = PR0 + NS + 1
FR0 = SC0 + NS + 1
NX0 = FR0 + N + 1
SS0 = NX0 + N + 1
pr = lambda i: CL(PR0 + i - 1)
sc = lambda i: CL(SC0 + i - 1)
fr = lambda j: CL(FR0 + j - 1)
nx = lambda j: CL(NX0 + j - 1)
ss = lambda j: CL(SS0 + j - 1)
put(ws, "A1", "計算用（さわらないでください）", font=f(bold=True, color="B23A3A"))
for k, lab in {"A2": "k", "B2": "児童", "C2": "枠", "D2": "空けたい枠", "E2": "後ろ空け", "F2": "希望", "G2": "空けた枠"}.items():
    ws[k] = lab
for i in range(1, NS + 1):
    ws[f"{pr(i)}2"] = i; ws[f"{sc(i)}2"] = i
for j in range(1, N + 1):
    ws[f"{fr(j)}2"] = j; ws[f"{nx(j)}2"] = j; ws[f"{ss(j)}2"] = j
ws[f"{pr(1)}1"] = "済"; ws[f"{sc(1)}1"] = "点数（入れられる枠の数）"; ws[f"{fr(1)}1"] = "空き"
ws[f"{nx(1)}1"] = "次の枠が空いている"; ws[f"{ss(1)}1"] = "枠の点数"
CAr = lambda row: f"{q(CA)}${JA}${row}:${JZ}${row}"
for k in range(1, NS + 1):
    r = 2 + k
    ws[f"A{r}"] = k
    for i in range(1, NS + 1):
        ws[f"{pr(i)}{r}"] = (f"=1-{q(CA)}C{9+i}" if k == 1 else f"=MAX({pr(i)}{r-1},IF($B{r-1}={i},1,0))")
        ok = CAr(59 + i)
        ws[f"{sc(i)}{r}"] = (f"=IF({pr(i)}{r}=1,{BIG},IF({q(CA)}$EA${9+i}=2,"
                             f"SUMPRODUCT({ok},${fr(1)}{r}:${fr(N)}{r},${nx(1)}{r}:${nx(N)}{r}),"
                             f"SUMPRODUCT({ok},${fr(1)}{r}:${fr(N)}{r}))*1000+{i})")
    ws[f"B{r}"] = f"=IF(MIN({sc(1)}{r}:{sc(NS)}{r})>={BIG},0,MATCH(MIN({sc(1)}{r}:{sc(NS)}{r}),{sc(1)}{r}:{sc(NS)}{r},0))"
    ws[f"E{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$EA$10:$EA$54,B{r}))"
    ws[f"F{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$DZ$10:$DZ$54,B{r}))"
    for j in range(1, N + 1):
        ws[f"{fr(j)}{r}"] = (f"=1-{q(CA)}{jc(j)}$7" if k == 1 else f"={fr(j)}{r-1}*IF(OR($C{r-1}={j},$G{r-1}={j}),0,1)")
        ws[f"{nx(j)}{r}"] = (f"=IF({q(CA)}{jc(j)}${ROW_NEXT}=1,{fr(j+1)}{r},1)" if j < N else 1)
        ws[f"{ss(j)}{r}"] = (f"=IF($B{r}=0,{BIG},IF(INDEX({q(CA)}${JA}$60:${JZ}$104,$B{r},{j})*{fr(j)}{r}=1,"
                             f"IF(AND($E{r}=2,{nx(j)}{r}=0),{BIG},INDEX({q(CA)}{jc(j)}${ROW_PRIO}:{jc(j)}${ROW_PRIO+4},$F{r}+1)+IF(AND($E{r}=1,{nx(j)}{r}=0),1000,0)),{BIG}))")
    ws[f"C{r}"] = f"=IF(MIN({ss(1)}{r}:{ss(N)}{r})>={BIG},0,MATCH(MIN({ss(1)}{r}:{ss(N)}{r}),{ss(1)}{r}:{ss(N)}{r},0))"
    ws[f"D{r}"] = f"=IF(C{r}>0,INDEX({CAr(5)},C{r}),0)"
    ws[f"G{r}"] = f"=IF(AND(C{r}>0,E{r}>0),IF(AND(INDEX({CAr(ROW_NEXT)},C{r})=1,INDEX(${nx(1)}{r}:${nx(N)}{r},C{r})=1),C{r}+1,0),0)"

wb[CA].sheet_state = "hidden"
wb[CB].sheet_state = "hidden"
wb.active = 1
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print("saved", OUT)
