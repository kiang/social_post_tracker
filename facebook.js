(function () {
  'use strict';

  const REPORT_BTN_CLASS = 'threads-report-btn';
  const PROCESSED_ATTR = 'data-report-btn-added';
  const tooltipTimeCache = new WeakMap();

  const TIME_LINK_ATTR = 'data-report-timelink';
  const TIME_PATTERN = /分鐘|小時|天前|昨天|月|日|hour|min|ago|yesterday/;

  function decodeObfuscatedText(link) {
    const charSpans = Array.from(link.querySelectorAll('span')).filter(s => {
      return s.children.length === 0 && s.textContent.length === 1;
    });
    if (charSpans.length === 0) return '';

    const visibleChars = [];
    charSpans.forEach(s => {
      const styleAttr = s.getAttribute('style') || '';
      if (!styleAttr.includes('top: 3em') && !styleAttr.includes('top:3em')) {
        const order = parseInt(window.getComputedStyle(s).order) || 0;
        visibleChars.push({ char: s.textContent, order });
      }
    });

    visibleChars.sort((a, b) => a.order - b.order);
    return visibleChars.map(c => c.char).join('');
  }

  function tagAllTimeLinks() {
    const candidates = document.querySelectorAll('a[href^="?"]:not([' + TIME_LINK_ATTR + '])');
    candidates.forEach(a => {
      const decoded = decodeObfuscatedText(a);
      if (decoded && TIME_PATTERN.test(decoded)) {
        a.setAttribute(TIME_LINK_ATTR, 'true');
      }
    });
  }

  function relativeTimeToAbsolute(relText) {
    if (!relText) return '';
    const now = new Date();
    let match;

    match = relText.match(/(\d+)\s*分鐘/);
    if (match) {
      now.setMinutes(now.getMinutes() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    match = relText.match(/(\d+)\s*分/);
    if (match && !relText.includes('月')) {
      now.setMinutes(now.getMinutes() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    match = relText.match(/(\d+)\s*小時/);
    if (match) {
      now.setHours(now.getHours() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    match = relText.match(/(\d+)\s*天/);
    if (match) {
      now.setDate(now.getDate() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    if (relText.includes('昨天')) {
      now.setDate(now.getDate() - 1);
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    match = relText.match(/(\d+)\s*hour/i);
    if (match) {
      now.setHours(now.getHours() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    match = relText.match(/(\d+)\s*min/i);
    if (match) {
      now.setMinutes(now.getMinutes() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    match = relText.match(/(\d+)\s*day/i);
    if (match) {
      now.setDate(now.getDate() - parseInt(match[1]));
      return now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    }

    return relText;
  }

  function getPostTime(shareBtn) {
    const btnRect = shareBtn.getBoundingClientRect();
    const taggedLinks = document.querySelectorAll('a[' + TIME_LINK_ATTR + ']');
    let best = null;
    let bestDist = Infinity;

    taggedLinks.forEach(tl => {
      const r = tl.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        const p = tl.parentElement?.getBoundingClientRect();
        if (!p || p.width === 0) return;
        if (p.top > btnRect.top) return;
        const dy = btnRect.top - p.top;
        if (dy < bestDist) { bestDist = dy; best = tl; }
      } else {
        if (r.top > btnRect.top) return;
        const dy = btnRect.top - r.top;
        if (dy < bestDist) { bestDist = dy; best = tl; }
      }
    });

    if (!best) return '';
    if (tooltipTimeCache.has(best)) {
      return tooltipTimeCache.get(best);
    }
    const relText = decodeObfuscatedText(best);
    return relativeTimeToAbsolute(relText);
  }

  const tooltipObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const tooltip = node.getAttribute?.('role') === 'tooltip' ? node : node.querySelector?.('[role="tooltip"]');
        if (tooltip) {
          const text = tooltip.textContent?.trim();
          if (text && text.match(/\d{4}年/)) {
            const taggedLinks = document.querySelectorAll('a[' + TIME_LINK_ATTR + ']');
            const tooltipRect = tooltip.getBoundingClientRect();
            const cx = tooltipRect.left + tooltipRect.width / 2;
            const cy = tooltipRect.top;
            let best = null;
            let bestDist = Infinity;
            taggedLinks.forEach(tl => {
              const r = tl.closest('div')?.getBoundingClientRect();
              if (!r || r.width === 0) return;
              const dx = (r.left + r.width / 2) - cx;
              const dy = (r.top + r.height / 2) - cy;
              const dist = dx * dx + dy * dy;
              if (dist < bestDist) { bestDist = dist; best = tl; }
            });
            if (best) {
              tooltipTimeCache.set(best, text);
            }
          }
        }
      }
    }
  });
  tooltipObserver.observe(document.body, { childList: true, subtree: true });

  function getPostUrl(shareBtn) {
    if (window.location.pathname.includes('/posts/') ||
        window.location.pathname.includes('/permalink/') ||
        window.location.pathname.includes('/videos/') ||
        window.location.pathname.startsWith('/watch') ||
        window.location.pathname.startsWith('/reel/') ||
        window.location.href.includes('story_fbid') ||
        window.location.href.includes('pfbid')) {
      return window.location.href.split('?')[0];
    }

    const btnRect = shareBtn.getBoundingClientRect();

    const videoDivs = document.querySelectorAll('[data-video-id]');
    for (const vd of videoDivs) {
      const r = vd.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.top > btnRect.top) continue;
      if (btnRect.top - r.top < 800) {
        return 'https://www.facebook.com/watch/?v=' + vd.getAttribute('data-video-id');
      }
    }

    const allLinks = document.querySelectorAll('a[href]');
    let profileId = null;
    let username = null;
    let fbid = null;
    let directPostUrl = null;

    for (const a of allLinks) {
      try {
        const r = a.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.top > btnRect.top) continue;
        if (btnRect.top - r.top > 800) continue;

        const u = new URL(a.href);
        const p = u.pathname;

        if (p.includes('/posts/') || a.href.includes('pfbid') || p.includes('/permalink/') || u.search.includes('story_fbid')) {
          directPostUrl = a.href.split('?')[0];
        }
        if (p === '/watch/' && u.searchParams.get('v')) {
          directPostUrl = 'https://www.facebook.com/watch/?v=' + u.searchParams.get('v');
        }
        if (p.startsWith('/reel/') || p.startsWith('/watch/')) {
          if (!directPostUrl) directPostUrl = a.href.split('?')[0];
        }
        if (p.includes('/videos/')) {
          if (!directPostUrl) directPostUrl = a.href.split('?')[0];
        }

        if (p === '/profile.php' && u.searchParams.get('id')) {
          profileId = u.searchParams.get('id');
        } else if (p.length > 1 && !p.startsWith('/photo') &&
                   !p.startsWith('/stories') && !p.startsWith('/groups') &&
                   !p.startsWith('/marketplace') && !p.startsWith('/watch') &&
                   !p.startsWith('/reel') && p !== '/' && !username) {
          username = p.replace(/\/$/, '');
        }

        if ((p === '/photo/' || p === '/photo') && u.searchParams.get('fbid')) {
          fbid = u.searchParams.get('fbid');
        }
      } catch (e) {}
    }

    if (directPostUrl) return directPostUrl;
    if (fbid && profileId) {
      return 'https://www.facebook.com/permalink.php?story_fbid=' + fbid + '&id=' + profileId;
    }
    if (fbid && username) {
      return 'https://www.facebook.com' + username + '/posts/' + fbid;
    }
    if (profileId) {
      return 'https://www.facebook.com/profile.php?id=' + profileId;
    }
    if (username) {
      return 'https://www.facebook.com' + username;
    }

    return window.location.href;
  }

  function createReportButton(shareBtn) {
    const btn = document.createElement('button');
    btn.className = REPORT_BTN_CLASS;
    btn.title = 'Report location issue';
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const postUrl = getPostUrl(shareBtn);
      const postTime = getPostTime(shareBtn);
      openReportPopup(postUrl, postTime);
    });
    return btn;
  }

  function openReportPopup(postUrl, postTime) {
    if (document.querySelector('.threads-report-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'threads-report-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const popup = document.createElement('div');
    popup.className = 'threads-report-popup';
    popup.innerHTML = `
      <div class="threads-report-popup-header">
        <h2>Report Location Issue</h2>
        <button class="threads-report-close-btn">&times;</button>
      </div>
      <div class="threads-report-popup-body">
        <div class="threads-report-field">
          <label>Post URL</label>
          <input type="text" id="threads-report-url">
        </div>
        <div class="threads-report-field">
          <label>Post Time</label>
          <input type="text" id="threads-report-time" placeholder="Paste or type post time">
        </div>
        <div class="threads-report-field">
          <label>Click on the map to set location</label>
          <div id="threads-report-map"></div>
        </div>
        <div class="threads-report-field">
          <label>Paste coordinates</label>
          <input type="text" id="threads-report-latlng" placeholder="23.5, 120.5">
        </div>
        <div class="threads-report-coords">
          <div class="threads-report-field">
            <label>Latitude</label>
            <input type="text" id="threads-report-lat" placeholder="23.5">
          </div>
          <div class="threads-report-field">
            <label>Longitude</label>
            <input type="text" id="threads-report-lng" placeholder="120.5">
          </div>
        </div>
        <div class="threads-report-field">
          <label>Notes</label>
          <textarea id="threads-report-notes" placeholder="Describe the issue..."></textarea>
        </div>
        <button class="threads-report-submit-btn" id="threads-report-submit">Submit Report</button>
        <div class="threads-report-status" id="threads-report-status"></div>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    document.getElementById('threads-report-url').value = postUrl;
    document.getElementById('threads-report-time').value = postTime;
    overlay.querySelector('.threads-report-close-btn').addEventListener('click', () => overlay.remove());

    initMap();

    document.getElementById('threads-report-submit').addEventListener('click', () => submitReport());
  }

  function initMap() {
    const mapContainer = document.getElementById('threads-report-map');
    if (!mapContainer) return;
    setupMap();
  }

  function setupMap() {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: chrome.runtime.getURL('images/marker-icon-2x.png'),
      iconUrl: chrome.runtime.getURL('images/marker-icon.png'),
      shadowUrl: chrome.runtime.getURL('images/marker-shadow.png'),
    });

    const map = L.map('threads-report-map').setView([23.5, 121], 7);

    L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: '&copy; NLSC'
    }).addTo(map);

    let marker = null;

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      document.getElementById('threads-report-lat').value = lat.toFixed(6);
      document.getElementById('threads-report-lng').value = lng.toFixed(6);
      document.getElementById('threads-report-latlng').value = lat.toFixed(6) + ', ' + lng.toFixed(6);

      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng).addTo(map);
      }
    });

    const latInput = document.getElementById('threads-report-lat');
    const lngInput = document.getElementById('threads-report-lng');
    const updateFromInputs = () => {
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        const latlng = L.latLng(lat, lng);
        if (marker) {
          marker.setLatLng(latlng);
        } else {
          marker = L.marker(latlng).addTo(map);
        }
        map.setView(latlng, map.getZoom());
      }
    };
    latInput.addEventListener('change', updateFromInputs);
    lngInput.addEventListener('change', updateFromInputs);

    const latlngInput = document.getElementById('threads-report-latlng');
    const parseAndUpdate = () => {
      const val = latlngInput.value.trim();
      const parts = val.split(/[,\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          latInput.value = lat.toFixed(6);
          lngInput.value = lng.toFixed(6);
          updateFromInputs();
        }
      }
    };
    latlngInput.addEventListener('input', parseAndUpdate);
    latlngInput.addEventListener('change', parseAndUpdate);

    setTimeout(() => map.invalidateSize(), 100);
  }

  function extractFormId(formUrl) {
    const match = formUrl.match(/\/forms\/d\/e\/([^/]+)/) || formUrl.match(/\/forms\/d\/([^/]+)/);
    return match ? match[1] : null;
  }

  function buildSubmitUrl(formUrl, formId) {
    if (formUrl.includes('/d/e/')) {
      return `https://docs.google.com/forms/u/0/d/e/${formId}/formResponse`;
    }
    return `https://docs.google.com/forms/d/${formId}/formResponse`;
  }

  function submitReport() {
    const postUrl = document.getElementById('threads-report-url').value;
    const postTime = document.getElementById('threads-report-time').value;
    const lat = document.getElementById('threads-report-lat').value;
    const lng = document.getElementById('threads-report-lng').value;
    const notes = document.getElementById('threads-report-notes').value;
    const statusEl = document.getElementById('threads-report-status');
    const submitBtn = document.getElementById('threads-report-submit');

    if (!lat || !lng) {
      statusEl.className = 'threads-report-status error';
      statusEl.textContent = 'Please select a location on the map.';
      return;
    }

    chrome.storage.sync.get(['formUrl', 'fieldUrl', 'fieldTime', 'fieldLat', 'fieldLng', 'fieldNotes'], (config) => {
      if (!config.formUrl) {
        statusEl.className = 'threads-report-status error';
        statusEl.textContent = 'Google Form URL not configured. Please set it in extension options.';
        return;
      }

      const formId = extractFormId(config.formUrl);
      if (!formId) {
        statusEl.className = 'threads-report-status error';
        statusEl.textContent = 'Invalid Google Form URL in settings.';
        return;
      }

      submitBtn.disabled = true;
      statusEl.className = 'threads-report-status';
      statusEl.textContent = 'Submitting...';

      const submitUrl = buildSubmitUrl(config.formUrl, formId);
      const params = new URLSearchParams();
      params.append(config.fieldUrl || 'entry.0', postUrl);
      if (config.fieldTime) {
        params.append(config.fieldTime, postTime);
      }
      params.append(config.fieldLat || 'entry.1', lat);
      params.append(config.fieldLng || 'entry.2', lng);
      if (config.fieldNotes) {
        params.append(config.fieldNotes, notes);
      }

      fetch(submitUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).then(() => {
        statusEl.className = 'threads-report-status success';
        statusEl.textContent = 'Report submitted successfully!';
        submitBtn.disabled = false;
        setTimeout(() => {
          document.querySelector('.threads-report-overlay')?.remove();
        }, 1500);
      }).catch(() => {
        statusEl.className = 'threads-report-status error';
        statusEl.textContent = 'Failed to submit. Please try again.';
        submitBtn.disabled = false;
      });
    });
  }

  function findShareButtons() {
    const allBtns = document.querySelectorAll('[role="button"]');
    const shareBtns = [];
    allBtns.forEach((btn) => {
      const label = btn.getAttribute('aria-label') || '';
      if (label.includes('傳送給朋友') || label.includes('Send to friends') ||
          label === 'Share' || label === '分享') {
        shareBtns.push(btn);
      }
    });
    if (shareBtns.length === 0) {
      allBtns.forEach((btn) => {
        const spans = btn.querySelectorAll('span');
        const hasShareText = Array.from(spans).some(s => {
          const t = s.textContent?.trim();
          return t === '分享' || t === 'Share';
        });
        if (hasShareText && btn.querySelector('svg')) {
          shareBtns.push(btn);
        }
      });
    }
    return shareBtns;
  }

  function findAndAddButtons() {
    const shareBtns = findShareButtons();

    shareBtns.forEach((shareBtn) => {
      const wrapper = shareBtn.parentElement;
      if (!wrapper) return;

      const actionBar = wrapper.parentElement;
      if (!actionBar) return;

      if (actionBar.getAttribute(PROCESSED_ATTR)) return;

      const reportBtn = createReportButton(shareBtn);

      actionBar.appendChild(reportBtn);
      actionBar.setAttribute(PROCESSED_ATTR, 'true');
    });
  }

  tagAllTimeLinks();
  findAndAddButtons();

  const observer = new MutationObserver(() => {
    tagAllTimeLinks();
    findAndAddButtons();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
