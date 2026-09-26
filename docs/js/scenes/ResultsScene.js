import { ROCK_LAYERS } from "../data/layers.js?v=4.1.1";
import {
    database,
    storageAvailable,
    cleanPlayerName,
    createRecord,
    currentRecord,
    leaderboard,
    saveDatabase
} from "../services/storage.js?v=4.1.1";
import { pixelButton } from "../ui/components.js";
import { LayerNotebookOverlay } from "../ui/LayerNotebookOverlay.js";
import { retroMusic } from "../services/AudioManager.js?v=4.1.2";

const Phaser = window.Phaser;

export class ResultsScene extends Phaser.Scene {
    constructor() {
        super("ResultsScene");
    }

    init(data) {
        this.runData = data;
    }

    create() {
        this.record = currentRecord();
        this.width = Math.max(320, this.scale.width);
        this.height = Math.max(420, this.scale.height);
        this.drawBackground();
        this.drawReport();
        this.drawMusicButton();
        this.notebook = new LayerNotebookOverlay(this, () => currentRecord().discovered);
        this.scale.on("resize", this.handleResize, this);
        this.events.once("shutdown", () => this.scale.off("resize", this.handleResize, this));
    }

    drawMusicButton() {
        const button = this.add.text(14, 14, `[ ${retroMusic.label()} ]`, {
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: this.width < 650 ? "10px" : "12px",
            fontStyle: "bold",
            color: "#17121b",
            backgroundColor: "#8ff2dc",
            padding: { x: 8, y: 6 }
        }).setInteractive({ useHandCursor: true });
        button.on("pointerdown", async () => {
            await retroMusic.toggle();
            button.setText(`[ ${retroMusic.label()} ]`);
        });
    }

    drawBackground() {
        const g = this.add.graphics();
        const colors = [0x17121b, 0x251721, 0x3b2229, 0x59312f, 0x82433a];
        const band = Math.ceil(this.height / colors.length);
        colors.forEach((color, index) => {
            g.fillStyle(color, 1).fillRect(0, index * band, this.width, band + 1);
        });
        g.fillStyle(0xffa044, 0.18);
        for (let x = 0; x < this.width; x += 34) {
            g.fillRect(x, this.height * 0.78 + (x % 68), 16, 5);
        }
    }

