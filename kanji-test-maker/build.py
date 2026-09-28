import json, os
g={}
for l in open('grades.txt'):
  k,v=l.strip().split(':'); g[int(k)]=v
units={}; sent={}; short={}
for gr in (1,2,3,4,5,6):
  units[gr]=[]
  for l in open('units%d.txt'%gr):
    n,rest=l.strip().split(' ',1); name,ks=rest.split('：')
    units[gr].append({'no':int(n),'name':name,'kanji':ks.split()})
  for l in open('sent%d.txt'%gr):
    l=l.rstrip('\n')
    if not l.strip(): continue
    p=l.split('\t'); sent[p[0]]=p[1:]
  if os.path.exists('short%d.txt'%gr):
    for l in open('short%d.txt'%gr):
      l=l.rstrip('\n')
      if not l.strip(): continue
      p=l.split('\t'); short[p[0]]=p[1:]
data='const GRADE_CHARS = %s;\nconst UNITS = %s;\nconst SENT = %s;\nconst SHORT = %s;'%(json.dumps(g,ensure_ascii=False),json.dumps(units,ensure_ascii=False),json.dumps(sent,ensure_ascii=False),json.dumps(short,ensure_ascii=False))
t=open('template.html').read().replace('/*DATA*/',data)
# 公開中のページで先生が反映した例文の変更を引きつぐ
import os
if os.path.exists('live_edits.json') and open('live_edits.json').read().strip():
    live=open('live_edits.json').read().strip()
    json.loads(live)
    t=t.replace('<script id="ktm-edits" type="application/json">{"rev":0,"custom":[],"hidden":{}}</script>','<script id="ktm-edits" type="application/json">'+live.replace('<','\\u003c')+'</script>',1)
open('kanji-test.html','w').write(t)
print(len(t.encode()))

# 校内LAN用：インターネットに一切つながない版（Google Fontsを読まず、外への通信をブラウザで禁止する）
GF='''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap">'''
CSP='''<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">
<script>window.KTM_LOCAL = true;</script>'''
assert t.count(GF)==1
loc=t.replace(GF,CSP,1)
# 書体はパソコンに入っているものを使う（Windowsは UD デジタル 教科書体・BIZ UDゴシック）
loc=loc.replace('"Zen Kaku Gothic New",','"BIZ UDPGothic","BIZ UDPゴシック","Meiryo","メイリオ",')
loc=loc.replace('"Klee One",','"UD Digi Kyokasho N-B","UD デジタル 教科書体 N-B","Klee One",')
loc=loc.replace('<title>漢字小テストメーカー</title>','<title>漢字小テストメーカー（校内LAN用）</title>',1)
assert 'googleapis' not in loc and 'gstatic' not in loc
open('kanji-test-local.html','w').write(loc)
print(len(loc.encode()))
