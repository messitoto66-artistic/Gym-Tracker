// app.js — VERSION 4.1 (Clean V2.4 Base + Dark Mode, Anneau Nutrition/Eau, Bips Audio, Vibrations, Heatmap)

let currentDayKey = 'push';
let timerInterval = null;
let timerEndTime = 0;
let timeLeft = 0;
let lastBeepSec = -1;

let homeCalMonthOffset = 0;
let nutriCalMonthOffset = 0;
let selectedNutriDateKey = getTodayDateKey();
let modalTargetDateKey = null;
let expandedExoId = null;
let isFavEditMode = false;
let showAllRecordsFlag = false;
let toastTimeout = null;

// =========================================================
// RETOURS HAPTIQUES VIBRATIONS (V4.1)
// =========================================================
function haptic(type = 'tap') {
    if (!('vibrate' in navigator)) return;
    try {
        if (type === 'tap') navigator.vibrate(8);
        else if (type === 'success') navigator.vibrate([15, 40, 15]);
        else if (type === 'timer') navigator.vibrate([100, 50, 100, 50, 200]);
    } catch (e) {}
}

// =========================================================
// SYNTHÉTISEUR AUDIO & BIPS DU CHRONOMÈTRE (V4.1)
// =========================================================
let audioCtx = null;
let soundEnabled = (localStorage.getItem('vtaper_sound_enabled') !== 'false');

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playBeep(freq = 440, duration = 0.1, type = 'sine') {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function toggleSound() {
    initAudio();
    soundEnabled = !soundEnabled;
    localStorage.setItem('vtaper_sound_enabled', soundEnabled);
    updateSoundBtn();
    haptic('tap');
    showToast(soundEnabled ? "🔊 Bips sonores activés" : "🔇 Bips sonores coupés");
    if (soundEnabled) playBeep(520, 0.1);
}

function updateSoundBtn() {
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
        btn.textContent = soundEnabled ? "🔊" : "🔇";
        btn.title = soundEnabled ? "Bips activés (Cliquer pour couper)" : "Sourdine (Cliquer pour réactiver)";
        btn.classList.toggle('muted', !soundEnabled);
    }
}

// =========================================================
// MODE DARK OLED NATIF (V4.1)
// =========================================================
function initTheme() {
    const saved = localStorage.getItem('vtaper_theme');
    let theme = 'light';
    if (saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeBtn(theme);
}

function toggleTheme() {
    haptic('tap');
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = (current === 'dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('vtaper_theme', next);
    updateThemeBtn(next);
    showToast(next === 'dark' ? "🌙 Mode Sombre activé" : "☀️ Mode Clair activé");
}

function updateThemeBtn(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = (theme === 'dark') ? "🌙" : "☀️";
}

// Helper pour désérialiser sereinement un objet ou chaîne doublement encodée
function safeObject(val) {
    if (!val) return null;
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'string') {
                try { return JSON.parse(parsed); } catch (e) { return parsed; }
            }
            return parsed;
        } catch (e) {
            return null;
        }
    }
    return null;
}

const DEFAULT_WORKOUT_COLORS = {
    push: "#005AA0",
    pull: "#7c3aed",
    legs: "#10b981",
    upper: "#f59e0b",
    lower: "#06b6d4"
};

const HOME_BLOCK_LABELS = {
    calendar: "Calendrier du mois",
    workout: "Séance du jour",
    nutri: "Nutrition & Hydratation"
};

const NUTRI_BLOCK_LABELS = {
    calendar: "Calendrier thermique",
    summary: "Bilan calorique & macros",
    favorites: "Mes favoris & ajout",
    log: "Journal du jour"
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
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    initTheme();
    updateSoundBtn();
    initV5Database();
    applyHomeLayoutOrder();
    applyNutriLayoutOrder();
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateAllViews();
});

// Notification Toast fluide (A6)
function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2400);
}

// Fonctions de bascule de tiroirs manquantes (Bugs bloquants V6.0)
function toggleBackupDrawer() {
    const drawer = document.getElementById('backup-main-drawer');
    if (!drawer) return;
    const cfg = getGithubConfig();
    document.getElementById('gh-owner').value = cfg.owner || '';
    document.getElementById('gh-repo').value = cfg.repo || '';
    document.getElementById('gh-token').value = cfg.token || '';
    drawer.classList.toggle('open');
}

function toggleCustomFoodDrawer() {
    const drawer = document.getElementById('custom-food-drawer');
    if (drawer) drawer.classList.toggle('open');
}

function toggleAllRecords() {
    showAllRecordsFlag = !showAllRecordsFlag;
    const recordsList = document.getElementById('records-list');
    const btn = document.getElementById('toggle-records-btn');
    if (!recordsList || !btn) return;
    const items = recordsList.querySelectorAll('.record-row');
    items.forEach((item, idx) => {
        item.style.display = (showAllRecordsFlag || idx < 5) ? 'flex' : 'none';
    });
    btn.textContent = showAllRecordsFlag ? '▲ Voir moins' : '▼ Voir tout';
}

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
// 1. CONFIGURATION ACCUEIL & NUTRITION
// =========================================================
function getHomeConfig() {
    const def = {
        title: "Tableau de bord",
        subtitle: "Objectif 80 kg · V-Taper & Calisthénie",
        order: ["calendar", "workout", "nutri"]
    };
    const saved = safeObject(localStorage.getItem('vtaper_home_config'));
    if (!saved) return def;
    let cleanOrder = (Array.isArray(saved.order) ? saved.order : def.order).filter(b => b !== 'water');
    if (!cleanOrder.includes('nutri')) cleanOrder.push('nutri');
    return {
        title: saved.title || def.title,
        subtitle: saved.subtitle || def.subtitle,
        order: cleanOrder
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
    showToast("✅ Affichage de l'accueil mis à jour");
}

// B1 : Changer la séance du jour directement depuis l'Accueil (< >)
function cycleHomeWorkout(delta) {
    const programs = getPrograms();
    const keys = Object.keys(programs);
    if (keys.length <= 1) return;
    const curIdx = keys.indexOf(currentDayKey);
    const nextIdx = (curIdx + delta + keys.length) % keys.length;
    currentDayKey = keys[nextIdx];
    loadWorkout(currentDayKey);
    updateHomeDashboard();
}

// ORDRE DE LA PAGE NUTRITION
function getNutriOrder() {
    const def = ["calendar", "summary", "favorites", "log"];
    const saved = JSON.parse(localStorage.getItem('vtaper_nutri_order_v6') || 'null');
    return (saved && saved.length === 4) ? saved : def;
}

function renderNutriOrderEditor() {
    const orderArr = getNutriOrder();
    const box = document.getElementById('nutri-order-list');
    if (!box) return;
    box.innerHTML = orderArr.map((blockId, idx) => `
        <div class="order-row-item">
            <span>${idx + 1}. ${NUTRI_BLOCK_LABELS[blockId] || blockId}</span>
            <div class="order-arrows">
                <button onclick="moveNutriBlock(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
                <button onclick="moveNutriBlock(${idx}, 1)" ${idx === orderArr.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
            </div>
        </div>
    `).join('');
}

function moveNutriBlock(idx, delta) {
    const orderArr = getNutriOrder();
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= orderArr.length) return;
    const temp = orderArr[idx];
    orderArr[idx] = orderArr[targetIdx];
    orderArr[targetIdx] = temp;
    localStorage.setItem('vtaper_nutri_order_v6', JSON.stringify(orderArr));
    renderNutriOrderEditor();
    applyNutriLayoutOrder();
}

function applyNutriLayoutOrder() {
    const orderArr = getNutriOrder();
    const container = document.getElementById('nutri-cards-container');
    if (!container) return;
    orderArr.forEach(blockId => {
        const el = document.getElementById(`nutri-block-${blockId}`);
        if (el) container.appendChild(el);
    });
}

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

    renderNutriOrderEditor();
    drawer.classList.toggle('open');
}

