# data/furoku_raw.json（付録6の表）の抜き出しを、学びのつながりマップの内容（項目と行）に結びつける
# 使い方: python3 tools/furoku_match.py  → data/furoku.json と、結びつかなかった行の一覧
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from furoku import HEADS, TOPICS

KAKKO = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇'
HAN = 'ｱｲｳｴｵｶｷｸｹｺｻｼ'; ZENK = 'アイウエオカキクケコサシ'
MARK = re.compile(r'^(\(\d+\)|\([ｱ-ﾝ]\)|[ア-ン] |※|〔|［|[ＡＢＣＤＥＦＧ] |第[１-６]|[１２３４] |\d+ )')

def N(s):
    s = re.sub(r'\((\d+)\)', lambda m: KAKKO[int(m.group(1)) - 1], s)
    s = re.sub(r'\(([ｱ-ﾝ])\)', lambda m: '（' + ZENK[HAN.index(m.group(1))] + '）', s)
    s = s.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
    s = re.sub(r'[\s　「」『』［］\[\]※]', '', s)
    s = s.replace(',', '，').replace('．', '。')
    s = re.sub(r'^([⑴-⒃]|（[ア-ン]）|[ア-ン](?=[^ァ-ン]))', '', s)
    return s

def paragraphs(lines):
    out = []
    for l in lines:
        if not out or MARK.match(l):
            out.append(l)
        else:
            out[-1] += l
    return out

DATA = json.load(open(os.path.join(ROOT, 'data', 'items.json')))
BYSUB = {}
for it in DATA['items']:
    BYSUB.setdefault(it['subject'], []).append(it)
PLAN = {s['id']: s['plan'] for s in DATA['subjects']}

def fields(it):
    f = []
    if it.get('name'): f.append(('name', 0, it['name']))
    if it.get('title'): f.append(('title', 0, it['title']))
    for k, l in enumerate(it['lines']): f.append(('lines', k, l))
    for k, l in enumerate(it.get('notes', [])): f.append(('notes', k, l))
    return f

def score(q, n):
    if q == n: return 10000
    if len(q) >= 10 and q in n: return len(q)
    if len(n) >= 12 and n in q: return len(n)
    k = 0
    while k < min(len(q), len(n)) and q[k] == n[k]: k += 1
    return k if k >= 16 else 0

def match(sub, p):
    """いちばんよく合う行だけを返す（同点は全部）"""
    q = N(p)
    if len(q) < 6:
        return []
    best, hits = 0, []
    subs = ['gaikokugokatsudo', 'gaikokugo'] if sub == 'gaikoku' else [sub]
    for it in [x for s in subs for x in BYSUB.get(s, [])]:
        for fld, k, l in fields(it):
            n = N(l)
            if len(n) < 4: continue
            s = score(q, n)
            if s and s > best: best, hits = s, []
            if s and s == best: hits.append((it['id'], fld, k))
    return hits

