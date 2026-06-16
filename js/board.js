// ── Community Board (Firebase-backed) ─────────────────────────────────────
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

  // ── Like handling (localStorage dedup) ──
  function getLikedPosts() {
    try { return JSON.parse(localStorage.getItem('board_likes') || '{}'); } catch { return {}; }
  }
  function setLiked(postId) {
    const liked = getLikedPosts();
    liked[postId] = true;
    localStorage.setItem('board_likes', JSON.stringify(liked));
  }
  function hasLiked(postId) {
    return !!getLikedPosts()[postId];
  }

  // ── Render a single post card ──
  function postHTML(doc, showReplies) {
    const d = doc.data();
    const liked = hasLiked(doc.id);
    return `<div class="board-post" data-post-id="${esc(doc.id)}">
      <div class="board-post-header">
        <span class="board-post-author">👤 ${esc(d.authorName)}</span>
        <span class="board-post-time">${timeAgo(d.createdAt)}</span>
      </div>
      <h3 class="board-post-title">${esc(d.title)}</h3>
      <p class="board-post-content">${esc(d.content)}</p>
      <div class="board-post-footer">
        <button class="board-like-btn ${liked ? 'liked' : ''}" data-post-id="${esc(doc.id)}">
          <span class="heart-icon">${liked ? '❤️' : '🤍'}</span>
          <span class="like-count">${d.likes || 0}</span>
        </button>
        ${showReplies ? `<button class="board-reply-toggle" data-post-id="${esc(doc.id)}">💬 Replies</button>` : ''}
      </div>
      ${showReplies ? `<div class="board-replies-section" id="replies-${esc(doc.id)}" hidden>
        <div class="board-replies-list"></div>
        <form class="board-reply-form">
          <input class="board-input" name="replyName" placeholder="Your name *" required maxlength="80">
          <textarea class="board-input" name="replyContent" placeholder="Write a reply…" required maxlength="1000" rows="2"></textarea>
          <button type="submit" class="board-submit-btn board-reply-submit">Reply</button>
        </form>
      </div>` : ''}
    </div>`;
  }

  function replyHTML(d) {
    return `<div class="board-reply">
      <div class="board-reply-header">
        <span class="board-post-author">👤 ${esc(d.authorName)}</span>
        <span class="board-post-time">${timeAgo(d.createdAt)}</span>
      </div>
      <p class="board-reply-content">${esc(d.content)}</p>
    </div>`;
  }

  // ── Load replies for a post ──
  async function loadReplies(postId, listEl) {
    if (!db) return;
    listEl.innerHTML = '<span class="board-loading">Loading replies…</span>';
    try {
      const snap = await db.collection('board_posts').doc(postId)
        .collection('replies').orderBy('createdAt', 'asc').limit(50).get();
      listEl.innerHTML = snap.empty
        ? '<span class="board-empty">No replies yet.</span>'
        : snap.docs.map(d => replyHTML(d.data())).join('');
    } catch {
      listEl.innerHTML = '<span class="board-empty">Could not load replies.</span>';
    }
  }

  // ── Bind events for like & reply on a container ──
  function bindPostEvents(container) {
    // Like buttons
    container.querySelectorAll('.board-like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const postId = btn.getAttribute('data-post-id');
        if (hasLiked(postId) || !db) return;
        btn.disabled = true;
        try {
          await db.collection('board_posts').doc(postId).update({
            likes: firebase.firestore.FieldValue.increment(1)
          });
          setLiked(postId);
          btn.classList.add('liked');
          btn.querySelector('.heart-icon').textContent = '❤️';
          const countEl = btn.querySelector('.like-count');
          countEl.textContent = parseInt(countEl.textContent) + 1;
        } catch { /* ignore */ }
        btn.disabled = false;
      });
    });

    // Reply toggles
    container.querySelectorAll('.board-reply-toggle').forEach(btn => {
      let loaded = false;
      btn.addEventListener('click', () => {
        const postId = btn.getAttribute('data-post-id');
        const section = document.getElementById('replies-' + postId);
        section.hidden = !section.hidden;
        if (!section.hidden && !loaded) {
          loaded = true;
          loadReplies(postId, section.querySelector('.board-replies-list'));
        }
      });
    });

    // Reply forms
    container.querySelectorAll('.board-reply-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!db) { alert('Firebase not configured.'); return; }
        const postEl = form.closest('.board-post');
        const postId = postEl.getAttribute('data-post-id');
        const submitBtn = form.querySelector('.board-reply-submit');
        submitBtn.disabled = true; submitBtn.textContent = 'Posting…';
        try {
          await db.collection('board_posts').doc(postId).collection('replies').add({
            authorName: form.elements['replyName'].value.trim(),
            content: form.elements['replyContent'].value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          form.reset();
          loadReplies(postId, postEl.querySelector('.board-replies-list'));
        } catch { alert('Could not post reply.'); }
        finally { submitBtn.disabled = false; submitBtn.textContent = 'Reply'; }
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  // INDEX PAGE: Top 3 most-liked posts preview
  // ══════════════════════════════════════════════════════════
  const previewContainer = document.getElementById('board-preview');
  if (previewContainer && db) {
    (async () => {
      previewContainer.innerHTML = '<span class="board-loading">Loading posts…</span>';
      try {
        const snap = await db.collection('board_posts')
          .orderBy('likes', 'desc')
          .limit(3)
          .get();
        if (snap.empty) {
          previewContainer.innerHTML = '<p class="board-empty">No posts yet — be the first to share!</p>';
        } else {
          previewContainer.innerHTML = snap.docs.map(d => postHTML(d, false)).join('');
          bindPostEvents(previewContainer);
        }
      } catch {
        previewContainer.innerHTML = '<p class="board-empty">Could not load posts.</p>';
      }
    })();
  } else if (previewContainer) {
    previewContainer.innerHTML = '<p class="board-empty">Connect Firebase to enable the community board.</p>';
  }

  // ══════════════════════════════════════════════════════════
  // BOARD PAGE: Full board with create + replies
  // ══════════════════════════════════════════════════════════
  const boardFull = document.getElementById('board-full');
  const boardForm = document.getElementById('board-create-form');
  const boardSortBtns = document.querySelectorAll('.board-sort-btn');

  let currentSort = 'likes';

  async function loadFullBoard(sort) {
    if (!db || !boardFull) return;
    boardFull.innerHTML = '<span class="board-loading">Loading posts…</span>';
    try {
      const field = sort === 'newest' ? 'createdAt' : 'likes';
      const snap = await db.collection('board_posts')
        .orderBy(field, 'desc')
        .limit(50)
        .get();
      if (snap.empty) {
        boardFull.innerHTML = '<p class="board-empty">No posts yet — be the first to share!</p>';
      } else {
        boardFull.innerHTML = snap.docs.map(d => postHTML(d, true)).join('');
        bindPostEvents(boardFull);
      }
    } catch {
      boardFull.innerHTML = '<p class="board-empty">Could not load posts.</p>';
    }
  }

  // Sort buttons
  boardSortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      boardSortBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.getAttribute('data-sort');
      loadFullBoard(currentSort);
    });
  });

  // Create post form
  if (boardForm) {
    boardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!db) { alert('Firebase not configured.'); return; }
      const submitBtn = boardForm.querySelector('.board-submit-btn');
      submitBtn.disabled = true; submitBtn.textContent = 'Posting…';
      try {
        await db.collection('board_posts').add({
          authorName: boardForm.elements['authorName'].value.trim(),
          title: boardForm.elements['postTitle'].value.trim(),
          content: boardForm.elements['postContent'].value.trim(),
          likes: 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        boardForm.reset();
        document.getElementById('board-create-toggle').open = false;
        loadFullBoard(currentSort);
      } catch { alert('Could not post — please try again.'); }
      finally { submitBtn.disabled = false; submitBtn.textContent = 'Post →'; }
    });
  }

  // Initial load on board page
  if (boardFull) loadFullBoard(currentSort);
})();
