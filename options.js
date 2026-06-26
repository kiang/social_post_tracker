document.getElementById('save').addEventListener('click', () => {
  const config = {
    formUrl: document.getElementById('formUrl').value.trim(),
    fieldUrl: document.getElementById('fieldUrl').value.trim(),
    fieldTime: document.getElementById('fieldTime').value.trim(),
    fieldLat: document.getElementById('fieldLat').value.trim(),
    fieldLng: document.getElementById('fieldLng').value.trim(),
    fieldNotes: document.getElementById('fieldNotes').value.trim()
  };

  chrome.storage.sync.set(config, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
});

chrome.storage.sync.get(['formUrl', 'fieldUrl', 'fieldTime', 'fieldLat', 'fieldLng', 'fieldNotes'], (config) => {
  document.getElementById('formUrl').value = config.formUrl || '';
  document.getElementById('fieldUrl').value = config.fieldUrl || '';
  document.getElementById('fieldTime').value = config.fieldTime || '';
  document.getElementById('fieldLat').value = config.fieldLat || '';
  document.getElementById('fieldLng').value = config.fieldLng || '';
  document.getElementById('fieldNotes').value = config.fieldNotes || '';
});
