// ── CONFIG ──────────────────────────────────────────────────────────────────
const QR_SIZE_RATIO = 0.05;    // QR size as fraction of image width
const ID_FONT_RATIO = 0.016;   // Font size as fraction of image width
const QR_ID_GAP = 6;           // px gap between QR and ID text (on canvas)

// ── STATE ────────────────────────────────────────────────────────────────────
let currentUID = '';
let uploadedImage = null;

// Position and scale of the stamp
let stampPosX = 0.02;   // fraction from left
let stampPosY = 0.82;   // fraction from top
let stampScale = 1.0;   // scale multiplier
let stampOpacity = 1.0; // transparency multiplier

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

  // Reset stamp to default
  stampPosX = 0.02;
  stampPosY = 0.82;
  stampScale = 1.0;
  stampOpacity = 1.0;
  document.getElementById('size-slider').value = 1.0;
  document.getElementById('opacity-slider').value = 1.0;
  document.getElementById('stamp-handle').style.transform = `scale(1.0)`;
  document.getElementById('stamp-handle').style.opacity = `1.0`;

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
  const sizeSlider = document.getElementById('size-slider');
  const opacitySlider = document.getElementById('opacity-slider');

  // ── Stamp scaling & opacity ───────────────────────────────────────────────────
  sizeSlider.addEventListener('input', (e) => {
    stampScale = parseFloat(e.target.value);
    // Apply visual scale to the handle via transform
    handle.style.transform = `scale(${stampScale})`;
    handle.style.transformOrigin = 'top left';
  });

  opacitySlider.addEventListener('input', (e) => {
    stampOpacity = parseFloat(e.target.value);
    handle.style.opacity = stampOpacity;
  });

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
async function fetchNextID(type) {
  const res = await fetch(`/api/next-id?type=${type}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch next ID');
  }
  return data.id;
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

  // 2. Calculate stamp position and size from the saved fractions
  const qrSize = Math.round(W * QR_SIZE_RATIO * stampScale);
  const fontSize = Math.round(W * ID_FONT_RATIO * stampScale);
  const gap = Math.round(W * 0.008 * stampScale);       // proportional gap
  const padding = Math.round(qrSize * 0.08);             // padding around QR

  const x = Math.round(stampPosX * W);
  const y = Math.round(stampPosY * H);

  ctx.globalAlpha = stampOpacity;

  // 3. QR code with white background
  const verifyURL = `${window.location.origin}/verify.html?id=${uid}`;
  const qrImg = await generateQRImage(verifyURL, 256);
  if (qrImg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - padding, y - padding, qrSize + padding * 2, qrSize + padding * 2);
    ctx.drawImage(qrImg, x, y, qrSize, qrSize);
  }

  // 4. ID text to the right of QR, vertically centered
  ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
  const textX = x + qrSize + padding + gap;
  const textY = y + qrSize / 2;
  const textStr = `ID: ${uid}`;
  const textMetrics = ctx.measureText(textStr);
  const textPadH = Math.round(fontSize * 0.4);
  const textPadV = Math.round(fontSize * 0.35);

  // White background behind text
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(
    textX - textPadH,
    textY - fontSize / 2 - textPadV,
    textMetrics.width + textPadH * 2,
    fontSize + textPadV * 2
  );

  ctx.fillStyle = '#00361A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(textStr, textX, textY);
  
  ctx.globalAlpha = 1.0;
}

// ── MAIN ACTIONS ─────────────────────────────────────────────────────────────
async function generateCertificate() {
  if (!uploadedImage) {
    alert('Please upload a certificate image first.');
    return;
  }

  const nameInput = document.getElementById('inp-name').value.trim();
  const positionInput = document.getElementById('inp-position').value.trim();
  const typeInput = document.getElementById('inp-type').value;

  try {
    currentUID = await fetchNextID(typeInput);
  } catch (err) {
    console.error(err);
    alert('Error fetching certificate ID. Details: ' + err.message);
    return;
  }

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
      body: JSON.stringify({ 
        id: currentUID, 
        timestamp,
        name: nameInput,
        position: positionInput
      })
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
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-position').value = '';
  clearFile();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
