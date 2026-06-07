const gameLaunch = document.getElementById('gameLaunch');
const params = new URLSearchParams(window.location.search);
const cleanPath = window.location.pathname.replace(/\/$/, '');
const gameId = params.get('game') || '';

const game = GAME_CATALOG.find((item) => item.id === gameId || item.route === cleanPath);

function renderMissingState() {
  gameLaunch.innerHTML = `
    <section class="launch-panel">
      <p class="eyebrow">Không tìm thấy</p>
      <h1>Thử thách không hợp lệ</h1>
      <p>Hãy quay lại dashboard và chọn lại thử thách.</p>
      <a class="btn btn--primary" href="/">Về dashboard</a>
    </section>
  `;
}

function renderLaunchState() {
  const isReady = game.status === 'ready';
  const launchUrl = game.launchUrl ? `${game.launchUrl}?game=${encodeURIComponent(game.id)}` : '';

  gameLaunch.innerHTML = `
    <section class="launch-panel">
      <p class="eyebrow">Thử thách yêu nước thời đại mới</p>
      <h1>${game.title}</h1>

      <div class="score-strip">
        <div>
          <span>Điểm</span>
          <strong>${game.points}</strong>
        </div>
        <div>
          <span>Độ khó</span>
          <strong>${game.difficulty}</strong>
        </div>
        <div>
          <span>Trạng thái</span>
          <strong>${isReady ? 'Sẵn sàng' : 'Đang cập nhật'}</strong>
        </div>
      </div>

      <div class="launch-actions">
        ${isReady ? `<a class="btn btn--primary" href="${launchUrl}">Bắt đầu thử thách</a>` : '<button class="btn btn--primary" type="button" disabled>Chưa có dữ liệu</button>'}
        <a class="btn btn--secondary" href="/">Về dashboard</a>
      </div>
    </section>
  `;
}

if (!game) {
  renderMissingState();
} else {
  renderLaunchState();
}
