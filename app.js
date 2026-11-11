// app.js — VERSION V5.2 (Accueil Réorganisable, Sans Doublons + Calculateur Bilan Calorique)

let currentDayKey = 'push';
let timerInterval = null;
let timerEndTime = 0;
let timeLeft = 0;

let homeCalMonthOffset = 0;
let nutriCalMonthOffset = 0;
let selectedNutriDateKey = getTodayDateKey();
let modalTargetDateKey = null;

const DEFAULT_WORKOUT_COLORS = {
    push: "#005AA0",
    pull: "#7c3aed",
    legs: "#10b981",
    upper: "#f59e0b",
    lower: "#06b6d4"
};

const HOME_BLOCK_LABELS = {
    calendar: "📅 Calendrier du mois",
    workout: "🏋️ Entraînement sélectionné",
    nutri: "🥗 Nutrition du jour",
    water: "💧 Hydratation"
};

const DEFAULT_FAVORITES = [
    { name: "🥣 Petit-Déj Avoine/Œufs", kcal: 650, prot: 35, carbs: 75, fats: 22 },
    { name: "🥤 Shaker + Banane", kcal: 240, prot: 26, carbs: 28, fats: 2 },
    { name: "🍱 Gamelle Poulet & Riz", kcal: 750, prot: 48, carbs: 95, fats: 18 },
    { name: "🍝 Steak 5% & Pâtes", kcal: 720, prot: 45, carbs: 90, fats: 16 },
    { name: "🥜 FB + Beurre Cacahuète", kcal: 380, prot: 24, carbs: 18, fats: 22 },
    { name: "🌰 Poignée d'Amandes", kcal: 180, prot: 6, carbs: 4, fats: 16 }
];

window.addEventListener('DOMContentLoaded', () => {
    initV5Database();
    applyHomeLayoutOrder();
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateAllViews();
});

function getTodayDateKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function toMachineKey(name) {
    return (name || 'machine')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

// =========================================================
// 1. CONFIGURATION ACCUEIL & CIBLES NUTRITIONNELLES
// =========================================================
function getHomeConfig() {
    const def = {
        title: "Tableau de bord",
        subtitle: "Objectif 80 kg · V-Taper & Calisthénie",
        order: ["calendar", "workout", "nutri", "water"]
    };
    const saved = JSON.parse(localStorage.getItem('vtaper_home_config') || 'null');
    if (!saved) return def;
    return {
        title: saved.title || def.title,
        subtitle: saved.subtitle || def.subtitle,
        order: (saved.order && saved.order.length === 4) ? saved.order : def.order
    };
}

function saveHomeConfigObj(cfg) {
    localStorage.setItem('vtaper_home_config', JSON.stringify(cfg));
}

function toggleHomeEditDrawer() {
    const drawer = document.getElementById('home-edit-drawer');
    if (!drawer) return;
    const cfg = getHomeConfig();
    document.getElementById('cfg-home-title').value = cfg.title;
    document.getElementById('cfg-home-sub').value = cfg.subtitle;
    renderHomeOrderEditor(cfg.order);
    drawer.classList.toggle('open');
}

function renderHomeOrderEditor(orderArr) {
    const box = document.getElementById('home-order-list');
    if (!box) return;
    box.innerHTML = orderArr.map((blockId, idx) => `
        <div class="order-row-item">
            <span>${idx + 1}. ${HOME_BLOCK_LABELS[blockId] || blockId}</span>
            <div class="order-arrows">
                <button onclick="moveHomeBlock(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
                <button onclick="moveHomeBlock(${idx}, 1)" ${idx === orderArr.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
            </div>
        </div>
    `).join('');
}

function moveHomeBlock(idx, delta) {
    const cfg = getHomeConfig();
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= cfg.order.length) return;
    const temp = cfg.order[idx];
    cfg.order[idx] = cfg.order[targetIdx];
    cfg.order[targetIdx] = temp;
    saveHomeConfigObj(cfg);
    renderHomeOrderEditor(cfg.order);
    applyHomeLayoutOrder();
}

function applyHomeLayoutOrder() {
    const cfg = getHomeConfig();
    const container = document.getElementById('home-cards-container');
    if (!container) return;
    cfg.order.forEach(blockId => {
        const el = document.getElementById(`home-block-${blockId}`);
        if (el) container.appendChild(el);
    });
}

function saveHomeCustomization() {
    const cfg = getHomeConfig();
    cfg.title = document.getElementById('cfg-home-title').value.trim() || "Tableau de bord";
    cfg.subtitle = document.getElementById('cfg-home-sub').value.trim() || "Objectif 80 kg";
    saveHomeConfigObj(cfg);
    applyHomeLayoutOrder();
    document.getElementById('home-edit-drawer').classList.remove('open');
    updateAllViews();
}

// CIBLES NUTRITIONNELLES DYNAMIQUES
function getNutriTargets() {
    const def = {
        weight: 70, height: 178, age: 22, activity: 1.55, goalDelta: 300,
        kcal: 2700, prot: 150, carbs: 330, fats: 80, water: 3.0
    };
    return JSON.parse(localStorage.getItem('vtaper_nutri_targets') || JSON.stringify(def));
}

function toggleNutriCalcDrawer() {
    const drawer = document.getElementById('nutri-calc-drawer');
    if (!drawer) return;
    const t = getNutriTargets();
    const meta = getGlobalMeta();

    document.getElementById('calc-weight').value = meta.weight || t.weight || 70;
    document.getElementById('calc-height').value = t.height || 178;
    document.getElementById('calc-age').value = t.age || 22;
    document.getElementById('calc-activity').value = t.activity || 1.55;
    document.getElementById('calc-goal').value = t.goalDelta !== undefined ? t.goalDelta : 300;

    document.getElementById('target-kcal').value = t.kcal;
    document.getElementById('target-prot').value = t.prot;
    document.getElementById('target-carbs').value = t.carbs;
    document.getElementById('target-fats').value = t.fats;
    document.getElementById('target-water').value = t.water;

    drawer.classList.toggle('open');
}

// Formule métabolique de Mifflin-St Jeor + Répartition sportive (2.1g Prot/kg, 1.1g Lip/kg, reste en Glucides)
function computeMetabolicTargets() {
    const w = parseFloat(document.getElementById('calc-weight').value) || 70;
    const h = parseFloat(document.getElementById('calc-height').value) || 178;
    const a = parseFloat(document.getElementById('calc-age').value) || 22;
    const act = parseFloat(document.getElementById('calc-activity').value) || 1.55;
    const goal = parseInt(document.getElementById('calc-goal').value) || 0;

    // BMR Homme = (10 × poids) + (6.25 × taille) - (5 × âge) + 5
    const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    const tdee = Math.round(bmr * act);
    const totalKcal = Math.round((tdee + goal) / 10) * 10;

    const prot = Math.round(w * 2.1); // ~2.1g / kg
    const fats = Math.round(w * 1.1); // ~1.1g / kg
    const remainingKcal = Math.max(0, totalKcal - (prot * 4) - (fats * 9));
    const carbs = Math.round(remainingKcal / 4);

    document.getElementById('target-kcal').value = totalKcal;
    document.getElementById('target-prot').value = prot;
    document.getElementById('target-carbs').value = carbs;
    document.getElementById('target-fats').value = fats;
}

function saveNutriTargets() {
    const newTargets = {
        weight: parseFloat(document.getElementById('calc-weight').value) || 70,
        height: parseInt(document.getElementById('calc-height').value) || 178,
        age: parseInt(document.getElementById('calc-age').value) || 22,
        activity: parseFloat(document.getElementById('calc-activity').value) || 1.55,
        goalDelta: parseInt(document.getElementById('calc-goal').value) || 0,
        kcal: Math.max(1000, parseInt(document.getElementById('target-kcal').value) || 2700),
        prot: Math.max(30, parseInt(document.getElementById('target-prot').value) || 150),
        carbs: Math.max(50, parseInt(document.getElementById('target-carbs').value) || 330),
        fats: Math.max(20, parseInt(document.getElementById('target-fats').value) || 80),
        water: Math.max(1.0, parseFloat(document.getElementById('target-water').value) || 3.0)
    };

    localStorage.setItem('vtaper_nutri_targets', JSON.stringify(newTargets));
    const meta = getGlobalMeta();
    meta.weight = newTargets.weight;
    saveGlobalMeta(meta);

    document.getElementById('nutri-calc-drawer').classList.remove('open');
    updateAllViews();
    alert(`✅ Nouveau bilan appliqué : ${newTargets.kcal} kcal (${newTargets.prot}g P / ${newTargets.carbs}g G / ${newTargets.fats}g L)`);
}

