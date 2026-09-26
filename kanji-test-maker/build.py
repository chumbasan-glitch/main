import json
g={}
for l in open('grades.txt'):
  k,v=l.strip().split(':'); g[int(k)]=v
units={}; sent={}
for gr in (2,3,4,5,6):
  units[gr]=[]
  for l in open('units%d.txt'%gr):
    n,rest=l.strip().split(' ',1); name,ks=rest.split('：')
    units[gr].append({'no':int(n),'name':name,'kanji':ks.split()})
  for l in open('sent%d.txt'%gr):
    l=l.rstrip('\n')
    if not l.strip(): continue
    p=l.split('\t'); sent[p[0]]=p[1:]
data='const GRADE_CHARS = %s;\nconst UNITS = %s;\nconst SENT = %s;'%(json.dumps(g,ensure_ascii=False),json.dumps(units,ensure_ascii=False),json.dumps(sent,ensure_ascii=False))
t=open('template.html').read().replace('/*DATA*/',data)
# 公開中のページで先生が反映した例文の変更を引きつぐ
import os
if os.path.exists('live_edits.json') and open('live_edits.json').read().strip():
    live=open('live_edits.json').read().strip()
    json.loads(live)
    t=t.replace('<script id="ktm-edits" type="application/json">{"rev":0,"custom":[],"hidden":{}}</script>','<script id="ktm-edits" type="application/json">'+live.replace('<','\\u003c')+'</script>',1)
open('kanji-test.html','w').write(t)
print(len(t.encode()))
