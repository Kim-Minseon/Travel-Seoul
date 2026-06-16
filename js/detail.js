// ── Detail page renderer ──────────────────────────────────────────────────
(function () {
  const db = (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY)
    ? firebase.firestore()
    : null;

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts.toDate().getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + 'd ago';
    return ts.toDate().toLocaleDateString();
  }

  // ── Parse URL params ──
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');  // 'activity' or 'food'
  const id = params.get('id');
  const container = document.getElementById('detail-content');

  if (!type || !id) {
    container.innerHTML = notFound();
    return;
  }

  const dataMap = type === 'activity' ? window.ACTIVITY_DATA : window.FOOD_DATA;
  const item = dataMap ? dataMap[id] : null;

  if (!item) {
    container.innerHTML = notFound();
    return;
  }

  document.title = item.title + ' — Seoul Guide · ICML 2026';

  // ── Render page ──
  const backSection = type === 'activity' ? '#activities' : '#food-guide';
  const backLabel = type === 'activity' ? 'Activities' : 'Food Guide';
  const meetupCollectionId = type + '-' + id;

  container.innerHTML = `
    <!-- Hero image -->
    <div class="detail-hero">
      <img src="${esc(item.image)}" alt="${esc(item.title)}" class="detail-hero-img">
      <div class="detail-hero-overlay"></div>
      <div class="detail-hero-content">
        ${item.badge ? `<span class="detail-badge">${esc(item.badge)}</span>` : ''}
        <h1 class="detail-title">${esc(item.title)}</h1>
        ${item.korean ? `<span class="detail-korean font-korean">${esc(item.korean)}</span>` : ''}
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-8">
      <!-- Breadcrumb -->
      <a href="index.html${backSection}" class="detail-back">← ${esc(backLabel)}</a>

      <!-- Info -->
      <div class="detail-section">
        <p class="detail-desc">${esc(item.description)}</p>

        ${item.price ? `<div class="detail-price">💰 ${esc(item.price)}</div>` : ''}

        ${item.meta && item.meta.length ? `
        <div class="detail-meta-grid">
          ${item.meta.map(m => `<span class="detail-meta-item">${esc(m)}</span>`).join('')}
        </div>` : ''}

        ${item.mapsQuery ? `
        <a class="detail-maps-btn" href="https://www.google.com/maps/search/${encodeURIComponent(item.mapsQuery)}" target="_blank" rel="noopener">
          📍 Open in Google Maps
        </a>` : ''}
      </div>

      <!-- Tips -->
      ${item.tips && item.tips.length ? `
      <div class="detail-section">
        <h2 class="detail-section-title">💡 Tips</h2>
        <ul class="detail-tips">
          ${item.tips.map(t => `<li>${esc(t)}</li>`).join('')}
        </ul>
      </div>` : ''}

      <!-- Table (if any) -->
      ${item.table ? `
      <div class="detail-section">
        <h2 class="detail-section-title">📋 At a Glance</h2>
        <div class="detail-table-wrap">
          <table class="detail-table">
            <thead>
              <tr>${item.table.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${item.table.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Meetups -->
      <div class="detail-section">
        <h2 class="detail-section-title">👥 Meetups</h2>
        <p class="text-gray-500 text-sm mb-4">Organize or join a group to experience this together!</p>
        <div id="detail-meetup-list" class="mb-4">
          <span class="board-loading">Loading meetups…</span>
        </div>
        <button id="detail-meetup-add" class="detail-add-meetup-btn" type="button">＋ Organize a meetup</button>
        <form id="detail-meetup-form" class="detail-meetup-form" style="display:none">
          <input class="board-input" name="authorName" placeholder="Your name *" required maxlength="80">
          <input class="board-input" name="meetupTime" placeholder="When? (e.g. Sat Jul 26, 7pm) *" required maxlength="120">
          <input class="board-input" name="participantCount" placeholder="How many people? (e.g. 4–6)" maxlength="60">
          <input class="board-input" name="contact" placeholder="Contact (email / Twitter / Discord) *" required maxlength="120">
          <div class="flex gap-2">
            <button type="submit" class="board-submit-btn flex-1">Post Meetup</button>
            <button type="button" id="detail-meetup-cancel" class="detail-cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // ── Meetup logic ──
  const meetupList = document.getElementById('detail-meetup-list');
  const meetupAdd = document.getElementById('detail-meetup-add');
  const meetupForm = document.getElementById('detail-meetup-form');
  const meetupCancel = document.getElementById('detail-meetup-cancel');

  function meetupHTML(d) {
    return `<div class="detail-meetup-entry">
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold text-gray-800 text-sm">👤 ${esc(d.authorName)}</span>
        <span class="text-xs text-primary font-semibold">🕐 ${esc(d.meetupTime)}</span>
      </div>
      ${d.participantCount ? `<div class="text-xs text-gray-500 mb-1">👥 ${esc(d.participantCount)}</div>` : ''}
      <div class="text-xs text-gray-400 italic">📬 ${esc(d.contact)}</div>
    </div>`;
  }

  async function loadMeetups() {
    if (!db) {
      meetupList.innerHTML = '<span class="board-empty">Connect Firebase to enable meetups.</span>';
      return;
    }
    try {
      const snap = await db.collection('meetups').doc(meetupCollectionId)
        .collection('proposals').orderBy('createdAt', 'desc').limit(30).get();
      meetupList.innerHTML = snap.empty
        ? '<span class="board-empty">No meetups yet — be the first to organize one!</span>'
        : snap.docs.map(d => meetupHTML(d.data())).join('');
    } catch {
      meetupList.innerHTML = '<span class="board-empty">Could not load meetups.</span>';
    }
  }

  meetupAdd.addEventListener('click', () => {
    meetupForm.style.display = 'block';
    meetupAdd.style.display = 'none';
    meetupForm.elements['authorName'].focus();
  });

  meetupCancel.addEventListener('click', () => {
    meetupForm.style.display = 'none';
    meetupAdd.style.display = '';
    meetupForm.reset();
  });

  meetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!db) { alert('Firebase not configured.'); return; }
    const btn = meetupForm.querySelector('.board-submit-btn');
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      await db.collection('meetups').doc(meetupCollectionId).collection('proposals').add({
        authorName: meetupForm.elements['authorName'].value.trim(),
        meetupTime: meetupForm.elements['meetupTime'].value.trim(),
        participantCount: meetupForm.elements['participantCount'].value.trim(),
        contact: meetupForm.elements['contact'].value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      meetupForm.reset();
      meetupForm.style.display = 'none';
      meetupAdd.style.display = '';
      loadMeetups();
    } catch { alert('Could not post — please try again.'); }
    finally { btn.disabled = false; btn.textContent = 'Post Meetup'; }
  });

  loadMeetups();

  function notFound() {
    return `<div class="max-w-3xl mx-auto px-4 py-20 text-center">
      <div class="text-5xl mb-4">🤷</div>
      <h1 class="text-2xl font-bold text-gray-700 mb-2">Not Found</h1>
      <p class="text-gray-500 mb-6">This page doesn't exist or the link is broken.</p>
      <a href="index.html" class="inline-block bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-primary-dark transition-colors">← Back to Seoul Guide</a>
    </div>`;
  }
})();