// =========================================================
// 2. INITIALISATION & BASE DE DONNÉES V5
// =========================================================
function initV5Database() {
    let programs = JSON.parse(localStorage.getItem('vtaper_programs_v5') || 'null');
    const oldConfigs = JSON.parse(localStorage.getItem('vtaper_exo_configs') || '{}');

    if (!programs) {
        programs = {};
        Object.entries(PROGRAM_DATA).forEach(([dayKey, dayObj]) => {
            programs[dayKey] = {
                title: dayObj.title,
                subtitle: dayObj.subtitle,
                shortLabel: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
                color: DEFAULT_WORKOUT_COLORS[dayKey] || "#005AA0",
                exercises: dayObj.exercises.map(exo => {
                    const oldCfg = oldConfigs[exo.id];
                    return {
                        id: exo.id,
                        title: exo.name,
                        sets: oldCfg ? oldCfg.sets : exo.sets,
                        repsMin: oldCfg ? oldCfg.repsMin : exo.repsMin,
                        repsMax: oldCfg ? oldCfg.repsMax : exo.repsMax,
                        rir: oldCfg ? oldCfg.rir : exo.rir,
                        rest: oldCfg ? oldCfg.rest : exo.rest,
                        hasWarmupRamp: exo.hasWarmupRamp || false,
                        variants: oldCfg && oldCfg.variants ? oldCfg.variants : [exo.name, exo.alt].filter(Boolean),
                        activeVariantIndex: oldCfg ? (oldCfg.activeVariantIndex || 0) : 0
                    };
                })
            };
        });
    } else {
        Object.entries(programs).forEach(([dayKey, dayObj], idx) => {
            const fallbackColors = ["#005AA0", "#7c3aed", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#ef4444"];
            if (!dayObj.color) dayObj.color = DEFAULT_WORKOUT_COLORS[dayKey] || fallbackColors[idx % fallbackColors.length];
            (dayObj.exercises || []).forEach(exo => {
                if (!exo.title) exo.title = (exo.variants && exo.variants[0]) ? exo.variants[0] : "Exercice";
            });
        });
    }
    localStorage.setItem('vtaper_programs_v5', JSON.stringify(programs));

    let workoutCalendar = JSON.parse(localStorage.getItem('vtaper_workout_calendar_v5') || 'null');
    if (!workoutCalendar) {
        workoutCalendar = {};
        const oldDates = JSON.parse(localStorage.getItem('vtaper_workout_dates') || '[]');
        oldDates.forEach(dKey => { workoutCalendar[dKey] = 'push'; });
        localStorage.setItem('vtaper_workout_calendar_v5', JSON.stringify(workoutCalendar));
    }

    const library = getMachineLibrary();
    Object.values(programs).forEach(day => {
        day.exercises.forEach(exo => {
            (exo.variants || []).forEach(vName => registerMachineInLibrary(vName, library));
        });
    });
    localStorage.setItem('vtaper_machine_library', JSON.stringify(library));

    const firstKey = Object.keys(programs)[0];
    if (!programs[currentDayKey] && firstKey) currentDayKey = firstKey;
}

function getPrograms() { return JSON.parse(localStorage.getItem('vtaper_programs_v5') || '{}'); }
function savePrograms(programs) { localStorage.setItem('vtaper_programs_v5', JSON.stringify(programs)); }
function getWorkoutCalendar() { return JSON.parse(localStorage.getItem('vtaper_workout_calendar_v5') || '{}'); }
function saveWorkoutCalendar(cal) { localStorage.setItem('vtaper_workout_calendar_v5', JSON.stringify(cal)); }
function getMachineLibrary() { return JSON.parse(localStorage.getItem('vtaper_machine_library') || '{}'); }

function registerMachineInLibrary(machineName, libObj = null) {
    if (!machineName) return;
    const lib = libObj || getMachineLibrary();
    const key = toMachineKey(machineName);
    if (!lib[key]) lib[key] = { name: machineName.trim() };
    if (!libObj) localStorage.setItem('vtaper_machine_library', JSON.stringify(lib));
}

function getMachineLogs() { return JSON.parse(localStorage.getItem('vtaper_machine_logs') || '{}'); }

function getLastSessionForMachine(machineName) {
    const logs = getMachineLogs();
    const arr = logs[toMachineKey(machineName)];
    if (!arr || arr.length === 0) return null;
    return arr[arr.length - 1];
}

function computeSessionMetrics(setsArray) {
    let best1RM = 0, tonnage = 0;
    (setsArray || []).forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        if (w > 0 && r > 0) {
            tonnage += (w * r);
            const epley = w * (1 + r / 30);
            if (epley > best1RM) best1RM = epley;
        }
    });
    return { best1RM: parseFloat(best1RM.toFixed(1)), tonnage: Math.round(tonnage) };
}

// =========================================================
// 3. MODE GYM (PROGRAMMES HORIZONTAUX & SÉANCE VERTICALE)
// =========================================================
function renderDaySelectorBar() {
    const programs = getPrograms();
    const nav = document.getElementById('day-selector-bar');
    if (!nav) return;

    let html = '';
    Object.entries(programs).forEach(([dayKey, dayObj]) => {
        const isActive = (dayKey === currentDayKey);
        const label = dayObj.shortLabel || dayObj.title;
        const color = dayObj.color || '#005AA0';
        const activeStyle = isActive
            ? `style="background:${color}; color:#fff; border-color:${color};"`
            : `style="border-bottom: 3px solid ${color};"`;

        html += `<button class="day-btn ${isActive ? 'active' : ''}" ${activeStyle} onclick="loadWorkout('${dayKey}')">${label}</button>`;
    });

    html += `<button class="day-btn add-day-btn" onclick="createNewWorkoutDay()">+ Séance</button>`;
    nav.innerHTML = html;
}

function changeCurrentWorkoutColor(newColor) {
    const programs = getPrograms();
    if (!programs[currentDayKey]) return;
    programs[currentDayKey].color = newColor;
    savePrograms(programs);
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateHomeDashboard();
}

