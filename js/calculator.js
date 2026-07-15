// ============================================================
// CALCULATOR.JS
// ============================================================
import { Storage } from './storage.js';
import { showToast } from './app.js';
import { updateProgress } from './calendar.js';

let currentPlan = Storage.load('currentPlan', 'fatloss');

export function initCalculator() {
  // Восстановление сохранённой цели
  const savedGoal = Storage.load('currentPlan', 'fatloss');
  document.querySelectorAll('.goal-btn').forEach(btn => {
    if (btn.dataset.plan === savedGoal) {
      btn.classList.add('active');
      document.querySelectorAll('.goal-btn').forEach(b => { if (b !== btn) b.classList.remove('active'); });
      const factor = parseFloat(btn.dataset.factor);
      document.getElementById('goalDesc').textContent = factor === 0.75 ? 'Интенсивный дефицит 25% — до 1 кг в неделю' :
        factor === 0.85 ? 'Комфортный дефицит 15% — ~0,5–0,7 кг в неделю' :
        factor === 1.0 ? 'Баланс калорий — вес стабилен' :
        'Профицит 15% — качественный рост мышц';
    }
  });
  
  // Привязываем события
  document.querySelectorAll('.goal-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentPlan = this.dataset.plan;
      Storage.save('currentPlan', currentPlan);
      const factor = parseFloat(this.dataset.factor);
      const desc = factor === 0.75 ? 'Интенсивный дефицит 25% — до 1 кг в неделю' :
        factor === 0.85 ? 'Комфортный дефицит 15% — ~0,5–0,7 кг в неделю' :
        factor === 1.0 ? 'Баланс калорий — вес стабилен' :
        'Профицит 15% — качественный рост мышц';
      document.getElementById('goalDesc').textContent = desc;
      calculate();
    });
  });

  document.getElementById('ageSlider').addEventListener('input', function() {
    document.getElementById('ageValue').textContent = this.value;
    calculate();
  });
  document.getElementById('heightSlider').addEventListener('input', function() {
    document.getElementById('heightValue').textContent = this.value;
    calculate();
  });
  document.getElementById('weightSlider').addEventListener('input', function() {
    document.getElementById('weightValue').textContent = this.value;
    if (!Storage.load('startWeight', null)) Storage.save('startWeight', parseInt(this.value));
    calculate();
  });
  document.getElementById('goalWeightSlider').addEventListener('input', function() {
    document.getElementById('goalWeightValue').textContent = this.value;
    calculate();
  });
  document.getElementById('gender').addEventListener('change', calculate);
  document.getElementById('activity').addEventListener('change', calculate);
  
  // Первый расчёт
  calculate();
}

export function calculate() {
  const gender = document.getElementById('gender').value;
  const age = parseInt(document.getElementById('ageSlider').value) || 30;
  const height = parseInt(document.getElementById('heightSlider').value) || 170;
  const weight = parseInt(document.getElementById('weightSlider').value) || 70;
  const goalWeight = parseInt(document.getElementById('goalWeightSlider').value) || 65;
  const activity = parseFloat(document.getElementById('activity').value) || 1.375;
  const activeGoal = document.querySelector('.goal-btn.active');
  const factor = parseFloat(activeGoal.dataset.factor);
  const plan = activeGoal.dataset.plan;

  // Проверка на ошибки
  if (weight < 30 || weight > 300) {
    showToast('⚠️ Введите корректный вес (30–300 кг)');
    return;
  }
  
  if (height < 100 || height > 250) {
    showToast('⚠️ Введите корректный рост (100–250 см)');
    return;
  }

  if (age < 10 || age > 120) {
    showToast('⚠️ Введите корректный возраст (10–120 лет)');
    return;
  }

  if (plan === 'fatloss' && goalWeight >= weight) {
    showToast('⚠️ Для похудения цель должна быть меньше текущего веса');
    return;
  }

  if (plan === 'bulk' && goalWeight <= weight) {
    showToast('⚠️ Для набора массы цель должна быть больше текущего веса');
    return;
  }

  const bmr = gender === 'female' 
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;
  
  const maintenance = Math.round(bmr * activity);
  let finalCal = Math.round(maintenance * factor);
  if (finalCal < 1200) finalCal = 1200;

  let proteinFactor, fatFactor;
  if (plan === 'fatloss') { proteinFactor = 2.2; fatFactor = 0.8; }
  else if (plan === 'moderate') { proteinFactor = 2.0; fatFactor = 0.9; }
  else if (plan === 'bulk') { proteinFactor = 1.8; fatFactor = 1.0; }
  else { proteinFactor = 1.6; fatFactor = 0.9; }

  const protein = Math.round(weight * proteinFactor);
  const fat = Math.round(weight * fatFactor);
  const carbs = Math.round((finalCal - (protein * 4) - (fat * 9)) / 4);

  // Обновляем UI
  document.getElementById('resKcal').textContent = finalCal;
  document.getElementById('resProtein').textContent = protein;
  document.getElementById('resFat').textContent = fat;
  document.getElementById('resCarbs').textContent = carbs >= 0 ? carbs : 0;

  const total = protein * 4 + fat * 9 + carbs * 4;
  if (total > 0) {
    document.getElementById('bjuProtein').style.width = ((protein * 4) / total * 100) + '%';
    document.getElementById('bjuFat').style.width = ((fat * 9) / total * 100) + '%';
    document.getElementById('bjuCarbs').style.width = ((carbs * 4) / total * 100) + '%';
  }

  const diff = weight - goalWeight;
  const speed = factor === 0.75 ? 0.9 : factor === 0.85 ? 0.6 : factor === 1.0 ? 0.0 : 0.4;
  const weeks = speed > 0 ? Math.round(Math.abs(diff) / speed) : 0;
  
  document.getElementById('resDiff').textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' кг';
  document.getElementById('resSpeed').textContent = speed.toFixed(1) + ' кг/нед.';
  document.getElementById('resWeeks').textContent = weeks + ' нед.';

  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  document.getElementById('homeBMI').textContent = bmi;

  const startWeight = Storage.load('startWeight', weight);
  const progress = diff > 0 ? Math.min(100, ((startWeight - weight) / (startWeight - goalWeight)) * 100) : 0;
  const circumference = 226.2;
  const offset = circumference - (progress / 100) * circumference;

  document.getElementById('homeProgressCircle').style.strokeDashoffset = offset;
  document.getElementById('homeProgressPercent').textContent = Math.round(progress) + '%';
  document.getElementById('progressCircle').style.strokeDashoffset = offset;
  document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
  document.getElementById('homeProgressDiff').textContent = (diff > 0 ? '−' : '+') + Math.abs(diff).toFixed(1) + ' кг';
  document.getElementById('progressWeightDiff').textContent = (diff > 0 ? '−' : '+') + Math.abs(diff).toFixed(1) + ' кг';
  document.getElementById('progressBMI').textContent = bmi;

  document.getElementById('homeKcal').textContent = finalCal;
  document.getElementById('homeProtein').textContent = protein;
  document.getElementById('homeFat').textContent = fat;
  document.getElementById('homeCarbs').textContent = carbs >= 0 ? carbs : 0;

  Storage.save('currentPlan', currentPlan);

  const history = Storage.load('weightHistory', []);
  if (history.length === 0 || history[history.length - 1].weight !== weight) {
    history.push({ date: new Date().toLocaleDateString(), weight: weight });
    Storage.save('weightHistory', history);
  }
  updateProgress();
}