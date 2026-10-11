# kana-practice.html を作る：template.html に かきじゅん・ことば・書体を うめこむ
import json, base64
def words(fn):
    out = []
    for l in open(fn, encoding='utf-8'):
        l = l.rstrip('\n')
        if not l.strip() or l.startswith('#'): continue
        w, e = (l.split('\t') + [''])[:2]
        out.append([w.strip(), e.strip()])
    return out
W = {'hira': words('words-hiragana.txt'), 'kata': words('words-katakana.txt')}
strokes = open('strokes.json', encoding='utf-8').read()
data = 'const STROKES = %s;\nconst WORDS = %s;' % (strokes, json.dumps(W, ensure_ascii=False, separators=(',', ':')))
font = base64.b64encode(open('klee-kana.woff2', 'rb').read()).decode()
t = open('template.html', encoding='utf-8').read()
assert '/*DATA*/' in t and '/*FONT*/' in t
t = t.replace('/*DATA*/', data, 1).replace('/*FONT*/', font, 1)
open('kana-practice.html', 'w', encoding='utf-8').write(t)
print('kana-practice.html', len(t.encode()), 'bytes', len(W['hira']), len(W['kata']), 'words')
