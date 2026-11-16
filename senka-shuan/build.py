# template.html に教科書の年間指導計画（presets.json）を入れて、ツールのファイルを作る
#   template.html         → スマート専科用週案.html（v2系・来年度用）
#   kotoshi/template.html → スマート専科用週案_v1.7_今年度用.html（v1系に保存のしかただけを足した今年度用）
import json, pathlib
here = pathlib.Path(__file__).parent
presets = json.loads((here / "presets.json").read_text(encoding="utf-8"))
js = json.dumps(presets, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
mark = "/*PRESETS*/{}"
for src, out in [("template.html", "スマート専科用週案.html"), ("kotoshi/template.html", "スマート専科用週案_v1.7_今年度用.html")]:
    tpl = (here / src).read_text(encoding="utf-8")
    assert tpl.count(mark) == 1, src
    html = tpl.replace(mark, js)
    (here / out).write_text(html, encoding="utf-8")
    print("ok", out, len(html.encode()))
