const B = require('../engine.js');
const cases = require('./cases.js');
let ng = 0, n = 0;
for (const [dir, style, input, want] of cases) {
  n++;
  const r = dir === 'plain' ? B.toPlain(input, { style }) : B.toPolite(input);
  const got = B.render(r);
  if (got !== want) { ng++; console.log(`NG [${dir}${style?'/'+style:''}] ${input}\n   want: ${want}\n   got : ${got}`); }
}
console.log(`${n - ng}/${n} ok`);
process.exit(ng ? 1 : 0);