function computeMetabolicTargets() {
    const w = parseFloat(document.getElementById('calc-weight').value) || 70;
    const h = parseFloat(document.getElementById('calc-height').value) || 178;
    const a = parseFloat(document.getElementById('calc-age').value) || 22;
    const act = parseFloat(document.getElementById('calc-activity').value) || 1.55;
    const goal = parseInt(document.getElementById('calc-goal').value) || 0;

    const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    const tdee = Math.round(bmr * act);
    const totalKcal = Math.round((tdee + goal) / 10) * 10;

    const prot = Math.round(w * 2.1);
    const fats = Math.round(w * 1.1);
    const remainingKcal = Math.max(0, totalKcal - (prot * 4) - (fats * 9));
    const carbs = Math.round(remainingKcal / 4);

    document.getElementById('target-kcal').value = totalKcal;
    document.getElementById('target-prot').value = prot;
    document.getElementById('target-carbs').value = carbs;
    document.getElementById('target-fats').value = fats;
    showToast("🔄 Macros recalculées");
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
    showToast(`✅ Nouveau bilan : ${newTargets.kcal} kcal`);
}

// =========================================================
// 2. INITIALISATION & BIBLIOTHÈQUE MACHINES (AVEC NOTES C3)
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
    if (!lib[key]) lib[key] = { name: machineName.trim(), note: "" };
    if (!libObj) localStorage.setItem('vtaper_machine_library', JSON.stringify(lib));
}

// C3 : Sauvegarde de la note de réglage par machine (ex: "Siège cran 4")
function getMachineNote(machineName) {
    const lib = getMachineLibrary();
    const key = toMachineKey(machineName);
    return (lib[key] && lib[key].note) ? lib[key].note : "";
}

function saveMachineNote(machineName, noteVal) {
    const lib = getMachineLibrary();
    const key = toMachineKey(machineName);
    if (!lib[key]) lib[key] = { name: machineName.trim(), note: "" };
    lib[key].note = noteVal.trim();
    localStorage.setItem('vtaper_machine_library', JSON.stringify(lib));
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
// 3. MODE GYM (C1, C2, C3, C5 BROUILLON AUTO & BANDEAU C7)
// =========================================================
function toggleGymAdminDrawer() {
    const d = document.getElementById('gym-admin-drawer');
    if (d) d.classList.toggle('open');
}

function toggleExoAccordion(exoId) {
    expandedExoId = (expandedExoId === exoId) ? null : exoId;
    document.querySelectorAll('#workout-container .exo-card').forEach(card => {
        if (card.id === `card_${expandedExoId}`) card.classList.add('expanded');
        else card.classList.remove('expanded');
    });
}

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
            ? `style="background:${color}; color:#fff; box-shadow: 0 3px 10px ${color}35;"`
            : `style="border-bottom: 2.5px solid ${color}45; color: var(--text-muted);"`;

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
    showToast("🎨 Couleur de séance enregistrée");
}

function createNewWorkoutDay() {
    const shortName = prompt("Nom court de l'onglet (ex: Bras, FullBody, Calisthénie) :");
    if (!shortName) return;
    const fullTitle = prompt("Titre complet de la séance :", `Séance ${shortName}`) || shortName;
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
    showToast(`✅ Séance "${shortName}" créée`);
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
    showToast("✅ Séance renommée");
}

function deleteCurrentWorkout() {
    const programs = getPrograms();
    if (Object.keys(programs).length <= 1) return showToast("⚠️ Garde au moins une séance");
    if (!confirm(`Supprimer définitivement la séance "${programs[currentDayKey].title}" ?`)) return;

    delete programs[currentDayKey];
    savePrograms(programs);
    currentDayKey = Object.keys(programs)[0];
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateHomeDashboard();
    showToast("🗑️ Séance supprimée");
}

