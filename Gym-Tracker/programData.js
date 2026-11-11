// programData.js — Base de données statique de ton programme PPL + UL

const PROGRAM_DATA = {
    push: {
        title: "JOUR 1 : PUSH",
        subtitle: "Pecs, Épaules, Triceps",
        exercises: [
            {
                id: "push_1",
                name: "Développé incliné 30° haltères",
                alt: "Incliné barre / Smith machine",
                sets: 4,
                repsMin: 6,
                repsMax: 8,
                rir: "1-2",
                rest: 150, // en secondes (2m30)
                hasWarmupRamp: true
            },
            {
                id: "push_2",
                name: "Dips lestés",
                alt: "Presse à pecs déclinée / Pompes déficit",
                sets: 4,
                repsMin: 8,
                repsMax: 10,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: false
            },
            {
                id: "push_3",
                name: "Écartés poulie hauteur d'épaule",
                alt: "Pec Deck machine",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "push_4",
                name: "Développé militaire haltères",
                alt: "Machine Shoulder Press",
                sets: 3,
                repsMin: 8,
                repsMax: 10,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: false
            },
            {
                id: "push_5",
                name: "Élévations latérales poulie basse",
                alt: "Haltères / Machine latérale",
                sets: 4,
                repsMin: 12,
                repsMax: 15,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "push_6",
                name: "Extensions triceps poulie haute",
                alt: "Barre au front EZ",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            }
        ]
    },
    pull: {
        title: "JOUR 2 : PULL",
        subtitle: "Dos, Arrière d'épaule, Biceps, Lombaires",
        exercises: [
            {
                id: "pull_1",
                name: "Tractions pronation lestées",
                alt: "Tirage vertical poitrine prise large",
                sets: 4,
                repsMin: 6,
                repsMax: 8,
                rir: "1-2",
                rest: 150,
                hasWarmupRamp: true
            },
            {
                id: "pull_2",
                name: "Rowing haltère bûcheron",
                alt: "Rowing barre supination / T-Bar",
                sets: 4,
                repsMin: 8,
                repsMax: 10,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: false
            },
            {
                id: "pull_3",
                name: "Tirage horizontal poulie prise large",
                alt: "Machine Rowing assis",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "pull_4",
                name: "Face-pull poulie",
                alt: "Oiseau machine / Haltères",
                sets: 3,
                repsMin: 15,
                repsMax: 15,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "pull_5",
                name: "Barbell Curl barre EZ",
                alt: "Curl poulie basse barre",
                sets: 4,
                repsMin: 8,
                repsMax: 12,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "pull_6",
                name: "Banc à lombaires lesté",
                alt: "Good morning léger",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "1",
                rest: 90,
                hasWarmupRamp: false
            }
        ]
    },
    legs: {
        title: "JOUR 3 : LEGS",
        subtitle: "Cuisses, Ischios, Mollets, Abdos",
        exercises: [
            {
                id: "legs_1",
                name: "Presse à cuisses 45°",
                alt: "Hack Squat / Pendulum Squat",
                sets: 4,
                repsMin: 6,
                repsMax: 8,
                rir: "1-2",
                rest: 150,
                hasWarmupRamp: true
            },
            {
                id: "legs_2",
                name: "Soulevé de terre roumain (RDL)",
                alt: "Hip Thrust lourd",
                sets: 3,
                repsMin: 8,
                repsMax: 10,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: false
            },
            {
                id: "legs_3",
                name: "Leg extension machine",
                alt: "Sissy Squat / Goblet Squat",
                sets: 3,
                repsMin: 12,
                repsMax: 15,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "legs_4",
                name: "Leg curl assis ou allongé",
                alt: "Swiss Ball Curl",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "legs_5",
                name: "Mollets debout machine",
                alt: "Mollets à la presse",
                sets: 4,
                repsMin: 12,
                repsMax: 15,
                rir: "0",
                rest: 60,
                hasWarmupRamp: false
            },
            {
                id: "legs_6",
                name: "Relevés de jambes suspendu",
                alt: "Crunch poulie haute",
                sets: 4,
                repsMin: 12,
                repsMax: 15,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            }
        ]
    },
    upper: {
        title: "JOUR 4 : UPPER V-TAPER",
        subtitle: "Rappel Haut & Prépa Calisthénie",
        exercises: [
            {
                id: "up_1",
                name: "Développé couché 0° haltères",
                alt: "Développé barre / Machine convergente",
                sets: 4,
                repsMin: 6,
                repsMax: 8,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: true
            },
            {
                id: "up_2",
                name: "Tractions prise neutre lestées",
                alt: "Tirage vertical prise serrée",
                sets: 4,
                repsMin: 8,
                repsMax: 10,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: false
            },
            {
                id: "up_3",
                name: "Pike Push-ups pieds surélevés",
                alt: "Développé militaire machine",
                sets: 3,
                repsMin: 8,
                repsMax: 10,
                rir: "1-2",
                rest: 120,
                hasWarmupRamp: false
            },
            {
                id: "up_4",
                name: "Élévations latérales haltères",
                alt: "Poulie basse / Machine",
                sets: 4,
                repsMin: 12,
                repsMax: 15,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "up_5",
                name: "Superset : Curl incliné + Pushdown corde",
                alt: "Curl poulie + Barre V",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            }
        ]
    },
    lower: {
        title: "JOUR 5 : LOWER EXPRESS",
        subtitle: "Unilatéral & Gainage Calisthénie",
        exercises: [
            {
                id: "low_1",
                name: "Fentes bulgares haltères",
                alt: "Presse unilatérale",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "1",
                rest: 120,
                hasWarmupRamp: true
            },
            {
                id: "low_2",
                name: "Leg curl assis ou allongé",
                alt: "RDL unilatéral haltère",
                sets: 3,
                repsMin: 10,
                repsMax: 12,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "low_3",
                name: "Superset Adducteurs + Abducteurs",
                alt: "Cossack Squat",
                sets: 3,
                repsMin: 12,
                repsMax: 15,
                rir: "0-1",
                rest: 90,
                hasWarmupRamp: false
            },
            {
                id: "low_4",
                name: "Mollets assis machine",
                alt: "Mollets presse",
                sets: 4,
                repsMin: 12,
                repsMax: 15,
                rir: "0",
                rest: 60,
                hasWarmupRamp: false
            },
            {
                id: "low_5",
                name: "Superset : L-Sit + Hollow Body Hold",
                alt: "L-Sit au sol",
                sets: 3,
                repsMin: 20,
                repsMax: 45,
                rir: "Max sec",
                rest: 90,
                hasWarmupRamp: false
            }
        ]
    }
};