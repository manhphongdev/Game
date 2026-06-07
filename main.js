const gameGrid = document.getElementById('gameGrid');
const howToPlayToggle = document.getElementById('howToPlayToggle');
const howToPlayModal = document.getElementById('howToPlayModal');
const howToPlayClose = document.getElementById('howToPlayClose');
const round2LocalLink = document.getElementById('round2LocalLink');

function renderGames() {
  gameGrid.innerHTML = GAME_CATALOG.map((game) => {
    const directUrl = game.route || `game.html?game=${encodeURIComponent(game.id)}`;
    const difficultyClass = game.difficulty
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-');

    return `
      <article class="game-card">
        <div class="game-card__topline">
          <strong>${game.points} điểm</strong>
        </div>
        <h3>${game.title}</h3>
        <div class="game-card__meta">
          <span class="difficulty-pill difficulty-pill--${difficultyClass}">${game.difficulty}</span>
        </div>
        <a class="btn btn--primary" href="${directUrl}">Chọn thử thách</a>
      </article>
    `;
  }).join('');
}

renderGames();

if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  round2LocalLink.hidden = true;
}

function openHowToPlay() {
  howToPlayModal.hidden = false;
  document.body.classList.add('modal-open');
  howToPlayClose.focus();
}

function closeHowToPlay() {
  howToPlayModal.hidden = true;
  document.body.classList.remove('modal-open');
  howToPlayToggle.focus();
}

howToPlayToggle.addEventListener('click', openHowToPlay);
howToPlayClose.addEventListener('click', closeHowToPlay);

howToPlayModal.addEventListener('click', (event) => {
  if (event.target === howToPlayModal) {
    closeHowToPlay();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !howToPlayModal.hidden) {
    closeHowToPlay();
  }
});
