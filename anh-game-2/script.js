/**
 * ============================================================
 *  GHÉP HÌNH 2 — Kéo thả, không xoay
 * ============================================================
 *  Lớp cố định: caudo1_0003_Layer-1.png
 *  Mảnh kéo: sửa mảng PUZZLE_PIECES bên dưới.
 * ============================================================
 */

const ASSET_BASE = 'cau1/';
const FIXED_LAYER = `${ASSET_BASE}caudo1_0003_Layer-1.png`;

const PUZZLE_PIECES = [
  { id: 'piece-0', src: `${ASSET_BASE}caudo1_0000_4.png` },
  { id: 'piece-1', src: `${ASSET_BASE}caudo1_0001_3.png` },
  { id: 'piece-2', src: `${ASSET_BASE}caudo1_0002_2.png` },
];

const TRAY_SCALE = 0.22;

const loadingScreen = document.getElementById('loadingScreen');
const gameWrapper = document.getElementById('gameWrapper');
const puzzleBoard = document.getElementById('puzzleBoard');
const dragLayer = document.getElementById('dragLayer');
const trayLeft = document.getElementById('trayLeft');
const trayRight = document.getElementById('trayRight');
const timerValue = document.getElementById('timerValue');
const toast = document.getElementById('toast');
const btnRestart = document.getElementById('btnRestart');

let boardWidth = 0;
let boardHeight = 0;
let scale = 1;
let pieceElements = [];
let topZIndex = 100;
let timerInterval = null;
let elapsedSeconds = 0;
let toastTimeout = null;
let activeDrag = null;

async function initGame() {
  try {
    const baseImg = await loadImage(FIXED_LAYER);
    const pieceImages = await Promise.all(
      PUZZLE_PIECES.map((p) => loadImage(p.src).then((img) => ({ ...p, img })))
    );

    showGame();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    setupBoard(baseImg);
    createPieces(pieceImages);
    scatterPiecesRandomly();
    startTimer();
  } catch (err) {
    console.error(err);
    loadingScreen.querySelector('.loading-text').textContent =
      'Không thể tải ảnh. Hãy kiểm tra thư mục cau1/.';
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

/** Khung ghép theo kích thước lớp nền cố định */
function setupBoard(baseImg) {
  boardWidth = baseImg.naturalWidth;
  boardHeight = baseImg.naturalHeight;

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
    pieceElements.push(piece);
  });
}

function setPieceCompact(piece) {
  const fullW = parseFloat(piece.dataset.fullW);
  const fullH = parseFloat(piece.dataset.fullH);
  piece.classList.add('puzzle-piece--compact');
  piece.style.width = `${fullW * TRAY_SCALE}px`;
  piece.style.height = `${fullH * TRAY_SCALE}px`;
}

function expandPieceFromCompact(piece, clientX, clientY) {
  if (!piece.classList.contains('puzzle-piece--compact')) return;

  const layerRect = dragLayer.getBoundingClientRect();
  const rect = piece.getBoundingClientRect();
  const ratioX = (clientX - rect.left) / rect.width;
  const ratioY = (clientY - rect.top) / rect.height;

  const fullW = parseFloat(piece.dataset.fullW);
  const fullH = parseFloat(piece.dataset.fullH);
  const left = parseFloat(piece.style.left) || 0;
  const top = parseFloat(piece.style.top) || 0;

  piece.classList.remove('puzzle-piece--compact');
  piece.style.width = `${fullW}px`;
  piece.style.height = `${fullH}px`;
  piece.style.left = `${left - (fullW - rect.width) * ratioX}px`;
  piece.style.top = `${top - (fullH - rect.height) * ratioY}px`;
}

function scatterPiecesRandomly() {
  const mid = Math.ceil(pieceElements.length / 2);
  layoutTray(pieceElements.slice(0, mid), trayLeft);
  layoutTray(pieceElements.slice(mid), trayRight);
}

function layoutTray(pieces, trayEl) {
  if (pieces.length === 0) return;

  pieces.forEach(setPieceCompact);

  const layerRect = dragLayer.getBoundingClientRect();
  const trayRect = trayEl.getBoundingClientRect();
  const trayTop = trayRect.top - layerRect.top;
  const trayLeftPos = trayRect.left - layerRect.left;
  const trayW = trayRect.width;
  const trayH = trayRect.height;

  const gap = 8;
  const cols = Math.min(pieces.length, window.innerWidth <= 640 ? 3 : 2);
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
}

function onPointerDown(e) {
  e.preventDefault();

  const piece = e.currentTarget;
  topZIndex += 1;
  piece.style.zIndex = String(topZIndex);
  piece.classList.add('puzzle-piece--dragging');
  piece.setPointerCapture(e.pointerId);

  expandPieceFromCompact(piece, e.clientX, e.clientY);

  const rect = piece.getBoundingClientRect();
  activeDrag = {
    piece,
    pointerId: e.pointerId,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };

  piece.addEventListener('pointermove', onPointerDrag);
  piece.addEventListener('pointerup', onPointerUp);
  piece.addEventListener('pointercancel', onPointerUp);
}

function onPointerDrag(e) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
  e.preventDefault();

  const { piece, offsetX, offsetY } = activeDrag;
  const layerRect = dragLayer.getBoundingClientRect();

  let x = e.clientX - layerRect.left - offsetX;
  let y = e.clientY - layerRect.top - offsetY;

  const maxX = layerRect.width - piece.offsetWidth;
  const maxY = layerRect.height - piece.offsetHeight;
  x = Math.max(0, Math.min(x, maxX));
  y = Math.max(0, Math.min(y, maxY));

  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
}

function onPointerUp(e) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;

  const { piece, pointerId } = activeDrag;
  piece.classList.remove('puzzle-piece--dragging');
  piece.releasePointerCapture(pointerId);
  piece.removeEventListener('pointermove', onPointerDrag);
  piece.removeEventListener('pointerup', onPointerUp);
  piece.removeEventListener('pointercancel', onPointerUp);
  activeDrag = null;
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
  pieceElements.forEach((piece, i) => {
    piece.style.zIndex = String(10 + i);
    piece.classList.remove('puzzle-piece--dragging');
  });
  requestAnimationFrame(() => scatterPiecesRandomly());
  resetTimer();
  hideToast();
}

function showGame() {
  loadingScreen.classList.add('hidden');
  gameWrapper.classList.remove('hidden');
}

function hideToast() {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  toast.classList.add('hidden');
}

btnRestart.addEventListener('click', restartGame);
initGame();
