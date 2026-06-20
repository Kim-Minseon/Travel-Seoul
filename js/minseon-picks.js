// ── Minseon's Picks: Load CSV and inject into food cards ──────────────────
(function () {
  const CSV_PATH = 'data/minseon-picks.csv';

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const parts = [];
      let remaining = line;
      for (let i = 0; i < 3; i++) {
        const idx = remaining.indexOf(',');
        if (idx === -1) break;
        parts.push(remaining.slice(0, idx));
        remaining = remaining.slice(idx + 1);
      }
      parts.push(remaining);
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = (parts[i] || '').trim(); });
      return obj;
    });
  }

  function buildPickMarkup(restaurants, collapsible) {
    const itemHTML = restaurants.map(r => `
      <div class="minseon-pick-item">
        <span class="pick-name">${esc(r.restaurant_korean)} <span class="pick-english">${esc(r.restaurant_english)}</span></span>
        ${r.maps_url ? `<a class="pick-map-link" href="${esc(r.maps_url)}" target="_blank" rel="noopener">Maps →</a>` : ''}
      </div>
    `).join('');

    return `
      <div class="minseon-pick">
        <button class="minseon-pick-toggle"${collapsible ? ' aria-expanded="false"' : ''}>⭐ Minseon's Pick</button>
        <div class="minseon-pick-body"${collapsible ? ' hidden' : ''}>${itemHTML}</div>
      </div>
    `;
  }

  function applyCardPick(card, restaurants) {
    const content = card.querySelector('.food-content');
    if (!content) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildPickMarkup(restaurants, true).trim();
    const pickDiv = wrapper.firstElementChild;
    const toggle = pickDiv.querySelector('.minseon-pick-toggle');
    const body = pickDiv.querySelector('.minseon-pick-body');

    toggle.addEventListener('click', () => {
      const expanded = body.hidden;
      body.hidden = !expanded;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.classList.toggle('open', expanded);
    });

    const footer = content.querySelector('.food-footer');
    if (footer) {
      content.insertBefore(pickDiv, footer);
    } else {
      content.appendChild(pickDiv);
    }

    card.classList.add('has-pick');
  }

  function applyIGPick(card, restaurants) {
    card.setAttribute('data-minseon-picks', JSON.stringify(restaurants));
    card.classList.add('has-pick');

    const imgWrap = card.querySelector('.food-card-ig-img');
    if (!imgWrap || imgWrap.querySelector('.food-card-ig-badge')) return;

    const badge = document.createElement('span');
    badge.className = 'food-card-ig-badge';
    badge.textContent = "⭐ Minseon's Pick";
    imgWrap.appendChild(badge);
  }

  function injectPicks(picks) {
    const grouped = {};
    picks.forEach(p => {
      if (!p.food_id) return;
      if (!grouped[p.food_id]) grouped[p.food_id] = [];
      grouped[p.food_id].push(p);
    });

    document.querySelectorAll('.food-card').forEach(card => {
      const foodId = card.getAttribute('data-food-id');
      if (!foodId || !grouped[foodId]) return;
      applyCardPick(card, grouped[foodId]);
    });

    document.querySelectorAll('.food-card-ig').forEach(card => {
      const foodId = card.getAttribute('data-food-id');
      if (!foodId || !grouped[foodId]) return;
      applyIGPick(card, grouped[foodId]);
    });
  }

  function renderIGModalPick(card, pickSlot) {
    if (!pickSlot) return;
    const raw = card ? card.getAttribute('data-minseon-picks') : '';
    if (!raw) {
      pickSlot.hidden = true;
      pickSlot.innerHTML = '';
      return;
    }

    let restaurants = [];
    try {
      restaurants = JSON.parse(raw);
    } catch {
      restaurants = [];
    }

    if (!restaurants.length) {
      pickSlot.hidden = true;
      pickSlot.innerHTML = '';
      return;
    }

    pickSlot.innerHTML = buildPickMarkup(restaurants, false).trim();
    pickSlot.hidden = false;
  }

  function esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  document.addEventListener('foodGuideModalOpen', (event) => {
    const detail = event.detail || {};
    renderIGModalPick(detail.card, detail.pickSlot);
  });

  document.addEventListener('foodGuideModalClose', (event) => {
    const detail = event.detail || {};
    if (!detail.pickSlot) return;
    detail.pickSlot.hidden = true;
    detail.pickSlot.innerHTML = '';
  });

  fetch(CSV_PATH)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(text => injectPicks(parseCSV(text)))
    .catch(() => { /* silently skip if CSV not found */ });
})();
