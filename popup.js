document.addEventListener('DOMContentLoaded', () => {
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');
  const applyButton = document.getElementById('applyFilter');
  const clearButton = document.getElementById('clearFilter');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['minPrice', 'maxPrice'], (result) => {
    if (result.minPrice !== undefined) {
      minPriceInput.value = result.minPrice;
    }
    if (result.maxPrice !== undefined) {
      maxPriceInput.value = result.maxPrice;
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    setTimeout(() => {
      statusDiv.className = 'status-message';
    }, 3000);
  }

  applyButton.addEventListener('click', () => {
    const minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    const maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;

    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      showStatus('Il prezzo minimo non può essere maggiore del massimo', 'error');
      return;
    }

    chrome.storage.local.set({ minPrice, maxPrice }, () => {
      showStatus('Filtro applicato con successo!', 'success');
      
      // Send message to content script to apply filter
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'applyFilter',
            minPrice,
            maxPrice
          });
        }
      });
    });
  });

  clearButton.addEventListener('click', () => {
    minPriceInput.value = '';
    maxPriceInput.value = '';
    
    chrome.storage.local.remove(['minPrice', 'maxPrice'], () => {
      showStatus('Filtro rimosso', 'info');
      
      // Send message to content script to clear filter
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'clearFilter'
          });
        }
      });
    });
  });
});
