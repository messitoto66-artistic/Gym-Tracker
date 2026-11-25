// app.js — VERSION 5.0 (Refonte Design Épurée, Polices Manrope & DM Sans, Palette Pastel, Dock Vectoriel)

let currentDayKey = 'push';
let timerInterval = null;
let timerEndTime = 0;
let timerTotalSeconds = 0;
let timeLeft = 0;
let lastBeepSec = -1;

let homeCalMonthOffset = 0;
let homeCalWeekOffset = 0;
let homeCalViewMode = 'month'; // 'month' ou 'week'

let nutriCalMonthOffset = 0;
let nutriCalWeekOffset = 0;
let nutriCalViewMode = 'month'; // 'month' ou 'week'

function getMondayOfDate(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
    const day = (date.getDay() + 6) % 7; // 0 = Lundi, 6 = Dimanche
    date.setDate(date.getDate() - day);
    return date;
}
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
        btn.innerHTML = soundEnabled ?
            `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>` :
            `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`;
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
    if (btn) {
        btn.innerHTML = (theme === 'dark') ?
            `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>` :
            `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
        btn.title = (theme === 'dark') ? "Mode Clair" : "Mode Sombre";
    }
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
    selectNextRecommendedWorkout();
    const dateInput = document.getElementById('gym-session-date');
    if (dateInput && !dateInput.value) dateInput.value = getTodayDateKey();
    applyHomeLayoutOrder();
    applyNutriLayoutOrder();
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateAllViews();
    startGymDurationLoop();
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

// Fonctions de bascule de tiroirs
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
        userName: "Gaël",
        title: "Tableau de bord",
        subtitle: "Objectif 80 kg · V-Taper & Calisthénie",
        order: ["calendar", "workout", "nutri"]
    };
    const saved = safeObject(localStorage.getItem('vtaper_home_config'));
    if (!saved) return def;
    let cleanOrder = (Array.isArray(saved.order) ? saved.order : def.order).filter(b => b !== 'water');
    if (!cleanOrder.includes('nutri')) cleanOrder.push('nutri');
    return {
        userName: saved.userName || def.userName,
        title: saved.title || def.title,
        subtitle: saved.subtitle || def.subtitle,
        order: cleanOrder
    };
}

function saveHomeConfigObj(cfg) {
    localStorage.setItem('vtaper_home_config', JSON.stringify(cfg));
}

function openGlobalSettingsModal() {
    haptic('tap');
    const modal = document.getElementById('global-settings-modal');
    if (!modal) return;
    const cfg = getHomeConfig();
    const nameEl = document.getElementById('cfg-user-name');
    if (nameEl) nameEl.value = cfg.userName || 'Gaël';
    document.getElementById('cfg-home-title').value = cfg.title;
    document.getElementById('cfg-home-sub').value = cfg.subtitle;
    renderHomeOrderEditor(cfg.order);
    modal.classList.add('open');
}

function closeGlobalSettingsModal() {
    const modal = document.getElementById('global-settings-modal');
    if (modal) modal.classList.remove('open');
}

function toggleHomeEditDrawer() {
    openGlobalSettingsModal();
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
    const nameEl = document.getElementById('cfg-user-name');
    if (nameEl) cfg.userName = nameEl.value.trim() || "Gaël";
    cfg.title = document.getElementById('cfg-home-title').value.trim() || "Tableau de bord";
    cfg.subtitle = document.getElementById('cfg-home-sub').value.trim() || "Objectif 80 kg";
    saveHomeConfigObj(cfg);
    applyHomeLayoutOrder();
    closeGlobalSettingsModal();
    updateAllViews();
    showToast("✅ Profil & accueil mis à jour");
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

function getDayWorkouts(cal, dateKey) {
    if (!cal || !cal[dateKey]) return [];
    const val = cal[dateKey];
    if (Array.isArray(val)) return val.filter(Boolean);
    return typeof val === 'string' ? [val] : [];
}

function countTotalSessions(cal) {
    if (!cal || typeof cal !== 'object') return 0;
    return Object.keys(cal).reduce((sum, d) => sum + getDayWorkouts(cal, d).length, 0);
}

function selectNextRecommendedWorkout() {
    const programs = getPrograms();
    const keys = Object.keys(programs);
    if (keys.length === 0) return;
    const cal = getWorkoutCalendar();
    const todayKey = getTodayDateKey();
    const todayList = getDayWorkouts(cal, todayKey);
    if (todayList.length > 0) {
        const lastToday = todayList[todayList.length - 1];
        if (programs[lastToday]) { currentDayKey = lastToday; return; }
    }
    const pastDates = Object.keys(cal).filter(d => d <= todayKey && getDayWorkouts(cal, d).length > 0).sort();
    if (pastDates.length === 0) {
        currentDayKey = keys[0];
        return;
    }
    const lastList = getDayWorkouts(cal, pastDates[pastDates.length - 1]);
    const lastProg = lastList[lastList.length - 1];
    const idx = keys.indexOf(lastProg);
    currentDayKey = idx >= 0 ? keys[(idx + 1) % keys.length] : keys[0];
}

function getExoType(exo) {
    if (!exo) return 'weight';
    if (exo.exoType) return exo.exoType;
    const rirStr = String(exo.rir || '').toLowerCase();
    const titleStr = String(exo.title || '').toLowerCase();
    if (rirStr.includes('sec') || /l-sit|hollow|gainage|planche/.test(titleStr)) return 'time';
    if (/pompes/.test(titleStr)) return 'bodyweight';
    return 'weight';
}

function getExoStep(exo) {
    return (exo && parseFloat(exo.step)) ? parseFloat(exo.step) : 1;
}

function classifyMuscleGroup(machineKey) {
    const k = String(machineKey || '').toLowerCase();
    if (k.includes('leg') || k.includes('cuisse') || k.includes('squat') || k.includes('ischio') || k.includes('fente') || k.includes('mollet') || k.includes('rdl') || k.includes('souleve') || k.includes('hip') || k.includes('adduct') || k.includes('abduct') || k.includes('swiss_ball') || k.includes('presse_unilaterale')) {
        return 'leg';
    }
    if (k.includes('triceps') || k.includes('biceps') || k.includes('curl') || k.includes('bras') || k.includes('front') || k.includes('arm') || k.includes('pushdown')) {
        return 'bra';
    }
    if (k.includes('pec') || k.includes('dips') || k.includes('ecarte') || k.includes('couch') || k.includes('chest') || k.includes('pompes') || k.includes('developpe_incline') || k.includes('incline_barre') || k.includes('developpe_machine') || k.includes('developpe_barre')) {
        return 'pec';
    }
    if (k.includes('milit') || k.includes('epaule') || k.includes('laterale') || k.includes('shoulder') || k.includes('delto') || k.includes('face') || k.includes('oiseau') || k.includes('pike')) {
        return 'epa';
    }
    if (k.includes('traction') || k.includes('tirage') || k.includes('rowing') || k.includes('bucheron') || k.includes('dos') || k.includes('lombaire') || k.includes('good_morning') || k.includes('t_bar') || k.includes('pull')) {
        return 'dos';
    }
    if (k.includes('abdo') || k.includes('gainage') || k.includes('crunch') || k.includes('core') || k.includes('releve') || k.includes('l_sit') || k.includes('hollow')) {
        return 'abs';
    }
    return null;
}

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
    showInputModal(
        "Nom court de l'onglet (ex: Bras, FullBody, Calisthénie)",
        "Push, Pull, Legs...",
        "Suivant →",
        "",
        (shortName) => {
            if (!shortName) return;
            showInputModal(
                "Titre complet de la séance",
                `Séance ${shortName}`,
                "Suivant →",
                `Séance ${shortName}`,
                (fullTitle) => {
                    if (!fullTitle) fullTitle = shortName;
                    showInputModal(
                        "Sous-titre (muscles ciblés)",
                        "Programme personnalisé",
                        "Créer ✓",
                        "",
                        (subtitle) => {
                            const programs = getPrograms();
                            const palette = ["#ec4899", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#3b82f6"];
                            const randomColor = palette[Object.keys(programs).length % palette.length];
                            const newKey = 'prog_' + Date.now();
                            programs[newKey] = {
                                title: fullTitle,
                                subtitle: subtitle || "",
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
                    );
                }
            );
        }
    );
}

function renameCurrentWorkout() {
    const programs = getPrograms();
    const cur = programs[currentDayKey];
    if (!cur) return;

    showInputModal(
        "Nom de l'onglet horizontal",
        "Push, Pull...",
        "Suivant →",
        cur.shortLabel || cur.title,
        (newShort) => {
            if (!newShort) return;
            showInputModal(
                "Titre principal",
                "Séance Push",
                "Suivant →",
                cur.title,
                (newTitle) => {
                    showInputModal(
                        "Sous-titre",
                        "Pecs, Épaules, Triceps",
                        "Renommer ✓",
                        cur.subtitle,
                        (newSub) => {
                            cur.shortLabel = newShort.trim();
                            cur.title = (newTitle || cur.title).trim();
                            cur.subtitle = (newSub || cur.subtitle).trim();
                            savePrograms(programs);
                            renderDaySelectorBar();
                            loadWorkout(currentDayKey);
                            updateHomeDashboard();
                            showToast("✅ Séance renommée");
                        }
                    );
                }
            );
        }
    );
}

function deleteCurrentWorkout() {
    const programs = getPrograms();
    if (Object.keys(programs).length <= 1) return showToast("⚠️ Garde au moins une séance");
    const workoutName = programs[currentDayKey].title;
    showInputModal(
        `⚠️ Supprimer "${workoutName}" ? Tape "OUI" pour confirmer`,
        "OUI",
        "Supprimer définitivement",
        "",
        (val) => {
            if (val.trim().toUpperCase() !== 'OUI') {
                showToast("❌ Suppression annulée");
                return;
            }
            delete programs[currentDayKey];
            savePrograms(programs);
            currentDayKey = Object.keys(programs)[0];
            renderDaySelectorBar();
            loadWorkout(currentDayKey);
            updateHomeDashboard();
            showToast("🗑️ Séance supprimée");
        }
    );
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
    const typeEl = document.getElementById('new-exo-type');
    const exoType = typeEl ? typeEl.value : 'weight';

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
        rir: exoType === 'time' ? "Max sec" : "1-2",
        rest,
        exoType,
        step: 1,
        hasWarmupRamp: isFirst && exoType === 'weight',
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
    showConfirmModal("Retirer l'exercice", "Retirer cet exercice de cette séance ?", () => {
        const programs = getPrograms();
        const workout = programs[currentDayKey];
        workout.exercises = workout.exercises.filter(e => e.id !== exoId);
        savePrograms(programs);
        loadWorkout(currentDayKey);
        showToast("🗑️ Exercice retiré");
    });
}

// Chrono global de séance (V6.3)
let _gymDurationInterval = null;

function ensureGymSessionStarted() {
    const drafts = getGymDraft();
    if (!drafts._sessionStartedAt) {
        drafts._sessionStartedAt = Date.now();
        localStorage.setItem('vtaper_gym_draft', JSON.stringify(drafts));
        updateGymDurationUI();
    }
}

function resetGymSessionTimer() {
    haptic('tap');
    const drafts = getGymDraft();
    delete drafts._sessionStartedAt;
    localStorage.setItem('vtaper_gym_draft', JSON.stringify(drafts));
    updateGymDurationUI();
    showToast("⏱ Chrono de séance remis à zéro");
}

function getGymSessionDurationMinutes() {
    const drafts = getGymDraft();
    if (!drafts._sessionStartedAt) return 0;
    const diffMs = Date.now() - drafts._sessionStartedAt;
    if (diffMs < 0 || diffMs > 6 * 3600 * 1000) return 0;
    return Math.max(1, Math.round(diffMs / 60000));
}

function updateGymDurationUI() {
    const el = document.getElementById('gym-duration-pill');
    if (!el) return;
    const drafts = getGymDraft();
    if (!drafts._sessionStartedAt) {
        el.textContent = "⏱ Séance : 0 min";
        return;
    }
    const mins = Math.max(0, Math.floor((Date.now() - drafts._sessionStartedAt) / 60000));
    el.textContent = `⏱ Séance : ${mins} min`;
}

function startGymDurationLoop() {
    clearInterval(_gymDurationInterval);
    updateGymDurationUI();
    _gymDurationInterval = setInterval(updateGymDurationUI, 15000);
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
            const wInp = row.querySelector('.weight-input');
            const rInp = row.querySelector('.reps-input');
            setsArr.push({
                weight: wInp ? wInp.value : '0',
                reps: rInp ? rInp.value : '0',
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
    delete drafts._sessionStartedAt;
    localStorage.setItem('vtaper_gym_draft', JSON.stringify(drafts));
    updateGymDurationUI();
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
        const exoType = getExoType(exo);
        const exoStep = getExoStep(exo);

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

            // V6.1 / V6.3 : Perf précédente
            let prevHintHTML = '';
            if (lastPerf && lastPerf.sets && lastPerf.sets[i]) {
                const prevSet = lastPerf.sets[i];
                const prevW = parseFloat(prevSet.weight) || 0;
                const prevR = parseInt(prevSet.reps) || 0;
                if (exoType === 'time') {
                    prevHintHTML = `<div class="set-prev-hint">⟳ ${prevR > 0 ? prevR + ' sec' : '—'}</div>`;
                } else {
                    const curW = parseFloat(targetW) || 0;
                    let gainBadge = '';
                    if (prevW > 0 && curW > 0 && curW !== prevW) {
                        const diff = curW - prevW;
                        gainBadge = `<span class="set-prev-gain ${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg</span>`;
                    }
                    prevHintHTML = `<div class="set-prev-hint">⟳ ${prevW > 0 ? prevW + ' kg' : 'Poids du corps'} × ${prevR > 0 ? prevR : '—'} ${gainBadge}</div>`;
                }
            }

            const weightCellHTML = (exoType === 'time')
                ? `<input type="hidden" class="weight-input" value="0">`
                : `<div class="stepper-control">
                        <button class="step-btn" onclick="stepValue('${exo.id}', ${i}, 'weight', -1)">−</button>
                        <input type="number" step="0.5" inputmode="decimal" class="set-input weight-input" 
                               placeholder="${exoType === 'bodyweight' ? '0' : 'kg'}" value="${targetW}" oninput="onSetInputChange('${exo.id}', ${i})">
                        <button class="step-btn" onclick="stepValue('${exo.id}', ${i}, 'weight', 1)">+</button>
                   </div>`;

            setsHTML += `
                ${prevHintHTML}
                <div class="set-row ${exoType === 'time' ? 'no-weight' : ''} ${isDone ? 'done' : ''}" id="row_${exo.id}_${i}">
                    <span class="set-num">S${i + 1}</span>
                    ${weightCellHTML}
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
        const unitLabel = exoType === 'time' ? 'sec' : 'Reps';

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
                        <div class="exo-sub-info">${exo.sets}×${exo.repsMin}-${exo.repsMax} ${unitLabel} · RIR ${exo.rir}</div>
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
                       onchange="saveMachineNoteForExo('${exo.id}', this.value)">

                <!-- Panneau Engrenage ⚙️ -->
                <div class="settings-drawer" id="drawer_${exo.id}">
                    <div style="margin-bottom:8px;">
                        <label class="field-label">Titre de l'exercice</label>
                        <input type="text" id="cfg_title_${exo.id}" class="clean-input" value="${exoTitle.replace(/"/g, '&quot;')}" style="padding:6px 10px;">
                    </div>
                    <div class="settings-grid">
                        <div class="settings-field"><label>Séries</label><input type="number" id="cfg_sets_${exo.id}" value="${exo.sets}"></div>
                        <div class="settings-field"><label>${exoType === 'time' ? 'Sec Min' : 'Reps Min'}</label><input type="number" id="cfg_min_${exo.id}" value="${exo.repsMin}"></div>
                        <div class="settings-field"><label>${exoType === 'time' ? 'Sec Max' : 'Reps Max'}</label><input type="number" id="cfg_max_${exo.id}" value="${exo.repsMax}"></div>
                        <div class="settings-field"><label>RIR cible</label><input type="text" id="cfg_rir_${exo.id}" value="${exo.rir}"></div>
                        <div class="settings-field"><label>Repos (sec)</label><input type="number" id="cfg_rest_${exo.id}" value="${exo.rest}"></div>
                        <div class="settings-field">
                            <label>Pas (kg)</label>
                            <select id="cfg_step_${exo.id}" class="machine-select" style="padding:7px 4px; text-align:center; background:var(--bg-card);">
                                ${[0.5, 1, 1.25, 2, 2.5, 5].map(st => `<option value="${st}" ${exoStep === st ? 'selected' : ''}>±${st}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">
                        <select id="cfg_type_${exo.id}" class="machine-select" style="flex:1; background:var(--bg-card);">
                            <option value="weight" ${exoType === 'weight' ? 'selected' : ''}>Type : Poids + Reps (kg)</option>
                            <option value="bodyweight" ${exoType === 'bodyweight' ? 'selected' : ''}>Type : Poids du corps</option>
                            <option value="time" ${exoType === 'time' ? 'selected' : ''}>Type : Gainage / Temps (sec)</option>
                        </select>
                        <button class="primary-btn" style="width:auto; padding:9px 14px; font-size:0.78rem;" onclick="applyExoSettings('${exo.id}')">Sauver</button>
                    </div>
                    <div style="border-top:1px solid var(--border); padding-top:8px;">
                        <label class="field-label">Machines disponibles pour cet exercice</label>
                        <div class="variant-chip-list">${chipsHTML}</div>
                        ${datalistHTML}
                        <div style="display:flex; gap:6px; margin-top:6px;">
                            <input type="text" list="${datalistId}" id="new_var_${exo.id}" class="clean-input" placeholder="Ajouter une machine..." style="padding:6px 10px;">
                            <button class="secondary-btn" style="padding:6px 12px; font-size:0.78rem; width:auto;" onclick="addVariant('${exo.id}')">+ Machine</button>
                        </div>
                    </div>
                    <div style="border-top:1px solid var(--border); margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <label style="font-size:0.72rem; color:var(--text-muted);">
                            <input type="checkbox" ${exo.hasWarmupRamp ? 'checked' : ''} onchange="toggleWarmupFlag('${exo.id}', this.checked)"> Rampe d'échauffement
                        </label>
                        <button class="mini-tool-btn danger" onclick="deleteExerciseFromWorkout('${exo.id}')">Retirer</button>
                    </div>

                    ${exoType === 'time' ? '' : `
                    <!-- CALCULATEUR % 1RM V6.1 -->
                    <div class="rm-calc-block" id="rm-calc-${exo.id}" onclick="calcRMPercents('${exo.id}')">
                        <span class="rm-calc-title">📊 Calculateur % 1RM — Appuie pour calculer</span>
                    </div>`}
                </div>

                <!-- 1RM conservé de manière masquée pour les calculs internes -->
                <span id="1rm_${exo.id}" style="display:none;"></span>

                <!-- RÈGLE C1 : Indication Coach + Rampe fusionnée sans boîte lourde -->
                <div class="c1-coach-line ${coach.isLevelUp ? 'level-up' : ''}" id="coach_line_${exo.id}">
                    ${coach.textHTML}
                    ${exo.hasWarmupRamp && exoType !== 'time' && doneCount === 0 ? `<span id="warmup_${exo.id}" style="display:block; margin-top:2px;">${getWarmupText(initialWeight)}</span>` : ''}
                </div>

                <div class="sets-header ${exoType === 'time' ? 'no-weight' : ''}">
                    ${exoType === 'time' ? '<span>#</span><span>Durée (sec)</span><span>OK</span>' : '<span>#</span><span>Poids (kg)</span><span>Reps</span><span>OK</span>'}
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
    const stepSel = document.getElementById(`cfg_step_${exoId}`);
    if (stepSel) exo.step = parseFloat(stepSel.value) || 1;
    const typeSel = document.getElementById(`cfg_type_${exoId}`);
    if (typeSel) exo.exoType = typeSel.value || 'weight';

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

