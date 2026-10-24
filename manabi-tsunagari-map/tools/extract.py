# 文部科学省「小学校学習指導要領（平成29年告示）」PDFから各教科の本文を取り出す
# 使い方: python3 tools/extract.py <PDFのパス>
# PDF: https://www.mext.go.jp/content/20230120-mxt_kyoiku02-100002604_01.pdf
import re, sys, pdfplumber
# 教科が始まるページ（PDFの0から数えたページ番号）
START = [('kokugo', 29), ('shakai', 47), ('sansu', 65), ('rika', 95), ('seikatsu', 113), ('ongaku', 117),
         ('zuko', 130), ('katei', 137), ('taiiku', 143), ('gaikokugo', 157), ('doutoku', 166),
         ('gaikokugokatsudo', 174), ('sougou', 180), ('tokkatsu', 184)]
LAST = 191
HEAD = {'国語', '社会', '算数', '理科', '生活', '音楽', '図画工作', '家庭', '体育', '外国語', '特別の', '教科', '道徳', '活動',
        '総合的な', '学習の', '時間', '特別活動', '外国語活動', '特別の教科道徳', '総合的な学習の時間'}
SIDE = '|'.join(['国 語', '社 会', '算 数', '理 科', '生 活', '音 楽', '図画工作', '家 庭', '体 育', '特別活動'])
KAKKO = '⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃'
MARK = re.compile(r'^([' + KAKKO + r']|[ア-ン] |（[ア-ン]）|〔|［|[１-９] |[ＡＢＣＤＥＦＧＨ] |第[１-３] |[①-⑳]|[a-z] |・|〈|［)')
JP = r'[^\x00-\x7f]'

pdf = pdfplumber.open(sys.argv[1])
def page_lines(i):
    p = pdf.pages[i]
    # ふりがな（小さい文字）は取りのぞく
    t = p.filter(lambda o: o.get('object_type') != 'char' or o['size'] >= 7).extract_text() or ''
    for l in t.split('\n'):
        s = l.strip()
        if not s or re.fullmatch(r'-?\s*Ⅲ-\d+\s*-?|\d+', s) or s.replace(' ', '') in HEAD:
            continue
        # ページの横に印刷された教科名が行の頭や終わりにくっついたものを外す
        s = re.sub(r'^(' + SIDE + r') (?=\S)', '', s)
        s = re.sub(r'(?<=\S) ?(' + SIDE + r')$', '', s)
        yield s

for k, (sub, a) in enumerate(START):
    b = START[k + 1][1] if k + 1 < len(START) else LAST
    raw = [l for i in range(a, b) for l in page_lines(i)]
    # 教科の最初のページの「第１ 目標」から始める（それより前は章・節の見出し）
    first = next(n for n, l in enumerate(raw) if re.search(r'第１ ?目 ?標', l))
    raw = ['第１ 目標'] + raw[first + 1:]
    out = []
    for l in raw:
        if out and not MARK.match(l):
            out[-1] += l
        else:
            out.append(l)
    res = []
    for l in out:
        m = MARK.match(l)
        head, body = (m.group(1).rstrip() + '　', l[len(m.group(1)):].lstrip()) if m and m.group(1)[0] not in '〔［・〈' else ('', l)
        body = re.sub(r'(?<=' + JP + r') +(?=' + JP + r')', '', body)
        res.append(head + body)
    open('src/%s.txt' % sub, 'w').write('\n'.join(res) + '\n')
    print(sub, len(res))
