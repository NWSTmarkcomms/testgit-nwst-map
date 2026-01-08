// app.js — Static GitHub/Netlify version (no build tools)

const elements = {
  markerLayer: document.getElementById('markerLayer'),
  tooltip: document.getElementById('tooltip'),
  tooltipTitle: document.getElementById('tooltipTitle'),
  tooltipAddress: document.getElementById('tooltipAddress'),
  tooltipBadges: document.getElementById('tooltipBadges'),
  searchCenter: document.getElementById('searchCenter'),
  suggestions: document.getElementById('suggestions'),
  stateFilter: document.getElementById('stateFilter'),
  toggleSupport: document.getElementById('toggleSupport'),
  resetBtn: document.getElementById('resetBtn'),
  visibleCount: document.getElementById('visibleCount'),
  stateCount: document.getElementById('stateCount'),
  legend: document.getElementById('legend'),
};

let serviceCenters = [];
const brands = [
  { name: "Northwest Exterminating", className: "Northwest_Exterminating" },
  { name: "Carolina Pest Management", className: "Carolina_Pest_Management" },
  { name: "Sawyer Exterminating", className: "Sawyer_Exterminating" },
  { name: "Bug House Pest Control", className: "Bug_House_Pest_Control" },
  { name: "McCall Pest and Wildlife", className: "McCall_Pest_and_Wildlife" },
  { name: "Volunteer Rid-A-Pest", className: "Volunteer_Rid_A_Pest" },
];

let state = {
  searchQuery: '',
  selectedState: '',
  showSupportCenters: false,
  highlightedId: null,
  suggestionIndex: -1
};

function getBrandClassName(brandName) {
  return String(brandName || '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
}

function normalizeCenter(raw, idx){
  return {
    id: raw.id ?? (idx + 1),
    brandName: raw.brandName,
    serviceCenter: raw.serviceCenter,
    fullAddress: raw.fullAddress,
    city: raw.city,
    state: raw.state,
    zip: raw.zip,
    region: raw.region,
    branchNumber: raw.branchNumber,
    services: Array.isArray(raw.services) ? raw.services : [],
    isSupportCenter: Boolean(raw.isSupportCenter),
    position: raw.position || { xPercent: 50, yPercent: 50 },
  };
}

function getFilteredCenters() {
  return serviceCenters.filter(center => {
    if (center.isSupportCenter && !state.showSupportCenters) return false;
    if (state.selectedState && center.state !== state.selectedState) return false;

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchesSC = center.serviceCenter.toLowerCase().includes(q);
      const matchesCity = (center.city || '').toLowerCase().includes(q);
      const matchesBrand = (center.brandName || '').toLowerCase().includes(q);
      if (!matchesSC && !matchesCity && !matchesBrand) return false;
    }
    return true;
  });
}

function populateStateFilter() {
  const states = [...new Set(serviceCenters.map(sc => sc.state))].filter(Boolean).sort();
  elements.stateFilter.innerHTML =
    `<option value="">All States</option>` +
    states.map(st => `<option value="${st}">${st}</option>`).join('');
}

function renderLegend() {
  const visibleBrands = new Set(serviceCenters.map(c => c.brandName));
  elements.legend.innerHTML = brands
    .filter(b => visibleBrands.has(b.name))
    .map(b => `
      <div class="legend-item" data-brand="${b.name}">
        <div class="legend-swatch brand--${b.className}"></div>
        <span>${b.name}</span>
      </div>
    `).join('');

  elements.legend.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', () => {
      const brandName = item.dataset.brand;
      elements.searchCenter.value = brandName;
      state.searchQuery = brandName;
      renderMarkers();
      updateStats();
      hideSuggestions();
    });
  });
}

function renderMarkers() {
  elements.markerLayer.innerHTML = '';
  const filteredCenters = getFilteredCenters();
  const allCenters = serviceCenters.filter(c => (c.isSupportCenter ? state.showSupportCenters : true));

  allCenters.forEach(center => {
    const marker = document.createElement('div');
    const brandClass = `brand--${getBrandClassName(center.brandName)}`;
    const isFiltered = filteredCenters.some(fc => fc.id === center.id);
    const isHighlighted = state.highlightedId === center.id;

    marker.className = `marker ${brandClass}${!isFiltered ? ' is-dim' : ''}${isHighlighted ? ' is-highlighted is-active' : ''}`;
    marker.setAttribute('tabindex', isFiltered ? '0' : '-1');
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', `${center.serviceCenter}, ${center.city || ''}, ${center.state || ''}`);
    marker.dataset.id = center.id;

    marker.style.left = `${center.position.xPercent}%`;
    marker.style.top = `${center.position.yPercent}%`;

    marker.addEventListener('mouseenter', (e) => showTooltip(center, e));
    marker.addEventListener('mouseleave', hideTooltip);
    marker.addEventListener('focus', (e) => showTooltip(center, e));
    marker.addEventListener('blur', hideTooltip);
    marker.addEventListener('click', () => {
      state.highlightedId = (state.highlightedId === center.id) ? null : center.id;
      renderMarkers();
    });

    elements.markerLayer.appendChild(marker);
  });
}

