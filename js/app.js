// ============================================================
// APP.JS
// ============================================================
import { Storage } from './storage.js';
import { calculate } from './calculator.js';
import { renderRecipes, applyFilters, searchRecipes } from './recipes.js';
import { renderMeals, autoPlan, clearPlan, removeMeal, openReplace } from './mealplan.js';
import { buildCalendar, updateProgress } from './calendar.js';

// ============================================================
// 1. THEME
// ============================================================
const themeToggle = document.getElementById('themeToggle');
const theme = Storage.load('theme', 'light');
document.documentElement.setAttribute('data-theme', theme);
themeToggle.textContent = theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная';

themeToggle.addEventListener('click', () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  Storage.save('theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная';
});

// ============================================================
// 2. TOAST
// ============================================================
export let toastTimer;

export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ============================================================
// 3. NAVIGATION
// ============================================================
const tabMap = {
  home: 'page-home',
  calc: 'page-calc',
  recipes: 'page-recipes',
  mealplan: 'page-mealplan',
  progress: 'page-progress'
};

export function switchTab(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(tabMap[id]).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  Storage.save('tab', id);
  
  if (id === 'mealplan') renderMeals();
  if (id === 'progress') {
    const now = new Date();
    buildCalendar(now.getFullYear(), now.getMonth());
    updateProgress();
  }
  if (id === 'home') updateHome();
  closeSheet();
}

document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
const savedTab = Storage.load('tab', 'home');
switchTab(savedTab);

// ============================================================
// 4. HOME
// ============================================================
function updateHome() {
  const w = parseInt(document.getElementById('weightSlider').value) || 70;
  const g = parseInt(document.getElementById('goalWeightSlider').value) || 65;
  const d = w - g;
  const start = Storage.load('startWeight', w);
  const progress = d > 0 ? Math.min(100, ((start - w) / (start - g)) * 100) : 0;
  const circ = 226.2;
  document.getElementById('homeProgressCircle').style.strokeDashoffset = circ - (progress / 100) * circ;
  document.getElementById('homeProgressPercent').textContent = Math.round(progress) + '%';
  document.getElementById('homeProgressDiff').textContent = (d > 0 ? '−' : '+') + Math.abs(d).toFixed(1) + ' кг';
}

// ============================================================
// 5. BOTTOM SHEET
// ============================================================
const sheet = document.getElementById('bottomSheet');
const overlay = document.getElementById('sheetOverlay');
let pendingRecipe = null;

export function openSheet(name, kcal, p, f, c) {
  pendingRecipe = { name, kcal, p, f, c };
  document.getElementById('sheetTitle').textContent = '🍽️ Добавить в рацион';
  document.getElementById('sheetRecipeName').textContent = `${name} (${kcal} ккал)`;
  sheet.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeSheet() {
  sheet.classList.remove('active');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  pendingRecipe = null;
}

document.getElementById('sheetHandle').addEventListener('click', closeSheet);
document.getElementById('sheetCancel').addEventListener('click', closeSheet);
overlay.addEventListener('click', closeSheet);

document.getElementById('sheetConfirm').addEventListener('click', () => {
  if (!pendingRecipe) return;
  const day = document.getElementById('sheetDay').value;
  const mealType = document.getElementById('sheetMealType').value;
  const meals = Storage.load('customMeals', {});
  if (!meals[day]) meals[day] = [];
  meals[day].push({
    name: `${mealType}: ${pendingRecipe.name}`,
    kcal: pendingRecipe.kcal,
    p: pendingRecipe.p,
    f: pendingRecipe.f,
    c: pendingRecipe.c,
    recipe: pendingRecipe.name
  });
  Storage.save('customMeals', meals);
  closeSheet();
  renderMeals();
  showToast('✅ Блюдо добавлено!');
});

// ============================================================
// 6. EVENTS
// ============================================================
document.getElementById('heroStartBtn').addEventListener('click', () => switchTab('calc'));
document.getElementById('emptyPlanBtn').addEventListener('click', () => switchTab('recipes'));

document.getElementById('fabBtn').addEventListener('click', () => {
  switchTab('recipes');
  document.getElementById('recipeSearch').focus();
});

// ============================================================
// 7. INIT
// ============================================================
window.onload = function() {
  const now = new Date();
  calculate();
  renderMeals();
  buildCalendar(now.getFullYear(), now.getMonth());
  updateProgress();
  updateHome();
  renderRecipes();
  
  if (!Storage.load('startWeight', null)) {
    const w = parseInt(document.getElementById('weightSlider').value) || 70;
    Storage.save('startWeight', w);
  }
};