function createNewWorkoutDay() {
    const shortName = prompt("Nom court de l'onglet (ex: Bras, FullBody, Calisthénie) :");
    if (!shortName) return;
    const fullTitle = prompt("Titre complet de la séance :", `SÉANCE : ${shortName.toUpperCase()}`) || shortName;
    const subtitle = prompt("Sous-titre (muscles ciblés) :", "Programme personnalisé") || "";

    const programs = getPrograms();
    const palette = ["#ec4899", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#3b82f6"];
    const randomColor = palette[Object.keys(programs).length % palette.length];

    const newKey = 'prog_' + Date.now();
    programs[newKey] = {
        title: fullTitle,
        subtitle: subtitle,
        shortLabel: shortName.trim(),
        color: randomColor,
        exercises: []
    };
    savePrograms(programs);
    currentDayKey = newKey;
    renderDaySelectorBar();
    loadWorkout(newKey);
    updateHomeDashboard();
}

function renameCurrentWorkout() {
    const programs = getPrograms();
    const cur = programs[currentDayKey];
    if (!cur) return;

    const newShort = prompt("Nom de l'onglet horizontal :", cur.shortLabel || cur.title);
    if (!newShort) return;
    const newTitle = prompt("Titre principal :", cur.title) || cur.title;
    const newSub = prompt("Sous-titre :", cur.subtitle) || cur.subtitle;

    cur.shortLabel = newShort.trim();
    cur.title = newTitle.trim();
    cur.subtitle = newSub.trim();
    savePrograms(programs);
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateHomeDashboard();
}

function deleteCurrentWorkout() {
    const programs = getPrograms();
    if (Object.keys(programs).length <= 1) return alert("Tu dois garder au moins une séance.");
    if (!confirm(`Supprimer définitivement la séance "${programs[currentDayKey].title}" ?`)) return;

    delete programs[currentDayKey];
    savePrograms(programs);
    currentDayKey = Object.keys(programs)[0];
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateHomeDashboard();
}

function populateLibrarySelect() {
    const select = document.getElementById('library-machine-select');
    if (!select) return;
    const lib = getMachineLibrary();
    const sorted = Object.values(lib).sort((a, b) => a.name.localeCompare(b.name));

    select.innerHTML = `<option value="">📚 Choisir une machine existante (${sorted.length} en mémoire)...</option>` +
        sorted.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
}

function onSelectLibraryMachine(val) {
    if (val) {
        document.getElementById('new-exo-machine').value = val;
        const titleInput = document.getElementById('new-exo-title');
        if (!titleInput.value.trim()) titleInput.value = val;
    }
}

function addExerciseToCurrentWorkout() {
    const titleInput = document.getElementById('new-exo-title');
    const machineInput = document.getElementById('new-exo-machine');

    const exoTitle = titleInput.value.trim();
    const machineName = machineInput.value.trim();

    if (!exoTitle && !machineName) return alert("Renseigne un titre d'exercice et/ou une machine.");

    const finalTitle = exoTitle || machineName;
    const finalMachine = machineName || exoTitle;

    const sets = Math.max(1, parseInt(document.getElementById('new-exo-sets').value) || 3);
    const repsMin = Math.max(1, parseInt(document.getElementById('new-exo-min').value) || 8);
    const repsMax = Math.max(repsMin, parseInt(document.getElementById('new-exo-max').value) || 12);
    const rest = Math.max(15, parseInt(document.getElementById('new-exo-rest').value) || 90);

    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const isFirst = workout.exercises.length === 0;

    workout.exercises.push({
        id: 'exo_' + Date.now(),
        title: finalTitle,
        sets,
        repsMin,
        repsMax,
        rir: "1-2",
        rest,
        hasWarmupRamp: isFirst,
        variants: [finalMachine],
        activeVariantIndex: 0
    });

    registerMachineInLibrary(finalMachine);
    savePrograms(programs);

    titleInput.value = '';
    machineInput.value = '';
    document.getElementById('library-machine-select').value = '';
    loadWorkout(currentDayKey);
}

function deleteExerciseFromWorkout(exoId) {
    if (!confirm("Retirer cet exercice de cette séance ?")) return;
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    workout.exercises = workout.exercises.filter(e => e.id !== exoId);
    savePrograms(programs);
    loadWorkout(currentDayKey);
}

function loadWorkout(dayKey) {
    const programs = getPrograms();
    if (!programs[dayKey]) return;
    currentDayKey = dayKey;
    const workout = programs[dayKey];
    const workoutColor = workout.color || '#005AA0';

    renderDaySelectorBar();
    populateLibrarySelect();

    const colorPicker = document.getElementById('workout-color-picker');
    if (colorPicker) colorPicker.value = workoutColor;

    const saveBtn = document.getElementById('gym-save-btn');
    if (saveBtn) saveBtn.style.background = workoutColor;

    if (document.getElementById('view-gym').classList.contains('active')) {
        document.getElementById('header-title').textContent = workout.title;
        document.getElementById('header-subtitle').textContent = workout.subtitle;
    }

    const container = document.getElementById('workout-container');
    container.innerHTML = '';

    const lib = getMachineLibrary();
    const allLibNames = Object.values(lib).map(x => x.name).sort();

    workout.exercises.forEach(exo => {
        const activeIdx = Math.min(exo.activeVariantIndex || 0, exo.variants.length - 1);
        const currentMachineName = exo.variants[activeIdx];
        const exoTitle = exo.title || currentMachineName;
        const mKey = toMachineKey(currentMachineName);

        const lastPerf = getLastSessionForMachine(currentMachineName);
        const coach = getCoachRecommendation(exo, lastPerf);

        const optionsHTML = exo.variants.map((vName, idx) =>
            `<option value="${idx}" ${idx === activeIdx ? 'selected' : ''}>📍 ${vName}</option>`
        ).join('');

        const chipsHTML = exo.variants.map((vName, idx) => `
            <span class="variant-chip">
                ${vName}
                ${exo.variants.length > 1 ? `<button onclick="removeVariant('${exo.id}', ${idx})">✕</button>` : ''}
            </span>
        `).join('');

        const datalistId = `dl_${exo.id}`;
        const datalistHTML = `<datalist id="${datalistId}">${allLibNames.map(n => `<option value="${n}">`).join('')}</datalist>`;

        let setsHTML = '';
        for (let i = 0; i < exo.sets; i++) {
            const targetW = coach.prefillSets[i] ? coach.prefillSets[i].weight : '';
            const targetR = coach.prefillSets[i] ? coach.prefillSets[i].reps : exo.repsMin;

            setsHTML += `
                <div class="set-row" id="row_${exo.id}_${i}">
                    <span class="set-num">S${i + 1}</span>
                    <div class="stepper-control">
                        <button class="step-btn" onclick="stepValue('${exo.id}', ${i}, 'weight', -1)">−</button>
                        <input type="number" step="0.5" inputmode="decimal" class="set-input weight-input" 
                               placeholder="kg" value="${targetW}" oninput="onSetInputChange('${exo.id}', ${i})">
                        <button class="step-btn" onclick="stepValue('${exo.id}', ${i}, 'weight', 1)">+</button>
                    </div>
                    <div class="stepper-control">
                        <button class="step-btn" onclick="stepValue('${exo.id}', ${i}, 'reps', -1)">−</button>
                        <input type="number" inputmode="numeric" class="set-input reps-input" 
                               placeholder="${exo.repsMin}-${exo.repsMax}" value="${targetR}" oninput="onSetInputChange('${exo.id}', ${i})">
                        <button class="step-btn" onclick="stepValue('${exo.id}', ${i}, 'reps', 1)">+</button>
                    </div>
                    <button class="check-btn" onclick="toggleSet('${exo.id}', ${i}, ${exo.rest})">✓</button>
                </div>
            `;
        }

        const initialWeight = coach.prefillSets[0] ? coach.prefillSets[0].weight : 0;
        const warmupHTML = exo.hasWarmupRamp ? `
            <div class="warmup-box" id="warmup_${exo.id}">
                ${getWarmupText(initialWeight)}
            </div>
        ` : '';

        const card = document.createElement('div');
        card.className = 'exo-card';
        card.style.borderTop = `3px solid ${workoutColor}`;
        card.innerHTML = `
            <div class="exo-header">
                <div>
                    <div class="exo-title">${exoTitle}</div>
                    <div style="font-size:0.65rem; color:var(--text-muted); font-family:monospace;">ID machine : ${mKey}</div>
                </div>
                <button class="gear-btn" onclick="toggleSettingsDrawer('${exo.id}')">⚙️</button>
            </div>

            <div class="machine-selector-row">
                <select class="machine-select" onchange="selectMachineVariant('${exo.id}', this.value)">
                    ${optionsHTML}
                </select>
            </div>

            <div class="settings-drawer" id="drawer_${exo.id}">
                <div style="margin-bottom:8px;">
                    <label style="font-size:0.65rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Titre de l'exercice</label>
                    <input type="text" id="cfg_title_${exo.id}" class="set-input" value="${exoTitle}" style="background:#fff; text-align:left; padding:6px 10px; margin-top:3px; font-size:0.85rem;">
                </div>
                <div class="settings-grid">
                    <div class="settings-field"><label>Séries</label><input type="number" id="cfg_sets_${exo.id}" value="${exo.sets}"></div>
                    <div class="settings-field"><label>Reps Min</label><input type="number" id="cfg_min_${exo.id}" value="${exo.repsMin}"></div>
                    <div class="settings-field"><label>Reps Max</label><input type="number" id="cfg_max_${exo.id}" value="${exo.repsMax}"></div>
                    <div class="settings-field"><label>RIR cible</label><input type="text" id="cfg_rir_${exo.id}" value="${exo.rir}"></div>
                    <div class="settings-field"><label>Repos (sec)</label><input type="number" id="cfg_rest_${exo.id}" value="${exo.rest}"></div>
                    <div class="settings-field" style="display:flex; align-items:flex-end;">
                        <button class="primary-btn" style="padding:7px; font-size:0.75rem;" onclick="applyExoSettings('${exo.id}')">Sauver</button>
                    </div>
                </div>
                <div style="border-top:1px solid var(--border); padding-top:8px;">
                    <label style="font-size:0.68rem; font-weight:800; color:var(--text-muted);">MACHINES DISPONIBLES POUR CET EXERCICE :</label>
                    <div class="variant-chip-list">${chipsHTML}</div>
                    ${datalistHTML}
                    <div style="display:flex; gap:6px; margin-top:6px;">
                        <input type="text" list="${datalistId}" id="new_var_${exo.id}" class="set-input" placeholder="Ajouter une machine..." style="padding:6px 10px; font-size:0.78rem; text-align:left; background:#fff;">
                        <button class="secondary-btn" style="padding:6px 12px; font-size:0.78rem; width:auto;" onclick="addVariant('${exo.id}')">+ Machine</button>
                    </div>
                </div>
                <div style="border-top:1px solid var(--border); margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <label style="font-size:0.7rem; color:var(--text-muted);">
                        <input type="checkbox" ${exo.hasWarmupRamp ? 'checked' : ''} onchange="toggleWarmupFlag('${exo.id}', this.checked)"> Rampe d'échauffement
                    </label>
                    <button class="mini-tool-btn danger" onclick="deleteExerciseFromWorkout('${exo.id}')">🗑️ Retirer l'exo</button>
                </div>
            </div>

            <div class="exo-meta">
                <span class="badge">🎯 ${exo.sets}×${exo.repsMin}-${exo.repsMax}</span>
                <span class="badge">⚡ RIR ${exo.rir}</span>
                <span class="badge">⏱️ ${exo.rest}s</span>
                <span class="badge badge-1rm" id="1rm_${exo.id}">💪 1RM : -- kg</span>
            </div>
            ${coach.bannerHTML}
            ${warmupHTML}
            <div class="sets-header">
                <span>#</span><span>Poids (kg)</span><span>Reps</span><span>OK</span>
            </div>
            ${setsHTML}
        `;
        container.appendChild(card);
        updateExerciseMetrics(exo.id);
    });
}

function toggleSettingsDrawer(exoId) {
    const drawer = document.getElementById(`drawer_${exoId}`);
    if (drawer) drawer.classList.toggle('open');
}

function toggleWarmupFlag(exoId, checked) {
    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo) return;
    exo.hasWarmupRamp = checked;
    savePrograms(programs);
    loadWorkout(currentDayKey);
}

