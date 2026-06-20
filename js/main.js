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

// ── Clickable cards → detail page ─────────────────────────────────────────
document.querySelectorAll('.activity-card[data-activity-id]').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('a, button, .meetup-panel, .meetup-toggle-btn, form')) return;
    window.location.href = 'detail.html?type=activity&id=' + encodeURIComponent(card.getAttribute('data-activity-id'));
  });
});

document.querySelectorAll('.food-card[data-food-id]').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    window.location.href = 'detail.html?type=food&id=' + encodeURIComponent(card.getAttribute('data-food-id'));
  });
});

// Copy Korean name to clipboard
const toast = document.getElementById('copy-toast');
let toastTimeout;

function showCopyToast() {
  if (!toast) return;
  toast.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

function copyKoreanText(text) {
  if (!text || !navigator.clipboard) return Promise.resolve();
  return navigator.clipboard.writeText(text).then(showCopyToast).catch(() => {});
}

document.querySelectorAll('.korean-name').forEach(btn => {
  btn.addEventListener('click', () => {
    copyKoreanText(btn.getAttribute('data-korean'));
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
      const categories = (card.getAttribute('data-category') || '').split(/\s+/).filter(Boolean);
      const match = filter === 'all' || categories.includes(filter);
      card.classList.toggle('hidden', !match);
    });
  });
});


(function () {
  const filterBtnsIg = document.querySelectorAll('.filter-btn-ig');
  const foodCardsIg = document.querySelectorAll('.food-card-ig');
  const modal = document.getElementById('food-modal');
  const modalClose = document.getElementById('food-modal-close');
  const modalImage = document.getElementById('food-modal-image');
  const modalKorean = document.getElementById('food-modal-korean');
  const modalEnglish = document.getElementById('food-modal-english');
  const modalPrice = document.getElementById('food-modal-price');
  const modalTags = document.getElementById('food-modal-tags');
  const modalDesc = document.getElementById('food-modal-desc');
  const modalCopy = document.getElementById('food-modal-copy');
  const modalMaps = document.getElementById('food-modal-maps');
  const modalPickSlot = document.getElementById('food-modal-pick-slot');
  let activeCard = null;
  let lastFocused = null;

  if (filterBtnsIg.length) {
    filterBtnsIg.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtnsIg.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        foodCardsIg.forEach(card => {
          const categories = (card.getAttribute('data-category') || '').split(/\s+/).filter(Boolean);
          const match = filter === 'all' || categories.includes(filter);
          card.classList.toggle('hidden', !match);
        });
      });
    });
  }

  if (!modal || !foodCardsIg.length) return;

  function renderTags(tags) {
    modalTags.innerHTML = '';
    tags.filter(Boolean).forEach(tag => {
      const el = document.createElement('span');
      el.className = 'food-tag-ig';
      el.textContent = tag;
      modalTags.appendChild(el);
    });
  }

  function openModal(card) {
    activeCard = card;
    lastFocused = document.activeElement;

    const korean = card.getAttribute('data-korean') || '';
    const english = card.getAttribute('data-english') || '';
    const price = card.getAttribute('data-price') || '';
    const desc = card.getAttribute('data-desc') || '';
    const maps = card.getAttribute('data-maps') || '#';
    const img = card.getAttribute('data-img') || '';
    const tags = (card.getAttribute('data-tags') || '').split(',').map(tag => tag.trim());

    modalImage.src = img;
    modalImage.alt = korean || english;
    modalKorean.textContent = korean;
    modalKorean.setAttribute('data-korean', korean);
    modalEnglish.textContent = english;
    modalPrice.textContent = price;
    modalDesc.textContent = desc;
    modalCopy.setAttribute('data-korean', korean);
    modalMaps.href = maps;
    renderTags(tags);

    if (modalPickSlot) {
      modalPickSlot.hidden = true;
      modalPickSlot.innerHTML = '';
    }

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('food-modal-open');
    document.dispatchEvent(new CustomEvent('foodGuideModalOpen', {
      detail: { card, modal, pickSlot: modalPickSlot }
    }));
    modalClose.focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('food-modal-open');
    document.dispatchEvent(new CustomEvent('foodGuideModalClose', {
      detail: { card: activeCard, modal, pickSlot: modalPickSlot }
    }));
    activeCard = null;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  foodCardsIg.forEach(card => {
    card.addEventListener('click', () => openModal(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(card);
      }
    });
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  [modalKorean, modalCopy].forEach(btn => {
    btn.addEventListener('click', () => {
      copyKoreanText(btn.getAttribute('data-korean'));
    });
  });
})();

