"""徒競走の走順Excelを作るスクリプト。

もとのファイル（リレー組分け_v2_白紙.xlsx）を読み込み、
「4人組」シートと「計算用」シートの組分けのしくみを作りかえて、
白紙版とテストデータ入り版の2つを書き出す。

使い方: python3 build.py
"""
import os
import random
import re
import zipfile

import openpyxl
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.workbook.properties import CalcProperties

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "リレー組分け_v2_白紙.xlsx")
VERSION = "v3"
OUT_BLANK = os.path.join(HERE, f"徒競走走順_{VERSION}_白紙.xlsx")
OUT_TEST = os.path.join(HERE, f"徒競走走順_{VERSION}_テストデータ入り.xlsx")

PEOPLE_LAST = 186      # 計算用の人の行（2〜186）
HEATS = 50             # 男女それぞれ最大50組まで
HEAT_LAST = HEATS + 1  # 計算用の組の表の最後の行
LANES = 4              # 1組の最大人数

thin = Side(style="thin")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
CENTER = Alignment(horizontal="center", vertical="center")
BOLD = Font(bold=True)

# 計算用シートの「組の表」の列（男子・女子）
#   組, 人数, 赤残り, 白残り, 赤人数, 白人数, 赤累計, 白累計
HEAT_COLS = {
    "男": dict(zip("k s rr wr r w cr cw".split(), "S T U V W X Y Z".split())),
    "女": dict(zip("k s rr wr r w cr cw".split(), "AB AC AD AE AF AG AH AI".split())),
}
# 男女ごとの合計セル（計算用）: 赤の人数, 白の人数, 合計人数, 組数
TOTALS = {
    "男": dict(red="$Q$2", white="$Q$3", n="$Q$8", h="$Q$9"),
    "女": dict(red="$Q$4", white="$Q$5", n="$Q$10", h="$Q$11"),
}


def rng(col, last=HEAT_LAST):
    return f"${col}$2:${col}${last}"


def build_calc(ws):
    """計算用シートに、組の人数・赤白の人数を決める表と、一人一人の組を足す。"""
    # 男女ごとの合計人数と組数
    ws["P8"], ws["Q8"] = "男子人数", "=Q2+Q3"
    ws["P9"], ws["Q9"] = "男子組数", "=ROUNDUP(Q8/4,0)"
    ws["P10"], ws["Q10"] = "女子人数", "=Q4+Q5"
    ws["P11"], ws["Q11"] = "女子組数", "=ROUNDUP(Q10/4,0)"

    heads = ["組", "人数", "赤残り", "白残り", "赤人数", "白人数", "赤累計", "白累計"]
    for g, c in HEAT_COLS.items():
        t = TOTALS[g]
        for i, key in enumerate("k s rr wr r w cr cw".split()):
            ws[f"{c[key]}1"] = f"{g}{heads[i]}"
        for row in range(2, HEAT_LAST + 1):
            k = f"{c['k']}{row}"
            s = f"{c['s']}{row}"
            rr = f"{c['rr']}{row}"
            wr = f"{c['wr']}{row}"
            r = f"{c['r']}{row}"
            ws[k] = row - 1
            # 組の人数: 人数を組数でなるべく均等に分ける（4人の組を先、3人の組を後にする）
            ws[s] = (f"=IF(OR({t['h']}=0,{k}>{t['h']}),0,"
                     f"INT({t['n']}/{t['h']})+IF({k}<=MOD({t['n']},{t['h']}),1,0))")
            if row == 2:
                ws[rr] = f"={t['red']}"
                ws[wr] = f"={t['white']}"
            else:
                ws[rr] = f"={t['red']}-{c['cr']}{row - 1}"
                ws[wr] = f"={t['white']}-{c['cw']}{row - 1}"
            # 赤の人数: 基本は半分ずつ。3人の組は残りが多い色を2人にする。
            # 片方の色が足りなければ、もう片方の色で埋める。
            ws[r] = (f"=IF({s}=0,0,MIN({rr},MAX(IF(MOD({s},2)=0,{s}/2,"
                     f"IF({rr}>={wr},({s}+1)/2,({s}-1)/2)),{s}-{wr})))")
            ws[f"{c['w']}{row}"] = f"={s}-{r}"
            prev_cr = "0" if row == 2 else f"{c['cr']}{row - 1}"
            prev_cw = "0" if row == 2 else f"{c['cw']}{row - 1}"
            ws[f"{c['cr']}{row}"] = f"={prev_cr}+{r}"
            ws[f"{c['cw']}{row}"] = f"={prev_cw}+{c['w']}{row}"

    # 一人一人の組・組の中の番号
    ws["AK1"], ws["AL1"], ws["AM1"], ws["AN1"] = "組", "前の組までの人数", "組内番号", "組キー"
    m, f = HEAT_COLS["男"], HEAT_COLS["女"]
    for row in range(2, PEOPLE_LAST + 1):
        J, K = f"J{row}", f"K{row}"
        AK, AL = f"AK{row}", f"AL{row}"

        def by_kind(tmpl):
            """区分（男赤・男白・女赤・女白）ごとに、使う列を入れかえた式を作る。"""
            return (f'IF({J}="男赤",{tmpl(m["cr"])},IF({J}="男白",{tmpl(m["cw"])},'
                    f'IF({J}="女赤",{tmpl(f["cr"])},{tmpl(f["cw"])})))')

        count_before = lambda col: 'COUNTIF(' + rng(col) + ',"<"&' + K + ')'
        ws[AK] = f'=IF({J}="","",{by_kind(count_before)}+1)'
        ws[AL] = (f'=IF({AK}="","",IF({AK}=1,0,'
                  f'{by_kind(lambda col: f"INDEX({rng(col)},{AK}-1)")}))')
        # 赤は組の前の方、白は赤のあとに並べる
        ws[f"AM{row}"] = (f'=IF({AK}="","",IF(RIGHT({J},1)="赤",{K}-{AL},'
                          f'IF(LEFT({J},1)="男",INDEX({rng(m["r"])},{AK}),'
                          f'INDEX({rng(f["r"])},{AK}))+{K}-{AL}))')
        ws[f"AN{row}"] = f'=IF({AK}="","",F{row}&{AK}&"-"&AM{row})'


