# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 国語編』から，指導事項ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_kokugo.py <解説 国語編のPDF>  → data/kaisetsu/kokugo.json
# PDF: https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_002.pdf
# 解説の第3章は，「〇言葉の働き」のような項目ごとに，各学年の指導事項の系統の表と，その学年の指導事項の説明が続く。
# 表は除き，項目の名前は「系統で比べる」の行に使う。
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 3
pdf = pdfplumber.open(sys.argv[1])
norm = lambda x: re.sub(r'[\s　]', '', x)

def page_lines(i, book):
    pg = pdf.pages[i]
    m = 119 if book % 2 == 0 else 80
    boxes = [t.bbox for t in pg.find_tables()]
    inbox = lambda o: any(b[0] - 2 <= o['x0'] <= b[2] + 2 and b[1] - 2 <= o['top'] <= b[3] + 2 for b in boxes)
    f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 7 and m - 15 <= o['x0'] <= m + 402 and 22 < o['top'] < pg.height - 45 and not inbox(o)))
    out = []
    for l in f.extract_text_lines(y_tolerance=6):
        t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
        if not t or re.fullmatch(r'\d{1,3}', t): continue
        fn = l['chars'][0].get('fontname', '')
        out.append((book, t, round(l['x0']) - m, round(l['x1']) - m, 'Gothic' in fn or 'Kaku' in fn or 'Bold' in fn))
    return out

def paras(seg):
    out, cur, prev = [], '', None
    for L in seg:
        b, t, off, right, goth = L
        cont = prev is not None and prev[3] >= 385
        if t[:1] in '〇○・◎［' or re.match(r'^[ア-ケ]\s', t) or (not cont and (abs(off - 11) <= 2 or off > 13 or goth)):
            if cur: out.append(cur)
            cur = ''
        cur += t
        if right < 385:
            out.append(cur); cur = ''
        prev = L
    if cur: out.append(cur)
    return [p for p in out if p.strip()]

ITEMS = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] == 'kokugo'}
BANDS = {'第１学年及び第２学年の内容': '12', '第３学年及び第４学年の内容': '34', '第５学年及び第６学年の内容': '56'}
SECS = {'言葉の特徴や使い方に関する事項': 'K1', '情報の扱い方に関する事項': 'K2', '我が国の言語文化に関する事項': 'K3',
        '話すこと・聞くこと': 'A', '書くこと': 'B', '読むこと': 'C'}

lines = []
for i in range(len(pdf.pages)):
    book = i - OFFSET
    if 41 <= book <= 152: lines += page_lines(i, book)

out = {'source': '小学校学習指導要領（平成29年告示）解説 国語編（文部科学省，平成29年7月）', 'bands': {}, 'items': {}, 'topics': {}}
band = sec = topic = cur = None
buf = []
def flush():
    global buf
    if cur and buf:
        it = out['items'].setdefault(cur, {'page': buf[0][0], 'name': topic, 'expl': {'intro': [], 'k': [], 's': [], 'm': []}})
        kan = 'k' if sec.startswith('K') else 's'
        it['expl'][kan] += paras(buf)
    buf = []

def official(b, s):
    """その学年・区分の指導事項（記号→本文）。言語活動例は記号→'2'"""
    res = {}
    for iid, it in ITEMS.items():
        _, bb, ss, L = iid.split('-')
        if bb != b or ss != s: continue
        if L == '2':
            for l in it['lines']:
                mm = re.match(r'^([ア-ケ])[\s　]+(.*)', l)
                if mm: res['2' + mm.group(1)] = (iid, norm(mm.group(2)))
        else:
            res[L] = (iid, norm(re.sub(r'^[ア-ケ][\s　]+', '', it['lines'][0])))
    return res

