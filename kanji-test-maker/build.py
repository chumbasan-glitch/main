import json
g={}
for l in open('grades.txt'):
  k,v=l.strip().split(':'); g[int(k)]=v
units={6:[]}
for l in open('units6.txt'):
  n,rest=l.strip().split(' ',1); name,ks=rest.split('：')
  units[6].append({'no':int(n),'name':name,'kanji':ks.split()})
sent={}
for l in open('sent6.txt'):
  l=l.rstrip('\n')
  if not l.strip(): continue
  p=l.split('\t'); sent[p[0]]=p[1:]
data='const GRADE_CHARS = %s;\nconst UNITS = %s;\nconst SENT = %s;'%(json.dumps(g,ensure_ascii=False),json.dumps(units,ensure_ascii=False),json.dumps(sent,ensure_ascii=False))
t=open('template.html').read().replace('/*DATA*/',data)
open('kanji-test.html','w').write(t)
print(len(t.encode()))