function populateLibrarySelect() {
    const select = document.getElementById('library-machine-select');
    if (!select) return;
    const lib = getMachineLibrary();
    const sorted = Object.values(lib).sort((a, b) => a.name.localeCompare(b.name));

    select.innerHTML = `<option value="">📚 Choisir une machine existante (${sorted.length})...</option>` +
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
    if (!exoTitle && !machineName) return showToast("⚠️ Indique un titre ou une machine");

    const finalTitle = exoTitle || machineName;
    const finalMachine = machineName || exoTitle;

    const sets = Math.max(1, parseInt(document.getElementById('new-exo-sets').value) || 3);
    const repsMin = Math.max(1, parseInt(document.getElementById('new-exo-min').value) || 8);
    const repsMax = Math.max(repsMin, parseInt(document.getElementById('new-exo-max').value) || 12);
    const rest = Math.max(15, parseInt(document.getElementById('new-exo-rest').value) || 90);

    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const isFirst = workout.exercises.length === 0;

    const newExoId = 'exo_' + Date.now();
    workout.exercises.push({
        id: newExoId,
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
    expandedExoId = newExoId;
    loadWorkout(currentDayKey);
    showToast("✅ Exercice ajouté");
}

function deleteExerciseFromWorkout(exoId) {
    if (!confirm("Retirer cet exercice de cette séance ?")) return;
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    workout.exercises = workout.exercises.filter(e => e.id !== exoId);
    savePrograms(programs);
    loadWorkout(currentDayKey);
    showToast("🗑️ Exercice retiré");
}

// C5 : Gestion du Brouillon Automatique (Auto-Save Draft en cours de séance)
function getGymDraft() {
    return JSON.parse(localStorage.getItem('vtaper_gym_draft') || '{}');
}

function saveGymDraftState() {
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    if (!workout) return;

    const drafts = getGymDraft();
    const dayDraft = {};

    workout.exercises.forEach(exo => {
        const setsArr = [];
        for (let i = 0; i < exo.sets; i++) {
            const row = document.getElementById(`row_${exo.id}_${i}`);
            if (!row) continue;
            setsArr.push({
                weight: row.querySelector('.weight-input').value,
                reps: row.querySelector('.reps-input').value,
                done: row.classList.contains('done')
            });
        }
        dayDraft[exo.id] = setsArr;
    });

    drafts[currentDayKey] = dayDraft;
    localStorage.setItem('vtaper_gym_draft', JSON.stringify(drafts));
}

function clearGymDraftForDay(dayKey) {
    const drafts = getGymDraft();
    delete drafts[dayKey];
    localStorage.setItem('vtaper_gym_draft', JSON.stringify(drafts));
}

function loadWorkout(dayKey) {
    const programs = getPrograms();
    if (!programs[dayKey]) return;
    currentDayKey = dayKey;
    const workout = programs[dayKey];
    const workoutColor = workout.color || '#005AA0';

    if (workout.exercises.length > 0 && !workout.exercises.some(e => e.id === expandedExoId)) {
        expandedExoId = workout.exercises[0].id;
    }

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
    const dayDraft = getGymDraft()[dayKey] || {};

    workout.exercises.forEach((exo, exoIdx) => {
        const activeIdx = Math.min(exo.activeVariantIndex || 0, exo.variants.length - 1);
        const currentMachineName = exo.variants[activeIdx];
        const exoTitle = exo.title || currentMachineName;
        const isExpanded = (exo.id === expandedExoId);
        const machineNote = getMachineNote(currentMachineName);

        const lastPerf = getLastSessionForMachine(currentMachineName);
        const coach = getCoachRecommendation(exo, lastPerf);
        const exoDraft = dayDraft[exo.id] || null;

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
        let doneCount = 0;

        for (let i = 0; i < exo.sets; i++) {
            const draftSet = exoDraft && exoDraft[i] ? exoDraft[i] : null;
            const targetW = draftSet ? draftSet.weight : (coach.prefillSets[i] ? coach.prefillSets[i].weight : '');
            const targetR = draftSet ? draftSet.reps : (coach.prefillSets[i] ? coach.prefillSets[i].reps : exo.repsMin);
            const isDone = draftSet && draftSet.done;
            if (isDone) doneCount++;

            setsHTML += `
                <div class="set-row ${isDone ? 'done' : ''}" id="row_${exo.id}_${i}">
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

        const initialWeight = (exoDraft && exoDraft[0]) ? exoDraft[0].weight : (coach.prefillSets[0] ? coach.prefillSets[0].weight : 0);
        const allDoneClass = (doneCount === exo.sets) ? 'all-sets-done' : '';

        const card = document.createElement('div');
        card.className = `exo-card ${isExpanded ? 'expanded' : ''} ${allDoneClass}`;
        card.id = `card_${exo.id}`;
        card.style.borderLeft = `4px solid ${workoutColor}`;
        card.innerHTML = `
            <div class="exo-summary-bar" onclick="toggleExoAccordion('${exo.id}')">
                <div class="exo-summary-left">
                    <div class="exo-step-circle" id="circle_${exo.id}">${doneCount === exo.sets ? '✓' : exoIdx + 1}</div>
                    <div>
                        <div class="exo-title">${exoTitle}</div>
                        <div class="exo-sub-info">${exo.sets}×${exo.repsMin}-${exo.repsMax} Reps · RIR ${exo.rir}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="badge" id="progress_pill_${exo.id}">${doneCount}/${exo.sets}</span>
                    <button class="gear-btn" onclick="event.stopPropagation(); toggleSettingsDrawer('${exo.id}')">⚙️</button>
                </div>
            </div>

            <div class="exo-body-collapsible">
                <select class="machine-select" onchange="selectMachineVariant('${exo.id}', this.value)">
                    ${optionsHTML}
                </select>

                <!-- C3 : Note de réglage liée à la machine -->
                <input type="text" class="machine-note-input" placeholder="📝 Ajouter une note machine (ex: Siège cran 4, poulie basse...)" 
                       value="${machineNote.replace(/"/g, '&quot;')}" 
                       onchange="saveMachineNote('${currentMachineName.replace(/'/g, "\\'")}', this.value); showToast('📝 Note machine enregistrée');">

                <!-- Panneau Engrenage ⚙️ -->
                <div class="settings-drawer" id="drawer_${exo.id}">
                    <div style="margin-bottom:8px;">
                        <label class="field-label">Titre de l'exercice</label>
                        <input type="text" id="cfg_title_${exo.id}" class="clean-input" value="${exoTitle}" style="background:#fff; padding:6px 10px;">
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
                        <label class="field-label">Machines disponibles pour cet exercice</label>
                        <div class="variant-chip-list">${chipsHTML}</div>
                        ${datalistHTML}
                        <div style="display:flex; gap:6px; margin-top:6px;">
                            <input type="text" list="${datalistId}" id="new_var_${exo.id}" class="clean-input" placeholder="Ajouter une machine..." style="background:#fff; padding:6px 10px;">
                            <button class="secondary-btn" style="padding:6px 12px; font-size:0.78rem; width:auto;" onclick="addVariant('${exo.id}')">+ Machine</button>
                        </div>
                    </div>
                    <div style="border-top:1px solid var(--border); margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:0.72rem; color:var(--text-muted);">
                            <input type="checkbox" ${exo.hasWarmupRamp ? 'checked' : ''} onchange="toggleWarmupFlag('${exo.id}', this.checked)"> Rampe d'échauffement
                        </label>
                        <button class="mini-tool-btn danger" onclick="deleteExerciseFromWorkout('${exo.id}')">Retirer</button>
                    </div>
                </div>

                <!-- RÈGLE C7 : Bandeau général épuré (Séries/Reps · RIR · Repos · 1RM) -->
                <div class="c7-general-banner">
                    <span>${exo.sets}×${exo.repsMin}-${exo.repsMax} Reps · RIR ${exo.rir} · Repos ${exo.rest}s</span>
                    <span class="c7-1rm-val" id="1rm_${exo.id}">1RM : -- kg</span>
                </div>

                <!-- RÈGLE C1 : Indication Coach + Rampe fusionnée sans boîte lourde -->
                <div class="c1-coach-line ${coach.isLevelUp ? 'level-up' : ''}" id="coach_line_${exo.id}">
                    ${coach.textHTML}
                    ${exo.hasWarmupRamp && doneCount === 0 ? `<span id="warmup_${exo.id}" style="display:block; margin-top:2px;">${getWarmupText(initialWeight)}</span>` : ''}
                </div>

                <div class="sets-header">
                    <span>#</span><span>Poids (kg)</span><span>Reps</span><span>OK</span>
                </div>
                ${setsHTML}
            </div>
        `;
        container.appendChild(card);
        updateExerciseMetrics(exo.id);
    });
}

function toggleSettingsDrawer(exoId) {
    const card = document.getElementById(`card_${exoId}`);
    if (card && !card.classList.contains('expanded')) toggleExoAccordion(exoId);
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
    showToast("✅ Paramètres de l'exercice enregistrés");
}

function addVariant(exoId) {
    const input = document.getElementById(`new_var_${exoId}`);
    const val = input.value.trim();
    if (!val) return showToast("⚠️ Entre le nom de la machine");

    const programs = getPrograms();
    const exo = programs[currentDayKey].exercises.find(e => e.id === exoId);
    if (!exo) return;

    if (!exo.variants.includes(val)) exo.variants.push(val);
    exo.activeVariantIndex = exo.variants.indexOf(val);

    registerMachineInLibrary(val);
    savePrograms(programs);
    loadWorkout(currentDayKey);
    showToast(`✅ Machine "${val}" ajoutée`);
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

// C1 : Recommandation Coach épurée en une ligne
function getCoachRecommendation(exo, lastPerf) {
    const emptySets = Array.from({ length: exo.sets }, () => ({ weight: '', reps: exo.repsMin }));
    if (!lastPerf || !lastPerf.sets || lastPerf.sets.length === 0) {
        return {
            isLevelUp: false,
            textHTML: `💡 Première fois sur cette machine : trouve ta charge à <b>RIR ${exo.rir}</b>`,
            prefillSets: emptySets
        };
    }

    const lastWeight = parseFloat(lastPerf.sets[0].weight) || 0;
    const allMaxed = lastPerf.sets.length >= exo.sets && lastPerf.sets.every(s => parseInt(s.reps) >= exo.repsMax);

    if (allMaxed && lastWeight > 0) {
        const nextWeight = lastWeight + 2;
        return {
            isLevelUp: true,
            textHTML: `🔥 Objectif validé le ${lastPerf.displayDate} : passe à <b>${nextWeight} kg (+2 kg)</b>`,
            prefillSets: Array.from({ length: exo.sets }, () => ({ weight: nextWeight, reps: exo.repsMin }))
        };
    } else {
        const prefill = Array.from({ length: exo.sets }, (_, i) => {
            const prev = lastPerf.sets[i] || lastPerf.sets[0];
            const prevReps = parseInt(prev.reps) || exo.repsMin;
            return { weight: prev.weight || lastWeight, reps: Math.min(prevReps + 1, exo.repsMax) };
        });
        return {
            isLevelUp: false,
            textHTML: `🎯 Coach : garde <b>${lastWeight} kg</b> et vise <b>+1 rep</b> (vu le ${lastPerf.displayDate})`,
            prefillSets: prefill
        };
    }
}

function stepValue(exoId, setIndex, type, delta) {
    haptic('tap');
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
    saveGymDraftState(); // Sauvegarde en brouillon en direct (C5)
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
    if (badge1RM) badge1RM.textContent = best1RM > 0 ? `1RM : ${best1RM.toFixed(1)} kg` : `1RM : -- kg`;
}

function getWarmupText(weight) {
    const w = parseFloat(weight);
    if (!w || w <= 0) return `🔥 Rampe : entre ton poids en S1 (50% / 75% / 90%)`;
    return `🔥 Rampe : 10×<b>${Math.round(w * 0.5)}kg</b> ➔ 5×<b>${Math.round(w * 0.75)}kg</b> ➔ 2×<b>${Math.round(w * 0.9)}kg</b>`;
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
    let lastMachineUpdated = "";

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
            lastMachineUpdated = machineName;
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

    if (savedCount === 0) return showToast("⚠️ Remplis au moins une série");

    localStorage.setItem('vtaper_machine_logs', JSON.stringify(machineLogs));
    clearGymDraftForDay(currentDayKey); // Efface le brouillon une fois la séance validée

    const cal = getWorkoutCalendar();
    cal[todayKey] = currentDayKey;
    saveWorkoutCalendar(cal);

    const meta = getGlobalMeta();
    meta.sessions = Object.keys(cal).length;
    meta.lastMachine = lastMachineUpdated;
    saveGlobalMeta(meta);

    showToast(`✅ Séance "${workout.shortLabel || workout.title}" sauvegardée !`);
    loadWorkout(currentDayKey);
    updateAllViews();
}

// =========================================================
// 5. NAVIGATION & ACCUEIL (JAUGES MONOCHROMES A3)
// =========================================================
function getNutriLogs() {
    const logs = safeObject(localStorage.getItem('vtaper_nutri_logs')) || {};
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
    haptic('tap');
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

    document.getElementById(`view-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    const homeCfg = getHomeConfig();
    const targets = getNutriTargets();
    const programs = getPrograms();
    const curProg = programs[currentDayKey] || { title: "Mode Gym", subtitle: "" };

    const titles = {
        home: [homeCfg.title, homeCfg.subtitle],
        gym: [curProg.title, curProg.subtitle],
        nutri: ["Nutrition", `Objectif : ${targets.kcal} kcal · ${targets.prot}g Protéines`],
        progress: ["Progrès & Analyse", "Régularité, Courbes par Machine & Poids"]
    };
    document.getElementById('header-title').textContent = titles[tabName][0];
    document.getElementById('header-subtitle').textContent = titles[tabName][1];

    updateAllViews();
    window.scrollTo(0, 0);
}

// Helper A3 : barre sobre qui passe au vert émeraude à 100%
function updateBarWithGoalColor(barEl, currentVal, targetVal) {
    if (!barEl) return;
    const pct = Math.min((currentVal / (targetVal || 1)) * 100, 100);
    barEl.style.width = `${pct}%`;
    if (currentVal >= targetVal && targetVal > 0) barEl.classList.add('goal-reached');
    else barEl.classList.remove('goal-reached');
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
    updateBarWithGoalColor(document.getElementById('home-kcal-bar'), todayData.kcal, targets.kcal);

    document.getElementById('home-prot').textContent = `${todayData.prot} / ${targets.prot}g`;
    document.getElementById('home-carbs').textContent = `${todayData.carbs} / ${targets.carbs}g`;
    document.getElementById('home-fats').textContent = `${todayData.fats} / ${targets.fats}g`;

    updateBarWithGoalColor(document.getElementById('home-prot-bar'), todayData.prot, targets.prot);
    updateBarWithGoalColor(document.getElementById('home-carbs-bar'), todayData.carbs, targets.carbs);
    updateBarWithGoalColor(document.getElementById('home-fats-bar'), todayData.fats, targets.fats);

    document.getElementById('home-water').textContent = `${(todayData.water || 0).toFixed(2)} / ${targets.water.toFixed(1)} L`;
    document.getElementById('home-water-bar').style.width = `${Math.min(((todayData.water || 0) / targets.water) * 100, 100)}%`;

    // Anneaux d'Activité (Calories, Protéines, Eau) - V4.1
    const calPct = Math.min((todayData.kcal / targets.kcal) * 100, 100);
    const protPct = Math.min((todayData.prot / targets.prot) * 100, 100);
    const waterTarget = targets.water || 3.0;
    const waterPct = Math.min(((todayData.water || 0) / waterTarget) * 100, 100);

    const ringCal = document.getElementById('ring-cal');
    if (ringCal) ringCal.style.strokeDashoffset = 301.6 - (301.6 * (calPct / 100));

    const ringProt = document.getElementById('ring-prot');
    if (ringProt) ringProt.style.strokeDashoffset = 226.2 - (226.2 * (protPct / 100));

    const ringWater = document.getElementById('ring-water');
    if (ringWater) ringWater.style.strokeDashoffset = 150.8 - (150.8 * (waterPct / 100));

    const elCalPct = document.getElementById('ring-cal-pct');
    if (elCalPct) elCalPct.textContent = `${Math.round(calPct)}% kcal`;
    const elProtPct = document.getElementById('ring-prot-pct');
    if (elProtPct) elProtPct.textContent = `${Math.round(protPct)}% prot`;
    const elWaterPct = document.getElementById('ring-water-pct');
    if (elWaterPct) elWaterPct.textContent = `${Math.round(waterPct)}% eau`;

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
// 6. NUTRITION (FAVORIS SÉCURISÉS & MINI-BARRES)
// =========================================================
function addWater(liters) {
    haptic('tap');
    const targetDateKey = (document.getElementById('view-nutri') && document.getElementById('view-nutri').classList.contains('active'))
        ? selectedNutriDateKey
        : getTodayDateKey();
    const dayData = getDayNutri(targetDateKey);
    dayData.water = Math.max(0, (dayData.water || 0) + liters);
    saveDayNutri(targetDateKey, dayData);
}

function getFavoriteMeals() {
    const favs = localStorage.getItem('vtaper_fav_meals');
    if (!favs) {
        localStorage.setItem('vtaper_fav_meals', JSON.stringify(DEFAULT_FAVORITES));
        return DEFAULT_FAVORITES;
    }
    return JSON.parse(favs);
}

function toggleFavEditMode() {
    isFavEditMode = !isFavEditMode;
    const btn = document.getElementById('fav-edit-btn');
    if (btn) {
        btn.textContent = isFavEditMode ? "✅ Terminer" : "✏️ Modifier";
        btn.style.color = isFavEditMode ? "var(--accent)" : "var(--text-muted)";
    }
    renderFavorites();
}

function renderFavorites() {
    const favs = getFavoriteMeals();
    const grid = document.getElementById('favorites-grid');
    if (!grid) return;

    grid.innerHTML = favs.map((f, idx) => `
        <div class="fav-card-wrap ${isFavEditMode ? 'edit-mode' : ''}">
            <button class="preset-btn" onclick="addFavMealByIndex(${idx})">
                <strong>${f.name}</strong>
                <span>${f.kcal} kcal · ${f.prot}g P</span>
            </button>
            <button class="fav-del-x" onclick="event.stopPropagation(); deleteFavoriteMeal(${idx})">✕</button>
        </div>
    `).join('');
}

function addFavMealByIndex(idx) {
    const fav = getFavoriteMeals()[idx];
    if (fav) addMealToSelectedDay(fav.name, fav.kcal, fav.prot, fav.carbs, fav.fats);
}

function deleteFavoriteMeal(idx) {
    const favs = getFavoriteMeals();
    if (!confirm(`Supprimer "${favs[idx].name}" de tes favoris ?`)) return;
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

    if (kcal <= 0 && prot <= 0) return showToast("⚠️ Entre au moins les calories ou les protéines");

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

    const drawer = document.getElementById('custom-food-drawer');
    if (drawer) drawer.classList.remove('open');
    showToast(saveAsFav ? `⭐ "${name}" ajouté aux favoris et au jour` : `✅ "${name}" ajouté au jour`);
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
    showToast(`🗑️ "${m.name}" retiré`);
}

function resetNutriDay() {
    if (!confirm(`Vider les repas du jour (${selectedNutriDateKey}) ?`)) return;
    const dayData = getDayNutri(selectedNutriDateKey);
    dayData.kcal = 0; dayData.prot = 0; dayData.carbs = 0; dayData.fats = 0; dayData.meals = [];
    saveDayNutri(selectedNutriDateKey, dayData);
    showToast("🗑️ Repas du jour réinitialisés");
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

    document.getElementById('nutri-prot-bar').style.width = `${Math.min((dayData.prot / targets.prot) * 100, 100)}%`;
    document.getElementById('nutri-carbs-bar').style.width = `${Math.min((dayData.carbs / targets.carbs) * 100, 100)}%`;
    document.getElementById('nutri-fats-bar').style.width = `${Math.min((dayData.fats / targets.fats) * 100, 100)}%`;

    const nutriWaterEl = document.getElementById('nutri-water');
    if (nutriWaterEl) nutriWaterEl.textContent = `${(dayData.water || 0).toFixed(2)} / ${targets.water.toFixed(1)} L`;
    const nutriWaterBar = document.getElementById('nutri-water-bar');
    if (nutriWaterBar) nutriWaterBar.style.width = `${Math.min(((dayData.water || 0) / targets.water) * 100, 100)}%`;

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

// =========================================================
// 7. PAGE PROGRÈS (NOUVEAU BILAN PERTINENT & PLURIELS PROPRES)
// =========================================================
function saveBodyWeight() {
    const val = parseFloat(document.getElementById('weight-input-field').value);
    if (!val || val < 40 || val > 150) return showToast("⚠️ Entre un poids valide en kg (40 à 150 kg)");

    const meta = getGlobalMeta();
    meta.weight = val;
    saveGlobalMeta(meta);

    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
    weightLog.push({ date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), w: val });
    localStorage.setItem('vtaper_weights', JSON.stringify(weightLog));

    document.getElementById('weight-input-field').value = '';
    updateAllViews();
    showToast(`⚖️ Poids noté : ${val.toFixed(1)} kg`);
}

function deleteWeightEntry(idx) {
    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
    if (idx <= 0 || idx >= weightLog.length) return;
    const entry = weightLog[idx];
    if (!confirm(`Supprimer la pesée de ${entry.w} kg du ${entry.date} ?`)) return;
    weightLog.splice(idx, 1);
    localStorage.setItem('vtaper_weights', JSON.stringify(weightLog));

    const meta = getGlobalMeta();
    meta.weight = weightLog[weightLog.length - 1].w;
    saveGlobalMeta(meta);

    updateAllViews();
    showToast("🗑️ Pesée supprimée");
}

function updateProgressView() {
    const machineLogs = getMachineLogs();
    const cal = getWorkoutCalendar();
    const meta = getGlobalMeta();
    const nutriLogs = getNutriLogs();
    const targets = getNutriTargets();
    const select = document.getElementById('progress-machine-select');
    const prevSelectedKey = select ? select.value : '';

    const cwDisplay = document.getElementById('current-weight-display');
    if (cwDisplay) cwDisplay.textContent = parseFloat(meta.weight || 70.0).toFixed(1);

    let recordsHTML = '';
    const machineKeysWithData = [];
    let sumPctGain = 0;
    let progressedMachinesCount = 0;
    let bestGainMachine = null;
    let bestGainVal = -999;

    Object.entries(machineLogs).forEach(([mKey, sessionsArr]) => {
        if (!sessionsArr || sessionsArr.length === 0) return;
        const count = sessionsArr.length;
        const mName = sessionsArr[count - 1].machineName;
        machineKeysWithData.push({ key: mKey, name: mName, count: count });

        let max1RM = 0;
        sessionsArr.forEach(sess => {
            if (sess.best1RM > max1RM) max1RM = sess.best1RM;
        });

        const first1RM = sessionsArr[0].best1RM || 1;
        const last1RM = sessionsArr[count - 1].best1RM || 0;
        const rawGain = count > 1 ? (((last1RM - first1RM) / first1RM) * 100) : 0;
        const pctGain = rawGain.toFixed(1);

        if (count > 1) {
            sumPctGain += rawGain;
            progressedMachinesCount++;
            if (rawGain > bestGainVal) {
                bestGainVal = rawGain;
                bestGainMachine = mName;
            }
        }

        const sWord = count > 1 ? 'séances' : 'séance';

        recordsHTML += `
            <div class="record-row" onclick="selectMachineInProgress('${mKey}')" style="cursor:pointer;">
                <div style="min-width:0;">
                    <strong style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${mName}</strong>
                    <div style="font-size:0.68rem; color:var(--text-muted);">${count} ${sWord} · Évol : ${rawGain >= 0 ? '+' : ''}${pctGain}%</div>
                </div>
                <span class="record-val">1RM : ${max1RM.toFixed(1)} kg</span>
            </div>
        `;
    });

    // Calculs du nouveau Bilan Pertinent (Rythme du mois, Progression moyenne, Top Machine, Régularité Nutri)
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthSessions = Object.keys(cal).filter(d => d.startsWith(currentMonthPrefix)).length;
    const avgPerWeek = (thisMonthSessions / Math.max(1, now.getDate() / 7)).toFixed(1);

    const avgForceGain = progressedMachinesCount > 0 ? (sumPctGain / progressedMachinesCount).toFixed(1) : '0.0';

    const activeNutriDays = Object.values(nutriLogs).filter(d => d && d.kcal > 0);
    const goalMetDays = activeNutriDays.filter(d => d.kcal >= targets.kcal).length;
    const avgKcal = activeNutriDays.length > 0
        ? Math.round(activeNutriDays.reduce((acc, d) => acc + d.kcal, 0) / activeNutriDays.length)
        : 0;

    document.getElementById('muscle-summary-grid').innerHTML = `
        <div class="summary-box">
            <div class="summary-box-title">📅 Rythme du mois</div>
            <div class="summary-box-val">${thisMonthSessions} séance${thisMonthSessions > 1 ? 's' : ''}</div>
            <div class="summary-box-sub">~${avgPerWeek} séance(s) / sem</div>
        </div>
        <div class="summary-box">
            <div class="summary-box-title">📈 Progression Force</div>
            <div class="summary-box-val">${avgForceGain >= 0 ? '+' : ''}${avgForceGain}%</div>
            <div class="summary-box-sub">${progressedMachinesCount > 0 ? `Sur ${progressedMachinesCount} machine(s)` : 'Dès 2 séances/machine'}</div>
        </div>
        <div class="summary-box">
            <div class="summary-box-title">🔥 Meilleure Évol.</div>
            <div class="summary-box-val" style="font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${bestGainMachine || (meta.lastMachine || '--')}</div>
            <div class="summary-box-sub">${bestGainMachine ? `+${bestGainVal.toFixed(1)}% de 1RM` : 'Dernier exo actif'}</div>
        </div>
        <div class="summary-box">
            <div class="summary-box-title">🥗 Cible Nutrition</div>
            <div class="summary-box-val">${goalMetDays} j validé${goalMetDays > 1 ? 's' : ''}</div>
            <div class="summary-box-sub">${avgKcal > 0 ? `Moy. ${avgKcal} kcal/j` : `Cible ${targets.kcal} kcal`}</div>
        </div>
    `;

    const recordsBox = document.getElementById('records-list');
    recordsBox.innerHTML = recordsHTML || `<p style="font-size:0.78rem; color:var(--text-muted);">Valide une séance pour alimenter ta bibliothèque de performances.</p>`;

    const toggleBtn = document.getElementById('toggle-records-btn');
    if (toggleBtn) {
        const rows = recordsBox.querySelectorAll('.record-row');
        if (rows.length > 5) {
            toggleBtn.style.display = 'block';
            toggleBtn.textContent = showAllRecordsFlag ? '▲ Voir moins' : `▼ Voir tout (${rows.length} records)`;
            rows.forEach((r, idx) => {
                r.style.display = (showAllRecordsFlag || idx < 5) ? 'flex' : 'none';
            });
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    if (select) {
        if (machineKeysWithData.length === 0) {
            select.innerHTML = `<option value="">-- Enregistre une séance pour voir les courbes --</option>`;
        } else {
            select.innerHTML = machineKeysWithData.map(m => {
                const sWord = m.count > 1 ? 'séances' : 'séance';
                return `<option value="${m.key}" ${m.key === prevSelectedKey ? 'selected' : ''}>📈 ${m.name} (${m.count} ${sWord})</option>`;
            }).join('');
        }
        renderMachineProgressChart();
    }

    renderBodyWeightChart();
    renderAnnualHeatmap();
    renderFUTCard();
}

// =========================================================
// CARTE FUT MUSCULATION DYNAMIQUE & ÉVOLUTIVE (V4.1)
// =========================================================
function renderFUTCard() {
    const card = document.getElementById('fut-card');
    if (!card) return;

    const machineLogs = getMachineLogs();
    const cal = getWorkoutCalendar();
    const meta = getGlobalMeta();
    const bw = parseFloat(meta.weight) || 75.0;

    // 1. Calcul de la régularité annuelle
    const today = new Date();
    const totalDays = 364;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (totalDays - 1));
    let annualSessions = 0;
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        if (cal && cal[dateKey]) annualSessions++;
    }

    // 2. Extraction des 1RM max par groupe musculaire
    const maxOneRM = { pec: 0, dos: 0, epa: 0, bra: 0, leg: 0, abs: 0 };

    Object.keys(machineLogs).forEach(key => {
        const logs = machineLogs[key];
        if (!Array.isArray(logs) || logs.length === 0) return;
        let peak1RM = 0;
        logs.forEach(l => {
            const w = parseFloat(l.weight) || 0;
            const r = parseFloat(l.reps) || 0;
            const rm = l.oneRM || (w * (1 + r / 30));
            if (rm > peak1RM) peak1RM = rm;
        });

        const k = key.toLowerCase();
        if (k.includes('inclin') || k.includes('pec') || k.includes('dips') || k.includes('ecarte') || k.includes('couch') || k.includes('chest')) {
            maxOneRM.pec = Math.max(maxOneRM.pec, peak1RM);
        } else if (k.includes('traction') || k.includes('tirage') || k.includes('rowing') || k.includes('bucheron') || k.includes('dos') || k.includes('lat') || k.includes('pull')) {
            maxOneRM.dos = Math.max(maxOneRM.dos, peak1RM);
        } else if (k.includes('milit') || k.includes('epaule') || k.includes('laterale') || k.includes('shoulder') || k.includes('delto') || k.includes('face')) {
            maxOneRM.epa = Math.max(maxOneRM.epa, peak1RM);
        } else if (k.includes('triceps') || k.includes('biceps') || k.includes('curl') || k.includes('bras') || k.includes('front') || k.includes('arm')) {
            maxOneRM.bra = Math.max(maxOneRM.bra, peak1RM);
        } else if (k.includes('presse') || k.includes('squat') || k.includes('cuisse') || k.includes('leg') || k.includes('ischio') || k.includes('fente') || k.includes('mollet')) {
            maxOneRM.leg = Math.max(maxOneRM.leg, peak1RM);
        } else if (k.includes('abdo') || k.includes('gainage') || k.includes('crunch') || k.includes('core') || k.includes('releve')) {
            maxOneRM.abs = Math.max(maxOneRM.abs, peak1RM);
        }
    });

    // 3. Calcul de stat FUT réaliste (55 à 99)
    function calcStat(peak, expectedRatio, baseline = 70) {
        if (!peak || peak <= 0) {
            return Math.min(80, baseline + Math.min(8, Math.floor(annualSessions / 6)));
        }
        const ratio = peak / bw;
        const score = 70 + Math.round((ratio / expectedRatio) * 16);
        return Math.min(99, Math.max(55, score));
    }

    const pecScore = calcStat(maxOneRM.pec, 1.15, 74);
    const dosScore = calcStat(maxOneRM.dos, 1.25, 75);
    const epaScore = calcStat(maxOneRM.epa, 0.65, 73);
    const braScore = calcStat(maxOneRM.bra, 0.45, 72);
    const legScore = calcStat(maxOneRM.leg, 2.20, 72);
    const absBonus = Math.min(20, Math.floor(annualSessions / 3));
    const absScore = maxOneRM.abs > 0 ? calcStat(maxOneRM.abs, 0.6, 75) : Math.min(96, 72 + absBonus);

    const ovr = Math.round((pecScore + dosScore + epaScore + braScore + legScore + absScore) / 6);

    // 4. Évolution visuelle du Tier FUT selon régularité & OVR
    let tierClass = "fut-gold";
    let tierName = "OR RARE · ATHLÈTE";
    let pos = "ATH";

    if (annualSessions >= 110 || ovr >= 92) {
        tierClass = "fut-icon";
        tierName = "ICÔNE PRIME · LÉGENDE";
        pos = "LEG";
    } else if (annualSessions >= 65 || ovr >= 87) {
        tierClass = "fut-totw";
        tierName = "TOTW SPECIAL · MACHINE";
        pos = "MACH";
    } else if (annualSessions >= 25 || ovr >= 78) {
        tierClass = "fut-gold";
        tierName = "OR RARE · ATHLÈTE";
        pos = "ATH";
    } else if (annualSessions >= 10 || ovr >= 70) {
        tierClass = "fut-silver";
        tierName = "ARGENT · RÉGULIER";
        pos = "REG";
    } else {
        tierClass = "fut-bronze";
        tierName = "BRONZE · DÉBUTANT";
        pos = "STAR";
    }

    card.className = `fut-card ${tierClass}`;
    const elOvr = document.getElementById('fut-ovr');
    if (elOvr) elOvr.textContent = ovr;
    const elPos = document.getElementById('fut-pos');
    if (elPos) elPos.textContent = pos;
    const elName = document.getElementById('fut-name');
    if (elName) elName.textContent = "GAËL";
    const elTier = document.getElementById('fut-tier-title');
    if (elTier) elTier.textContent = tierName;

    const elPec = document.getElementById('fut-pec');
    if (elPec) elPec.textContent = pecScore;
    const elDos = document.getElementById('fut-dos');
    if (elDos) elDos.textContent = dosScore;
    const elEpa = document.getElementById('fut-epa');
    if (elEpa) elEpa.textContent = epaScore;
    const elBra = document.getElementById('fut-bra');
    if (elBra) elBra.textContent = braScore;
    const elLeg = document.getElementById('fut-leg');
    if (elLeg) elLeg.textContent = legScore;
    const elAbs = document.getElementById('fut-abs');
    if (elAbs) elAbs.textContent = absScore;

    const elSub = document.getElementById('fut-sub-info');
    if (elSub) elSub.textContent = `${annualSessions} séance${annualSessions > 1 ? 's' : ''} cette année · OVR ${ovr}`;
}

// =========================================================
// HEATMAP ANNUELLE 52 SEMAINES STYLE GITHUB (V4.1)
// =========================================================
function renderAnnualHeatmap() {
    const grid = document.getElementById('annual-heatmap');
    const badge = document.getElementById('heatmap-summary-badge');
    if (!grid) return;

    const cal = getWorkoutCalendar();
    const today = new Date();
    const totalDays = 364; // 52 semaines complètes
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (totalDays - 1));

    let html = '';
    let yearSessionsCount = 0;

    for (let i = 0; i < totalDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;

        const hasSession = !!cal[dateKey];
        if (hasSession) yearSessionsCount++;

        const levelClass = hasSession ? 'l2' : 'l0';
        const tooltip = `${dateKey} : ${hasSession ? 'Séance effectuée (' + cal[dateKey] + ')' : 'Repos'}`;
        html += `<div class="heatmap-cell ${levelClass}" title="${tooltip}" onclick="showToast('${tooltip}')"></div>`;
    }

    grid.innerHTML = html;
    if (badge) {
        badge.textContent = `${yearSessionsCount} séance${yearSessionsCount > 1 ? 's' : ''} / an`;
    }
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
        chartBox.classList.add('empty-chart');
        chartBox.innerHTML = `<p style="font-size:0.76rem; color:var(--text-muted);">Aucune séance enregistrée sur cette machine.</p>`;
        logBox.innerHTML = '';
        return;
    }

    logBox.innerHTML = sessions.slice(-5).reverse().map(s => {
        const setsStr = s.sets.map(x => `${x.weight}kg×${x.reps}`).join(' | ');
        return `<div style="font-size:0.74rem; background:var(--bg-elevated); padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; gap:8px;">
                    <span><b>${s.displayDate}</b> : ${setsStr}</span>
                    <strong style="color:var(--accent); white-space:nowrap;">1RM : ${s.best1RM} kg</strong>
                </div>`;
    }).join('');

    const recent = sessions.slice(-8);
    if (recent.length < 2) {
        chartBox.classList.add('empty-chart');
        chartBox.innerHTML = `<p style="font-size:0.76rem; color:var(--text-muted); text-align:center;">1 séance enregistrée (1RM : <b>${recent[0].best1RM} kg</b> le ${recent[0].displayDate}). La courbe s'affichera dès ta 2e séance !</p>`;
        return;
    }

    chartBox.classList.remove('empty-chart');
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
    const startW = weightLog[0].w;
    const diff = (latestW - startW).toFixed(1);
    document.getElementById('weight-diff-badge').textContent = `${diff >= 0 ? '+' : ''}${diff} kg vs départ`;

    const chartBox = document.getElementById('weight-chart-box');
    const recent = weightLog.slice(-8);
    if (recent.length < 2) {
        chartBox.classList.add('empty-chart');
        chartBox.innerHTML = `<p style="font-size:0.76rem; color:var(--text-muted);">Entre une pesée pour tracer ta courbe vers 80 kg.</p>`;
        return;
    }

    chartBox.classList.remove('empty-chart');
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

    // Historique des pesées avec suppression d'erreur (E1)
    const pillsBox = document.getElementById('weight-history-pills');
    if (pillsBox) {
        pillsBox.innerHTML = weightLog.slice(-10).reverse().map((entry, idx) => {
            const realIdx = weightLog.length - 1 - idx;
            return `<span style="background:var(--bg-elevated); padding:4px 10px; border-radius:99px; font-size:0.72rem; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                ${entry.date}: ${entry.w}kg
                ${realIdx > 0 ? `<button onclick="deleteWeightEntry(${realIdx})" style="background:none; border:none; color:#dc2626; font-weight:800; cursor:pointer; font-size:0.7rem;">✕</button>` : ''}
            </span>`;
        }).join('');
    }
}

// =========================================================
// 8. CHRONOMÈTRE, BACKUP & SYNCHRONISATION API GITHUB
// =========================================================
function toggleSet(exoId, setIndex, restSeconds) {
    const row = document.getElementById(`row_${exoId}_${setIndex}`);
    row.classList.toggle('done');

    if (row.classList.contains('done')) {
        haptic('success');
        startTimer(restSeconds);
        if (setIndex === 0) {
            const warmupBox = document.getElementById(`warmup_${exoId}`);
            if (warmupBox) warmupBox.style.display = 'none';
        }
    } else {
        haptic('tap');
    }

    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const exoIdx = workout.exercises.findIndex(e => e.id === exoId);
    const exo = workout.exercises[exoIdx];
    if (!exo) return;

    let doneCount = 0;
    for (let i = 0; i < exo.sets; i++) {
        const r = document.getElementById(`row_${exoId}_${i}`);
        if (r && r.classList.contains('done')) doneCount++;
    }

    const pill = document.getElementById(`progress_pill_${exoId}`);
    if (pill) pill.textContent = `${doneCount}/${exo.sets}`;

    const card = document.getElementById(`card_${exoId}`);
    const circle = document.getElementById(`circle_${exoId}`);
    if (doneCount === exo.sets) {
        if (card) card.classList.add('all-sets-done');
        if (circle) circle.textContent = '✓';
        if (exoIdx + 1 < workout.exercises.length) {
            setTimeout(() => toggleExoAccordion(workout.exercises[exoIdx + 1].id), 400);
        }
    } else {
        if (card) card.classList.remove('all-sets-done');
        if (circle) circle.textContent = exoIdx + 1;
    }
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    initAudio();
    timerEndTime = Date.now() + (seconds * 1000);
    timeLeft = seconds;
    lastBeepSec = seconds;
    document.getElementById('timer-box').className = 'timer-running';
    document.getElementById('timer-wrapper').classList.add('active-timer');
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        const remaining = Math.round((timerEndTime - Date.now()) / 1000);
        timeLeft = remaining > 0 ? remaining : 0;
        updateTimerDisplay();

        // Bips sonores à 3, 2, 1
        if (timeLeft <= 3 && timeLeft > 0 && timeLeft !== lastBeepSec) {
            lastBeepSec = timeLeft;
            playBeep(440, 0.08);
            haptic('tap');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-box').className = 'timer-done';
            document.getElementById('timer-display').textContent = "GO !";
            playBeep(880, 0.35);
            haptic('timer');
        }
    }, 500);
}

