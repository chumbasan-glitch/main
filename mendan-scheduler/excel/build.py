"""面談日程ツール（Excel版・マクロなし）を作るスクリプト。

  python3 build.py [出力ファイル]

日数は最大6日、1日の枠は最大24枠（時間帯は2つまで）、児童は最大40人。
"""
import sys
import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.formula import ArrayFormula
from openpyxl.utils import get_column_letter as CL

D, T, NS = 6, 24, 40           # 日数・1日の枠数・児童数の上限
LC = CL(2 + D)                 # 表の最後の日の列（C〜）
DL = 10 + D                    # 設定シートの日付の表の最後の行
TC = CL(12 + D)                # 設定シート「先生の都合」の表の最後の列（M〜）
N = D * T                      # 枠の総数
BLK = T + 4                    # ×入力シートの1人分の行数
FONT = "BIZ UDPゴシック"
OUT = sys.argv[1] if len(sys.argv) > 1 else "面談日程ツール_Ver3.2.xlsx"
OUT_DEFAULT_OFF = True             # 配るファイルは「止める（×の入力中）」から始める

SET, ROS, INP, ASG, AUT, CA, CB = "設定", "名簿", "×入力", "調整・決定", "自動案A", "calcA", "calcB"   # 計算用の隠しシートは短い英字の名前（式が短くなり、ファイルが軽くなる）
AUTB, CC = "自動案B", "calcC"      # 自動案B（散らす）とその計算
SIB = "兄弟確認用"
LET = "お手紙（秋）"
LES = "お手紙（夏）"
q = lambda s: "'" + s + "'!"   # シート参照
GL = 5 + T                       # 調整・決定／自動案の表の最後の行
GRID = q(ASG) + f"$C$6:${LC}${GL}"   # 調整・決定の表


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
VERSION = "Ver.3.2"   # 直したら番号を上げる（ファイル名にも入る）
PS, PL, PV = CL(3 + D), CL(4 + D), CL(5 + D)   # 表の右の欄：すき間・見出し・中身
ROW_NEXT = 106                 # 同じ日に次の枠がある
ROW_AUTOBLK = 107              # 自動案Aで「後ろを空ける」枠になった
ROW_AUTOBLK_B = 116            # 自動案Bで「後ろを空ける」枠になった
ROW_GAPBLK = 108               # 決定済みの人の「後ろを空ける」枠
ROW_OCC = 109                  # 調整・決定の表に人が入っている
ROW_PRIO = 110                 # 110:全体の詰め方 111〜114:希望ごとの優先順
ROW_EXIST = 115                # 設定した日付・時間にある枠（ない枠は表で見えなくする）
ROW_NB = 117                   # 同じ日・同じ時間帯に、時間として次の枠がある（先生の都合は見ない）
ROW_NOGAP = 118                # 調整・決定でこの枠に入っている人が「空けない」
INPR = q("×入力") + "$A$1:$L$1300"  # ×入力シート全体
TL = 10 + T                       # 設定シートの時刻の表の最後の行
TBLK = f"'設定'!$M$11:${TC}${TL}"      # 先生の都合で使えない枠
TDAY = f"'設定'!$M$9:${TC}$9"           # この日は組まない
TTIME = f"'設定'!$K$11:$K${TL}"     # この時間は組まない
AUTO_ON_OPT, AUTO_OFF_OPT = "自動案を出す", "止める（×の入力中）"
SWITCH = "'自動案A'!$K$3"
SWON = "calcA!$A$6"               # 自動案　0：まだ　1：作った　2：作ったあとに入力が変わった               # 1＝自動案を出す、0＝止める（SWITCH を1回だけ見て、ほかの式はこれを見る）          # 自動案を出すかどうか（自動案Aのシートの右上。A・B 両方に効く）
N1, N2 = "calcA!$A$3", "calcA!$A$4"   # 時間帯1・2の枠の数

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


def button(ws, ref, text, color="2F6CC4", size=12, merge=None):
    """マクロ版のボタン：自分のマスへのリンク。押すと ThisWorkbook のマクロが動く（貼り付ける前は何も起きない）"""
    from openpyxl.worksheet.hyperlink import Hyperlink
    c = ws[ref]
    c.value = text
    c.hyperlink = Hyperlink(ref=ref, location=f"'{ws.title}'!{ref}", display=text)
    c.font = f(size=size, bold=True, color="FFFFFF")
    c.fill = fill(color)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    sd = Side(style="medium", color="1F3F7A")
    c.border = Border(left=sd, right=sd, top=sd, bottom=sd)
    if merge:
        ws.merge_cells(f"{ref}:{merge}")


def hide_rules(ws, rng, unused, rules, frame=True):
    """使わない枠は白く（見えなく）し、使う枠には線を引いて色分けする条件付き書式"""
    ws.conditional_formatting.add(rng, FormulaRule(formula=[unused], fill=WHITE, stopIfTrue=True))
    for fo, fi, fn in rules:
        ws.conditional_formatting.add(rng, FormulaRule(formula=[fo], fill=fi, font=fn, border=box if frame else None, stopIfTrue=True))
    if frame:
        ws.conditional_formatting.add(rng, FormulaRule(formula=["TRUE"], border=box))



