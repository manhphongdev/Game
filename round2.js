const codeControls = document.getElementById('codeControls');
const revealedCodes = document.getElementById('revealedCodes');
const letterBank = document.getElementById('letterBank');
const letterAnswer = document.getElementById('letterAnswer');
const checkAnswer = document.getElementById('checkAnswer');
const undoToken = document.getElementById('undoToken');
const resetRound2 = document.getElementById('resetRound2');
const showAnswer = document.getElementById('showAnswer');
const round2Message = document.getElementById('round2Message');

if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  document.body.innerHTML = `
    <main class="round2-shell">
      <section class="launch-panel">
        <p class="eyebrow">Local only</p>
        <h1>Round 2 chỉ chạy trên localhost</h1>
        <p>Hãy mở trang này bằng server local để sử dụng phần giải mã.</p>
        <div class="launch-actions">
          <a class="btn btn--secondary" href="/">Về dashboard</a>
        </div>
      </section>
    </main>
  `;
  throw new Error('Round 2 is localhost-only.');
}

const codes = ROUND_TWO.codes || GAME_CATALOG.map((game) => game.token).filter(Boolean);
const answerLetters = ROUND_TWO.answer.replace(/\s+/g, '').split('');
const revealedIndexes = new Set();
const availableLetters = [];
const placedLetters = Array(answerLetters.length).fill(null);
const placementHistory = [];
let selectedSlotIndex = null;

function renderCodeControls() {
  codeControls.innerHTML = codes.map((code, index) => `
    <button class="code-reveal" type="button" data-index="${index}" ${revealedIndexes.has(index) ? 'disabled' : ''}>
      R${index + 1}
    </button>
  `).join('');
}

function renderRevealedCodes() {
  revealedCodes.innerHTML = codes.map((code, index) => (
    revealedIndexes.has(index)
      ? `<span class="revealed-code">R${index + 1}: ${code}</span>`
      : `<span class="revealed-code revealed-code--locked">R${index + 1}: ???</span>`
  )).join('');
}

function renderLetterAnswer() {
  let letterIndex = 0;

  letterAnswer.innerHTML = ROUND_TWO.wordPattern.map((length) => {
    const cells = Array.from({ length }, () => {
      const value = placedLetters[letterIndex] || '';
      const classes = [
        'letter-slot',
        value ? 'is-filled' : '',
        selectedSlotIndex === letterIndex ? 'is-selected' : '',
      ].filter(Boolean).join(' ');
      const cell = `<button class="${classes}" type="button" data-index="${letterIndex}">${value || ''}</button>`;
      letterIndex += 1;
      return cell;
    }).join('');

    return `<div class="letter-word">${cells}</div>`;
  }).join('');
}

function renderLetterBank() {
  letterBank.innerHTML = availableLetters.map((item) => `
    <button class="letter-chip" type="button" data-id="${item.id}" ${item.used ? 'disabled' : ''}>${item.letter}</button>
  `).join('');
}

function render() {
  renderCodeControls();
  renderRevealedCodes();
  renderLetterAnswer();
  renderLetterBank();
}

function revealCode(index) {
  if (revealedIndexes.has(index)) return;

  revealedIndexes.add(index);
  codes[index].split('').forEach((letter, letterIndex) => {
    availableLetters.push({
      id: `${index}-${letterIndex}`,
      letter,
      used: false,
    });
  });

  round2Message.textContent = `Đã mở mã R${index + 1}: ${codes[index]}.`;
  round2Message.className = 'round2-message is-success';
  render();
}

function placeLetter(letterId) {
  const item = availableLetters.find((letter) => letter.id === letterId);
  if (!item || item.used) return;

  const nextIndex = selectedSlotIndex !== null && placedLetters[selectedSlotIndex] === null
    ? selectedSlotIndex
    : placedLetters.findIndex((letter) => letter === null);
  if (nextIndex === -1) {
    round2Message.textContent = 'Câu nói đã đủ 28 ký tự. Hãy kiểm tra hoặc xóa bớt ký tự.';
    round2Message.className = 'round2-message is-warning';
    return;
  }

  item.used = true;
  placedLetters[nextIndex] = item.letter;
  placementHistory.push({ letterId, slotIndex: nextIndex });
  selectedSlotIndex = getNextEmptySlot(nextIndex + 1);
  round2Message.textContent = '';
  render();
}