function selectMachineVariant(exoId, variantIndex) {
    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo) return;
    exo.activeVariantIndex = parseInt(variantIndex);
    savePrograms(programs);
    loadWorkout(currentDayKey);
}

function applyExoSettings(exoId) {
    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo) return;

    const newTitle = document.getElementById(`cfg_title_${exoId}`).value.trim();
    if (newTitle) exo.title = newTitle;

    exo.sets = Math.max(1, parseInt(document.getElementById(`cfg_sets_${exoId}`).value) || 3);
    exo.repsMin = Math.max(1, parseInt(document.getElementById(`cfg_min_${exoId}`).value) || 6);
    exo.repsMax = Math.max(exo.repsMin, parseInt(document.getElementById(`cfg_max_${exoId}`).value) || 10);
    exo.rir = document.getElementById(`cfg_rir_${exoId}`).value || "1-2";
    exo.rest = Math.max(15, parseInt(document.getElementById(`cfg_rest_${exoId}`).value) || 90);

    savePrograms(programs);
    loadWorkout(currentDayKey);
}

function addVariant(exoId) {
    const input = document.getElementById(`new_var_${exoId}`);
    const val = input.value.trim();
    if (!val) return alert("Entre ou sélectionne le nom de la machine.");

    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo) return;

    if (!exo.variants.includes(val)) exo.variants.push(val);
    exo.activeVariantIndex = exo.variants.indexOf(val);

    registerMachineInLibrary(val);
    savePrograms(programs);
    loadWorkout(currentDayKey);
}

function removeVariant(exoId, idx) {
    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo || exo.variants.length <= 1) return;

    const removedName = exo.variants[idx];
    exo.variants.splice(idx, 1);
    exo.activeVariantIndex = 0;
    savePrograms(programs);

    const logs = getMachineLogs();
    const mKey = toMachineKey(removedName);
    if (!logs[mKey] || logs[mKey].length === 0) {
        const lib = getMachineLibrary();
        delete lib[mKey];
        localStorage.setItem('vtaper_machine_library', JSON.stringify(lib));
    }

    loadWorkout(currentDayKey);
}

function getCoachRecommendation(exo, lastPerf) {
    const emptySets = Array.from({ length: exo.sets }, () => ({ weight: '', reps: exo.repsMin }));
    if (!lastPerf || !lastPerf.sets || lastPerf.sets.length === 0) {
        return {
            bannerHTML: `<div class="coach-banner"><span>💡 Aucune donnée sur cette machine : trouve ta charge à RIR ${exo.rir}</span></div>`,
            prefillSets: emptySets
        };
    }

    const lastWeight = parseFloat(lastPerf.sets[0].weight) || 0;
    const allMaxed = lastPerf.sets.length >= exo.sets && lastPerf.sets.every(s => parseInt(s.reps) >= exo.repsMax);

    if (allMaxed && lastWeight > 0) {
        const nextWeight = lastWeight + 2;
        return {
            bannerHTML: `<div class="coach-banner level-up">
                            <span>🔥 <b>Coach :</b> Validé le ${lastPerf.displayDate} ! Passe à <b>${nextWeight} kg</b></span>
                            <span>+2 kg</span>
                         </div>`,
            prefillSets: Array.from({ length: exo.sets }, () => ({ weight: nextWeight, reps: exo.repsMin }))
        };
    } else {
        const prefill = Array.from({ length: exo.sets }, (_, i) => {
            const prev = lastPerf.sets[i] || lastPerf.sets[0];
            const prevReps = parseInt(prev.reps) || exo.repsMin;
            return { weight: prev.weight || lastWeight, reps: Math.min(prevReps + 1, exo.repsMax) };
        });
        return {
            bannerHTML: `<div class="coach-banner">
                            <span>🎯 <b>Coach :</b> Garde <b>${lastWeight} kg</b> et vise +1 rep</span>
                            <span>Vu le ${lastPerf.displayDate}</span>
                         </div>`,
            prefillSets: prefill
        };
    }
}

function stepValue(exoId, setIndex, type, delta) {
    const row = document.getElementById(`row_${exoId}_${setIndex}`);
    const input = row.querySelector(type === 'weight' ? '.weight-input' : '.reps-input');
    const currentVal = parseFloat(input.value) || 0;
    input.value = Math.max(0, currentVal + delta);
    onSetInputChange(exoId, setIndex);
}

function onSetInputChange(exoId, setIndex) {
    if (setIndex === 0) {
        const row0 = document.getElementById(`row_${exoId}_0`);
        updateWarmup(exoId, row0.querySelector('.weight-input').value);
    }
    updateExerciseMetrics(exoId);
}

function updateExerciseMetrics(exoId) {
    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo) return;

    let best1RM = 0;
    for (let i = 0; i < exo.sets; i++) {
        const row = document.getElementById(`row_${exoId}_${i}`);
        if (!row) continue;
        const w = parseFloat(row.querySelector('.weight-input').value) || 0;
        const r = parseInt(row.querySelector('.reps-input').value) || 0;
        if (w > 0 && r > 0) {
            const epley = w * (1 + r / 30);
            if (epley > best1RM) best1RM = epley;
        }
    }
    const badge1RM = document.getElementById(`1rm_${exoId}`);
    if (badge1RM) badge1RM.textContent = best1RM > 0 ? `💪 1RM : ${best1RM.toFixed(1)} kg` : `💪 1RM : -- kg`;
}

function getWarmupText(weight) {
    const w = parseFloat(weight);
    if (!w || w <= 0) return `🔥 <b>Rampe nerveuse :</b> Entre ton poids en S1 pour calculer tes paliers (50% / 75% / 90%).`;
    return `🔥 <b>Rampe :</b> 10 reps à <b>${Math.round(w * 0.5)}kg</b> ➔ 5 reps à <b>${Math.round(w * 0.75)}kg</b> ➔ 2 reps à <b>${Math.round(w * 0.9)}kg</b>`;
}

function updateWarmup(exoId, val) {
    const box = document.getElementById(`warmup_${exoId}`);
    if (box) box.innerHTML = getWarmupText(val);
}

