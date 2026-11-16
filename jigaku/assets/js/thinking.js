
  // ===== 音声 =====
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function playCorrectSound() {
    initAudio(); if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const playTone = (freq, delay, duration) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + delay); osc.stop(now + delay + duration);
    };
    playTone(523.25, 0, 0.1); playTone(659.25, 0.08, 0.12);
    playTone(783.99, 0.16, 0.15); playTone(1046.50, 0.24, 0.3);
  }
  function playIncorrectSound() {
    initAudio(); if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(110, now + 0.3);
    gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(now); osc.stop(now + 0.35);
  }
  function playFanfareSound() {
    initAudio(); if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const playTone = (freq, delay, duration) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = "triangle"; osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now + delay); osc.stop(now + delay + duration);
    };
    const rhythm = [0, 0.12, 0.24, 0.36, 0.48, 0.72, 0.96];
    const freqs  = [523.25, 523.25, 523.25, 523.25, 659.25, 587.33, 659.25];
    for (let i = 0; i < rhythm.length; i++)
      playTone(freqs[i], rhythm[i], i === rhythm.length - 1 ? 0.6 : 0.15);
  }

;

  let currentMode    = 'mixed';
  let currentLevel   = 'standard';
  let currentPattern = 'random';   // 'random' | 'complement' | 'mixed'
  let questions      = [];

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ── きりのいい数ペア生成 ─────────────────────────
  // 足し算：一の位の和 = 10  例) 12 + 38
  function makeAddComplementPair() {
    const ones = getRandomInt(1, 9);
    const a = getRandomInt(1, 8) * 10 + ones;
    const b = getRandomInt(1, 8) * 10 + (10 - ones);
    return [a, b];
  }
  // 引き算：一の位が同じ  例) 57 - 27
  function makeSubComplementPair() {
    const ones = getRandomInt(1, 9);
    const tA = getRandomInt(2, 9);
    const tB = getRandomInt(1, tA - 1);
    return [tA * 10 + ones, tB * 10 + ones]; // a > b 保証
  }

  // ── 問題生成（メイン） ────────────────────────────
  function generateQuestion(id, mode, level, forceComplement) {
    return forceComplement
      ? generateComplementQuestion(id, mode, level)
      : generateRandomQuestion(id, mode, level);
  }

  function generateRandomQuestion(id, mode, level) {
    let attempt = 0;
    while (attempt++ < 1000) {
      const num1 = getRandomInt(10, 99);
      const num2 = getRandomInt(10, 99);
      const num3 = getRandomInt(10, 99);
      let op1, op2;
      if (mode === 'addition')    { op1 = '+'; op2 = '+'; }
      else if (mode === 'subtraction') { op1 = '-'; op2 = '-'; }
      else { op1 = Math.random() > 0.5 ? '+' : '-'; op2 = Math.random() > 0.5 ? '+' : '-'; }

      const mid = op1 === '+' ? num1 + num2 : num1 - num2;
      if (mid < 0) continue;
      const finalVal = op2 === '+' ? mid + num3 : mid - num3;
      if (finalVal < 0) continue;

      const blankPosition = level === 'advanced' ? getRandomInt(1, 3) : 4;
      const correctValue = blankPosition === 1 ? num1 : blankPosition === 2 ? num2 : blankPosition === 3 ? num3 : finalVal;
      return { id, num1, num2, num3, op1, op2, correctAnswer: finalVal, blankPosition, correctValue, userAnswer: '', isCorrect: null, isComplement: false };
    }
  }  
  
  function generateComplementQuestion(id, mode, level) {
    let attempt = 0;
    while (attempt++ < 300) {
      let num1, num2, num3, op1, op2, finalVal, hintText;

      const useAdd = mode === 'addition' || (mode !== 'subtraction' && Math.random() > 0.4);

      if (useAdd) {
        const pos = ['left','right','outer'][Math.floor(Math.random() * 3)];
        const [pA, pB] = makeAddComplementPair();
        const lone = getRandomInt(10, 99);

        if (pos === 'left') {
          num1=pA; num2=pB; num3=lone; op1='+';
          op2 = mode==='subtraction' ? '-' : mode==='addition' ? '+' : Math.random()>0.5?'+':'-';
          const mid = num1+num2;
          finalVal = op2==='+' ? mid+num3 : mid-num3;
          hintText = `💚 ${num1}＋${num2}＝${mid}（一の位が0！）を先に計算しよう`;
        } else if (pos === 'right') {
          num1=lone; num2=pA; num3=pB; op2='+';
          op1 = mode==='subtraction' ? '-' : mode==='addition' ? '+' : Math.random()>0.5?'+':'-';
          const mid = op1==='+' ? num1+num2 : num1-num2;
          if (mid < 0) continue;
          finalVal = mid+num3;
          if (op1 === '+') {
            hintText = `💚 ${num2}＋${num3}＝${num2+num3}（一の位が0！）を先に計算しよう`;
          } else {
            hintText = `⚠️ ${num2}＋${num3}＝${num2+num3}は一の位が0だけど、前に「－」があるから先に計算すると答えが変わっちゃうよ。ひき算が混ざっているときは左から順番に：${num1}－${num2}＝${mid} → ${mid}＋${num3}＝${finalVal}`;
          }
        } else {
          // outer：1番目と3番目がペア
          num1=pA; num2=lone; num3=pB; op1='+';
          op2 = mode==='subtraction' ? '-' : mode==='addition' ? '+' : Math.random()>0.5?'+':'-';
          const mid = num1+num2;
          finalVal = op2==='+' ? mid+num3 : mid-num3;
          if (op2 === '+') {
            hintText = `💚 ${num1}＋${num3}＝${num1+num3}（一の位が0！）を先に考えよう`;
          } else {
            hintText = `⚠️ ${num1}＋${num3}＝${num1+num3}は一の位が0だけど、間に引く数(${num2})があるから先に計算すると答えが変わっちゃうよ。ひき算が混ざっているときは左から順番に：${num1}＋${num2}＝${mid} → ${mid}－${num3}＝${finalVal}`;
          }
        }

      } else {
        const [pA, pB] = makeSubComplementPair();
        const lone = getRandomInt(10, 99);
        const pos = Math.random() > 0.5 ? 'right' : 'left';

        if (pos === 'right') {
          num1=lone; num2=pA; num3=pB; op2='-';
          op1 = mode==='subtraction' ? '-' : mode==='addition' ? '+' : Math.random()>0.5?'+':'-';
          const mid = op1==='+' ? num1+num2 : num1-num2;
          if (mid < 0) continue;
          finalVal = mid-num3;
          if (op1 === '+') {
            hintText = `💚 ${num2}－${num3}＝${num2-num3}（一の位が0！）を先に計算しよう`;
          } else {
            hintText = `⚠️ ${num2}－${num3}＝${num2-num3}は一の位が0だけど、前に「－」があるから先に計算すると答えが変わっちゃうよ。ひき算が混ざっているときは左から順番に：${num1}－${num2}＝${mid} → ${mid}－${num3}＝${finalVal}`;
          }
        } else {
          if (mode === 'addition') continue;
          num1=pA; num2=pB; num3=lone; op1='-';
          op2 = mode==='subtraction' ? '-' : '+';
          const mid = num1-num2;
          if (mid < 0) continue;
          finalVal = op2==='+' ? mid+num3 : mid-num3;
          hintText = `💚 ${num1}－${num2}＝${mid}（一の位が0！）を先に計算しよう`;
        }
      }

      if (finalVal < 0 || finalVal > 250) continue;

      const blankPosition = level === 'advanced' ? getRandomInt(1, 3) : 4;
      const correctValue = blankPosition===1?num1:blankPosition===2?num2:blankPosition===3?num3:finalVal;

      return { id, num1, num2, num3, op1, op2, correctAnswer: finalVal,
               blankPosition, correctValue, userAnswer: '', isCorrect: null,
               isComplement: true, hintText };
    }
    return generateRandomQuestion(id, mode, level);
  }

  // ── UI制御 ────────────────────────────────────────
  function setLevel(lvl) {
    currentLevel = lvl;
    document.getElementById('btn-level-standard').className = 'btn-toggle' + (lvl === 'standard' ? ' active' : '');
    document.getElementById('btn-level-advanced').className = 'btn-toggle' + (lvl === 'advanced' ? ' active' : '');
  }

  function setPattern(pat) {
    currentPattern = pat;
    ['random','complement','mixed'].forEach(p => {
      document.getElementById('btn-pattern-' + p).className = 'btn-pattern' + (p === pat ? ' active' : '');
    });
    document.getElementById('rule-box-random').classList.toggle('hidden',     pat !== 'random');
    document.getElementById('rule-box-complement').classList.toggle('hidden', pat !== 'complement');
    document.getElementById('rule-box-mixed').classList.toggle('hidden',      pat !== 'mixed');
  }

  function selectMode(mode) {
    currentMode = mode;
    initAudio();
    startDrill();
  }

  function startDrill() {
    questions = [];
    for (let i = 1; i <= 5; i++) {
      let forceComplement;
      if      (currentPattern === 'complement') forceComplement = true;
      else if (currentPattern === 'random')     forceComplement = false;
      else /* mixed */                          forceComplement = (i % 2 === 0); // 2,4問目をきりのいい数に
      questions.push(generateQuestion(i, currentMode, currentLevel, forceComplement));
    }

    const modeLabels = { addition: '+ たしざん だけ', subtraction: '- ひきざん だけ', mixed: '+- ごちゃまぜ' };
    const patLabels  = { random: 'ランダム', complement: '💡 きりのいい数', mixed: '🔀 ミックス' };
    document.getElementById('current-mode-label').innerText = modeLabels[currentMode] || 'けいさん';
    document.getElementById('current-level-label').innerText =
      (currentLevel === 'advanced' ? 'レベル: じょうきゅう' : 'レベル: ふつう') + '　' + patLabels[currentPattern];

    document.getElementById('screen-start').classList.add('hidden');
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-playing').classList.remove('hidden');
    renderQuestions();
    updateAnsweredCount();
  }

  function renderQuestions() {
    const container = document.getElementById('questions-list');
    container.innerHTML = '';
    questions.forEach(q => {
      const item = document.createElement('div');
      item.className = 'question-row' + (q.isComplement ? ' complement-hint' : '');

      const op1S = q.op1 === '+' ? '＋' : 'ー';
      const op2S = q.op2 === '+' ? '＋' : 'ー';
      const inp  = `<input type="number" pattern="[0-9]*" inputmode="numeric"
                      id="inp-ans-${q.id}" value="${q.userAnswer}"
                      oninput="saveAnswer(${q.id}, this.value)"
                      onkeydown="handleKeyNext(${q.id}, event)"
                      placeholder="？" class="ans-input">`;

      let formulaHtml;
      if      (q.blankPosition === 1) formulaHtml = `${inp} <span class="op">${op1S}</span> ${q.num2} <span class="op">${op2S}</span> ${q.num3} ＝ ${q.correctAnswer}`;
      else if (q.blankPosition === 2) formulaHtml = `${q.num1} <span class="op">${op1S}</span> ${inp} <span class="op">${op2S}</span> ${q.num3} ＝ ${q.correctAnswer}`;
      else if (q.blankPosition === 3) formulaHtml = `${q.num1} <span class="op">${op1S}</span> ${q.num2} <span class="op">${op2S}</span> ${inp} ＝ ${q.correctAnswer}`;
      else                            formulaHtml = `${q.num1} <span class="op">${op1S}</span> ${q.num2} <span class="op">${op2S}</span> ${q.num3} ＝ ${inp}`;

      const badgeHtml = q.isComplement ? `<span class="complement-badge">💚 きりのいい数</span>` : '';

      item.innerHTML = `
        <div class="formula-text">
          <span class="q-id">${q.id}</span>
          <span>${formulaHtml}</span>
          ${badgeHtml}
        </div>`;
      container.appendChild(item);
    });
    setTimeout(() => { const f = document.getElementById('inp-ans-1'); if (f) f.focus(); }, 300);
  }

  function handleKeyNext(id, event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const next = document.getElementById('inp-ans-' + (id + 1));
      if (next) next.focus(); else finishDrill();
    }
  }
  function saveAnswer(id, val) {
    const q = questions.find(item => item.id === id);
    if (q) q.userAnswer = val.trim();
    updateAnsweredCount();
  }
  function updateAnsweredCount() {
    document.getElementById('answered-count').innerText = questions.filter(q => q.userAnswer.length > 0).length;
  }

  function finishDrill() {
    initAudio();
    let correctCount = 0, unansweredCount = 0;
    questions.forEach(q => {
      if (q.userAnswer.length === 0) unansweredCount++;
      q.isCorrect = (parseInt(q.userAnswer, 10) === q.correctValue);
      if (q.isCorrect) correctCount++;
    });
    if (unansweredCount > 0) {
      if (!confirm('まだ 答えていないもんだいが ' + unansweredCount + 'こ あります。こたえあわせを しますか？')) return;
    }
    showResult(correctCount);
  }

  function showResult(correctCount) {
    const score = correctCount * 20;
    document.getElementById('score-display').innerText = score;
    const badge = document.getElementById('perfect-badge');
    const message = document.getElementById('result-message');
    if (score === 100) {
      badge.classList.remove('hidden');
      message.innerHTML = '🎉 100てんまんてん！すばらしい！ 🥇';
      playFanfareSound();
    } else if (score >= 80) {
      badge.classList.add('hidden');
      message.innerHTML = '✨ すごい！ あともう少しで まんてんだね！ 👍';
      playCorrectSound();
    } else if (score >= 60) {
      badge.classList.add('hidden');
      message.innerHTML = '👌 がんばったね！ つぎは もっとてんすうを あげよう！';
      playCorrectSound();
    } else {
      badge.classList.add('hidden');
      message.innerHTML = '💪 よくがんばった！ 何度もれんしゅうして つよくなるぞ！ 🚀';
      playIncorrectSound();
    }

    const reviewContainer = document.getElementById('review-list');
    reviewContainer.innerHTML = '';
    questions.forEach(q => {
      const row = document.createElement('div');
      row.className = 'review-item ' + (q.isCorrect ? 'correct' : 'incorrect');
      const op1S = q.op1 === '+' ? '＋' : 'ー';
      const op2S = q.op2 === '+' ? '＋' : 'ー';
      const userStr = q.userAnswer === '' ? '（なし）' : q.userAnswer;

      let formulaStr;
      if      (q.blankPosition === 1) formulaStr = `[ ${q.num1} ] ${op1S} ${q.num2} ${op2S} ${q.num3} ＝ ${q.correctAnswer}`;
      else if (q.blankPosition === 2) formulaStr = `${q.num1} ${op1S} [ ${q.num2} ] ${op2S} ${q.num3} ＝ ${q.correctAnswer}`;
      else if (q.blankPosition === 3) formulaStr = `${q.num1} ${op1S} ${q.num2} ${op2S} [ ${q.num3} ] ＝ ${q.correctAnswer}`;
      else                            formulaStr = `${q.num1} ${op1S} ${q.num2} ${op2S} ${q.num3} ＝ [ ${q.correctAnswer} ]`;

      // きりのいい数の問題には振り返りヒントを表示
      const hintHtml = q.isComplement
        ? `<span class="review-hint">${q.hintText}</span>` : '';

      row.innerHTML = `
        <div class="review-formula">
          <span class="review-badge-id">${q.id}</span>
          <span>${formulaStr}</span>
        </div>
        <div class="review-user-ans">
          <span>あなたのこたえ: <strong>${userStr}</strong></span>
          <span>${q.isCorrect ? '⭕ 正解！' : '❌ ほんとうの答え: <strong>' + q.correctValue + '</strong>'}</span>
          ${hintHtml}
        </div>`;
      reviewContainer.appendChild(row);
    });

    document.getElementById('screen-playing').classList.add('hidden');
    document.getElementById('screen-result').classList.remove('hidden');
  }

  function restartDrillSameMode() { startDrill(); }
  function goToStart() {
    document.getElementById('screen-playing').classList.add('hidden');
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-start').classList.remove('hidden');
  }

  // 初期化
  setLevel(currentLevel);
  setPattern(currentPattern);
