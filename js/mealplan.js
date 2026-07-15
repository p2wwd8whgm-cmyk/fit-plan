// ============================================================
// MEALPLAN.JS
// ============================================================
import { Storage } from './storage.js';
import { showToast } from './app.js';

let recipeDB = [];

export function setRecipeDB(db) {
  recipeDB = db;
}

export function renderMeals() {
  const meals = Storage.load('customMeals', {});
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  let has = false;
  let html = '';
  
  days.forEach(d => {
    const list = meals[d] || [];
    if (list.length) has = true;
    const total = list.reduce((s, m) => s + (m.kcal || 0), 0);
    const totalP = list.reduce((s, m) => s + (m.protein || 0), 0);
    const totalF = list.reduce((s, m) => s + (m.fat || 0), 0);
    const totalC = list.reduce((s, m) => s + (m.carbs || 0), 0);
    const isOpen = list.length > 0;
    
    html += `<div class="day-block">
      <div class="day-header" data-day="${d}">
        <span class="day-title">${d}</span>
        <span>
          <span class="day-badge">${Math.round(total)} ккал</span>
          <span class="arrow${isOpen ? ' open' : ''}">▼</span>
        </span>
      </div>
      <div class="day-body${isOpen ? ' open' : ''}">`;
      
    if (list.length) {
      html += `<div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:4px;">
        Б:${Math.round(totalP)}г Ж:${Math.round(totalF)}г У:${Math.round(totalC)}г
      </div>`;
    }
    
    list.forEach((m, i) => {
      html += `<div class="meal" data-day="${d}" data-index="${i}">
        <span class="meal-name">${m.name}</span>
        <span class="meal-kcal">${m.kcal || 0} ккал</span>
        <div class="meal-actions">
          <button class="replace-btn" onclick="window.openReplace('${d}', ${i})">🔄</button>
          <button class="remove-btn" onclick="window.removeMeal('${d}', ${i})">✖</button>
        </div>
      </div>`;
    });
    
    html += `<div class="total-day">⭐ Итого: ${Math.round(total)} ккал</div>`;
    html += `</div></div>`;
  });
  
  const container = document.getElementById('mealPlanContainer');
  if (!has) {
    container.innerHTML = `
      <div class="empty-msg">
        <span class="big-icon">🍽️</span>
        <p>Рацион пуст.</p>
        <button class="btn btn-sm" id="emptyPlanBtn">🍽️ Перейти к рецептам</button>
      </div>
    `;
    document.getElementById('planDesc').textContent = 'Добавь блюда из раздела «Рецепты» или нажми «Собрать».';
    document.getElementById('emptyPlanBtn').addEventListener('click', () => window.switchTab('recipes'));
    return;
  }
  
  container.innerHTML = html;
  document.getElementById('planDesc').textContent = 'Твой рацион на неделю. Нажми на день, чтобы раскрыть.';
  
  document.querySelectorAll('.day-block .day-header').forEach(header => {
    header.addEventListener('click', function() {
      const body = this.parentElement.querySelector('.day-body');
      const arrow = this.querySelector('.arrow');
      if (body) {
        body.classList.toggle('open');
        if (arrow) arrow.classList.toggle('open');
      }
    });
  });
}

// Глобальные функции для onclick
window.removeMeal = function(day, index) {
  const meals = Storage.load('customMeals', {});
  if (meals[day]) {
    meals[day].splice(index, 1);
    if (!meals[day].length) delete meals[day];
    Storage.save('customMeals', meals);
    renderMeals();
    showToast('🗑️ Блюдо удалено');
  }
};