OFF = {}
tail = None       # 指導事項の見出しが2行以上に折り返したときの続きの行を読み飛ばす
started = False   # 区分の見出しのあと，最初の「〇」までは指導事項の引用なので読まない
for L in lines:
    b, t, off, right, goth = L
    mm = re.search(r'第\s*\d節\s*(第[１-６]学年及び第[１-６]学年の内容)', t)
    if mm: flush(); band = BANDS[mm.group(1)]; cur = None; continue
    mm = re.fullmatch(r'[⑴⑵⑶]\s*(言葉の特徴や使い方に関する事項|情報の扱い方に関する事項|我が国の言語文化に関する事項)', t) or re.fullmatch(r'[ＡＢＣ]\s*(話すこと・聞くこと|書くこと|読むこと)', t)
    if mm:
        flush(); sec = SECS[mm.group(1)]; cur = None; started = False; OFF = official(band, sec); continue
    if not sec: continue
    if t.startswith('〇'):
        flush(); topic = t[1:].strip(); started = True; cur = None
        out['topics'].setdefault(sec, [])
        if topic not in [x['name'] for x in out['topics'][sec]]: out['topics'][sec].append({'name': topic, 'cells': {}})
        continue
    mm = re.match(r'^([ア-ケ])\s+(.*)', t)
    if not started:
        # 項目の見出し（〇…）が表の中にあって取れなかったときは，太字の指導事項の見出しから始まりを見つけ，ほかの学年の同じ記号の項目を使う
        if not (mm and goth and mm.group(1) in OFF and OFF[mm.group(1)][1][:10] == norm(mm.group(2))[:10]): continue
        row = next((x for x in out['topics'].get(sec, []) if any(i.split('-')[-1] == mm.group(1) for v in x['cells'].values() for i in v)), None)
        if not row: continue
        topic = row['name']; started = True
    if mm and goth is not None:
        head = norm(mm.group(2))
        key = None
        if topic == '言語活動例' and '2' + mm.group(1) in OFF: key = '2' + mm.group(1)
        elif mm.group(1) in OFF and OFF[mm.group(1)][1][:10] == head[:10]: key = mm.group(1)
        if key:
            flush(); cur = OFF[key][0]
            row = next(x for x in out['topics'][sec] if x['name'] == topic)
            row['cells'].setdefault(band, [])
            if cur not in row['cells'][band]: row['cells'][band].append(cur)
            tail = None if t.endswith('。') else OFF[key][1]
            if key.startswith('2'):   # 言語活動例は ア・イ・ウ ごとに説明が続くので，見出しを段落として入れる
                full = next(l for l in ITEMS[cur]['lines'] if l.startswith(key[1]))
                buf.append((b, full, 0, 0, True))
            continue   # 指導事項の本文（見出し）は本文の欄に出すので，解説には入れない
    if tail and len(norm(t)) >= 2 and norm(t) in tail:
        if t.endswith('。'): tail = None   # 見出しの終わり
        continue
    tail = None
    if cur: buf.append(L)
flush()

# 学年の目標の説明（第2章 第1節 2 学年の目標。3つの学年のまとまりに共通）
gl = page_lines(14 + OFFSET, 14) + page_lines(15 + OFFSET, 15)
ps = paras(gl)
k0 = next(i for i, p in enumerate(ps) if p.startswith('⑴は'))
part = {'intro': [], '1': [], '2': [], '3': []}; c = 'intro'
for p in ps[k0:]:
    mm = re.match(r'^([⑴⑵⑶])の', p)
    if mm: c = str('⑴⑵⑶'.index(mm.group(1)) + 1)
    part[c].append(p)
for bb in ('12', '34', '56'): out['bands'][bb] = {'goal': {'page': 14, 'expl': part}}

os.makedirs(os.path.join(ROOT, 'data', 'kaisetsu'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', 'kokugo.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out['items']), 'items; missing:', [i for i in ITEMS if i not in out['items']])
for s, ts in out['topics'].items(): print(s, [(x['name'], {k: [i.split('-')[-1] for i in v] for k, v in x['cells'].items()}) for x in ts])
