# 光村図書 国語 1〜6年の年間指導計画（読み取り結果＋短い文）をツールの PRESETS に入れる
import json, re, sys
html, plandir = sys.argv[1], sys.argv[2]
s = open(html).read()
m = re.search(r'const PRESETS = (\{.*?\});\n', s, re.S)
pre = json.loads(m.group(1).replace('<\\/', '</'))
out = {}
# 単元名の直し：作業役の案のうち採用するもの（本は友達などの見出しは、どの学年も見出しのままにそろえる）
ACCEPT = {(2, 34), (4, 17)}
OVERRIDE = [{'g': 5, 'index': 17, 'from': '作家で広げるわたしたちの読書モモ', 'to': '本は友達'}]
for g in [1, 2, 3, 4, 5, 6]:
    key = f'mitsumura-{g}-kokugo'
    if g == 6:
        plan = json.load(open(f'{plandir}/plan6.json')); shorts = json.load(open(f'{plandir}/short6.json')); renames = []
    else:
        plan = json.load(open(f'{plandir}/all/plan{g}.json'))
        sh = json.load(open(f'{plandir}/all/short{g}.json'))
        shorts, renames = sh['short'], sh.get('renames', [])
    renames = [r for r in renames if (g, r['index']) in ACCEPT] + [r for r in OVERRIDE if r['g'] == g]
    assert len(shorts) == len(plan), (g, len(shorts), len(plan))
    units = []
    for i, (u, x) in enumerate(zip(plan, shorts)):
        assert len(x) == u['hours'], (g, i, u['name'], len(x), u['hours'])
        units.append({'name': u['name'], 'month': u['month'], 'total': u['hours'], 'aim': u['aim'], 'title': u['title'], 'lessons': u['lessons'], 'short': x})
    for r in renames:
        assert units[r['index']]['name'] == r['from'], r
        units[r['index']]['name'] = r['to']
    out[key] = {'label': f'光村図書　{g}年　国語（年間指導計画例）', 'grade': g, 'subject': '国語', 'units': units}
js = json.dumps(out, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
s = s[:m.start(1)] + js + s[m.end(1):]
open(html, 'w').write(s)
print({k: (len(v['units']), sum(u['total'] for u in v['units'])) for k, v in out.items()}, len(s))
