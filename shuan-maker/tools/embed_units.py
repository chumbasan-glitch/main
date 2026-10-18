# 作業役が作った単元計画（{"units":[{name,month,hours,aim,lessons,short}]}）をツールの PRESETS に足す
# 使い方: embed_units.py ツール.html キー接頭辞 教科名 会社名 ファイル（{g}を学年に置きかえ） 学年...
import json, re, sys, os
html, prefix, subject, company, pattern = sys.argv[1:6]
grades = [int(g) for g in sys.argv[6:]]
s = open(html).read()
m = re.search(r'const PRESETS = (\{.*?\});\n', s, re.S)
pre = json.loads(m.group(1).replace('<\\/', '</'))
for g in grades:
    path = pattern.replace('{g}', str(g))
    if not os.path.exists(path): print('なし', path); continue
    d = json.load(open(path))
    units, seen = [], {}
    for u in d['units']:
        h = int(u['hours'])
        assert h == len(u['short']) == len(u['lessons']), (g, u['name'], h, len(u['short']), len(u['lessons']))
        nm = re.sub(r'^[0-9０-９]+[.．]\s*', '', re.sub(r'[\s　]+', ' ', u['name']).strip())   # 「1. ものの燃え方と空気」の番号を外す（「2-1 …」は残す）
        nm = re.sub(r'^いかす[：:]\s*(.*)$', lambda mm: re.sub(r'（[^（）]*）$', '', mm.group(1)) + '（単元全体のいかす）', nm)   # 名前の付け方を学年でそろえる
        if nm in seen:   # 同じ名前の単元は、2回目から月（なければ番号）を付けて区別する
            seen[nm] += 1; nm = f"{nm}（{u['month']}月）" if u.get('month') else f"{nm}（{seen[nm]}）"
        else: seen[nm] = 1
        units.append({'name': nm, 'month': u.get('month'), 'total': h, 'aim': u.get('aim', ''), 'title': '', 'lessons': u['lessons'], 'short': u['short']})
    pre[f'{prefix}-{g}'] = {'label': f'{company}　{g}年　{subject}（年間指導計画）', 'grade': g, 'subject': subject, 'units': units}
    print(g, len(units), sum(u['total'] for u in units))
js = json.dumps(pre, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
s = s[:m.start(1)] + js + s[m.end(1):]
open(html, 'w').write(s)
