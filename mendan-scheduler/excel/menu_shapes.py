"""各シートの上のメニューを「図形のボタン」にする（大きさが同じで、列を開いても動かない）。
openpyxl は図形を書けないので、保存したあとの xlsx を直接書きかえる。"""
import re, zipfile, shutil, os, html

EMU = 9525                       # 1px
X0, Y0, W, H, GAP = 270, 13, 92, 32, 4
MENU = [("ホーム", "ホーム"), ("設定", "① 設定"), ("名簿", "② 名簿"), ("×入力", "③ ×入力"), ("自動案A", "④ 自動案A"), ("自動案B", "④ 自動案B"),
        ("調整・決定", "⑤ 調整・決定"), ("兄弟確認用", "⑥ 兄弟確認"), ("お手紙（夏）", "⑦ お手紙 夏"), ("お手紙（秋）", "⑧ お手紙 秋")]


def _shape(sid, rid, x, label, cur, font):
    fillc, txt = ("FFE9A8", "1F3F7A") if cur else ("2F6CC4", "FFFFFF")
    return (f'<xdr:absoluteAnchor><xdr:pos x="{x*EMU}" y="{Y0*EMU}"/><xdr:ext cx="{W*EMU}" cy="{H*EMU}"/>'
            f'<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{sid}" name="メニュー{sid}">'
            f'<a:hlinkClick xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="{rid}"/></xdr:cNvPr><xdr:cNvSpPr/></xdr:nvSpPr>'
            f'<xdr:spPr><a:xfrm><a:off x="{x*EMU}" y="{Y0*EMU}"/><a:ext cx="{W*EMU}" cy="{H*EMU}"/></a:xfrm>'
            f'<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="{fillc}"/></a:solidFill>'
            f'<a:ln w="12700"><a:solidFill><a:srgbClr val="1F3F7A"/></a:solidFill></a:ln></xdr:spPr>'
            f'<xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip" wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="ctr"/><a:lstStyle/>'
            f'<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="ja-JP" altLang="en-US" sz="1000" b="1"><a:solidFill><a:srgbClr val="{txt}"/></a:solidFill>'
            f'<a:latin typeface="{font}"/><a:ea typeface="{font}"/></a:rPr><a:t>{html.escape(label)}</a:t></a:r></a:p></xdr:txBody></xdr:sp>'
            f'<xdr:clientData fLocksWithSheet="0" fPrintsWithSheet="0"/></xdr:absoluteAnchor>')


def add_menu(path, sheets, menu=MENU, font="Meiryo UI"):
    """sheets: メニューを付けるシート名　menu: [(シート名, ボタンの文字)…]"""
    tmp = path + ".tmp"
    zin = zipfile.ZipFile(path)
    files = {n: zin.read(n) for n in zin.namelist()}
    zin.close()
    wbx = files["xl/workbook.xml"].decode("utf-8")
    rels = files["xl/_rels/workbook.xml.rels"].decode("utf-8")
    rid2t = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels)) | {a: b for b, a in re.findall(r'Target="([^"]+)"[^>]*Id="(rId\d+)"', rels)}
    ct = files["[Content_Types].xml"].decode("utf-8")
    ndraw = max([int(m) for m in re.findall(r"xl/drawings/drawing(\d+)\.xml", "\n".join(files))] + [0])
    for name, rid in re.findall(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"', wbx):
        name = html.unescape(name)
        if name not in sheets:
            continue
        sp = "xl/" + rid2t[rid].lstrip("/").replace("xl/", "")
        srel = sp.replace("worksheets/", "worksheets/_rels/") + ".rels"
        sx = files[sp].decode("utf-8")
        sr = files.get(srel, b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>').decode("utf-8")
        m = re.search(r'<drawing\b[^>]*r:id="(rId\d+)"', sx)
        if m:                                           # すでに図（色の見かたなど）がある
            tgt = re.search(rf'Id="{m.group(1)}"[^>]*Target="([^"]+)"', sr) or re.search(rf'Target="([^"]+)"[^>]*Id="{m.group(1)}"', sr)
            t = tgt.group(1)
            dp = t.lstrip("/") if t.startswith("/") else os.path.normpath(os.path.join(os.path.dirname(sp), t)).replace("\\", "/")
        else:
            ndraw += 1
            dp = f"xl/drawings/drawing{ndraw}.xml"
            files[dp] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '
                         'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"></xdr:wsDr>').encode("utf-8")
            nr = f"rIdM{ndraw}"
            sr = sr.replace("</Relationships>", f'<Relationship Id="{nr}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing{ndraw}.xml"/></Relationships>')
            pos = min([sx.find(t) for t in ("<legacyDrawing", "<tableParts", "<extLst", "</worksheet>") if sx.find(t) >= 0])
            sx = sx[:pos] + f'<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="{nr}"/>' + sx[pos:]
            files[sp] = sx.encode("utf-8"); files[srel] = sr.encode("utf-8")
            ct = ct.replace("</Types>", f'<Override PartName="/{dp}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>')
        drel = dp.replace("drawings/", "drawings/_rels/") + ".rels"
        dr = files.get(drel, b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>').decode("utf-8")
        dx = files[dp].decode("utf-8")
        shapes = []
        for k, (sh, lab) in enumerate(menu):
            hr = f"rIdMenu{k+1}"
            dr = dr.replace("</Relationships>", f'<Relationship Id="{hr}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="#\'{html.escape(sh)}\'!A1"/></Relationships>')
            shapes.append(_shape(900 + k, hr, X0 + k * (W + GAP), lab, sh == name, font))
        root = re.search(r"<(\w+:)?wsDr\b[^>]*>", dx)            # 図の部品の先頭（名前の付け方はファイルによる）
        rt = root.group(0)
        for pre, uri in (("xdr", "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"),
                         ("a", "http://schemas.openxmlformats.org/drawingml/2006/main")):
            if f"xmlns:{pre}=" not in rt:
                rt = rt[:-1] + f' xmlns:{pre}="{uri}">'
        dx = dx.replace(root.group(0), rt, 1)
        end = dx.rindex("</")
        dx = dx[:end] + "".join(shapes) + dx[end:]
        files[dp] = dx.encode("utf-8"); files[drel] = dr.encode("utf-8")
    files["[Content_Types].xml"] = ct.encode("utf-8")
    zout = zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED)
    for n, b in files.items():
        zout.writestr(n, b)
    zout.close()
    shutil.move(tmp, path)
