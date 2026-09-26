import { ROCK_LAYERS } from "../data/layers.js";
import { currentRecord, saveDatabase } from "../services/storage.js";
import { makeDrill } from "../ui/components.js";
import { showStatus } from "../core/status.js";

const Phaser = window.Phaser;

export class DrillScene extends Phaser.Scene {
    constructor() {
        super("DrillScene");
    }

    init(data) {
        this.runData = data;
    }

    create() {
        this.record = currentRecord();
        this.previousBest = this.runData.previousBest;
        this.newLayers = [];
        this.currentLayer = -1;
        this.drillState = "drilling";
        this.lastParticleAt = 0;
        this.viewWidth = Math.max(320, this.scale.width);
        this.viewHeight = Math.max(420, this.scale.height);
        this.layerHeight = Phaser.Math.Clamp(this.viewHeight * 0.34, 170, 300);
        this.layerStartY = 110;
        this.worldHeight = this.layerStartY + this.layerHeight * ROCK_LAYERS.length + this.viewHeight * 0.45;

        this.energyMax = Math.round(
            (34 + this.runData.launchPower * 0.82) *
            (0.72 + this.runData.accuracy / 100 * 0.28)
        );
        this.energy = this.energyMax;

        this.drawUnderground();
        const parts = makeDrill(this, 0.92);
        this.drill = parts.container
            .setPosition(this.viewWidth / 2, this.layerStartY - 35)
            .setDepth(8);
        this.drawDrillBit = parts.drawBit;
        this.createDrillHud();
        this.cameras.main.setBounds(0, 0, this.viewWidth, this.worldHeight);
        this.cameras.main.fadeIn(260, 18, 12, 18);
        this.enterLayer(0);

        this.scale.on("resize", this.handleResize, this);
        this.events.once("shutdown", () => this.scale.off("resize", this.handleResize, this));
    }

    drawUnderground() {
        this.cameras.main.setBackgroundColor("#17121b");
        this.layerOverlays = [];
        this.layerLabels = [];
        const g = this.add.graphics();
        g.fillStyle(0x1f171e, 1).fillRect(0, 0, this.viewWidth, this.layerStartY);
        g.fillStyle(0xf0b45f, 1).fillRect(0, this.layerStartY - 8, this.viewWidth, 8);

        ROCK_LAYERS.forEach((layer, index) => {
            const y = this.layerStartY + index * this.layerHeight;
            g.fillStyle(layer.color, 1).fillRect(0, y, this.viewWidth, this.layerHeight + 1);
            g.fillStyle(0x1d151c, 0.35).fillRect(0, y, this.viewWidth, 4);
            const spacing = Math.max(42, Math.round(this.viewWidth / 18));
            for (let x = (index * 31) % spacing; x < this.viewWidth; x += spacing) {
                g.fillStyle(0x241923, 0.3);
                if (index % 3 === 0) {
                    g.fillRect(x, y + this.layerHeight * 0.35, spacing * 0.3, 4);
                } else if (index % 3 === 1) {
                    g.fillRect(x, y + this.layerHeight * 0.2, 5, this.layerHeight * 0.22);
                } else {
                    g.fillRect(x, y + this.layerHeight * 0.62, 7, 7);
                }
            }

            const overlay = this.add.rectangle(
                this.viewWidth / 2,
                y + this.layerHeight / 2,
                this.viewWidth,
                this.layerHeight,
                0x100c12,
                index < this.previousBest ? 0.12 : 0.72
            ).setDepth(2);
            const label = this.add.text(
                18,
                y + 18,
                index < this.previousBest
                    ? `${index + 1}. ${layer.name}\n${layer.age} • ${layer.ma} Ma`
                    : "",
                {
                    fontFamily: "Courier New, monospace",
                    fontSize: this.viewWidth < 650 ? "13px" : "17px",
                    fontStyle: "bold",
                    color: "#fff1c1",
                    lineSpacing: 4,
                    shadow: { offsetX: 2, offsetY: 2, color: "#241923", blur: 0, fill: true }
                }
            ).setDepth(3);
            this.layerOverlays.push(overlay);
            this.layerLabels.push(label);
        });
    }

