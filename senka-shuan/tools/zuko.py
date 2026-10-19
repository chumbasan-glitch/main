# 日本文教出版「年間指導計画・評価規準例」Excel（r6_zuko_nenkei_hyouka.xlsx）の「年間指導計画全学年」から単元計画を作る
# 使い方: python3 zuko.py r6_zuko_nenkei_hyouka.xlsx > zuko.json
import json, re, sys, warnings
import openpyxl
warnings.filterwarnings("ignore")
Z2H = str.maketrans("０１２３４５６７８９～－", "0123456789～-")
GRADE = {"１・２上": 1, "１・２下": 2, "３・４上": 3, "３・４下": 4, "５・６上": 5, "５・６下": 6}

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ws = wb["年間指導計画全学年"]
out = {}
for r in ws.iter_rows(min_row=4, values_only=True):
    g = GRADE.get(str(r[2] or "").strip())
    if not g or not r[3]: continue
    name = re.sub(r"\s*\n\s*", "", str(r[3]).strip())
    name = re.sub(r"[～〜]([^～〜]+)[～〜]$", r"（\1）", name)   # 副題は（ ）でくくる
    hrs = str(r[5] or "").translate(Z2H).strip()
    nums = [int(x) for x in re.findall(r"\d+", hrs)]
    total = max(nums) if nums else 1
    lines = [re.sub(r"^○\s*", "", x).strip() for x in str(r[10] or "").split("\n") if x.strip()]
    # 1行1時間。行が時数より多いときは、残りを最後の時間にまとめる
    if len(lines) > total: lessons = lines[:total - 1] + ["\n".join(lines[total - 1:])]
    else: lessons = lines
    u = {"name": name, "month": None, "total": total, "aim": "参考時数 %s時間（%s）" % (hrs, str(r[4] or "").strip().translate(Z2H)), "title": "", "lessons": lessons, "short": list(lessons)}
    p = out.setdefault("zuko-%d" % g, {"label": "日本文教出版　%d年　図工（年間指導計画）" % g, "grade": g, "subject": "図工", "units": []})
    p["units"].append(u)
print(json.dumps(out, ensure_ascii=False))