function adjustTimer(deltaSeconds) {
    haptic('tap');
    if (!timerEndTime || timeLeft <= 0) {
        if (deltaSeconds > 0) startTimer(deltaSeconds);
        return;
    }
    timerEndTime += (deltaSeconds * 1000);
    const remaining = Math.round((timerEndTime - Date.now()) / 1000);
    timeLeft = remaining > 0 ? remaining : 0;
    lastBeepSec = timeLeft;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    document.getElementById('timer-display').textContent = `${m}:${s}`;
}

function resetTimer() {
    haptic('tap');
    clearInterval(timerInterval);
    timeLeft = 0; timerEndTime = 0; lastBeepSec = -1;
    document.getElementById('timer-box').className = 'timer-idle';
    document.getElementById('timer-wrapper').classList.remove('active-timer');
    document.getElementById('timer-display').textContent = "00:00";
}

function buildFullBackupPayload() {
    return {
        version: "4.1",
        updatedAt: new Date().toLocaleString('fr-FR'),
        homeConfig: getHomeConfig(),
        nutriOrder: getNutriOrder(),
        nutriTargets: getNutriTargets(),
        programsV5: getPrograms(),
        workoutCalendarV5: getWorkoutCalendar(),
        machineLibrary: getMachineLibrary(),
        machineLogs: getMachineLogs(),
        nutriLogs: getNutriLogs(),
        favMeals: getFavoriteMeals(),
        weights: safeObject(localStorage.getItem('vtaper_weights')) || [],
        meta: getGlobalMeta()
    };
}

