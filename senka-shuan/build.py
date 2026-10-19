# template.html に教科書の年間指導計画（presets.json）を入れて、専科週案ツクール.html を作る
import json, pathlib
here = pathlib.Path(__file__).parent
tpl = (here / "template.html").read_text(encoding="utf-8")
presets = json.loads((here / "presets.json").read_text(encoding="utf-8"))
js = json.dumps(presets, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
mark = "/*PRESETS*/{}"
assert tpl.count(mark) == 1
(here / "専科週案ツクール.html").write_text(tpl.replace(mark, js), encoding="utf-8")
print("ok", len(tpl.replace(mark, js).encode()))
