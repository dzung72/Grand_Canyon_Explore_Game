const STORAGE_KEY = "grand-canyon-drill-v1";

export let database = {
    currentPlayer: "EXPLORER",
    players: { EXPLORER: createRecord() }
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
        bestTimeMs: null
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

export function currentRecord() {
    const player = cleanPlayerName(database.currentPlayer);
    database.currentPlayer = player;
    database.players[player] ||= createRecord();
    const record = database.players[player];
    record.highScore = Math.max(Number(record.highScore) || 0, Number(record.discovered) || 0);
    record.bestRunShots ??= record.highScore > 0 ? record.shots : null;
    record.bestScore = Math.max(0, Number(record.bestScore) || 0);
    record.bestTimeMs = Number(record.bestTimeMs) > 0 ? Number(record.bestTimeMs) : null;
    return record;
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
