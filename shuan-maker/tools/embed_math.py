# 算数 1〜5年の年間指導計画（Excelから読み取ったもの）をツールの PRESETS に足す
import json, re, sys
html, mdir = sys.argv[1], sys.argv[2]
s = open(html).read()
m = re.search(r'const PRESETS = (\{.*?\});\n', s, re.S)
pre = json.loads(m.group(1).replace('<\\/', '</'))
for g in [1, 2, 3, 4, 5, 6]:
    d = json.load(open(f'{mdir}/math{g}.json'))
    units, seen = [], {}
    for u in d:
        assert u['rows'] == u['hours'] == len(u['short']), (g, u['name'])
        nm = re.sub(r'[\s　]+', ' ', u['name']).strip()
        if nm in seen:   # 同じ名前の単元は、2回目から月を付けて区別する
            seen[nm] += 1; nm2 = f"{nm}（{u['month']}月）"
            while any(x['name'] == nm2 for x in units): nm2 += '②'
            nm = nm2
        else: seen[nm] = 1
        units.append({'name': nm, 'month': u['month'], 'total': u['hours'], 'aim': u['aim'], 'title': '', 'lessons': u['lessons'], 'short': u['short']})
    pre[f'sansu-{g}'] = {'label': f'算数　{g}年（年間指導計画　2023年8月版）', 'grade': g, 'subject': '算数', 'units': units}
js = json.dumps(pre, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
s = s[:m.start(1)] + js + s[m.end(1):]
open(html, 'w').write(s)
print({k: (len(v['units']), sum(u['total'] for u in v['units'])) for k, v in pre.items()}, len(s))
