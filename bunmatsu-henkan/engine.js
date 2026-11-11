/* 文末へんかん：です・ます ⇄ だ・である の変換エンジン
   ・「」『』の中は変換しない
   ・変換したところは changes に記録する（start/end は元の文章の位置）
   ・自信がないところは sure:false にして、ほかの候補を options に入れる */
(function (root) {
  'use strict';

  const HIRA = /[ぁ-ゖ]/;
  const KANJI = /[㐀-䶿一-鿿々〆]/;
  const KATA = /[ァ-ヺー]/;
  const E_ROW = 'えけげせぜてでねへべぺめれ';
  const I_ROW = 'いきぎしじちぢにひびぴみり';
  const A_ROW = 'あかがさざただなはばぱまやらわ';
  const U_ROW = 'うくぐすずつづぬふぶぷむゆる';
  const PARTICLE = 'をにがはもへとでてや';

  const isWordChar = (c) => !!c && (HIRA.test(c) || KANJI.test(c) || KATA.test(c));
  const isBoundary = (c) => !c || !isWordChar(c) || PARTICLE.includes(c);

  // stem の文字列で終わっているか。ひらがなで始まる語は、前が区切り（文頭・記号・助詞）のときだけ
  function endsStem(text, stem, noBoundary) {
    if (!text.endsWith(stem)) return false;
    if (noBoundary || !HIRA.test(stem[0])) return true;
    return isBoundary(text[text.length - stem.length - 1]);
  }
  function matchList(text, list) {
    let best = null;
    for (const e of list) {
      const s = typeof e === 'string' ? e : e.s;
      const nb = typeof e === 'string' ? false : !!e.nb;
      if (endsStem(text, s, nb) && (!best || s.length > best.s.length)) {
        best = typeof e === 'string' ? { s } : e;
      }
    }
    return best;
  }

  /* ---------- 言葉のリスト ---------- */
  // 「い段＋ます」でも一段の動詞（起きる・落ちる など）
  const ICHI_I = [
    '起き', '生き', '飽き', '尽き', { s: 'でき', nb: true }, '落ち', '満ち', '朽ち', 'おち',
    '借り', '足り', '懲り', 'かり', 'たり', '浴び', '伸び', '延び', '滅び', '帯び', '詫び',
    'あび', 'のび', '過ぎ', { s: 'すぎ', nb: true }, '試み', '顧み', '省み', '用い', '老い',
    '報い', '悔い', 'おり'
  ];
  // 一つの漢字＋「する」になる言葉（愛する・得する など）
  const SURU_ONE = '愛察要関対略訳課化損得楽恋発接属適反達脱決失欲害罰熱'.split('');
  // 「〜った」で終わる「う」の動詞
  const U_STEMS = [
    '言', '思', '会', '合', '買', '使', '笑', '歌', '習', '洗', '払', '拾', '吸', '手伝', '戦',
    '違', '誘', '追', '失', '迷', '願', '祝', '従', '争', '扱', '救', '揃', '伴', '補', '養',
    '奪', '狙', '酔', '縫', '雇', '敬', '舞', '漂', '戸惑', '誓', '伺', '貰', '味わ', '賄',
    '慕', '構', '担', '疑', '襲', '占', '競', '繕', '整', '向か', '間違', '似合', '話し合',
    'つか', 'もら', 'てつだ', 'わら', 'うた', 'なら', 'あら', 'はら', 'ひろ', 'たたか',
    'ちが', 'さそ', 'まよ', 'ねが', 'そろ', 'まにあ', 'にあ', 'しま', { s: 'ちゃ', nb: true },
    { s: 'じゃ', nb: true }, 'まちが', 'うたが', 'かま', 'あつか', 'おそ', 'すく', 'おも',
    'いわ', 'うしな', 'したが', 'かよ', 'ととの', 'きそ', 'むか', 'うば'
  ];
  // 「〜った」で終わる「つ」の動詞
  const T_STEMS = ['待', '持', '立', '勝', '打', '育', '経', '保', '放', '撃', '建', '絶',
    'ま', 'も', 'た', 'そだ', 'たも'];
  // 「〜かった」でも動詞のもの（分かった・向かった など）。値は辞書形の最後の字
  const KA_VERBS = [
    { s: '分か', d: 'る' }, { s: 'わか', d: 'る', nb: true, notAfter: 'こよ' }, { s: '向か', d: 'う' },
    { s: 'むか', d: 'う' }, { s: '助か', d: 'る' }, { s: 'たすか', d: 'る', nb: true },
    { s: '見つか', d: 'る' }, { s: 'みつか', d: 'る', nb: true }, { s: 'かか', d: 'る' },
    { s: '掛か', d: 'る' }, { s: '引っかか', d: 'る' }, { s: 'ひっかか', d: 'る', nb: true },
    { s: '預か', d: 'る' }, { s: 'あずか', d: 'る', nb: true }, { s: '受か', d: 'る' },
    { s: '授か', d: 'る' }, { s: '儲か', d: 'る' }, { s: 'もうか', d: 'る', nb: true },
    { s: 'つか', d: 'う' }, { s: 'ぶつか', d: 'る', nb: true }, { s: '取りかか', d: 'る' },
    { s: 'とりかか', d: 'る', nb: true }, { s: '通りかか', d: 'る' }, { s: 'とおりかか', d: 'る', nb: true },
    { s: '寄りかか', d: 'る' }, { s: 'よりかか', d: 'る', nb: true }, { s: 'さしかか', d: 'る', nb: true },
    { s: '差しかか', d: 'る' }, { s: '遠ざか', d: 'る' }, { s: '乗っか', d: 'る' }, { s: '浸か', d: 'る' }
  ];
  const B_STEMS = ['遊', '飛', '呼', '選', '運', '学', '並', '喜', '結', '叫', '転', '跳', '浮か',
    '及', '滅', '尊', 'あそ', 'よろこ', 'えら', 'はこ', 'まな', 'むす', 'さけ', 'ころ', 'うか',
    'と', { s: 'なら', nb: true }];
  const N_STEMS = ['死', 'し'];
  const G_STEMS = ['泳', '急', '脱', '騒', '防', '稼', '注', '嗅', '仰', '繋', '剥', '研', '漕',
    '継', '担', '塞', '揺ら', '和ら', '安ら', 'およ', 'いそ', 'ぬ', 'さわ', 'ふせ', 'かせ',
    'そそ', 'つな', 'はしゃ', 'かつ'];
  // 「ない」の前がこれなら形容詞（少ない・つまらない など）
  const ADJ_NAI = ['少', 'すく', '危', 'あぶ', '切', 'せつ', '幼', 'おさ', { s: 'つまら', nb: true },
    { s: 'くだら', nb: true }, '仕方', 'しかた', 'しょうが', { s: 'もったい', nb: true },
    { s: 'だらし', nb: true }, '情け', 'なさけ', '申し訳', '申しわけ', 'もうしわけ', '頼り',
    'たより', 'あっけ', '味気', 'そっけ', { s: 'ぎこち', nb: true }, 'さりげ', '何気', 'なにげ',
    'はか', '儚', 'せわし', 'おぼつか', '心もと', 'こころもと'];
  // 「〜いです」でも形容詞ではない言葉（きれいです→きれいだ）
  const NA_I = ['きれい', '綺麗', 'きらい', '嫌い', 'ていねい', '丁寧', 'とくい', 'みたい', 'ぐらい',
    'くらい', 'せい', 'ばあい', 'あいまい', 'おねがい', '願い', '思い', '違い', 'ちがい', '戦い',
    '手伝い', '祝い', '笑い', '争い', '迷い', '救い', '誘い', '匂い', 'におい', 'ゆうめい',
    'しつれい', 'しんぱい', 'あい', '間違い', 'まちがい', 'お手伝い', '使い', 'つかい', '習い',
    'ならい', 'はい', 'いっぱい', 'しっぱい', 'せんぱい', 'こうはい', 'ぜったい', 'だいたい',
    'たいてい', 'ふつう', 'いい加減'];
  // 「〜そう」が「楽しそう」のような様子を表す漢字
  const ADJ_SOU = '高強弱安重軽寒暑熱痛怖甘辛早速遅長短広狭太細古若良悪難赤青白黒暗明眠固硬柔濃薄深浅偉鋭丸優危冷暖温楽美悲寂嬉忙偉'.split('');
  const ICHI_KANJI = '見寝出着似居得経煮干射'.split('');
  const GODAN_ERU_KANA = ['はい', 'はし', 'しゃべ', 'すべ', 'あせ', 'にぎ', 'かぎ', 'へ', 'しげ', 'け', 'ち'];

  const I2U = { い: 'う', き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', び: 'ぶ', み: 'む', り: 'る' };
  const I2A = { い: 'わ', き: 'か', ぎ: 'が', し: 'さ', ち: 'た', に: 'な', び: 'ば', み: 'ま', り: 'ら' };
  const I2O = { い: 'お', き: 'こ', ぎ: 'ご', し: 'そ', ち: 'と', に: 'の', び: 'ぼ', み: 'も', り: 'ろ' };
  const I2TA = { い: 'った', き: 'いた', ぎ: 'いだ', し: 'した', ち: 'った', に: 'んだ', び: 'んだ', み: 'んだ', り: 'った' };
  const A2I = { か: 'き', が: 'ぎ', さ: 'し', た: 'ち', な: 'に', ば: 'び', ま: 'み', ら: 'り', わ: 'い' };
  const U2I = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み' };
  const O2I = { お: 'い', こ: 'き', ご: 'ぎ', そ: 'し', と: 'ち', の: 'に', ぼ: 'び', も: 'み', ろ: 'り' };

  /* ---------- 「」の中かどうか ---------- */
  function quoteMask(text) {
    const mask = new Array(text.length).fill(false);
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '「' || c === '『') { depth++; mask[i] = true; continue; }
      if (c === '」' || c === '』') { mask[i] = true; if (depth > 0) depth--; continue; }
      if (c === '\n' && depth > 0 && text[i + 1] === '\n') depth = 0; // 閉じ忘れの安全策
      mask[i] = depth > 0;
    }
    return mask;
  }

  /* ======================================================
     です・ます → だ・である
     ====================================================== */

  // ます の前の形から、動詞の種類を調べる
  function classifyMasu(pre) {
    const c = pre.slice(-1);
    const R = (cls, o) => Object.assign({ cls, sure: true }, o || {});
    if (!c) return R('unknown');
    if (c === '来') return R('kuru');
    if (KANJI.test(c)) return R('ichidan');
    if (E_ROW.includes(c)) return R('ichidan');
    if ('じぢひ'.includes(c)) return R('ichidan');
    if (c === 'し') return classifyShi(pre);
    if (c === 'き') {
      if (pre.endsWith('行き') || endsStem(pre, 'いき')) return R('godan', { iku: true });
      if (pre.endsWith('てき') || pre.endsWith('んでき')) return R('kuruKana');
      if (matchList(pre, ICHI_I)) return R('ichidan');
      if (pre.endsWith('おき') && !KANJI.test(pre[pre.length - 3] || '')) {
        const p = pre[pre.length - 3];
        if (p === 'て' || p === 'で') return R('godan');
        return R('ichidan', { sure: false, alt: 'godan', note: '「起きる」なのか「置く」なのか、確かめてください。' });
      }
      if (endsStem(pre, 'き')) {
        const p = pre[pre.length - 2];
        if (p === 'て' || p === 'で') return R('kuruKana');
        if (p === 'を') return R('ichidan', { sure: false, alt: 'kuruKana', note: '「着る」なのか「来る」なのか、確かめてください。' });
        return R('kuruKana', { sure: false, alt: 'ichidan', note: '「来る」なのか「着る」なのか、確かめてください。' });
      }
      return R('godan');
    }
    if (c === 'み') {
      if (endsStem(pre, 'み') || matchList(pre, ICHI_I)) return R('ichidan');
      return R('godan');
    }
    if (c === 'い') {
      if (endsStem(pre, 'い') || matchList(pre, ICHI_I)) return R('ichidan');
      return R('godan');
    }
    if (c === 'り') {
      if (pre.endsWith('降り')) {
        const near = pre.slice(-6);
        if (/[雨雪]/.test(near)) return R('godan', { sure: false, alt: 'ichidan', note: '「雨が降る」なのか「電車を降りる」なのか、確かめてください。' });
        return R('ichidan', { sure: false, alt: 'godan', note: '「電車を降りる」なのか「雨が降る」なのか、確かめてください。' });
      }
      if (pre.endsWith('下り')) return R('ichidan', { sure: false, alt: 'godan', note: '「下りる（おりる）」なのか「下る（くだる）」なのか、確かめてください。' });
      if (matchList(pre, ICHI_I)) return R('ichidan');
      return R('godan');
    }
    if ('ちびぎ'.includes(c)) {
      if (matchList(pre, ICHI_I)) return R('ichidan');
      return R('godan');
    }
    if (c === 'に') return R('godan');
    return R('unknown');
  }

  // 「〜し」が「する」なのか「話す」のような動詞なのか
  function classifyShi(pre) {
    const b = pre.slice(0, -1);
    const last = b.slice(-1);
    const R = (cls, o) => Object.assign({ cls, sure: true }, o || {});
    if (!last || !isWordChar(last) || KATA.test(last)) return R('suru');
    if (KANJI.test(last)) {
      let n = 0;
      for (let i = b.length - 1; i >= 0 && KANJI.test(b[i]); i--) n++;
      if (n >= 2) return R('suru');
      if (SURU_ONE.includes(last)) return R('suru');
      return R('godan');
    }
    if ('にをがはもでくへやうっ'.includes(last)) return R('suru');
    if (KANJI.test(b[b.length - 2] || '')) return R('godan');
    return R('suru');
  }

  // 動詞を、指定した形にする。k=前の何文字を置きかえるか
  function conjugate(pre, info, form) {
    const c = pre.slice(-1);
    switch (info.cls) {
      case 'godan': {
        if (form === 'dict') return { k: 1, rep: I2U[c] };
        if (form === 'past') return { k: 1, rep: info.iku ? 'った' : I2TA[c] };
        if (form === 'neg') return { k: 1, rep: I2A[c] + 'ない' };
        if (form === 'negpast') return { k: 1, rep: I2A[c] + 'なかった' };
        if (form === 'vol') return { k: 1, rep: I2O[c] + 'う' };
        break;
      }
      case 'ichidan': {
        const t = { dict: 'る', past: 'た', neg: 'ない', negpast: 'なかった', vol: 'よう' }[form];
        return { k: 0, rep: t };
      }
      case 'suru': {
        const t = { dict: 'する', past: 'した', neg: 'しない', negpast: 'しなかった', vol: 'しよう' }[form];
        return { k: 1, rep: t };
      }
      case 'kuru': {
        const t = { dict: 'る', past: 'た', neg: 'ない', negpast: 'なかった', vol: 'よう' }[form];
        return { k: 0, rep: t };
      }
      case 'kuruKana': {
        const t = { dict: 'くる', past: 'きた', neg: 'こない', negpast: 'こなかった', vol: 'こよう' }[form];
        return { k: 1, rep: t };
      }
    }
    return null;
  }

  function isIAdj(pre) {
    if (!pre.endsWith('い')) return false;
    for (const w of NA_I) {
      if (pre.endsWith(w)) {
        if (!HIRA.test(w[0])) return false;
        if (isBoundary(pre[pre.length - w.length - 1]) || w.length >= 3) return false;
      }
    }
    return true;
  }

  const POLITE_RE = /ではありませんでした|じゃありませんでした|ありませんでした|ではありません|じゃありません|ありません|ませんでした|ません|ましょう|ました|ます|でしょう|でした|です/g;
  const FORM_OF = { ます: 'dict', ました: 'past', ません: 'neg', ませんでした: 'negpast', ましょう: 'vol' };

  function toPlain(text, opts) {
    const dearu = opts && opts.style === 'dearu';
    const mask = quoteMask(text);
    const changes = [];
    let m;
    POLITE_RE.lastIndex = 0;
    while ((m = POLITE_RE.exec(text))) {
      const idx = m.index;
      const word = m[0];
      if (mask[idx]) continue;
      if (word === 'ます' && (text.substr(idx, 4) === 'ますます' || text.substr(idx - 2, 4) === 'ますます')) {
        if (text.substr(idx, 4) === 'ますます') POLITE_RE.lastIndex = idx + 4;
        continue;
      }
      // 文の始まりまでを pre とする
      let s = idx;
      while (s > 0 && !mask[s - 1] && !'。．！？!?\n、，'.includes(text[s - 1])) s--;
      const pre = text.slice(s, idx);
      const post = text.substr(idx + word.length, 3);
      const ch = convertPolite(pre, word, post, dearu);
      if (!ch) continue;
      const start = idx - ch.k;
      const end = idx + word.length;
      changes.push(mkChange(text, start, end, ch));
    }
    // 「ください」「ございます」は形を変えずに知らせる
    noteOnly(text, mask, changes, /ください/g, '「ください」はお願いの言い方なので、そのままにしました。「〜てほしい」などに直すこともできます。', ['ほしい']);
    return finish(text, changes);
  }

  function convertPolite(pre, word, post, dearu) {
    const R = (k, rep, o) => Object.assign({ k, rep, sure: true, alts: [], note: '' }, o || {});
    const DA = dearu ? 'である' : 'だ';
    const tailNe = post !== '' && 'ねよ'.includes(post[0]);
    switch (word) {
      case 'ではありませんでした': return R(0, 'ではなかった');
      case 'じゃありませんでした': return R(0, 'じゃなかった');
      case 'ありませんでした': return R(0, 'なかった');
      case 'ではありません': return R(0, 'ではない');
      case 'じゃありません': return R(0, 'じゃない');
      case 'ありません': return R(0, 'ない');
    }
    if (FORM_OF[word]) {
      if (pre.endsWith('ござい')) {
        return R(0, word, { sure: false, note: '「ございます」はていねいなあいさつの言葉なので、そのままにしました。', same: true });
      }
      const info = classifyMasu(pre);
      if (info.cls === 'unknown') return R(0, word, { sure: false, note: 'この言葉の直し方がわかりませんでした。手で直してください。', same: true });
      const form = FORM_OF[word];
      const r = conjugate(pre, info, form);
      if (!r) return null;
      const out = R(r.k, r.rep, { sure: info.sure, note: info.note || '' });
      if (info.alt) {
        const r2 = conjugate(pre, { cls: info.alt }, form);
        if (r2) {
          // 置きかえる範囲をそろえる
          const k = Math.max(r.k, r2.k);
          const head = (n) => pre.slice(pre.length - k, pre.length - n);
          out.k = k;
          out.rep = head(r.k) + r.rep;
          out.alts = [head(r2.k) + r2.rep];
        }
      }
      return out;
    }
    // です・でした・でしょう
    const iadj = isIAdj(pre) || pre.endsWith('かった');
    const noKu = pre.endsWith('の') || pre.endsWith('ん');
    if (word === 'です') {
      if (iadj) return R(0, '', { note: '' });
      if (pre.endsWith('ん')) {
        if (dearu && !tailNe) return R(1, 'のである');
        return R(0, 'だ', dearu ? { sure: false, note: '後ろに「ね」「よ」があるので「だ」にしました。' } : {});
      }
      if (dearu && tailNe) return R(0, 'だ', { sure: false, alts: ['である'], note: '後ろに「ね」「よ」があるので「だ」にしました。' });
      if (post.startsWith('ので')) return R(0, dearu ? 'である' : 'な');
      if (post[0] === 'か' && !dearu) return R(0, '');
      return R(0, DA);
    }
    if (word === 'でした') {
      if (isIAdj(pre)) return R(1, 'かった', { note: '「〜いでした」は「〜かった」に直しました。' });
      if (pre.endsWith('かった')) return R(0, '');
      if (dearu && tailNe) return R(0, 'だった', { sure: false, alts: ['であった'], note: '後ろに「ね」「よ」があるので「だった」にしました。' });
      if (dearu && pre.endsWith('ん')) return R(1, 'のであった');
      return R(0, dearu ? 'であった' : 'だった');
    }
    if (word === 'でしょう') {
      if (dearu && tailNe) return R(0, 'だろう', { sure: false, alts: ['であろう'], note: '後ろに「ね」「よ」があるので「だろう」にしました。' });
      if (dearu && pre.endsWith('ん')) return R(1, 'のであろう');
      return R(0, dearu ? 'であろう' : 'だろう');
    }
    return null;
  }

  /* ======================================================
     だ・である → です・ます（文の終わりだけ）
     ====================================================== */
  function toPolite(text) {
    const mask = quoteMask(text);
    const changes = [];
    const ENDS = '。．！？!?\n';
    let segStart = 0;
    for (let i = 0; i <= text.length; i++) {
      const atEnd = i === text.length;
      if (!atEnd && (mask[i] || !ENDS.includes(text[i]))) continue;
      if (!atEnd && mask[i]) continue;
      // 文の終わり i（記号の位置）。その前の文を調べる
      let e = i;
      while (e > segStart && /[\s　…‥ー〜～]/.test(text[e - 1]) && !mask[e - 1]) e--;
      // 全角・半角の「！？」が続く場合
      const core = text.slice(segStart, e);
      segStart = i + 1;
      if (!core || mask[e - 1]) continue;
      const res = politeSentence(core);
      if (!res) continue;
      const end = e - (res.off || 0);
      changes.push(mkChange(text, end - res.k, end, res));
    }
    // 文の途中の「〜だったが、」「〜であるけれど、」なども直す
    const MID = /(だった|であった|である)(が|けれども|けれど|けど)[、，]/g;
    let mm;
    while ((mm = MID.exec(text))) {
      if (mask[mm.index] || !isWordChar(text[mm.index - 1])) continue;
      const rep = mm[1] === 'である' ? 'です' : 'でした';
      changes.push(mkChange(text, mm.index, mm.index + mm[1].length, { rep, sure: true }));
    }
    return finish(text, changes);
  }

  function politeSentence(core) {
    // 終わりの「ね・よ・か」などを外して考える
    let tail = '';
    let flagTail = null;
    let m;
    if ((m = core.match(/(よね|ね|よ)$/)) && core.length > m[0].length) tail = m[0];
    else if ((m = core.match(/(かなあ|かな|かしら)$/)) && core.length > m[0].length) { tail = m[0]; flagTail = 'kana'; }
    else if ((m = core.match(/(なあ|なぁ)$/)) && core.length > m[0].length) { tail = m[0]; flagTail = 'naa'; }
    else if (core.endsWith('か') && core.length > 1 && !/(しか|どこか|なにか|何か|だれか|誰か|いつか)$/.test(core)) { tail = 'か'; }
    const body = core.slice(0, core.length - tail.length);
    let r = politeCore(body, tail === 'か');
    if (!r) {
      if (tail === 'か' && body.endsWith('の')) r = { k: 0, rep: 'です', sure: true, alts: [], note: '' };
      else if (!tail && body.endsWith('の') && body.length > 1 && /[たいるうくすつむぶぐぬだ]の$/.test(body)) {
        r = { k: 0, rep: 'ですか', sure: false, alts: ['です'], note: '「〜の」で終わる文は、問いかけなら「〜のですか」、説明なら「〜のです」にします。' };
      }
      if (!r) return null;
    }
    // 終わりを付けて返す
    const full = (rep) => rep;
    if (flagTail === 'kana') {
      // 行くかな → 行くでしょうか
      const base = body.slice(body.length - r.k);
      return { k: r.k + tail.length, rep: base + 'でしょうか', sure: false, alts: [full(r.rep) + 'か', base + tail], note: '「〜かな」は「〜でしょうか」にしました。ほかの言い方も選べます。' };
    }
    if (flagTail === 'naa') {
      return { k: r.k + tail.length, rep: r.rep, sure: false, alts: [r.rep + 'ね', body.slice(body.length - r.k) + tail], note: '「〜なあ」は気持ちを表す言葉なので、外しました。ほかの言い方も選べます。' };
    }
    return Object.assign({}, r, { off: tail.length });
  }

  function politeCore(s, isQ) {
    const R = (k, rep, o) => Object.assign({ k, rep, sure: true, alts: [], note: '' }, o || {});
    if (!s) return null;
    if (/(です|ます|ました|でした|ません|でしょう|ましょう|ください|ございます)$/.test(s)) return null;
    let m;
    if ((m = s.match(/(では|じゃ)なかった$/))) return R(m[0].length, m[1] + 'ありませんでした');
    if ((m = s.match(/(では|じゃ)ない$/))) return R(m[0].length, m[1] + 'ありません');
    if (s.endsWith('であった')) return R(4, 'でした');
    if (s.endsWith('であろう')) return R(4, 'でしょう');
    if (s.endsWith('である')) return R(3, 'です');
    if (s.endsWith('だった')) return R(3, 'でした');
    if (s.endsWith('だろう')) return R(3, 'でしょう');

    for (const [suf, polV] of [['なかった', 'ませんでした'], ['ない', 'ません']]) {
      if (!s.endsWith(suf)) continue;
      const p = s.slice(0, -suf.length);
      const ari = suf === 'ない' ? 'ありません' : 'ありませんでした';
      if (matchList(p, ADJ_NAI)) return R(0, 'です');
      if (p.endsWith('く')) return R(suf.length, suf + 'です', { alts: [ari] });
      if (/(違い|ちがい)$/.test(p)) return R(suf.length, ari);
      if (/(が|は|も|しか|さえ|でも|こそ|まで|など)$/.test(p) || !p) {
        if (p.endsWith('が') && matchList(p.slice(0, -1), G_STEMS)) return R(suf.length + 1, 'ぎ' + polV);
        return R(suf.length, ari);
      }
      const c = p.slice(-1);
      if (c === '来') return R(suf.length, polV);
      if (endsStem(p, 'こ')) return R(suf.length + 1, 'き' + polV);
      if (A2I[c]) return R(suf.length + 1, A2I[c] + polV);
      if (E_ROW.includes(c) || I_ROW.includes(c) || KANJI.test(c)) return R(suf.length, polV);
      return R(0, 'です', { sure: false, note: '「ない」の直し方がはっきりしません。確かめてください。' });
    }

    if (s.endsWith('かった')) {
      const stem = s.slice(0, -2);
      let v = null;
      for (const e of KA_VERBS) {
        if (endsStem(stem, e.s, e.nb)) {
          if (e.notAfter && e.notAfter.includes(stem[stem.length - e.s.length - 1] || '')) continue;
          if (!v || e.s.length > v.s.length) v = e;
        }
      }
      if (v) return R(2, (v.d === 'う' ? 'い' : 'り') + 'ました');
      if (endsStem(stem, 'か')) return R(2, 'いました', { sure: false, alts: ['ちました'], note: '「買う」なのか「勝つ」なのか、確かめてください。' });
      return R(0, 'です');
    }

    if (s.endsWith('った')) {
      const stem = s.slice(0, -2);
      const prev = stem[stem.length - 2] || '';
      if (stem.endsWith('行')) return R(2, 'きました');
      if (endsStem(stem, 'い')) {
        if ('てでにへ'.includes(prev) && prev) return R(2, 'きました');
        if (prev === 'と' || prev === 'っ') return R(2, 'いました');
        return R(2, 'きました', { sure: false, alts: ['いました'], note: '「行った」なのか「言った」なのか、確かめてください。' });
      }
      if (endsStem(stem, 'あ')) {
        if (prev === 'に' || prev === 'と') return R(2, 'いました', { sure: false, alts: ['りました'], note: '「会った」なのか「あった（ある）」なのか、確かめてください。' });
        return R(2, 'りました');
      }
      if (stem.endsWith('通')) {
        if (prev === 'に') return R(2, 'いました', { sure: false, alts: ['りました'], note: '「通う（かよう）」なのか「通る（とおる）」なのか、確かめてください。' });
        return R(2, 'りました', { sure: false, alts: ['いました'], note: '「通る（とおる）」なのか「通う（かよう）」なのか、確かめてください。' });
      }
      if (matchList(stem, U_STEMS)) return R(2, 'いました');
      if (matchList(stem, T_STEMS)) return R(2, 'ちました');
      return R(2, 'りました');
    }

    if (s.endsWith('んだ')) {
      const p = s.slice(0, -2);
      const c = p.slice(-1);
      const single = !!c && HIRA.test(c) && isBoundary(p[p.length - 2]);
      if (single && 'すつうふく'.includes(c)) {
        return R(2, 'みました', { sure: false, alts: ['んです'], note: '「済んだ・積んだ」などの動詞なのか、「〜んだ（〜のだ）」なのか、確かめてください。' });
      }
      if (c && (U_ROW.includes(c) || 'いたなだ'.includes(c))) return R(1, 'です');
      if (matchList(p, N_STEMS)) return R(2, 'にました');
      const b = matchList(p, B_STEMS);
      if (b) return R(2, 'びました');
      if (endsStem(p, 'よ')) return R(2, 'みました', { sure: false, alts: ['びました'], note: '「読んだ」なのか「呼んだ」なのか、確かめてください。' });
      return R(2, 'みました');
    }

    if (s.endsWith('いだ')) {
      const p = s.slice(0, -2);
      if (matchList(p, G_STEMS)) return R(2, 'ぎました');
      return R(1, 'です');
    }

    if (s.endsWith('いた')) {
      const p = s.slice(0, -2);
      const c = p.slice(-1);
      if (!c || c === 'て' || c === 'で' || isBoundary(c)) return R(1, 'ました');
      if (/(用|老|報|悔)$/.test(p)) return R(1, 'ました');
      return R(2, 'きました');
    }
    if (s.endsWith('した')) return R(1, 'ました');
    if (/([えけげせぜてでねへべぺめれきぎじちぢにひびぴみり]|[一-鿿])た$/.test(s)) return R(1, 'ました');

    if (s.endsWith('だ')) return R(1, 'です');
    if (s.endsWith('い')) return R(0, 'です');

    if (s.endsWith('する')) return R(2, 'します');
    if (s.endsWith('来る')) return R(1, 'ます');
    if (endsStem(s, 'くる')) return R(2, 'きます');

    if (s.endsWith('う')) return politeU(s, R);
    if (s.endsWith('る')) {
      const p = s.slice(0, -1);
      const c = p.slice(-1);
      if (!c) return null;
      if (KANJI.test(c)) return ICHI_KANJI.includes(c) ? R(1, 'ます') : R(1, 'ります');
      if (E_ROW.includes(c) || I_ROW.includes(c)) {
        if (endsStem(p, 'かえ')) return R(1, 'ります', { sure: false, alts: ['ます'], note: '「帰る」なのか「変える」なのか、確かめてください。' });
        if (endsStem(p, 'き')) return R(1, 'ます', { sure: false, alts: ['ります'], note: '「着る」なのか「切る」なのか、確かめてください。' });
        if (endsStem(p, 'し')) return R(1, 'ります', { sure: false, alts: ['ます'], note: '「知る」でよいか、確かめてください。' });
        if (matchList(p, GODAN_ERU_KANA)) return R(1, 'ります');
        if ((c === 'て' || c === 'で') && HIRA.test(p[p.length - 2] || '') && !isBoundary(p[p.length - 2])) {
          return R(1, 'います', { sure: false, alts: ['ます'], note: '「〜てる」は「〜ている」のくだけた言い方なので「〜ています」にしました。' });
        }
        return R(1, 'ます');
      }
      if (A_ROW.includes(c) || U_ROW.includes(c) || 'おこごそぞとどのほぼぽもよろ'.includes(c)) return R(1, 'ります');
      return null;
    }
    const last = s.slice(-1);
    if (U2I[last] && isWordChar(s[s.length - 2])) return R(1, U2I[last] + 'ます');
    return null;
  }

  function politeU(s, R) {
    const EXC = ['ありがとう', 'おめでとう', 'おはよう', 'ごちそう', 'ちょう', 'しょう', 'きょう', 'りょう', 'じょう', 'ぼう'];
    for (const w of EXC) if (s.endsWith(w)) return null;
    for (const w of ['どう', 'そう', 'こう', 'もう', 'ほう', 'よう']) {
      if (s.endsWith(w) && !isWordChar(s[s.length - w.length - 1])) return null;
    }
    const p = s.slice(0, -1);
    const c = p.slice(-1);
    if (matchList(s, ['おもう', 'そろう', 'とう', 'おう'])) return R(1, 'います');
    if (c === 'よ') {
      const q = p.slice(0, -1);
      const d = q.slice(-1);
      if (d === '来') return R(2, 'ましょう');
      if (endsStem(q, 'こ')) return R(3, 'きましょう');
      if (d && (E_ROW.includes(d) || I_ROW.includes(d) || KANJI.test(d))) return R(2, 'ましょう');
      if (d && A_ROW.includes(d)) return R(1, 'います');
      return null;
    }
    if (c === 'そ') {
      const q = p.slice(0, -1);
      const d = q.slice(-1);
      if (!d) return null;
      if (d === 'し' || d === 'さ' || I_ROW.includes(d) || E_ROW.includes(d) || ADJ_SOU.includes(d)) return R(0, 'です');
      if (d === 'う') return null;
      return R(2, 'しましょう', { sure: false, alts: ['そうです'], note: '「〜しよう」という気持ちなのか、「〜のようだ（〜そうだ）」なのか、確かめてください。' });
    }
    if (O2I[c]) {
      if (KANJI.test(p[p.length - 2] || '') || HIRA.test(p[p.length - 2] || '')) return R(2, O2I[c] + 'ましょう');
      return null;
    }
    if (c && (KANJI.test(c) || A_ROW.includes(c) || I_ROW.includes(c) || U_ROW.includes(c))) return R(1, 'います');
    return null;
  }

  /* ---------- 共通 ---------- */
  function mkChange(text, start, end, ch) {
    const from = text.slice(start, end);
    const options = [ch.rep];
    for (const a of ch.alts || []) if (!options.includes(a)) options.push(a);
    let sure = ch.sure !== false;
    // 候補が一つしかない（どちらでも同じ形になる）ときは確かめなくてよい
    if (!sure && options.length === 1 && !ch.same) sure = true;
    return { start, end, from, options, choice: 0, sure, note: sure ? '' : (ch.note || ''), same: !!ch.same };
  }
  function noteOnly(text, mask, changes, re, note, alts) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      if (mask[m.index]) continue;
      changes.push({ start: m.index, end: m.index + m[0].length, from: m[0], options: [m[0]].concat(alts || []), choice: 0, sure: false, note, same: true });
    }
  }
  function finish(text, changes) {
    changes.sort((a, b) => a.start - b.start);
    const out = [];
    let last = -1;
    for (const c of changes) {
      if (c.start < last) continue; // 重なりは先のものを優先
      // 置きかえても同じなら記録しない（ただし確かめるものは残す）
      if (c.options[0] === c.from && c.sure) continue;
      out.push(c);
      last = c.end;
    }
    return { text, changes: out };
  }
  function render(result) {
    let s = '';
    let pos = 0;
    for (const c of result.changes) {
      s += result.text.slice(pos, c.start) + c.options[c.choice];
      pos = c.end;
    }
    return s + result.text.slice(pos);
  }

  const api = { toPlain, toPolite, render };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Bunmatsu = api;
})(this);
