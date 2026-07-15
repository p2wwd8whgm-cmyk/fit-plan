// ============================================================
// RECIPES.JS
// ============================================================
import { Storage } from './storage.js';
import { openSheet, showToast } from './app.js';

let recipeDB = [];
let currentCategory = 'all';
let currentDiet = 'all';
let currentTime = 'all';
let currentFilter = 'all';
let searchHistory = Storage.load('searchHistory', []);
let favorites = Storage.load('favorites', []);

export function getRecipeDB() {
  return recipeDB;
}

// ============================================================
// ЗАГРУЗКА РЕЦЕПТОВ ИЗ JSON
// ============================================================
export async function loadRecipes() {
  try {
    const response = await fetch('data/recipes.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    recipeDB = data.recipes || [];
    return recipeDB;
  } catch (error) {
    console.warn('Ошибка загрузки рецептов:', error);
    showToast('⚠️ Не удалось загрузить рецепты. Использую базовые.');
    
    // Fallback-рецепты
    recipeDB = [
      { id: 1, name: 'Овсянка с бананом', category: 'breakfast', time: 10, kcal: 430, protein: 17, fat: 10, carbs: 68, ingredients: ['овсянка 60г', 'банан 1шт'], instructions: 'Сварить овсянку, добавить банан.' },
      { id: 2, name: 'Яичница с помидорами', category: 'breakfast', time: 10, kcal: 220, protein: 16, fat: 14, carbs: 8, ingredients: ['яйца 2шт', 'помидоры 100г'], instructions: 'Обжарить помидоры, залить яйцами.' }
    ];
    return recipeDB;
  }
}

// ============================================================
// ПОИСК И ФИЛЬТРЫ
// ============================================================
export function applyFilters(query) {
  let res = recipeDB;
  
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    res = res.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.ingredients.some(i => i.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  }
  
  if (currentCategory !== 'all') {
    res = res.filter(r => r.category === currentCategory);
  }
  
  if (currentDiet !== 'all') {
    res = res.filter(r => r.diet === currentDiet || r.diet === 'all' || !r.diet);
  }
  
  if (currentTime === 'fast') res = res.filter(r => r.time <= 20);
  else if (currentTime === 'medium') res = res.filter(r => r.time > 20 && r.time <= 40);
  else if (currentTime === 'long') res = res.filter(r => r.time > 40);
  
  if (currentFilter === 'favorites') {
    res = res.filter(r => favorites.includes(r.name));
  }
  
  return res;
}

export function renderRecipes(query) {
  const results = applyFilters(query || '');
  const container = document.getElementById('recipeResults');
  
  if (!results || !results.length) {
    container.innerHTML = `<div class="empty-msg"><span class="big-icon">🍽️</span><p>Рецептов не найдено. Попробуй другой запрос.</p></div>`;
    document.getElementById('recipeInfo').textContent = 'Рецептов не найдено.';
    return;
  }
  
  const fragment = document.createDocumentFragment();
  results.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    const isFav = favorites.includes(r.name);
    const catEmoji = { breakfast: '🍳', lunch: '🥗', dinner: '🍲', snack: '🍏', dessert: '🍰' }[r.category] || '🍽️';
    
    card.innerHTML = `
      <button class="favorite-btn">${isFav ? '❤️' : '🤍'}</button>
      <div class="title">${r.name}</div>
      <div class="meta">
        <span>${catEmoji} ${r.category || 'Блюдо'}</span>
        <span>${r.kcal} ккал</span>
        <span>${r.protein || 0}г бел</span>
        <span>${r.fat || 0}г жир</span>
        <span>${r.carbs || 0}г угл</span>
      </div>
      <div style="font-size:0.6rem;color:var(--text-muted);">${r.ingredients.slice(0, 3).join(', ')}${r.ingredients.length > 3 ? '...' : ''}</div>
      <button class="add-btn" data-name="${r.name}" data-kcal="${r.kcal}" data-protein="${r.protein || 0}" data-fat="${r.fat || 0}" data-carbs="${r.carbs || 0}">➕ Добавить</button>
    `;
    
    card.querySelector('.favorite-btn').addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(r.name);
    });
    
    card.querySelector('.add-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      openSheet(
        this.dataset.name,
        parseInt(this.dataset.kcal),
        parseFloat(this.dataset.protein),
        parseFloat(this.dataset.fat),
        parseFloat(this.dataset.carbs)
      );
    });
    
    fragment.appendChild(card);
  });
  
  container.innerHTML = '';
  container.appendChild(fragment);
  document.getElementById('recipeInfo').textContent = `Найдено ${results.length} рецептов.`;
}

function toggleFavorite(name) {
  const idx = favorites.indexOf(name);
  idx > -1 ? favorites.splice(idx, 1) : favorites.push(name);
  Storage.save('favorites', favorites);
  renderRecipes(document.getElementById('recipeSearch').value);
}

function renderSearchHistory() {
  const container = document.getElementById('searchHistory');
  if (!searchHistory.length) { container.innerHTML = ''; return; }
  container.innerHTML = searchHistory.map(q =>
    `<span class="history-item" data-query="${q}">${q}</span>`
  ).join('');
  container.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', function() {
      document.getElementById('recipeSearch').value = this.dataset.query;
      document.getElementById('searchBtn').click();
    });
  });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
export async function initRecipes() {
  await loadRecipes();
  renderSearchHistory();
  renderRecipes();
  
  // Поиск
  document.getElementById('searchBtn').addEventListener('click', function() {
    const q = document.getElementById('recipeSearch').value;
    if (!q || q.trim().length < 1) { showToast('⚠️ Введите запрос'); return; }
    
    document.getElementById('recipeResults').innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:6px;">Загрузка...</p>
      </div>
    `;
    
    setTimeout(() => {
      searchHistory = searchHistory.filter(item => item !== q);
      searchHistory.unshift(q);
      if (searchHistory.length > 5) searchHistory.pop();
      Storage.save('searchHistory', searchHistory);
      renderSearchHistory();
      renderRecipes(q);
    }, 250);
  });
  
  document.getElementById('recipeSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('searchBtn').click();
  });
  
  document.getElementById('clearSearchBtn').addEventListener('click', function() {
    document.getElementById('recipeSearch').value = '';
    renderRecipes('');
  });
  
  // Фильтры
  document.querySelectorAll('#categoryFilterGroup .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#categoryFilterGroup .filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentCategory = this.dataset.filter;
      if (currentCategory === 'favorites') {
        currentFilter = 'favorites';
      } else {
        currentFilter = 'all';
      }
      renderRecipes(document.getElementById('recipeSearch').value);
    });
  });
  
  document.querySelectorAll('#dietFilterGroup .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#dietFilterGroup .filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentDiet = this.dataset.filter;
      renderRecipes(document.getElementById('recipeSearch').value);
    });
  });
  
  document.querySelectorAll('.filter-group:not(#categoryFilterGroup):not(#dietFilterGroup) .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const parent = this.closest('.filter-group');
      if (parent) {
        parent.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTime = this.dataset.filter;
        renderRecipes(document.getElementById('recipeSearch').value);
      }
    });
  });
}