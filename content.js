(function () {
  'use strict';

  const REPORT_BTN_CLASS = 'threads-report-btn';
  const PROCESSED_ATTR = 'data-report-btn-added';

  function getPostUrl(shareSvg) {
    let el = shareSvg;
    for (let i = 0; i < 15; i++) {
      el = el.parentElement;
      if (!el) break;
      const link = el.querySelector('a[href*="/post/"]');
      if (link) return link.href;
    }
    if (window.location.pathname.includes('/post/')) {
      return window.location.href;
    }
    return window.location.href;
  }

  function createReportButton(postUrl) {
    const btn = document.createElement('button');
    btn.className = REPORT_BTN_CLASS;
    btn.title = 'Report location issue';
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openReportPopup(postUrl);
    });
    return btn;
  }

  function openReportPopup(postUrl) {
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
          <input type="text" id="threads-report-url" readonly>
        </div>
        <div class="threads-report-field">
          <label>Click on the map to set location</label>
          <div id="threads-report-map"></div>
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
    overlay.querySelector('.threads-report-close-btn').addEventListener('click', () => overlay.remove());

    initMap();

    document.getElementById('threads-report-submit').addEventListener('click', () => submitReport());
  }

  function initMap() {
    const mapContainer = document.getElementById('threads-report-map');
    if (!mapContainer) return;

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (typeof L !== 'undefined') {
      setupMap();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = setupMap;
    document.head.appendChild(script);
  }

  function setupMap() {
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

    chrome.storage.sync.get(['formUrl', 'fieldUrl', 'fieldLat', 'fieldLng', 'fieldNotes'], (config) => {
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

  function findAndAddButtons() {
    const shareSvgs = document.querySelectorAll('svg[aria-label="分享"], svg[aria-label="Share"], svg[aria-label="Compartir"], svg[aria-label="Partager"], svg[aria-label="Teilen"], svg[aria-label="共有"]');

    shareSvgs.forEach((shareSvg) => {
      const shareRoleBtn = shareSvg.closest('div[role="button"]');
      if (!shareRoleBtn) return;

      // The structure is: actionBar > wrapper(per button) > div[role="button"]
      const shareWrapper = shareRoleBtn.parentElement;
      if (!shareWrapper) return;

      const actionBar = shareWrapper.parentElement;
      if (!actionBar) return;

      if (actionBar.getAttribute(PROCESSED_ATTR)) return;

      const postUrl = getPostUrl(shareSvg);
      const reportBtn = createReportButton(postUrl);

      actionBar.appendChild(reportBtn);
      actionBar.setAttribute(PROCESSED_ATTR, 'true');
    });
  }

  findAndAddButtons();

  const observer = new MutationObserver(() => findAndAddButtons());
  observer.observe(document.body, { childList: true, subtree: true });
})();
