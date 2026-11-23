# 東京書籍「新編 新しい家庭５・６」年間指導計画作成資料（katei_skeikaku_202401.docx）から単元計画を作る
# 使い方: python3 katei.py katei_skeikaku_202401.docx > katei.json
import json, math, re, sys
import docx
from docx.table import Table

Z2H = str.maketrans("０１２３４５６７８９．", "0123456789.")
d = docx.Document(sys.argv[1])
tables = [Table(el, d) for el in d.element.body.iterchildren() if el.tag.endswith("}tbl")]

def texts(row):
    out = []
    for c in row.cells:
        t = c.text.strip()
        if not out or out[-1] != t: out.append(t)
    return out

units = []
cur = None
for t in tables:
    c0 = t.rows[0].cells[0].text.strip()
    if c0.startswith("大題材名"):
        r0, r1 = texts(t.rows[0]), texts(t.rows[1])
        name = re.sub(r"^[0-9０-９]+\s*[\.．]\s*", "", r0[1].translate(Z2H)).strip()
        hours = float(re.sub(r"[^\d.]", "", r1[1].translate(Z2H)) or 0)
        m = re.search(r"\d+", r1[3].translate(Z2H))
        cur = {"name": name, "month": int(m.group()) if m else None, "total": int(round(hours)), "aim": "", "title": "", "rows": [], "pages": r0[3]}
        units.append(cur)
    elif c0.startswith("大題材の目標") and cur:
        cur["aim"] = t.rows[0].cells[-1].text.strip()
    elif c0 == "目標" and cur:
        head = ""
        for row in t.rows[1:]:
            cs = texts(row)
            if len(cs) == 1:   # 小題材の見出し「(1) 〜しよう ★他教科との関連…」
                head = re.sub(r"\s*★.*$", "", cs[0].split("\n")[0]).strip()
                continue
            goal = [x.strip() for x in cs[0].split("\n") if x.strip() and not x.strip().startswith("教")]
            h = float(re.sub(r"[^\d.]", "", cs[1].translate(Z2H)) or 0)
            acts = cs[2].strip()
            cur["rows"].append({"head": head, "goal": re.sub(r"^・", "", goal[0]) if goal else head, "h": h, "acts": acts})

out = {}
for g, lo, hi in [(5, 0, 9), (6, 9, 16)]:
    us = []
    for u in units[lo:hi]:
        # 小題材の時数（0.25 などもある）を1時間ずつに割りふる
        slots = [[] for _ in range(u["total"])]
        pos = 0.0
        for r in u["rows"]:
            a, b = pos, pos + r["h"]; pos = b
            ks = list(range(int(math.floor(a + 1e-9)), max(int(math.ceil(b - 1e-9)), int(math.floor(a + 1e-9)) + 1)))
            for j, k in enumerate(ks):
                if k < len(slots): slots[k].append((r, j + 1, len(ks)))
        lessons, short = [], []
        for sl in slots:
            sh, ls = [], []
            for r, j, n in sl:
                suf = "（%d/%d）" % (j, n) if n > 1 else ""
                sh.append(r["goal"] + suf); ls.append(r["head"] + suf + "\n" + r["acts"])
            short.append("\n".join(sh)); lessons.append("\n".join(ls))
        us.append({"name": u["name"], "month": u["month"], "total": u["total"], "aim": u["aim"] + ("\n（教科書 %s）" % u["pages"] if u["pages"] else ""), "title": "", "lessons": lessons, "short": short})
    out["katei-%d" % g] = {"label": "東京書籍　%d年　家庭（年間指導計画作成資料）" % g, "grade": g, "subject": "家庭", "units": us}
print(json.dumps(out, ensure_ascii=False))