raw = json.load(open(os.path.join(ROOT, 'data', 'furoku_raw.json')))
out = {}
for tp in TOPICS:
    R = raw[tp]
    pg = next((l for c in R['cells'] for l in c['lines'] if re.fullmatch(r'\d{3}', l)), '')
    T = {'page': int(pg) if pg else None, 'sosoku': [], 'cites': [], 'plan': [], 'unmatched': []}
    cur = None
    for c in R['cells']:
        if len(c['lines']) == 1 and c['lines'][0].replace(' ', '') in HEADS:
            continue
    # 見出しのセル → その下のセル
    heads = {(c['left'], c['right']): [] for c in R['cells']}
    cells = R['cells']
    for c in cells:
        name = ' '.join(c['lines']).replace(' ', '')
        if len(c['lines']) == 1 and name in HEADS:
            c['head'] = HEADS[name]
    for c in cells:
        if 'head' in c: continue
        # 同じ列で，すぐ上にある見出しセル
        hs = [h for h in cells if 'head' in h and h['left'] <= c['left'] + 2 and h['right'] >= c['right'] - 2 and h['top'] < c['top']]
        if not hs: continue
        h = max(hs, key=lambda h: h['top'])
        sub = h['head']
        paras = paragraphs(c['lines'])
        if sub == 'sosoku':
            T['sosoku'] += paras; continue
        for p in paras:
            hits = match(sub, p)
            if hits:
                T['cites'].append({'subject': sub, 'text': p, 'hits': hits})
            elif len(N(p)) >= 15 and any(N(p)[:12] in N(x) for x in PLAN.get(sub, [])):
                T['plan'].append({'subject': sub, 'text': p})
            elif sub == 'gaikoku' and len(N(p)) >= 20:
                # 外国語活動・外国語の「指導計画の作成と内容の取扱い」は各章の中にあるので，ここで振り分ける
                s2 = 'gaikokugokatsudo' if ('第５学年及び第６学年並びに' in p or '外国語活動を通して' in p) else 'gaikokugo'
                T['plan'].append({'subject': s2, 'text': p})
            else:
                T['unmatched'].append({'subject': sub, 'text': p})
    # 項目ごとにまとめる：本文や内容の取扱いの行に当たったもの，または見出しが1つの項目だけに当たったもの
    items = {}
    for c in T['cites']:
        ids = {h[0] for h in c['hits']}
        for iid, fld, k in c['hits']:
            # たくさんの項目に同じ文がある行（「次のような知識及び技能を…」など）は手がかりにしない
            # 1つの項目にだけ当たった行を手がかりにする（同じ文がいくつもの項目にある行は，色付けだけに使う）
            ok = len(ids) == 1
            d = items.setdefault(iid, {'ok': False, 'lines': set(), 'notes': set(), 'head': False})
            if ok: d['ok'] = True
            if len(ids) > 3: continue
            if fld == 'lines': d['lines'].add(k)
            elif fld == 'notes': d['notes'].add(k)
            else: d['head'] = True
    # 同じ文が複数の項目にあるが，付録6の表で確かめて入っていると分かったもの
    FORCE = {'郷土や地域': ['gaikokugokatsudo-34-H-1', 'gaikokugo-56-H-1'], '心身の健康の保持増進': ['taiiku-56-A-0']}
    for iid in FORCE.get(tp, []):
        d = items.setdefault(iid, {'ok': True, 'lines': set(), 'notes': set(), 'head': False})
        d['ok'] = True
        for c in T['cites']:
            for h in c['hits']:
                if h[0] == iid: (d['lines'] if h[1] == 'lines' else d['notes'] if h[1] == 'notes' else set()).add(h[2])
    # 体育：「同様に記載」とある「場や用具の安全」の⑶を，ほかの領域・学年にも付ける
    if tp == '防災を含む安全':
        for it in BYSUB['taiiku']:
            for k, l in enumerate(it['lines']):
                if it['area'] != 'G' and l.startswith('⑶') and '安全' in l:
                    d = items.setdefault(it['id'], {'ok': True, 'lines': set(), 'notes': set(), 'head': False})
                    d['ok'] = True; d['lines'].add(k)
    T['items'] = {k: {'lines': sorted(v['lines']), 'notes': sorted(v['notes']), 'head': v['head']} for k, v in items.items() if v['ok']}
    T['plan'] = [p for p in T['plan'] if len(N(p['text'])) >= 15]
    out[tp] = T
    print('==', tp, 'p.', T['page'], 'items', len(T['items']), 'plan', len(T['plan']), 'unmatched', len(T['unmatched']))
    for u in T['unmatched']:
        if len(N(u['text'])) > 24 and '--quiet' not in sys.argv:
            print('   ?', u['subject'], u['text'][:90])
json.dump(out, open(os.path.join(ROOT, 'data', 'furoku.json'), 'w'), ensure_ascii=False, indent=1)
