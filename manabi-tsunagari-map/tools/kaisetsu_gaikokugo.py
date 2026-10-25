# 学習指導要領ナビ：『小学校学習指導要領（平成29年告示）解説 外国語活動・外国語編』から，内容ごとの説明を取り出す
# 使い方: python3 tools/kaisetsu_gaikokugo.py <解説 外国語活動・外国語編のPDF>  → data/kaisetsu/gaikokugokatsudo.json, gaikokugo.json
# PDF: https://www.mext.go.jp/content/20220614-mxt_kyoiku02-100002607_11.pdf
# 「２ 内容」の（1）英語の特徴等（知識及び技能），（2）情報を整理しながら考えなどを形成し…（思考力，判断力，表現力等），
# （3）①言語活動（ア 聞くこと など），②言語の働き の見出しごとに説明を取り出す。外国語の（1）は ア 音声〜エ 文及び文構造 に分かれる
import json, os, re, sys
import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OFFSET = 3            # PDFの4枚目が本のp.1
pdf = pdfplumber.open(sys.argv[1])
norm = lambda x: re.sub(r'[\s　]', '', x)
ALL = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'data', 'items.json')))['items'] if i['subject'] in ('gaikokugokatsudo', 'gaikokugo')}

HW = str.maketrans({'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ', 'ｶ': 'カ', '(': '（', ')': '）'})
OFFICIAL = norm(''.join(l for it in ALL.values() for l in [it['title']] + it['lines'])).translate(HW)
_n = norm
norm = lambda x: _n(x).translate(HW)

def read(b0, b1):
    out = []
    for book in range(b0, b1 + 1):
        pg = pdf.pages[book + OFFSET]
        m = 130 if book % 2 == 0 else 91                 # 本文の左端（右端は m+385）
        f = pg.filter(lambda o: o.get('object_type') != 'char' or (o.get('size', 10) >= 10.5 and m - 25 <= o['x0'] <= m + 400 and 22 < o['top'] < pg.height - 45))
        for l in f.extract_text_lines(y_tolerance=6):
            t = re.sub(r'[\x00-\x1f]+', ' ', l['text']).strip()
            if not t or re.fullmatch(r'\d{1,3}', t): continue
            c = l['chars'][0]; fn = c.get('fontname', '')
            out.append((book, t, round(l['x0']) - m, round(l['x1']) - m, round(c['size']) if c['size'] > 11.5 else 0, 'Kaku' in fn or 'Bold' in fn, l['text'].startswith('\x07')))
    return out

def paras(seg):
    out, cur, q, pr = [], '', False, 0
    for L in seg:
        b, t, off, right, head, bold, start = L
        if head: q = True; continue
        if bold and off <= 2 and re.match(r'^[アイウエオ]\s', t): q = True; continue    # 項目の小見出し
        q = off >= 20 and right <= 377 and (q or pr < 380)   # 引用の枠：字下げ22・33で右端が m+374
        pr = right
        if q: continue
        if (start or 9 <= off <= 13) and cur: out.append(cur); cur = ''
        cur += t
        if right < 380: out.append(cur); cur = ''
    if cur: out.append(cur)
    res = []
    for p in (p.replace('　', ' ').strip() for p in out if p.strip()):
        if res and len(res[-1]) >= 34 and not res[-1].endswith(('。', '」', '）', '.', '?', '!')): res[-1] += p   # 行の途中で切れた段落
        else: res.append(p)
    keep = []
    for p in res:
        if re.fullmatch(r'(２\s*内\s*容)?(〔[^〕]+〕)*(（\d）\S+に関する事項)?', p): continue      # 見出しの写し
        if norm(p) in OFFICIAL and len(norm(p)) >= 8 and not re.match(r'^[（(][ｱ-ｵア-オ][）)]', p): continue   # 引用（（ｱ）などの事項は小見出しとして残す）
        keep.append(p)
    return keep

def extract(subj, band, b0, b1):
    L = read(b0, b1)
    heads, ctx = [], None
    for k, x in enumerate(L):
        t = x[1]
        if x[4] == 14 and re.match(r'^３\s*指導計画', t): heads.append((k, None)); break
        if x[4] == 12 and re.match(r'^（1）英語の特徴', t): ctx = 'K'; heads.append((k, f'{subj}-{band}-K-1' if subj == 'gaikokugokatsudo' else None)); continue
        if x[4] == 12 and re.match(r'^（2）情報を整理', t): ctx = 'S'; heads.append((k, f'{subj}-{band}-S-2')); continue
        if x[4] == 12 and re.match(r'^（3）言語活動', t): ctx = 'L0'; heads.append((k, None)); continue
        if re.match(r'^①\s*言語活動に関する事項', t): ctx = 'L'; continue
        if re.match(r'^②\s*言語の働きに関する事項', t): ctx = 'H'; heads.append((k, f'{subj}-{band}-H-1')); continue
        mm = re.match(r'^([アイウエオ])\s+(\S.*)', t)
        if mm and x[5] and x[2] <= 2 and ctx in ('K', 'L'):
            iid = f'{subj}-{band}-{ctx}-{mm.group(1)}'
            if iid in ALL and subj == 'gaikokugo' or ctx == 'L': heads.append((k, iid if iid in ALL else None))
    heads.append((len(L), None))
    res = {}
    for (k, iid), (k2, _) in zip(heads, heads[1:]):
        if not iid: continue
        res[iid] = {'page': L[k][0], 'name': ALL[iid]['head'], 'expl': {'intro': paras(L[k + 1:k2]), 'k': [], 's': []}}
    return res

for subj, band, b0, b1, name in (('gaikokugokatsudo', '34', 24, 41, '外国語活動'), ('gaikokugo', '56', 83, 121, '外国語')):
    items = extract(subj, band, b0, b1)
    out = {'source': '小学校学習指導要領（平成29年告示）解説 外国語活動・外国語編（文部科学省，平成29年7月）', 'grades': {}, 'items': items}
    json.dump(out, open(os.path.join(ROOT, 'data', 'kaisetsu', subj + '.json'), 'w'), ensure_ascii=False, indent=1)
    print(name, len(items), 'items; missing:', [i for i in ALL if i.startswith(subj + '-') and i not in items])
    for iid, x in items.items():
        e = x['expl']['intro']; print('  ', iid, x['page'], len(e), (e or ['?'])[0][:36], '…', (e or ['?'])[-1][-20:])
