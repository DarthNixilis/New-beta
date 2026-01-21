// listeners.js

export function initializeAllEventListeners() {
  // ---------- helpers ----------
  function qs(sel) {
    return document.querySelector(sel);
  }
  function qsa(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function dispatchFiltersChanged() {
    document.dispatchEvent(new Event('filtersChanged'));
  }

  function getHandler(name) {
    if (window.AEW && typeof window.AEW[name] === 'function') return window.AEW[name];
    if (typeof window[name] === 'function') return window[name];
    return null;
  }

  function safeCall(name, ...args) {
    const fn = getHandler(name);
    if (!fn) return false;
    try {
      fn(...args);
      return true;
    } catch (e) {
      console.error(`[listeners] Error calling ${name}()`, e);
      return false;
    }
  }

  // ---------- grid columns ----------
  qsa('button').forEach(btn => {
    const t = (btn.textContent || '').trim();
    if (t !== '2' && t !== '3' && t !== '4') return;

    btn.addEventListener('click', e => {
      e.preventDefault();
      const n = Number(t);

      if (!safeCall('setGridColumns', n)) {
        const grid =
          qs('#cardPool') ||
          qs('#cardPoolGrid') ||
          qs('.card-grid') ||
          qs('.card-pool');

        if (grid) {
          grid.style.display = 'grid';
          grid.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
        }
      }

      dispatchFiltersChanged();
    });
  });

  // ---------- list / grid toggle ----------
  const viewBtn = qsa('button').find(b =>
    (b.textContent || '').toLowerCase().includes('switch to')
  );

  if (viewBtn) {
    viewBtn.addEventListener('click', e => {
      e.preventDefault();
      const txt = viewBtn.textContent.toLowerCase();
      const toList = txt.includes('list');

      if (!safeCall('toggleListView', toList)) {
        document.body.classList.toggle('list-view', toList);
      }

      viewBtn.textContent = toList
        ? 'Switch to Grid View'
        : 'Switch to List View';

      dispatchFiltersChanged();
    });
  }

  // ---------- search ----------
  const search =
    qs('#searchInput') ||
    qsa('input').find(i =>
      (i.placeholder || '').toLowerCase().includes('search')
    );

  if (search) {
    search.addEventListener('input', dispatchFiltersChanged);
  }

  // ---------- sort ----------
  const sort =
    qs('#sortSelect') ||
    qs('#sortDropdown') ||
    qs('select');

  if (sort) {
    sort.addEventListener('change', dispatchFiltersChanged);
  }

  // ---------- checkboxes ----------
  qsa('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', dispatchFiltersChanged);
  });

  // ---------- export ----------
  qsa('button').forEach(btn => {
    const t = (btn.textContent || '').toLowerCase();

    if (t.includes('export')) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (
          !safeCall('exportDeck') &&
          !safeCall('exportDeckAsLackeyText') &&
          !safeCall('exportDeckAsText')
        ) {
          console.error('[listeners] No export function found');
        }
      });
    }

    if (t.includes('import')) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (!safeCall('importDeck')) {
          console.error('[listeners] importDeck() not found');
        }
      });
    }
  });

  console.log('[listeners] All event listeners initialized');
}
