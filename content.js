// Content script for Subito.it price filter

let currentMinPrice = null;
let currentMaxPrice = null;
let filterVisible = true;

// Function to extract price from price text
function extractPrice(priceText) {
  if (!priceText) return null;
  // Remove "€" and dots (thousands separators), replace comma with dot
  const cleaned = priceText.replace(/[€\.]/g, '').replace(',', '.').trim();
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

// Function to filter listings
function filterListings() {
  if (currentMinPrice === null && currentMaxPrice === null) {
    // No filter active, show all
    document.querySelectorAll('.index-module_card__dW0sY').forEach(card => {
      card.classList.remove('price-filtered-out');
    });
    // Still update indicator to remove it
    updateStatusIndicator(0, document.querySelectorAll('.index-module_card__dW0sY').length);
    return;
  }

  let hiddenCount = 0;
  let visibleCount = 0;

  document.querySelectorAll('.index-module_card__dW0sY').forEach(card => {
    const priceElement = card.querySelector('.index-module_price__Fc9-u');
    if (!priceElement) {
      // If no price element found, keep visible
      card.classList.remove('price-filtered-out');
      visibleCount++;
      return;
    }

    const price = extractPrice(priceElement.textContent);
    
    if (price === null) {
      // Can't determine price, keep visible
      card.classList.remove('price-filtered-out');
      visibleCount++;
      return;
    }

    let shouldHide = false;

    if (currentMinPrice !== null && price < currentMinPrice) {
      shouldHide = true;
    }

    if (currentMaxPrice !== null && price > currentMaxPrice) {
      shouldHide = true;
    }

    if (shouldHide && filterVisible) {
      card.classList.add('price-filtered-out');
      hiddenCount++;
    } else {
      card.classList.remove('price-filtered-out');
      visibleCount++;
    }
  });

  // Update or create status indicator
  updateStatusIndicator(hiddenCount, visibleCount);
}

// Function to update status indicator
function updateStatusIndicator(hiddenCount, visibleCount) {
  let indicator = document.getElementById('price-filter-status');
  
  if (currentMinPrice === null && currentMaxPrice === null) {
    if (indicator) {
      indicator.remove();
    }
    return;
  }

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'price-filter-status';
    indicator.className = 'price-filter-status';
    
    // Insert after the search bar container
    const searchContainer = document.querySelector('.search-bar-module-scss-module__lbtjpG__searchbar-container');
    if (searchContainer) {
      searchContainer.parentNode.insertBefore(indicator, searchContainer.nextSibling);
    }
  }

  const minText = currentMinPrice !== null ? `€${currentMinPrice}` : 'Nessun minimo';
  const maxText = currentMaxPrice !== null ? `€${currentMaxPrice}` : 'Nessun massimo';
  const toggleText = filterVisible ? '✓ Mostra' : '✕ Nascondi' ;
  
  indicator.innerHTML = `
    <span class="price-filter-status-text">
      🔍 Filtro prezzo: ${minText} - ${maxText} |
      ${hiddenCount} nascosti, ${visibleCount} visibili
      <button class="price-filter-toggle-btn" id="price-filter-toggle-btn">${toggleText}</button>
    </span>
  `;

  // Attach event listeners
  const toggleBtn = document.getElementById('price-filter-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleFilter);
  }
  
  const clearBtn = document.getElementById('price-filter-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearFilter);
  }
}

// Function to toggle filter visibility
function toggleFilter() {
  filterVisible = !filterVisible;
  filterListings();
}

// Function to clear filter
function clearFilter() {
  currentMinPrice = null;
  currentMaxPrice = null;
  filterVisible = true;
  filterListings();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'applyFilter') {
    currentMinPrice = request.minPrice;
    currentMaxPrice = request.maxPrice;
    filterListings();
  } else if (request.action === 'clearFilter') {
    clearFilter();
  }
});

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.local.get(['minPrice', 'maxPrice'], (result) => {
    if (result.minPrice !== undefined || result.maxPrice !== undefined) {
      currentMinPrice = result.minPrice !== undefined ? result.minPrice : null;
      currentMaxPrice = result.maxPrice !== undefined ? result.maxPrice : null;
      
      // Wait a bit for the page to render
      setTimeout(filterListings, 1000);
    }
  });
});

// Also try to run immediately in case DOMContentLoaded already fired
setTimeout(() => {
  chrome.storage.local.get(['minPrice', 'maxPrice'], (result) => {
    if (result.minPrice !== undefined || result.maxPrice !== undefined) {
      currentMinPrice = result.minPrice !== undefined ? result.minPrice : null;
      currentMaxPrice = result.maxPrice !== undefined ? result.maxPrice : null;
      filterListings();
    }
  });
}, 2000);

// Observe for dynamic content changes (infinite scroll, etc.)
const observer = new MutationObserver((mutations) => {
  let shouldRefilter = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList && node.classList.contains('index-module_card__dW0sY')) {
            shouldRefilter = true;
            break;
          }
          if (node.querySelector && node.querySelector('.index-module_card__dW0sY')) {
            shouldRefilter = true;
            break;
          }
        }
      }
    }
    if (shouldRefilter) break;
  }
  
  if (shouldRefilter && (currentMinPrice !== null || currentMaxPrice !== null)) {
    setTimeout(filterListings, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