function restoreFromPayload(parsed) {
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) {}
    }
    if (!parsed || typeof parsed !== 'object') {
        showToast("⚠️ Fichier de sauvegarde invalide");
        return false;
    }

    // 1. Accueil
    const homeConfig = safeObject(parsed.homeConfig || parsed.vtaper_home_config);
    if (homeConfig) localStorage.setItem('vtaper_home_config', JSON.stringify(homeConfig));

    // 2. Nutrition Order
    const nutriOrder = safeObject(parsed.nutriOrder || parsed.vtaper_nutri_order_v6 || parsed.vtaper_nutri_order);
    if (nutriOrder) localStorage.setItem('vtaper_nutri_order_v6', JSON.stringify(nutriOrder));

    // 3. Nutrition Targets
    const targets = safeObject(parsed.nutriTargets || parsed.vtaper_nutri_targets || parsed.targets);
    if (targets) localStorage.setItem('vtaper_nutri_targets', JSON.stringify(targets));

    // 4. Programmes d'entraînement
    const programs = safeObject(parsed.programsV5 || parsed.vtaper_programs_v5 || parsed.programs);
    if (programs) localStorage.setItem('vtaper_programs_v5', JSON.stringify(programs));

    // 5. Calendrier des entraînements
    let cal = safeObject(parsed.workoutCalendarV5 || parsed.vtaper_workout_calendar_v5 || parsed.workoutCalendar);
    if (!cal && (parsed.workoutDates || parsed.vtaper_workout_dates)) {
        const dates = safeObject(parsed.workoutDates || parsed.vtaper_workout_dates) || [];
        cal = {};
        if (Array.isArray(dates)) dates.forEach(d => { cal[d] = 'push'; });
    }
    if (cal) localStorage.setItem('vtaper_workout_calendar_v5', JSON.stringify(cal));

    // 6. Machines & Logs
    const machineLibrary = safeObject(parsed.machineLibrary || parsed.vtaper_machine_library);
    if (machineLibrary) localStorage.setItem('vtaper_machine_library', JSON.stringify(machineLibrary));

    const machineLogs = safeObject(parsed.machineLogs || parsed.vtaper_machine_logs);
    if (machineLogs) localStorage.setItem('vtaper_machine_logs', JSON.stringify(machineLogs));

    // 7. Nutrition multi-format robuste (V1.2 à V4.1)
    let nutriLogs = safeObject(parsed.nutriLogs || parsed.vtaper_nutri_logs || parsed.nutrition || parsed.nutritionLogs);
    if (!nutriLogs && (parsed.daily || parsed.vtaper_daily)) {
        const daily = safeObject(parsed.daily || parsed.vtaper_daily);
        if (daily) nutriLogs = { [getTodayDateKey()]: daily };
    }
    if (nutriLogs) {
        localStorage.setItem('vtaper_nutri_logs', JSON.stringify(nutriLogs));

        // Auto-focus sur la date ayant des repas enregistrés la plus récente si aujourd'hui est vide
        const activeDates = Object.keys(nutriLogs).filter(d => nutriLogs[d] && nutriLogs[d].kcal > 0).sort();
        if (activeDates.length > 0) {
            const todayKey = getTodayDateKey();
            if (!nutriLogs[todayKey] || nutriLogs[todayKey].kcal === 0) {
                selectedNutriDateKey = activeDates[activeDates.length - 1];
            }
        }
    }

    // 8. Favoris
    const favMeals = safeObject(parsed.favMeals || parsed.vtaper_fav_meals || parsed.favorites);
    if (favMeals) localStorage.setItem('vtaper_fav_meals', JSON.stringify(favMeals));

    // 9. Pesées
    const weights = safeObject(parsed.weights || parsed.vtaper_weights || parsed.weightLog);
    if (weights) localStorage.setItem('vtaper_weights', JSON.stringify(weights));

    // 10. Meta
    const meta = safeObject(parsed.meta || parsed.vtaper_meta);
    if (meta) localStorage.setItem('vtaper_meta', JSON.stringify(meta));

    initV5Database();
    applyHomeLayoutOrder();
    applyNutriLayoutOrder();
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateAllViews();

    const sessionCount = Object.keys(cal || {}).length;
    const nutriDaysCount = Object.keys(nutriLogs || {}).filter(d => nutriLogs[d] && nutriLogs[d].kcal > 0).length;
    const weightCount = Array.isArray(weights) ? weights.length : 0;

    showToast(`✅ Restauration réussie : ${sessionCount} séances, ${nutriDaysCount} j nutrition, ${weightCount} pesées !`);
    return true;
}