// C1 : Recommandation Coach épurée en une ligne (V6.3 : top-set + step + type)
function getCoachRecommendation(exo, lastPerf) {
    const exoType = getExoType(exo);
    const step = getExoStep(exo);
    const emptySets = Array.from({ length: exo.sets }, () => ({ weight: exoType === 'time' ? '0' : '', reps: exo.repsMin }));
    if (!lastPerf || !lastPerf.sets || lastPerf.sets.length === 0) {
        const msg = exoType === 'time'
            ? `💡 Première fois : vise entre <b>${exo.repsMin} et ${exo.repsMax} sec</b>`
            : `💡 Première fois sur cette machine : trouve ta charge à <b>RIR ${exo.rir}</b>`;
        return { isLevelUp: false, textHTML: msg, prefillSets: emptySets };
    }

    const topWeight = Math.max(...lastPerf.sets.map(s => parseFloat(s.weight) || 0));
    const lastWeight = topWeight > 0 ? topWeight : (parseFloat(lastPerf.sets[0].weight) || 0);
    const allMaxed = lastPerf.sets.length >= exo.sets && lastPerf.sets.every(s => parseInt(s.reps) >= exo.repsMax);

    if (exoType === 'time') {
        if (allMaxed) {
            return {
                isLevelUp: true,
                textHTML: `🔥 Palier <b>${exo.repsMax} sec</b> validé le ${lastPerf.displayDate} !`,
                prefillSets: Array.from({ length: exo.sets }, () => ({ weight: '0', reps: exo.repsMax }))
            };
        }
        const prefillTime = Array.from({ length: exo.sets }, (_, i) => {
            const prev = lastPerf.sets[i] || lastPerf.sets[0];
            const prevSec = parseInt(prev.reps) || exo.repsMin;
            return { weight: '0', reps: Math.min(prevSec + 5, exo.repsMax) };
        });
        return {
            isLevelUp: false,
            textHTML: `🎯 Coach : vise <b>+5 sec</b> (vu le ${lastPerf.displayDate})`,
            prefillSets: prefillTime
        };
    }

    if (allMaxed && (lastWeight > 0 || exoType === 'bodyweight')) {
        if (lastWeight === 0 && exoType === 'bodyweight') {
            return {
                isLevelUp: true,
                textHTML: `🔥 ${exo.sets}×${exo.repsMax} validé le ${lastPerf.displayDate} : tu peux lester (+${step} kg) !`,
                prefillSets: Array.from({ length: exo.sets }, () => ({ weight: step, reps: exo.repsMin }))
            };
        }
        const nextWeight = Number((lastWeight + step).toFixed(2));
        return {
            isLevelUp: true,
            textHTML: `🔥 Objectif validé le ${lastPerf.displayDate} : passe à <b>${nextWeight} kg (+${step} kg)</b>`,
            prefillSets: Array.from({ length: exo.sets }, () => ({ weight: nextWeight, reps: exo.repsMin }))
        };
    } else {
        const prefill = Array.from({ length: exo.sets }, (_, i) => {
            const prev = lastPerf.sets[i] || lastPerf.sets[0];
            const prevReps = parseInt(prev.reps) || exo.repsMin;
            return { weight: prev.weight !== undefined && prev.weight !== '' ? prev.weight : lastWeight, reps: Math.min(prevReps + 1, exo.repsMax) };
        });
        const labelCharge = lastWeight > 0 ? `<b>${lastWeight} kg</b>` : `<b>poids du corps</b>`;
        return {
            isLevelUp: false,
            textHTML: `🎯 Coach : garde ${labelCharge} et vise <b>+1 rep</b> (vu le ${lastPerf.displayDate})`,
            prefillSets: prefill
        };
    }
}