def build_heat_sheet(wb):
    """「4人組」シートを作り直す。1組の中に赤も白も最大4人まで並べられる形にする。"""
    old = wb["4人組"]
    idx = wb.sheetnames.index("4人組")
    wb.remove(old)
    ws = wb.create_sheet("4人組", idx)

    per_slot = 3                        # 名前・クラス・色
    block = 3 + per_slot * LANES        # 組・人数・内訳 ＋ 4人分
    starts = {"男": 1, "女": block + 2}  # 間に1列あける
    last_row = 3 + HEATS

    for g, c0 in starts.items():
        hc = HEAT_COLS[g]
        t = TOTALS[g]
        L = lambda i: openpyxl.utils.get_column_letter(c0 + i)
        ws[f"{L(0)}1"] = "男子" if g == "男" else "女子"
        ws[f"{L(0)}1"].font = BOLD
        # 調整した組があるときの注意
        size, red = f"計算用!{rng(hc['s'])}", f"計算用!{rng(hc['r'])}"
        ws[f"{L(3)}1"] = (f'=IF(SUMPRODUCT(({size}>0)*((({size}<>4)+({red}<>2))>0))>0,'
                          f'"※黄色の組は、人数の都合で調整した組です","")')
        ws[f"{L(3)}1"].font = Font(bold=True, color="FFFF0000")

        for i, label in enumerate(["組", "人数", "内訳"]):
            ws.merge_cells(f"{L(i)}2:{L(i)}3")
            ws[f"{L(i)}2"] = label
        for j in range(LANES):
            a = 3 + j * per_slot
            ws.merge_cells(f"{L(a)}2:{L(a + per_slot - 1)}2")
            ws[f"{L(a)}2"] = f"{j + 1}人目"
            for k, label in enumerate(["名前", "クラス", "色"]):
                ws[f"{L(a + k)}3"] = label
        for rr in (2, 3):
            for i in range(block):
                cell = ws[f"{L(i)}{rr}"]
                cell.border = BOX
                cell.alignment = CENTER
                cell.font = BOLD

        for row in range(4, last_row + 1):
            A = f"${L(0)}{row}"
            ws[f"{L(0)}{row}"] = f'=IF(ROW()-3<=計算用!{t["h"]},ROW()-3,"")'
            ws[f"{L(1)}{row}"] = f'=IF({A}="","",INDEX(計算用!{rng(hc["s"])},{A}))'
            ws[f"{L(2)}{row}"] = (f'=IF({A}="","","赤"&INDEX(計算用!{rng(hc["r"])},{A})'
                                  f'&"白"&INDEX(計算用!{rng(hc["w"])},{A}))')
            for i in range(3):
                ws[f"{L(i)}{row}"].alignment = CENTER
            for j in range(LANES):
                a = 3 + j * per_slot
                key = f'"{g}"&{A}&"-{j + 1}"'
                for k, src in enumerate(["D", "M", "I"]):
                    ws[f"{L(a + k)}{row}"] = (
                        f'=IF({A}="","",IFERROR(INDEX(計算用!${src}$2:${src}${PEOPLE_LAST},'
                        f'MATCH({key},計算用!$AN$2:$AN${PEOPLE_LAST},0)),""))')
                ws[f"{L(a + 1)}{row}"].alignment = CENTER
                ws[f"{L(a + 2)}{row}"].alignment = CENTER

        # 見た目
        ws.column_dimensions[L(0)].width = 5
        ws.column_dimensions[L(1)].width = 5
        ws.column_dimensions[L(2)].width = 9
        for j in range(LANES):
            a = 3 + j * per_slot
            ws.column_dimensions[L(a)].width = 13
            ws.column_dimensions[L(a + 1)].width = 5
            ws.column_dimensions[L(a + 2)].width = 4
        area = f"{L(0)}4:{L(block - 1)}{last_row}"
        top = f"${L(0)}4"
        # 調整した組（4人でない・赤白が2人ずつでない）は黄色
        ws.conditional_formatting.add(
            f"{L(0)}4:{L(2)}{last_row}",
            FormulaRule(formula=[f'AND({top}<>"",OR(${L(1)}4<>4,${L(2)}4<>"赤2白2"))'],
                        fill=PatternFill(bgColor="FFFFF2CC", fill_type="solid"),
                        border=BOX, stopIfTrue=False))
        # 赤の人の「色」は薄い赤
        for j in range(LANES):
            col = L(3 + j * per_slot + 2)
            ws.conditional_formatting.add(
                f"{col}4:{col}{last_row}",
                FormulaRule(formula=[f'{col}4="赤"'],
                            fill=PatternFill(bgColor="FFF8CBAD", fill_type="solid")))
        # 組がある行に罫線
        ws.conditional_formatting.add(
            area, FormulaRule(formula=[f'{top}<>""'], border=BOX))

    ws.column_dimensions[openpyxl.utils.get_column_letter(block + 1)].width = 2
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = 9
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = "1:3"
    return 2 * block + 1  # 印刷する列数