// ── Collapsible sections (Airport / Subway Map) ───────────────────────────
document.querySelectorAll('.section-collapse-btn').forEach(btn => {
  const labelEl    = btn.querySelector('.collapse-label');
  const arrowEl    = btn.querySelector('.collapse-arrow');
  const closedText = labelEl.textContent.trim();

  btn.addEventListener('click', () => {
    const body = document.getElementById(btn.getAttribute('data-target'));
    if (!body) return;
    body.hidden = !body.hidden;
    labelEl.textContent = body.hidden ? closedText : 'Hide';
    arrowEl.textContent = body.hidden ? '▸' : '▾';
  });
});

// ── Hiking meetup column toggles ──────────────────────────────────────────
document.querySelectorAll('.hike-meetup-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = document.getElementById('hike-meetup-' + btn.getAttribute('data-hike'));
    if (!row) return;
    row.hidden = !row.hidden;
    btn.querySelector('.hike-meetup-arrow').textContent = row.hidden ? '▸' : '▾';
    btn.classList.toggle('open', !row.hidden);
  });
});

// ── Admin mode (triple-click footer to activate) ──────────────────────────
const ADMIN_MODE = sessionStorage.getItem('sgAdmin') === '1';
(function () {
  const footer = document.querySelector('footer');
  if (!footer) return;
  let clicks = 0, timer;
  footer.addEventListener('click', () => {
    clicks++;
    clearTimeout(timer);
    if (clicks >= 3) {
      clicks = 0;
      const pw = prompt('Admin passphrase:');
      if (pw === 'icml2026seoul') {
        sessionStorage.setItem('sgAdmin', '1');
        location.reload();
      }
    }
    timer = setTimeout(() => { clicks = 0; }, 700);
  });
})();

