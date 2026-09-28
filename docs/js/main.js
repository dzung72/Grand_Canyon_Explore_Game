import { installGlobalErrorHandlers, showStatus } from "./core/status.js";
import { loadDatabase } from "./services/storage.js?v=4.4.0";

installGlobalErrorHandlers();

async function startGame() {
    if (!window.Phaser) {
        showStatus("Phaser was not loaded. Check your internet connection.", "error");
        return;
    }

    try {
        await document.fonts?.load('700 18px "Atkinson Hyperlegible Next"');
    } catch (error) {
        console.warn("Readable web font could not load; using the system fallback.", error);
    }

    const [{ ExpeditionScene }, { ResultsScene }] = await Promise.all([
        import("./scenes/ExpeditionScene.js?v=4.6.4"),
        import("./scenes/ResultsScene.js?v=4.6.4")
    ]);

    loadDatabase();

    const Phaser = window.Phaser;
    const config = {
        type: Phaser.AUTO,
        parent: "game-container",
        backgroundColor: "#0d1720",
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        input: { activePointers: 3, touch: { capture: true } },
        scale: {
            mode: Phaser.Scale.RESIZE,
            width: window.innerWidth,
            height: window.innerHeight,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            fullscreenTarget: "game-container"
        },
        scene: [ExpeditionScene, ResultsScene]
    };

    new Phaser.Game(config);
}

startGame().catch((error) => {
    showStatus(`Game could not start: ${error.message}`, "error");
    console.error(error);
});
