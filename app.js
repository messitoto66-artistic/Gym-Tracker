// app.js — Logique métier : Affichage, Rampe, Chrono & LocalStorage

let currentDayKey = 'push';
let timerInterval = null;
let timeLeft = 0;
let activeAltState = {}; // Mémorise si tu as switché sur l'exercice alternatif

// Démarrage automatique sur la séance Push à l'ouverture
window.addEventListener('DOMContentLoaded', () => {
    loadWorkout('push', document.querySelector('.day-btn'));
});

// 1. CHARGER ET AFFICHER UNE SÉANCE
function loadWorkout(dayKey, btnElement) {
    currentDayKey = dayKey;
    const workout = PROGRAM_DATA[dayKey];

    // Mise à jour visuelle des onglets
    if (btnElement) {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // Mise à jour du titre
    document.getElementById('workout-title').textContent = workout.title;
    document.getElementById('workout-subtitle').textContent = workout.subtitle;

    // Récupération de l'historique dans le téléphone
    const history = JSON.parse(localStorage.getItem('vtaper_history') || '{}');
    const container = document.getElementById('workout-container');
    container.innerHTML = '';

    workout.exercises.forEach(exo => {
        const lastPerf = history[exo.id] || null;
        const isSwapped = activeAltState[exo.id] || false;
        const displayedName = isSwapped ? exo.alt : exo.name;

        // Vérification de la double progression sur la séance passée
        const progressionBadge = checkDoubleProgression(exo, lastPerf);

        // Construction des lignes de séries
        let setsHTML = '';
        for (let i = 0; i < exo.sets; i++) {
            const prevWeight = lastPerf && lastPerf.sets[i] ? lastPerf.sets[i].weight : '';
            const prevReps = lastPerf && lastPerf.sets[i] ? lastPerf.sets[i].reps : '';
            const warmupTrigger = (exo.hasWarmupRamp && i === 0) ? `oninput="updateWarmup('${exo.id}', this.value)"` : '';

            setsHTML += `
                <div class="set-row" id="row_${exo.id}_${i}">
                    <span class="set-num">S${i + 1}</span>
                    <input type="number" step="0.5" inputmode="decimal" class="set-input weight-input" 
                           placeholder="${prevWeight || 'kg'}" value="${prevWeight}" ${warmupTrigger}>
                    <input type="number" inputmode="numeric" class="set-input reps-input" 
                           placeholder="${prevReps || exo.repsMin + '-' + exo.repsMax}" value="${prevReps}">
                    <button class="check-btn" onclick="toggleSet('${exo.id}', ${i}, ${exo.rest})">✓</button>
                </div>
            `;
        }

        // Bloc rampe d'échauffement (uniquement sur le 1er exercice de la séance)
        const initialWeight = (lastPerf && lastPerf.sets[0]) ? lastPerf.sets[0].weight : 0;
        const warmupHTML = exo.hasWarmupRamp ? `
            <div class="warmup-box" id="warmup_${exo.id}">
                ${getWarmupText(initialWeight)}
            </div>
        ` : '';

        // Injection de la carte HTML
        const card = document.createElement('div');
        card.className = 'exo-card';
        card.innerHTML = `
            <div class="exo-header">
                <div class="exo-title" id="title_${exo.id}">${displayedName}</div>
                <button class="swap-btn" onclick="swapExercise('${exo.id}')">🔄 Alt</button>
            </div>
            <div class="exo-meta">
                <span class="badge">🎯 ${exo.sets} x ${exo.repsMin}-${exo.repsMax}</span>
                <span class="badge">⚡ RIR ${exo.rir}</span>
                <span class="badge">⏱️ ${exo.rest}s</span>
                ${progressionBadge}
            </div>
            ${warmupHTML}
            <div class="sets-header">
                <span>Série</span><span>Poids (kg)</span><span>Reps</span><span>OK</span>
            </div>
            ${setsHTML}
        `;
        container.appendChild(card);
    });
}

// 2. SWITCHER ENTRE L'EXERCICE PRINCIPAL ET SON ALTERNATIVE
function swapExercise(exoId) {
    activeAltState[exoId] = !activeAltState[exoId];
    const exo = PROGRAM_DATA[currentDayKey].exercises.find(e => e.id === exoId);
    const titleEl = document.getElementById(`title_${exoId}`);
    titleEl.textContent = activeAltState[exoId] ? `${exo.alt} (Alt)` : exo.name;
}

// 3. CALCULATEUR AUTOMATIQUE DE RAMPE NERVEUSE (50% / 75% / 90%)
function getWarmupText(weight) {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
        return `🔥 <b>Rampe nerveuse :</b> Entre ton poids en S1 pour calculer tes paliers (50% / 75% / 90%).`;
    }
    const w50 = Math.round(w * 0.5);
    const w75 = Math.round(w * 0.75);
    const w90 = Math.round(w * 0.9);
    return `🔥 <b>Rampe :</b> 10 reps à <b>${w50}kg</b> ➔ 5 reps à <b>${w75}kg</b> ➔ 2 reps à <b>${w90}kg</b> <i>(2 min repos puis S1)</i>`;
}