function stepValue(exoId, setIndex, type, dir) {
    haptic('tap');
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const exo = workout && workout.exercises ? workout.exercises.find(e => e.id === exoId) : null;
    const row = document.getElementById(`row_${exoId}_${setIndex}`);
    if (!row) return;
    const input = row.querySelector(type === 'weight' ? '.weight-input' : '.reps-input');
    if (!input) return;
    const currentVal = parseFloat(input.value) || 0;
    let delta = dir;
    if (type === 'weight') {
        delta = dir * getExoStep(exo);
    } else if (getExoType(exo) === 'time') {
        delta = dir * 5;
    }
    const next = Math.max(0, Math.round((currentVal + delta) * 100) / 100);
    input.value = next;
    onSetInputChange(exoId, setIndex);
}

function onSetInputChange(exoId, setIndex) {
    ensureGymSessionStarted();
    if (setIndex === 0) {
        const row0 = document.getElementById(`row_${exoId}_0`);
        if (row0) updateWarmup(exoId, row0.querySelector('.weight-input').value);
    }
    updateExerciseMetrics(exoId);
    saveGymDraftState(); // Sauvegarde en brouillon en direct (C5)
}

function saveMachineNoteForExo(exoId, noteVal) {
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const exo = workout && workout.exercises ? workout.exercises.find(e => e.id === exoId) : null;
    if (!exo) return;
    const activeIdx = Math.min(exo.activeVariantIndex || 0, exo.variants.length - 1);
    const machineName = exo.variants[activeIdx];
    saveMachineNote(machineName, noteVal);
    showToast('📝 Note machine enregistrée');
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
    if (badge1RM) {
        badge1RM.dataset.rm = best1RM > 0 ? best1RM.toFixed(1) : '0';
        badge1RM.textContent = best1RM > 0 ? `1RM : ${best1RM.toFixed(1)} kg` : `1RM : -- kg`;
    }
    const rmBlock = document.getElementById(`rm-calc-${exoId}`);
    if (rmBlock && rmBlock.dataset.open === '1') {
        calcRMPercents(exoId);
    }
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
// 4. SAUVEGARDE DE LA SÉANCE (MULTI-SÉANCES, DATE & PRs V6.3)
// =========================================================
function saveWorkoutSession() {
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    const machineLogs = getMachineLogs();
    const dateInput = document.getElementById('gym-session-date');
    const targetDateKey = (dateInput && dateInput.value) ? dateInput.value : getTodayDateKey();
    const dParts = targetDateKey.split('-');
    const displayDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}` : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    const durationMin = (targetDateKey === getTodayDateKey()) ? getGymSessionDurationMinutes() : 0;
    let savedCount = 0;
    let lastMachineUpdated = "";
    const newPRs = [];

    workout.exercises.forEach(exo => {
        const activeIdx = Math.min(exo.activeVariantIndex || 0, exo.variants.length - 1);
        const machineName = exo.variants[activeIdx];
        const mKey = toMachineKey(machineName);

        const setsData = [];
        for (let i = 0; i < exo.sets; i++) {
            const row = document.getElementById(`row_${exo.id}_${i}`);
            if (!row) continue;
            const wInp = row.querySelector('.weight-input');
            const rInp = row.querySelector('.reps-input');
            const weight = wInp ? wInp.value : '0';
            const reps = rInp ? rInp.value : '';
            if (weight || reps) setsData.push({ weight, reps });
        }

        if (setsData.length > 0) {
            savedCount++;
            lastMachineUpdated = machineName;
            registerMachineInLibrary(machineName);
            const metrics = computeSessionMetrics(setsData);
            if (!machineLogs[mKey]) machineLogs[mKey] = [];

            let prevMax1RM = 0;
            machineLogs[mKey].forEach(x => {
                if (x.dateKey !== targetDateKey && (x.best1RM || 0) > prevMax1RM) {
                    prevMax1RM = x.best1RM;
                }
            });

            if (metrics.best1RM > prevMax1RM && prevMax1RM > 0) {
                newPRs.push({
                    machineName,
                    newRM: metrics.best1RM,
                    prevRM: prevMax1RM
                });
            }

            const entry = {
                dateKey: targetDateKey,
                displayDate: displayDate,
                machineName: machineName,
                sets: setsData,
                best1RM: metrics.best1RM,
                tonnage: metrics.tonnage
            };

            const existingIdx = machineLogs[mKey].findIndex(x => x.dateKey === targetDateKey);
            if (existingIdx >= 0) machineLogs[mKey][existingIdx] = entry;
            else machineLogs[mKey].push(entry);

            machineLogs[mKey].sort((a, b) => (a.dateKey || '').localeCompare(b.dateKey || ''));
        }
    });

    if (savedCount === 0) return showToast("⚠️ Remplis au moins une série");

    localStorage.setItem('vtaper_machine_logs', JSON.stringify(machineLogs));
    clearGymDraftForDay(currentDayKey); // Efface le brouillon une fois la séance validée

    const cal = getWorkoutCalendar();
    const existingList = getDayWorkouts(cal, targetDateKey);
    if (!existingList.includes(currentDayKey)) existingList.push(currentDayKey);
    cal[targetDateKey] = existingList.length === 1 ? existingList[0] : existingList;
    saveWorkoutCalendar(cal);

    const meta = getGlobalMeta();
    meta.sessions = countTotalSessions(cal);
    meta.lastMachine = lastMachineUpdated;
    saveGlobalMeta(meta);

    showToast(`✅ Séance "${workout.shortLabel || workout.title}" sauvegardée !`);
    loadWorkout(currentDayKey);
    updateAllViews();
    // V6.1 / V6.3 : Afficher le récap de séance avec PRs & durée
    setTimeout(() => showSessionRecap(workout, machineLogs, targetDateKey, { newPRs, durationMin }), 400);
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

    const dateBanner = document.getElementById('home-date-banner');
    if (dateBanner) {
        const now = new Date();
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        dateBanner.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} · Semaine ${weekNo}`;
    }

    const homeCfg = getHomeConfig();
    const greetingEl = document.getElementById('home-greeting');
    if (greetingEl) greetingEl.textContent = `Bonjour, ${homeCfg.userName || 'Gaël'}.`;

    if (document.getElementById('view-home').classList.contains('active')) {
        document.getElementById('header-title').textContent = homeCfg.title;
        document.getElementById('header-subtitle').textContent = homeCfg.subtitle;
    }

    const elKcal = document.getElementById('home-kcal');
    if (elKcal) elKcal.textContent = todayData.kcal;
    const elKcalTarget = document.getElementById('home-kcal-target');
    if (elKcalTarget) elKcalTarget.textContent = `/ ${targets.kcal} kcal`;
    const elKcalBar = document.getElementById('home-kcal-bar');
    if (elKcalBar) updateBarWithGoalColor(elKcalBar, todayData.kcal, targets.kcal);

    const elProt = document.getElementById('home-prot');
    if (elProt) elProt.textContent = `${todayData.prot} / ${targets.prot}g`;
    const elCarbs = document.getElementById('home-carbs');
    if (elCarbs) elCarbs.textContent = `${todayData.carbs} / ${targets.carbs}g`;
    const elFats = document.getElementById('home-fats');
    if (elFats) elFats.textContent = `${todayData.fats} / ${targets.fats}g`;

    const elProtBar = document.getElementById('home-prot-bar');
    if (elProtBar) updateBarWithGoalColor(elProtBar, todayData.prot, targets.prot);
    const elCarbsBar = document.getElementById('home-carbs-bar');
    if (elCarbsBar) updateBarWithGoalColor(elCarbsBar, todayData.carbs, targets.carbs);
    const elFatsBar = document.getElementById('home-fats-bar');
    if (elFatsBar) updateBarWithGoalColor(elFatsBar, todayData.fats, targets.fats);

    const elWater = document.getElementById('home-water');
    if (elWater) elWater.textContent = `${(todayData.water || 0).toFixed(2)} / ${targets.water.toFixed(1)} L`;
    const elWaterBar = document.getElementById('home-water-bar');
    if (elWaterBar) elWaterBar.style.width = `${Math.min(((todayData.water || 0) / targets.water) * 100, 100)}%`;

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
        if (btn) btn.style.background = curProg.color || 'var(--accent)';
        const countEl = document.getElementById('home-workout-count');
        if (countEl && curProg.exercises) {
            const count = curProg.exercises.length;
            countEl.textContent = `${count} exercice${count > 1 ? 's' : ''} prévu${count > 1 ? 's' : ''}`;
        }
    }

    renderHomeCalendar();
}

function toggleHomeCalView() {
    haptic('tap');
    if (homeCalViewMode === 'month') {
        homeCalViewMode = 'week';
        homeCalWeekOffset = 0;
    } else {
        homeCalViewMode = 'month';
    }
    renderHomeCalendar();
}

function changeHomeCalNav(delta) {
    haptic('tap');
    if (homeCalViewMode === 'week') {
        homeCalWeekOffset += delta;
    } else {
        homeCalMonthOffset += delta;
    }
    renderHomeCalendar();
}

function changeHomeMonth(delta) {
    changeHomeCalNav(delta);
}

