const STORAGE_KEY = "grand-canyon-drill-v1";

export let database = {
    currentPlayer: "EXPLORER",
    players: { EXPLORER: createRecord() },
    tutorialSeen: false,
    hintsSeen: {}
};

export let storageAvailable = true;

export function cleanPlayerName(name) {
    const cleaned = String(name || "EXPLORER")
        .toUpperCase()
        .replace(/[^A-Z0-9 _-]/g, "")
        .trim()
        .slice(0, 12);
    return cleaned || "EXPLORER";
}

export function createRecord() {
    return {
        discovered: 0,
        shots: 0,
        bestPower: 0,
        bestAccuracy: 0,
        holeX: null,
        // `highScore` is kept as the historical depth record for old save files.
        highScore: 0,
        bestRunShots: null,
        bestScore: 0,
        bestTimeMs: null,
        // Sao từng tầng và bộ sưu tập mẫu vật sống qua mọi lượt chơi.
        layerStars: {},
        collection: {}
    };
}

export function loadDatabase() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return database;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.players) {
            throw new Error("Invalid save data");
        }
        parsed.currentPlayer = cleanPlayerName(parsed.currentPlayer);
        parsed.players[parsed.currentPlayer] ||= createRecord();
        parsed.tutorialSeen = Boolean(parsed.tutorialSeen);
        parsed.hintsSeen = parsed.hintsSeen && typeof parsed.hintsSeen === "object"
            ? parsed.hintsSeen
            : {};
        database = parsed;
    } catch (error) {
        storageAvailable = false;
        console.warn("Local progress is unavailable; using temporary memory.", error);
    }
    return database;
}

export function saveDatabase() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
        storageAvailable = true;
    } catch (error) {
        storageAvailable = false;
        console.warn("Could not save local progress.", error);
    }
}

// The card tutorial runs once. After that the start menu offers it on request.
export function hasSeenTutorial() {
    return Boolean(database.tutorialSeen);
}

export function markTutorialSeen() {
    if (database.tutorialSeen) return;
    database.tutorialSeen = true;
    saveDatabase();
}

// In-play hints (boost, near miss) appear the first time the player meets them
// and then stay gone for good.
export function hasSeenHint(name) {
    return Boolean(database.hintsSeen?.[name]);
}

export function markHintSeen(name) {
    database.hintsSeen ||= {};
    if (database.hintsSeen[name]) return;
    database.hintsSeen[name] = true;
    saveDatabase();
}

export function currentRecord() {
    const player = cleanPlayerName(database.currentPlayer);
    database.currentPlayer = player;
    database.players[player] ||= createRecord();
    const record = database.players[player];
    record.highScore = Math.max(Number(record.highScore) || 0, Number(record.discovered) || 0);
    record.bestRunShots ??= record.highScore > 0 ? record.shots : null;
    record.bestScore = Math.max(0, Number(record.bestScore) || 0);
    record.bestTimeMs = Number(record.bestTimeMs) > 0 ? Number(record.bestTimeMs) : null;
    if (!record.layerStars || typeof record.layerStars !== "object") record.layerStars = {};
    if (!record.collection || typeof record.collection !== "object") record.collection = {};
    return record;
}

// Sao cao nhất từng đạt ở mỗi tầng được giữ lại, không bị lượt chơi kém ghi đè.
export function recordLayerStars(layerIndex, stars) {
    const record = currentRecord();
    const best = Math.max(Number(record.layerStars[layerIndex]) || 0, stars);
    if (best === record.layerStars[layerIndex]) return best;
    record.layerStars[layerIndex] = best;
    saveDatabase();
    return best;
}

export function layerStars(layerIndex) {
    return Number(currentRecord().layerStars[layerIndex]) || 0;
}

export function totalStars() {
    return Object.values(currentRecord().layerStars)
        .reduce((sum, value) => sum + (Number(value) || 0), 0);
}

// Bộ sưu tập mẫu vật: 10 tầng × 5 mẫu, nhớ mãi qua các lượt chơi.
export function markSampleFound(layerIndex, clueIndex) {
    const record = currentRecord();
    const key = `${layerIndex}-${clueIndex}`;
    if (record.collection[key]) return false;
    record.collection[key] = true;
    saveDatabase();
    return true;
}

export function hasSampleFound(layerIndex, clueIndex) {
    return Boolean(currentRecord().collection[`${layerIndex}-${clueIndex}`]);
}

export function collectionCount() {
    return Object.keys(currentRecord().collection).length;
}

export function formatRunTime(milliseconds = 0) {
    const totalTenths = Math.max(0, Math.floor((Number(milliseconds) || 0) / 100));
    const minutes = Math.floor(totalTenths / 600);
    const seconds = Math.floor((totalTenths % 600) / 10);
    const tenths = totalTenths % 10;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export function leaderboard() {
    return Object.entries(database.players)
        .map(([name, record]) => ({
            name,
            ...record,
            score: Math.max(0, Number(record.bestScore) || 0),
            depth: Math.max(Number(record.highScore) || 0, Number(record.discovered) || 0),
            scoreShots: Number(record.bestRunShots) || Number(record.shots) || 0,
            bestTimeMs: Number(record.bestTimeMs) > 0 ? Number(record.bestTimeMs) : null
        }))
        .sort((a, b) =>
            b.score - a.score ||
            b.depth - a.depth ||
            a.scoreShots - b.scoreShots ||
            (Number(b.bestAccuracy) || 0) - (Number(a.bestAccuracy) || 0) ||
            (a.bestTimeMs || Number.POSITIVE_INFINITY) -
                (b.bestTimeMs || Number.POSITIVE_INFINITY)
        )
        .slice(0, 5);
}