def legend_image(items, w, h):
    """色の見かたを3段に並べた画像（items：(色, 文字)、色が None なら斜線）。w×h はExcelでの大きさ（px）"""
    import io
    from PIL import Image as PImage, ImageDraw, ImageFont
    from openpyxl.drawing.image import Image as XImage
    S = 2                                         # 2倍の大きさで描いて、くっきり見せる
    im = PImage.new("RGB", (w * S, h * S), "white")
    d = ImageDraw.Draw(im)
    font = None
    for p in ("/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf", "C:/Windows/Fonts/meiryo.ttc", "C:/Windows/Fonts/msgothic.ttc",
              "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"):
        try:
            font = ImageFont.truetype(p, 13 * S); break
        except OSError:
            pass
    font = font or ImageFont.load_default()
    per = 3
    cw, rh = w * S // per, h * S // 3
    for k, (col, lab) in enumerate(items):
        x0, y0 = (k % per) * cw + 2, (k // per) * rh + 2
        x1, y1 = x0 + cw - 4, y0 + rh - 4
        d.rectangle([x0, y0, x1, y1], fill="#" + (col or "FFFFFF"), outline="#9FB3D1", width=S)
        if col is None:                           # 斜線（後ろを空ける枠）
            for xx in range(x0 - (y1 - y0), x1, 6 * S):
                d.line([max(xx, x0), y1 - max(0, x0 - xx), min(xx + (y1 - y0), x1), y0 + max(0, xx + (y1 - y0) - x1)], fill="#5B8BD0", width=S)
        d.text(((x0 + x1) / 2, (y0 + y1) / 2), lab, font=font, anchor="mm", fill="#FFFFFF" if col == "B23A3A" else "#000000")
    buf = io.BytesIO(); im.save(buf, "PNG"); buf.seek(0)
    xi = XImage(buf); xi.width, xi.height = w, h
    return xi

def ZEN(x):
    """数字とコロンを全角にする式（JIS関数は環境によって動かないので、SUBSTITUTE だけで作る）"""
    for a, b in zip("0123456789:", "０１２３４５６７８９："):
        x = f'SUBSTITUTE({x},"{a}","{b}")'
    return x


def EXIST(jexpr):              # その枠が設定した日付・時間にあるか
    return f"INDEX({q(CA)}${JA}${ROW_EXIST}:${JZ}${ROW_EXIST},{jexpr})"


# ---------------------------------------------------------------- ホーム
ws = sheet(HOME, first=True)
ws.column_dimensions["A"].width = 3
for c in range(2, 14):
    ws.column_dimensions[CL(c)].width = 11
lines = [
    ("面談日程ツール（Excel版）", f(size=18, bold=True)),
    ("マクロ版です（.xlsm で保存し、開いたら［コンテンツの有効化］）。黄色のセルが入力する場所、青いマスはボタンです。", f(size=11)),
    ("", None),
    ("1. 「設定」シート", f(bold=True, size=12)),
    ("・面談の日付（上から順に、最大6日）、時間帯（午前と午後に分けるときは2つ）と1枠の長さを入れます（1日最大24枠）。", None),
    ("・空けたい日や休憩の時刻には「〇」を選びます。自動案では、ほかに入る枠がないときだけ使われます。", None),
    ("・出張や会議などで面談を組まない日・時間・枠は、右の「先生の都合で使えない枠」で「×」を選びます。止めた枠は、×入力・自動案・調整・決定で灰色になり、使われません。", None),
    ("2. 「名簿」シート", f(bold=True, size=12)),
    ("・Excelの名簿から「出席番号」と「名前」をコピーして、「番号」の列のいちばん上のマスに貼り付けます（最大40人）。", None),
    ("・他のクラスに兄弟がいる家庭は、「兄弟」の列で「〇」を選び、「兄弟メモ」に兄弟のクラスなどをメモします。", None),
    ("・「希望」：早い時刻／遅い時刻／早い日／遅い日 から選べます。自動案で、×のない枠の中からできるだけ希望に合う枠を選びます（希望なので、合わないこともあります）。", None),
    ("・「後ろを空ける」：話が長引きそうな家庭は、同じ日のすぐ次の枠を空けます。「必ず空けたい」「出来れば空けたい」から選びます（出来れば空けたいは、空けられないときは詰めて入れます）。日の最後の枠なら空ける必要はありません。", None),
    ("・名簿の行は並べ替えないでください（×入力の内容とずれてしまいます）。絞り込み（フィルター）は使えます。", None),
    ("・自動案や調整・決定には名前だけが出ます。同じ名前の児童がいるときだけ、「番号 名前」で区別して表示します。", None),
    ("3. 「×入力」シート", f(bold=True, size=12)),
    ("・1人ずつ、予定表と同じ形の表があります。上の「児童を選ぶ」で名前を選ぶか、名簿の「×入力へ」をクリックすると、その人の表に移動します。「次の未入力の子へ」で、×がまだの子に進めます。", None),
    ("・都合の悪い枠をダブルクリックすると「×」が付き、もう一度ダブルクリックすると消えます（何か文字が入っていれば×として扱います。Delete キーでも消せます）。", None),
    ("・まとめて入れるとき：マウスでなぞって範囲を選び、「×」と打って Ctrl + Enter を押すと、選んだ枠が全部×になります。", None),
    ("・その日全部：日付の上の「この日全部」の欄、その時間全部：時刻の左の「この時間全部」の欄を、ダブルクリック（またはプルダウンで「×」）（表のマスはピンクになります）。", None),
    ("・×が1つもない家庭は「提出状況」で「×なし（どこでもOK）」、提出していない家庭は「未提出」を選びます。", None),
    ("4. 「自動案A」「自動案B」シート", f(bold=True, size=12)),
    ("・［自動案を作る（A・B両方）］を押すと、自動で組んだ案が2つできます（入れられる枠が少ない家庭から先に決めます。未入力・未提出の家庭は外れます）。集まった分だけで作って大丈夫です。", None),
    ("・作ったあとに×・名簿・設定・調整・決定を変えると、表の上が赤くなります。もう一度［自動案を作る］を押してください。", None),
    ("・入る枠がない子が出たときは、ほかの子を動かして入れ直します。それでも入らない子は、右の「入る枠がない」に名前が出ます。", None),
    ("・自動案A（詰める）：設定の「詰め方」に従って、早い時間や前の日から詰めて組みます。", None),
    ("・自動案B（散らす）：日ごとの人数がそろい、面談と面談のあいだがなるべく空くように組みます（希望がある家庭は希望を優先）。", None),
    ("・よいほうのシートで［この案を調整・決定へ写す］を押すと、「調整・決定」の表に入ります。", None),
    ("・「調整・決定」シートですでに決めた人はそのまま残り、残りの人だけで案が作られます。やり直したいときは調整・決定の表を消します。", None),
    ("5. 「調整・決定」シート", f(bold=True, size=12)),
    ("・各枠のセルで、プルダウンから児童を選びます。", None),
    ("・表の名前をクリック（または右の「児童を選ぶ」で選ぶ）と、表の色が変わります：緑＝入れられる空き枠／黄＝入れられる（ほかの人がいる）／ピンク＝×の枠／青＝今いる枠。", None),
    ("・入れ替え：1人目の名前をダブルクリック（オレンジの枠になる）→ 入れ替える相手をダブルクリック。空いたマスをダブルクリックすると、そこへ移動します。やめるときは、同じマスをもう一度ダブルクリック。", None),
    ("・［ひとつ前に戻す］で、写す・入れ替え・書きかえの前に戻せます（10回まで）。マクロのあとは Ctrl + Z が効かないので、こちらを使ってください。", None),
    ("・赤い枠は「×の枠に入れてしまった」、オレンジの枠は「同じ人が2か所に入っている」です。", None),
    ("・青い斜線の枠は「前の人の後ろを空ける枠」です。紫の枠は、空けるはずの枠に人が入っています。", None),
    ("・下の「候補」の表には、その枠に入れられる、まだ決まっていない児童が表示されます。「1人」の枠は先に決めると楽です。", None),
    ("6. 「兄弟確認用」シート", f(bold=True, size=12)),
    ("・調整・決定で決めた日程が、予定表と同じ形で出ます。兄弟がいる子は色付きで、名前の下に兄弟のクラスが出ます（名簿の「兄弟メモ」にはクラス名だけを書きます。例：2年1組）。", None),
    ("・兄弟の担任から面談の日時を聞いたら、名簿の「兄弟の日付」「兄弟の時刻」を選びます。自動案では、できるだけ兄弟のすぐ前かすぐ後に入れます。", None),
    ("・表の上の黄色の欄には、「組んでみました。都合が悪ければお知らせください」など、自由に書けます（書いたことも印刷されます）。", None),
    ("・保護者へのお手紙は「お手紙（夏）」「お手紙（秋）」シートで印刷できます（宛名・日付・本文などは設定のいちばん下で決めます）。［印刷プレビュー］［PDFで保存］は、1日の枠が13以上なら夏の形、12以下なら秋の形を自動で選びます。", None),
    ("・［PDFで保存］は、このファイルと同じ場所に「6年1組_進路面談のお知らせ.pdf」のような名前で保存します。", None),
    ("7. 結果", f(bold=True, size=12)),
    ("・「名簿」シートの右側に、決まった日時・注意（×の枠／2か所／後ろが空いていない／使えない枠／未決定）・自動案が表示されます。", None),
    ("・CSVが必要なときは「名簿」シートを開いて［ファイル］→［名前を付けて保存］→ 種類を「CSV UTF-8」にします。", None),
    ("・兄弟ありの家庭だけ見たいときは、名簿の「兄弟」の列でフィルターをかけます。兄弟が〇の子がいると、兄弟①〜③の列は自動で開きます。", None),
    ("", None),
    ("※ 「calcA」「calcB」「calcC」は計算用の隠しシートです。さわらないでください。", f(color="9A6A00")),
]
put(ws, "A1", "面談日程ツール")
put(ws, "A2", "×のついた予定表から、個人面談の日程を組むツールです（マクロ版）。黄色のマスが入力する場所、青いマスはボタンです。")
# いまの状況
put(ws, "B4", "いまの状況", font=f(size=13, bold=True, color=PRIMARY_D))
R = q(ROS)
tiles = [
    ("名簿の人数", f'=COUNTIF({R}$B$5:$B$49,"?*")', None),
    ("×入力済み", f'=COUNTIF({R}$Q$5:$Q$49,"入力済み")+COUNTIF({R}$Q$5:$Q$49,"×なし")', None),
    ("未入力", f'=COUNTIF({R}$Q$5:$Q$49,"未入力")', "9A6A00"),
    ("未提出", f'=COUNTIF({R}$Q$5:$Q$49,"未提出")', "9A6A00"),
    ("決定済み", f'=SUMPRODUCT(({R}$U$5:$U$49<>"")*1)', None),
    ("未決定", f'=COUNTIF({R}$W$5:$W$49,"未決定")', "B23A3A"),
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
    (AUT, "自動案を見る（A：詰める／B：散らす）", "［自動案を作る］を押すと、入れられる枠が少ない家庭から順に組んだ案が2つできます。よいほうで［調整・決定へ写す］を押します。"),
    (ASG, "調整して決定する", "名前をクリックすると入れられる枠に色がつきます。ダブルクリック2回で入れ替え。［ひとつ前に戻す］もあります。"),
    (SIB, "印刷して兄弟を確認する", "決めた日程を予定表の形で印刷。兄弟がいる子は色付きで、兄弟のクラスも出ます。"),
    (LES, "お手紙を印刷する", "保護者へのお知らせ（夏用・秋用）。宛名・日付・学校名・担任名・本文は設定で決めます。6年は「進路面談」になります。"),
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
    elif sh == LES:   # お手紙は夏・秋の2つ
        put(ws, f"K{r}", f'=HYPERLINK("#\'{LES}\'!A1","夏 ▶")', font=f(size=12, bold=True, color="FFFFFF"), fill=fill("1E90A0"), alignment=center)
        put(ws, f"L{r}", f'=HYPERLINK("#\'{LET}\'!A1","秋 ▶")', font=f(size=12, bold=True, color="FFFFFF"), fill=fill("2E8B57"), alignment=center)
        ws.merge_cells(f"K{r}:K{r+1}"); ws.merge_cells(f"L{r}:L{r+1}")
    else:
        put(ws, f"K{r}", f'=HYPERLINK("#\'{sh}\'!A1","開く ▶")', font=f(size=12, bold=True, color="FFFFFF"), fill=fill(ACCENT), alignment=center)
        ws.merge_cells(f"K{r}:L{r+1}")
    ws.row_dimensions[r].height = 24; ws.row_dimensions[r + 1].height = 30
    for cc in "CDEFGHIJ":
        ws[f"{cc}{r+1}"].border = Border(bottom=Side(style="thin", color="D3DEEC"))
# くわしい使い方
r0 = 32
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
for dv_, ref in ((dv_time, "B3:B4"), (dv_time, "D3:D4"), (dv_step, "B5"), (dv_date, f"B11:B{DL}")):
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
dv_x.add(f"M9:{TC}9"); dv_x.add(f"K11:K{TL}"); dv_x.add(f"M11:{TC}{TL}")
for t in range(1, T + 1):
    put(ws, f"K{10+t}", None, fill=ALLX, alignment=center, font=XF)
    put(ws, f"L{10+t}", f"=$I${10+t}", font=f(bold=True), fill=HEAD, alignment=center)
hide_rules(ws, f"M9:{TC}9", f'INDEX($B$11:$B${DL},COLUMN(M9)-12)=""', [])
hide_rules(ws, f"K11:K{TL}", '$L11=""', [])
hide_rules(ws, f"L11:L{TL}", '$L11=""', [], frame=False)
hide_rules(ws, f"M11:{TC}{TL}", f'OR(INDEX($B$11:$B${DL},COLUMN(M11)-12)="",ROW(M11)-10>$B$6)',
           [('OR(M11<>"",M$9<>"",$K11<>"")', fill("F6DEDB"), None)])

# お手紙（お知らせ）に入れること
LR = 30                          # お手紙の欄の先頭行
put(ws, f"A{LR}", "お手紙（お知らせ）", font=f(size=13, bold=True, color=PRIMARY_D))
put(ws, f"B{LR}", "「お手紙（夏）」「お手紙（秋）」シートに出ます。", font=f(size=9, color="666666"))
KINDS = ["学年に合わせる（6年は進路面談）", "個人面談", "進路面談"]
NOSUF = lambda x, suf: f'IF(RIGHT({x},1)="{suf}",LEFT({x},LEN({x})-1),{x})'     # 最後の「年」「組」を取る
IS6 = lambda x: f'OR({NOSUF(x, "年")}&""="6",{NOSUF(x, "年")}&""="６")'           # 6年か（「6」「6年」「６年」のどれでも）
letter_in = [("学年", 6, "B", '0"年"'), ("組", 1, "B", '0"組"'), ("担任名", None, "B:E", None), ("学校名", None, "B:E", None),
             ("お手紙の日付", datetime.date(2026, 10, 30), "B", "m/d"), ("面談の種類", KINDS[0], "B:E", None)]
for k, (lab, v, span, nf) in enumerate(letter_in):
    r = LR + 1 + k
    put(ws, f"A{r}", lab, font=f(bold=True, color=PRIMARY_D))
    put(ws, f"B{r}", v, fill=INPUT, border=box, alignment=Alignment(horizontal="center" if span == "B" else "left", vertical="center"), **({"number_format": nf} if nf else {}))
    if span != "B":
        ws.merge_cells(f"B{r}:E{r}")
L_GRADE, L_CLASS, L_TEACH, L_SCHOOL, L_DATE, L_KIND = (f"{q(SET)}$B${LR+1+k}" for k in range(6))
dv_grade = DataValidation(type="list", formula1='"1,2,3,4,5,6"', allow_blank=True); ws.add_data_validation(dv_grade); dv_grade.add(f"B{LR+1}")
dv_kind = DataValidation(type="list", formula1='"' + ",".join(KINDS) + '"', allow_blank=False); ws.add_data_validation(dv_kind); dv_kind.add(f"B{LR+6}")
dv_ldate = DataValidation(type="date", operator="greaterThan", formula1="36526"); dv_ldate.error = "日付を「10/30」のように入れてください。"; dv_ldate.showErrorMessage = True
ws.add_data_validation(dv_ldate); dv_ldate.add(f"B{LR+5}")
put(ws, f"C{LR+2}", "← 数字だけ（例：1）。「組」は自動", font=f(size=9, color="666666"))
put(ws, f"C{LR+1}", f'=IF(B{LR+6}="{KINDS[0]}","→ "&IF({IS6(f"B{LR+1}")},"進路面談","個人面談")&"のお知らせになります","")', font=f(size=9, color="666666"))
put(ws, f"A{LR+7}", "秋の本文", font=f(bold=True, color=PRIMARY_D), alignment=Alignment(vertical="top"))
put(ws, f"B{LR+7}", "【面談】の希望調査へのご協力ありがとうございました。下記の日程で予定を組ませていただきました。短い時間ですが、有意義な話し合いとし、日々の学級生活に生かしたいと思います。どうぞ、よろしくお願いいたします。",
    fill=INPUT, border=box, alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells(f"B{LR+7}:I{LR+9}")
put(ws, f"A{LR+10}", "秋の注意（表の下・3行）", font=f(bold=True, color=PRIMARY_D))
for k, v in enumerate(["〇来校の際には、名札・上履きをお持ちください。", None, None]):
    put(ws, f"B{LR+10+k}", v, fill=INPUT, border=box)
    ws.merge_cells(f"B{LR+10+k}:I{LR+10+k}")
put(ws, f"A{LR+13}", "夏の本文", font=f(bold=True, color=PRIMARY_D), alignment=Alignment(vertical="top"))
put(ws, f"B{LR+13}", "下記の日程で予定を組ませていただきました。どうぞ、よろしくお願いいたします。", fill=INPUT, border=box, alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells(f"B{LR+13}:I{LR+14}")
put(ws, f"A{LR+15}", "夏の注意（表の上・3行）", font=f(bold=True, color=PRIMARY_D))
for k, v in enumerate(["〇来校の際には、名札・上履きをお持ちください。", None, None]):
    put(ws, f"B{LR+15+k}", v, fill=INPUT, border=box)
    ws.merge_cells(f"B{LR+15+k}:I{LR+15+k}")
put(ws, f"A{LR+18}", "※ 本文の「【面談】」のところは、「個人面談」か「進路面談」に自動で変わります。", font=f(color="666666", size=9))
put(ws, f"A{LR+19}", "※ 本文は、秋は4行（140字）、夏は2行（82字）まで印刷されます。", font=f(color="666666", size=9))
L_BODY = f"{q(SET)}$B${LR+7}"
L_NOTES = [f"{q(SET)}$B${LR+10+k}" for k in range(3)]
S_BODY = f"{q(SET)}$B${LR+13}"
S_NOTES = [f"{q(SET)}$B${LR+15+k}" for k in range(3)]
KIND = f'IF({L_KIND}="個人面談","個人面談",IF({L_KIND}="進路面談","進路面談",IF({IS6(L_GRADE)},"進路面談","個人面談")))'
GR = f'IF({L_GRADE}="","　",{NOSUF(L_GRADE, "年")})&"年"&IF({L_CLASS}="","　",{NOSUF(L_CLASS, "組")})&"組"'

# ---------------------------------------------------------------- 名簿
# A番号 B名前 C兄弟 D兄弟クラス  E〜M：兄弟①〜③の（日付・時刻・順番）  N希望 O後ろを空ける（ここまで入力）
# P表示名 Q状況 R×の数 S入れられる空き枠 T決める順 U日付 V時刻 W注意 X自動案A Y自動案B Zリンク
ws = sheet(ROS)
heads = ["番号", "名前", "希望", "後ろを空ける", "兄弟", "兄弟クラス"]
for k in "①②③":
    heads += [f"兄弟{k}\n日付", f"兄弟{k}\n時刻", f"兄弟{k}\nとの順番"]
heads += ["表示名", "状況", "×の数", "入れられる空き枠", "決める順",
          "日付", "時刻", "注意", "自動案A（詰める）", "自動案B（散らす）", ""]
widths = [6, 16, 10, 16, 6, 16] + [15, 9, 11] * 3 + [18, 10, 7, 9, 7, 15, 8, 30, 22, 22, 9]
for i, (h, w) in enumerate(zip(heads, widths), start=1):
    ws.column_dimensions[CL(i)].width = w
    if h:
        put(ws, f"{CL(i)}4", h, font=f(bold=True), fill=HEAD, border=box, alignment=center)
ws.row_dimensions[4].height = 32
put(ws, "A1", "名簿・結果", font=f(size=16, bold=True))
put(ws, "A2", "黄色の列（番号〜兄弟③との順番）を入力します。Excelの名簿から番号と名前を「番号」の列のいちばん上に貼り付けてください（最大40人）。行の並べ替えはしないでください。", font=f(size=10, color="444444"))
put(ws, "A3", "兄弟の欄をダブルクリック（またはプルダウン）で〇 → 兄弟クラスと、兄弟①〜③の日時の欄が開きます。兄弟クラスの書き方は自由（例：2年1組、2-1、兄 5年）。", font=f(size=10, color="444444"), alignment=Alignment(wrap_text=True, vertical="center"))
ws.merge_cells("A3:E3")
button(ws, "F3", "日時欄を開く／閉じる", color="B7791F", size=9)
ws.row_dimensions[3].height = 40
dv_sib = DataValidation(type="list", formula1='"〇"', allow_blank=True)
dv_sday = DataValidation(type="list", formula1=f"={q(SET)}$E$11:$E${DL}", allow_blank=True)
dv_stime = DataValidation(type="list", formula1=f"={q(SET)}$I$11:$I${TL}", allow_blank=True)
dv_ord = [DataValidation(type="list", formula1=f'"兄弟{k}の前,兄弟{k}の後,どちらでも"', allow_blank=True) for k in "①②③"]
dv_hope = DataValidation(type="list", formula1='"' + ",".join(HOPES) + '"', allow_blank=True)
dv_gap = DataValidation(type="list", formula1='"必ず空けたい,出来れば空けたい,空けない"', allow_blank=True)
# 兄弟クラスのマスを選ぶと出る小さな説明（入力の制限はなし）
dv_shint = DataValidation(allow_blank=True, showInputMessage=True, promptTitle="兄弟の面談の日時",
                          prompt="兄弟の担任から聞いた日時は、右の「兄弟①〜③」の欄に入れます（欄が見えないときは、上の［兄弟の日時の欄］ボタン）。")
for dv_ in [dv_sib, dv_sday, dv_stime, dv_hope, dv_gap, dv_shint] + dv_ord:
    ws.add_data_validation(dv_)
for i in range(1, NS + 1):
    r, a = 4 + i, 9 + i          # a: 計算Aの行
    b = base(i)
    for c in "ABCDEFGHIJKLMNO":
        put(ws, f"{c}{r}", None, fill=INPUT, border=box, alignment=Alignment(vertical="center") if c in "BF" else Alignment(horizontal="center", vertical="center", shrink_to_fit=True))
    dv_sib.add(f"E{r}"); dv_hope.add(f"C{r}"); dv_gap.add(f"D{r}"); dv_shint.add(f"F{r}")
    for k in range(3):
        dv_sday.add(f"{CL(7+3*k)}{r}"); dv_stime.add(f"{CL(8+3*k)}{r}"); dv_ord[k].add(f"{CL(9+3*k)}{r}")
    put(ws, f"P{r}", f'=IF(B{r}="","",IF(COUNTIF($B$5:$B$49,B{r})>1,IF(A{r}="","",A{r}&" ")&B{r},B{r}))', border=box)   # 同じ名前がいるときだけ番号をつける
    stt = f"{q(INP)}F{b}"     # 提出状況
    put(ws, f"Q{r}", f'=IF(B{r}="","",IF({stt}="未提出","未提出",IF(R{r}>0,"入力済み",IF({stt}="×なし（どこでもOK）","×なし","未入力"))))', border=box, alignment=center)
    put(ws, f"R{r}", f'=IF(B{r}="","",{q(CA)}IN{a})', border=box, alignment=center)
    put(ws, f"S{r}", f'=IF(OR(Q{r}="入力済み",Q{r}="×なし"),{q(CA)}IM{a},"")', border=box, alignment=center)
    put(ws, f"T{r}", f'=IF({q(CA)}C{a}=1,COUNTIFS({q(CA)}$C$10:$C$54,1,{q(CA)}$IM$10:$IM$54,"<"&{q(CA)}IM{a})+1,"")', border=box, alignment=center)
    put(ws, f"U{r}", f'=IF({q(CA)}IO{a}=0,"",INDEX({q(SET)}$E$11:$E${DL},INDEX({q(CA)}$D$2:${JZ}$2,{q(CA)}IO{a})))', border=box)
    put(ws, f"V{r}", f'=IF({q(CA)}IO{a}=0,"",INDEX({q(SET)}$I$11:$I${TL},INDEX({q(CA)}$D$3:${JZ}$3,{q(CA)}IO{a})))', border=box, alignment=center)
    gapng = (f'AND(RIGHT(D{r},4)="空けたい",INDEX({q(CA)}${JA}${ROW_NEXT}:${JZ}${ROW_NEXT},{q(CA)}IO{a})=1,'
             f'INDEX({q(CA)}${JA}${ROW_OCC}:${JZ}${ROW_OCC},{q(CA)}IO{a}+1)=1)')
    nogapng = (f'IF(AND(D{r}="空けない",INDEX({q(CA)}${JA}${ROW_NEXT}:${JZ}${ROW_NEXT},{q(CA)}IO{a})=1,'
               f'INDEX({q(CA)}${JA}${ROW_OCC}:${JZ}${ROW_OCC},{q(CA)}IO{a}+1)=0),"（出来れば）すぐ後が空いています","")')
    put(ws, f"W{r}", f'=IF(P{r}="","",IF({q(CA)}JG{a}=1,"兄弟の日付・時刻が表にありません",IF(COUNTIF({GRID},P{r})>1,"2か所以上に入っています",IF({q(CA)}IO{a}>0,'
                     f'IF(INDEX({q(CA)}$D$4:${JZ}$4,{q(CA)}IO{a})=0,"使えない枠に入っています",IF(INDEX({q(CA)}$D${a}:${JZ}${a},{q(CA)}IO{a})=1,"×の枠に入っています",'
                     f'IF({q(CA)}IV{a}=0,"（出来れば）兄弟の前後ではありません",IF({gapng},IF(D{r}="必ず空けたい","後ろの枠が空いていません","（出来れば）後ろが空いていません"),{nogapng})))),'
                     f'IF(OR(Q{r}="入力済み",Q{r}="×なし"),"未決定","")))))', border=box)
    put(ws, f"X{r}", f'=IF({q(CA)}IK{a}=0,IF({q(CA)}IL{a}=1,"入る枠がありません",""),INDEX({q(CA)}$D$8:${JZ}$8,{q(CA)}IK{a}))', border=box)
    put(ws, f"Y{r}", f'=IF({q(CA)}IR{a}=0,IF({q(CA)}IS{a}=1,"入る枠がありません",""),INDEX({q(CA)}$D$8:${JZ}$8,{q(CA)}IR{a}))', border=box)
    put(ws, f"Z{r}", f'=HYPERLINK("#\'{INP}\'!B{b}","×入力へ")', font=f(color="2D5FA8", underline="single"), alignment=center)
ws.freeze_panes = "C5"
ws.auto_filter.ref = "A4:Y49"
# 兄弟が〇でない子は、兄弟の欄を灰色に
ws.conditional_formatting.add("F5:O49", FormulaRule(formula=['$E5=""'], fill=fill("E3E3E3"), border=box))
# 兄弟①〜③の9列は、兄弟が〇の子がいるときだけマクロで出す（開いたとき・〇を付けたとき・ボタン）
red_txt = Font(name=FONT, color="B23A3A", bold=True)
ws.conditional_formatting.add("W5:W49", FormulaRule(formula=['OR(W5="未決定",LEFT(W5,6)="（出来れば）")'], font=Font(name=FONT, color="9A6A00", bold=True)))
ws.conditional_formatting.add("W5:W49", FormulaRule(formula=['W5<>""'], font=red_txt))
ws.conditional_formatting.add("X5:Y49", FormulaRule(formula=['X5="入る枠がありません"'], font=red_txt))
ws.conditional_formatting.add("Q5:Q49", FormulaRule(formula=['OR(Q5="未入力",Q5="未提出")'], fill=fill("FBEFC9")))
ws.conditional_formatting.add("S5:S49", FormulaRule(formula=['AND(T5<>"",S5<=2)'], fill=fill("F6DEDB")))

# ---------------------------------------------------------------- ×入力
ws = sheet(INP)
ws.column_dimensions["A"].width = 10
ws.column_dimensions["B"].width = 9
for d in range(10):             # 列幅は10日分そろえる（見出しの行の文字が詰まらないように）
    ws.column_dimensions[CL(3 + d)].width = 15
put(ws, "B1", "×入力", font=f(size=16, bold=True))
put(ws, "B2", "都合の悪い枠をダブルクリック→「×」（もう一度で消える）。日付の上の欄→その日全部、時刻の左の欄→その時間全部。×が1つもない家庭は「提出状況」で「×なし（どこでもOK）」、出していない家庭は「未提出」。", font=f(size=10, color="444444"))
put(ws, "B3", "児童を選ぶ ▼", font=f(size=11, bold=True, color=PRIMARY_D), alignment=Alignment(horizontal="right", vertical="center"))
ws.merge_cells("B3:C3")
put(ws, "D3", None, fill=INPUT, border=box, font=f(size=12, bold=True), alignment=Alignment(vertical="center"))
ws.merge_cells("D3:E3")
dv_jump = DataValidation(type="list", formula1=f"={q(ROS)}$P$5:$P${4 + NS}", allow_blank=True)
ws.add_data_validation(dv_jump); dv_jump.add("D3")
button(ws, "G3", "▶ 次の未入力の子へ", size=11)
ws.merge_cells("G3:H3")
ws.row_dimensions[3].height = 30
dv_st = DataValidation(type="list", formula1='"×なし（どこでもOK）,未提出"', allow_blank=True)
dv_x = DataValidation(type="list", formula1='"×"', allow_blank=True)
dv_x.error = "「×」を選んでください（消すときは Delete）。"; dv_x.showErrorMessage = True
ws.add_data_validation(dv_st); ws.add_data_validation(dv_x)
XF = f(size=13, bold=True, color="B23A3A")
grid_r, day_r, time_r, lab_r = [], [], [], []
for i in range(1, NS + 1):
    b = base(i)
    put(ws, f"B{b}", f'=IF({q(ROS)}B{4+i}="","（名簿 {i}行目：なし）",{q(ROS)}P{4+i})', font=f(size=14, bold=True))
    put(ws, f"E{b}", "提出状況 ▶", alignment=Alignment(horizontal="right", vertical="center"))
    put(ws, f"F{b}", None, fill=INPUT, border=box, alignment=center)
    ws.merge_cells(f"F{b}:G{b}")
    dv_st.add(f"F{b}")
    put(ws, f"H{b}", "状況：", alignment=Alignment(horizontal="right"))
    put(ws, f"I{b}", f"={q(ROS)}Q{4+i}", font=f(bold=True))
    put(ws, f"J{b}", "×の数：", alignment=Alignment(horizontal="right"))
    put(ws, f"K{b}", f"={q(ROS)}R{4+i}", font=f(bold=True), alignment=Alignment(horizontal="left"))
    if i < NS:
        put(ws, f"L{b}", f'=HYPERLINK("#\'{INP}\'!B{base(i+1)}","次の人へ ▼")', font=f(bold=True, color=ACCENT, underline="single"), alignment=center)
    ws.row_dimensions[b].height = 26
    # この日全部×
    put(ws, f"A{b+1}", "この日全部 ▶", font=f(size=9, bold=True, color="B23A3A"), alignment=Alignment(horizontal="right", vertical="center"))
    ws.merge_cells(f"A{b+1}:B{b+1}")
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{b+1}", None, fill=ALLX, alignment=center, font=XF)
    dv_x.add(f"C{b+1}:{LC}{b+1}")
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
    grid_r.append(f"C{b+3}:{LC}{b+2+T}"); day_r.append(f"C{b+1}:{LC}{b+1}")
    time_r.append(f"A{b+3}:A{b+2+T}"); lab_r.append(f"B{b+3}:B{b+2+T}")
b1 = base(1)
tl = f"C{b1+3}"
jx = f"(COLUMN({tl})-3)*{T}+MOD(ROW({tl})-5,{BLK})-2"
hide_rules(ws, " ".join(grid_r), f"{EXIST(jx)}=0", [
    (f"INDEX({q(CA)}${JA}$4:${JZ}$4,{jx})=0", GRAY, None),
    (f'OR({tl}<>"",INDEX({q(CA)}${JA}$10:${JZ}$54,INT((ROW({tl})-5)/{BLK})+1,{jx})=1)', fill("F6DEDB"), None),
])
hide_rules(ws, " ".join(day_r), f'INDEX({q(SET)}$B$11:$B${DL},COLUMN(C{b1+1})-2)=""', [])
hide_rules(ws, " ".join(time_r), f'$B{b1+3}=""', [])
hide_rules(ws, " ".join(lab_r), f'B{b1+3}=""', [], frame=False)
ws.freeze_panes = "A5"
# 使わない時刻の行は、フィルターで隠す（S列：表示／隠す。設定で枠の数を変えたら Ctrl＋Alt＋L で隠し直す）
IEND = base(NS) + BLK - 1
ws["S4"] = "表示"
for r in range(5, IEND + 1):
    t = (r - 5) % BLK - 2
    ws[f"S{r}"] = f'=IF({t}<={q(SET)}$B$6,"表示","隠す")' if 1 <= t <= T else "表示"
ws.column_dimensions["S"].hidden = True
INP_FILTER = (f"A4:S{IEND}", 18, 4, IEND)
REFILTER = ('"⚠ 設定で枠の数が変わりました。このシートで Ctrl＋Alt＋L を押してください（押すと時刻の行が合います）"')
REFILTER2 = ('"⚠ 設定で枠の数が変わりました。このシートで Ctrl＋Alt＋L を押してください"&CHAR(10)&"（押さないと、増えた時刻の行が印刷されません）"')
put(ws, "B4", f'=IF(SUBTOTAL(103,S5:S{IEND})<>COUNTIF(S5:S{IEND},"表示"),{REFILTER},"")', font=f(size=14, bold=True, color="FFFFFF"), alignment=Alignment(horizontal="center", vertical="center"))
ws.merge_cells("B4:L4"); ws.row_dimensions[4].height = 34
ws.conditional_formatting.add("B4:L4", FormulaRule(formula=['$B$4<>""'], fill=fill("D62828")))


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
jexpr = grid_frame(ws, "調整・決定", "ここに入れた人は、自動案では動きません（固定）。名前をクリック→入れられる枠に色。ダブルクリック2回で入れ替え（空いたマスなら移動）。プルダウンでも手直しできます。")
dv_name = DataValidation(type="list", formula1=f"={q(ROS)}$P$5:$P$49", allow_blank=True)
dv_name.error = "名簿にある児童を選んでください。"
dv_name.showErrorMessage = True
ws.add_data_validation(dv_name)
for t in range(1, T + 1):
    for d in range(1, D + 1):
        put(ws, f"{CL(2+d)}{5+t}", None, alignment=center)
dv_name.add(f"C6:{LC}{GL}")
ws.column_dimensions[PS].width = 3
ws.column_dimensions[PL].width = 22
ws.column_dimensions[PV].width = 40
put(ws, f"{PL}4", "児童を選ぶ ▼", font=f(bold=True))
arr(ws, "C4", f'=IF({q(CA)}$A$5<>"","入れ替え：「"&{q(CA)}$B$5&"」を選んでいます。入れ替える相手（空いたマスなら移動先）をダブルクリック。やめるときは同じマスをもう一度ダブルクリック。",IF(SUMPRODUCT(_xlfn.ISFORMULA(C6:{LC}{GL})*1)>0,"⚠ ふつうの貼り付けになっています。［ひとつ前に戻す］を押すか、［値の貼り付け］（右クリック →「値」）をしてください。",""))',
    font=f(size=11, bold=True, color="B23A3A"), alignment=Alignment(vertical="center", wrap_text=True))
ws.merge_cells(f"C4:{LC}4")
ws.row_dimensions[4].height = 32
button(ws, f"{PL}3", "▶ ひとつ前に戻す", color="7A8699")
ws.conditional_formatting.add("C4", FormulaRule(formula=[f'{q(CA)}$A$5<>""'], fill=fill("FFE4C2"), font=Font(name=FONT, size=11, bold=True, color="7A3D00")))
# 入れ替えで1人目に選んだマス（オレンジ）：ほかの色より先に
ws.conditional_formatting.add(f"C6:{LC}{GL}", FormulaRule(formula=[f'ADDRESS(ROW(),COLUMN())={q(CA)}$A$5'], fill=fill("FFE4C2"),
    font=Font(name=FONT, bold=True, color="7A3D00"), border=Border(left=Side(style="thin", color="E07A00"), right=Side(style="thin", color="E07A00"), top=Side(style="thin", color="E07A00"), bottom=Side(style="thin", color="E07A00")), stopIfTrue=True))
put(ws, f"{PL}5", None, fill=INPUT, border=box, font=f(size=12, bold=True))
ws.merge_cells(f"{PL}5:{PV}5")
dv_name.add(f"{PL}5")
info = [
    (7, "状況", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$Q$5:$Q$49,{q(CA)}$B$8))'),
    (8, "×の数", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$R$5:$R$49,{q(CA)}$B$8))'),
    (9, "今の枠", f'=IF({q(CA)}$B$8=0,"",INDEX({q(ROS)}$U$5:$U$49,{q(CA)}$B$8)&" "&INDEX({q(ROS)}$V$5:$V$49,{q(CA)}$B$8))'),
    (10, "兄弟", f'=IF({q(CA)}$B$8=0,"",IF(INDEX({q(ROS)}$E$5:$E$49,{q(CA)}$B$8)="","",INDEX({q(ROS)}$F$5:$F$49,{q(CA)}$B$8)&"　"&INDEX({q(ROS)}$G$5:$G$49,{q(CA)}$B$8)&" "&INDEX({q(ROS)}$H$5:$H$49,{q(CA)}$B$8)))'),
]
for r, lab, fo in info:
    put(ws, f"{PL}{r}", lab, font=f(color="666666"))
    put(ws, f"{PV}{r}", fo, font=f(bold=True), alignment=Alignment(horizontal="left"))
put(ws, f"{PL}11", "入れられる空き枠", font=f(color="666666"))
arr(ws, f"{PV}11", f'=IFERROR(IF({q(CA)}$B$8=0,"",_xlfn.TEXTJOIN("、",TRUE,IF((INDEX({q(CA)}${JA}$60:${JZ}$104,{q(CA)}$B$8,0)=1)*({q(CA)}${JA}$7:${JZ}$7=0),{q(CA)}${JA}$8:${JZ}$8,""))),"")',
    alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells(f"{PV}11:{PV}16")
# 色の見かた：表のすぐ上（3行目）に、色見本の画像を貼る（9つあってセルには入りきらないため）
legend = [("C5D7F4", "選んだ児童"), ("D6F0DF", "入れられる"), ("FBEFC9", "入れられる（他の人あり）"),
          ("F6DEDB", "×の枠"), ("B23A3A", "×・使えない枠に入れた！"), ("F2B36B", "2か所に入っている"),
          ("C9B3E6", "空けるはずの枠に人がいる"), (None, "後ろを空ける枠"), ("D9D9D9", "先生の都合で使えない")]
ws.add_image(legend_image(legend, 100 * D, 72), "C3")
ws.row_dimensions[3].height = 56
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
            f'IF(AND({x}<>"",COUNTIF($C$6:${LC}${GL},{x})>1),3,IF({A_(4)}=0,4,'
            f'IF(AND({x}<>"",{A_(ROW_GAPBLK)}=1),5,IF(AND({x}="",{A_(ROW_GAPBLK)}=1),6,'
            f'IF(AND({x}<>"",{x}=${PL}$5),7,IF({ngsel}=1,8,IF(AND({x}="",{oksel}=1),9,'
            f'IF(AND({x}<>"",{oksel}=1),10,IF(AND({x}="",{A_(5)}=1),11,12))))))))))))')
RED_F = Font(name=FONT, color="FFFFFF", bold=True)
hide_rules(ws, f"C6:{LC}{GL}", "AA6=0", [
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
hide_rules(ws, f"C{CH+1}:{LC}{CH+T}", f"AA{CH+1}=0", [
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
                f'=IF({q(CA)}{jc(j)}$4=0,"",IF({g}<>"",{g},IFERROR(INDEX({q(ROS)}$P$5:$P$49,INDEX({q(eng)}$B$3:$B$47,MATCH({j},{q(eng)}$C$3:$C$47,0))),"")))',
                alignment=center)
    hide_rules(ws, f"C6:{LC}{GL}", f"{EXIST(jexpr)}=0", [
        (f"INDEX({q(CA)}${JA}$4:${JZ}$4,{jexpr})=0", GRAY, None),
        (f'AND(C6<>"",{q(ASG)}C6="")', fill("D6F0DF"), Font(name=FONT, bold=True)),
        (f'AND(C6="",INDEX({q(CA)}${JA}${blk_row}:${JZ}${blk_row},{jexpr})+INDEX({q(CA)}${JA}${ROW_GAPBLK}:${JZ}${ROW_GAPBLK},{jexpr})>0)', PatternFill("lightUp", fgColor="5B8BD0"), None),
        (f'AND(C6="",INDEX({q(CA)}${JA}$5:${JZ}$5,{jexpr})=1)', PatternFill("lightUp", fgColor="BBBBBB"), None),
    ])
    put(ws, "C4", f'=IF({SWON}=0,"まだ自動案を作っていません。集まった分で作るときは、右上の［自動案を作る］を押してください（未提出の家庭がいても大丈夫です）。",'
                  f'IF({SWON}=2,"⚠ 自動案を作ったあとに、×・名簿・設定・調整・決定が変わりました。もう一度［自動案を作る］を押してください（いまの表は前に作ったときの案です）。",'
                  f'"最後に作った時："&TEXT({q(CB)}$D$1,"m/d h:mm")&"　「調整・決定」に入れた人は、自動案では動きません（その枠に固定）。全部作り直したいときは、調整・決定の表の名前を消してください。"))',
        font=f(size=10, bold=True, color="8A4B00"), fill=fill("FFF4D6"), alignment=Alignment(wrap_text=True, vertical="center", indent=1),
        border=Border(left=Side(style="medium", color="C77D1A"), right=Side(style="medium", color="C77D1A"), top=Side(style="medium", color="C77D1A"), bottom=Side(style="medium", color="C77D1A")))
    ws.merge_cells(f"C4:{LC}4")
    ws.row_dimensions[4].height = 56
    ws.conditional_formatting.add(f"C4:{LC}4", FormulaRule(formula=[f'{SWON}<>1'], fill=fill("D62828"), font=Font(name=FONT, size=11, bold=True, color="FFFFFF")))
    button(ws, f"{PL}3", "▶ 自動案を作る（A・B両方）")
    button(ws, f"{PV}3", "▶ この案を「調整・決定」へ写す", color="3C8D3C")
    put(ws, "C3", "新しく入った人", fill=fill("D6F0DF"), font=f(size=9, bold=True), alignment=center, border=box)
    put(ws, "D3", "後ろを空ける枠", fill=PatternFill("lightUp", fgColor="5B8BD0"), font=f(size=9, bold=True), alignment=center, border=box)
    put(ws, "E3", "なるべく空ける日・休憩", fill=PatternFill("lightUp", fgColor="BBBBBB"), font=f(size=9, bold=True), alignment=center, border=box)
    put(ws, "F3", "先生の都合で使えない", fill=fill("D9D9D9"), font=f(size=9, bold=True), alignment=center, border=box)
    ws.row_dimensions[3].height = 40
    ws.column_dimensions[PS].width = 3
    ws.column_dimensions[PL].width = 30
    ws.column_dimensions[PV].width = 40
    put(ws, f"{PL}5", "決定済み（調整・決定シート）", font=f(color="666666"))
    put(ws, f"{PV}5", f'=SUMPRODUCT(({GRID}<>"")*1)&" 人"', font=f(bold=True))
    put(ws, f"{PL}6", "自動で新しく入った", font=f(color="666666"))
    put(ws, f"{PV}6", f'=SUMPRODUCT(({q(eng)}$B$3:$B$47>0)*({q(eng)}$C$3:$C$47>0))&" 人"', font=f(bold=True))
    put(ws, f"{PL}8", "入る枠がない（×・必ず空けたい）", font=f(color="B23A3A", bold=True))
    arr(ws, f"{PV}8", f'=_xlfn.TEXTJOIN("、",TRUE,IF({q(CA)}${nofit_col}$10:${nofit_col}$54=1,{q(CA)}$B$10:$B$54,""))', font=red_txt, alignment=Alignment(wrap_text=True, vertical="top"))
    put(ws, f"{PL}10", "未入力・未提出で外した", font=f(color="9A6A00", bold=True))
    arr(ws, f"{PV}10", f'=_xlfn.TEXTJOIN("、",TRUE,IF((({q(ROS)}$Q$5:$Q$49="未入力")+({q(ROS)}$Q$5:$Q$49="未提出"))*({q(CA)}$IO$10:$IO$54=0),{q(ROS)}$P$5:$P$49,""))', alignment=Alignment(wrap_text=True, vertical="top"))
    put(ws, f"{PL}12", "なるべく空けたい枠を使った", font=f(color="666666"))
    put(ws, f"{PV}12", f'=SUM({q(eng)}$D$3:$D$47)&" 枠"', font=f(bold=True))
    put(ws, f"{PL}13", "日ごとの人数", font=f(color="666666"))
    for d in range(1, D + 1):    # 日ごとの人数（使っている日だけ）
        put(ws, f"{PL}{13+d}", f'=IF({q(SET)}$E${10+d}="","",{q(SET)}$E${10+d})', font=f(size=10), alignment=Alignment(horizontal="right"))
        put(ws, f"{PV}{13+d}", f'=IF({PL}{13+d}="","",COUNTIF({CL(2+d)}6:{CL(2+d)}{GL},"?*")&" 人")', font=f(size=10, bold=True))
    ws.merge_cells(f"{PV}8:{PV}9"); ws.merge_cells(f"{PV}10:{PV}11")
    ws.row_dimensions[8].height = 30; ws.row_dimensions[10].height = 30
    ws.freeze_panes = "C6"
    wb.defined_names[tname] = DefinedName(tname, attr_text=f"{q(name)}$C$6:${LC}${GL}")


from openpyxl.workbook.defined_name import DefinedName
auto_sheet(AUT, "自動案A（詰める）",
           "入れられる枠が少ない家庭から順に、設定の「詰め方」で詰めて組んだ案です。緑が新しく入った人。よければ［この案を「調整・決定」へ写す］を押します。",
           CB, ROW_AUTOBLK, "IK", "IL", "自動案Aの表")
auto_sheet(AUTB, "自動案B（散らす）",
           "日ごとの人数がそろい、面談と面談のあいだがなるべく空くように組んだ案です（希望がある家庭は希望を優先）。よければ［この案を「調整・決定」へ写す］を押します。",
           CC, ROW_AUTOBLK_B, "IR", "IS", "自動案Bの表")

# ---------------------------------------------------------------- 印刷（兄弟確認）：予定表の形で、決めた日程を印刷する
ws = sheet(SIB)
grid_frame(ws, "兄弟確認用", "「調整・決定」で決めた日程を、予定表と同じ形で印刷します（A4たて）。兄弟がいる子は色付きで、名前の下に兄弟のクラスが出ます。表の上の黄色の欄は自由に書けます。")
# 見出し：面談の種類・クラス・担任名は設定から（設定のいちばん下の「お手紙」の欄）
put(ws, "B3", f'={KIND}&"日程　"&{GR}&"　担任　"&{L_TEACH}', font=f(size=14, bold=True, color=PRIMARY_D), alignment=Alignment(horizontal="left", vertical="center"))
ws.merge_cells(f"B3:{LC}3")
ws.row_dimensions[3].height = 28
# 自由に書く欄（何か書くと白くなって、そのまま印刷される。空のときだけ黄色）
put(ws, "B4", None, font=f(size=11), alignment=Alignment(wrap_text=True, vertical="center", indent=1))
ws.merge_cells(f"B4:{LC}4")
ws.row_dimensions[4].height = 48
ws.conditional_formatting.add(f"B4:{LC}4", FormulaRule(formula=['$B$4=""'], fill=INPUT))
ws.conditional_formatting.add(f"B4:{LC}4", FormulaRule(formula=["TRUE"], border=box))
put(ws, f"{PL}4", "◀ 自由に書けます（例：組んでみました。都合が悪ければお知らせください。）", font=f(size=10, bold=True, color="9A6A00"), alignment=Alignment(vertical="center", wrap_text=True))
ws.merge_cells(f"{PL}4:{PV}4")
ws.column_dimensions[PS].width = 3
ws.column_dimensions[PL].width = 20
ws.column_dimensions[PV].width = 22
button(ws, f"{PL}3", "▶ 印刷プレビュー")
button(ws, f"{PV}3", "▶ PDFで保存", color="D9822B")
for t in range(1, T + 1):
    for d in range(1, D + 1):
        x = f"{q(ASG)}{CL(2+d)}{5+t}"
        sib = f'IFERROR(INDEX({q(ROS)}$E$5:$E$49,MATCH({x},{q(ROS)}$P$5:$P$49,0))<>"",FALSE)'
        memo = f'INDEX({q(ROS)}$F$5:$F$49,MATCH({x},{q(ROS)}$P$5:$P$49,0))'
        put(ws, f"{CL(2+d)}{5+t}", f'=IF({x}="","",{x}&IF({sib},CHAR(10)&{memo},""))',
            alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
        # 見えない列（AA〜）：色の番号 0=ない枠 1=兄弟あり 2=ふつう
        ws[f"{CL(26+d)}{5+t}"] = f'=IF({q(CA)}{jc(sj(d, t))}${ROW_EXIST}=0,0,IF({sib},1,2))'
    ws.row_dimensions[5 + t].height = 34
hide_rules(ws, f"C6:{LC}{GL}", "AA6=0", [("AA6=1", fill("E3D7F2"), Font(name=FONT, bold=True, color="3F2A66"))])
for d in range(1, D + 1):
    ws.column_dimensions[CL(26 + d)].hidden = True
# 印刷の範囲は、設定した日数・枠の数に合わせて変わる（下の「見た目の仕上げ」で名前を付ける）
SIB_WS = ws
# お手紙と同じく A4たて・表の幅はページいっぱい（時刻2.22cm＋日付2.99cm×5＝17.17cm。6日・枠が多いときだけ縮小）
CM = lambda cm: round((cm / 2.54 * 96 - 5) / 7, 2)       # cm → Excelの列幅
ws.column_dimensions["B"].width = CM(2.22)
for d in range(D):
    ws.column_dimensions[CL(3 + d)].width = CM(2.99)
ws.page_setup.orientation = "portrait"; ws.page_setup.paperSize = 9
ws.page_margins.left = ws.page_margins.right = 0.75; ws.print_options.horizontalCentered = True
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 1
ws.freeze_panes = "C6"

# ---------------------------------------------------------------- お手紙（秋）：保護者へのお知らせ（A4たて・枠が少ないとき）
ws = sheet(LET)
# Wordのお手紙と同じ寸法（A4、左右の余白3cm・上3.5cm、表は幅17.19cmでページの中央、本文は1行35字・行の間隔18pt）
CM = lambda cm: round((cm / 2.54 * 96 - 5) / 7, 2)       # cm → Excelの列幅
# 3日目（F:G）と5日目（I:J）は2列をつなげる。G〜I が日付・学校名・担任名の枠（幅6cm、右はしは右の余白）
for col, cm in zip("ABCDEFGHIJK", [0.3, 1.095, 1.125, 2.99, 2.99, 1.875, 1.115, 2.99, 1.895, 1.095, 2.99]):
    ws.column_dimensions[col].width = CM(cm)
DCOL = ["D", "E", "F", "H", "I", "K"]                       # 日付の列
PAIR = {"F": "G", "I": "J"}                                 # つなげる2列
put(ws, "B1", "お手紙（秋）", font=f(size=16, bold=True))
put(ws, "B2", "保護者へのお知らせです。宛名・日付・本文などは「設定」のいちばん下で決めます。このまま印刷できます（A4たて）。", font=f(size=10, color="444444"))
MIN_ = lambda sz=12: Font(name="ＭＳ 明朝", size=sz)
MARU = lambda sz: Font(name="HG丸ｺﾞｼｯｸM-PRO", size=sz)
R_ = Alignment(horizontal="right", vertical="center")
DIST = Alignment(horizontal="distributed", vertical="center")     # 枠の中で均等割り付け
L_ = Alignment(horizontal="left", vertical="center")
for r, h in ((4, 23.8), (5, 18), (6, 18), (7, 18), (8, 36), (9, 18), (10, 18), (11, 18), (12, 18), (13, 18), (14, 18), (15, 11.2)):
    ws.row_dimensions[r].height = h
put(ws, "C5", f'={GR}&"　保護者様"', font=MIN_(), alignment=L_)
LDATE = f'IFERROR(IF({L_DATE}="","","令和"&(YEAR({L_DATE})-2018)&"年"&MONTH({L_DATE})&"月"&DAY({L_DATE})&"日（"&CHOOSE(WEEKDAY({L_DATE}),"日","月","火","水","木","金","土")&"）"),{L_DATE}&"")'   # 日付を文字で入れたときは、そのまま出す
for r, fo in ((5, LDATE), (6, f'IF({L_SCHOOL}="","",{L_SCHOOL})'), (7, f'{GR}&"　担任　"&{L_TEACH}')):
    put(ws, f"G{r}", f"={fo}", font=MIN_(), alignment=DIST)
    ws.merge_cells(f"G{r}:I{r}")
put(ws, "C8", f'={KIND}&"のお知らせ"', font=Font(name="ＭＳ ゴシック", size=24), alignment=center)
ws.merge_cells("C8:I8")
BODY = f'SUBSTITUTE({L_BODY},"【面談】",{KIND})'
for k in range(4):                                       # 本文は1行35字で4行まで（Wordと同じ折り返し）
    put(ws, f"C{10+k}", f'=MID({BODY},{1+35*k},35)', font=MIN_(), alignment=L_)
put(ws, "C14", "記", font=MIN_(), alignment=center)
ws.merge_cells("C14:I14")
LH = 16                          # 表の見出しの行
ws.row_dimensions[LH].height = 17.3
ws.merge_cells(f"B{LH}:C{LH}"); ws.merge_cells(f"F{LH}:G{LH}"); ws.merge_cells(f"I{LH}:J{LH}")
for d in range(1, D + 1):
    put(ws, f"{DCOL[d-1]}{LH}", f'={ZEN(f"{q(SET)}$E${10+d}")}', font=MIN_(8), alignment=center)
for t in range(1, T + 1):
    r = LH + t
    ws.row_dimensions[r].height = 33.5
    ws.merge_cells(f"B{r}:C{r}"); ws.merge_cells(f"F{r}:G{r}"); ws.merge_cells(f"I{r}:J{r}")
    tm = f"{q(SET)}$I${10+t}"
    put(ws, f"B{r}", f'=IF({tm}="","",{ZEN(f'SUBSTITUTE({tm},"〜","")')}&"～")', font=MIN_(9), alignment=center)
    for d in range(1, D + 1):
        g = f"{q(ASG)}{CL(2+d)}{5+t}"
        put(ws, f"{DCOL[d-1]}{r}", f'=IF({g}="","",{g})', font=MIN_(11), alignment=center)
# 表の線：使う日・時刻のところだけ（使わない日は線も消える）
BLK_SIDE = Side(style="thin", color="000000")
BLACK = Border(left=BLK_SIDE, right=BLK_SIDE, top=BLK_SIDE, bottom=BLK_SIDE)     # Wordと同じ黒い線
ws.conditional_formatting.add(f"B{LH}:C{LH}", FormulaRule(formula=["TRUE"], border=BLACK))
for d in range(1, D + 1):
    c = DCOL[d - 1]; c2 = PAIR.get(c, c)
    ws.conditional_formatting.add(f"{c}{LH}:{c2}{LH+T}", FormulaRule(formula=[f'${c}${LH}<>""'], border=BLACK))
ws.conditional_formatting.add(f"B{LH+1}:C{LH+T}", FormulaRule(formula=[f'$B{LH+1}<>""'], border=BLACK))
LF = LH + T + 1                  # 表の下
ws.row_dimensions[LF].height = 18
for r in range(LF + 1, LF + 6):
    ws.row_dimensions[r].height = 18
put(ws, f"I{LF+1}", "（敬称略）", font=MIN_(), alignment=R_)
for k in range(3):
    put(ws, f"C{LF+3+k}", f'=IF({L_NOTES[k]}="","",{L_NOTES[k]})', font=MIN_(), alignment=L_)
LEND = LF + 5
# 使わない時刻の行は、フィルターで隠す（L列：表示／隠す。設定を変えたら Ctrl＋Alt＋L で隠し直す）
for r in range(LH, LEND + 1):
    t = r - LH
    ws[f"L{r}"] = f'=IF({t}<={q(SET)}$B$6,"表示","隠す")' if 1 <= t <= T else "表示"
ws.column_dimensions["L"].hidden = True
ws.page_setup.orientation = "portrait"; ws.page_setup.paperSize = 9
ws.sheet_properties.pageSetUpPr.fitToPage = True          # 6日のとき・枠が多いときだけ縮小（ふだんは100%）
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 1
ws.print_options.horizontalCentered = True
ws.page_margins.left = ws.page_margins.right = 0.75; ws.page_margins.top = 3.5 / 2.54; ws.page_margins.bottom = 3.0 / 2.54
ws.page_margins.header = ws.page_margins.footer = 0
LET_FILTER = (f"B{LH}:L{LEND}", 10, LH, LEND)
button(ws, "M4", "▶ 印刷プレビュー")
button(ws, "M6", "▶ PDFで保存", color="D9822B")
put(ws, "M8", "1日の枠が13以上なら夏の形、12以下なら秋の形で印刷・保存します", font=f(size=9, color="666666"), alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells("M8:M11")
for r_ in (4, 6):
    ws.merge_cells(f"M{r_}:M{r_+1}")
put(ws, "B3", f'=IF(SUBTOTAL(103,L{LH+1}:L{LEND})<>COUNTIF(L{LH+1}:L{LEND},"表示"),{REFILTER2},"")', font=f(size=13, bold=True, color="FFFFFF"), alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
ws.merge_cells("B3:K3"); ws.row_dimensions[3].height = 48
ws.conditional_formatting.add("B3:K3", FormulaRule(formula=['$B$3<>""'], fill=fill("D62828")))

# ---------------------------------------------------------------- お手紙（夏）：午前・午後の枠が多いとき（Wordの夏用と同じ寸法）
# A4たて・余白1.27cm、表は幅17.75cm（時刻2.66cm＋日付3.09・3.0cm）、行の高さ0.72cm、注意は表の上、午前と午後のあいだに太い線
ws = sheet(LES)
for col, cm in zip("ABCDEFGH", [0.3, 2.66, 3.09, 3.0, 3.0, 3.0, 3.0, 3.0]):
    ws.column_dimensions[col].width = CM(cm)
SCOL = ["C", "D", "E", "F", "G", "H"]
put(ws, "B1", "お手紙（夏）", font=f(size=16, bold=True))
put(ws, "B2", "保護者へのお知らせ（夏用：午前・午後の枠が多いときの形）。宛名・日付・本文などは「設定」のいちばん下で決めます。このまま印刷できます（A4たて）。", font=f(size=10, color="444444"))
for r, h in ((4, 26.1), (5, 18), (6, 18), (7, 18), (8, 36), (9, 18), (10, 18), (11, 18), (12, 18), (13, 18), (14, 18), (15, 18), (16, 18), (17, 13.7)):
    ws.row_dimensions[r].height = h
put(ws, "B5", f'={GR}&"　保護者様"', font=MIN_(), alignment=L_)
for r, fo in ((5, LDATE), (6, f'IF({L_SCHOOL}="","",{L_SCHOOL})'), (7, f'{GR}&"　担任　"&{L_TEACH}')):
    put(ws, f"F{r}", f"={fo}", font=MIN_(), alignment=DIST)     # 日付・学校名・担任名は F:G の枠（幅6cm）で均等割り付け
    ws.merge_cells(f"F{r}:G{r}")
put(ws, "B8", f'={KIND}&"のお知らせ"', font=Font(name="ＭＳ ゴシック", size=20), alignment=center)
ws.merge_cells("B8:G8")
SB = f'SUBSTITUTE({S_BODY},"【面談】",{KIND})'
for k in range(2):                                       # 本文は1行41字で2行まで
    put(ws, f"B{10+k}", f'=MID({SB},{1+41*k},41)', font=MIN_(), alignment=L_)
put(ws, "B12", "記", font=MIN_(), alignment=center)
ws.merge_cells("B12:G12")
for k in range(3):                                       # 表の上の注意（空の行はフィルターで隠す）
    put(ws, f"B{14+k}", f'=IF({S_NOTES[k]}="","",{S_NOTES[k]})', font=MIN_(), alignment=L_)
SH = 18                                                  # 表の見出しの行
ws.row_dimensions[SH].height = 23.5
for d in range(1, D + 1):
    put(ws, f"{SCOL[d-1]}{SH}", f'={ZEN(f"{q(SET)}$E${10+d}")}', font=MIN_(8), alignment=center)
AM0, SEP, PM0 = SH + 1, SH + 1 + T, SH + 2 + T          # 午前の行・太い線の行・午後の行
NA = f"MIN({N1},{q(SET)}$B$6)"                           # 午前（時間帯1）の枠の数
for k in range(1, T + 1):
    for r, t in ((AM0 + k - 1, f"{k}"), (PM0 + k - 1, f"{NA}+{k}")):
        ws.row_dimensions[r].height = 20.9
        tm = f"INDEX({q(SET)}$I$11:$I${TL},{t})"
        put(ws, f"B{r}", f'=IFERROR(IF({tm}="","",{ZEN(f'SUBSTITUTE({tm},"〜","")')}),"")', font=MIN_(9), alignment=center)
        for d in range(1, D + 1):
            g = f"INDEX({q(ASG)}${CL(2+d)}$6:${CL(2+d)}${GL},{t})"
            put(ws, f"{SCOL[d-1]}{r}", f'=IFERROR(IF({g}="","",{g}),"")', font=MIN_(11), alignment=center)
ws.row_dimensions[SEP].height = 2.5
for c in ["B"] + SCOL:                                   # 午前と午後のあいだの太い線（黒くぬった細い行）
    ws.conditional_formatting.add(f"{c}{SEP}", FormulaRule(formula=["TRUE" if c == "B" else f'{c}${SH}<>""'], fill=fill("000000")))
ws.conditional_formatting.add(f"B{SH}", FormulaRule(formula=["TRUE"], border=BLACK))
ws.conditional_formatting.add(f"B{AM0}:B{PM0+T-1}", FormulaRule(formula=[f'$B{AM0}<>""'], border=BLACK))
for c in SCOL:
    ws.conditional_formatting.add(f"{c}{SH}:{c}{PM0+T-1}", FormulaRule(formula=[f'AND({c}${SH}<>"",OR(ROW()={SH},$B{SH}<>""))'], border=BLACK))
SEND = PM0 + T - 1
# 隠す行：使わない時刻の行・午後がないときの太い線・空の注意の行（M列：表示／隠す）
for r in range(SH, SEND + 1):
    if AM0 <= r < SEP:
        fo = f'=IF({r - AM0 + 1}<={NA},"表示","隠す")'
    elif r == SEP:
        fo = f'=IF({q(SET)}$B$6>{NA},"表示","隠す")'
    elif r >= PM0:
        fo = f'=IF({NA}+{r - PM0 + 1}<={q(SET)}$B$6,"表示","隠す")'
    else:
        fo = "表示"
    ws[f"M{r}"] = fo
for k in range(3):
    ws[f"M{14+k}"] = f'=IF(B{14+k}="","隠す","表示")'
ws["M13"] = ws["M17"] = "表示"
ws.column_dimensions["M"].hidden = True
ws.page_setup.orientation = "portrait"; ws.page_setup.paperSize = 9
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 1
ws.page_margins.left = ws.page_margins.right = ws.page_margins.top = ws.page_margins.bottom = 0.5
ws.page_margins.header = ws.page_margins.footer = 0
LES_FILTER = ("B13:M" + str(SEND), 11, 13, SEND)
ws.column_dimensions["J"].width = 20
button(ws, "J4", "▶ 印刷プレビュー")
button(ws, "J6", "▶ PDFで保存", color="D9822B")
put(ws, "J8", "1日の枠が13以上なら夏の形、12以下なら秋の形で印刷・保存します", font=f(size=9, color="666666"), alignment=Alignment(wrap_text=True, vertical="top"))
ws.merge_cells("J8:J11")
for r_ in (4, 6):
    ws.merge_cells(f"J{r_}:J{r_+1}")
put(ws, "B3", f'=IF(SUBTOTAL(103,M14:M{SEND})<>COUNTIF(M14:M{SEND},"表示"),{REFILTER2},"")', font=f(size=13, bold=True, color="FFFFFF"), alignment=Alignment(horizontal="center", vertical="center", wrap_text=True))
ws.merge_cells("B3:H3"); ws.row_dimensions[3].height = 48
ws.conditional_formatting.add("B3:H3", FormulaRule(formula=['$B$3<>""'], fill=fill("D62828")))

# ---------------------------------------------------------------- 計算A（×・入れられる枠・児童ごとの集計）
ws = sheet(CA)
put(ws, "A1", "計算用（さわらないでください）", font=f(bold=True, color="B23A3A"))
labels = {1: "枠番号", 2: "日", 3: "時", 4: "使える", 5: "空けたい", 6: "優先順", 7: "決定済み", 8: "表示"}
for r, lab in labels.items():
    put(ws, f"C{r}", lab)
put(ws, "A2", "時間帯の枠数"); put(ws, "B3", "←時間帯1"); put(ws, "B4", "←時間帯2")
ws["A6"] = f"=IF({q(CB)}$B$1<>1,0,IF(ABS(A7-{q(CB)}$C$1)<0.5,1,2))"; put(ws, "B6", "←自動案　0：まだ　1：作った　2：作ったあとに入力が変わった")
# 入力の合計（入れられる枠・決めた枠・後ろを空ける・希望・兄弟など）。自動案を作ったときと変わったら知らせる
FPR = lambda rng, w: f"SUMPRODUCT({rng}*(ROW({rng})*{w}+COLUMN({rng})))"
ws["A7"] = ("=" + "+".join([FPR(f"${JA}$60:${JZ}${59 + NS}", 1000), FPR(f"${JA}${ROW_GAPBLK}:${JZ}${ROW_NOGAP}", 7),
                              FPR(f"${JA}$5:${JZ}$7", 3), FPR(f"$C$10:$C${9 + NS}", 11), FPR(f"$IO$10:$IQ${9 + NS}", 13),
                              FPR(f"$IW$10:$IX${9 + NS}", 17), FPR(f"$JC$10:$JF${9 + NS}", 19), FPR(f"$HA$10:$HO${9 + NS}", 23)]))
put(ws, "B7", "←入力の合計")
put(ws, "A5", None); put(ws, "B5", None)      # 入れ替えで選んだマス（マクロが書く）
ok3 = "AND(ISNUMBER('設定'!$B$3),ISNUMBER('設定'!$D$3),ISNUMBER('設定'!$B$5))"
put(ws, "A3", f"=IF({ok3},IF(AND('設定'!$B$5>0,'設定'!$D$3>='設定'!$B$3),ROUND(('設定'!$D$3-'設定'!$B$3)*1440/'設定'!$B$5,0)+1,0),0)")
put(ws, "A4", "=IF(AND(A3>0,ISNUMBER('設定'!$B$4),ISNUMBER('設定'!$D$4)),IF(AND('設定'!$D$4>='設定'!$B$4,'設定'!$B$4>'設定'!$D$3),ROUND(('設定'!$D$4-'設定'!$B$4)*1440/'設定'!$B$5,0)+1,0),0)")
put(ws, "A8", "選択中→"); put(ws, "B8", f'=IF({q(ASG)}${PL}$5="",0,IFERROR(MATCH({q(ASG)}${PL}$5,$B$10:$B$54,0),0))')
for j in range(1, N + 1):
    c = jc(j); d = (j - 1) // T + 1; t = (j - 1) % T + 1
    ws[f"{c}1"] = j; ws[f"{c}2"] = d; ws[f"{c}3"] = t
    ws[f"{c}{ROW_EXIST}"] = f'=IF(AND(INDEX({q(SET)}$B$11:$B${DL},{c}2)<>"",{c}3<={q(SET)}$B$6),1,0)'
    ws[f"{c}4"] = (f'=IF(AND({c}{ROW_EXIST}=1,'
                   f'INDEX({TDAY},{c}2)="",INDEX({TTIME},{c}3)="",INDEX({TBLK},{c}3,{c}2)=""),1,0)')
    ws[f"{c}5"] = f'=IF(OR(INDEX({q(SET)}$D$11:$D${DL},{c}2)<>"",INDEX({q(SET)}$H$11:$H${TL},{c}3)<>""),1,0)'
    ws[f"{c}6"] = f'=IF(LEFT({q(SET)}$B$8,3)="日付順",({c}2-1)*{T}+{c}3,({c}3-1)*{D}+{c}2)+{c}5*10000'
    ws[f"{c}7"] = f"=MAX({c}{ROW_OCC},{c}{ROW_GAPBLK})"
    ws[f"{c}{ROW_OCC}"] = f'=IF(INDEX({GRID},{c}3,{c}2)<>"",1,0)'
    if t > 1:   # 前の枠の人が「後ろを空ける」なら、この枠は空ける（昼休みをはさむときは空けない）
        prev = f"INDEX({GRID},{c}3-1,{c}2)"
        ws[f"{c}{ROW_GAPBLK}"] = f'=IF(OR({jc(j-1)}{ROW_NEXT}=0,{prev}=""),0,IF(RIGHT(IFERROR(INDEX({q(ROS)}$D$5:$D$49,MATCH({prev},{q(ROS)}$P$5:$P$49,0)),""),4)="空けたい",1,0))'
    else:
        ws[f"{c}{ROW_GAPBLK}"] = 0
    ws[f"{c}{ROW_NEXT}"] = (f"=IF(AND({jc(j+1)}4=1,OR({c}3<>$A$3,$A$4=0)),1,0)" if t < T else 0)
    ws[f"{c}{ROW_AUTOBLK}"] = f"=IF(COUNTIF({q(CB)}$G$3:$G$47,{j})>0,1,0)"
    cur = f"INDEX({GRID},{c}3,{c}2)"
    ws[f"{c}{ROW_NOGAP}"] = f'=IF({cur}="",0,IF(IFERROR(INDEX({q(ROS)}$D$5:$D$49,MATCH({cur},{q(ROS)}$P$5:$P$49,0)),"")="空けない",1,0))'
    ws[f"{c}{ROW_NB}"] = (f"=IF(AND({c}{ROW_EXIST}=1,{jc(j+1)}{ROW_EXIST}=1,OR({c}3<>$A$3,$A$4=0)),1,0)" if t < T else 0)
    ws[f"{c}{ROW_AUTOBLK_B}"] = f"=IF(COUNTIF({q(CC)}$G$3:$G$47,{j})>0,1,0)"
    ws[f"{c}{ROW_PRIO}"] = f"={c}6"
    ws[f"{c}{ROW_PRIO+1}"] = f"=({c}3-1)*{D}+{c}2+{c}5*10000"
    ws[f"{c}{ROW_PRIO+2}"] = f"=({T}-{c}3)*{D}+{c}2+{c}5*10000"
    ws[f"{c}{ROW_PRIO+3}"] = f"=({c}2-1)*{T}+{c}3+{c}5*10000"
    ws[f"{c}{ROW_PRIO+4}"] = f"=({D}-{c}2)*{T}+{c}3+{c}5*10000"
    ws[f"{c}8"] = f'=IF({c}4=1,INDEX({q(SET)}$E$11:$E${DL},{c}2)&" "&INDEX({q(SET)}$I$11:$I${TL},{c}3),"")'
for r_, lab in {ROW_NEXT: "次の枠あり", ROW_AUTOBLK: "自動で空ける", ROW_GAPBLK: "後ろを空ける枠", ROW_OCC: "人がいる",
                ROW_PRIO: "優先：全体", ROW_PRIO+1: "早い時刻", ROW_PRIO+2: "遅い時刻", ROW_PRIO+3: "早い日", ROW_PRIO+4: "遅い日", ROW_EXIST: "設定にある枠", ROW_AUTOBLK_B: "自動Bで空ける", ROW_NB: "時間として次の枠", ROW_NOGAP: "空けない人がいる"}.items():
    ws[f"C{r_}"] = lab
for k, lab in {"A9": "i", "B9": "表示名", "C9": "自動の対象", "IK9": "自動案Aの枠", "IL9": "Aで入らない", "IR9": "自動案Bの枠", "IS9": "Bで入らない", "IT9": "兄弟①の枠", "IY9": "兄弟②の枠", "IZ9": "兄弟③の枠", "JC9": "①順番", "JD9": "②順番", "JE9": "③順番", "JF9": "兄弟の時間あり", "JG9": "表にない日時", "IV9": "兄弟の前後OK", "IW9": "兄弟あり", "IX9": "空けない", "IM9": "空き枠数", "IN9": "×の数", "IO9": "決定した枠", "IP9": "希望", "IQ9": "後ろ空け"}.items():
    ws[k] = lab
for i in range(1, NS + 1):
    r = 9 + i; ro = 4 + i; o = 59 + i
    ws[f"A{r}"] = i
    ws[f"B{r}"] = f"={q(ROS)}P{ro}"
    ws[f"C{r}"] = f'=IF(AND(B{r}<>"",OR({q(ROS)}Q{ro}="入力済み",{q(ROS)}Q{ro}="×なし"),IO{r}=0,COUNTIF({GRID},B{r})=0),1,0)'
    ws[f"A{o}"] = i
    for j in range(1, N + 1):
        c = jc(j)
        cells = lambda R: (f'INDEX({R},{base(i)+2}+{c}$3,2+{c}$2)<>"",INDEX({R},{base(i)+1},2+{c}$2)<>"",'
                           f'INDEX({R},{base(i)+2}+{c}$3,1)<>""')
        ws[f"{c}{r}"] = f'=IF({c}$4=1,IF(OR({cells(INPR)}),1,0),0)'
        ws[f"{c}{o}"] = f"=IF(AND({c}$4=1,{c}{r}=0),1,0)"
    ws[f"IK{r}"] = f"=IFERROR(INDEX({q(CB)}$C$3:$C$47,MATCH(A{r},{q(CB)}$B$3:$B$47,0)),0)"
    ws[f"IL{r}"] = f'=IF(AND(C{r}=1,IK{r}=0,{SWON}>0),1,0)'
    ws[f"IR{r}"] = f"=IFERROR(INDEX({q(CC)}$C$3:$C$47,MATCH(A{r},{q(CC)}$B$3:$B$47,0)),0)"
    ws[f"IS{r}"] = f'=IF(AND(C{r}=1,IR{r}=0,{SWON}>0),1,0)'
    ws[f"IM{r}"] = f"=SUMPRODUCT({JA}{o}:{JZ}{o}*(1-${JA}$7:${JZ}$7))"
    ws[f"IN{r}"] = f"=SUM({JA}{r}:{JZ}{r})"
    ws[f"IP{r}"] = f'=IFERROR(MATCH({q(ROS)}C{ro},{{"' + '","'.join(HOPES) + f'"}},0),0)'
    ws[f"IQ{r}"] = f'=IF({q(ROS)}D{ro}="必ず空けたい",2,IF({q(ROS)}D{ro}="出来れば空けたい",1,0))'
    # 兄弟①〜③の面談の枠（0=なし、-1=表にない日時）と順番（1=この子が前、2=この子が後、0=どちらでも）
    SLOT, PREF = ["IT", "IY", "IZ"], ["JC", "JD", "JE"]
    for k in range(3):
        dc, tc, oc = CL(7 + 3 * k), CL(8 + 3 * k), CL(9 + 3 * k)
        ws[f"{SLOT[k]}{r}"] = (f'=IF(OR({q(ROS)}{dc}{ro}="",{q(ROS)}{tc}{ro}=""),0,IFERROR((MATCH({q(ROS)}{dc}{ro},{q(SET)}$E$11:$E${DL},0)-1)*{T}'
                               f'+MATCH({q(ROS)}{tc}{ro},{q(SET)}$I$11:$I${TL},0),-1))')
        ws[f"{PREF[k]}{r}"] = f'=IF(RIGHT({q(ROS)}{oc}{ro},2)="の前",1,IF(RIGHT({q(ROS)}{oc}{ro},2)="の後",2,0))'
    ws[f"JF{r}"] = f"=IF(OR(IT{r}>0,IY{r}>0,IZ{r}>0),1,0)"         # 兄弟の時間が入っている
    ws[f"JG{r}"] = f"=IF(OR(IT{r}<0,IY{r}<0,IZ{r}<0),1,0)"         # 表にない日時がある
    for kk, sc_ in enumerate(["IT", "IY", "IZ"]):                  # 兄弟①〜③の枠（なし・表にない＝0）・日・時（自動案の計算で使う）
        S_, D_, T_ = CL(209 + 3 * kk), CL(210 + 3 * kk), CL(211 + 3 * kk)      # HA〜HI
        ws[f"{S_}{r}"] = f"=MAX(0,{sc_}{r})"
        ws[f"{D_}{r}"] = f"=IF({S_}{r}=0,0,INDEX(${JA}$2:${JZ}$2,{S_}{r}))"
        ws[f"{T_}{r}"] = f"=IF({S_}{r}=0,0,INDEX(${JA}$3:${JZ}$3,{S_}{r}))"
        PRE, POST = CL(218 + 2 * kk), CL(219 + 2 * kk)                       # HJ〜HO：すぐ前・すぐ後の枠（なれないときは -1）
        ws[f"{PRE}{r}"] = f"=IF(AND({S_}{r}>0,{T_}{r}>1,OR({T_}{r}-1<>$A$3,$A$4=0)),{S_}{r}-1,-1)"
        ws[f"{POST}{r}"] = f"=IF(AND({S_}{r}>0,{T_}{r}<{T},OR({T_}{r}<>$A$3,$A$4=0)),{S_}{r}+1,-1)"
    ws[f"IW{r}"] = f'=IF(AND({q(ROS)}E{ro}<>"",JF{r}=0),1,0)'     # 兄弟あり（兄弟の時間はまだ）
    ws[f"IX{r}"] = f'=IF({q(ROS)}D{ro}="空けない",1,0)'                # 後ろを空けない
    # 決めた枠が、どれかの兄弟のすぐ前・すぐ後か
    R2, R3 = f"${JA}$2:${JZ}$2", f"${JA}$3:${JZ}$3"
    adj = lambda S: (f"IF({S}{r}>0,AND(INDEX({R2},IO{r})=INDEX({R2},{S}{r}),OR(AND(IO{r}={S}{r}+1,OR(INDEX({R3},{S}{r})<>$A$3,$A$4=0)),"
                     f"AND(IO{r}={S}{r}-1,OR(INDEX({R3},IO{r})<>$A$3,$A$4=0)))),FALSE)")
    ws[f"IV{r}"] = f"=IF(OR(JF{r}=0,IO{r}=0),1,IF(OR({adj('IT')},{adj('IY')},{adj('IZ')}),1,0))"
    ws[f"IO{r}"] = f'=IF(B{r}="",0,IF(COUNTIF({GRID},B{r})=1,SUMPRODUCT(({GRID}=B{r})*((COLUMN({GRID})-3)*{T}+ROW({GRID})-5)),0))'
ws[f"A59"] = "入れられる枠（使える かつ ×なし）"

# ---------------------------------------------------------------- 計算B・計算C（自動案：入れられる枠が少ない児童から順に1人ずつ決める）
# A順番 B決めた児童 C入れた枠 D空けたい枠を使った E後ろ空け(2必ず/1出来れば) F希望 G後ろを空けた枠
# spread=True（計算C・自動案B）：希望のない家庭は、日ごとの人数が少ない日・前後が空いている枠を選ぶ
BIG = 1000000000
PR0 = 24
SC0 = PR0 + NS + 1
FR0 = SC0 + NS + 1
NX0 = FR0 + N + 1
SS0 = NX0 + N + 1
LD0 = SS0 + N + 1
NA0 = LD0 + D + 1                # 「空けない」の人が入った枠
pr = lambda i: CL(PR0 + i - 1)
sc = lambda i: CL(SC0 + i - 1)
fr = lambda j: CL(FR0 + j - 1)
nx = lambda j: CL(NX0 + j - 1)
ss = lambda j: CL(SS0 + j - 1)
ld = lambda d: CL(LD0 + d - 1)
na = lambda j: CL(NA0 + j - 1)
SF0 = NA0 + N + 1                # 「出来れば空けたい」で空けておいた枠（入る枠がない子は使ってよい）
XS0 = SF0 + N + 1                # 次の枠が空いている（空けておいた枠も空きとみる）
sf = lambda j: CL(SF0 + j - 1)
xs = lambda j: CL(XS0 + j - 1)
OKM = f"{q(CA)}${JA}$60:${JZ}${59 + NS}"      # 児童×枠：入れられる
CAr = lambda row: f"{q(CA)}${JA}${row}:${JZ}${row}"




def engine(name, spread):
    ws = sheet(name)
    put(ws, "A1", "計算用（さわらないでください）", font=f(bold=True, color="B23A3A"))
    for k, lab in {"A2": "k", "B2": "児童", "C2": "枠", "D2": "空けたい枠", "E2": "後ろ空け", "F2": "希望", "G2": "空けた枠",
                   "H2": "兄弟あり", "I2": "兄弟①枠", "J2": "兄弟②枠", "K2": "兄弟③枠", "L2": "①順番", "M2": "②順番", "N2": "③順番",
                   "O2": "①日", "P2": "②日", "Q2": "③日", "R2": "①時", "S2": "②時", "T2": "③時", "U2": "空けない", "V2": "兄弟の時間あり"}.items():
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
            #   点数＝入れられる空き枠の数×1000＋（空けておいた枠も入れた数）。空き枠がない子は、空けておいた枠に入れるので先に決める
            FR_, SF_, NX_, XS_ = (f"${fr(1)}{r}:${fr(N)}{r}", f"${sf(1)}{r}:${sf(N)}{r}", f"${nx(1)}{r}:${nx(N)}{r}", f"${xs(1)}{r}:${xs(N)}{r}")
            ws[f"{sc(i)}{r}"] = (f"=IF(OR({pr(i)}{r}=1,{SWON}=0),{BIG},IF({q(CA)}$JF${9+i}=1,0,100000000)+IF({q(CA)}$IQ${9+i}=2,"
                                 f"SUMPRODUCT({ok},{FR_},{NX_})*1000+SUMPRODUCT({ok},{FR_}+{SF_},{XS_}),"
                                 f"SUMPRODUCT({ok},{FR_}*1001+{SF_}))*100+{i})")
        ws[f"B{r}"] = f"=IF(MIN({sc(1)}{r}:{sc(NS)}{r})>={BIG},0,MATCH(MIN({sc(1)}{r}:{sc(NS)}{r}),{sc(1)}{r}:{sc(NS)}{r},0))"
        ws[f"E{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IQ$10:$IQ$54,B{r}))"
        # W：選ばれた子に入れられる空き枠がない（＝空けておいた枠を使う）
        FR_, NX_ = f"${fr(1)}{r}:${fr(N)}{r}", f"${nx(1)}{r}:${nx(N)}{r}"
        ws[f"W{r}"] = (f"=IF(B{r}=0,0,IF(IF(E{r}=2,SUMPRODUCT(INDEX({OKM},B{r},0),{FR_},{NX_}),"
                       f"SUMPRODUCT(INDEX({OKM},B{r},0),{FR_}))=0,1,0))")
        ws[f"F{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IP$10:$IP$54,B{r}))"
        ws[f"H{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IW$10:$IW$54,B{r}))"
        ws[f"U{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$IX$10:$IX$54,B{r}))"
        ws[f"V{r}"] = f"=IF(B{r}=0,0,INDEX({q(CA)}$JF$10:$JF$54,B{r}))"
        if spread:
            for d in range(1, D + 1):
                ws[f"{ld(d)}{r}"] = (f"=SUMPRODUCT(({CAr(2)}={d})*{CAr(ROW_OCC)})" if k == 1 else
                                     f"={ld(d)}{r-1}+IF($C{r-1}>0,IF(INDEX({CAr(2)},$C{r-1})={d},1,0),0)")
        for j in range(1, N + 1):
            d, t = (j - 1) // T + 1, (j - 1) % T + 1
            ws[f"{fr(j)}{r}"] = (f"=1-{q(CA)}{jc(j)}$7" if k == 1 else f"={fr(j)}{r-1}*IF(OR($C{r-1}={j},$G{r-1}={j}),0,1)")
            ws[f"{nx(j)}{r}"] = (f"=IF({q(CA)}{jc(j)}${ROW_NEXT}=1,{fr(j+1)}{r},1)" if j < N else 1)
            ws[f"{na(j)}{r}"] = (f"={q(CA)}{jc(j)}${ROW_NOGAP}" if k == 1 else f"={na(j)}{r-1}+IF(AND($C{r-1}={j},$U{r-1}=1),1,0)")
            ws[f"{sf(j)}{r}"] = (0 if k == 1 else f"=IF($C{r-1}={j},0,{sf(j)}{r-1}+IF(AND($G{r-1}={j},$E{r-1}=1),1,0))")
            ws[f"{xs(j)}{r}"] = (f"=IF({q(CA)}{jc(j)}${ROW_NEXT}=1,{fr(j+1)}{r}+{sf(j+1)}{r},1)" if j < N else 1)
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
            score = f"{score}+IF($H{r}=1,INDEX({NBXM},$B{r},{j})*{4000 if spread else 500},0)"
            # 空けない：その人のすぐ後の枠に、なるべくほかの人を入れる／空けない人は、すぐ後が埋まっている枠を選びやすく
            W = 2000 if spread else 300
            if t > 1:
                score = f"{score}-IF(AND({q(CA)}{jc(j-1)}${ROW_NB}=1,{na(j-1)}{r}>0),{W},0)"
            if t < T:
                score = f"{score}-IF(AND($U{r}=1,{q(CA)}{jc(j)}${ROW_NB}=1,{fr(j+1)}{r}=0),{W},0)"
            # 兄弟の時間が入っている子：兄弟のすぐ前・すぐ後 → 同じ日の近い時間 → ほかの日（点数は計算Aの表）
            sib = f"INDEX({SIBC},$B{r},{j})+IF(AND($E{r}=1,{nx(j)}{r}=0),25,0)"
            score = f"IF($V{r}=1,{sib},{score})"
            ws[f"{ss(j)}{r}"] = (f"=IF($B{r}=0,{BIG},IF(INDEX({OKM},$B{r},{j})*IF($W{r}=1,{fr(j)}{r}+{sf(j)}{r},{fr(j)}{r})=1,"
                                 f"IF(AND($E{r}=2,IF($W{r}=1,{xs(j)}{r},{nx(j)}{r})=0),{BIG},{score}),{BIG}))")
        ws[f"C{r}"] = f"=IF(MIN({ss(1)}{r}:{ss(N)}{r})>={BIG},0,MATCH(MIN({ss(1)}{r}:{ss(N)}{r}),{ss(1)}{r}:{ss(N)}{r},0))"
        ws[f"D{r}"] = f"=IF(C{r}>0,INDEX({CAr(5)},C{r}),0)"
        ws[f"G{r}"] = f"=IF(AND(C{r}>0,E{r}>0),IF(AND(INDEX({CAr(ROW_NEXT)},C{r})=1,INDEX(${nx(1)}{r}:${nx(N)}{r},C{r})=1),C{r}+1,0),0)"


for nm_ in (CB, CC):               # マクロ（自動案を作る）が結果を書く表
    ws = sheet(nm_)
    put(ws, "A1", "自動案の結果（マクロが書きます。さわらないでください）", font=f(bold=True, color="B23A3A"))
    for k_, lab_ in {"A2": "k", "B2": "児童", "C2": "枠", "D2": "空けたい枠", "G2": "空けた枠"}.items():
        ws[k_] = lab_
    if nm_ == CB:
        ws["E1"] = "B1：1＝作った　C1：作ったときの入力の合計　D1：作った時刻"
        ws["B1"] = 0

# ---------------------------------------------------------------- 見た目の仕上げ（タイトル帯・メニュー・見出しの色）

from menu_shapes import add_menu     # 上のメニューは図形のボタン（大きさが同じで、列を開いても動かない）
# シートごと：(タイトルのセル, 帯の右はしの列, メニューを付けるか)
LAYOUT = {
    HOME: ("A1", 13, False),
    SET: ("A1", 22, True),
    ROS: ("A1", 31, True),
    INP: ("B1", 15, True),
    SIB: ("B1", 11 + D, True),
    AUT: ("B1", 11 + D, True),
    AUTB: ("B1", 11 + D, True),
    ASG: ("B1", 11 + D, True),
    LES: ("B1", 12 + D, True),
    LET: ("B1", 12 + D, True),
}
TAB = {HOME: PRIMARY_D, SET: "7A8699", ROS: PRIMARY, INP: "B23A3A", AUT: ACCENT, AUTB: "5B8BD0", ASG: "C77D1A", SIB: "7A5BA8", LES: "1E90A0", LET: "2E8B57"}
date_ref = f"={q(SET)}$E$"
for name, (tref, last, menu) in LAYOUT.items():
    ws = wb[name]
    ws.sheet_properties.tabColor = TAB[name]
    ws.sheet_view.showRowColHeaders = False
    ws.row_dimensions[1].height = 44
    ws.row_dimensions[2].height = 24
    for c in range(1, (last if not menu else max(last, 40)) + 1):     # メニューのボタンの下まで帯をのばす
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
    # 見出しの色：日付の見出しと名簿・設定の列見出しをこい青に
    for row in ws.iter_rows(min_row=3):
        for cell in row:
            v = cell.value
            if isinstance(v, str) and v.startswith(date_ref):
                cell.fill = HEAD_D; cell.font = f(bold=True, color="FFFFFF")
# ホームのタイトル帯の右はしにバージョン
put(wb[HOME], "K1", VERSION, font=f(size=10, color="DDE6F5"), alignment=Alignment(horizontal="right", vertical="center"))
wb[HOME].merge_cells("K1:M1")
for n in (SIB, AUT, AUTB, ASG, LET, LES):
    for c in range(6 + D, 13 + D):
        wb[n].column_dimensions[CL(c)].width = 15
wb[INP].column_dimensions["M"].width = 15
wb[INP].column_dimensions["N"].width = 15
wb[INP].column_dimensions["O"].width = 15
for c in range(1, 27):
    cell = wb[ROS].cell(4, c)
    if cell.value:
        cell.fill = fill("B7791F") if c <= 15 else HEAD_D    # 入力する列は茶色、計算の列は青
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
hdr = [(INP, " ".join(f"C{base(i)+2}:{LC}{base(i)+2}" for i in range(1, NS + 1)), f"C{base(1)+2}"), (SET, f"M10:{TC}10", "M10"),
       (ASG, f"C5:{LC}5", "C5"), (ASG, f"C{CH}:{LC}{CH}", f"C{CH}"), (AUT, f"C5:{LC}5", "C5"), (AUTB, f"C5:{LC}5", "C5"), (SIB, f"C5:{LC}5", "C5")]
for sh, rng, tl in hdr:
    wb[sh].conditional_formatting.add(rng, FormulaRule(formula=[f'{tl}=""'], fill=WHITE))
for i in range(1, NS + 1):
    wb[ROS].row_dimensions[4 + i].height = 19
# シートの順番：ホーム・設定・名簿・×入力・自動案・調整・決定・計算
order = [HOME, SET, ROS, INP, AUT, AUTB, ASG, SIB, LES, LET, CA, CB, CC]
wb._sheets = [wb[n] for n in order]
sib_idx = order.index(SIB)
wb[SIB].defined_names["_xlnm.Print_Area"] = DefinedName("_xlnm.Print_Area", localSheetId=sib_idx,
    attr_text=f"OFFSET({q(SIB)}$B$3,0,0,3+{q(SET)}$B$6,1+COUNT({q(SET)}$B$11:$B${DL}))")
wb[LES].defined_names["_xlnm.Print_Area"] = DefinedName("_xlnm.Print_Area", localSheetId=order.index(LES),
    attr_text=f"OFFSET({q(LES)}$B$4,0,0,{SEND - 3},IF(COUNT({q(SET)}$B$11:$B${DL})>5,7,6))")
wb[LET].defined_names["_xlnm.Print_Area"] = DefinedName("_xlnm.Print_Area", localSheetId=order.index(LET),
    attr_text=f"OFFSET({q(LET)}$B$4,0,0,{LEND - 3},IF(COUNT({q(SET)}$B$11:$B${DL})>5,10,9))")
wb.defined_names["決定の表"] = DefinedName("決定の表", attr_text=f"{q(ASG)}$C$6:${LC}${GL}")

# 使わない時刻の行をフィルターで隠す（最初の設定のぶんは、ここで隠しておく）
from openpyxl.worksheet.filters import FilterColumn, Filters
N0 = 9                                   # 最初の設定（13:30〜15:30、15分）の1日の枠の数
for ws_, (ref, colid, hrow, last) in ((wb[INP], INP_FILTER), (wb[LET], LET_FILTER), (wb[LES], LES_FILTER)):
    ws_.auto_filter.ref = ref
    ncol = ord(ref.split(":")[1][0]) - ord(ref[0]) + 1
    for k in range(ncol):
        ws_.auto_filter.filterColumn.append(FilterColumn(colId=k, hiddenButton=True, filters=Filters(filter=["表示"]) if k == colid else None))
for i in range(1, NS + 1):
    for t in range(N0 + 1, T + 1):
        wb[INP].row_dimensions[base(i) + 2 + t].hidden = True
for t in range(N0 + 1, T + 1):
    wb[LET].row_dimensions[LH + t].hidden = True
for r in list(range(AM0 + N0, SEP + 1)) + list(range(PM0, SEND + 1)) + [15, 16]:   # 夏：午後なし・注意は1行
    wb[LES].row_dimensions[r].hidden = True
wb[CA].sheet_state = "hidden"
wb[CB].sheet_state = "hidden"
wb[CC].sheet_state = "hidden"
wb.active = 0
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
add_menu(OUT, [n for n, (_, _, m) in LAYOUT.items() if m])
print("saved", OUT)
