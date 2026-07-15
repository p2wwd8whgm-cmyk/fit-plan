// ============================================================
// CALENDAR.JS
// ============================================================
import { Storage } from './storage.js';
import { showToast } from './app.js';

let calendarDate = new Date();

export function buildCalendar(year, month) {
  const container = document.getElementById('calendarGrid');
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;

  const headers = container.querySelectorAll('.day-header');
  container.innerHTML = '';
  headers.forEach(h => container.appendChild(h));

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const history = Storage.load('weightHistory', []);
  const weights = {};
  const dates = [];
  
  history.forEach(item => {
    const parts = item.date.split('.');
    if (parts.length === 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      if (y === year && m === month) {
        weights[d] = item.weight;
        dates.push(d);
      }
    }
  });
  dates.sort((a, b) => a - b);

  let change = 0;
  if (dates.length >= 2) {
    change = weights[dates[dates.length - 1]] - weights[dates[0]];
  }
  const changeText = change > 0 ? `+${change.toFixed(1)} кг ↑` :
    change < 0 ? `${change.toFixed(1)} кг ↓` :
    '0 кг —';
  document.getElementById('monthChange').textContent = changeText;
  document.getElementById('monthChange').style.color = change > 0 ? 'var(--danger)' :
    change < 0 ? 'var(--primary)' :
    'var(--text-muted)';

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    empty.textContent = '—';
    container.appendChild(empty);
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    dayDiv.dataset.day = d;
    dayDiv.dataset.month = month;
    dayDiv.dataset.year = year;

    const hasWeight = weights[d] !== undefined;
    const weight = weights[d] || null;

    if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add('today');
    }

    if (hasWeight && dates.length >= 2) {
      if (weight < weights[dates[0]]) dayDiv.classList.add('low');
      else if (weight > weights[dates[0]]) dayDiv.classList.add('high');
    }

    const numSpan = document.createElement('div');
    numSpan.className = 'day-number';
    numSpan.textContent = d;
    dayDiv.appendChild(numSpan);

    if (hasWeight) {
      const wSpan = document.createElement('div');
      wSpan.className = 'day-weight';
      wSpan.textContent = weight.toFixed(1);
      dayDiv.appendChild(wSpan);
    }

    dayDiv.addEventListener('click', function() {
      const dNum = parseInt(this.dataset.day);
      const mNum = parseInt(this.dataset.month);
      const yNum = parseInt(this.dataset.year);
      const hasW = weights[dNum] !== undefined;
      const curW = weights[dNum] || null;
      
      const msg = hasW ?
        `Изменить вес на ${dNum}.${mNum+1}.${yNum} (текущий: ${curW.toFixed(1)} кг):` :
        `Введите вес на ${dNum}.${mNum+1}.${yNum}:`;
      const input = prompt(msg);
      if (input === null) return;
      
      const newW = parseFloat(input.trim());
      if (isNaN(newW) || newW < 20 || newW > 300) {
        showToast('⚠️ Введите корректный вес (20–300 кг)');
        return;
      }
      
      const h2 = Storage.load('weightHistory', []);
      const dateStr = `${String(dNum).padStart(2, '0')}.${String(mNum+1).padStart(2, '0')}.${yNum}`;
      const idx = h2.findIndex(item => item.date === dateStr);
      if (idx > -1) h2[idx].weight = newW;
      else h2.push({ date: dateStr, weight: newW });
      
      Storage.save('weightHistory', h2);
      document.getElementById('weightSlider').value = newW;
      document.getElementById('weightValue').textContent = newW;
      
      if (!Storage.load('startWeight', null)) Storage.save('startWeight', newW);
      buildCalendar(yNum, mNum);
      window.calculate();
      showToast('✅ Вес сохранён!');
    });

    container.appendChild(dayDiv);
  }
}

export function updateProgress() {
  const history = Storage.load('weightHistory', []);
  const current = parseInt(document.getElementById('weightSlider').value) || 70;
  const start = history.length ? history[0].weight : current;
  const goal = parseInt(document.getElementById('goalWeightSlider').value) || 65;
  const height = parseInt(document.getElementById('heightSlider').value) || 170;
  const bmi = (current / ((height / 100) ** 2)).toFixed(1);

  document.getElementById('statStart').textContent = start.toFixed(1) + ' кг';
  document.getElementById('statCurrent').textContent = current.toFixed(1) + ' кг';
  document.getElementById('statLost').textContent = (start - current).toFixed(1) + ' кг';
  document.getElementById('statBMI').textContent = bmi;
  document.getElementById('statGoal').textContent = goal + ' кг';
  
  const factor = parseFloat(document.querySelector('.goal-btn.active').dataset.factor);
  document.getElementById('statSpeed').textContent = (factor === 0.75 ? 0.9 : factor === 0.85 ? 0.6 : factor === 1.0 ? 0.0 : 0.4).toFixed(1) + ' кг/нед';
}

// ============================================================
// НАВИГАЦИЯ ПО МЕСЯЦАМ
// ============================================================
document.getElementById('prevMonthBtn').addEventListener('click', function() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  buildCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
});

document.getElementById('nextMonthBtn').addEventListener('click', function() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  buildCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
});