import re,sys
def iskanji(c): return '一'<=c<='鿿' or c=='々'
grade={}
for l in open('grades.txt'):
  g,v=l.strip().split(':')
  for c in v: grade[c]=int(g)
unit={}
for l in open('units6.txt'):
  n,rest=l.strip().split(' ',1); name,ks=rest.split('：')
  for c in ks.split(): unit[c]=int(n); grade[c]=6
def learned(c,u): return c in grade and (grade[c]<6 or (grade[c]==6 and unit[c]<=u))
tok=re.compile(r'\{([^{}|]+)\|([^{}|]+)\}|\[|\]|([^{}\[\]])')
errs=0; seen=set(); maxlen=0
for ln,l in enumerate(open('sent6.txt'),1):
  l=l.rstrip('\n')
  if not l.strip(): continue
  parts=l.split('\t'); k=parts[0]; seen.add(k)
  if len(parts)!=4: print(ln,k,'need 3 sentences',len(parts)-1); errs+=1
  u=unit[k]
  for s in parts[1:]:
    intgt=False; tgt=[]; vis=''; ntgt=0; pos=0
    for m in tok.finditer(s):
      if m.start()!=pos: print(ln,'BAD',s); errs+=1
      pos=m.end()
      t=m.group(0)
      if t=='[': intgt=True; ntgt+=1; continue
      if t==']': intgt=False; continue
      if m.group(1):
        base,rd=m.group(1),m.group(2)
        if not all(iskanji(c) for c in base): print(ln,'base non-kanji',base,s); errs+=1
        if intgt:
          tgt.append(base)
          for c in base:
            if not learned(c,u): print(ln,k,'target has unlearned',c,s); errs+=1
        else:
          if k in base: print(ln,k,'target kanji outside target',s); errs+=1
          vis+= base if all(learned(c,u) for c in base) else rd
        if intgt: vis+=base
      else:
        c=m.group(3)
        if iskanji(c): print(ln,'bare kanji',c,s); errs+=1
        if intgt: tgt.append(c)
        vis+=c
    if pos!=len(s): print(ln,'BAD tail',s); errs+=1
    if ntgt!=1: print(ln,k,'targets',ntgt,s); errs+=1
    if k not in ''.join(tgt): print(ln,k,'target missing kanji',s); errs+=1
    maxlen=max(maxlen,len(vis))
    if len(vis)>20: print(ln,'long',len(vis),vis)
missing=set(unit)-seen
print('missing',missing,'errors',errs,'maxlen',maxlen)