    drawReport() {
        const compact = this.width < 720;
        const font = "Arial, Helvetica, sans-serif";
        const title = this.runData.complete ? "MISSION COMPLETE" : "EXPEDITION REPORT";
        this.add.text(this.width / 2, 35, title, {
            fontFamily: font,
            fontSize: compact ? "24px" : "34px",
            fontStyle: "bold",
            color: "#ffd166",
            stroke: "#241923",
            strokeThickness: 5
        }).setOrigin(0.5);

        const isDepthRecord = this.record.discovered > this.runData.previousBest;
        const isScoreRecord = (this.runData.score || 0) > (this.runData.previousBestScore || 0);
        if (isDepthRecord || isScoreRecord) {
            const recordLabel = isDepthRecord && isScoreRecord
                ? "★ NEW SCORE + DEPTH RECORD! ★"
                : isScoreRecord
                    ? "★ NEW SCORE RECORD! ★"
                    : "★ NEW DEPTH RECORD! ★";
            this.add.text(this.width / 2, 78, recordLabel, {
                fontFamily: font,
                fontSize: compact ? "14px" : "19px",
                fontStyle: "bold",
                color: "#45d6c4"
            }).setOrigin(0.5);
        }

        const deepest = this.record.discovered > 0
            ? ROCK_LAYERS[this.record.discovered - 1].name
            : "Surface only";
        const report = [
            `PLAYER          ${database.currentPlayer}`,
            `LAUNCH POWER    ${this.runData.launchPower}%`,
            `ACCURACY        ${this.runData.accuracy}%`,
            `SCORE           ${this.runData.score || 0}`,
            `BEST SCORE      ${this.record.bestScore || 0}`,
            `CREDITS LEFT    ${this.runData.credits || 0}`,
            `ROCK CHECKS     ${this.runData.collisions || 0}`,
            `QUIZ            ${this.runData.correctAnswers || 0} right / ${this.runData.wrongAnswers || 0} wrong`,
            `CLUES FOUND     ${this.runData.samplesCollected || 0}`,
            `UPGRADES        S${this.runData.upgrades?.speed || 0} M${this.runData.upgrades?.magnet || 0} E${this.runData.upgrades?.earnings || 0}`,
            `NEW LAYERS      ${this.runData.newLayers.length}`,
            `TOTAL PROGRESS  ${this.record.discovered}/${ROCK_LAYERS.length}`,
            `DEEPEST LAYER   ${deepest}`
        ].join("\n");

        const leftX = compact ? 20 : this.width * 0.08;
        const topY = compact ? 112 : 125;
        const reportPanel = this.add.text(leftX, topY, report, {
            fontFamily: font,
            fontSize: compact ? "13px" : "17px",
            color: "#fff1c1",
            lineSpacing: compact ? 6 : 8,
            backgroundColor: "#211720dd",
            padding: { x: 14, y: 12 }
        });

        const displayedLayers = compact
            ? this.runData.newLayers.slice(0, 3)
            : this.runData.newLayers;
        const discoveredText = this.runData.newLayers.length
            ? displayedLayers
                .map((index) => `+ ${ROCK_LAYERS[index].name} (${ROCK_LAYERS[index].ma} Ma)`)
                .join("\n")
                + (compact && this.runData.newLayers.length > displayedLayers.length
                    ? `\n+ ${this.runData.newLayers.length - displayedLayers.length} more newly catalogued layers`
                    : "")
            : this.runData.complete
                ? "Survey complete — all ten layers were re-examined."
                : "No new layer reached in this run.";
        const discoveryPanel = this.add.text(
            leftX,
            reportPanel.y + reportPanel.height + 16,
            `NEW DISCOVERIES\n${discoveredText}`,
            {
            fontFamily: font,
            fontSize: compact ? "11px" : "14px",
            color: "#ffd7a6",
            lineSpacing: 6,
            wordWrap: { width: compact ? this.width - 40 : this.width * 0.47 }
            }
        );

        const boardLines = leaderboard().map((entry, index) =>
            `${index + 1}. ${entry.name.padEnd(12, " ")} ` +
            `${String(entry.score).padStart(4, "0")} pts  ` +
            `${String(entry.depth).padStart(2, "0")}/${ROCK_LAYERS.length}`
        );
        const boardX = compact ? 20 : this.width * 0.59;
        const boardY = compact
            ? Math.min(this.height - 270, discoveryPanel.y + discoveryPanel.height + 18)
            : 130;
        this.add.text(boardX, boardY, `LOCAL EXPLORERS\n${boardLines.join("\n")}`, {
            fontFamily: font,
            fontSize: compact ? "11px" : "15px",
            color: "#fff1c1",
            lineSpacing: 8,
            backgroundColor: "#3b2525dd",
            padding: { x: 14, y: 12 }
        });

        const buttonY = this.height - 58;
        const launchButton = pixelButton(
            this,
            this.runData.complete ? "PLAY AGAIN" : "LAUNCH AGAIN",
            () => this.startFreshExpedition()
        ).setPosition(compact ? this.width / 2 : this.width * 0.16, buttonY);

        const playerButton = pixelButton(this, "CHANGE PLAYER", () => this.changePlayer())
            .setPosition(compact ? this.width / 2 : this.width * 0.39, compact ? buttonY - 55 : buttonY);
        const resetButton = pixelButton(this, "RESET MISSION", () => this.resetMission())
            .setPosition(compact ? this.width / 2 : this.width * 0.63, compact ? buttonY - 110 : buttonY);
        const notesButton = pixelButton(this, "FIELD NOTES", () => this.notebook?.open())
            .setPosition(compact ? this.width / 2 : this.width * 0.86, compact ? buttonY - 165 : buttonY);
        if (compact) {
            launchButton.setFontSize(14);
            playerButton.setFontSize(14);
            resetButton.setFontSize(14);
            notesButton.setFontSize(14);
        }

        this.add.text(
            this.width - 12,
            this.height - 14,
            storageAvailable ? "LOCAL SAVE ON" : "LOCAL SAVE OFF",
            {
                fontFamily: font,
                fontSize: "10px",
                color: storageAvailable ? "#45d6c4" : "#ff8a66"
            }
        ).setOrigin(1, 1);
    }

    changePlayer() {
        const entered = window.prompt(
            "Explorer name (up to 12 characters):",
            database.currentPlayer
        );
        if (entered === null) return;
        database.currentPlayer = cleanPlayerName(entered);
        currentRecord();
        saveDatabase();
        this.startFreshExpedition();
    }

    resetMission() {
        if (!window.confirm(`Reset ${database.currentPlayer}'s mission progress?`)) return;
        const oldRecord = currentRecord();
        database.players[database.currentPlayer] = {
            ...createRecord(),
            highScore: oldRecord.highScore,
            bestRunShots: oldRecord.bestRunShots,
            bestScore: oldRecord.bestScore,
            bestPower: oldRecord.bestPower,
            bestAccuracy: oldRecord.bestAccuracy
        };
        saveDatabase();
        this.startFreshExpedition();
    }

    startFreshExpedition() {
        this.scene.start("ExpeditionScene");
    }

    handleResize() {
        this.scene.restart(this.runData);
    }
}
