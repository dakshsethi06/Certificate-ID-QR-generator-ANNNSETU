// ── CONFIG ──────────────────────────────────────────────────────────────────
const QR_SIZE_RATIO = 0.05;    // QR size as fraction of image width
const ID_FONT_RATIO = 0.016;   // Font size as fraction of image width
const QR_ID_GAP = 6;           // px gap between QR and ID text (on canvas)

// ── STATE ────────────────────────────────────────────────────────────────────
let currentUID = '';
let uploadedImage = null;

// Position of the stamp (as fraction of image, 0–1). Default: bottom-left.
let stampPosX = 0.02;   // fraction from left
let stampPosY = 0.82;   // fraction from top

// ── FILE HANDLING ────────────────────────────────────────────────────────────
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  loadImageFile(file);
}

function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      showPositionEditor(e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showPositionEditor(src) {
  document.getElementById('editor-img').src = src;
  document.getElementById('position-editor').classList.remove('hidden');
  document.getElementById('drop-zone').classList.add('hidden');

  // Reset stamp to default bottom-left
  stampPosX = 0.02;
  stampPosY = 0.82;

  // Wait for image to render, then position the stamp handle
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateStampPosition();
    });
  });
}

function clearFile() {
  uploadedImage = null;
  document.getElementById('inp-file').value = '';
  document.getElementById('position-editor').classList.add('hidden');
  document.getElementById('drop-zone').classList.remove('hidden');
}

// ── DRAG LOGIC ───────────────────────────────────────────────────────────────
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function updateStampPosition() {
  const container = document.getElementById('editor-container');
  const handle = document.getElementById('stamp-handle');
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  handle.style.left = (stampPosX * cw) + 'px';
  handle.style.top = (stampPosY * ch) + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  const handle = document.getElementById('stamp-handle');
  const container = document.getElementById('editor-container');
  const dropZone = document.getElementById('drop-zone');

  // ── Stamp dragging ──────────────────────────────────────────────────
  handle.addEventListener('mousedown', startDrag);
  handle.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    const rect = handle.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;
    handle.classList.add('dragging');
  }

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });

  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const containerRect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let x = clientX - containerRect.left - dragOffsetX;
    let y = clientY - containerRect.top - dragOffsetY;

    // Clamp within container
    const hw = handle.offsetWidth;
    const hh = handle.offsetHeight;
    x = Math.max(0, Math.min(x, containerRect.width - hw));
    y = Math.max(0, Math.min(y, containerRect.height - hh));

    stampPosX = x / containerRect.width;
    stampPosY = y / containerRect.height;

    handle.style.left = x + 'px';
    handle.style.top = y + 'px';
  }

  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    handle.classList.remove('dragging');
  }

  // ── File drop zone ──────────────────────────────────────────────────
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('inp-file').files = dt.files;
      loadImageFile(file);
    }
  });

  // Keep stamp in place on resize
  window.addEventListener('resize', () => {
    if (uploadedImage) updateStampPosition();
  });
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function generateUID() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PAN-${ts}-${rand}`;
}

function generateQRImage(text, size) {
  return new Promise((resolve) => {
    const tmp = document.getElementById('qr-tmp');
    tmp.innerHTML = '';
    new QRCode(tmp, {
      text: text,
      width: size,
      height: size,
      colorDark: '#1a2642',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    setTimeout(() => {
      const el = tmp.querySelector('canvas') || tmp.querySelector('img');
      if (!el) { resolve(null); return; }
      if (el.tagName === 'CANVAS') {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = el.toDataURL();
      } else {
        if (el.complete) { resolve(el); }
        else { el.onload = () => resolve(el); }
      }
    }, 100);
  });
}

// ── RENDER ───────────────────────────────────────────────────────────────────
async function renderCertificate(uid) {
  const canvas = document.getElementById('certCanvas');
  const ctx = canvas.getContext('2d');

  const W = uploadedImage.naturalWidth;
  const H = uploadedImage.naturalHeight;

  canvas.width = W;
  canvas.height = H;

  // 1. Draw the uploaded image
  ctx.drawImage(uploadedImage, 0, 0, W, H);

  // 2. Calculate stamp position from the saved fractions
  const qrSize = Math.round(W * QR_SIZE_RATIO);
  const fontSize = Math.round(W * ID_FONT_RATIO);

  const x = Math.round(stampPosX * W);
  const y = Math.round(stampPosY * H);

  // 3. QR code
  const verifyURL = `${window.location.origin}/verify.html?id=${uid}`;
  const qrImg = await generateQRImage(verifyURL, 256);
  if (qrImg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 4, y - 4, qrSize + 8, qrSize + 8);
    ctx.drawImage(qrImg, x, y, qrSize, qrSize);
  }

  // 4. ID text to the right of QR
  ctx.font = `bold ${fontSize}px 'Lato', sans-serif`;
  ctx.fillStyle = '#1a2642';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ID: ${uid}`, x + qrSize + QR_ID_GAP, y + qrSize / 2);
}

// ── MAIN ACTIONS ─────────────────────────────────────────────────────────────
async function generateCertificate() {
  if (!uploadedImage) {
    alert('Please upload a certificate image first.');
    return;
  }

  currentUID = generateUID();
  const timestamp = new Date().toISOString();
  document.getElementById('out-certid').textContent = currentUID;

  document.getElementById('btn-section').style.display = 'none';
  const certSection = document.getElementById('cert-section');
  certSection.classList.remove('hidden');

  try {
    await renderCertificate(currentUID);

    await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentUID, timestamp })
    });
  } catch (err) {
    console.error(err);
    alert('Error generating certificate. Please try again.');
  }

  certSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function downloadPNG() {
  const canvas = document.getElementById('certCanvas');
  const link = document.createElement('a');
  link.download = `Certificate_${currentUID}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function resetForm() {
  document.getElementById('cert-section').classList.add('hidden');
  const bs = document.getElementById('btn-section');
  bs.style.display = '';
  clearFile();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