// =========================================================
// 4. SAUVEGARDE DE LA SÉANCE
// =========================================================
function saveWorkoutSession() {
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const machineLogs = getMachineLogs();
    const todayKey = getTodayDateKey();
    const displayDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    let savedCount = 0;

    workout.exercises.forEach(exo => {
        const activeIdx = Math.min(exo.activeVariantIndex || 0, exo.variants.length - 1);
        const machineName = exo.variants[activeIdx];
        const mKey = toMachineKey(machineName);

        const setsData = [];
        for (let i = 0; i < exo.sets; i++) {
            const row = document.getElementById(`row_${exo.id}_${i}`);
            if (!row) continue;
            const weight = row.querySelector('.weight-input').value;
            const reps = row.querySelector('.reps-input').value;
            if (weight || reps) setsData.push({ weight, reps });
        }

        if (setsData.length > 0) {
            savedCount++;
            registerMachineInLibrary(machineName);
            const metrics = computeSessionMetrics(setsData);
            if (!machineLogs[mKey]) machineLogs[mKey] = [];

            const entry = {
                dateKey: todayKey,
                displayDate: displayDate,
                machineName: machineName,
                sets: setsData,
                best1RM: metrics.best1RM,
                tonnage: metrics.tonnage
            };

            const existingTodayIdx = machineLogs[mKey].findIndex(x => x.dateKey === todayKey);
            if (existingTodayIdx >= 0) machineLogs[mKey][existingTodayIdx] = entry;
            else machineLogs[mKey].push(entry);
        }
    });

    if (savedCount === 0) return alert("Remplis au moins une série avant de sauvegarder.");

    localStorage.setItem('vtaper_machine_logs', JSON.stringify(machineLogs));

    const cal = getWorkoutCalendar();
    cal[todayKey] = currentDayKey;
    saveWorkoutCalendar(cal);

    const meta = getGlobalMeta();
    meta.sessions = Object.keys(cal).length;
    saveGlobalMeta(meta);

    alert(`✅ Séance "${workout.shortLabel || workout.title}" validée et colorée sur ton calendrier !`);
    loadWorkout(currentDayKey);
    updateAllViews();
}

// =========================================================
// 5. NAVIGATION & ACCUEIL PERSONNALISABLE
// =========================================================
function getNutriLogs() {
    const logs = JSON.parse(localStorage.getItem('vtaper_nutri_logs') || '{}');
    const todayKey = getTodayDateKey();
    if (!logs[todayKey]) {
        logs[todayKey] = { water: 0, kcal: 0, prot: 0, carbs: 0, fats: 0, meals: [] };
        localStorage.setItem('vtaper_nutri_logs', JSON.stringify(logs));
    }
    return logs;
}

function getDayNutri(dateKey) {
    const logs = getNutriLogs();
    if (!logs[dateKey]) logs[dateKey] = { water: 0, kcal: 0, prot: 0, carbs: 0, fats: 0, meals: [] };
    return logs[dateKey];
}

function saveDayNutri(dateKey, dayData) {
    const logs = getNutriLogs();
    logs[dateKey] = dayData;
    localStorage.setItem('vtaper_nutri_logs', JSON.stringify(logs));
    updateAllViews();
}

function getGlobalMeta() {
    return JSON.parse(localStorage.getItem('vtaper_meta') || '{"weight":70.0, "sessions":0}');
}

function saveGlobalMeta(meta) {
    localStorage.setItem('vtaper_meta', JSON.stringify(meta));
}

function updateAllViews() {
    updateHomeDashboard();
    updateNutriView();
    updateProgressView();
}