function renderHomeCalendar() {
    const grid = document.getElementById('calendar-grid');
    const legend = document.getElementById('calendar-legend');
    const titleEl = document.getElementById('cal-month-title');
    const countEl = document.getElementById('cal-month-count');
    const toggleBtn = document.getElementById('home-cal-toggle-btn');
    if (!grid) return;

    if (toggleBtn) {
        toggleBtn.textContent = (homeCalViewMode === 'week') ? "🗓️ Mois" : "📅 Semaine";
        toggleBtn.title = (homeCalViewMode === 'week') ? "Passer en vue mois complet" : "Réduire à la semaine en cours";
    }

    const monthNames = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUI", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];
    const cal = getWorkoutCalendar();
    const programs = getPrograms();
    const todayKey = getTodayDateKey();

    let html = '';
    let sessionsCount = 0;

    function buildHomeCalCell(dateKey, dayNum) {
        const dayWorkouts = getDayWorkouts(cal, dateKey);
        const isToday = (dateKey === todayKey);
        const classes = ['cal-day', 'nutri-clickable'];
        if (isToday) classes.push('today');
        if (dayWorkouts.length > 1) classes.push('multi-session');

        let inlineStyle = '';
        if (dayWorkouts.length > 0) {
            sessionsCount += dayWorkouts.length;
            const c1 = (programs[dayWorkouts[0]] && programs[dayWorkouts[0]].color) ? programs[dayWorkouts[0]].color : '#005AA0';
            if (dayWorkouts.length === 1) {
                inlineStyle = `style="background:${c1}; color:#fff; font-weight:800; border-color:${c1}; box-shadow:0 2px 6px ${c1}55;"`;
            } else {
                const c2 = (programs[dayWorkouts[1]] && programs[dayWorkouts[1]].color) ? programs[dayWorkouts[1]].color : '#7c3aed';
                inlineStyle = `style="background:linear-gradient(135deg, ${c1} 50%, ${c2} 50%); color:#fff; font-weight:800; border-color:${c1}; box-shadow:0 2px 6px ${c1}55;"`;
            }
        }
        return `<div class="${classes.join(' ')}" ${inlineStyle} onclick="openCalModal('${dateKey}')">${dayNum}</div>`;
    }

    if (homeCalViewMode === 'week') {
        // Mode Semaine Réduite (Lundi au Dimanche)
        const now = new Date();
        const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        refDate.setDate(refDate.getDate() + (homeCalWeekOffset * 7));
        const monday = getMondayOfDate(refDate);
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

        const displayMonth = (monday.getMonth() === sunday.getMonth())
            ? `${monthNames[monday.getMonth()]} ${monday.getFullYear()}`
            : `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
        if (titleEl) titleEl.textContent = displayMonth;

        for (let i = 0; i < 7; i++) {
            const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const day = String(cur.getDate()).padStart(2, '0');
            html += buildHomeCalCell(`${y}-${m}-${day}`, cur.getDate());
        }

        if (countEl) countEl.textContent = `${sessionsCount} séance${sessionsCount > 1 ? 's' : ''}`;
    } else {
        // Mode Mois Complet
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setMonth(targetDate.getMonth() + homeCalMonthOffset);

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

        for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            html += buildHomeCalCell(dateKey, day);
        }

        if (countEl) countEl.textContent = `${sessionsCount} séance${sessionsCount > 1 ? 's' : ''}`;
    }

    grid.innerHTML = html;

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
    const dayWorkouts = getDayWorkouts(cal, dateKey);

    let buttonsHTML = Object.entries(programs).map(([dayKey, dayObj]) => {
        const color = dayObj.color || '#005AA0';
        const isSelected = dayWorkouts.includes(dayKey);
        return `
            <button class="modal-workout-btn ${isSelected ? 'selected' : ''}" style="border-left: 6px solid ${color};" onclick="assignWorkoutToDate('${dayKey}')">
                <span>${isSelected ? '✓ ' : ''}${dayObj.shortLabel || dayObj.title} <small style="font-weight:500; color:var(--text-muted);">(${dayObj.subtitle || ''})</small></span>
                <span style="width:14px; height:14px; border-radius:50%; background:${color}; display:inline-block;"></span>
            </button>
        `;
    }).join('');

    if (dayWorkouts.length > 0) {
        buttonsHTML += `
            <button class="modal-workout-btn" style="color:#dc2626; justify-content:center; margin-top:4px;" onclick="assignWorkoutToDate(null)">
                🗑️ Effacer ${dayWorkouts.length > 1 ? 'les séances' : 'la séance'} de ce jour
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
    if (dayKey === null) {
        delete cal[modalTargetDateKey];
        saveWorkoutCalendar(cal);
        closeCalModal();
        updateAllViews();
        return;
    }
    const list = getDayWorkouts(cal, modalTargetDateKey);
    const idx = list.indexOf(dayKey);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(dayKey);

    if (list.length === 0) delete cal[modalTargetDateKey];
    else cal[modalTargetDateKey] = list.length === 1 ? list[0] : list;

    saveWorkoutCalendar(cal);
    openCalModal(modalTargetDateKey);
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
    if (!favs[idx]) return;
    showConfirmModal("Supprimer le favori", `Supprimer "${favs[idx].name}" de tes favoris ?`, () => {
        const currentFavs = getFavoriteMeals();
        currentFavs.splice(idx, 1);
        localStorage.setItem('vtaper_fav_meals', JSON.stringify(currentFavs));
        renderFavorites();
        showToast("🗑️ Favori supprimé");
    });
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
    _offBasePer100g = null;
    const portionBox = document.getElementById('off-portion-box');
    if (portionBox) portionBox.style.display = 'none';

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

function copyYesterdayMeals() {
    haptic('tap');
    const logs = getNutriLogs();
    const parts = selectedNutriDateKey.split('-').map(Number);
    const refDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    refDate.setDate(refDate.getDate() - 1);
    const yKey = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;

    let sourceKey = yKey;
    if (!logs[sourceKey] || !logs[sourceKey].meals || logs[sourceKey].meals.length === 0) {
        const prevDates = Object.keys(logs).filter(d => d < selectedNutriDateKey && logs[d] && Array.isArray(logs[d].meals) && logs[d].meals.length > 0).sort();
        if (prevDates.length === 0) {
            return showToast("ℹ️ Aucun repas récent à copier");
        }
        sourceKey = prevDates[prevDates.length - 1];
    }

    const srcMeals = logs[sourceKey].meals;
    const dayData = getDayNutri(selectedNutriDateKey);
    srcMeals.forEach(m => {
        dayData.kcal += m.kcal || 0;
        dayData.prot += m.prot || 0;
        dayData.carbs += m.carbs || 0;
        dayData.fats += m.fats || 0;
        dayData.meals.push({ ...m });
    });
    saveDayNutri(selectedNutriDateKey, dayData);
    const label = sourceKey === yKey ? "d'hier" : `du ${sourceKey}`;
    showToast(`📋 ${srcMeals.length} repas copiés ${label}`);
}

function resetNutriDay() {
    showConfirmModal("Vider le journal", `Vider tous les repas du ${selectedNutriDateKey} ?`, () => {
        const dayData = getDayNutri(selectedNutriDateKey);
        dayData.kcal = 0; dayData.prot = 0; dayData.carbs = 0; dayData.fats = 0; dayData.meals = [];
        saveDayNutri(selectedNutriDateKey, dayData);
        showToast("🗑️ Repas du jour réinitialisés");
    });
}

function toggleNutriCalView() {
    haptic('tap');
    if (nutriCalViewMode === 'month') {
        nutriCalViewMode = 'week';
        nutriCalWeekOffset = 0;
    } else {
        nutriCalViewMode = 'month';
    }
    renderNutriCalendar();
}

function changeNutriCalNav(delta) {
    haptic('tap');
    if (nutriCalViewMode === 'week') {
        nutriCalWeekOffset += delta;
    } else {
        nutriCalMonthOffset += delta;
    }
    renderNutriCalendar();
}

function changeNutriMonth(delta) {
    changeNutriCalNav(delta);
}

function selectNutriDate(dateKey) {
    selectedNutriDateKey = dateKey;
    updateNutriView();
}

function renderNutriCalendar() {
    const grid = document.getElementById('nutri-calendar-grid');
    const titleEl = document.getElementById('nutri-cal-title');
    const toggleBtn = document.getElementById('nutri-cal-toggle-btn');
    if (!grid) return;

    if (toggleBtn) {
        toggleBtn.textContent = (nutriCalViewMode === 'week') ? "🗓️ Mois" : "📅 Semaine";
        toggleBtn.title = (nutriCalViewMode === 'week') ? "Passer en vue mois complet" : "Réduire à la semaine en cours";
    }

    const targets = getNutriTargets();
    const goalDelta = targets.goalDelta !== undefined ? targets.goalDelta : 300;
    const okLegend = document.getElementById('nutri-cal-legend-ok');
    const lowLegend = document.getElementById('nutri-cal-legend-low');
    if (goalDelta < 0) {
        if (okLegend) okLegend.textContent = `🟢 ≤${targets.kcal}`;
        if (lowLegend) { lowLegend.textContent = `🔴 >${targets.kcal}`; lowLegend.style.color = '#ef4444'; }
    } else if (goalDelta === 0) {
        if (okLegend) okLegend.textContent = `🟢 ≈${targets.kcal}`;
        if (lowLegend) { lowLegend.textContent = `🟠 Écart`; lowLegend.style.color = '#d97706'; }
    } else {
        if (okLegend) okLegend.textContent = `🟢 ≥${targets.kcal}`;
        if (lowLegend) { lowLegend.textContent = `🟠 <${targets.kcal}`; lowLegend.style.color = '#d97706'; }
    }

    function getNutriStatusClass(kcal) {
        if (!kcal || kcal <= 0) return '';
        if (goalDelta < 0) return kcal <= targets.kcal + 100 ? 'kcal-ok' : 'kcal-over';
        if (goalDelta === 0) {
            if (kcal >= targets.kcal - 200 && kcal <= targets.kcal + 150) return 'kcal-ok';
            return kcal > targets.kcal + 150 ? 'kcal-over' : 'kcal-low';
        }
        return kcal >= targets.kcal ? 'kcal-ok' : 'kcal-low';
    }

    const monthNames = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUI", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];
    const logs = getNutriLogs();
    let html = '';

    if (nutriCalViewMode === 'week') {
        // Mode Semaine Réduite Nutrition (Lundi au Dimanche)
        const now = new Date();
        const refDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        refDate.setDate(refDate.getDate() + (nutriCalWeekOffset * 7));
        const monday = getMondayOfDate(refDate);
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

        const displayMonth = (monday.getMonth() === sunday.getMonth())
            ? `${monthNames[monday.getMonth()]} ${monday.getFullYear()}`
            : `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
        if (titleEl) titleEl.textContent = displayMonth;

        for (let i = 0; i < 7; i++) {
            const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, '0');
            const day = String(cur.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${day}`;
            const dayLog = logs[dateKey];
            const kcal = dayLog ? dayLog.kcal : 0;

            const classes = ['cal-day', 'nutri-clickable'];
            if (dateKey === selectedNutriDateKey) classes.push('nutri-selected');
            const statusCls = getNutriStatusClass(kcal);
            if (statusCls) classes.push(statusCls);

            html += `<div class="${classes.join(' ')}" onclick="selectNutriDate('${dateKey}')">${cur.getDate()}</div>`;
        }
    } else {
        // Mode Mois Complet
        const targetDate = new Date();
        targetDate.setDate(1);
        targetDate.setMonth(targetDate.getMonth() + nutriCalMonthOffset);

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

        for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayLog = logs[dateKey];
            const kcal = dayLog ? dayLog.kcal : 0;

            const classes = ['cal-day', 'nutri-clickable'];
            if (dateKey === selectedNutriDateKey) classes.push('nutri-selected');
            const statusCls = getNutriStatusClass(kcal);
            if (statusCls) classes.push(statusCls);

            html += `<div class="${classes.join(' ')}" onclick="selectNutriDate('${dateKey}')">${day}</div>`;
        }
    }

    grid.innerHTML = html;
}

