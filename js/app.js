/**
 * Spixi Mini Apps Directory
 * Main JavaScript file
 * 
 * Apps are loaded from data/apps.json
 * Community can submit apps via GitHub PRs
 */

// DOM Elements
const appGrid = document.getElementById('app-grid');
const searchInput = document.getElementById('search-input');
const categoryFilters = document.getElementById('category-filters');
const loadMoreBtn = document.getElementById('load-more-btn');

// State
let apps = [];
let categories = [];
let activeCategory = 'All';
let searchTerm = '';
let displayedCount = 9; // Initial number of apps to show
const appsPerPage = 6; // Number of apps to load on "load more"

/**
 * Fetch apps data from JSON file
 */
async function fetchApps() {
  try {
    const response = await fetch('data/apps.json');
    const data = await response.json();
    apps = data.apps;
    categories = data.categories;
    renderApps();
    updateLoadMoreVisibility();
  } catch (error) {
    console.error('Error loading apps:', error);
    if (appGrid) {
      appGrid.innerHTML = '<p style="color: var(--color-text-02); padding: var(--spacing-xl); text-align: center;">Failed to load apps. Please try again later.</p>';
    }
  }
}

/**
 * Get filtered apps based on category and search
 */
function getFilteredApps() {
  let filtered = apps;
  
  // Filter by category
  if (activeCategory !== 'All') {
    filtered = filtered.filter(app => app.category === activeCategory);
  }
  
  // Filter by search
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(app => 
      app.name.toLowerCase().includes(term) ||
      app.description.toLowerCase().includes(term) ||
      app.publisher.toLowerCase().includes(term)
    );
  }
  
  return filtered;
}

/**
 * Render app cards to the grid
 */
function renderApps() {
  if (!appGrid) return;
  
  const filteredApps = getFilteredApps();
  const appsToShow = filteredApps.slice(0, displayedCount);
  
  if (appsToShow.length === 0) {
    appGrid.innerHTML = `
      <div class="empty-state">
        <img src="assets/icons/SmileyMeh.svg" alt="" class="empty-state__icon">
        <h3 class="empty-state__title">No apps found</h3>
        <p class="empty-state__description">Try adjusting your search or filter to find what you're looking for.</p>
      </div>
    `;
    return;
  }
  
  appGrid.innerHTML = appsToShow.map(app => createAppCard(app)).join('');
  updateLoadMoreVisibility();
}

/**
 * Create HTML for a single app card
 * @param {Object} app - App data object
 * @returns {string} - HTML string
 */
function createAppCard(app) {
  const githubLink = app.github 
    ? `<a href="${app.github}" class="app-card__github" target="_blank" rel="noopener noreferrer" aria-label="View on GitHub">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor">
          <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H108A59.75,59.75,0,0,0,60,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,40,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,80,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40h8v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,200,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM184,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.55a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h16.36a8,8,0,0,0,6.71-3.97,43.88,43.88,0,0,1,32.32-20.06A43.81,43.81,0,0,1,176,73.55a8,8,0,0,0,1.1,7.97A41.74,41.74,0,0,1,184,104Z"/>
        </svg>
      </a>` 
    : '';

  // Determine the action URL (spixi deep link or file)
  const actionUrl = app.spixiUrl || (app.files && app.files.spixi) || '#';

  return `
    <article class="app-card">
      <div class="app-card__header">
        <img class="app-card__icon" src="${app.icon}" alt="${app.name}" onerror="this.src='assets/images/placeholder-app.png'">
        <span class="badge">${app.category}</span>
      </div>
      <div class="app-card__content">
        <div class="app-card__details">
          <div class="app-card__meta">
            <h3 class="app-card__title">${app.name}</h3>
            <p class="app-card__publisher">${app.publisher}</p>
          </div>
          <p class="app-card__description">${app.description}</p>
        </div>
      </div>
      <div class="app-card__footer">
        <a href="${actionUrl}" class="btn btn-sm btn-outlined">
          <span class="btn__label">Try in Spixi</span>
          <span class="btn__icon btn__icon--trailing">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
              <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"/>
            </svg>
          </span>
        </a>
        ${githubLink}
      </div>
    </article>
  `;
}

/**
 * Filter apps by category
 * @param {string} category - Category to filter by
 */
function filterByCategory(category) {
  activeCategory = category;
  displayedCount = 9; // Reset to initial count
  renderApps();
  updateCategoryButtons();
}

/**
 * Update category filter button states
 */
