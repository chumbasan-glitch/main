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
# PC版（ネットなし）：Googleの書体を読みこまず、Windowsの「UD デジタル 教科書体」で表示・印刷する
import re
pc=re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts\.g[^"]*"( crossorigin)?>\n','',t)
UD='"UD デジタル 教科書体 N-B","UD Digi Kyokasho N-B","UD デジタル 教科書体 NP-B","UD Digi Kyokasho NP-B",'
pc=pc.replace('font-family:"Klee One"','font-family:'+UD+'"Klee One"')
pc=pc.replace('（2026.10.4）</span>','（2026.10.4）PC版</span>') if False else re.sub(r'(ver [0-9.]+（[^）]*）)</span>',r'\1 PC版</span>',pc)
pc=pc.replace('書体：Windowsでは「UD デジタル 教科書体」、iPadでは「Klee One」で印刷されます。','書体：Windowsの「UD デジタル 教科書体」で印刷されます（PC版・ネットなしで使えます）。')
pc='<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+pc+'</body></html>'
assert 'fonts.googleapis' not in pc
open('kanji-test-pc.html','w').write(pc)
print('pc', len(pc.encode()))