function updateNutriView() {
    renderNutriCalendar();
    renderFavorites();

    const targets = getNutriTargets();
    if (document.getElementById('view-nutri') && document.getElementById('view-nutri').classList.contains('active')) {
        document.getElementById('header-subtitle').textContent = `Objectif : ${targets.kcal} kcal · ${targets.prot}g Protéines`;
    }
    const dayData = getDayNutri(selectedNutriDateKey);
    const isToday = (selectedNutriDateKey === getTodayDateKey());
    document.getElementById('nutri-selected-date-label').textContent = isToday ? "BILAN D'AUJOURD'HUI" : `BILAN DU ${selectedNutriDateKey}`;

    document.getElementById('nutri-kcal').textContent = dayData.kcal;
    document.getElementById('nutri-kcal-target').textContent = `/ ${targets.kcal} kcal`;
    updateBarWithGoalColor(document.getElementById('nutri-kcal-bar'), dayData.kcal, targets.kcal);

    document.getElementById('nutri-prot').textContent = `${dayData.prot} / ${targets.prot}g`;
    document.getElementById('nutri-carbs').textContent = `${dayData.carbs} / ${targets.carbs}g`;
    document.getElementById('nutri-fats').textContent = `${dayData.fats} / ${targets.fats}g`;

    updateBarWithGoalColor(document.getElementById('nutri-prot-bar'), dayData.prot, targets.prot);
    updateBarWithGoalColor(document.getElementById('nutri-carbs-bar'), dayData.carbs, targets.carbs);
    updateBarWithGoalColor(document.getElementById('nutri-fats-bar'), dayData.fats, targets.fats);

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
    weightLog.push({
        date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        dateKey: getTodayDateKey(),
        w: val
    });
    localStorage.setItem('vtaper_weights', JSON.stringify(weightLog));

    document.getElementById('weight-input-field').value = '';
    updateAllViews();
    showToast(`⚖️ Poids noté : ${val.toFixed(1)} kg`);
}

function deleteWeightEntry(idx) {
    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
    if (idx <= 0 || idx >= weightLog.length) return;
    const entry = weightLog[idx];
    showConfirmModal("Supprimer la pesée", `Supprimer la pesée de ${entry.w} kg du ${entry.date} ?`, () => {
        const curLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
        if (idx <= 0 || idx >= curLog.length) return;
        curLog.splice(idx, 1);
        localStorage.setItem('vtaper_weights', JSON.stringify(curLog));

        const meta = getGlobalMeta();
        meta.weight = curLog[curLog.length - 1].w;
        saveGlobalMeta(meta);

        updateAllViews();
        showToast("🗑️ Pesée supprimée");
    });
}

// =========================================================
// FILTRES DE PÉRIODE & SYNTHÈSE PROGRÈS (V5.5)
// =========================================================
let currentProgressPeriod = '30d';

function setProgressFilter(period, btnEl) {
    currentProgressPeriod = period;
    document.querySelectorAll('.progress-filters-row .filter-pill').forEach(btn => btn.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    updateProgressView();
}

function formatChartDate(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const d = parseInt(parts[2], 10);
            const mIdx = parseInt(parts[1], 10) - 1;
            const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
            return `${d} ${months[mIdx] || ''}`;
        }
    }
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
            const d = parseInt(parts[0], 10);
            const mIdx = parseInt(parts[1], 10) - 1;
            const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
            return `${d} ${months[mIdx] || ''}`;
        }
    }
    return dateStr;
}

function getPeriodCutoffInfo(period) {
    const now = new Date();
    let daysLimit = 30;
    let periodSubtext = 'ce mois';
    if (period === '3m') {
        daysLimit = 90;
        periodSubtext = '3 mois';
    } else if (period === '1y') {
        daysLimit = 365;
        periodSubtext = 'cette année';
    }
    const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysLimit, 0, 0, 0, 0);
    const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
    return { cutoffKey, periodSubtext, daysLimit };
}

function updateProgressView() {
    const machineLogs = getMachineLogs();
    const cal = getWorkoutCalendar();
    const meta = getGlobalMeta();
    const select = document.getElementById('progress-machine-select');
    const prevSelectedKey = select ? select.value : '';

    const cwDisplay = document.getElementById('current-weight-display');
    if (cwDisplay) cwDisplay.textContent = parseFloat(meta.weight || 70.0).toFixed(1);

    // Collecter les machines avec données pour le sélecteur & les PRs
    const machineRecords = [];
    const machineKeysWithData = [];
    let sumPctGain = 0;
    let progressedMachinesCount = 0;

    Object.entries(machineLogs).forEach(([mKey, sessionsArr]) => {
        if (!sessionsArr || sessionsArr.length === 0) return;
        const count = sessionsArr.length;
        const mName = sessionsArr[count - 1].machineName;
        machineKeysWithData.push({ key: mKey, name: mName, count: count });

        let max1RM = 0;
        let maxSec = 0;
        sessionsArr.forEach(sess => {
            if ((sess.best1RM || 0) > max1RM) max1RM = sess.best1RM;
            (sess.sets || []).forEach(s => {
                const r = parseInt(s.reps) || 0;
                if (r > maxSec) maxSec = r;
            });
        });

        const first1RM = sessionsArr[0].best1RM || 0;
        const last1RM = sessionsArr[count - 1].best1RM || 0;
        const rawGain = (count > 1 && first1RM > 0) ? (((last1RM - first1RM) / first1RM) * 100) : 0;

        if (count > 1 && first1RM > 0) {
            sumPctGain += rawGain;
            progressedMachinesCount++;
        }

        machineRecords.push({
            mKey,
            mName,
            count,
            max1RM,
            maxSec,
            rawGain
        });
    });

    const recordsHTML = machineRecords.sort((a, b) => b.max1RM - a.max1RM || b.maxSec - a.maxSec).map(rec => {
        const sWord = rec.count > 1 ? 'séances' : 'séance';
        const valText = rec.max1RM > 0 ? `1RM : ${rec.max1RM.toFixed(1)} kg` : `Max : ${rec.maxSec} sec`;
        const evolText = rec.max1RM > 0 && rec.count > 1 ? ` · Évol : ${rec.rawGain >= 0 ? '+' : ''}${rec.rawGain.toFixed(1)}%` : '';
        return `
            <div class="record-row" onclick="selectMachineInProgress('${rec.mKey}'); window.scrollTo({top: 320, behavior:'smooth'});" style="cursor:pointer;">
                <div style="min-width:0;">
                    <strong style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${rec.mName}</strong>
                    <div style="font-size:0.68rem; color:var(--text-muted);">${rec.count} ${sWord}${evolText}</div>
                </div>
                <span class="record-val">${valText}</span>
            </div>
        `;
    }).join('');

    // 1. Calculs selon la période sélectionnée (30j, 3m, 1y)
    const { cutoffKey, periodSubtext } = getPeriodCutoffInfo(currentProgressPeriod);
    const todayKey = getTodayDateKey();

    // Nombre de séances dans la période (support multi-séances par jour)
    let periodSessionsCount = 0;
    Object.keys(cal).forEach(dKey => {
        if (dKey >= cutoffKey && dKey <= todayKey) {
            periodSessionsCount += getDayWorkouts(cal, dKey).length;
        }
    });

    const sessEl = document.getElementById('prog-stat-sessions');
    const sessSubEl = document.getElementById('prog-stat-sessions-sub');
    if (sessEl) sessEl.textContent = periodSessionsCount;
    if (sessSubEl) sessSubEl.textContent = periodSubtext;

    // Progression de Force moyenne dans la période
    let sumPeriodGain = 0;
    let countPeriodGain = 0;
    Object.entries(machineLogs).forEach(([mKey, sessionsArr]) => {
        if (!sessionsArr || sessionsArr.length === 0) return;
        const inPeriod = sessionsArr.filter(s => (!s.dateKey || s.dateKey >= cutoffKey) && (s.best1RM || 0) > 0);
        if (inPeriod.length >= 2) {
            const firstRM = inPeriod[0].best1RM;
            const lastRM = inPeriod[inPeriod.length - 1].best1RM;
            sumPeriodGain += ((lastRM - firstRM) / firstRM) * 100;
            countPeriodGain++;
        } else if (inPeriod.length === 1 && sessionsArr.length >= 2) {
            const prev = sessionsArr[sessionsArr.length - 2];
            if ((prev.best1RM || 0) > 0) {
                sumPeriodGain += ((inPeriod[0].best1RM - prev.best1RM) / prev.best1RM) * 100;
                countPeriodGain++;
            }
        }
    });

    let avgForceVal = 0;
    if (countPeriodGain > 0) {
        avgForceVal = sumPeriodGain / countPeriodGain;
    } else if (progressedMachinesCount > 0) {
        avgForceVal = sumPctGain / progressedMachinesCount;
    }

    const forceEl = document.getElementById('prog-stat-force');
    const forceSubEl = document.getElementById('prog-stat-force-sub');
    if (forceEl) forceEl.textContent = `${avgForceVal >= 0 ? '+' : ''}${Math.round(avgForceVal)}%`;
    if (forceSubEl) forceSubEl.textContent = periodSubtext;

    // Poids corporel actuel
    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[]');
    const currentWeight = (weightLog.length > 0 && weightLog[weightLog.length - 1].w)
        ? weightLog[weightLog.length - 1].w
        : (parseFloat(meta.weight) || 67.0);

    const weightTileEl = document.getElementById('prog-stat-weight');
    if (weightTileEl) {
        weightTileEl.textContent = Number(currentWeight).toFixed(1).replace('.', ',');
    }

    const recordsBox = document.getElementById('records-list');
    if (recordsBox) {
        recordsBox.innerHTML = recordsHTML || `<p style="font-size:0.78rem; color:var(--text-muted);">Valide une séance pour alimenter ta bibliothèque de performances.</p>`;
    }

    const toggleBtn = document.getElementById('toggle-records-btn');
    if (toggleBtn && recordsBox) {
        const rows = recordsBox.querySelectorAll('.record-row');
        if (rows.length > 5) {
            toggleBtn.style.display = 'block';
            toggleBtn.textContent = showAllRecordsFlag ? '▲ Voir moins' : `▼ Voir tout (${rows.length})`;
            rows.forEach((r, idx) => {
                r.style.display = (showAllRecordsFlag || idx < 5) ? 'flex' : 'none';
            });
        } else {
            toggleBtn.style.display = 'none';
        }
    }

    // Sélecteur épuré de machine dans la carte 1RM
    if (select) {
        if (machineKeysWithData.length === 0) {
            select.innerHTML = `<option value="">-- Aucune séance --</option>`;
        } else {
            const isValidPrev = machineKeysWithData.some(m => m.key === prevSelectedKey);
            select.innerHTML = machineKeysWithData.map(m => {
                const isSel = isValidPrev ? (m.key === prevSelectedKey) : (m.key === machineKeysWithData[0].key);
                return `<option value="${m.key}" ${isSel ? 'selected' : ''}>${m.name}</option>`;
            }).join('');
        }
        renderMachineProgressChart();
    }

    renderWeeklyMuscleVolume();
    renderBodyWeightChart();
    renderAnnualHeatmap();
    renderFUTCard();
}

