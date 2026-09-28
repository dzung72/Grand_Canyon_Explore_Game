import { ROCK_LAYERS } from "../data/layers.js?v=4.6.3";
import {
    database,
    storageAvailable,
    cleanPlayerName,
    createRecord,
    currentRecord,
    formatRunTime,
    leaderboard,
    saveDatabase
} from "../services/storage.js?v=4.4.0";
import { pixelButton } from "../ui/components.js?v=4.6.4";
import { LayerNotebookOverlay } from "../ui/LayerNotebookOverlay.js?v=4.6.4";
import { retroMusic } from "../services/AudioManager.js?v=4.6.1";
import { GAME_FONT } from "../core/theme.js?v=4.6.1";

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
            fontFamily: GAME_FONT,
            fontSize: this.width < 650 ? "15px" : "17px",
            fontStyle: "bold",
            color: "#101923",
            backgroundColor: "#91eadc",
            padding: { x: 8, y: 6 }
        }).setInteractive({ useHandCursor: true });
        button.on("pointerdown", async () => {
            await retroMusic.toggle();
            button.setText(`[ ${retroMusic.label()} ]`);
        });
    }

    drawBackground() {
        const g = this.add.graphics();
        const colors = [0x101923, 0x251721, 0x3b2229, 0x59312f, 0x82433a];
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
        const font = GAME_FONT;
        const title = this.runData.complete ? "MISSION COMPLETE" : "EXPEDITION REPORT";
        this.add.text(this.width / 2, 35, title, {
            fontFamily: font,
            fontSize: compact ? "30px" : "42px",
            fontStyle: "bold",
            color: "#ffd166",
            stroke: "#08131d",
            strokeThickness: 5
        }).setOrigin(0.5);

        const isDepthRecord = this.record.discovered > this.runData.previousBest;
        const isScoreRecord = (this.runData.score || 0) > (this.runData.previousBestScore || 0);
        const isTimeRecord = Boolean(this.runData.isTimeRecord);
        if (isDepthRecord || isScoreRecord || isTimeRecord) {
            const records = [];
            if (isScoreRecord) records.push("SCORE");
            if (isDepthRecord) records.push("DEPTH");
            if (isTimeRecord) records.push("TIME");
            const recordLabel = `★ NEW ${records.join(" + ")} RECORD! ★`;
            this.add.text(this.width / 2, 78, recordLabel, {
                fontFamily: font,
                fontSize: compact ? "18px" : "23px",
                fontStyle: "bold",
                color: "#66e0cf"
            }).setOrigin(0.5);
        }

        const deepest = this.record.discovered > 0
            ? ROCK_LAYERS[this.record.discovered - 1].name
            : "Surface only";
        const report = [
            `PLAYER          ${database.currentPlayer}`,
            `SCORE           ${this.runData.score || 0}  •  BEST ${this.record.bestScore || 0}`,
            `TIME            ${formatRunTime(this.runData.elapsedMs)}  •  BEST ${this.record.bestTimeMs ? formatRunTime(this.record.bestTimeMs) : "--:--.-"}`,
            `LAYERS          ${this.record.discovered}/${ROCK_LAYERS.length}`,
            `SAMPLES         ${this.runData.samplesCollected || 0}`,
            `QUIZ            ${this.runData.correctAnswers || 0} right  •  ${this.runData.wrongAnswers || 0} wrong`,
            `NEAR MISS       ${this.runData.nearMisses || 0}  •  BEST x${this.runData.bestNearMissCombo || 0}`,
            `UPGRADES        SPD ${this.runData.upgrades?.speed || 0}  MAG ${this.runData.upgrades?.magnet || 0}  PAY ${this.runData.upgrades?.earnings || 0}`,
            `DEEPEST LAYER   ${deepest}`
        ].join("\n");

        const leftX = compact ? 20 : this.width * 0.08;
        const topY = compact ? 112 : 125;
        const reportPanel = this.add.text(leftX, topY, report, {
            fontFamily: font,
            fontSize: compact ? "17px" : "21px",
            color: "#f7fbff",
            lineSpacing: compact ? 9 : 11,
            backgroundColor: "#172433dd",
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
            fontSize: compact ? "16px" : "18px",
            color: "#d9e7f2",
            lineSpacing: 6,
            wordWrap: { width: compact ? this.width - 40 : this.width * 0.47 }
            }
        );

        const boardLines = leaderboard().map((entry, index) =>
            `${index + 1}. ${entry.name.padEnd(12, " ")} ` +
            `${String(entry.score).padStart(4, "0")} pts  ` +
            `${String(entry.depth).padStart(2, "0")}/${ROCK_LAYERS.length}  ` +
            `${entry.bestTimeMs ? formatRunTime(entry.bestTimeMs) : "--:--.-"}`
        );
        const boardX = compact ? 20 : this.width * 0.59;
        const boardY = compact
            ? Math.min(this.height - 270, discoveryPanel.y + discoveryPanel.height + 18)
            : 130;
        this.add.text(boardX, boardY, `LOCAL EXPLORERS\n${boardLines.join("\n")}`, {
            fontFamily: font,
            fontSize: compact ? "16px" : "19px",
            color: "#f7fbff",
            lineSpacing: 8,
            backgroundColor: "#162838f2",
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
            launchButton.setFontSize(16);
            playerButton.setFontSize(16);
            resetButton.setFontSize(16);
            notesButton.setFontSize(16);
        }

        this.add.text(
            this.width - 12,
            this.height - 14,
            storageAvailable ? "LOCAL SAVE ON" : "LOCAL SAVE OFF",
            {
                fontFamily: font,
                fontSize: "16px",
                color: storageAvailable ? "#66e0cf" : "#ff9f85"
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
            bestTimeMs: oldRecord.bestTimeMs,
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