function updateCategoryButtons() {
  const buttons = document.querySelectorAll('.chip');
  buttons.forEach(btn => {
    if (btn.dataset.category === activeCategory) {
      btn.classList.remove('chip--default');
      btn.classList.add('chip--selected');
    } else {
      btn.classList.remove('chip--selected');
      btn.classList.add('chip--default');
    }
  });
}

/**
 * Handle search input
 * @param {string} query - Search query
 */
function handleSearch(query) {
  searchTerm = query;
  displayedCount = 9; // Reset to initial count
  renderApps();
}

/**
 * Load more apps
 */
function loadMore() {
  displayedCount += appsPerPage;
  renderApps();
}

/**
 * Update load more button visibility
 */
function updateLoadMoreVisibility() {
  if (!loadMoreBtn) return;
  
  const filteredApps = getFilteredApps();
  if (displayedCount >= filteredApps.length) {
    loadMoreBtn.style.display = 'none';
  } else {
    loadMoreBtn.style.display = 'inline-flex';
  }
}

/**
 * Get featured apps
 * @returns {Array} - Array of featured apps
 */
function getFeaturedApps() {
  return apps.filter(app => app.featured);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  fetchApps();
  
  // Search input listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
  }
  
  // Category filter listeners
  if (categoryFilters) {
    categoryFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.category) {
        filterByCategory(chip.dataset.category);
      }
    });
  }
  
  // Load more button listener
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMore);
  }

  // Modal functionality
  setupModal();
});

/**
 * Setup modal functionality
 */
function setupModal() {
  const modalOverlay = document.getElementById('modal-overlay');
  const appModal = document.getElementById('app-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const copyBtn = document.getElementById('copy-url-btn');

  if (!modalOverlay || !appModal || !closeBtn) return;

  // Close modal function
  function closeModal() {
    modalOverlay.classList.add('modal-overlay--closing');
    setTimeout(() => {
      modalOverlay.style.display = 'none';
      modalOverlay.classList.remove('modal-overlay--closing');
      document.body.style.overflow = '';
    }, 200);
  }

  // Close button click
  closeBtn.addEventListener('click', closeModal);

  // Close on overlay click (outside modal)
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display !== 'none') {
      closeModal();
    }
  });

  // Copy URL functionality - make entire container clickable
  const urlContainer = document.querySelector('.modal__url-container');
  if (urlContainer) {
    urlContainer.addEventListener('click', async () => {
      const urlText = document.getElementById('modal-app-url').textContent;
      try {
        await navigator.clipboard.writeText(urlText);
        showToast('Copied to clipboard');
      } catch (err) {
        console.error('Failed to copy URL:', err);
        showToast('Failed to copy URL');
      }
    });
  }

  // Delegate click events for "Try in Spixi" buttons
  document.addEventListener('click', (e) => {
    const tryBtn = e.target.closest('.app-card__footer .btn');
    if (tryBtn && tryBtn.textContent.includes('Try in Spixi')) {
      e.preventDefault();

      // Get app data from the card
      const appCard = tryBtn.closest('.app-card');
      if (!appCard) return;

      const appData = {
        icon: appCard.querySelector('.app-card__icon')?.src || '',
        title: appCard.querySelector('.app-card__title')?.textContent || 'App Title',
        category: appCard.querySelector('.badge')?.textContent || 'Category',
        publisher: appCard.querySelector('.app-card__publisher')?.textContent || 'Publisher',
        description: appCard.querySelector('.app-card__description')?.textContent || 'No description available.',
        url: tryBtn.href || window.location.origin + '/apps/sample-app'
      };

      // Populate modal with app data
      openModal(appData);
    }
  });
}

/**
 * Open modal with app data
 * @param {Object} appData - App information
 */
function openModal(appData) {
  const modalOverlay = document.getElementById('modal-overlay');

  // Populate modal fields
  document.getElementById('modal-app-icon').src = appData.icon;
  document.getElementById('modal-app-title').textContent = appData.title;
  document.getElementById('modal-app-category').textContent = appData.category;
  document.getElementById('modal-app-publisher').textContent = appData.publisher;
  document.getElementById('modal-app-description').textContent = appData.description;
  document.getElementById('modal-app-url').textContent = appData.url;

  // For now, use a placeholder QR code image
  // Later this can be generated dynamically based on appData.url
  document.getElementById('modal-qr-code').src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTY2IiBoZWlnaHQ9IjE2NCIgdmlld0JveD0iMCAwIDE2NiAxNjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNjYiIGhlaWdodD0iMTY0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=';

  // Show modal
  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('toast--show');

  // Hide toast after 2 seconds
  setTimeout(() => {
    toast.classList.remove('toast--show');
  }, 2000);
}