// =========================================================
// VOLUME HEBDOMADAIRE PAR GROUPE MUSCULAIRE (V6.3)
// =========================================================
function renderWeeklyMuscleVolume() {
    const box = document.getElementById('weekly-muscle-volume');
    const badge = document.getElementById('weekly-sets-badge');
    if (!box) return;

    const now = new Date();
    const monday = getMondayOfDate(now);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);
    const monKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    const sunKey = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const machineLogs = getMachineLogs();
    const counts = { pec: 0, dos: 0, epa: 0, bra: 0, leg: 0, abs: 0 };
    let totalSets = 0;

    Object.entries(machineLogs).forEach(([mKey, sessionsArr]) => {
        if (!Array.isArray(sessionsArr)) return;
        const group = classifyMuscleGroup(mKey);
        sessionsArr.forEach(sess => {
            if (sess.dateKey && sess.dateKey >= monKey && sess.dateKey <= sunKey) {
                const nSets = Array.isArray(sess.sets) ? sess.sets.length : 0;
                totalSets += nSets;
                if (group && counts[group] !== undefined) counts[group] += nSets;
            }
        });
    });

    if (badge) badge.textContent = `${totalSets} série${totalSets > 1 ? 's' : ''}`;

    const groupsMeta = [
        { key: 'pec', label: 'Pecs', target: 12 },
        { key: 'dos', label: 'Dos', target: 14 },
        { key: 'epa', label: 'Épaules', target: 12 },
        { key: 'bra', label: 'Bras', target: 10 },
        { key: 'leg', label: 'Jambes', target: 14 },
        { key: 'abs', label: 'Abdos', target: 8 }
    ];

    box.innerHTML = groupsMeta.map(g => {
        const val = counts[g.key];
        const pct = Math.min(100, Math.round((val / g.target) * 100));
        const reached = val >= g.target;
        return `
            <div class="volume-bar-row">
                <div class="volume-bar-meta">
                    <span>${g.label}</span>
                    <span>${val} / ${g.target} séries</span>
                </div>
                <div class="macro-mini-bar" style="height:6px; margin-top:0;">
                    <div class="macro-mini-fill ${reached ? 'goal-reached' : ''}" style="width:${pct}%; ${!reached && val > 0 ? 'background:var(--accent);' : ''}"></div>
                </div>
            </div>
        `;
    }).join('');
}

// =========================================================
// CALCUL EXACT DES SÉANCES ANNUELLES (365 JOURS GLISSANTS)
// =========================================================
function getAnnualSessionsCount(cal) {
    if (!cal || typeof cal !== 'object') return 0;

    const now = new Date();
    const todayKey = getTodayDateKey();
    const past365 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 365, 0, 0, 0, 0);
    const start365Key = `${past365.getFullYear()}-${String(past365.getMonth() + 1).padStart(2, '0')}-${String(past365.getDate()).padStart(2, '0')}`;

    let count = 0;
    Object.keys(cal).forEach(dateStr => {
        if (dateStr >= start365Key && dateStr <= todayKey) {
            count += getDayWorkouts(cal, dateStr).length;
        }
    });

    return count;
}