// ── Firebase: Meetup Coordination & Activity Suggestions ──────────────────
(function () {
  const db = (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY)
    ? firebase.firestore()
    : null;

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function meetupEntryHTML(d, docId) {
    return `<div class="meetup-entry" data-doc-id="${esc(docId)}">
      <div class="meetup-entry-header">
        <span class="meetup-name">${esc(d.authorName)}</span>
        <span class="meetup-time">🕐 ${esc(d.meetupTime)}</span>
        ${ADMIN_MODE ? `<button class="meetup-delete-btn" title="Delete">🗑</button>` : ''}
      </div>
      ${d.participantCount ? `<div class="meetup-meta">👥 ${esc(d.participantCount)}</div>` : ''}
      <div class="meetup-contact">📬 ${esc(d.contact)}</div>
    </div>`;
  }

  async function loadMeetups(aid, listEl, toggleBtn) {
    if (!db) {
      listEl.innerHTML = '<span class="meetup-empty">Connect Firebase to enable meetups.</span>';
      return;
    }
    listEl.innerHTML = '<span class="meetup-loading">Loading…</span>';
    try {
      const snap = await db.collection('meetups').doc(aid)
        .collection('proposals')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();
      listEl.innerHTML = snap.empty
        ? '<span class="meetup-empty">No meetups yet — be the first to organize one!</span>'
        : snap.docs.map(d => meetupEntryHTML(d.data(), d.id)).join('');
      const lbl = toggleBtn ? toggleBtn.querySelector('.meetup-count-label') : null;
      if (lbl && !snap.empty) {
        lbl.textContent = `👥 ${snap.size} meetup${snap.size !== 1 ? 's' : ''}`;
      }
      if (ADMIN_MODE) {
        listEl.querySelectorAll('.meetup-delete-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const entry = btn.closest('.meetup-entry');
            if (!confirm('Delete this meetup?')) return;
            btn.disabled = true;
            await db.collection('meetups').doc(aid).collection('proposals')
              .doc(entry.getAttribute('data-doc-id')).delete();
            entry.remove();
          });
        });
      }
    } catch {
      listEl.innerHTML = '<span class="meetup-empty">Could not load meetups.</span>';
    }
  }

  document.querySelectorAll('.activity-card[data-activity-id]').forEach(card => {
    const aid  = card.getAttribute('data-activity-id');
    const body = card.querySelector('.activity-body');
    if (!body) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type      = 'button';
    toggleBtn.className = 'meetup-toggle-btn';
    toggleBtn.innerHTML = '<span class="meetup-count-label">👥 Meetups</span><span class="meetup-arrow">▸</span>';
    body.appendChild(toggleBtn);

    const panel = document.createElement('div');
    panel.className = 'meetup-panel';
    panel.hidden    = true;
    panel.innerHTML = `
      <div class="meetup-list" id="mlist-${aid}"></div>
      <button class="meetup-add-btn" type="button">＋ Organize a meetup</button>
      <form class="meetup-form" style="display:none">
        <input  class="meetup-input" name="authorName"       placeholder="Your name *"                          required maxlength="80">
        <input  class="meetup-input" name="meetupTime"       placeholder="When? (e.g. Sat Jul 26, 7pm) *"      required maxlength="120">
        <input  class="meetup-input" name="participantCount" placeholder="How many? (e.g. 4–6 people)"                  maxlength="60">
        <input  class="meetup-input" name="contact"          placeholder="Contact: email / Twitter / Discord *" required maxlength="120">
        <div class="meetup-form-btns">
          <button type="submit"  class="meetup-submit-btn">Post</button>
          <button type="button"  class="meetup-cancel-btn">Cancel</button>
        </div>
      </form>
    `;
    body.appendChild(panel);

    const listEl = panel.querySelector('.meetup-list');
    const addBtn = panel.querySelector('.meetup-add-btn');
    const form   = panel.querySelector('.meetup-form');
    let loaded   = false;

    toggleBtn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      toggleBtn.querySelector('.meetup-arrow').textContent = panel.hidden ? '▸' : '▾';
      if (!panel.hidden && !loaded) { loaded = true; loadMeetups(aid, listEl, toggleBtn); }
    });

    addBtn.addEventListener('click', () => {
      form.style.display = 'block';
      addBtn.style.display = 'none';
      form.elements['authorName'].focus();
    });

    form.querySelector('.meetup-cancel-btn').addEventListener('click', () => {
      form.style.display = 'none';
      addBtn.style.display = '';
      form.reset();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!db) { alert('Firebase not configured yet.'); return; }
      const submitBtn = form.querySelector('.meetup-submit-btn');
      submitBtn.disabled = true; submitBtn.textContent = 'Posting…';
      try {
        await db.collection('meetups').doc(aid).collection('proposals').add({
          authorName:       form.elements['authorName'].value.trim(),
          meetupTime:       form.elements['meetupTime'].value.trim(),
          participantCount: form.elements['participantCount'].value.trim(),
          contact:          form.elements['contact'].value.trim(),
          createdAt:        firebase.firestore.FieldValue.serverTimestamp(),
        });
        form.reset();
        form.style.display = 'none';
        addBtn.style.display = '';
        loaded = false;
        loadMeetups(aid, listEl, toggleBtn);
      } catch { alert('Could not post — please try again.'); }
      finally { submitBtn.disabled = false; submitBtn.textContent = 'Post'; }
    });
  });

  // ── Hiking meetups (inline panel, triggered by column button) ──
  document.querySelectorAll('.hike-meetup-slot[data-hike-id]').forEach(slot => {
    const hid    = slot.getAttribute('data-hike-id');
    const colBtn = document.querySelector(`.hike-meetup-btn[data-hike="${hid}"]`);

    slot.innerHTML = `
      <div class="meetup-list" id="hike-mlist-${hid}"><span class="meetup-loading">Loading…</span></div>
      <button class="meetup-add-btn" type="button">＋ Organize a meetup</button>
      <form class="meetup-form" style="display:none">
        <input class="meetup-input" name="authorName"       placeholder="Your name *"                          required maxlength="80">
        <input class="meetup-input" name="meetupTime"       placeholder="When? (e.g. Sat Jul 26, 6am) *"      required maxlength="120">
        <input class="meetup-input" name="participantCount" placeholder="How many? (e.g. 4–6 people)"                  maxlength="60">
        <input class="meetup-input" name="contact"          placeholder="Contact: email / Twitter / Discord *" required maxlength="120">
        <div class="meetup-form-btns">
          <button type="submit" class="meetup-submit-btn">Post</button>
          <button type="button" class="meetup-cancel-btn">Cancel</button>
        </div>
      </form>
    `;

    const listEl = slot.querySelector('.meetup-list');
    const addBtn = slot.querySelector('.meetup-add-btn');
    const form   = slot.querySelector('.meetup-form');
    let loaded   = false;

    if (colBtn) {
      colBtn.addEventListener('click', () => {
        if (!loaded) { loaded = true; loadMeetups('hike-' + hid, listEl, colBtn); }
      });
    }

    addBtn.addEventListener('click', () => {
      form.style.display = 'block';
      addBtn.style.display = 'none';
      form.elements['authorName'].focus();
    });

    form.querySelector('.meetup-cancel-btn').addEventListener('click', () => {
      form.style.display = 'none';
      addBtn.style.display = '';
      form.reset();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!db) { alert('Firebase not configured yet.'); return; }
      const submitBtn = form.querySelector('.meetup-submit-btn');
      submitBtn.disabled = true; submitBtn.textContent = 'Posting…';
      try {
        await db.collection('meetups').doc('hike-' + hid).collection('proposals').add({
          authorName:       form.elements['authorName'].value.trim(),
          meetupTime:       form.elements['meetupTime'].value.trim(),
          participantCount: form.elements['participantCount'].value.trim(),
          contact:          form.elements['contact'].value.trim(),
          createdAt:        firebase.firestore.FieldValue.serverTimestamp(),
        });
        form.reset();
        form.style.display = 'none';
        addBtn.style.display = '';
        loaded = false;
        loadMeetups('hike-' + hid, listEl, colBtn);
      } catch { alert('Could not post — please try again.'); }
      finally { submitBtn.disabled = false; submitBtn.textContent = 'Post'; }
    });
  });

  // ── Community suggestions ──
  const suggestForm    = document.getElementById('suggest-form');
  const suggestSuccess = document.getElementById('suggest-success');
  const suggestList    = document.getElementById('suggest-list');

  function suggestionHTML(d) {
    return `<div class="meetup-entry">
      <div class="meetup-name">${esc(d.title)}</div>
      <div class="meetup-meta" style="margin-top:3px;">${esc(d.description)}</div>
      ${d.contact ? `<div class="meetup-contact" style="margin-top:2px;">📬 ${esc(d.contact)}</div>` : ''}
    </div>`;
  }

  function loadSuggestions() {
    if (!db || !suggestList) return;
    db.collection('suggestions').orderBy('createdAt', 'desc').limit(15).get().then(snap => {
      if (snap.empty) { suggestList.innerHTML = ''; return; }
      suggestList.innerHTML =
        '<p>Community ideas:</p>' +
        snap.docs.map(d => suggestionHTML(d.data())).join('');
    });
  }

  if (suggestForm) {
    suggestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!db) { alert('Firebase not configured yet.'); return; }
      const form      = e.target;
      const submitBtn = form.querySelector('.meetup-submit-btn');
      submitBtn.disabled = true; submitBtn.textContent = 'Submitting…';
      try {
        await db.collection('suggestions').add({
          title:       form.elements['title'].value.trim(),
          description: form.elements['description'].value.trim(),
          contact:     form.elements['contact'].value.trim(),
          createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        });
        suggestSuccess.hidden = false;
        form.reset();
        setTimeout(() => { suggestSuccess.hidden = true; }, 5000);
        loadSuggestions();
      } catch { alert('Could not submit — please try again.'); }
      finally { submitBtn.disabled = false; submitBtn.textContent = 'Submit →'; }
    });
    loadSuggestions();
  }
})();
