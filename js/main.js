// Mobile nav
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
});

// Navbar shadow on scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// Copy Korean name to clipboard
const toast = document.getElementById('copy-toast');
let toastTimeout;

document.querySelectorAll('.korean-name').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.getAttribute('data-korean');
    navigator.clipboard.writeText(text).then(() => {
      toast.style.opacity = '1';
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    });
  });
});

// ── Metro map zoom modal ───────────────────────────────────────────────────
(function () {
  const triggerImg = document.getElementById('metroMapImg');
  const modal      = document.getElementById('metro-modal');
  const canvas     = document.getElementById('metro-canvas');
  const img        = document.getElementById('metro-modal-img');
  const btnClose   = document.getElementById('metro-close');
  const btnZoomIn  = document.getElementById('metro-zoom-in');
  const btnZoomOut = document.getElementById('metro-zoom-out');
  const btnReset   = document.getElementById('metro-zoom-reset');

  if (!triggerImg || !modal) return;

  const MIN = 0.4, MAX = 10;
  let scale = 1, tx = 0, ty = 0;
  let dragging = false, dragX, dragY;
  let pinchDist = null;

  function applyTransform(animate) {
    img.style.transition = animate ? 'transform 0.2s ease' : 'none';
    img.style.transform  = `translate(${tx}px,${ty}px) scale(${scale})`;
  }

  function open() {
    scale = 1; tx = 0; ty = 0;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    applyTransform(false);
  }

  function close() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Open
  triggerImg.addEventListener('click', open);

  // Close
  btnClose.addEventListener('click', close);
  canvas.addEventListener('click', (e) => { if (e.target === canvas) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Zoom buttons
  btnZoomIn .addEventListener('click', () => { scale = Math.min(scale * 1.35, MAX); applyTransform(true); });
  btnZoomOut.addEventListener('click', () => { scale = Math.max(scale / 1.35, MIN); applyTransform(true); });
  btnReset  .addEventListener('click', () => { scale = 1; tx = 0; ty = 0; applyTransform(true); });

  // Scroll-wheel zoom (zoom toward cursor)
  modal.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect   = img.getBoundingClientRect();
    const ox     = e.clientX - (rect.left + rect.width  / 2);
    const oy     = e.clientY - (rect.top  + rect.height / 2);
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const ns     = Math.min(Math.max(scale * factor, MIN), MAX);
    const ratio  = ns / scale;
    tx = tx * ratio + ox * (1 - ratio);
    ty = ty * ratio + oy * (1 - ratio);
    scale = ns;
    applyTransform(false);
  }, { passive: false });

  // Mouse drag
  img.addEventListener('mousedown', (e) => {
    dragging = true; dragX = e.clientX; dragY = e.clientY;
    img.style.cursor = 'grabbing'; e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    tx += e.clientX - dragX; ty += e.clientY - dragY;
    dragX = e.clientX; dragY = e.clientY;
    applyTransform(false);
  });
  window.addEventListener('mouseup', () => { dragging = false; img.style.cursor = 'grab'; });

  // Touch: pinch-zoom + drag
  modal.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else {
      dragging = true; dragX = e.touches[0].clientX; dragY = e.touches[0].clientY;
    }
  }, { passive: true });

  modal.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchDist) {
      const d  = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      scale = Math.min(Math.max(scale * (d / pinchDist), MIN), MAX);
      pinchDist = d;
      applyTransform(false);
    } else if (e.touches.length === 1 && dragging) {
      tx += e.touches[0].clientX - dragX; ty += e.touches[0].clientY - dragY;
      dragX = e.touches[0].clientX; dragY = e.touches[0].clientY;
      applyTransform(false);
    }
  }, { passive: false });

  modal.addEventListener('touchend', () => { dragging = false; pinchDist = null; }, { passive: true });
})();

// Food category filter
const filterBtns = document.querySelectorAll('.filter-btn');
const foodCards = document.querySelectorAll('.food-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.getAttribute('data-filter');
    foodCards.forEach(card => {
      const match = filter === 'all' || card.getAttribute('data-category') === filter;
      card.classList.toggle('hidden', !match);
    });
  });
});
