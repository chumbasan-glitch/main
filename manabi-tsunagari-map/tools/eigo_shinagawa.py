# 品川区版：品川区立学校教育要領（平成30年3月）第2章 第10節 英語 から，1〜6年の領域別の目標とリタラシー学習を取り出す
# 使い方: python3 tools/eigo_shinagawa.py <第10節 英語のPDF>  → data/eigo_shinagawa.json
# PDF: https://www.city.shinagawa.tokyo.jp/kodomo/gakkokyoiku/1007207/1007212.html の「英語(p213-233)」
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = pdfplumber.open(sys.argv[1])
clean = lambda x: re.sub(r'\s+', '', x or '').replace(',', '，')

def body(i):
    """左右の見出し（教科名のつまみ）を除いた本文"""
    pg = pdf.pages[i]
    box = (38, 30, 560, 812)   # つまみは左（x≒12）か右（x≒570）にある
    return pg.crop(box).extract_text() or ''

def points(cell):
    """ア・イ・ウ・○ の項目ごとに分ける"""
    c = clean(cell)
    parts = re.split(r'(?=(?<![ァ-ヶー])[アイウエオ][^\x00-\x7fァ-ヶー])|(?=○)', c)
    out = []
    for x in parts:
        if not x: continue
        if out and not re.match(r'^[アイウエオ○]', x): out[-1] += x
        else: out.append(x)
    return [re.sub(r'^([アイウエオ])', r'\1　', x).replace('○', '○　') for x in out]

AREAS = [('E1', '聞くこと'), ('E2', '読むこと'), ('E3', '話すこと［やり取り］'), ('E4', '話すこと［発表］'), ('E5', '書くこと')]
t5 = pdf.pages[5].find_tables()[0].extract()
cells = {}
for r in t5:
    for key, name in AREAS:
        if clean(r[0]).endswith(clean(name)):
            cells[(key, '12')], cells[(key, '34')] = r[1], r[2]
t6 = [r for r in pdf.pages[6].find_tables()[0].extract() if any(clean(c) for c in r)]
# 5・6年の列：[目標の前文, 聞く, 聞く○, 読む, やり取り, 発表, 書く, 書く○]
col = [r[0] for r in t6[1:]]
cells[('E1', '56')] = (col[1] or '') + (col[2] or '')
cells[('E2', '56')] = col[3]
cells[('E3', '56')] = col[4]
cells[('E4', '56')] = col[5]
cells[('E5', '56')] = (col[6] or '') + (col[7] or '')

BANDS = (('12', [1, 2], '第1学年及び第2学年'), ('34', [3, 4], '第3学年及び第4学年'), ('56', [5, 6], '第5学年及び第6学年'))
items = []
for key, name in AREAS:
    for b, gs, lbl in BANDS:
        ls = points(cells.get((key, b)))
        if not ls: continue
        first = re.sub(r'^[アイウエオ○]　', '', ls[0])
        items.append({'id': f'eigoshina-{b}-{key}-1', 'subject': 'eigoshina', 'g': gs, 'area': key, 'areaName': name,
                      'no': '1', 'title': name + 'の目標', 'num': 1, 'name': '〔' + lbl + '〕　２ 内容…ではなく「第2 各学年の目標」', 'head': name + '：' + (first[:24] + '…' if len(first) > 25 else first),
                      'lines': ls, 'themes': {'esh_' + key: name}})
for it in items: it['name'] = '第２ 各学年の目標及び内容等　１ 目標'

# リタラシー学習（第1学年から第9学年まで一貫して行う順序）
txt = body(1) + '\n' + body(2)
seg = txt[txt.index('系統的なリタラシー'):txt.index('意味のある文脈の中での英語学習')]
lines, cur = [], ''
for l in seg.split('\n')[1:]:
    l = l.strip()
    if not l or re.fullmatch(r'\d{3}|第２章 各教科|品川区立学校教育要領', l) or l.startswith('○'): continue
    if re.match(r'^[①②③・（]', l):
        if cur: lines.append(cur)
        cur = l
    else:
        cur += l
if cur: lines.append(cur)
lines = [l for l in lines if l]
items.append({'id': 'eigoshina-123456-LT-1', 'subject': 'eigoshina', 'g': [1, 2, 3, 4, 5, 6], 'area': 'LT', 'areaName': 'リタラシー学習',
              'no': '1', 'title': 'リタラシー学習の順序', 'num': 1, 'name': '３ 具体的な手だて　○ 系統的なリタラシー学習の実施',
              'head': 'リタラシー学習：①アルファベット指導 → ②音韻認識 → ③フォニックス',
              'lines': ['第1学年から第9学年まで一貫して，読むこと，書くことの能力の育成につながるよう，次の順でリタラシー学習を行う。また，確かな定着を図るために繰り返し，学習を行う。'] + lines[1:] if lines and lines[0].startswith('第1学年') else lines,
              'themes': {'esh_LT': 'リタラシー学習'}})

# 目標（第1 目標）と，指導の手だて（意味のある文脈・指導体制・評価）
g = clean(body(2) + body(3))
gi = g.index('第１目標') + 4
goal_txt = g[gi:g.index('〔学年ごとの目標〕')]
goal = [re.sub(r'\d{3}品川区立学校教育要領$', '', x) for x in re.split(r'(?=\(\d\))', goal_txt) if x]
plan_txt = body(2)
plan_txt = plan_txt[plan_txt.index('○ 意味のある文脈'):plan_txt.index('第１ 目標')]
plan, cur = [], ''
for l in plan_txt.split('\n'):
    l = l.strip()
    if not l or re.fullmatch(r'\d{3}|第２章 各教科', l): continue
    if re.match(r'^[○・]', l):
        if cur: plan.append(cur)
        cur = l
    else:
        cur += l
if cur: plan.append(cur)
subject = {'id': 'eigoshina', 'doc': '品川区立学校教育要領', 'name': '英語（品川区）', 'h': 262,
           'section': '品川区立学校教育要領（平成30年3月）第2章 第10節 英語',
           'goal': goal, 'plan': plan,
           'areas': [{'key': k, 'name': n, 'grades': [1, 2, 3, 4, 5, 6]} for k, n in AREAS] + [{'key': 'LT', 'name': 'リタラシー学習（品川区独自）', 'grades': [1, 2, 3, 4, 5, 6]}],
           'bands': [{'grades': gs, 'goal': [], 'extra': []} for _, gs, _ in BANDS],
           'spans': [[1, 2], [3, 4], [5, 6]]}
themes = [{'id': 'esh_' + k, 'name': n} for k, n in AREAS] + [{'id': 'esh_LT', 'name': 'リタラシー学習'}]
json.dump({'subject': subject, 'items': items, 'themes': themes}, open(os.path.join(ROOT, 'data', 'eigo_shinagawa.json'), 'w'), ensure_ascii=False, indent=1)
print(len(items), 'items;', len(goal), 'goal;', len(plan), 'plan')