function exportData() {
    haptic('tap');
    const fullBackup = buildFullBackupPayload();
    navigator.clipboard.writeText(JSON.stringify(fullBackup));
    showToast("📋 Sauvegarde JSON copiée dans le presse-papier !");
}

function importData() {
    haptic('tap');
    const input = prompt("Colle ici ta sauvegarde JSON :");
    if (!input) return;
    try {
        const parsed = JSON.parse(input);
        restoreFromPayload(parsed);
    } catch (e) {
        showToast("⚠️ Format JSON invalide");
    }
}

function getGithubConfig() {
    return safeObject(localStorage.getItem('vtaper_gh_config')) || { owner: "", repo: "", token: "" };
}

function toggleBackupDrawer() {
    haptic('tap');
    const drawer = document.getElementById('backup-main-drawer');
    if (!drawer) return;
    const cfg = getGithubConfig();
    const ownerEl = document.getElementById('gh-owner');
    const repoEl = document.getElementById('gh-repo');
    const tokenEl = document.getElementById('gh-token');
    if (ownerEl) ownerEl.value = cfg.owner || '';
    if (repoEl) repoEl.value = cfg.repo || '';
    if (tokenEl) tokenEl.value = cfg.token || '';
    drawer.classList.toggle('open');
}

function toggleGithubConfigDrawer() {
    toggleBackupDrawer();
}

