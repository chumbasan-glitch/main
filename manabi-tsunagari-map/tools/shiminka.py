# 品川区版：品川区立学校教育要領（平成30年3月）第3章 市民科 から，5領域15能力の内容を取り出す
# 使い方: python3 tools/shiminka.py <第3章のPDF>  → data/shiminka.json
# PDF: https://www.city.shinagawa.tokyo.jp/kodomo/gakkokyoiku/1007207/1007212.html の「市民科(p234-248)」
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = pdfplumber.open(sys.argv[1])
clean = lambda x: re.sub(r'\s+', '', x or '')

# 表2：領域と能力の説明（領域名・能力名は表の先頭にくっついているので，名前で切り分ける）
AREAS = [('A', '自己管理領域', ['自己管理能力', '生活適応能力', '責任遂行能力']),
         ('B', '人間関係形成領域', ['自他理解能力', '集団適応能力', 'コミュニケーション能力']),
         ('C', '自治的活動領域', ['秩序形成能力', '自治的活動能力', '社会的判断・行動能力']),
         ('D', '文化創造領域', ['自己修養能力', '企画・表現能力', '文化継承能力']),
         ('E', '将来設計領域', ['将来設計能力', '社会認識能力', '社会貢献能力'])]
norm = lambda x: x.replace('･', '・')
desc = {}
for i in (2, 3):
    for t in pdf.pages[i].find_tables():
        for r in t.extract():
            for c in r[1:]:
                c = norm(clean(c))
                for _, an, abil in AREAS:
                    for n in [an] + abil:
                        if c.startswith(n) and len(c) > len(n) + 5: desc[n] = c[len(n):]

# 第2 内容 1 市民科学習：左ページが1・2年と3・4年，右ページが5・6・7年と8・9年
rows = []
for left, right in ((4, 5), (6, 7)):
    L = [r for r in pdf.pages[left].find_tables()[0].extract()[1:]]
    R = [r for r in pdf.pages[right].find_tables()[0].extract()[1:]]
    assert len(L) == len(R)
    rows += [(l[2], l[3], r[0]) for l, r in zip(L, R)]
assert len(rows) == 15

def bullets(c):
    c = (c or '').replace('\n・', '\x00・')
    return ['・' + norm(clean(x)).lstrip('・') for x in c.split('\x00') if clean(x)]

short = lambda x: (x.lstrip('・')[:24] + '…') if len(x.lstrip('・')) > 25 else x.lstrip('・')
items, k = [], 0
for key, an, abil in AREAS:
    for j, n in enumerate(abil):
        c12, c34, c567 = rows[k]; k += 1
        for band, gs, cell in (('12', [1, 2], c12), ('34', [3, 4], c34), ('56', [5, 6], c567)):
            items.append({'id': f'shiminka-{band}-{key}-{"アイウ"[j]}', 'subject': 'shiminka', 'g': gs, 'area': key, 'areaName': an,
                          'no': "アイウ"[j], 'title': n, 'num': j + 1, 'mark': "アイウ"[j], 'name': an, 'head': n + '：' + short(bullets(cell)[0]),
                          'lines': bullets(cell),
                          'extra': [{'label': '能力のねらい（第1 目標 表2）', 'lines': [n + '：' + desc.get(n, '')]}] +
                                   ([{'label': '指導内容の学年区分', 'lines': ['教育要領では「第5学年，第6学年及び第7学年」の内容です（小中一貫の学年区分）。']}] if band == '56' else []),
                          'themes': {'shm_' + key + str(j): n}})

goal = ['教養豊かで品格ある人間形成を目指し，社会における規律・規範を重んじ，自己抑制力とそれを支える倫理観・道徳観をもち，自分自身について考え，常に自己変革を図っていく資質と能力を育てる。また，社会の一員として自立し，社会に積極的に関わるために，自らの社会的役割を自覚して発信・行動し，社会の発展に貢献しようとする資質と能力を育てる。']
plan = []
for i in (9, 10, 11, 12, 13):
    plan += [l for l in (pdf.pages[i].extract_text() or '').split('\n')]
plan = '\n'.join(plan)
plan = plan[plan.index('第３ 指導計画'):plan.index('４ 評価について') if '４ 評価について' in plan else None]
plan = re.sub(r'\n(第|３|章|市|民|科|\d{3}|品川区立学校教育要領|第３章 市民科)(?=\n)', '', '\n' + plan + '\n')
lines, cur = [], ''
for l in plan.split('\n'):
    l = l.strip()
    if not l or l in ('第', '３', '章', '市', '民', '科') or re.fullmatch(r'\d{3}', l) or l.startswith('品川区立学校教育要領') or l == '第３章 市民科': continue
    l = re.sub(r'\s*[章市民科第３]$', '', l) if len(l) > 3 and re.search(r' [章市民科３]$', l) else l
    if re.match(r'^(第３|[０-９１-９]+ |\(\s*\d\s*\)|[ア-コ] |\(ｱ|\(ｲ|\(ｳ|\(ｴ|\(ｵ|\(ｶ|【)', l) or (cur.endswith('。') and not re.match(r'^[，。、）]', l)):
        if cur: lines.append(cur)
        cur = l
    else:
        cur += l
if cur: lines.append(cur)
fixed = []
for l in lines:
    if l.startswith('(1) 市民科の構成'): l = '(1) 市民科の構成：市民科学習，一貫プラン，児童会・生徒会活動，クラブ活動（第4学年，第5学年及び第6学年のみ），学校行事（儀式的行事，文化的行事，健康安全・体育的行事，遠足・旅行・集団宿泊的行事，勤労生産・奉仕的行事）'
    if l.startswith('(2) 標準授業時数'): l = '(2) 標準授業時数（市民科学習及び一貫プラン）：第1・2学年 85時間（市民科学習のみ），第3〜6学年 140時間（市民科学習105＋一貫プラン35）。児童会・生徒会活動，クラブ活動，学校行事は，市民科の授業時数には含めない。'
    if fixed and re.match(r'^(ただし|また|なお)', l): fixed[-1] += l; continue
    fixed.append(l)
lines = fixed
subject = {'id': 'shiminka', 'doc': '品川区立学校教育要領', 'name': '市民科（品川区）', 'h': 330, 'section': '品川区立学校教育要領（平成30年3月）第3章 市民科',
           'goal': goal, 'plan': lines,
           'areas': [{'key': k, 'name': k + '　' + an, 'grades': [1, 2, 3, 4, 5, 6]} for k, an, _ in AREAS],
           'bands': [{'grades': g, 'goal': [], 'extra': []} for g in ([1, 2], [3, 4], [5, 6])],
           'spans': [[1, 2], [3, 4], [5, 6]]}
themes = [{'id': 'shm_' + k + str(j), 'name': k + '　' + n} for k, _, abil in AREAS for j, n in enumerate(abil)]
json.dump({'subject': subject, 'items': items, 'themes': themes}, open(os.path.join(ROOT, 'data', 'shiminka.json'), 'w'), ensure_ascii=False, indent=1)
print(len(items), 'items;', len(lines), 'plan lines;', len(desc), 'descriptions')