function getNextEmptySlot(startIndex = 0) {
  const nextFromStart = placedLetters.findIndex((letter, index) => index >= startIndex && letter === null);
  if (nextFromStart !== -1) return nextFromStart;

  const nextFromBeginning = placedLetters.findIndex((letter) => letter === null);
  return nextFromBeginning === -1 ? null : nextFromBeginning;
}

function removePlacement(slotIndex) {
  if (!placedLetters[slotIndex]) return;

  const historyIndex = placementHistory.findIndex((item) => item.slotIndex === slotIndex);
  if (historyIndex === -1) return;

  const [placement] = placementHistory.splice(historyIndex, 1);
  const letter = availableLetters.find((item) => item.id === placement.letterId);
  if (letter) letter.used = false;
  placedLetters[slotIndex] = null;
  selectedSlotIndex = slotIndex;
  round2Message.textContent = '';
  render();
}

function undoLastLetter() {
  const placement = placementHistory.pop();
  if (!placement) return;

  const letter = availableLetters.find((item) => item.id === placement.letterId);
  if (letter) letter.used = false;
  placedLetters[placement.slotIndex] = null;
  selectedSlotIndex = placement.slotIndex;
  round2Message.textContent = '';
  render();
}

function resetRound() {
  revealedIndexes.clear();
  availableLetters.length = 0;
  placedLetters.fill(null);
  placementHistory.length = 0;
  selectedSlotIndex = null;
  round2Message.textContent = '';
  render();
}

function revealFullAnswer() {
  const answer = ROUND_TWO.answer.replace(/\s+/g, '').toUpperCase().split('');

  revealedIndexes.clear();
  codes.forEach((_, index) => revealedIndexes.add(index));
  availableLetters.length = 0;
  codes.forEach((code, codeIndex) => {
    code.split('').forEach((letter, letterIndex) => {
      availableLetters.push({
        id: `${codeIndex}-${letterIndex}`,
        letter,
        used: false,
      });
    });
  });

  placedLetters.fill(null);
  placementHistory.length = 0;

  answer.forEach((letter, slotIndex) => {
    const item = availableLetters.find((candidate) => !candidate.used && candidate.letter === letter);
    if (!item) return;

    item.used = true;
    placedLetters[slotIndex] = letter;
    placementHistory.push({ letterId: item.id, slotIndex });
  });

  selectedSlotIndex = null;
  round2Message.textContent = `Đáp án: “${ROUND_TWO.displayAnswer}”`;
  round2Message.className = 'round2-message is-success';
  render();
}

function selectSlot(slotIndex) {
  selectedSlotIndex = slotIndex;
  round2Message.textContent = placedLetters[slotIndex]
    ? 'Ô này đã có ký tự. Bấm lại để trả ký tự về kho hoặc chọn ô trống khác.'
    : `Đã chọn ô số ${slotIndex + 1}.`;
  round2Message.className = placedLetters[slotIndex]
    ? 'round2-message is-warning'
    : 'round2-message is-success';
  render();
}

function normalizeAnswer() {
  return placedLetters.join('').toUpperCase();
}

codeControls.addEventListener('click', (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  revealCode(Number(button.dataset.index));
});

letterBank.addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  placeLetter(button.dataset.id);
});

letterAnswer.addEventListener('click', (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  const slotIndex = Number(button.dataset.index);
  if (placedLetters[slotIndex]) {
    removePlacement(slotIndex);
    return;
  }

  selectSlot(slotIndex);
});

undoToken.addEventListener('click', undoLastLetter);
resetRound2.addEventListener('click', resetRound);
showAnswer.addEventListener('click', revealFullAnswer);

checkAnswer.addEventListener('click', () => {
  if (placedLetters.some((letter) => letter === null)) {
    round2Message.textContent = 'Chưa đủ 28 ký tự.';
    round2Message.className = 'round2-message is-warning';
    return;
  }

  if (normalizeAnswer() === ROUND_TWO.answer.replace(/\s+/g, '').toUpperCase()) {
    round2Message.textContent = `Chính xác: “${ROUND_TWO.displayAnswer}”`;
    round2Message.className = 'round2-message is-success';
    return;
  }

  round2Message.textContent = 'Mật thư chưa đúng, hãy kiểm tra lại thứ tự ký tự.';
  round2Message.className = 'round2-message is-warning';
});

render();
