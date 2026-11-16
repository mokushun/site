
    var GRADES = [
      {
        id: 'grade1',
        name: '小学1年生',
        units: [
          { id: 'g1_add_10', name: '10までの たしざん', description: 'くり上がりのない、答えが10までのたしざんです。' },
          { id: 'g1_sub_10', name: '10までの ひきざん', description: 'ひかれる数が10までの、くり下がりのないひきざんです。' },
          { id: 'g1_add_carry', name: 'くり上がりのある たしざん', description: '「8 + 5 = 13」のような、くり上がりのあるたしざんです。' },
          { id: 'g1_sub_borrow', name: 'くり下がりのある ひきざん', description: '「13 - 5 = 8」のような、くり下がりのあるひきざです。' },
          { id: 'g1_mixed', name: '1年生の まとめ', description: '1年生のたし算・ひき算からバランスよく10問出題されます。' }
        ]
      },
      {
        id: 'grade2',
        name: '小学2年生',
        units: [
          { id: 'g2_add_2digit', name: '2けたの たし算 (筆算)', description: '「35 + 28」のような、2けたのたし算です。' },
          { id: 'g2_sub_2digit', name: '2けたの ひき算 (筆算)', description: '「73 - 45」のような、2けたのひき算です。' },
          { id: 'g2_kuku', name: 'かけ算九九 (すべての段)', description: '九九（1の段〜9の段）がランダムに出題されます。' },
          { id: 'g2_add_sub_1000', name: '1000までの たし算・ひき算', description: '「240 + 350」や「500 - 180」などの大きなたし算・ひき算です。' },
          { id: 'g2_mixed', name: '2年生の まとめ', description: '2けたの計算、かけ算九九、大きなたし算・ひき算のミックスです。' }
        ]
      },
      {
        id: 'grade3',
        name: '小学3年生',
        units: [
          { id: 'g3_mul_basics', name: 'かけ算の筆算の基本', description: '「23 × 4」や「128 × 3」のような、(2-3桁) × (1桁) の計算です。' },
          { id: 'g3_div_basics', name: 'わり算のきほん (九九の逆)', description: '「24 ÷ 6」のような、九九の答えから逆算するわり算です。' },
          { id: 'g3_div_remainder', name: 'あまりのある わり算', description: '「17 ÷ 5 = 3 あまり 2」のような、あまりがでるわり算です。' },
          { id: 'g3_decimal_simple', name: '簡単な 小数のたし算・ひき算', description: '「0.3 + 0.5」や「1.2 - 0.4」のような、小数第一位までの計算です。' },
          { id: 'g3_fraction_simple', name: '簡単な 分数のたし算・ひき算', description: '同分母の分数のたし算とひき算です。答えは真分数です。' }
        ]
      },
      {
        id: 'grade4',
        name: '小学4年生',
        units: [
          { id: 'g4_div_long', name: 'わり算の筆算', description: '「84 ÷ 4」や「135 ÷ 5」のような、筆算レベルのわり算です。' },
          { id: 'g4_decimal_advanced', name: '小数のたし算・ひき算', description: '「1.45 + 2.38」や「3.6 - 1.25」のような、小数第二位や桁違いの計算です。' },
          { id: 'g4_fraction_advanced', name: '同分母の分数 (帯分数あり)', description: '同分母の分数の計算です。帯分数や1を超える分数（仮分数）が登場します。' },
          { id: 'g4_three_numbers', name: '3つの数のけいさん', description: '「15 + 28 - 14」や「4 × 9 × 25」などの3つの項の計算です。' }
        ]
      },
      {
        id: 'grade5',
        name: '小学5年生',
        units: [
          { id: 'g5_decimal_mul', name: '小数のかけ算', description: '「1.5 × 0.4」や「2.4 × 1.2」のような、小数をかける計算です。' },
          { id: 'g5_decimal_div', name: '小数のわり算', description: '「4.8 ÷ 1.2」や「7.5 ÷ 0.5」のような、小数でわる計算です。あまりは出ません。' },
          { id: 'g5_fraction_diff_den', name: '異分母の分数 (通分が必要)', description: '「1/2 + 1/3」のように、分母が違う分数の計算です。通分（最小公倍数）が必要です。' },
          { id: 'g5_multiples_divisors', name: '約数と倍数 (公約数・公倍数)', description: '2つの数の「最大公約数」または「最小公倍数」を答える問題です。' }
        ]
      },
      {
        id: 'grade6',
        name: '小学6年生',
        units: [
          { id: 'g6_fraction_mul', name: '分数のかけ算', description: '「2/3 × 4/5」や/3/8 × 4/9」などの分数のかけ算です。約分が必要です。' },
          { id: 'g6_fraction_div', name: '分数のわり算', description: '「2/3 ÷ 4/5」や「3/10 ÷ 6/5」などの分数のわり算です。逆数をかけます。' },
          { id: 'g6_mixed_calc', name: '分数と小数の混ざった計算', description: '「0.2 + 1/3」や「0.75 - 1/2 × 0.5」など、分数と小数が混在する計算です。' },
          { id: 'g6_proportion', name: '比の計算 (比例式)', description: '「3 : 5 = 12 : x」の「x」に当てはまる数を求める問題です。' }
        ]
      }
    ];

    var state = {
      selectedGradeId: 'grade1',
      selectedUnitId: 'g1_add_10',
      problems: [],
      showAllAnswers: false
    };

    function gcd(a, b) {
      a = Math.abs(a); b = Math.abs(b);
      while (b) { var t = b; b = a % b; a = t; }
      return a;
    }

    function lcm(a, b) {
      if (a === 0 || b === 0) return 0;
      return Math.abs(a * b) / gcd(a, b);
    }

    function randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randomChoice(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function makeFractionToken(num, den, preferMixed) {
      if (preferMixed === undefined) preferMixed = true;
      var g = gcd(num, den);
      var n = num / g;
      var d = den / g;
      if (d === 1) return { type: 'number', value: n };
      if (preferMixed && n > d) {
        var whole = Math.floor(n / d);
        var rest = n % d;
        if (rest === 0) return { type: 'number', value: whole };
        return { type: 'fraction', whole: whole, num: rest, den: d };
      }
      return { type: 'fraction', num: n, den: d };
    }

    function generateSingleProblem(gradeId, unitId, index) {
      switch (unitId) {
        case 'g1_add_10': {
          var c = randomInt(2, 10); var a = randomInt(1, c - 1); var b = c - a;
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '+' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: c }] } };
        }
        case 'g1_sub_10': {
          var a = randomInt(2, 10); var b = randomInt(1, a - 1); var c = a - b;
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '-' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: c }] } };
        }
        case 'g1_add_carry': {
          var c = randomInt(11, 18); var minA = c - 9; var a = randomInt(minA, 9); var b = c - a;
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '+' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: c }] } };
        }
        case 'g1_sub_borrow': {
          var a = randomInt(11, 18); var minB = a - 9; var b = randomInt(minB, 9); var c = a - b;
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '-' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: c }] } };
        }
        case 'g1_mixed': {
          return generateSingleProblem('grade1', randomChoice(['g1_add_10', 'g1_sub_10', 'g1_add_carry', 'g1_sub_borrow']), index);
        }
        case 'g2_add_2digit': {
          var a = randomInt(11, 88); var b = randomInt(11, 99 - a);
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '+' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a + b }] } };
        }
        case 'g2_sub_2digit': {
          var a = randomInt(21, 99); var b = randomInt(11, a - 1);
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '-' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a - b }] } };
        }
        case 'g2_kuku': {
          var a = randomInt(2, 9); var b = randomInt(1, 9);
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '×' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a * b }] } };
        }
        case 'g2_add_sub_1000': {
          if (Math.random() > 0.5) {
            var a = randomInt(11, 80) * 10; var b = randomInt(11, 95 - (a/10)) * 10;
            return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '+' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a + b }] } };
          } else {
            var a = randomInt(30, 99) * 10; var b = randomInt(11, (a/10) - 1) * 10;
            return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '-' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a - b }] } };
          }
        }
        case 'g2_mixed': {
          return generateSingleProblem('grade2', randomChoice(['g2_add_2digit', 'g2_sub_2digit', 'g2_kuku', 'g2_add_sub_1000']), index);
        }
        case 'g3_mul_basics': {
          var a = Math.random() > 0.6 ? randomInt(105, 330) : randomInt(12, 89); var b = randomInt(2, 9);
          return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '×' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a * b }] } };
        }
        case 'g3_div_basics': {
          var b = randomInt(2, 9); var a = randomInt(2, 9); var c = a * b;
          return { id: index, question: { tokens: [{ type: 'number', value: c }, { type: 'operator', symbol: '÷' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a }] } };
        }
        case 'g3_div_remainder': {
          var b = randomInt(3, 9); var q = randomInt(2, 9); var r = randomInt(1, b - 1);
          return { id: index, question: { tokens: [{ type: 'number', value: b * q + r }, { type: 'operator', symbol: '÷' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: q }, { type: 'number', value: ' あまり ' }, { type: 'number', value: r }] } };
        }
        case 'g3_decimal_simple': {
          var isAdd = Math.random() > 0.5;
          var v1 = randomInt(1, 15); var v2 = randomInt(1, 15);
          if (isAdd) {
            return { id: index, question: { tokens: [{ type: 'number', value: (v1/10).toFixed(1) }, { type: 'operator', symbol: '+' }, { type: 'number', value: (v2/10).toFixed(1) }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: ((v1+v2)/10).toFixed(1) }] } };
          } else {
            var max = Math.max(v1, v2); var min = Math.min(v1, v2); if(max===min) max++;
            return { id: index, question: { tokens: [{ type: 'number', value: (max/10).toFixed(1) }, { type: 'operator', symbol: '-' }, { type: 'number', value: (min/10).toFixed(1) }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: ((max-min)/10).toFixed(1) }] } };
          }
        }
        case 'g3_fraction_simple': {
          var den = randomChoice([4, 5, 6, 7, 8, 9]);
          if (Math.random() > 0.5) {
            var c = randomInt(2, den - 1); var a = randomInt(1, c - 1); var b = c - a;
            return { id: index, question: { tokens: [{ type: 'fraction', num: a, den: den }, { type: 'operator', symbol: '+' }, { type: 'fraction', num: b, den: den }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(c, den, false)] } };
          } else {
            var a = randomInt(2, den - 1); var b = randomInt(1, a - 1);
            return { id: index, question: { tokens: [{ type: 'fraction', num: a, den: den }, { type: 'operator', symbol: '-' }, { type: 'fraction', num: b, den: den }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(a - b, den, false)] } };
          }
        }
        case 'g4_div_long': {
          var b = randomInt(4, 12); var ans = randomInt(11, 120);
          return { id: index, question: { tokens: [{ type: 'number', value: ans * b }, { type: 'operator', symbol: '÷' }, { type: 'number', value: b }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: ans }] } };
        }
        case 'g4_decimal_advanced': {
          var aVal = randomInt(5, 40) / 10; var bVal = randomInt(15, 350) / 100;
          if (Math.random() > 0.5) {
            return { id: index, question: { tokens: [{ type: 'number', value: aVal.toString() }, { type: 'operator', symbol: '+' }, { type: 'number', value: bVal.toString() }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: Number((aVal + bVal).toFixed(2)).toString() }] } };
          } else {
            var max = Math.max(aVal, bVal); var min = Math.min(aVal, bVal);
            return { id: index, question: { tokens: [{ type: 'number', value: max.toString() }, { type: 'operator', symbol: '-' }, { type: 'number', value: min.toString() }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: Number((max - min).toFixed(2)).toString() }] } };
          }
        }
        case 'g4_fraction_advanced': {
          var den = randomChoice([5, 6, 7, 8]);
          if (Math.random() > 0.5) {
            var w1 = randomInt(1, 2); var w2 = randomInt(1, 2); var n1 = randomInt(1, den-1); var n2 = randomInt(1, den-1);
            var tn = n1 + n2; var tw = w1 + w2 + Math.floor(tn / den); var rn = tn % den;
            var ans = rn === 0 ? { type: 'number', value: tw } : { type: 'fraction', whole: tw, num: rn, den: den };
            return { id: index, question: { tokens: [{ type: 'fraction', whole: w1, num: n1, den: den }, { type: 'operator', symbol: '+' }, { type: 'fraction', whole: w2, num: n2, den: den }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [ans] } };
          } else {
            var w1 = randomInt(3, 4); var w2 = randomInt(1, 2); var n1 = randomInt(1, den-3); var n2 = randomInt(n1+1, den-1);
            return { id: index, question: { tokens: [{ type: 'fraction', whole: w1, num: n1, den: den }, { type: 'operator', symbol: '-' }, { type: 'fraction', whole: w2, num: n2, den: den }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken((w1*den+n1)-(w2*den+n2), den, true)] } };
          }
        }
        case 'g4_three_numbers': {
          var layout = randomInt(1, 3);
          if (layout === 1) {
            var a = randomInt(20, 50); var b = randomInt(10, 30); var c = randomInt(5, a+b-5);
            return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '+' }, { type: 'number', value: b }, { type: 'operator', symbol: '-' }, { type: 'number', value: c }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a + b - c }] } };
          } else if (layout === 2) {
            var a = randomInt(10, 30); var b = randomInt(10, 30); var c = randomInt(10, 30);
            return { id: index, question: { tokens: [{ type: 'number', value: a }, { type: 'operator', symbol: '+' }, { type: 'number', value: b }, { type: 'operator', symbol: '+' }, { type: 'number', value: c }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: a + b + c }] } };
          } else {
            var pair = randomChoice([[2, 5], [4, 25], [5, 8]]); var r = randomInt(3, 9);
            return { id: index, question: { tokens: [{ type: 'number', value: pair[0] }, { type: 'operator', symbol: '×' }, { type: 'number', value: r }, { type: 'operator', symbol: '×' }, { type: 'number', value: pair[1] }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: pair[0] * pair[1] * r }] } };
          }
        }
        case 'g5_decimal_mul': {
          var a = randomInt(12, 45) / 10; var b = randomInt(3, 25) / 10;
          return { id: index, question: { tokens: [{ type: 'number', value: a.toFixed(1) }, { type: 'operator', symbol: '×' }, { type: 'number', value: b.toFixed(1) }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: Number((a * b).toFixed(2)).toString() }] } };
        }
        case 'g5_decimal_div': {
          var ans = randomInt(2, 15); var b = randomChoice([0.2, 0.4, 0.5, 0.8, 1.2, 1.5]); var a = ans * b;
          return { id: index, question: { tokens: [{ type: 'number', value: Number(a.toFixed(2)).toString() }, { type: 'operator', symbol: '÷' }, { type: 'number', value: b.toString() }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: ans }] } };
        }
        case 'g5_fraction_diff_den': {
          var d1 = randomChoice([2, 3, 4, 5]); var d2 = randomChoice([3, 4, 6, 8]); while(d1===d2) d2 = randomChoice([3,4,6,8]);
          var n1 = randomInt(1, d1-1); var n2 = randomInt(1, d2-1); var cm = lcm(d1, d2);
          if (Math.random() > 0.5) {
            return { id: index, question: { tokens: [{ type: 'fraction', num: n1, den: d1 }, { type: 'operator', symbol: '+' }, { type: 'fraction', num: n2, den: d2 }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(n1*(cm/d1) + n2*(cm/d2), cm, true)] } };
          } else {
            var v1 = n1*(cm/d1); var v2 = n2*(cm/d2);
            if (v1 === v2) v1 += cm/d1;
            var top = Math.max(v1, v2) - Math.min(v1, v2);
            return { id: index, question: { tokens: [{ type: 'fraction', num: v1 > v2 ? n1 : n2, den: v1 > v2 ? d1 : d2 }, { type: 'operator', symbol: '-' }, { type: 'fraction', num: v1 > v2 ? n2 : n1, den: v1 > v2 ? d2 : d1 }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(top, cm, true)] } };
          }
        }
        case 'g5_multiples_divisors': {
          var a = randomInt(4, 15); var b = randomInt(4, 15); while(a===b) b=randomInt(4,15);
          if (Math.random() > 0.5) {
            return { id: index, question: { tokens: [{ type: 'number', value: (a*2) + ' と ' + (b*2) + ' の 最大公約数' }] }, answer: { tokens: [{ type: 'number', value: gcd(a*2, b*2) }] } };
          } else {
            var p1 = randomChoice([3, 4, 5, 6]); var p2 = randomChoice([4, 5, 6, 8]); while(p1===p2) p2=randomChoice([4,5,6,8]);
            return { id: index, question: { tokens: [{ type: 'number', value: p1 + ' と ' + p2 + ' の 最小公倍数' }] }, answer: { tokens: [{ type: 'number', value: lcm(p1, p2) }] } };
          }
        }
        case 'g6_fraction_mul': {
          var b = randomInt(3, 8); var d = randomInt(3, 8); var a = randomInt(1, b-1); var c = randomInt(1, d-1);
          return { id: index, question: { tokens: [{ type: 'fraction', num: a, den: b }, { type: 'operator', symbol: '×' }, { type: 'fraction', num: c, den: d }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(a * c, b * d, true)] } };
        }
        case 'g6_fraction_div': {
          var b = randomInt(3, 8); var d = randomInt(3, 8); var a = randomInt(1, b-1); var c = randomInt(1, d-1);
          return { id: index, question: { tokens: [{ type: 'fraction', num: a, den: b }, { type: 'operator', symbol: '÷' }, { type: 'fraction', num: c, den: d }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(a * d, b * c, true)] } };
        }
        case 'g6_mixed_calc': {
          var dec = randomChoice([0.2, 0.5, 0.25]); var n = 1; var d = dec === 0.2 ? 5 : (dec === 0.5 ? 2 : 4);
          var fn = randomInt(1, 2); var fd = 3;
          return { id: index, question: { tokens: [{ type: 'number', value: dec.toString() }, { type: 'operator', symbol: '+' }, { type: 'fraction', num: fn, den: fd }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [makeFractionToken(n*fd + fn*d, d*fd, true)] } };
        }
        case 'g6_proportion': {
          var baseA = randomInt(2, 5); var baseB = randomInt(3, 7); while(gcd(baseA, baseB)>1) baseB = randomInt(3,7);
          var mult = randomInt(2, 5); var xVal = baseB * mult;
          return { id: index, question: { tokens: [{ type: 'number', value: baseA.toString() }, { type: 'operator', symbol: ':' }, { type: 'number', value: baseB.toString() }, { type: 'operator', symbol: '＝' }, { type: 'number', value: (baseA * mult).toString() }, { type: 'operator', symbol: ':' }, { type: 'number', value: 'x' }] }, answer: { tokens: [{ type: 'number', value: 'x = ' + xVal }] } };
        }
      }
      return { id: index, question: { tokens: [{ type: 'number', value: 1 }, { type: 'operator', symbol: '+' }, { type: 'number', value: 1 }, { type: 'operator', symbol: '=' }] }, answer: { tokens: [{ type: 'number', value: 2 }] } };
    }

    function generateDrill(gradeId, unitId) {
      var arr = [];
      for (var i = 1; i <= 10; i++) {
        arr.push(generateSingleProblem(gradeId, unitId, i));
      }
      return arr;
    }

    function renderMath(expression) {
      if (!expression || !expression.tokens) return '';
      var html = '<span class="sd-math-renderer-expr">';
      expression.tokens.forEach(function(token) {
        if (token.type === 'number') {
          var val = String(token.value);
          if (val.indexOf(' あまり ') !== -1) {
             html += '<span class="sd-math-badge-remainder">あまり</span>' + '<span class="sd-math-token-number">' + val.split(' あまり ')[1] + '</span>';
          } else if (val === 'x') {
             html += '<span class="sd-math-variable-x">x</span>';
          } else if (val.indexOf('x =') !== -1) {
             html += '<span class="sd-math-ratio-ans"><span class="sd-math-variable-x">x</span><span style="color:#94a3b8;margin:0 0.4rem;">=</span><span class="sd-math-token-number" style="color:#10b981">' + val.split('=')[1].trim() + '</span></span>';
          } else if (val.indexOf('最大公約数') !== -1 || val.indexOf('最小公倍数') !== -1) {
             var parts = val.split(' の ');
             html += '<span style="display:inline-flex;flex-direction:column;line-height:1.2;vertical-align:middle;"><span style="font-size:2rem;font-weight:700;color:#1e293b;">' + parts[0] + '</span><span style="font-size:1.5rem;font-weight:800;color:#4f46e5;">の ' + parts[1] + '</span></span>';
          } else {
             html += '<span class="sd-math-token-number">' + val + '</span>';
          }
        } else if (token.type === 'operator') {
          var sym = token.symbol; var cColor = '#64748b';
          if (sym === '+' || sym === '-') cColor = '#3b82f6';
          else if (sym === '×' || sym === '÷') cColor = '#f97316';
          else if (sym === '=' || sym === '＝') { cColor = '#10b981'; sym = '='; }
          else if (sym === ':') cColor = '#6366f1';
          html += '<span class="sd-math-token-operator" style="color: ' + cColor + ';">' + sym + '</span>';
        } else if (token.type === 'fraction') {
          var hasW = token.whole !== undefined && token.whole > 0;
          html += '<span class="sd-math-token-fraction">' +
                      (hasW ? '<span style="margin-right:0.1rem;">' + token.whole + '</span>' : '') +
                      '<span class="sd-math-token-fraction-stack">' +
                        '<span class="sd-math-token-fraction-num">' + token.num + '</span>' +
                        '<span class="sd-math-token-fraction-den">' + token.den + '</span>' +
                      '</span>' +
                   '</span>';
        }
      });
      html += '</span>';
      return html;
    }

    window.app = {
      handleGrade: function(gradeId) {
        state.selectedGradeId = gradeId;
        var g = GRADES.find(function(item) { return item.id === gradeId; });
        state.selectedUnitId = g.units[0].id;
        this.triggerNewDrill(gradeId, state.selectedUnitId);
      },
      handleUnit: function(unitId) {
        state.selectedUnitId = unitId;
        this.triggerNewDrill(state.selectedGradeId, unitId);
      },
      triggerNewDrill: function(gradeId, unitId) {
        state.problems = generateDrill(gradeId, unitId);
        state.showAllAnswers = false;
        render();
      },
      handleRefreshProblems: function() {
        this.triggerNewDrill(state.selectedGradeId, state.selectedUnitId);
      },
      toggleAllAnswers: function() {
        state.showAllAnswers = !state.showAllAnswers;
        render();
      }
    };

    function render() {
      var activeG = GRADES.find(function(g) { return g.id === state.selectedGradeId; }) || GRADES[0];
      var activeU = activeG.units.find(function(u) { return u.id === state.selectedUnitId; }) || activeG.units[0];
      
      var gradesHtml = '';
      GRADES.forEach(function(g) {
        var isSelected = state.selectedGradeId === g.id;
        gradesHtml += '<button onclick="app.handleGrade(\'' + g.id + '\')" class="sd-btn-grade ' + g.id + (isSelected ? ' active-grade' : '') + '">' + g.name + '</button>';
      });

      var unitsHtml = '';
      activeG.units.forEach(function(u) {
        var isSelected = state.selectedUnitId === u.id;
        unitsHtml += '<button onclick="app.handleUnit(\'' + u.id + '\')" class="sd-btn-unit' + (isSelected ? ' active-unit' : '') + '">' +
          '  <div><span class="sd-btn-unit-tag ' + (isSelected ? 'active-tag' : '') + '">' + (isSelected ? '★ 選択中' : '単元') + '</span>' +
          '    <h3 class="sd-btn-unit-title">' + u.name + '</h3></div>' +
          '  <p class="sd-btn-unit-desc">' + u.description + '</p>' +
          '</button>';
      });

      var problemsHtml = ''; var printAnswersHtml = '';
      state.problems.forEach(function(prob) {
        var isRevealed = state.showAllAnswers;
        problemsHtml += '<div class="sd-problem-card">' +
          '  <div style="display: flex; justify-content: space-between; align-items: center;"><span class="sd-problem-num">' + prob.id + '</span></div>' +
          '  <div class="sd-math-block">' + renderMath(prob.question) + '</div>' +
          '  <div class="sd-answer-block ' + (isRevealed ? 'revealed' : '') + '">' +
          (isRevealed ? '    <span class="sd-answer-label">こたえ</span><div style="display: inline-block; vertical-align: middle;">' + renderMath(prob.answer) + '</div>' : '    <span class="sd-answer-placeholder">（上の「こたえを全部だす」で表示）</span>') +
          '  </div><div class="sd-print-answer-space"></div>' +
          '</div>';

        printAnswersHtml += '<div class="sd-problem-card" style="page-break-inside: avoid; break-inside: avoid;">' +
          '  <div style="font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; margin-bottom: 0.5rem; font-size: 0.8rem; color: #475569;">問題 ' + prob.id + '</div>' +
          '  <div style="margin-bottom: 0.5rem; transform: scale(0.9); transform-origin: left;">' + renderMath(prob.question) + '</div>' +
          '  <div class="sd-answer-block revealed"><span class="sd-answer-label">こたえ</span><div style="display: inline-block; vertical-align: middle;">' + renderMath(prob.answer) + '</div></div>' +
          '</div>';
      });

      var activeThemeClass = 'sd-theme-' + state.selectedGradeId;
      var rootHtml = '<div class="sd-app-container ' + activeThemeClass + '">' +
        '  <header class="sd-header no-print"><h1 class="sd-app-title">✏️ 小学生 算数ドリル</h1>' +
        '    <p class="sd-app-subtitle">手書きのノートとえんぴつで解く、10問の自主学習用算数アプリ。答え合わせはワンタップで完了！</p></header>' +
        '  <div class="no-print"><div class="sd-section-title">● 学年をえらぶ</div><div class="sd-grid-grades">' + gradesHtml + '</div>' +
        '    <div class="sd-section-title">● 単元をえらぶ</div><div class="sd-grid-units">' + unitsHtml + '</div></div>' +
        '  <section class="sd-worksheet"><div class="sd-worksheet-header"><div class="sd-worksheet-title-container">' +
        '        <span class="sd-worksheet-grade-tag active-tag">' + activeG.name + '</span><h2 class="sd-worksheet-title">' + activeU.name + '</h2></div>' +
        '      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem;">' +
        '        <div style="font-size: 0.8rem; font-weight: 700; color: #475569;">問題数: 10問</div>' +
        '        <div class="no-print" style="margin-top: 0.25rem;"><button onclick="window.print()" class="sd-btn sd-btn-answer" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-radius: 0.5rem; font-weight: 700; cursor: pointer;">🖨️ A4プリントとして印刷</button></div>' +
        '      </div></div>' +
        '    <div class="sd-control-bar no-print"><button onclick="app.handleRefreshProblems()" class="sd-btn sd-btn-refresh">🔄 新しい問題にする</button>' +
        '      <button onclick="app.toggleAllAnswers()" class="sd-btn sd-btn-answer ' + (state.showAllAnswers ? 'active' : '') + '">' + (state.showAllAnswers ? '🙈 こたえを全部かくす' : '👀 こたえを全部だす') + '</button></div>' +
        '    <div class="sd-guidance-card no-print"><h4 class="sd-guidance-card-title">📖 おすすめの使い方</h4>' +
        '      <p class="sd-guidance-card-text">算数の問題は画面で見ながら、答えを自主学習用の手書きノートに書き込みましょう。<br>解き終わったら、上の「こたえを全部だす」ボタンで答え合わせをしよう。</p></div>' +
        '    <div class="sd-grid-problems">' + problemsHtml + '</div></section>' +
        '  <section class="print-only sd-print-page-break" style="margin-top: 2rem; border-top: 2px dashed #475569; padding-top: 2rem;">' +
        '    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">' +
        '      <h2 style="font-size: 1.35rem; font-weight: 900; color: #0f172a; margin: 0;">『' + activeU.name + '』こたえシート</h2><span style="font-size: 0.75rem; color: #64748b;">' + activeG.name + ' / 10問</span></div>' +
        '    <div class="sd-grid-problems">' + printAnswersHtml + '</div></section>' +
        '  <footer class="sd-footer no-print"><p>© 小学生 算数ドリル / Blogger対応・手書きノート学習モデル</p></footer>' +
        '</div>';

      document.getElementById('school-drill-app-root').innerHTML = rootHtml;
    }

    state.problems = generateDrill(state.selectedGradeId, state.selectedUnitId);
    render();
