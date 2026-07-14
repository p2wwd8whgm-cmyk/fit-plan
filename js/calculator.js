// ============================================================
// CALCULATOR.JS
// ============================================================
import { Storage } from './storage.js';
import { showToast } from './app.js';
import { updateProgress } from './calendar.js';

let currentPlan = Storage.load('currentPlan', 'fatloss');

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

  if (age < 10 || age > 80) {
    showToast('⚠️ Введите корректный возраст (10–80 лет)');
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
  const weeks = speed > 0 ? Math.round(Math.abs(diff) / speed) :