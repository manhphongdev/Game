/**
 * ============================================================
 *  GHÉP HÌNH KÉO THẢ — JavaScript thuần
 * ============================================================
 *  Để thêm/bớt mảnh: sửa mảng PUZZLE_PIECES bên dưới.
 * ============================================================
 */

const REFERENCE_IMAGE = 'caudo1_0005_khoa.png';

const PUZZLE_PIECES = [
  { id: 'piece-0', src: 'caudo1_0000_5.png' },
  { id: 'piece-1', src: 'caudo1_0001_4.png' },
  { id: 'piece-2', src: 'caudo1_0002_3.png' },
  { id: 'piece-3', src: 'caudo1_0003_2.png' },
  { id: 'piece-4', src: 'caudo1_0004_1.png' },
  { id: 'piece-5', src: 'caudo1_0005_khoa.png' },
];

const HINT_DURATION = 3500;

/* Tỷ lệ thu nhỏ mảnh khi nằm ở khay hai bên */
const TRAY_SCALE = 0.2;

/* Vùng bắt đầu/đuôi mảnh để xoay (tỷ lệ chiều cao) */
const HEAD_ZONE = 0.28;
const TAIL_ZONE = 0.28;

const loadingScreen = document.getElementById('loadingScreen');
const gameWrapper = document.getElementById('gameWrapper');
const puzzleBoard = document.getElementById('puzzleBoard');
const dragLayer = document.getElementById('dragLayer');
const trayLeft = document.getElementById('trayLeft');
const trayRight = document.getElementById('trayRight');
const hintImage = document.getElementById('hintImage');
const timerValue = document.getElementById('timerValue');
const toast = document.getElementById('toast');
const btnRestart = document.getElementById('btnRestart');
const btnHint = document.getElementById('btnHint');

let boardWidth = 0;
let boardHeight = 0;
let scale = 1;
let pieceElements = [];
let topZIndex = 100;
let timerInterval = null;
let elapsedSeconds = 0;
let hintTimeout = null;
let toastTimeout = null;
let activeDrag = null;