function switchTab(tabName) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

    document.getElementById(`view-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    const editBtn = document.getElementById('edit-home-btn');
    if (editBtn) editBtn.style.display = (tabName === 'home') ? 'inline-block' : 'none';

    const homeCfg = getHomeConfig();
    const targets = getNutriTargets();
    const programs = getPrograms();
    const curProg = programs[currentDayKey] || { title: "Mode Gym", subtitle: "" };

    const titles = {
        home: [homeCfg.title, homeCfg.subtitle],
        gym: [curProg.title, curProg.subtitle],
        nutri: ["Nutrition & Calendrier", `Cible : ${targets.kcal} kcal · ${targets.prot}g Protéines`],
        progress: ["Progrès & Courbes", "Évolution par Machine, Synthèse & Poids"]
    };
    document.getElementById('header-title').textContent = titles[tabName][0];
    document.getElementById('header-subtitle').textContent = titles[tabName][1];

    updateAllViews();
    window.scrollTo(0, 0);
}

function updateHomeDashboard() {
    const todayData = getDayNutri(getTodayDateKey());
    const targets = getNutriTargets();
    const programs = getPrograms();
    const curProg = programs[currentDayKey] || Object.values(programs)[0];

    if (document.getElementById('view-home').classList.contains('active')) {
        const homeCfg = getHomeConfig();
        document.getElementById('header-title').textContent = homeCfg.title;
        document.getElementById('header-subtitle').textContent = homeCfg.subtitle;
    }

    document.getElementById('home-kcal').textContent = todayData.kcal;
    document.getElementById('home-kcal-target').textContent = `/ ${targets.kcal} kcal`;
    document.getElementById('home-kcal-bar').style.width = `${Math.min((todayData.kcal / targets.kcal) * 100, 100)}%`;
    document.getElementById('home-prot').textContent = `${todayData.prot} / ${targets.prot}g`;
    document.getElementById('home-carbs').textContent = `${todayData.carbs} / ${targets.carbs}g`;
    document.getElementById('home-fats').textContent = `${todayData.fats} / ${targets.fats}g`;

    document.getElementById('home-water').textContent = `${(todayData.water || 0).toFixed(2)} / ${targets.water.toFixed(1)} L`;
    document.getElementById('home-water-bar').style.width = `${Math.min(((todayData.water || 0) / targets.water) * 100, 100)}%`;

    if (curProg) {
        document.getElementById('home-next-workout').textContent = curProg.title;
        document.getElementById('home-next-sub').textContent = curProg.subtitle;
        const btn = document.getElementById('home-gym-btn');
        if (btn) btn.style.background = curProg.color || '#005AA0';
    }

    renderHomeCalendar();
}

function changeHomeMonth(delta) {
    homeCalMonthOffset += delta;
    renderHomeCalendar();
}

function renderHomeCalendar() {
    const grid = document.getElementById('calendar-grid');
    const legend = document.getElementById('calendar-legend');
    if (!grid) return;

    const targetDate = new Date();
    targetDate.setDate(1);
    targetDate.setMonth(targetDate.getMonth() + homeCalMonthOffset);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const todayKey = getTodayDateKey();

    const monthNames = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
    document.getElementById('cal-month-title').textContent = `${monthNames[month]} ${year}`;

    const cal = getWorkoutCalendar();
    const programs = getPrograms();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

    let html = '';
    let monthCount = 0;

    for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const assignedProgKey = cal[dateKey];
        const isToday = (dateKey === todayKey);

        const classes = ['cal-day', 'nutri-clickable'];
        if (isToday) classes.push('today');

        let inlineStyle = '';
        if (assignedProgKey) {
            monthCount++;
            const progColor = (programs[assignedProgKey] && programs[assignedProgKey].color)
                ? programs[assignedProgKey].color
                : '#005AA0';
            inlineStyle = `style="background:${progColor}; color:#fff; font-weight:800; border-color:${progColor}; box-shadow:0 2px 6px ${progColor}55;"`;
        }

        html += `<div class="${classes.join(' ')}" ${inlineStyle} onclick="openCalModal('${dateKey}')">${day}</div>`;
    }

    grid.innerHTML = html;
    document.getElementById('cal-month-count').textContent = `${monthCount} séance${monthCount > 1 ? 's' : ''}`;

    if (legend) {
        legend.innerHTML = Object.values(programs).map(p => `
            <span class="legend-item">
                <i class="legend-dot" style="background:${p.color || '#005AA0'};"></i>
                ${p.shortLabel || p.title}
            </span>
        `).join('');
    }
}

function openCalModal(dateKey) {
    modalTargetDateKey = dateKey;
    const modal = document.getElementById('cal-picker-modal');
    const title = document.getElementById('modal-date-title');
    const list = document.getElementById('modal-workout-list');
    if (!modal || !list) return;

    title.textContent = `SÉANCE DU ${dateKey.split('-').reverse().join('/')}`;
    const programs = getPrograms();
    const cal = getWorkoutCalendar();
    const currentAssigned = cal[dateKey];

    let buttonsHTML = Object.entries(programs).map(([dayKey, dayObj]) => {
        const color = dayObj.color || '#005AA0';
        const isSelected = (currentAssigned === dayKey);
        return `
            <button class="modal-workout-btn" style="border-left: 6px solid ${color}; ${isSelected ? 'background:#eff6ff;' : ''}" onclick="assignWorkoutToDate('${dayKey}')">
                <span>${dayObj.shortLabel || dayObj.title} <small style="font-weight:500; color:var(--text-muted);">(${dayObj.subtitle || ''})</small></span>
                <span style="width:14px; height:14px; border-radius:50%; background:${color}; display:inline-block;"></span>
            </button>
        `;
    }).join('');

    if (currentAssigned) {
        buttonsHTML += `
            <button class="modal-workout-btn" style="color:#dc2626; justify-content:center; margin-top:4px;" onclick="assignWorkoutToDate(null)">
                🗑️ Effacer la séance de ce jour
            </button>
        `;
    }

    list.innerHTML = buttonsHTML;
    modal.classList.add('open');
}

function closeCalModal(e) {
    const modal = document.getElementById('cal-picker-modal');
    if (modal) modal.classList.remove('open');
}

function assignWorkoutToDate(dayKey) {
    if (!modalTargetDateKey) return;
    const cal = getWorkoutCalendar();
    if (dayKey === null) delete cal[modalTargetDateKey];
    else cal[modalTargetDateKey] = dayKey;
    saveWorkoutCalendar(cal);
    closeCalModal();
    updateAllViews();
}

// =========================================================
// 6. NUTRITION & PROGRÈS
// =========================================================
function addWater(liters) {
    const todayKey = getTodayDateKey();
    const dayData = getDayNutri(todayKey);
    dayData.water = Math.max(0, (dayData.water || 0) + liters);
    saveDayNutri(todayKey, dayData);
}

function getFavoriteMeals() {
    const favs = localStorage.getItem('vtaper_fav_meals');
    if (!favs) {
        localStorage.setItem('vtaper_fav_meals', JSON.stringify(DEFAULT_FAVORITES));
        return DEFAULT_FAVORITES;
    }
    return JSON.parse(favs);
}

function renderFavorites() {
    const favs = getFavoriteMeals();
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    grid.innerHTML = favs.map((f, idx) => `
        <div class="fav-card-wrap">
            <button class="preset-btn" onclick="addFavMealByIndex(${idx})">
                <strong>${f.name}</strong>
                <span>${f.kcal} kcal · ${f.prot}g P</span>
            </button>
            <button class="fav-del-x" onclick="deleteFavoriteMeal(${idx})">✕</button>
        </div>
    `).join('');
}

function addFavMealByIndex(idx) {
    const fav = getFavoriteMeals()[idx];
    if (fav) addMealToSelectedDay(fav.name, fav.kcal, fav.prot, fav.carbs, fav.fats);
}

function deleteFavoriteMeal(idx) {
    const favs = getFavoriteMeals();
    favs.splice(idx, 1);
    localStorage.setItem('vtaper_fav_meals', JSON.stringify(favs));
    renderFavorites();
}

function addMealToSelectedDay(name, kcal, prot, carbs, fats) {
    const dayData = getDayNutri(selectedNutriDateKey);
    dayData.kcal += kcal; dayData.prot += prot; dayData.carbs += carbs; dayData.fats += fats;
    dayData.meals.push({ name, kcal, prot, carbs, fats });
    saveDayNutri(selectedNutriDateKey, dayData);
}

function addCustomMeal(saveAsFav) {
    const name = document.getElementById('custom-food-name').value.trim() || 'Repas rapide';
    const kcal = parseInt(document.getElementById('custom-kcal').value) || 0;
    const prot = parseInt(document.getElementById('custom-prot').value) || 0;
    const carbs = parseInt(document.getElementById('custom-carbs').value) || 0;
    const fats = parseInt(document.getElementById('custom-fats').value) || 0;

    if (kcal <= 0 && prot <= 0) return alert("Entre au moins les calories ou les protéines.");

    if (saveAsFav) {
        const favs = getFavoriteMeals();
        favs.push({ name, kcal, prot, carbs, fats });
        localStorage.setItem('vtaper_fav_meals', JSON.stringify(favs));
        renderFavorites();
    }

    addMealToSelectedDay(name, kcal, prot, carbs, fats);

    document.getElementById('custom-food-name').value = '';
    document.getElementById('custom-kcal').value = '';
    document.getElementById('custom-prot').value = '';
    document.getElementById('custom-carbs').value = '';
    document.getElementById('custom-fats').value = '';
}

function removeMeal(index) {
    const dayData = getDayNutri(selectedNutriDateKey);
    const m = dayData.meals[index];
    if (!m) return;
    dayData.kcal = Math.max(0, dayData.kcal - m.kcal);
    dayData.prot = Math.max(0, dayData.prot - m.prot);
    dayData.carbs = Math.max(0, dayData.carbs - m.carbs);
    dayData.fats = Math.max(0, dayData.fats - m.fats);
    dayData.meals.splice(index, 1);
    saveDayNutri(selectedNutriDateKey, dayData);
}

function resetNutriDay() {
    if (!confirm(`Vider les repas du jour (${selectedNutriDateKey}) ?`)) return;
    const dayData = getDayNutri(selectedNutriDateKey);
    dayData.kcal = 0; dayData.prot = 0; dayData.carbs = 0; dayData.fats = 0; dayData.meals = [];
    saveDayNutri(selectedNutriDateKey, dayData);
}

function changeNutriMonth(delta) {
    nutriCalMonthOffset += delta;
    renderNutriCalendar();
}

function selectNutriDate(dateKey) {
    selectedNutriDateKey = dateKey;
    updateNutriView();
}

function renderNutriCalendar() {
    const grid = document.getElementById('nutri-calendar-grid');
    if (!grid) return;

    const targets = getNutriTargets();
    document.getElementById('nutri-cal-legend-ok').textContent = `🟢 ≥${targets.kcal}`;
    document.getElementById('nutri-cal-legend-low').textContent = `🟠 <${targets.kcal}`;

    const targetDate = new Date();
    targetDate.setDate(1);
    targetDate.setMonth(targetDate.getMonth() + nutriCalMonthOffset);

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const monthNames = ["JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"];
    document.getElementById('nutri-cal-title').textContent = `${monthNames[month]} ${year}`;

    const logs = getNutriLogs();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

    let html = '';
    for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayLog = logs[dateKey];
        const kcal = dayLog ? dayLog.kcal : 0;

        const classes = ['cal-day', 'nutri-clickable'];
        if (dateKey === selectedNutriDateKey) classes.push('nutri-selected');
        if (kcal >= targets.kcal) classes.push('kcal-ok');
        else if (kcal > 0) classes.push('kcal-low');

        html += `<div class="${classes.join(' ')}" onclick="selectNutriDate('${dateKey}')">${day}</div>`;
    }
    grid.innerHTML = html;
}

function updateNutriView() {
    renderNutriCalendar();
    renderFavorites();

    const targets = getNutriTargets();
    const dayData = getDayNutri(selectedNutriDateKey);
    const isToday = (selectedNutriDateKey === getTodayDateKey());
    document.getElementById('nutri-selected-date-label').textContent = isToday ? "BILAN D'AUJOURD'HUI" : `BILAN DU ${selectedNutriDateKey}`;

    document.getElementById('nutri-kcal').textContent = dayData.kcal;
    document.getElementById('nutri-kcal-target').textContent = `/ ${targets.kcal} kcal`;
    document.getElementById('nutri-kcal-bar').style.width = `${Math.min((dayData.kcal / targets.kcal) * 100, 100)}%`;
    document.getElementById('nutri-prot').textContent = `${dayData.prot} / ${targets.prot}g`;
    document.getElementById('nutri-carbs').textContent = `${dayData.carbs} / ${targets.carbs}g`;
    document.getElementById('nutri-fats').textContent = `${dayData.fats} / ${targets.fats}g`;

    const list = document.getElementById('meals-log-list');
    if (!dayData.meals || dayData.meals.length === 0) {
        list.innerHTML = `<p style="font-size:0.78rem; color:var(--text-muted);">Aucun repas enregistré à cette date.</p>`;
        return;
    }

    list.innerHTML = dayData.meals.map((m, idx) => `
        <div class="meal-log-item">
            <div>
                <strong>${m.name}</strong>
                <div style="font-size:0.72rem; color:var(--text-muted);">${m.kcal} kcal · ${m.prot}g P · ${m.carbs}g G · ${m.fats}g L</div>
            </div>
            <button class="meal-del-btn" onclick="removeMeal(${idx})">✕</button>
        </div>
    `).join('');
}

function saveBodyWeight() {
    const val = parseFloat(document.getElementById('weight-input-field').value);
    if (!val || val < 40 || val > 150) return alert("Entre un poids valide en kg.");

    const meta = getGlobalMeta();
    meta.weight = val;
    saveGlobalMeta(meta);

    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
    weightLog.push({ date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), w: val });
    localStorage.setItem('vtaper_weights', JSON.stringify(weightLog));

    document.getElementById('weight-input-field').value = '';
    updateAllViews();
}

function updateProgressView() {
    const machineLogs = getMachineLogs();
    const cal = getWorkoutCalendar();
    const meta = getGlobalMeta();
    const select = document.getElementById('progress-machine-select');
    const prevSelectedKey = select ? select.value : '';

    const cwDisplay = document.getElementById('current-weight-display');
    if (cwDisplay) cwDisplay.textContent = parseFloat(meta.weight || 70.0).toFixed(1);

    let recordsHTML = '';
    let totalTonnage = 0;
    let totalSessionsLogged = 0;
    let bestOverall1RM = 0;
    const machineKeysWithData = [];

    Object.entries(machineLogs).forEach(([mKey, sessionsArr]) => {
        if (!sessionsArr || sessionsArr.length === 0) return;
        machineKeysWithData.push({ key: mKey, name: sessionsArr[sessionsArr.length - 1].machineName, count: sessionsArr.length });

        let max1RM = 0;
        sessionsArr.forEach(sess => {
            totalTonnage += (sess.tonnage || 0);
            totalSessionsLogged++;
            if (sess.best1RM > max1RM) max1RM = sess.best1RM;
            if (sess.best1RM > bestOverall1RM) bestOverall1RM = sess.best1RM;
        });

        const first1RM = sessionsArr[0].best1RM || 1;
        const last1RM = sessionsArr[sessionsArr.length - 1].best1RM || 0;
        const pctGain = sessionsArr.length > 1 ? (((last1RM - first1RM) / first1RM) * 100).toFixed(1) : '0.0';

        recordsHTML += `
            <div class="record-row" onclick="selectMachineInProgress('${mKey}')" style="cursor:pointer;">
                <div>
                    <strong>${sessionsArr[sessionsArr.length - 1].machineName}</strong>
                    <div style="font-size:0.68rem; color:var(--text-muted);">${sessionsArr.length} séance(s) · Évol : ${pctGain >= 0 ? '+' : ''}${pctGain}%</div>
                </div>
                <span class="record-val">Max 1RM : ${max1RM.toFixed(1)} kg</span>
            </div>
        `;
    });

    document.getElementById('muscle-summary-grid').innerHTML = `
        <div class="summary-box">
            <div class="summary-box-title">Machines Actives</div>
            <div class="summary-box-val">${machineKeysWithData.length}</div>
            <div class="summary-box-sub">Enregistrées en base</div>
        </div>
        <div class="summary-box">
            <div class="summary-box-title">Record 1RM Absolu</div>
            <div class="summary-box-val">${bestOverall1RM > 0 ? bestOverall1RM.toFixed(1) + ' kg' : '--'}</div>
            <div class="summary-box-sub">Toutes machines</div>
        </div>
        <div class="summary-box">
            <div class="summary-box-title">Volume Cumulé</div>
            <div class="summary-box-val">${(totalTonnage / 1000).toFixed(1)} t</div>
            <div class="summary-box-sub">${totalSessionsLogged} relevés machines</div>
        </div>
        <div class="summary-box">
            <div class="summary-box-title">Assiduité</div>
            <div class="summary-box-val">${Object.keys(cal).length} j</div>
            <div class="summary-box-sub">Séances validées</div>
        </div>
    `;

    document.getElementById('records-list').innerHTML = recordsHTML || `<p style="font-size:0.78rem; color:var(--text-muted);">Valide une séance pour alimenter ta bibliothèque de performances.</p>`;

    if (select) {
        if (machineKeysWithData.length === 0) {
            select.innerHTML = `<option value="">-- Enregistre une séance pour voir les courbes --</option>`;
        } else {
            select.innerHTML = machineKeysWithData.map(m =>
                `<option value="${m.key}" ${m.key === prevSelectedKey ? 'selected' : ''}>📈 ${m.name} (${m.count} séances)</option>`
            ).join('');
        }
        renderMachineProgressChart();
    }

    renderBodyWeightChart();
}

function selectMachineInProgress(mKey) {
    const select = document.getElementById('progress-machine-select');
    if (select) {
        select.value = mKey;
        renderMachineProgressChart();
    }
}

function renderMachineProgressChart() {
    const select = document.getElementById('progress-machine-select');
    const chartBox = document.getElementById('machine-chart-box');
    const logBox = document.getElementById('machine-history-log');
    if (!select || !chartBox || !logBox) return;

    const mKey = select.value;
    const logs = getMachineLogs();
    const sessions = logs[mKey] || [];

    if (sessions.length === 0) {
        chartBox.innerHTML = `<p style="font-size:0.78rem; color:var(--text-muted);">Aucune séance enregistrée sur cette machine.</p>`;
        logBox.innerHTML = '';
        return;
    }

    logBox.innerHTML = sessions.slice(-5).reverse().map(s => {
        const setsStr = s.sets.map(x => `${x.weight}kg×${x.reps}`).join(' | ');
        return `<div style="font-size:0.74rem; background:var(--bg-elevated); padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between;">
                    <span><b>${s.displayDate}</b> : ${setsStr}</span>
                    <strong style="color:var(--accent);">1RM ${s.best1RM}kg</strong>
                </div>`;
    }).join('');

    const recent = sessions.slice(-8);
    if (recent.length < 2) {
        chartBox.innerHTML = `<p style="font-size:0.78rem; color:var(--text-muted);">1 séance enregistrée (1RM : <b>${recent[0].best1RM} kg</b> le ${recent[0].displayDate}). Dès ta 2e séance sur cette machine, ta courbe s'affichera ici !</p>`;
        return;
    }

    const vals = recent.map(d => d.best1RM);
    const minV = Math.min(...vals) - 2;
    const maxV = Math.max(...vals) + 2;
    const width = 300, height = 115;

    const points = recent.map((d, i) => {
        const x = 24 + (i / (recent.length - 1)) * (width - 48);
        const y = height - 22 - ((d.best1RM - minV) / (maxV - minV || 1)) * (height - 48);
        return { x, y, val: d.best1RM, date: d.displayDate };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const circles = points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#005AA0" />
        <text x="${p.x}" y="${p.y - 7}" fill="#111827" font-size="8.5" font-weight="bold" text-anchor="middle">${p.val}kg</text>
        <text x="${p.x}" y="${height - 5}" fill="#64748b" font-size="7.5" text-anchor="middle">${p.date}</text>
    `).join('');

    chartBox.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%">
            <polyline fill="none" stroke="#005AA0" stroke-width="3" points="${polyline}" />
            ${circles}
        </svg>
    `;
}

function renderBodyWeightChart() {
    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
    const latestW = weightLog[weightLog.length - 1].w;
    const diff = (latestW - 70.0).toFixed(1);
    document.getElementById('weight-diff-badge').textContent = `${diff >= 0 ? '+' : ''}${diff} kg vs départ`;

    const chartBox = document.getElementById('weight-chart-box');
    const recent = weightLog.slice(-8);
    if (recent.length < 2) {
        chartBox.innerHTML = `<p style="font-size:0.78rem; color:var(--text-muted);">Entre une pesée pour tracer ta courbe vers 80 kg.</p>`;
        return;
    }

    const minW = Math.min(...recent.map(d => d.w)) - 0.5;
    const maxW = Math.max(...recent.map(d => d.w)) + 0.5;
    const width = 300, height = 110;

    const points = recent.map((d, i) => {
        const x = 20 + (i / (recent.length - 1)) * (width - 40);
        const y = height - 20 - ((d.w - minW) / (maxW - minW || 1)) * (height - 45);
        return { x, y, w: d.w };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const circles = points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#10b981" />
        <text x="${p.x}" y="${p.y - 8}" fill="#111827" font-size="9" font-weight="bold" text-anchor="middle">${p.w}</text>
    `).join('');

    chartBox.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%">
            <polyline fill="none" stroke="#10b981" stroke-width="3" points="${polyline}" />
            ${circles}
        </svg>
    `;
}

// =========================================================
// 7. CHRONOMÈTRE & BACKUP V5.2
// =========================================================
function toggleSet(exoId, setIndex, restSeconds) {
    const row = document.getElementById(`row_${exoId}_${setIndex}`);
    row.classList.toggle('done');
    if (row.classList.contains('done')) startTimer(restSeconds);
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    timerEndTime = Date.now() + (seconds * 1000);
    timeLeft = seconds;
    document.getElementById('timer-box').className = 'timer-running';
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        const remaining = Math.round((timerEndTime - Date.now()) / 1000);
        timeLeft = remaining > 0 ? remaining : 0;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-box').className = 'timer-done';
            document.getElementById('timer-display').textContent = "GO !";
        }
    }, 500);
}

