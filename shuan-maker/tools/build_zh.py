# 図工（日文 1・2上下）と保健（東書 3〜6年）の読み取り結果を、embed_units.py に渡す形にする
import json, re, sys
def spread(acts, h):
    """活動（目標）を h 時間に割りふる。多いときは最後の時間にまとめ、少ないときは前から多めに割り当てる"""
    acts = acts or ['']
    k = len(acts); out = []
    if k >= h:
        return ['\n'.join([a]) for a in acts[:h - 1]] + ['\n'.join(acts[h - 1:])]
    base, extra = divmod(h, k)
    for i, a in enumerate(acts):
        n = base + (1 if i < extra else 0)
        out += [a + (f'（{j + 1}/{n}）' if n > 1 else '') for j in range(n)]
    return out
D = sys.argv[1]
# 図工：上＝1年、下＝2年。時数は参考時数の多いほう。展開例ごとに別の題材にする
for g, f in ((1, 'jo'), (2, 'ge')):
    units = []
    for u in json.load(open(f'{D}/{f}.json')):
        nm = u['title'] + (f"（{u['sub']}）" if u['sub'] else '')
        h = u['hmax']; ls = spread(u['acts'], h)
        units.append({'name': nm, 'month': None, 'hours': h, 'aim': f"参考時数 {u['hmin']}～{u['hmax']}時間（{u['pp']}）" if u['hmin'] != u['hmax'] else f"参考時数 {h}時間（{u['pp']}）", 'lessons': ls, 'short': ls})
    json.dump({'units': units}, open(f'{D}/zuko{g}.json', 'w'), ensure_ascii=False, indent=1)
    print('図工', g, len(units), sum(u['hours'] for u in units))
# 保健：3・4年の資料は 1章＝3年、2章＝4年。5・6年の資料は 1・2章＝5年、3章＝6年。1時間ずつ小単元の目標を入れる
for f, gm in (('h34', {1: 3, 2: 4}), ('h56', {1: 5, 2: 5, 3: 6})):
    for u in json.load(open(f'{D}/{f}.json')):
        g = gm[u['no']]; ls = []
        for s in u['subs']:
            n = s['hours']; gs = s['goals']
            ls += spread(gs, n)
        assert len(ls) == u['hours'], (u['name'], len(ls), u['hours'])
        path = f'{D}/hoken{g}.json'
        try: d = json.load(open(path))
        except FileNotFoundError: d = {'units': []}
        if any(x['name'] == u['name'] for x in d['units']): continue
        d['units'].append({'name': u['name'], 'month': None, 'hours': len(ls), 'aim': '', 'lessons': ls, 'short': ls})
        json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
        print('保健', g, u['name'], len(ls))