function showTooltip(center, event) {
  const brandClass = getBrandClassName(center.brandName);

  elements.tooltipTitle.textContent = center.serviceCenter;
  elements.tooltipAddress.innerHTML = `
    ${center.fullAddress || ''}<br>
    <span style="opacity:.7; font-size:11px; margin-top:4px; display:block;">
      ${center.region != null ? `Region ${center.region}` : 'Region N/A'}
      ${center.branchNumber ? ` • Branch #${center.branchNumber}` : ''}
    </span>
  `;

  let badgesHTML = `<span class="badge ${brandClass}">${center.brandName}</span>`;
  if (center.isSupportCenter) {
    badgesHTML += `<span class="badge" style="border-color:#60a5fa; color:#60a5fa;">Support Center</span>`;
  }
  elements.tooltipBadges.innerHTML = badgesHTML;

  const marker = event.target;
  const rect = marker.getBoundingClientRect();
  const mapRect = elements.markerLayer.getBoundingClientRect();

  let left = rect.left - mapRect.left + 20;
  let top = rect.top - mapRect.top - 10;

  const tooltipWidth = 320;
  const tooltipHeight = 150;

  if (left + tooltipWidth > mapRect.width) left = rect.left - mapRect.left - tooltipWidth - 10;
  if (top + tooltipHeight > mapRect.height) top = mapRect.height - tooltipHeight - 20;
  if (top < 80) top = 80;

  elements.tooltip.style.left = `${left}px`;
  elements.tooltip.style.top = `${top}px`;
  elements.tooltip.classList.add('is-open');
}

function hideTooltip() {
  elements.tooltip.classList.remove('is-open');
}

function showSuggestions(query) {
  if (!query) { hideSuggestions(); return; }
  const q = query.toLowerCase();

  const matches = serviceCenters
    .filter(c => {
      if (c.isSupportCenter && !state.showSupportCenters) return false;
      return c.serviceCenter.toLowerCase().includes(q) ||
             (c.city || '').toLowerCase().includes(q) ||
             (c.brandName || '').toLowerCase().includes(q);
    })
    .slice(0, 10);

  if (matches.length === 0) {
    elements.suggestions.innerHTML = '<div class="suggestion-item" style="pointer-events:none; opacity:.5;">No matches found</div>';
    elements.suggestions.classList.add('active');
    return;
  }

  elements.suggestions.innerHTML = matches.map((center, idx) => {
    const brandClass = getBrandClassName(center.brandName);
    return `
      <div class="suggestion-item${idx === state.suggestionIndex ? ' selected' : ''}" data-id="${center.id}">
        <span>${center.serviceCenter} <span style="opacity:.6; font-size:11px;">${center.city || ''}, ${center.state || ''}</span></span>
        <span class="brand-tag ${brandClass}">${(center.brandName || '').split(' ')[0]}</span>
      </div>
    `;
  }).join('');

  elements.suggestions.classList.add('active');

  elements.suggestions.querySelectorAll('.suggestion-item[data-id]').forEach(item => {
    item.addEventListener('click', () => selectSuggestion(parseInt(item.dataset.id, 10)));
  });
}

function hideSuggestions() {
  elements.suggestions.classList.remove('active');
  state.suggestionIndex = -1;
}

function selectSuggestion(id) {
  const center = serviceCenters.find(c => c.id === id);
  if (!center) return;

  elements.searchCenter.value = center.serviceCenter;
  state.searchQuery = center.serviceCenter;
  state.highlightedId = id;

  renderMarkers();
  updateStats();
  hideSuggestions();

  const marker = elements.markerLayer.querySelector(`[data-id="${id}"]`);
  if (marker) marker.focus();
}

function updateStats() {
  const filtered = getFilteredCenters();
  const states = new Set(filtered.map(c => c.state).filter(Boolean));
  elements.visibleCount.textContent = filtered.length;
  elements.stateCount.textContent = states.size;
}

function setupEventListeners() {
  elements.searchCenter.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    state.suggestionIndex = -1;
    showSuggestions(e.target.value);
    renderMarkers();
    updateStats();
  });

  elements.searchCenter.addEventListener('focus', () => {
    if (elements.searchCenter.value) showSuggestions(elements.searchCenter.value);
  });

  elements.searchCenter.addEventListener('keydown', (e) => {
    const items = elements.suggestions.querySelectorAll('.suggestion-item[data-id]');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.suggestionIndex = Math.min(state.suggestionIndex + 1, items.length - 1);
      updateSuggestionHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.suggestionIndex = Math.max(state.suggestionIndex - 1, 0);
      updateSuggestionHighlight(items);
    } else if (e.key === 'Enter' && state.suggestionIndex >= 0) {
      e.preventDefault();
      const item = items[state.suggestionIndex];
      if (item) selectSuggestion(parseInt(item.dataset.id, 10));
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) hideSuggestions();
  });

  elements.stateFilter.addEventListener('change', (e) => {
    state.selectedState = e.target.value;
    state.highlightedId = null;
    renderMarkers();
    updateStats();
  });

  elements.toggleSupport.addEventListener('change', (e) => {
    state.showSupportCenters = e.target.checked;
    renderMarkers();
    updateStats();
  });

  elements.resetBtn.addEventListener('click', () => {
    state = { searchQuery:'', selectedState:'', showSupportCenters:false, highlightedId:null, suggestionIndex:-1 };
    elements.searchCenter.value = '';
    elements.stateFilter.value = '';
    elements.toggleSupport.checked = false;
    hideSuggestions();
    renderMarkers();
    updateStats();
  });
}

function updateSuggestionHighlight(items) {
  items.forEach((item, idx) => item.classList.toggle('selected', idx === state.suggestionIndex));
}

async function loadData(){
  const res = await fetch('./service_centers.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load service_centers.json (${res.status})`);
  const data = await res.json();
  serviceCenters = data.map(normalizeCenter);
}

async function init() {
  await loadData();
  populateStateFilter();
  renderLegend();
  renderMarkers();
  setupEventListeners();
  updateStats();
}

init().catch(err => {
  console.error(err);
  alert('Failed to load data. If you are opening index.html directly, use a local server (or deploy to GitHub Pages/Netlify).');
});