    createDrillHud() {
        const font = "Courier New, monospace";
        this.hudShade = this.add.rectangle(0, 0, this.viewWidth, 78, 0x17121b, 0.9)
            .setOrigin(0).setScrollFactor(0).setDepth(30);
        this.hudText = this.add.text(16, 12, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "13px" : "16px",
            fontStyle: "bold",
            color: "#fff1c1"
        }).setScrollFactor(0).setDepth(31);
        this.energyGraphics = this.add.graphics().setScrollFactor(0).setDepth(31);
        this.noteText = this.add.text(
            16,
            this.viewHeight - 24,
            "REPRESENTATIVE UNITS • GAPS + THICKNESS SIMPLIFIED • RESISTANCE IS NOT MOHS HARDNESS",
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "9px" : "11px",
                color: "#e8bd91"
            }
        ).setScrollFactor(0).setDepth(31);

        this.cardBack = this.add.rectangle(0, 0, 350, 132, 0x291b22, 0.96)
            .setOrigin(1, 0).setScrollFactor(0).setDepth(32)
            .setStrokeStyle(3, 0xffa044).setAlpha(0);
        this.cardTitle = this.add.text(0, 0, "", {
            fontFamily: font, fontSize: "14px", fontStyle: "bold", color: "#ffd166"
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(33).setAlpha(0);
        this.cardInfo = this.add.text(0, 0, "", {
            fontFamily: font,
            fontSize: "14px",
            fontStyle: "bold",
            color: "#fff1c1",
            align: "right",
            lineSpacing: 4
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(33).setAlpha(0);
        this.layoutDrillHud();
    }

    layoutDrillHud() {
        const cardWidth = Math.min(350, this.viewWidth - 30);
        this.hudShade.setSize(this.viewWidth, 78);
        this.noteText.setPosition(16, this.viewHeight - 24);
        this.cardBack.setSize(cardWidth, 132).setPosition(this.viewWidth - 15, 92);
        this.cardTitle.setPosition(this.viewWidth - 31, 104);
        this.cardInfo.setPosition(this.viewWidth - 31, 132);
    }

    enterLayer(index) {
        if (index < 0 || index >= ROCK_LAYERS.length || index === this.currentLayer) return;
        this.currentLayer = index;
        const layer = ROCK_LAYERS[index];
        const isNew = index >= this.previousBest;
        this.layerLabels[index].setText(
            `${index + 1}. ${layer.name}\n${layer.age} • ${layer.ma} Ma`
        );
        this.tweens.add({ targets: this.layerOverlays[index], alpha: 0.12, duration: 380 });

        if (isNew && !this.newLayers.includes(index)) {
            this.newLayers.push(index);
            this.record.discovered = Math.max(this.record.discovered, index + 1);
            if (this.record.discovered > this.record.highScore) {
                this.record.highScore = this.record.discovered;
                this.record.bestRunShots = this.record.shots;
            }
            saveDatabase();
            this.cameras.main.shake(100, 0.0035);
            this.showDiscoveryCard(index);
        }
    }

    showDiscoveryCard(index) {
        const layer = ROCK_LAYERS[index];
        this.cardTitle.setText(
            `NEW DEPTH RECORD ${String(index + 1).padStart(2, "0")}/${ROCK_LAYERS.length}`
        );
        const groupLine = layer.group === "—" ? "" : `${layer.group}\n`;
        this.cardInfo.setText(
            `${layer.name}\n${groupLine}${layer.age} • ${layer.ma} Ma\n` +
            `Game resistance ${layer.resistance}/30`
        );
        [this.cardBack, this.cardTitle, this.cardInfo].forEach((item) => item.setAlpha(0));
        this.tweens.add({
            targets: [this.cardBack, this.cardTitle, this.cardInfo],
            alpha: 1,
            duration: 180,
            hold: 1100,
            yoyo: true
        });
    }

    drawEnergyBar() {
        const width = Math.min(300, this.viewWidth * 0.42);
        const x = this.viewWidth - width - 18;
        const y = 18;
        const ratio = Phaser.Math.Clamp(this.energy / this.energyMax, 0, 1);
        const color = ratio > 0.55 ? 0x45d6c4 : ratio > 0.25 ? 0xffa044 : 0xff5d43;
        this.energyGraphics.clear().fillStyle(0x0e0a10, 1).fillRect(x, y, width, 19);
        this.energyGraphics.fillStyle(0xfff1c1, 1).fillRect(x + 3, y + 3, width - 6, 13);
        this.energyGraphics.fillStyle(color, 1).fillRect(x + 3, y + 3, (width - 6) * ratio, 13);
    }

    spawnDrillParticles(time) {
        if (time - this.lastParticleAt < 62) return;
        this.lastParticleAt = time;
        const layer = ROCK_LAYERS[Math.max(0, this.currentLayer)];
        for (let count = 0; count < 3; count += 1) {
            const spark = this.add.rectangle(
                this.drill.x + Phaser.Math.Between(-7, 7),
                this.drill.y + 38,
                Phaser.Math.Between(3, 6),
                Phaser.Math.Between(3, 6),
                count === 0 ? 0xffe890 : layer.color
            ).setDepth(7);
            this.tweens.add({
                targets: spark,
                x: spark.x + Phaser.Math.Between(-55, 55),
                y: spark.y + Phaser.Math.Between(-12, 45),
                alpha: 0,
                angle: Phaser.Math.Between(-160, 160),
                duration: Phaser.Math.Between(220, 430),
                onComplete: () => spark.destroy()
            });
        }
    }

    update(time, delta) {
        if (this.drillState !== "drilling") return;
        const dt = Math.min(delta / 1000, 0.034);
        const index = Phaser.Math.Clamp(
            Math.floor((this.drill.y - this.layerStartY) / this.layerHeight),
            0,
            ROCK_LAYERS.length - 1
        );
        this.enterLayer(index);
        const layer = ROCK_LAYERS[index];
        const oldLayer = index < this.previousBest;
        const passFactor = oldLayer ? (this.runData.usesShaft ? 0.18 : 0.62) : 1;
        const speed = 145 + Math.max(0, this.energy) * 2.4;
        const distance = speed * dt;
        this.energy -= layer.resistance * passFactor * (distance / this.layerHeight);
        this.drill.y += distance;
        this.drill.x = this.viewWidth / 2 + Math.sin(time / 95) * (2 + layer.resistance / 12);
        this.drawDrillBit(Math.floor(time / 70) % 2 === 0);
        this.spawnDrillParticles(time);
        this.cameras.main.scrollY = Phaser.Math.Clamp(
            this.drill.y - this.viewHeight * 0.38,
            0,
            this.worldHeight - this.viewHeight
        );
        this.hudText.setText(
            `DEPTH ${String(this.record.discovered).padStart(2, "0")}/${ROCK_LAYERS.length}  •  ${layer.name}\n` +
            `POWER ${this.runData.launchPower}%  •  ACCURACY ${this.runData.accuracy}%`
        );
        this.drawEnergyBar();

        const bottom = this.layerStartY + this.layerHeight * ROCK_LAYERS.length - 25;
        if (this.drill.y >= bottom) {
            this.record.discovered = ROCK_LAYERS.length;
            this.record.highScore = ROCK_LAYERS.length;
            this.record.bestRunShots = this.record.bestRunShots === null
                ? this.record.shots
                : Math.min(this.record.bestRunShots, this.record.shots);
            saveDatabase();
            this.finishRun(true);
        } else if (this.energy <= 0) {
            this.finishRun(false);
        }
    }

    finishRun(complete) {
        if (this.drillState !== "drilling") return;
        this.drillState = "stopped";
        this.energy = Math.max(0, this.energy);
        this.cameras.main.shake(160, 0.005);
        const message = complete ? "CORE MISSION COMPLETE!" : "DRILL ENERGY DEPLETED";
        const stopText = this.add.text(this.viewWidth / 2, this.viewHeight * 0.48, message, {
            fontFamily: "Courier New, monospace",
            fontSize: this.viewWidth < 650 ? "18px" : "25px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#211720ee",
            padding: { x: 16, y: 12 },
            stroke: "#ff8a3d",
            strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40);
        stopText.setAlpha(0);
        this.tweens.add({ targets: stopText, alpha: 1, duration: 180 });
        this.time.delayedCall(1050, () => this.scene.start("ResultsScene", {
            launchPower: this.runData.launchPower,
            accuracy: this.runData.accuracy,
            usedShaft: this.runData.usesShaft,
            previousBest: this.previousBest,
            newLayers: this.newLayers,
            complete
        }));
    }

    handleResize() {
        showStatus("Screen changed size. Returning safely to the launch screen.", "error");
        this.scene.start("LaunchScene");
        this.time.delayedCall(700, () => showStatus("Ready", "success"));
    }
}
