const API_KEY = '7a64a691'; // OMDb API key
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsSection = document.getElementById('resultsSection');
const watchlistSection = document.getElementById('watchlistSection');
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const closeModal = document.getElementById('closeModal');

let watchlist = JSON.parse(localStorage.getItem('watchlist_v2') || '[]');

function saveWatchlist() {
  localStorage.setItem('watchlist_v2', JSON.stringify(watchlist));
}

async function searchOMDb(query) {
  const q = query.trim();
  if(!q) return [];
  try {
    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json();
    if(data && data.Search) return data.Search;
    return [];
  } catch (e) {
    console.error('OMDb search error', e);
    return [];
  }
}

async function fetchDetails(imdbID) {
  try {
    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${encodeURIComponent(imdbID)}&plot=short`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('OMDb detail fetch error', e);
    return null;
  }
}

async function renderSearchResults(query) {
  resultsSection.innerHTML = '<p style="color:#9aa3b2;padding:18px">Searching...</p>';
  const items = await searchOMDb(query);
  if(!items || items.length === 0) {
    resultsSection.innerHTML = `<p style="color:#9aa3b2;padding:18px">No results found.</p>`;
    return;
  }
  resultsSection.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x420?text=No+Poster';
    card.innerHTML = `
      <img src="${poster}" alt="${escapeHtml(item.Title)}" />
      <div class="info">
        <h3>${escapeHtml(item.Title)}</h3>
        <p>${item.Year || ''} • ${item.Type || ''}</p>
        <button class="add-btn" data-id="${item.imdbID}">Add to Watchlist</button>
      </div>
    `;
    resultsSection.appendChild(card);
  });

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const full = await fetchDetails(id);
      if(!full) return alert('Unable to fetch details.');
      const normalized = {
        Title: full.Title || 'Unknown',
        Year: full.Year || '',
        Type: full.Type || 'movie',
        Poster: (full.Poster && full.Poster !== 'N/A') ? full.Poster : 'https://via.placeholder.com/300x420?text=No+Poster',
        imdbID: full.imdbID,
        imdbRating: full.imdbRating || 'N/A',
        totalEpisodes: null,
        userOverall: null,
        episodeRatings: {}
      };
      if(!watchlist.find(w => w.imdbID === normalized.imdbID)) {
        watchlist.unshift(normalized);
        saveWatchlist();
        renderWatchlist();
        alert(`${normalized.Title} added to Watchlist`);
      } else alert('Already in Watchlist');
    };
  });
}

function renderWatchlist() {
  watchlistSection.innerHTML = '';
  if(watchlist.length === 0) {
    watchlistSection.innerHTML = `<p style="color:#9aa3b2;padding:18px">Your watchlist is empty. Search and add items.</p>`;
    return;
  }
  watchlist.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x420?text=No+Poster';
    const userAvg = computeUserAverage(item);
    card.innerHTML = `
      <img src="${poster}" alt="${escapeHtml(item.Title)}" />
      <div class="info">
        <h3>${escapeHtml(item.Title)}</h3>
        <p>IMDb: ${item.imdbRating || '—'}</p>
        <p>Your Avg: ${userAvg !== null ? userAvg.toFixed(1) : '—'}</p>
        <button class="view-btn" data-idx="${idx}">View & Rate</button>
        <button class="remove-btn" data-idx="${idx}" style="margin-left:8px;background:#ff7a7a">Remove</button>
      </div>
    `;
    watchlistSection.appendChild(card);
  });

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      openDetailModal(idx);
    };
  });
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      if(confirm('Remove from watchlist?')) {
        watchlist.splice(idx, 1);
        saveWatchlist();
        renderWatchlist();
      }
    };
  });
}

function computeUserAverage(item) {
  if(item.userOverall != null && item.userOverall !== '') return Number(item.userOverall);
  const keys = Object.keys(item.episodeRatings || {});
  if(keys.length === 0) return null;
  const nums = keys.map(k => Number(item.episodeRatings[k])).filter(n => !isNaN(n));
  if(nums.length === 0) return null;
  const sum = nums.reduce((a,b)=>a+b,0);
  return sum/nums.length;
}

function openDetailModal(idx) {
  const item = watchlist[idx];
  detailContent.innerHTML = '';
  const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : 'https://via.placeholder.com/300x420?text=No+Poster';
  const imdb = item.imdbRating || 'N/A';
  const userAvg = computeUserAverage(item);
  detailContent.innerHTML = `
    <h2 style="margin-top:0">${escapeHtml(item.Title)}</h2>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <img src="${poster}" style="width:180px;border-radius:8px" />
      <div style="flex:1;text-align:left">
        <p><strong>Year:</strong> ${escapeHtml(item.Year || '')}</p>
        <p><strong>IMDb Rating:</strong> ${imdb}</p>
        <p><strong>Your overall rating:</strong> <input id="userOverallInput" type="number" min="0" max="10" step="0.1" value="${item.userOverall != null ? item.userOverall : ''}" class="rate-input" /></p>
        <p><strong>Computed Avg (from episodes):</strong> ${userAvg != null ? userAvg.toFixed(2) : '—'}</p>
        <div style="margin-top:10px">
          <label>Is this a series? <select id="isSeriesSelect"><option value="no">No (movie)</option><option value="yes">Yes (series)</option></select></label>
        </div>
        <div id="episodesSetup" style="margin-top:10px;display:none">
          <label>Number of episodes: <input id="episodesCount" type="number" min="1" value="${item.totalEpisodes || ''}" /></label>
          <button id="createEpisodeInputs" style="margin-left:6px;padding:6px 8px;border-radius:6px">Create Inputs</button>
        </div>
        <div id="episodesRatingsArea" style="margin-top:12px"></div>
        <div style="margin-top:12px">
          <button id="saveDetailBtn" style="padding:8px 10px;border-radius:6px;background:#6ee7b7;border:none;cursor:pointer">Save</button>
          <button id="closeDetailBtn" style="padding:8px 10px;border-radius:6px;background:#ff7a7a;border:none;cursor:pointer;margin-left:8px">Close</button>
        </div>
      </div>
    </div>
  `;

  const isSeriesSelect = document.getElementById('isSeriesSelect');
  if(item.Type && item.Type.toLowerCase().includes('series')) {
    isSeriesSelect.value = 'yes';
    document.getElementById('episodesSetup').style.display = 'block';
  } else {
    isSeriesSelect.value = 'no';
    document.getElementById('episodesSetup').style.display = item.totalEpisodes ? 'block' : 'none';
  }

  const episodesRatingsArea = document.getElementById('episodesRatingsArea');
  function buildEpisodeInputs(count) {
    episodesRatingsArea.innerHTML = '';
    for(let i=1;i<=count;i++){
      const val = item.episodeRatings && item.episodeRatings[i] != null ? item.episodeRatings[i] : '';
      const row = document.createElement('div');
      row.style.marginBottom = '6px';
      row.innerHTML = `Episode ${i}: <input class="ep-input" data-ep="${i}" type="number" min="0" max="10" step="0.1" value="${val}" />`;
      episodesRatingsArea.appendChild(row);
    }
  }

  if(item.totalEpisodes && Number(item.totalEpisodes) > 0) buildEpisodeInputs(Number(item.totalEpisodes));

  isSeriesSelect.onchange = () => {
    if(isSeriesSelect.value === 'yes') {
      document.getElementById('episodesSetup').style.display = 'block';
    } else {
      document.getElementById('episodesSetup').style.display = 'none';
      episodesRatingsArea.innerHTML = '';
    }
  };

  document.getElementById('createEpisodeInputs').onclick = () => {
    const cnt = Number(document.getElementById('episodesCount').value);
    if(!cnt || cnt < 1) return alert('Enter a valid number of episodes');
    item.totalEpisodes = cnt;
    buildEpisodeInputs(cnt);
  };

  document.getElementById('saveDetailBtn').onclick = () => {
    const overallVal = document.getElementById('userOverallInput').value;
    if(overallVal !== '') item.userOverall = Number(overallVal);
    const epInputs = document.querySelectorAll('.ep-input');
    const newEpRatings = {};
    epInputs.forEach(inp => {
      const ep = inp.dataset.ep;
      const v = inp.value;
      if(v !== '') newEpRatings[ep] = Number(v);
    });
    item.episodeRatings = newEpRatings;
    saveWatchlist();
    renderWatchlist();
    detailModal.classList.add('hidden');
  };

  document.getElementById('closeDetailBtn').onclick = () => {
    detailModal.classList.add('hidden');
  };

  detailModal.classList.remove('hidden');
}

function escapeHtml(text) {
  if(!text && text !== 0) return '';
  return String(text).replace(/[&<>"']/g, function (m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}

searchBtn.onclick = async () => {
  const q = searchInput.value.trim();
  if(!q) return alert('Type something to search');
  await renderSearchResults(q);
};

closeModal.onclick = () => {
  detailModal.classList.add('hidden');
};

window.onclick = e => {
  if(e.target === detailModal) detailModal.classList.add('hidden');
};

renderWatchlist();
