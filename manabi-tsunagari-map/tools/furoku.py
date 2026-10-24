# 解説 総則編 付録6「現代的な諸課題に関する教科等横断的な教育内容」（小学校）を読み取る
# 使い方: python3 tools/furoku.py <総則編解説PDF>  → data/furoku_raw.json
# PDF: https://www.mext.go.jp/content/20230308-mxt_kyoiku02-100002607_001.pdf
import json, os, re, sys, pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOPICS = ['伝統や文化', '主権者', '消費者', '法', '知的財産', '郷土や地域', '海洋', '環境', '放射線',
          '生命の尊重', '心身の健康の保持増進', '食', '防災を含む安全']
HEADS = {'総則': 'sosoku', '国語科': 'kokugo', '社会科': 'shakai', '算数科': 'sansu', '理科': 'rika', '生活科': 'seikatsu',
         '音楽科': 'ongaku', '図画工作科': 'zuko', '家庭科': 'katei', '体育科': 'taiiku', '外国語科': 'gaikokugo',
         '特別の教科道徳': 'doutoku', '外国語活動': 'gaikokugokatsudo', '外国語活動，外国語科': 'gaikoku', '総合的な学習の時間': 'sougou', '特別活動': 'tokkatsu'}

pdf = None

def lines_of(p, off=0):
    V = [(l['x0'] + off, l['top'], l['bottom']) for l in p.lines if abs(l['x0'] - l['x1']) < 1 and l['bottom'] - l['top'] > 5]
    H = [(l['top'], l['x0'] + off, l['x1'] + off) for l in p.lines if abs(l['top'] - l['bottom']) < 1]
    return V, H

def spread(i):
    """見開きの左ページ i と右ページ i+1 の線を合わせる（文字は左ページに全部入っている）"""
    L, R = pdf.pages[i], pdf.pages[i + 1]
    wl, wr = L.extract_words(), R.extract_words()
    off = wl[0]['x0'] - wr[0]['x0']
    V1, H1 = lines_of(L); V2, H2 = lines_of(R, off)
    return L, V1 + V2, H1 + H2

def cells(i):
    L, V, H = spread(i)
    groups = {}
    for c in L.chars:
        if c['size'] < 5 or c['text'].isspace():   # ふりがなを除く
            continue
        cx, cy = (c['x0'] + c['x1']) / 2, (c['top'] + c['bottom']) / 2
        span = [x for x, t, b in V if t - 1 <= cy <= b + 1]
        left = max([x for x in span if x < cx], default=-1); right = min([x for x in span if x > cx], default=9999)
        # そのセルの上の線（見出しの下の線）
        tops = [y for y, a, b in H if y < cy and a - 2 <= cx <= b + 2]
        top = max(tops, default=0)
        groups.setdefault((round(left), round(right), round(top)), []).append(c)
    out = []
    for (l, r, t), cs in groups.items():
        rows = {}
        for c in cs:
            rows.setdefault(round(c['top'] / 2), []).append(c)
        text = []
        for k in sorted(rows):
            rcs = sorted(rows[k], key=lambda c: c['x0'])
            s = ''
            for a, b in zip([None] + rcs[:-1], rcs):
                if a is not None and b['x0'] - a['x1'] > b['size'] * 0.6:
                    s += ' '
                s += b['text']
            text.append(s)
        out.append({'left': l, 'right': r, 'top': t, 'lines': text})
    out.sort(key=lambda c: (c['left'], c['top']))
    return out

def find_pages():
    res = {}
    for i in range(200, len(pdf.pages) - 1):
        t = (pdf.pages[i].extract_text() or '')[:300]
        m = re.match(r'\s*(\S+?)に関する教育（現代的な諸課題', t)
        if not m or m.group(1) not in TOPICS or m.group(1) in res:
            continue
        ws = pdf.pages[i].extract_words()
        if min(w['x0'] for w in ws) >= 0:
            res[m.group(1)] = [i]
            # 見出しのない続きの見開き（伝統や文化など）
            j = i + 2
            while j < len(pdf.pages) - 1:
                tj = (pdf.pages[j].extract_text() or '')[:300]
                wj = pdf.pages[j].extract_words()
                if re.match(r'\s*\S+?に関する教育（', tj) or not wj or min(w['x0'] for w in wj) < 0:
                    break
                res[m.group(1)].append(j); j += 2
    return res

if __name__ == '__main__':
    pdf = pdfplumber.open(sys.argv[1])
    pages = find_pages()
    print(pages)
    out = {}
    for tp in TOPICS:
        out[tp] = {'page': pages[tp][0], 'cells': [c for p in pages[tp] for c in cells(p)]}
    json.dump(out, open(os.path.join(ROOT, 'data', 'furoku_raw.json'), 'w'), ensure_ascii=False, indent=1)