function saveGithubConfig() {
    haptic('success');
    const ownerEl = document.getElementById('gh-owner');
    const repoEl = document.getElementById('gh-repo');
    const tokenEl = document.getElementById('gh-token');
    const cfg = {
        owner: (ownerEl ? ownerEl.value : '').trim(),
        repo: (repoEl ? repoEl.value : '').trim(),
        token: (tokenEl ? tokenEl.value : '').trim()
    };
    localStorage.setItem('vtaper_gh_config', JSON.stringify(cfg));
    const drawer = document.getElementById('backup-main-drawer');
    if (drawer) drawer.classList.remove('open');
    showToast("✅ Paramètres GitHub enregistrés");
}

function utf8ToBase64(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }
}

function base64ToUtf8(b64) {
    const cleanB64 = (b64 || '').replace(/\s/g, '');
    try {
        return decodeURIComponent(escape(atob(cleanB64)));
    } catch (e) {
        const binary = atob(cleanB64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }
}

async function syncToGitHub() {
    haptic('tap');
    const cfg = getGithubConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
        toggleBackupDrawer();
        return showToast("⚠️ Configure d'abord tes accès GitHub");
    }

    const statusEl = document.getElementById('github-sync-status');
    if (statusEl) statusEl.textContent = "⏳ Connexion à GitHub en cours...";

    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/backup.json`;
    const headers = {
        "Authorization": `Bearer ${cfg.token}`,
        "Accept": "application/vnd.github+json"
    };

    try {
        let existingSha = null;
        const getRes = await fetch(apiUrl, { headers });
        if (getRes.ok) {
            const fileData = await getRes.json();
            existingSha = fileData.sha;
        }

        const payload = buildFullBackupPayload();
        delete payload.ghConfig; // Sécurité absolue : jamais de token dans le commit
        const payloadStr = JSON.stringify(payload, null, 2);
        const bodyObj = {
            message: `📲 Sync Gym-Tracker (${new Date().toLocaleDateString('fr-FR')})`,
            content: utf8ToBase64(payloadStr)
        };
        if (existingSha) bodyObj.sha = existingSha;

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(bodyObj)
        });

        if (!putRes.ok) {
            const errData = await putRes.json().catch(() => ({}));
            throw new Error(errData.message || `Code ${putRes.status}`);
        }

        const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (statusEl) statusEl.textContent = `✅ Synchronisé sur GitHub (backup.json) à ${nowTime}`;
        showToast("✅ Sauvegarde envoyée sur GitHub !");
        haptic('success');
    } catch (err) {
        if (statusEl) statusEl.textContent = `❌ Échec : ${err.message}`;
        showToast("❌ Erreur GitHub : " + err.message);
    }
}

async function pullFromGitHub() {
    haptic('tap');
    const cfg = getGithubConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
        toggleBackupDrawer();
        return showToast("⚠️ Configure d'abord tes accès GitHub");
    }
    if (!confirm("Remplacer les données de ce téléphone par la sauvegarde backup.json stockée sur ton GitHub ?")) return;

    const statusEl = document.getElementById('github-sync-status');
    if (statusEl) statusEl.textContent = "⏳ Téléchargement depuis GitHub...";

    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/backup.json`;
    try {
        const res = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${cfg.token}`,
                "Accept": "application/vnd.github+json"
            }
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Fichier backup.json introuvable sur ce dépôt.");
        }

        const data = await res.json();
        const jsonStr = base64ToUtf8(data.content);
        const parsed = JSON.parse(jsonStr);

        restoreFromPayload(parsed);
        if (statusEl) statusEl.textContent = `✅ Données restaurées depuis GitHub (${parsed.updatedAt || 'OK'})`;
        haptic('success');
    } catch (err) {
        if (statusEl) statusEl.textContent = `❌ Erreur : ${err.message}`;
        showToast("❌ Erreur chargement GitHub : " + err.message);
    }
}