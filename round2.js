const tokenBank = document.getElementById('tokenBank');
const answerSlots = document.getElementById('answerSlots');
const checkAnswer = document.getElementById('checkAnswer');
const undoToken = document.getElementById('undoToken');
const resetRound2 = document.getElementById('resetRound2');
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

const tokens = GAME_CATALOG.map((game) => game.token).filter(Boolean);
const selectedTokens = [];

function shuffle(items) {
  return [...items].sort((a, b) => a.localeCompare(b, 'vi'));
}

function renderSlots() {
  answerSlots.innerHTML = Array.from({ length: ROUND_TWO.tokenCount }, (_, index) => {
    const token = selectedTokens[index] || '';
    return `<button class="answer-slot${token ? ' is-filled' : ''}" type="button" data-index="${index}">${token || index + 1}</button>`;
  }).join('');
}

function renderBank() {
  tokenBank.innerHTML = shuffle(tokens).map((token) => {
    const usedCount = selectedTokens.filter((item) => item === token).length;
    const totalCount = tokens.filter((item) => item === token).length;
    const disabled = usedCount >= totalCount;

    return `<button class="token-chip" type="button" data-token="${token}" ${disabled ? 'disabled' : ''}>${token}</button>`;
  }).join('');
}

function render() {
  renderSlots();
  renderBank();
}

function normalizeAnswer(items) {
  return items.join(' ').normalize('NFC').toUpperCase();
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

tokenBank.addEventListener('click', (event) => {
  const button = event.target.closest('[data-token]');
  if (!button || selectedTokens.length >= ROUND_TWO.tokenCount) return;

  selectedTokens.push(button.dataset.token);
  round2Message.textContent = '';
  render();
});

answerSlots.addEventListener('click', (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;

  const index = Number(button.dataset.index);
  if (!selectedTokens[index]) return;

  selectedTokens.splice(index, 1);
  round2Message.textContent = '';
  render();
});

undoToken.addEventListener('click', () => {
  selectedTokens.pop();
  round2Message.textContent = '';
  render();
});

resetRound2.addEventListener('click', () => {
  selectedTokens.length = 0;
  round2Message.textContent = '';
  render();
});

checkAnswer.addEventListener('click', async () => {
  if (selectedTokens.length < ROUND_TWO.tokenCount) {
    round2Message.textContent = 'Chưa đủ 9 mảnh chữ.';
    round2Message.className = 'round2-message is-warning';
    return;
  }

  const answerHash = await sha256(normalizeAnswer(selectedTokens));
  if (answerHash === ROUND_TWO.answerHash) {
    round2Message.textContent = `Chính xác: “${selectedTokens.join(' ')}”.`;
    round2Message.className = 'round2-message is-success';
    return;
  }

  round2Message.textContent = 'Chưa đúng, hãy thử sắp xếp lại các mảnh chữ.';
  round2Message.className = 'round2-message is-warning';
});

render();