// =========================================================
// CARTE FUT MUSCULATION DYNAMIQUE & ÉVOLUTIVE (V4.2 / V6.3)
// =========================================================
function renderFUTCard() {
    const card = document.getElementById('fut-card');
    if (!card) return;

    const machineLogs = getMachineLogs();
    const cal = getWorkoutCalendar();
    const meta = getGlobalMeta();
    const homeCfg = getHomeConfig();
    const bw = parseFloat(meta.weight) || 75.0;

    const annualSessions = getAnnualSessionsCount(cal);
    const maxOneRM = { pec: 0, dos: 0, epa: 0, bra: 0, leg: 0, abs: 0 };

    Object.keys(machineLogs).forEach(key => {
        const logs = machineLogs[key];
        if (!Array.isArray(logs) || logs.length === 0) return;
        let peak1RM = 0;
        logs.forEach(l => {
            let rm = parseFloat(l.best1RM) || parseFloat(l.oneRM) || 0;
            if (!rm && Array.isArray(l.sets)) {
                rm = computeSessionMetrics(l.sets).best1RM;
            }
            if (!rm) {
                const w = parseFloat(l.weight) || 0;
                const r = parseFloat(l.reps) || 0;
                rm = w * (1 + r / 30);
            }
            if (rm > peak1RM) peak1RM = rm;
        });

        const group = classifyMuscleGroup(key);
        if (group && maxOneRM[group] !== undefined) {
            maxOneRM[group] = Math.max(maxOneRM[group], peak1RM);
        }
    });

    function calcStat(peak, expectedRatio, baseline = 58) {
        if (!peak || peak <= 0) {
            return Math.min(72, baseline + Math.min(12, Math.floor(annualSessions / 5)));
        }
        const ratio = peak / bw;
        const score = 58 + Math.round((ratio / expectedRatio) * 28);
        return Math.min(99, Math.max(55, score));
    }

    const pecScore = calcStat(maxOneRM.pec, 1.15, 59);
    const dosScore = calcStat(maxOneRM.dos, 1.25, 60);
    const epaScore = calcStat(maxOneRM.epa, 0.65, 58);
    const braScore = calcStat(maxOneRM.bra, 0.45, 58);
    const legScore = calcStat(maxOneRM.leg, 2.20, 58);
    const absRegScore = Math.min(88, 58 + Math.floor(annualSessions / 3));
    const absScore = maxOneRM.abs > 0 ? Math.max(absRegScore, calcStat(maxOneRM.abs, 0.6, 58)) : absRegScore;

    const ovr = Math.round((pecScore + dosScore + epaScore + braScore + legScore + absScore) / 6);

    let tierClass = "fut-gold";
    let tierName = "OR RARE · ATHLÈTE";
    let pos = "ATH";

    if (annualSessions >= 100 || ovr >= 92) {
        tierClass = "fut-icon";
        tierName = "ICÔNE PRIME · LÉGENDE";
        pos = "LEG";
    } else if (annualSessions >= 50 || ovr >= 85) {
        tierClass = "fut-totw";
        tierName = "TOTW SPECIAL · MACHINE";
        pos = "MACH";
    } else if (annualSessions >= 20 || ovr >= 78) {
        tierClass = "fut-gold";
        tierName = "OR RARE · ATHLÈTE";
        pos = "ATH";
    } else if (annualSessions >= 8 || ovr >= 70) {
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
    if (elName) elName.textContent = (homeCfg.userName || 'Gaël').toUpperCase();
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
// HEATMAP ANNUELLE 52 SEMAINES STYLE GITHUB (V4.2)
// =========================================================
function renderAnnualHeatmap() {
    const grid = document.getElementById('annual-heatmap');
    const badge = document.getElementById('heatmap-summary-badge');
    if (!grid) return;

    const cal = getWorkoutCalendar();
    const now = new Date();
    
    const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const dayOfWeek = (endDay.getDay() + 6) % 7;
    const daysToSunday = 6 - dayOfWeek;
    endDay.setDate(endDay.getDate() + daysToSunday);

    const startDay = new Date(endDay);
    startDay.setDate(endDay.getDate() - (364 - 1));

    let html = '';
    const todayKey = getTodayDateKey();

    for (let i = 0; i < 364; i++) {
        const cur = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + i, 12, 0, 0);
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const day = String(cur.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;

        const dayWorkouts = getDayWorkouts(cal, dateKey);
        const hasSession = dayWorkouts.length > 0;
        const isToday = (dateKey === todayKey);
        const isFuture = (cur > now);

        let levelClass = dayWorkouts.length >= 2 ? 'l2' : (hasSession ? 'l2' : 'l0');
        let tooltip = `${dateKey} : ${hasSession ? 'Séance effectuée (' + dayWorkouts.join(' + ') + ')' : (isFuture ? 'À venir' : 'Repos')}`;
        if (isToday) tooltip += " [Aujourd'hui]";

        html += `<div class="heatmap-cell ${levelClass}" title="${tooltip.replace(/"/g, '&quot;')}" onclick="showToast(this.title)"></div>`;
    }

    grid.innerHTML = html;
    if (grid.parentElement) {
        grid.parentElement.scrollLeft = grid.parentElement.scrollWidth;
    }
    
    const annualCount = getAnnualSessionsCount(cal);
    if (badge) {
        badge.textContent = `${annualCount} séance${annualCount > 1 ? 's' : ''} cette année`;
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
    const datesBox = document.getElementById('trend-chart-dates');
    const valEl = document.getElementById('trend-1rm-val');
    const badgeEl = document.getElementById('trend-gain-badge');
    const logBox = document.getElementById('machine-history-log');
    const unitEl = valEl && valEl.parentElement ? valEl.parentElement.querySelector('small') : null;
    const subLabelEl = document.querySelector('.trend-sub-label');

    if (!select || !chartBox) return;

    const mKey = select.value;
    const logs = getMachineLogs();
    const allSessions = logs[mKey] || [];

    if (allSessions.length === 0) {
        chartBox.classList.add('empty-chart');
        chartBox.innerHTML = `<p style="font-size:0.76rem; color:var(--text-muted);">Aucune séance enregistrée sur cette machine.</p>`;
        if (datesBox) datesBox.innerHTML = '';
        if (valEl) valEl.textContent = '--';
        if (badgeEl) { badgeEl.textContent = '0 %'; badgeEl.className = 'pill'; }
        if (logBox) logBox.innerHTML = '';
        return;
    }

    const { cutoffKey } = getPeriodCutoffInfo(currentProgressPeriod);
    let filtered = allSessions.filter(s => !s.dateKey || s.dateKey >= cutoffKey);
    if (filtered.length === 0) filtered = allSessions.slice(-1);

    const isTimeOnly = allSessions.every(s => (s.best1RM || 0) === 0);
    const getMetricVal = (s) => {
        if (!isTimeOnly) return s.best1RM || 0;
        const maxR = Math.max(0, ...(s.sets || []).map(x => parseInt(x.reps) || 0));
        return maxR;
    };

    if (unitEl) unitEl.textContent = isTimeOnly ? 'sec' : 'kg';
    if (subLabelEl) subLabelEl.textContent = isTimeOnly ? '· Meilleur maintien' : '· 1RM estimé';

    const lastSession = filtered[filtered.length - 1];
    const firstSession = filtered[0];
    const lastVal = getMetricVal(lastSession);
    const firstVal = getMetricVal(firstSession) || 1;
    const count = filtered.length;

    if (valEl) valEl.textContent = isTimeOnly ? String(lastVal) : Number(lastVal).toFixed(1).replace('.', ',');

    if (badgeEl) {
        if (count > 1 && firstVal > 0) {
            const rawGain = (((lastVal - firstVal) / firstVal) * 100);
            const roundedGain = Math.round(rawGain);
            badgeEl.textContent = `${roundedGain >= 0 ? '+' : ''}${roundedGain} %`;
            badgeEl.className = `pill ${roundedGain >= 0 ? 'green' : 'red'}`;
        } else {
            badgeEl.textContent = count === 1 ? '1 séance' : '0 %';
            badgeEl.className = 'pill';
        }
    }

    if (logBox) {
        logBox.innerHTML = filtered.slice(-6).reverse().map(s => {
            const setsStr = (s.sets || []).map(x => {
                if (isTimeOnly) return `${x.reps}s`;
                return (parseFloat(x.weight) || 0) > 0 ? `${x.weight}kg×${x.reps}` : `PDC×${x.reps}`;
            }).join(' | ');
            const rightText = isTimeOnly ? `Max : ${getMetricVal(s)}s` : `1RM : ${s.best1RM} kg`;
            return `<div style="font-size:0.74rem; background:var(--bg-elevated); padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; gap:8px;">
                        <span><b>${s.displayDate}</b> : ${setsStr}</span>
                        <strong style="color:var(--accent); white-space:nowrap;">${rightText}</strong>
                    </div>`;
        }).join('');
    }

    if (filtered.length < 2) {
        chartBox.classList.add('empty-chart');
        const msgVal = isTimeOnly ? `${lastVal} sec` : `${lastVal} kg`;
        chartBox.innerHTML = `<p style="font-size:0.76rem; color:var(--text-muted); text-align:center;">1 séance sur cette période (${msgVal}). Élargis à 3 mois ou Année pour voir l'historique.</p>`;
        if (datesBox) datesBox.innerHTML = `<span>${formatChartDate(filtered[0].dateKey || filtered[0].displayDate)}</span>`;
        return;
    }

    chartBox.classList.remove('empty-chart');
    const vals = filtered.map(getMetricVal);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = (maxV - minV) || 2;
    const yMin = minV - range * 0.15;
    const yMax = maxV + range * 0.15;

    const width = 320, height = 90;
    const padX = 14;
    const padY = 12;

    const points = filtered.map((d, i) => {
        const val = getMetricVal(d);
        const x = padX + (i / (filtered.length - 1)) * (width - 2 * padX);
        const y = height - padY - ((val - yMin) / (yMax - yMin)) * (height - 2 * padY);
        return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val, dateKey: d.dateKey, displayDate: d.displayDate };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const lastP = points[points.length - 1];

    const gridY1 = (height * 0.35).toFixed(1);
    const gridY2 = (height * 0.70).toFixed(1);

    chartBox.innerHTML = `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="overflow:visible;">
            <line x1="4" y1="${gridY1}" x2="${width - 4}" y2="${gridY1}" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="1" opacity="0.6"/>
            <line x1="4" y1="${gridY2}" x2="${width - 4}" y2="${gridY2}" stroke="var(--border)" stroke-dasharray="3,3" stroke-width="1" opacity="0.6"/>
            <polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
            <circle cx="${lastP.x}" cy="${lastP.y}" r="4.5" fill="var(--accent)" stroke="var(--bg-card)" stroke-width="2" />
        </svg>
    `;

    if (datesBox) {
        let labelPoints = points;
        if (points.length > 5) {
            const idxs = [0, Math.floor((points.length - 1) * 0.33), Math.floor((points.length - 1) * 0.66), points.length - 1];
            labelPoints = [...new Set(idxs)].map(i => points[i]);
        }
        datesBox.innerHTML = labelPoints.map(p => `<span>${formatChartDate(p.dateKey || p.displayDate)}</span>`).join('');
    }
}

function inferWeightDateKey(entry) {
    if (!entry) return '';
    if (entry.dateKey) return entry.dateKey;
    if (entry.date && entry.date.includes('/')) {
        const parts = entry.date.split('/');
        if (parts.length >= 2) {
            const d = String(parseInt(parts[0], 10)).padStart(2, '0');
            const m = String(parseInt(parts[1], 10)).padStart(2, '0');
            const now = new Date();
            const candidate = `${now.getFullYear()}-${m}-${d}`;
            if (candidate <= getTodayDateKey()) return candidate;
            return `${now.getFullYear() - 1}-${m}-${d}`;
        }
    }
    return '';
}

function renderBodyWeightChart() {
    const weightLog = JSON.parse(localStorage.getItem('vtaper_weights') || '[{"date":"Départ","w":70.0}]');
    const latestW = weightLog[weightLog.length - 1].w;
    const startW = weightLog[0].w;
    const diff = (latestW - startW).toFixed(1);
    document.getElementById('weight-diff-badge').textContent = `${diff >= 0 ? '+' : ''}${diff} kg vs départ`;

    const { cutoffKey } = getPeriodCutoffInfo(currentProgressPeriod);
    let filtered = weightLog.filter(entry => {
        const dk = inferWeightDateKey(entry);
        return dk ? dk >= cutoffKey : (currentProgressPeriod === '1y');
    });
    if (filtered.length < 2 && weightLog.length >= 2) {
        filtered = weightLog.slice(-8);
    }

    const chartBox = document.getElementById('weight-chart-box');
    if (filtered.length < 2) {
        chartBox.classList.add('empty-chart');
        chartBox.innerHTML = `<p style="font-size:0.76rem; color:var(--text-muted);">Entre une pesée pour tracer ta courbe.</p>`;
        return;
    }

    chartBox.classList.remove('empty-chart');
    const minW = Math.min(...filtered.map(d => d.w)) - 0.5;
    const maxW = Math.max(...filtered.map(d => d.w)) + 0.5;
    const width = 300, height = 110;

    const points = filtered.map((d, i) => {
        const x = 20 + (i / (filtered.length - 1)) * (width - 40);
        const y = height - 20 - ((d.w - minW) / (maxW - minW || 1)) * (height - 45);
        return { x, y, w: d.w };
    });

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const labelStep = points.length > 9 ? Math.ceil(points.length / 7) : 1;
    const circles = points.map((p, idx) => {
        const showLabel = (idx === 0 || idx === points.length - 1 || idx % labelStep === 0);
        return `
        <circle cx="${p.x}" cy="${p.y}" r="${points.length > 12 ? 3 : 4}" fill="#10b981" />
        ${showLabel ? `<text x="${p.x}" y="${p.y - 8}" fill="var(--text-main)" font-size="9" font-weight="bold" text-anchor="middle">${p.w}</text>` : ''}
        `;
    }).join('');

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
    ensureGymSessionStarted();
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

    saveGymDraftState();
}

function startTimer(seconds) {
    clearInterval(timerInterval);
    initAudio();
    timerEndTime = Date.now() + (seconds * 1000);
    timeLeft = seconds;
    timerTotalSeconds = seconds;
    lastBeepSec = seconds;
    document.getElementById('timer-box').className = 'timer-running';
    document.getElementById('timer-wrapper').classList.add('active-timer');
    const floatBar = document.getElementById('floating-rest-bar');
    if (floatBar) {
        floatBar.classList.add('open');
        floatBar.classList.remove('done');
    }
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
            const fb = document.getElementById('floating-rest-bar');
            const fd = document.getElementById('floating-timer-display');
            if (fb) fb.classList.add('done');
            if (fd) fd.textContent = "GO !";
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
    if (timeLeft > timerTotalSeconds) timerTotalSeconds = timeLeft;
    lastBeepSec = timeLeft;
    updateTimerDisplay();
    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        document.getElementById('timer-box').className = 'timer-done';
        document.getElementById('timer-display').textContent = "GO !";
        const fb = document.getElementById('floating-rest-bar');
        const fd = document.getElementById('floating-timer-display');
        if (fb) fb.classList.add('done');
        if (fd) fd.textContent = "GO !";
    }
}

function updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    const txt = `${m}:${s}`;
    document.getElementById('timer-display').textContent = txt;
    const floatDisp = document.getElementById('floating-timer-display');
    if (floatDisp) floatDisp.textContent = txt;

    // Anneau SVG : progression qui se vide
    const circumference = 100;
    const pct = timerTotalSeconds > 0 ? Math.min(1, Math.max(0, timeLeft / timerTotalSeconds)) : 0;
    const offset = circumference - (pct * circumference);
    const ring = document.getElementById('timer-ring-fg');
    if (ring && timerTotalSeconds > 0) ring.style.strokeDashoffset = offset;
    const floatRing = document.getElementById('floating-timer-ring-fg');
    if (floatRing && timerTotalSeconds > 0) floatRing.style.strokeDashoffset = offset;
}

function resetTimer() {
    haptic('tap');
    clearInterval(timerInterval);
    timeLeft = 0; timerEndTime = 0; lastBeepSec = -1; timerTotalSeconds = 0;
    document.getElementById('timer-box').className = 'timer-idle';
    document.getElementById('timer-wrapper').classList.remove('active-timer');
    document.getElementById('timer-display').textContent = "⏱ 00:00";
    const floatBar = document.getElementById('floating-rest-bar');
    if (floatBar) floatBar.classList.remove('open', 'done');
    const floatDisp = document.getElementById('floating-timer-display');
    if (floatDisp) floatDisp.textContent = "00:00";
    const ring = document.getElementById('timer-ring-fg');
    if (ring) ring.style.strokeDashoffset = '100';
    const floatRing = document.getElementById('floating-timer-ring-fg');
    if (floatRing) floatRing.style.strokeDashoffset = '100';
}

// =========================================================
// V6.1 / V6.3 — RÉCAP DE SÉANCE (AVEC PRs & DURÉE)
// =========================================================
function showSessionRecap(workout, machineLogs, todayKey, extras = {}) {
    let totalTonnage = 0;
    let totalSets = 0;
    let bestRM = 0;
    let bestRMName = '';

    (workout.exercises || []).forEach(exo => {
        const activeIdx = Math.min(exo.activeVariantIndex || 0, exo.variants.length - 1);
        const machineName = exo.variants[activeIdx];
        const mKey = toMachineKey(machineName);
        const logs = machineLogs[mKey] || [];
        const todayLog = logs.find(l => l.dateKey === todayKey);
        if (todayLog) {
            totalTonnage += todayLog.tonnage || 0;
            totalSets += (todayLog.sets || []).length;
            if ((todayLog.best1RM || 0) > bestRM) {
                bestRM = todayLog.best1RM;
                bestRMName = machineName;
            }
        }
    });

    const newPRs = Array.isArray(extras.newPRs) ? extras.newPRs : [];
    const durationMin = extras.durationMin || 0;
    const prsEl = document.getElementById('recap-prs');
    if (prsEl) {
        prsEl.innerHTML = newPRs.map(pr =>
            `<span class="recap-pr-badge">🏆 PR ${pr.machineName.split(' ').slice(0, 2).join(' ')} : ${pr.newRM} kg</span>`
        ).join('');
    }

    const emojis = newPRs.length > 0 ? ['🏆', '🔥', '🚀'] : ['🎉', '💪', '🔥', '⚡'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    document.getElementById('recap-emoji').textContent = emoji;
    document.getElementById('recap-title').textContent = newPRs.length > 0 ? 'Nouveau record !' : 'Séance terminée !';
    document.getElementById('recap-subtitle').textContent = `${workout.shortLabel || workout.title} · ${workout.subtitle || ''}`;

    const stats = [
        { label: 'Séries validées', value: totalSets, unit: 'séries' },
        { label: 'Tonnage total', value: totalTonnage > 0 ? totalTonnage.toLocaleString('fr-FR') : '—', unit: totalTonnage > 0 ? 'kg soulevés' : '' },
        { label: 'Meilleur 1RM', value: bestRM > 0 ? bestRM.toFixed(1) : '—', unit: bestRM > 0 ? `kg (${bestRMName.split(' ').slice(0,2).join(' ')})` : '' },
        durationMin > 0
            ? { label: 'Durée séance', value: `${durationMin} min`, unit: `${workout.exercises.length} exercices` }
            : { label: 'Exercices', value: workout.exercises.length, unit: 'au programme' }
    ];

    document.getElementById('recap-stats').innerHTML = stats.map(s => `
        <div class="recap-stat-card">
            <span class="recap-stat-label">${s.label}</span>
            <span class="recap-stat-value">${s.value}</span>
            <span class="recap-stat-unit">${s.unit}</span>
        </div>
    `).join('');

    document.getElementById('recap-modal').classList.add('open');
}

function closeRecapModal() {
    document.getElementById('recap-modal').classList.remove('open');
}

// =========================================================
// V6.1 — CALCULATEUR % 1RM
// =========================================================
function calcRMPercents(exoId) {
    const rm1El = document.getElementById(`1rm_${exoId}`);
    let rm1 = parseFloat(rm1El && rm1El.dataset.rm ? rm1El.dataset.rm : 0) || 0;
    if (rm1 <= 0 && rm1El) {
        const m = rm1El.textContent.match(/(\d+(?:\.\d+)?)\s*kg/i);
        if (m) rm1 = parseFloat(m[1]) || 0;
    }
    const block = document.getElementById(`rm-calc-${exoId}`);
    if (!block) return;
    if (rm1 <= 0) {
        block.dataset.open = '0';
        block.innerHTML = '<span class="rm-calc-title">1RM — Remplis d\'abord une série</span>';
        return;
    }
    block.dataset.open = '1';
    const pcts = [90, 80, 70, 60, 50];
    block.innerHTML = `
        <span class="rm-calc-title">% du 1RM estimé (${rm1.toFixed(1)} kg)</span>
        <div class="rm-calc-grid">
            ${pcts.map(p => {
                const kgVal = (Math.round((rm1 * p / 100) * 2) / 2).toFixed(1).replace(/\.0$/, '');
                return `
                <div class="rm-calc-pill" onclick="event.stopPropagation(); prefillWeightFromRM('${exoId}', ${kgVal})">
                    <span class="rm-calc-pct">${p}%</span>
                    <span class="rm-calc-kg">${kgVal}</span>
                </div>`;
            }).join('')}
        </div>
    `;
}

function prefillWeightFromRM(exoId, kg) {
    const programs = getPrograms();
    const workout = programs[currentDayKey];
    if (!workout) return;
    const exo = workout.exercises.find(e => e.id === exoId);
    if (!exo) return;
    let filledCount = 0;
    for (let i = 0; i < exo.sets; i++) {
        const row = document.getElementById(`row_${exoId}_${i}`);
        if (row && !row.classList.contains('done')) {
            const inp = row.querySelector('.weight-input');
            if (inp) {
                inp.value = kg;
                filledCount++;
            }
        }
    }
    if (filledCount > 0) {
        const row0 = document.getElementById(`row_${exoId}_0`);
        if (row0) updateWarmup(exoId, row0.querySelector('.weight-input').value);
        updateExerciseMetrics(exoId);
        saveGymDraftState();
        showToast(`💪 ${kg} kg appliqué aux séries restantes`);
    } else {
        showToast("ℹ️ Toutes les séries sont déjà validées");
    }
}

// =========================================================
// V6.1 — INPUT MODAL (remplace prompt() natif)
// =========================================================
let _inputModalCallback = null;
let _inputModalStep = 0;
let _inputModalSteps = [];

function showInputModal(title, placeholder, confirmLabel, defaultVal, callback) {
    document.getElementById('input-modal-title').textContent = title;
    const field = document.getElementById('input-modal-field');
    field.placeholder = placeholder || '';
    field.value = defaultVal || '';
    document.getElementById('input-modal-confirm').textContent = confirmLabel || 'Confirmer';
    document.getElementById('input-modal-confirm').onclick = () => {
        const val = field.value.trim();
        closeInputModal();
        if (callback) callback(val);
    };
    document.getElementById('input-modal').classList.add('open');
    setTimeout(() => field.focus(), 150);
    _inputModalCallback = callback;
}

function closeInputModal() {
    document.getElementById('input-modal').classList.remove('open');
    _inputModalCallback = null;
}

// =========================================================
// V6.3 — CONFIRM MODAL (remplace confirm() natif)
// =========================================================
function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) {
        if (confirm(message) && onConfirm) onConfirm();
        return;
    }
    document.getElementById('confirm-modal-title').textContent = title || 'Confirmer';
    document.getElementById('confirm-modal-message').textContent = message || '';
    document.getElementById('confirm-modal-ok').onclick = () => {
        closeConfirmModal();
        if (onConfirm) onConfirm();
    };
    modal.classList.add('open');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('open');
}

// =========================================================
// V6.1 — OPENFOODFACTS AUTOCOMPLETE
// =========================================================
let _offSearchTimeout = null;
let _lastOffResults = [];

function escHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function debounceOFFSearch() {
    clearTimeout(_offSearchTimeout);
    _offSearchTimeout = setTimeout(searchOpenFoodFacts, 600);
}

async function searchOpenFoodFacts() {
    const q = (document.getElementById('off-search-input') ? document.getElementById('off-search-input').value : '').trim();
    const resultsBox = document.getElementById('off-search-results');
    if (!resultsBox) return;
    if (!q || q.length < 2) { resultsBox.innerHTML = ''; return; }
    resultsBox.innerHTML = '<p style="font-size:0.72rem; color:var(--text-muted); margin:0;">Recherche...</p>';
    try {
        // API v2 OpenFoodFacts — plus fiable que l'ancien CGI
        const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&fields=product_name,nutriments&page_size=5&json=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const products = data.products || [];
        if (products.length === 0) {
            _lastOffResults = [];
            resultsBox.innerHTML = '<p style="font-size:0.72rem; color:var(--text-muted); margin:0;">Aucun résultat</p>';
            return;
        }
        _lastOffResults = products.slice(0, 5).map(p => {
            const n = p.nutriments || {};
            return {
                name: (p.product_name || 'Aliment inconnu').substring(0, 40),
                kcal: Math.round(n['energy-kcal_100g'] || (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0)),
                prot: Math.round(n['proteins_100g'] || 0),
                carbs: Math.round(n['carbohydrates_100g'] || 0),
                fats: Math.round(n['fat_100g'] || 0)
            };
        });
        resultsBox.innerHTML = _lastOffResults.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-card); border-radius:10px; cursor:pointer; border:1px solid var(--border);" onclick="selectOFFResult(${idx})">
                <div>
                    <div style="font-size:0.78rem; font-weight:700; color:var(--text-main);">${escHTML(item.name)}</div>
                    <div style="font-size:0.68rem; color:var(--text-muted);">${item.kcal} kcal · P${item.prot}g · G${item.carbs}g · L${item.fats}g / 100g</div>
                </div>
                <span style="color:var(--accent); font-size:0.78rem; font-weight:700; white-space:nowrap; padding-left:8px;">+ Ajouter</span>
            </div>
        `).join('');
    } catch(e) {
        console.error('OpenFoodFacts error:', e);
        resultsBox.innerHTML = '<p style="font-size:0.72rem; color:var(--text-muted); margin:0;">❌ Impossible d\'atteindre OpenFoodFacts</p>';
    }
}

function selectOFFResult(idx) {
    const item = _lastOffResults[idx];
    if (item) fillFoodFromOFF(item.name, item.kcal, item.prot, item.carbs, item.fats);
}

let _offBasePer100g = null;

function fillFoodFromOFF(name, kcal, prot, carbs, fats) {
    _offBasePer100g = { kcal, prot, carbs, fats };
    const nameEl = document.getElementById('custom-food-name');
    const kcalEl = document.getElementById('custom-kcal');
    const protEl = document.getElementById('custom-prot');
    const carbsEl = document.getElementById('custom-carbs');
    const fatsEl = document.getElementById('custom-fats');
    if (nameEl) nameEl.value = name;
    if (kcalEl) kcalEl.value = kcal;
    if (protEl) protEl.value = prot;
    if (carbsEl) carbsEl.value = carbs;
    if (fatsEl) fatsEl.value = fats;

    const portionBox = document.getElementById('off-portion-box');
    const portionInput = document.getElementById('off-portion-grams');
    if (portionBox) portionBox.style.display = 'block';
    if (portionInput) portionInput.value = 100;

    const resultsBox = document.getElementById('off-search-results');
    if (resultsBox) resultsBox.innerHTML = '';
    const searchInput = document.getElementById('off-search-input');
    if (searchInput) searchInput.value = '';
    showToast('✅ Aliment importé — ajuste la portion en grammes');
}

function setOffPortion(grams) {
    const portionInput = document.getElementById('off-portion-grams');
    if (portionInput) {
        portionInput.value = grams;
        rescaleCustomFoodPortion();
    }
}

function rescaleCustomFoodPortion() {
    if (!_offBasePer100g) return;
    const portionInput = document.getElementById('off-portion-grams');
    const grams = Math.max(0, parseFloat(portionInput ? portionInput.value : 100) || 0);
    const ratio = grams / 100;
    const kcalEl = document.getElementById('custom-kcal');
    const protEl = document.getElementById('custom-prot');
    const carbsEl = document.getElementById('custom-carbs');
    const fatsEl = document.getElementById('custom-fats');
    if (kcalEl) kcalEl.value = Math.round(_offBasePer100g.kcal * ratio);
    if (protEl) protEl.value = Math.round(_offBasePer100g.prot * ratio);
    if (carbsEl) carbsEl.value = Math.round(_offBasePer100g.carbs * ratio);
    if (fatsEl) fatsEl.value = Math.round(_offBasePer100g.fats * ratio);
}

function buildFullBackupPayload() {
    return {
        version: "5.0",
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
    selectNextRecommendedWorkout();
    applyHomeLayoutOrder();
    applyNutriLayoutOrder();
    renderDaySelectorBar();
    loadWorkout(currentDayKey);
    updateAllViews();

    const sessionCount = countTotalSessions(cal || {});
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

function downloadBackupFile() {
    haptic('tap');
    const fullBackup = buildFullBackupPayload();
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-backup-${getTodayDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("💾 Fichier backup téléchargé !");
}

function triggerBackupFileImport() {
    haptic('tap');
    const input = document.getElementById('backup-file-input');
    if (input) {
        input.value = '';
        input.click();
    }
}

function handleBackupFileSelected(event) {
    const file = event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            restoreFromPayload(parsed);
        } catch (err) {
            showToast("⚠️ Fichier JSON invalide");
        }
    };
    reader.readAsText(file);
}

function importData() {
    haptic('tap');
    const modal = document.getElementById('json-import-modal');
    const area = document.getElementById('json-import-textarea');
    if (!modal || !area) return;
    area.value = '';
    modal.classList.add('open');
    setTimeout(() => area.focus(), 150);
}

function closeJsonImportModal() {
    const modal = document.getElementById('json-import-modal');
    if (modal) modal.classList.remove('open');
}

function confirmJsonImportModal() {
    const area = document.getElementById('json-import-textarea');
    const input = area ? area.value.trim() : '';
    if (!input) return showToast("⚠️ Colle un JSON valide");
    try {
        const parsed = JSON.parse(input);
        closeJsonImportModal();
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
    const isOpen = drawer.classList.toggle('open');
    const btn = document.getElementById('backup-toggle-btn');
    if (btn) btn.textContent = isOpen ? 'Fermer' : 'Ouvrir';
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
    showConfirmModal(
        "Charger depuis GitHub",
        "Remplacer les données de ce téléphone par la sauvegarde backup.json stockée sur ton GitHub ?",
        async () => {
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
    );
}