def put_print_areas(path, heat_cols):
    """人数に合わせて変わる印刷範囲（openpyxlでは書けないので、あとから書き込む）。"""
    names = (
        f"<definedName name=\"_xlnm.Print_Area\" localSheetId=\"1\">"
        f"OFFSET(組ごとタイム順!$A$1,0,0,3+MAX(計算用!$Q$2:$Q$5),17)</definedName>"
        f"<definedName name=\"_xlnm.Print_Area\" localSheetId=\"2\">"
        f"OFFSET('4人組'!$A$1,0,0,3+MAX(計算用!$Q$9,計算用!$Q$11),{heat_cols})</definedName>"
    )
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "xl/workbook.xml":
                xml = data.decode("utf-8")
                xml = re.sub(r'<definedName name="_xlnm.Print_Area"[^>]*>.*?</definedName>', "", xml)
                if "<definedNames>" in xml:
                    xml = xml.replace("<definedNames>", "<definedNames>" + names, 1)
                else:
                    xml = xml.replace("</sheets>", "</sheets><definedNames>" + names + "</definedNames>", 1)
                data = xml.encode("utf-8")
            zout.writestr(item, data)
    os.replace(tmp, path)


LAST = ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺", "山本", "中村", "小林", "加藤",
        "吉田", "山田", "山口", "松本", "井上", "木村", "林", "斎藤", "清水", "森",
        "池田", "橋本", "石川", "前田", "藤田", "岡田", "後藤", "長谷川", "村上", "近藤"]
BOY = ["はると", "そうた", "ゆうと", "れん", "ひなた", "りく", "こうき", "たいが", "そら", "かいと",
       "ゆうま", "あおい", "しょう", "けんた", "だいち", "りょう", "いつき", "さく", "みなと", "つばさ"]
GIRL = ["ゆい", "さくら", "ひまり", "りん", "めい", "あかり", "みお", "ことね", "はな", "えま",
        "ゆな", "こはる", "あおい", "つむぎ", "ほのか", "まお", "しおり", "かのん", "さら", "ひな"]

# テストデータ: クラスごとの（男赤, 男白, 女赤, 女白）の人数
# 男子は赤25・白22（計47人＝4の倍数でない・赤白の差3）
# 女子は赤20・白23（計43人＝4の倍数でない・赤白の差3）
TEST_CLASSES = [(7, 6, 5, 6), (6, 5, 5, 6), (6, 6, 5, 5), (6, 5, 5, 6)]


def fill_test(ws):
    rnd = random.Random(20260929)
    for ci, (mr, mw, fr, fw) in enumerate(TEST_CLASSES):
        col = 2 + ci * 5
        kids = ([("1", "赤")] * mr + [("1", "白")] * mw + [("2", "赤")] * fr + [("2", "白")] * fw)
        rnd.shuffle(kids)
        for i, (sex, team) in enumerate(kids):
            row = 3 + i
            first = rnd.choice(BOY if sex == "1" else GIRL)
            ws.cell(row, col, f"{rnd.choice(LAST)} {first}")
            ws.cell(row, col + 1, int(sex))
            base = 9.2 if sex == "1" else 9.6
            ws.cell(row, col + 2, round(rnd.gauss(base, 0.6), 2))
            ws.cell(row, col + 3, team)


def main():
    for out, test in ((OUT_BLANK, False), (OUT_TEST, True)):
        wb = openpyxl.load_workbook(SRC)
        build_calc(wb["計算用"])
        heat_cols = build_heat_sheet(wb)
        if test:
            fill_test(wb["①データ入力"])
        wb.calculation = CalcProperties(fullCalcOnLoad=True)
        wb.active = 0
        wb.save(out)
        put_print_areas(out, heat_cols)
        print("wrote", out)


if __name__ == "__main__":
    main()