function updateWarmup(exoId, val) {
    const box = document.getElementById(`warmup_${exoId}`);
    if (box) box.innerHTML = getWarmupText(val);
}

// 4. ALGORITHME DE DOUBLE PROGRESSION
function checkDoubleProgression(exo, lastPerf) {
    if (!lastPerf || !lastPerf.sets || lastPerf.sets.length === 0) return '';
    
    // Vérifie si TOUTES les séries ont atteint ou dépassé repsMax à la dernière séance
    const allMaxed = lastPerf.sets.every(s => parseInt(s.reps) >= exo.repsMax);
    if (allMaxed) {
        return `<span class="badge badge-up">🔥 Validé la dernière fois : Monte les kg !</span>`;
    }
    return '';
}

// 5. VALIDER UNE SÉRIE & LANCER LE CHRONO
function toggleSet(exoId, setIndex, restSeconds) {
    const row = document.getElementById(`row_${exoId}_${setIndex}`);
    row.classList.toggle('done');

    if (row.classList.contains('done')) {
        startTimer(restSeconds);
    }
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    // On calcule le timestamp exact de la fin du repos
    timerEndTime = Date.now() + (seconds * 1000);
    timeLeft = seconds;

    const box = document.getElementById('timer-box');
    box.className = 'timer-running';
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        // Différence réelle entre l'heure de fin et l'heure actuelle
        const remaining = Math.round((timerEndTime - Date.now()) / 1000);
        timeLeft = remaining > 0 ? remaining : 0;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            box.className = 'timer-done';
            document.getElementById('timer-display').textContent = "GO !";
        }
    }, 500);
}

function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
}

function resetTimer() {
    clearInterval(timerInterval);
    const box = document.getElementById('timer-box');
    box.className = 'timer-idle';
    document.getElementById('timer-display').textContent = "00:00";
}

// 6. SAUVEGARDER LA SÉANCE DANS LE TÉLÉPHONE (LocalStorage)
function saveWorkoutSession() {
    const workout = PROGRAM_DATA[currentDayKey];
    const history = JSON.parse(localStorage.getItem('vtaper_history') || '{}');

    workout.exercises.forEach(exo => {
        const setsData = [];
        for (let i = 0; i < exo.sets; i++) {
            const row = document.getElementById(`row_${exo.id}_${i}`);
            const weight = row.querySelector('.weight-input').value;
            const reps = row.querySelector('.reps-input').value;
            if (weight || reps) {
                setsData.push({ weight, reps });
            }
        }
        if (setsData.length > 0) {
            history[exo.id] = {
                date: new Date().toLocaleDateString('fr-FR'),
                usedAlt: activeAltState[exo.id] || false,
                sets: setsData
            };
        }
    });

    localStorage.setItem('vtaper_history', JSON.stringify(history));
    alert("✅ Séance sauvegardée ! Tes charges seront pré-remplies à la prochaine séance.");
    loadWorkout(currentDayKey, null); // Recharge pour afficher les nouveaux badges de progression
}