window.openReplace = function(day, index) {
  const meals = Storage.load('customMeals', {});
  const list = meals[day] || [];
  const meal = list[index];
  if (!meal) return;
  
  let cat = 'lunch';
  if (meal.name.includes('Завтрак')) cat = 'breakfast';
  else if (meal.name.includes('Обед')) cat = 'lunch';
  else if (meal.name.includes('Ужин')) cat = 'dinner';
  else if (meal.name.includes('Перекус')) cat = 'snack';
  
  let alts = recipeDB.filter(r => r.category === cat && r.name !== meal.recipe);
  if (alts.length > 8) alts = alts.slice(0, 8);
  
  const container = document.getElementById('replaceOptions');
  container.innerHTML = '';
  if (!alts.length) { container.innerHTML = '<p class="text-muted">Нет альтернатив</p>'; return; }
  
  alts.forEach(r => {
    const div = document.createElement('div');
    div.className = 'replace-item';
    div.innerHTML = `<div>${r.name}</div><div class="kcal">${r.kcal} ккал</div>`;
    div.addEventListener('click', function() {
      const meals2 = Storage.load('customMeals', {});
      if (meals2[day] && meals2[day][index]) {
        const old = meals2[day][index].name;
        const prefix = old.split(':')[0] + ':';
        meals2[day][index] = {
          name: prefix + ' ' + r.name,
          kcal: r.kcal,
          protein: r.protein || 0,
          fat: r.fat || 0,
          carbs: r.carbs || 0,
          recipe: r.name
        };
        Storage.save('customMeals', meals2);
        renderMeals();
        document.getElementById('replaceModal').classList.remove('active');
        showToast('🔄 Заменено на «' + r.name + '»');
      }
    });
    container.appendChild(div);
  });
  
  document.getElementById('replaceInfo').textContent = 'Замена для «' + meal.name + '»';
  document.getElementById('replaceModal').classList.add('active');
};

// ============================================================
// АВТОСБОР И ОЧИСТКА
// ============================================================
export function autoPlan() {
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const types = [
    { name: 'Завтрак', cat: 'breakfast' },
    { name: 'Обед', cat: 'lunch' },
    { name: 'Ужин', cat: 'dinner' },
    { name: 'Перекус', cat: 'snack' }
  ];
  const meals = {};
  const used = new Set();
  
  days.forEach(d => {
    meals[d] = [];
    types.forEach(t => {
      let avail = recipeDB.filter(r => r.category === t.cat && !used.has(r.name));
      if (!avail.length) avail = recipeDB.filter(r => r.category === t.cat);
      if (avail.length) {
        const pick = avail[Math.floor(Math.random() * avail.length)];
        used.add(pick.name);
        meals[d].push({
          name: `${t.name}: ${pick.name}`,
          kcal: pick.kcal,
          protein: pick.protein || 0,
          fat: pick.fat || 0,
          carbs: pick.carbs || 0,
          recipe: pick.name
        });
      }
    });
  });
  
  Storage.save('customMeals', meals);
  renderMeals();
  showToast('🧠 Рацион собран!');
}

export function clearPlan() {
  if (confirm('Очистить весь рацион?')) {
    Storage.save('customMeals', {});
    renderMeals();
    showToast('🗑️ Рацион очищен');
  }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
export function initMealPlan(db) {
  setRecipeDB(db);
  renderMeals();
  
  document.getElementById('autoPlanBtn').addEventListener('click', autoPlan);
  document.getElementById('clearPlanBtn').addEventListener('click', clearPlan);
  document.getElementById('replaceCancel').addEventListener('click', () => {
    document.getElementById('replaceModal').classList.remove('active');
  });
  
  // Экспорт списка покупок
  document.getElementById('exportShopListBtn').addEventListener('click', () => {
    const meals = Storage.load('customMeals', {});
    const map = {};
    for (const day in meals) {
      meals[day].forEach(m => {
        const key = m.recipe || m.name;
        if (!map[key]) map[key] = 0;
        map[key]++;
      });
    }
    if (!Object.keys(map).length) { showToast('📭 Рацион пуст'); return; }
    
    let list = '<div class="card"><h2>🛍️ Список покупок</h2><ul class="shop-list" style="list-style:none;padding:0;columns:2 160px;column-gap:16px;">';
    for (const [name, count] of Object.entries(map)) {
      list += `<li style="padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;break-inside:avoid;font-size:0.8rem;"><span>${name}</span> <span style="font-weight:500;color:var(--primary);">×${count}</span></li>`;
    }
    list += '</ul><button class="btn btn-sm" onclick="this.closest(\'.card\').style.display=\'none\'">✖ Закрыть</button></div>';
    const div = document.createElement('div');
    div.innerHTML = list;
    document.querySelector('.container').appendChild(div.firstElementChild);
    div.firstElementChild.scrollIntoView({ behavior: 'smooth' });
  });
}