async function initGame() {
  try {
    const refImg = await loadImage(REFERENCE_IMAGE);
    const pieceImages = await Promise.all(
      PUZZLE_PIECES.map((p) => loadImage(p.src).then((img) => ({ ...p, img })))
    );

    showGame();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    setupBoard(refImg);
    createPieces(pieceImages);
    scatterPiecesRandomly();
    startTimer();
  } catch (err) {
    console.error(err);
    loadingScreen.querySelector('.loading-text').textContent =
      'Không thể tải ảnh. Hãy kiểm tra các file PNG cùng thư mục với index.html.';
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được: ${src}`));
    img.src = src;
  });
}

/** Khung ghép giữa — cao tối đa, hai bên tràn ra full width */
function setupBoard(refImg) {
  boardWidth = refImg.naturalWidth;
  boardHeight = refImg.naturalHeight;

  const arenaRect = document.getElementById('playSurface').getBoundingClientRect();
  const maxH = Math.max(220, arenaRect.height - 16);
  const maxCenterW = Math.min(window.innerWidth * 0.46, 720);

  scale = Math.min(maxH / boardHeight, maxCenterW / boardWidth, 1);

  const displayW = Math.round(boardWidth * scale);
  const displayH = Math.round(boardHeight * scale);

  puzzleBoard.style.width = `${displayW}px`;
  puzzleBoard.style.height = `${displayH}px`;
}

function createPieces(pieceImages) {
  dragLayer.innerHTML = '';
  pieceElements = [];

  pieceImages.forEach(({ id, src, img }, index) => {
    const fullW = img.naturalWidth * scale;
    const fullH = img.naturalHeight * scale;

    const piece = document.createElement('div');
    piece.className = 'puzzle-piece puzzle-piece--compact';
    piece.dataset.id = id;
    piece.dataset.fullW = String(fullW);
    piece.dataset.fullH = String(fullH);
    piece.dataset.angle = '0';
    piece.style.width = `${fullW * TRAY_SCALE}px`;
    piece.style.height = `${fullH * TRAY_SCALE}px`;
    piece.style.zIndex = String(10 + index);

    const imgEl = document.createElement('img');
    imgEl.src = src;
    imgEl.alt = `Mảnh ghép ${index + 1}`;
    imgEl.draggable = false;
    piece.appendChild(imgEl);

    bindDragEvents(piece);
    dragLayer.appendChild(piece);
    applyPieceTransform(piece);
    pieceElements.push(piece);
  });
}

/** Thu nhỏ mảnh về kích thước khay */
function setPieceCompact(piece) {
  const fullW = parseFloat(piece.dataset.fullW);
  const fullH = parseFloat(piece.dataset.fullH);
  piece.classList.add('puzzle-piece--compact');
  piece.style.width = `${fullW * TRAY_SCALE}px`;
  piece.style.height = `${fullH * TRAY_SCALE}px`;
  applyPieceTransform(piece);
}

/** Áp dụng góc xoay hiện tại lên mảnh */
function applyPieceTransform(piece, origin = 'center center', dragScale = 1) {
  const angle = parseFloat(piece.dataset.angle || '0');
  piece.style.transformOrigin = origin;
  const scalePart = dragScale !== 1 ? ` scale(${dragScale})` : '';
  piece.style.transform = `rotate(${angle}deg)${scalePart}`;
}

/** Xác định vùng bấm: đầu / đuôi / giữa */
function getGrabZone(piece, clientY) {
  const rect = piece.getBoundingClientRect();
  const relY = (clientY - rect.top) / rect.height;
  if (relY <= HEAD_ZONE) return 'head';
  if (relY >= 1 - TAIL_ZONE) return 'tail';
  return 'center';
}

/** Tâm xoay: kéo đầu → xoay quanh đuôi, kéo đuôi → xoay quanh đầu */
function getRotatePivot(piece, zone) {
  const left = parseFloat(piece.style.left) || 0;
  const top = parseFloat(piece.style.top) || 0;
  const w = piece.offsetWidth;
  const h = piece.offsetHeight;

  if (zone === 'head') {
    return { x: left + w / 2, y: top + h, origin: '50% 100%' };
  }
  return { x: left + w / 2, y: top, origin: '50% 0%' };
}

function pointerAngleDeg(clientX, clientY, pivot) {
  const layerRect = dragLayer.getBoundingClientRect();
  const px = clientX - layerRect.left - pivot.x;
  const py = clientY - layerRect.top - pivot.y;
  return (Math.atan2(py, px) * 180) / Math.PI;
}

/** Phóng to mảnh khi bắt đầu kéo — giữ vị trí con trỏ trên mảnh */
function expandPieceFromCompact(piece, clientX, clientY) {
  if (!piece.classList.contains('puzzle-piece--compact')) {
    return null;
  }

  const layerRect = dragLayer.getBoundingClientRect();
  const rect = piece.getBoundingClientRect();
  const ratioX = (clientX - rect.left) / rect.width;
  const ratioY = (clientY - rect.top) / rect.height;

  const compactW = rect.width;
  const compactH = rect.height;
  const fullW = parseFloat(piece.dataset.fullW);
  const fullH = parseFloat(piece.dataset.fullH);

  const left = parseFloat(piece.style.left) || 0;
  const top = parseFloat(piece.style.top) || 0;

  const newLeft = left - (fullW - compactW) * ratioX;
  const newTop = top - (fullH - compactH) * ratioY;

  piece.classList.remove('puzzle-piece--compact');
  piece.style.width = `${fullW}px`;
  piece.style.height = `${fullH}px`;
  piece.style.left = `${newLeft}px`;
  piece.style.top = `${newTop}px`;
  applyPieceTransform(piece);

  return {
    offsetX: clientX - (layerRect.left + newLeft),
    offsetY: clientY - (layerRect.top + newTop),
  };
}

/** Xếp mảnh gọn gàng vào khay trái / phải */
function scatterPiecesRandomly() {
  const mid = Math.ceil(pieceElements.length / 2);
  layoutTray(pieceElements.slice(0, mid), trayLeft);
  layoutTray(pieceElements.slice(mid), trayRight);
}

/** Chia đều mảnh vào khay — 6 mảnh thì 3 trái, 3 phải */
function layoutTray(pieces, trayEl) {
  if (pieces.length === 0) return;

  pieces.forEach((piece) => {
    piece.dataset.angle = '0';
    setPieceCompact(piece);
  });

  const layerRect = dragLayer.getBoundingClientRect();
  const trayRect = trayEl.getBoundingClientRect();
  const trayTop = trayRect.top - layerRect.top;
  const trayLeftPos = trayRect.left - layerRect.left;
  const trayW = trayRect.width;
  const trayH = trayRect.height;

  const gap = 6;
  const cols = window.innerWidth <= 640
    ? Math.min(3, pieces.length)
    : Math.min(2, pieces.length);
  const rows = Math.ceil(pieces.length / cols);

  const pieceW = pieces[0].offsetWidth;
  const pieceH = pieces[0].offsetHeight;
  const gridW = cols * pieceW + (cols - 1) * gap;
  const gridH = rows * pieceH + (rows - 1) * gap;

  const startX = trayLeftPos + Math.max(gap, (trayW - gridW) / 2);
  const startY = trayTop + Math.max(gap, (trayH - gridH) / 2);

  pieces.forEach((piece, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    piece.style.left = `${startX + col * (pieceW + gap)}px`;
    piece.style.top = `${startY + row * (pieceH + gap)}px`;
  });
}

function bindDragEvents(piece) {
  piece.addEventListener('pointerdown', onPointerDown);
  piece.addEventListener('pointermove', onPointerHover);
  piece.addEventListener('pointerleave', () => {
    piece.classList.remove('puzzle-piece--rotate-cursor');
  });
}

/** Đổi con trỏ khi rê chuột gần đầu / đuôi mảnh */
function onPointerHover(e) {
  if (activeDrag) return;
  const piece = e.currentTarget;
  const zone = getGrabZone(piece, e.clientY);
  if (zone === 'head' || zone === 'tail') {
    piece.classList.add('puzzle-piece--rotate-cursor');
  } else {
    piece.classList.remove('puzzle-piece--rotate-cursor');
  }
}

function onPointerDown(e) {
  e.preventDefault();

  const piece = e.currentTarget;
  topZIndex += 1;
  piece.style.zIndex = String(topZIndex);
  piece.classList.add('puzzle-piece--dragging');
  piece.setPointerCapture(e.pointerId);

  expandPieceFromCompact(piece, e.clientX, e.clientY);

  const zone = getGrabZone(piece, e.clientY);
  const rect = piece.getBoundingClientRect();
  const layerRect = dragLayer.getBoundingClientRect();

  if (zone === 'head' || zone === 'tail') {
    const pivot = getRotatePivot(piece, zone);
    const startAngle = parseFloat(piece.dataset.angle || '0');
    const startPointerAngle = pointerAngleDeg(e.clientX, e.clientY, pivot);

    activeDrag = {
      piece,
      pointerId: e.pointerId,
      mode: 'rotate',
      pivot,
      startAngle,
      startPointerAngle,
    };

    applyPieceTransform(piece, pivot.origin, 1.03);
  } else {
    activeDrag = {
      piece,
      pointerId: e.pointerId,
      mode: 'move',
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    applyPieceTransform(piece, 'center center', 1.03);
  }

  piece.addEventListener('pointermove', onPointerDrag);
  piece.addEventListener('pointerup', onPointerUp);
  piece.addEventListener('pointercancel', onPointerUp);
}

function onPointerDrag(e) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
  e.preventDefault();

  const { piece, mode } = activeDrag;

  if (mode === 'rotate') {
    const { pivot, startAngle, startPointerAngle } = activeDrag;
    const ptrAngle = pointerAngleDeg(e.clientX, e.clientY, pivot);
    piece.dataset.angle = String(startAngle + (ptrAngle - startPointerAngle));
    applyPieceTransform(piece, pivot.origin, 1.03);
    return;
  }

  const { offsetX, offsetY } = activeDrag;
  const layerRect = dragLayer.getBoundingClientRect();

  let x = e.clientX - layerRect.left - offsetX;
  let y = e.clientY - layerRect.top - offsetY;

  const maxX = layerRect.width - piece.offsetWidth;
  const maxY = layerRect.height - piece.offsetHeight;
  x = Math.max(0, Math.min(x, maxX));
  y = Math.max(0, Math.min(y, maxY));

  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
  applyPieceTransform(piece, 'center center', 1.03);
}

function onPointerUp(e) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;

  const { piece, pointerId } = activeDrag;
  piece.classList.remove('puzzle-piece--dragging', 'puzzle-piece--rotate-cursor');
  applyPieceTransform(piece, 'center center');
  piece.releasePointerCapture(pointerId);
  piece.removeEventListener('pointermove', onPointerDrag);
  piece.removeEventListener('pointerup', onPointerUp);
  piece.removeEventListener('pointercancel', onPointerUp);
  activeDrag = null;
}

function showHint() {
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintImage.classList.remove('hint-image--visible');
  }

  hintImage.classList.add('hint-image--visible');
  showToast('Gợi ý đang hiển thị — hãy quan sát hình mờ phía sau!', 'success');

  hintTimeout = setTimeout(() => {
    hintImage.classList.remove('hint-image--visible');
    hintTimeout = null;
  }, HINT_DURATION);
}

function startTimer() {
  elapsedSeconds = 0;
  updateTimerDisplay();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateTimerDisplay();
  }, 1000);
}

function resetTimer() {
  startTimer();
}

function updateTimerDisplay() {
  timerValue.textContent = formatTime(elapsedSeconds);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function restartGame() {
  topZIndex = 100;

  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }
  hintImage.classList.remove('hint-image--visible');

  pieceElements.forEach((piece, i) => {
    piece.style.zIndex = String(10 + i);
    piece.dataset.angle = '0';
    piece.classList.remove('puzzle-piece--dragging', 'puzzle-piece--rotate-cursor');
    applyPieceTransform(piece);
  });

  requestAnimationFrame(() => scatterPiecesRandomly());
  resetTimer();
  hideToast();
}

function showGame() {
  loadingScreen.classList.add('hidden');
  gameWrapper.classList.remove('hidden');
}

function showToast(message, type = 'warning') {
  hideToast();
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  toast.classList.remove('hidden');
  toastTimeout = setTimeout(hideToast, 3200);
}

function hideToast() {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  toast.classList.add('hidden');
}

btnRestart.addEventListener('click', restartGame);
btnHint.addEventListener('click', showHint);

initGame();
