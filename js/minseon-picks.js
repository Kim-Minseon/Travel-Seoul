// ── Minseon's Picks: Load CSV and inject into food cards ──────────────────
(function () {
  const CSV_PATH = 'data/minseon-picks.csv';

  function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).filter(l => l.trim()).map(line => {
      // Handle commas in URLs by splitting only first 3 commas
      const parts = [];
      let remaining = line;
      for (let i = 0; i < 3; i++) {
        const idx = remaining.indexOf(',');
        if (idx === -1) break;
        parts.push(remaining.slice(0, idx));
        remaining = remaining.slice(idx + 1);
      }
      parts.push(remaining); // last field (maps_url) may contain commas
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = (parts[i] || '').trim(); });
      return obj;
    });
  }

  function injectPicks(picks) {
    // Group by food_id (allow multiple picks per food)
    const grouped = {};
    picks.forEach(p => {
      if (!p.food_id) return;
      if (!grouped[p.food_id]) grouped[p.food_id] = [];
      grouped[p.food_id].push(p);
    });

    document.querySelectorAll('.food-card').forEach(card => {
      const foodId = card.getAttribute('data-food-id');
      if (!foodId || !grouped[foodId]) return;

      const restaurants = grouped[foodId];
      const content = card.querySelector('.food-content');
      if (!content) return;

      // Build collapsible HTML
      const pickDiv = document.createElement('div');
      pickDiv.className = 'minseon-pick';

      const toggle = document.createElement('button');
      toggle.className = 'minseon-pick-toggle';
      toggle.innerHTML = '⭐ Minseon\'s Pick';
      toggle.setAttribute('aria-expanded', 'false');

      const body = document.createElement('div');
      body.className = 'minseon-pick-body';
      body.hidden = true;

      restaurants.forEach(r => {
        const item = document.createElement('div');
        item.className = 'minseon-pick-item';
        item.innerHTML = `
          <span class="pick-name">${esc(r.restaurant_korean)} <span class="pick-english">${esc(r.restaurant_english)}</span></span>
          ${r.maps_url ? `<a class="pick-map-link" href="${esc(r.maps_url)}" target="_blank" rel="noopener">Maps →</a>` : ''}
        `;
        body.appendChild(item);
      });

      toggle.addEventListener('click', () => {
        const expanded = body.hidden;
        body.hidden = !expanded;
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.classList.toggle('open', expanded);
      });

      pickDiv.appendChild(toggle);
      pickDiv.appendChild(body);

      // Insert before footer
      const footer = content.querySelector('.food-footer');
      if (footer) {
        content.insertBefore(pickDiv, footer);
      } else {
        content.appendChild(pickDiv);
      }

      // Add badge to card
      card.classList.add('has-pick');
    });
  }

  function esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Load CSV
  fetch(CSV_PATH)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(text => injectPicks(parseCSV(text)))
    .catch(() => { /* silently skip if CSV not found */ });
})();