function adjustTimer(deltaSeconds) {
    if (!timerEndTime || timeLeft <= 0) {
        if (deltaSeconds > 0) startTimer(deltaSeconds);
        return;
    }
    timerEndTime += (deltaSeconds * 1000);
    const remaining = Math.round((timerEndTime - Date.now()) / 1000);
    timeLeft = remaining > 0 ? remaining : 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 0; timerEndTime = 0;
    document.getElementById('timer-box').className = 'timer-idle';
    document.getElementById('timer-display').textContent = "00:00";
}

// =========================================================
// 8. BACKUP PRESSE-PAPIER & SYNCHRONISATION API GITHUB (V5.3)
// =========================================================
function buildFullBackupPayload() {
    return {
        updatedAt: new Date().toLocaleString('fr-FR'),
        homeConfig: getHomeConfig(),
        nutriTargets: getNutriTargets(),
        programsV5: getPrograms(),
        workoutCalendarV5: getWorkoutCalendar(),
        machineLibrary: getMachineLibrary(),
        machineLogs: getMachineLogs(),
        nutriLogs: getNutriLogs(),
        favMeals: getFavoriteMeals(),
        weights: JSON.parse(localStorage.getItem('vtaper_weights') || '[]'),
        meta: getGlobalMeta()
    };
}

