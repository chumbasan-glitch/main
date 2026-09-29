"""徒競走の走順Excelを作るスクリプト。

もとのファイル（リレー組分け_v2_白紙.xlsx）を読み込み、
「4人組」シートと「計算用」シートの組分けのしくみを作りかえ、
「手動調整」「決定版」シートを足して、
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
VERSION = "v4"
OUT_BLANK = os.path.join(HERE, f"徒競走走順_{VERSION}_白紙.xlsx")
OUT_TEST = os.path.join(HERE, f"徒競走走順_{VERSION}_テストデータ入り.xlsx")

PEOPLE_LAST = 186      # 計算用の人の行（2〜186）
HEATS = 50             # 男女それぞれ最大50組まで
HEAT_LAST = HEATS + 1  # 計算用の組の表の最後の行
LANES = 4              # 1組の最大人数
MANUAL_TOP = 4         # 手動調整シートの1人目の行（計算用の2行目にあたる）

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
# 男女ごとの合計セル（計算用）: 赤の人数, 白の人数, 合計人数, 組数, 決定版の組数
TOTALS = {
    "男": dict(red="$Q$2", white="$Q$3", n="$Q$8", h="$Q$9", fh="$Q$13"),
    "女": dict(red="$Q$4", white="$Q$5", n="$Q$10", h="$Q$11", fh="$Q$14"),
}
# 計算用シートの「決定版の組の表」の列: 組, 人数, 赤人数, 白人数
FINAL_COLS = {
    "男": dict(zip("k s r w".split(), "BA BB BC BD".split())),
    "女": dict(zip("k s r w".split(), "BF BG BH BI".split())),
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


def build_final_calc(ws):
    """手動調整を反映した「決定の組」を計算する。"""
    last = PEOPLE_LAST
    ws["AP1"], ws["AQ1"], ws["AR1"], ws["AS1"], ws["AT1"] = (
        "決定の組", "並びキー", "決定の組内番号", "決定キー", "決定の組(数)")
    for row in range(2, last + 1):
        m = row - 2 + MANUAL_TOP
        grp, pos = f"手動調整!$I${m}", f"手動調整!$J${m}"
        ws[f"AP{row}"] = f'=IF(J{row}="","",IF({grp}<>"",{grp},AK{row}))'
        # 組の中の並び: 「何人目」を入れた子はその番号、入れていない子は自動の番号。
        # 同じ番号なら「何人目」を入れた子を先にする。
        ws[f"AQ{row}"] = (f'=IF(AP{row}="","",IF({pos}<>"",{pos},AM{row})*100000'
                          f'+IF({pos}<>"",0,50000)+AK{row}*10+AM{row})')
        ws[f"AR{row}"] = (f'=IF(AP{row}="","",COUNTIFS($F$2:$F${last},F{row},'
                          f'$AP$2:$AP${last},AP{row},$AQ$2:$AQ${last},"<"&AQ{row})+1)')
        ws[f"AS{row}"] = f'=IF(AP{row}="","",F{row}&AP{row}&"-"&AR{row})'
        ws[f"AT{row}"] = f'=IF(AP{row}="",0,AP{row})'
    ws["P13"], ws["Q13"] = "男子決定組数", f'=SUMPRODUCT(MAX(($F$2:$F${last}="男")*$AT$2:$AT${last}))'
    ws["P14"], ws["Q14"] = "女子決定組数", f'=SUMPRODUCT(MAX(($F$2:$F${last}="女")*$AT$2:$AT${last}))'
    heads = ["組", "人数", "赤人数", "白人数"]
    for g, c in FINAL_COLS.items():
        for i, key in enumerate("k s r w".split()):
            ws[f"{c[key]}1"] = f"{g}決定{heads[i]}"
        for row in range(2, HEAT_LAST + 1):
            ws[f"{c['k']}{row}"] = row - 1
            ws[f"{c['s']}{row}"] = (f'=COUNTIFS($F$2:$F${last},"{g}",'
                                    f'$AP$2:$AP${last},{c["k"]}{row})')
            ws[f"{c['r']}{row}"] = (f'=COUNTIFS($F$2:$F${last},"{g}",'
                                    f'$AP$2:$AP${last},{c["k"]}{row},$I$2:$I${last},"赤")')
            ws[f"{c['w']}{row}"] = f"={c['s']}{row}-{c['r']}{row}"


def build_heat_sheet(wb, name, index, final):
    """組ごとの表のシートを作る。final=False は自動の組、True は手動調整を反映した組。"""
    if name in wb.sheetnames:
        wb.remove(wb[name])
    ws = wb.create_sheet(name, index)

    per_slot = 3                        # 名前・クラス・色
    block = 3 + per_slot * LANES        # 組・人数・内訳 ＋ 4人分
    starts = {"男": 1, "女": block + 2}  # 間に1列あける
    last_row = 3 + HEATS
    key_col = "AS" if final else "AN"

    for g, c0 in starts.items():
        hc = FINAL_COLS[g] if final else HEAT_COLS[g]
        t = TOTALS[g]
        count = t["fh"] if final else t["h"]
        L = lambda i: openpyxl.utils.get_column_letter(c0 + i)
        ws[f"{L(0)}1"] = "男子" if g == "男" else "女子"
        ws[f"{L(0)}1"].font = BOLD
        # 注意書き
        size, red = f"計算用!{rng(hc['s'])}", f"計算用!{rng(hc['r'])}"
        used = f"(計算用!{rng(hc['k'])}<=計算用!{count})"
        note = (f'IF(SUMPRODUCT(({size}>0)*((({size}<>4)+({red}<>2))>0))>0,'
                f'"※黄色の組は、人数の都合で調整した組です","")')
        if final:
            note = (f'IF(SUMPRODUCT(({size}>{LANES})*1)>0,'
                    f'"※{LANES + 1}人以上の組があります（赤い組）。{LANES + 1}人目からは表に出ません",'
                    f'IF(SUMPRODUCT({used}*({size}=0))>0,"※だれもいない組があります（赤い組）",{note}))')
        ws[f"{L(3)}1"] = "=" + note
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
            ws[f"{L(0)}{row}"] = f'=IF(ROW()-3<=計算用!{count},ROW()-3,"")'
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
                        f'MATCH({key},計算用!${key_col}$2:${key_col}${PEOPLE_LAST},0)),""))')
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
        if final:
            # 5人以上・0人の組は赤
            ws.conditional_formatting.add(
                f"{L(0)}4:{L(2)}{last_row}",
                FormulaRule(formula=[f'AND({top}<>"",OR(${L(1)}4>{LANES},${L(1)}4=0))'],
                            fill=PatternFill(bgColor="FFFF9999", fill_type="solid"),
                            border=BOX, stopIfTrue=True))
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


def build_manual_sheet(wb, index):
    """一人ずつ組を変えられる「手動調整」シートを作る。"""
    ws = wb.create_sheet("手動調整", index)
    ws["A1"] = "手動調整"
    ws["A1"].font = Font(bold=True, size=14)
    ws["C1"] = ("組を変えたい子だけ、「変更後の組」に組の番号を入れてください。"
                "「何人目」は組の中で並べたい順番です（空いていれば自動の順番）。"
                "結果は「決定版」シートに出ます。※このシートは並べかえないでください。")
    ws["C1"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("C1:M1")
    ws.row_dimensions[1].height = 42
    for col, g in (("C", "男"), ("I", "女")):
        t = TOTALS[g]
        fc = FINAL_COLS[g]
        size = f"計算用!{rng(fc['s'])}"
        used = f"(計算用!{rng(fc['k'])}<=計算用!{t['fh']})"
        ws[f"{col}2"] = (f'="{"男子" if g == "男" else "女子"}：自動 "&計算用!{t["h"]}&"組 → 決定版 "'
                         f'&計算用!{t["fh"]}&"組"'
                         f'&IF(SUMPRODUCT(({size}>{LANES})*1)>0,"　{LANES + 1}人以上の組 "'
                         f'&SUMPRODUCT(({size}>{LANES})*1)&"つ","")'
                         f'&IF(SUMPRODUCT({used}*({size}=0))>0,"　だれもいない組 "'
                         f'&SUMPRODUCT({used}*({size}=0))&"つ","")')
        ws[f"{col}2"].font = BOLD
    heads = ["クラス", "No.", "名前", "性別", "色", "タイム", "自動の組", "自動の\n何人目",
             "変更後の組", "何人目", "決定の組", "決定の\n何人目", "確認"]
    for i, h in enumerate(heads, start=1):
        c = ws.cell(3, i, h)
        c.font = BOLD
        c.border = BOX
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[3].height = 30
    input_fill = PatternFill(bgColor="FFFFF2CC", fill_type="solid")
    for i in (9, 10):
        ws.cell(3, i).fill = PatternFill("solid", fgColor="FFFFD966")
    last = MANUAL_TOP + PEOPLE_LAST - 2
    for m in range(MANUAL_TOP, last + 1):
        r = m - MANUAL_TOP + 2   # 計算用の行
        has = f'計算用!$D${r}=""'
        ws[f"A{m}"] = f'=IF({has},"",計算用!$M${r})'
        ws[f"B{m}"] = f'=IF({has},"",計算用!$C${r})'
        ws[f"C{m}"] = f'=IF({has},"",計算用!$D${r})'
        ws[f"D{m}"] = f'=IF({has},"",計算用!$F${r})'
        ws[f"E{m}"] = f'=IF({has},"",計算用!$I${r})'
        ws[f"F{m}"] = f'=IF({has},"",計算用!$G${r})'
        ws[f"G{m}"] = f'=IF({has},"",計算用!$AK${r})'
        ws[f"H{m}"] = f'=IF({has},"",計算用!$AM${r})'
        ws[f"K{m}"] = f'=IF({has},"",計算用!$AP${r})'
        ws[f"L{m}"] = f'=IF({has},"",計算用!$AR${r})'
        ws[f"M{m}"] = (f'=IF({has},IF(OR(I{m}<>"",J{m}<>""),"名前がありません",""),'
                       f'IF(計算用!$J${r}="",IF(OR(I{m}<>"",J{m}<>""),'
                       f'"入力不足のため組に入りません","入力不足"),'
                       f'IF(AND(I{m}<>"",I{m}<>G{m}),"組を変更",IF(J{m}<>"","順番を指定",""))))')
        ws[f"F{m}"].number_format = "0.00"
        for col in "ABDEGHKL":
            ws[f"{col}{m}"].alignment = CENTER
        for col in "IJ":
            ws[f"{col}{m}"].alignment = CENTER
    from openpyxl.worksheet.datavalidation import DataValidation
    dv1 = DataValidation(type="whole", operator="between", formula1="1", formula2=str(HEATS),
                         showErrorMessage=True, errorTitle="組の番号",
                         error=f"1〜{HEATS}の数字を入れてください")
    dv2 = DataValidation(type="whole", operator="between", formula1="1", formula2="6",
                         showErrorMessage=True, errorTitle="何人目",
                         error="1〜6の数字を入れてください")
    ws.add_data_validation(dv1)
    ws.add_data_validation(dv2)
    dv1.add(f"I{MANUAL_TOP}:I{last}")
    dv2.add(f"J{MANUAL_TOP}:J{last}")
    # 名前がある行に罫線、組を変えた行は水色、赤の子の「色」は薄い赤
    ws.conditional_formatting.add(
        f"A{MANUAL_TOP}:M{last}",
        FormulaRule(formula=[f'AND($C{MANUAL_TOP}<>"",$M{MANUAL_TOP}="組を変更")'],
                    fill=PatternFill(bgColor="FFDDEBF7", fill_type="solid"), border=BOX))
    ws.conditional_formatting.add(
        f"A{MANUAL_TOP}:M{last}",
        FormulaRule(formula=[f'AND($C{MANUAL_TOP}<>"",LEFT($M{MANUAL_TOP},4)="入力不足")'],
                    font=Font(color="FF999999"), border=BOX))
    ws.conditional_formatting.add(
        f"I{MANUAL_TOP}:J{last}",
        FormulaRule(formula=[f'$C{MANUAL_TOP}<>""'], fill=input_fill, border=BOX))
    ws.conditional_formatting.add(
        f"A{MANUAL_TOP}:H{last} K{MANUAL_TOP}:M{last}",
        FormulaRule(formula=[f'$C{MANUAL_TOP}<>""'], border=BOX))
    ws.conditional_formatting.add(
        f"E{MANUAL_TOP}:E{last}",
        FormulaRule(formula=[f'E{MANUAL_TOP}="赤"'],
                    fill=PatternFill(bgColor="FFF8CBAD", fill_type="solid")))
    widths = [6, 5, 14, 5, 5, 7, 7, 7, 9, 7, 7, 7, 26]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w
    ws.freeze_panes = f"D{MANUAL_TOP}"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = 9
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = "3:3"


def put_print_areas(path, sheetnames, heat_cols):
    """人数に合わせて変わる印刷範囲（openpyxlでは書けないので、あとから書き込む）。"""
    areas = {
        "組ごとタイム順": "OFFSET(組ごとタイム順!$A$1,0,0,3+MAX(計算用!$Q$2:$Q$5),17)",
        "4人組": f"OFFSET('4人組'!$A$1,0,0,3+MAX(計算用!$Q$9,計算用!$Q$11),{heat_cols})",
        "決定版": f"OFFSET(決定版!$A$1,0,0,3+MAX(計算用!$Q$13,計算用!$Q$14),{heat_cols})",
    }
    names = "".join(
        f"<definedName name=\"_xlnm.Print_Area\" localSheetId=\"{sheetnames.index(n)}\">"
        f"{a}</definedName>" for n, a in areas.items())
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


# テストデータの手動調整: (手動調整シートの行, 変更後の組, 何人目)
#   山本 りょう（1組目）と 前田 あおい（2組目）を入れかえる
#   渡辺 こうき は同じ組のまま、3人目に並べる
TEST_MANUAL = [(15, 2, 1), (93, 1, 2), (21, None, 3)]


def fill_test_manual(ws):
    for row, grp, pos in TEST_MANUAL:
        if grp is not None:
            ws[f"I{row}"] = grp
        if pos is not None:
            ws[f"J{row}"] = pos


def main():
    for out, test in ((OUT_BLANK, False), (OUT_TEST, True)):
        wb = openpyxl.load_workbook(SRC)
        build_calc(wb["計算用"])
        build_final_calc(wb["計算用"])
        idx = wb.sheetnames.index("4人組")
        heat_cols = build_heat_sheet(wb, "4人組", idx, final=False)
        build_manual_sheet(wb, idx + 1)
        build_heat_sheet(wb, "決定版", idx + 2, final=True)
        if test:
            fill_test(wb["①データ入力"])
            fill_test_manual(wb["手動調整"])
        wb.calculation = CalcProperties(fullCalcOnLoad=True)
        wb.active = 0
        wb.save(out)
        put_print_areas(out, wb.sheetnames, heat_cols)
        print("wrote", out)


if __name__ == "__main__":
    main()
