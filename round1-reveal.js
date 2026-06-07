(function () {
  const params = new URLSearchParams(window.location.search);
  const cleanPath = window.location.pathname.replace(/\/$/, '');
  const gameId = params.get('game');
  const game = Array.isArray(window.GAME_CATALOG)
    ? window.GAME_CATALOG.find((item) => item.id === gameId || item.route === cleanPath)
    : null;

  if (!game?.token) return;

  const dashboardUrl = '/';

  const reveal = document.createElement('div');
  reveal.className = 'round1-reveal';
  reveal.innerHTML = `
    <button class="round1-reveal__button" type="button">Hoàn thành Round 1</button>
    <div class="round1-reveal__panel" hidden>
      <p>Mảnh chữ của thử thách</p>
      <strong>${game.token}</strong>
      <span>Ghi lại mảnh chữ này để dùng ở Round 2.</span>
      <a href="${dashboardUrl}">Về dashboard</a>
    </div>
  `;

  document.body.appendChild(reveal);

  const button = reveal.querySelector('.round1-reveal__button');
  const panel = reveal.querySelector('.round1-reveal__panel');

  window.revealRoundOneToken = function revealRoundOneToken() {
    panel.hidden = false;
    button.hidden = true;
  };

  button.addEventListener('click', window.revealRoundOneToken);
}());