function restoreFromPayload(parsed) {
    if (parsed.homeConfig) localStorage.setItem('vtaper_home_config', JSON.stringify(parsed.homeConfig));
    if (parsed.nutriTargets) localStorage.setItem('vtaper_nutri_targets', JSON.stringify(parsed.nutriTargets));
    if (parsed.programsV5) localStorage.setItem('vtaper_programs_v5', JSON.stringify(parsed.programsV5));
    if (parsed.workoutCalendarV5) localStorage.setItem('vtaper_workout_calendar_v5', JSON.stringify(parsed.workoutCalendarV5));
    if (parsed.machineLibrary) localStorage.setItem('vtaper_machine_library', JSON.stringify(parsed.machineLibrary));
    if (parsed.machineLogs) localStorage.setItem('vtaper_machine_logs', JSON.stringify(parsed.machineLogs));
    if (parsed.nutriLogs) localStorage.setItem('vtaper_nutri_logs', JSON.stringify(parsed.nutriLogs));
    if (parsed.favMeals) localStorage.setItem('vtaper_fav_meals', JSON.stringify(parsed.favMeals));
    if (parsed.weights) localStorage.setItem('vtaper_weights', JSON.stringify(parsed.weights));
    if (parsed.meta) localStorage.setItem('vtaper_meta', JSON.stringify(parsed.meta));

    initV5Database();
    applyHomeLayoutOrder();
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateAllViews();
}

function exportData() {
    const fullBackup = buildFullBackupPayload();
    navigator.clipboard.writeText(JSON.stringify(fullBackup));
    alert("📋 Backup V5.3 complet copié dans le presse-papier !");
}

function importData() {
    const input = prompt("Colle ici ta sauvegarde JSON :");
    if (!input) return;
    try {
        const parsed = JSON.parse(input);
        restoreFromPayload(parsed);
        alert("✅ Base de données restaurée avec succès !");
    } catch (e) {
        alert("⚠️ Format JSON invalide.");
    }
}

// CONFIGURATION & API GITHUB (ÉCRASE backup.json AVEC HISTORIQUE GIT)
function getGithubConfig() {
    return JSON.parse(localStorage.getItem('vtaper_gh_config') || '{"owner":"","repo":"","token":""}');
}

function toggleGithubConfigDrawer() {
    const drawer = document.getElementById('github-config-drawer');
    if (!drawer) return;
    const cfg = getGithubConfig();
    document.getElementById('gh-owner').value = cfg.owner || '';
    document.getElementById('gh-repo').value = cfg.repo || '';
    document.getElementById('gh-token').value = cfg.token || '';
    drawer.classList.toggle('open');
}

function saveGithubConfig() {
    const cfg = {
        owner: document.getElementById('gh-owner').value.trim(),
        repo: document.getElementById('gh-repo').value.trim(),
        token: document.getElementById('gh-token').value.trim()
    };
    localStorage.setItem('vtaper_gh_config', JSON.stringify(cfg));
    document.getElementById('github-config-drawer').classList.remove('open');
    alert("✅ Paramètres GitHub enregistrés dans ton téléphone !");
}

// Encode l'UTF-8 proprement en Base64 pour l'API GitHub
function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(b64) {
    return decodeURIComponent(escape(atob(b64)));
}

async function syncToGitHub() {
    const cfg = getGithubConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
        toggleGithubConfigDrawer();
        return alert("Configure d'abord ton pseudo, ton dépôt et ton Token GitHub.");
    }

    const statusEl = document.getElementById('github-sync-status');
    statusEl.textContent = "⏳ Connexion à GitHub en cours...";

    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/backup.json`;
    const headers = {
        "Authorization": `Bearer ${cfg.token}`,
        "Accept": "application/vnd.github+json"
    };

    try {
        // 1. Vérifier si backup.json existe déjà pour récupérer son SHA (obligatoire pour l'écraser proprement)
        let existingSha = null;
        const getRes = await fetch(apiUrl, { headers });
        if (getRes.ok) {
            const fileData = await getRes.json();
            existingSha = fileData.sha;
        }

        // 2. Préparer le JSON formaté et l'envoyer (crée un commit sur GitHub)
        const payloadStr = JSON.stringify(buildFullBackupPayload(), null, 2);
        const bodyObj = {
            message: `📲 Sync V-Taper (${new Date().toLocaleDateString('fr-FR')})`,
            content: utf8ToBase64(payloadStr)
        };
        if (existingSha) bodyObj.sha = existingSha;

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(bodyObj)
        });

        if (!putRes.ok) throw new Error(`Erreur GitHub (${putRes.status})`);

        const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        statusEl.textContent = `✅ Synchronisé sur GitHub (backup.json) à ${nowTime}`;
        alert("✅ Sauvegarde envoyée sur GitHub avec succès !");
    } catch (err) {
        statusEl.textContent = "❌ Échec de la synchronisation (vérifie ton Token ou le nom du Repo).";
        alert("Erreur lors de l'envoi vers GitHub : " + err.message);
    }
}

async function pullFromGitHub() {
    const cfg = getGithubConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
        toggleGithubConfigDrawer();
        return alert("Configure d'abord tes accès GitHub.");
    }
    if (!confirm("Remplacer les données de ce téléphone par la sauvegarde backup.json stockée sur ton GitHub ?")) return;

    const statusEl = document.getElementById('github-sync-status');
    statusEl.textContent = "⏳ Téléchargement depuis GitHub...";

    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/backup.json`;
    try {
        const res = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${cfg.token}`,
                "Accept": "application/vnd.github+json"
            }
        });
        if (!res.ok) throw new Error("Fichier backup.json introuvable sur ce dépôt.");

        const data = await res.json();
        const jsonStr = base64ToUtf8(data.content.replace(/\n/g, ''));
        const parsed = JSON.parse(jsonStr);

        restoreFromPayload(parsed);
        statusEl.textContent = `✅ Données restaurées depuis GitHub (${parsed.updatedAt || 'OK'})`;
        alert("✅ Toutes tes données ont été chargées depuis GitHub !");
    } catch (err) {
        statusEl.textContent = "❌ Erreur de chargement GitHub.";
        alert("Impossible de charger depuis GitHub : " + err.message);
    }
}