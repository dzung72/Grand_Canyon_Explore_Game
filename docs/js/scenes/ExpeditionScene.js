import { ROCK_LAYERS, getLayerEvidence, getLayerQuiz } from "../data/layers.js?v=4.2.1";
import { database, currentRecord, formatRunTime, saveDatabase } from "../services/storage.js?v=4.4.0";
import { makeDrill } from "../ui/components.js";
import { showStatus } from "../core/status.js";
import { ExpeditionWorld } from "../world/ExpeditionWorld.js";
import { ImpactEffects } from "../effects/ImpactEffects.js?v=4.4.0";
import { EvidenceCourse } from "../gameplay/EvidenceCourse.js?v=4.5.2";
import { getLayerChallenge } from "../gameplay/layerChallenges.js?v=4.4.6";
import { LayerNotebookOverlay } from "../ui/LayerNotebookOverlay.js";
import { LayerBriefingOverlay } from "../ui/LayerBriefingOverlay.js?v=4.2.0";
import { QuizOverlay } from "../ui/QuizOverlay.js?v=4.1.1";
import { UpgradeOverlay } from "../ui/UpgradeOverlay.js?v=4.4.7";
import { HowToPlayOverlay } from "../ui/HowToPlayOverlay.js?v=4.6.0";
import { retroMusic } from "../services/AudioManager.js?v=4.5.0";

const Phaser = window.Phaser;

export class ExpeditionScene extends Phaser.Scene {
    constructor() {
        super("ExpeditionScene");
    }

    create() {
        this.record = currentRecord();
        this.previousBest = this.record.discovered;
        this.previousBestScore = this.record.bestScore;
        this.previousBestTimeMs = this.record.bestTimeMs;
        this.newLayers = [];
        this.collisions = 0;
        this.currentLayer = -1;
        this.roundState = "ready";
        this.dragPointerId = null;
        this.power = 0;
        this.gravity = 1040;
        this.velocity = new Phaser.Math.Vector2();
        this.lastFallStreakAt = 0;
        this.lastDrillParticleAt = 0;
        this.collisionCooldownUntil = 0;
        this.layerEntryGraceUntil = 0;
        this.slowUntil = 0;
        this.alertUntil = 0;
        this.touchSteerX = 0;
        this.touchSteerY = 0;
        this.touchPointerId = null;
        this.touchBoostHeld = false;
        this.boostPointerId = null;
        this.pendingTapDistance = 0;
        this.wasBoosting = false;
        this.lastBoostParticleAt = 0;
        this.nearMissCombo = 0;
        this.nearMissExpiresAt = 0;
        this.nearMissSlowUntil = 0;
        this.totalNearMisses = 0;
        this.bestNearMissCombo = 0;
        this.challengeClockMs = 0;
        this.layerSamples = ROCK_LAYERS.map(() => new Set());
        this.completedLayers = new Set();
        this.briefedLayers = new Set();
        this.collectedSecrets = [];
        this.score = 0;
        this.credits = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.upgrades = { speed: 0, magnet: 0, earnings: 0 };
        this.activeElapsedMs = 0;
        this.layerElapsedMs = 0;
        this.energyDrainFlashAt = 0;
        this.triggeredEnergyHazards = new Set();

        this.viewWidth = Math.max(320, this.scale.width);
        this.viewHeight = Math.max(420, this.scale.height);
        this.surfaceY = Math.round(this.viewHeight * 1.45);
        this.layerHeight = Phaser.Math.Clamp(this.viewHeight * 0.72, 360, 540);
        this.layerStartY = this.surfaceY + 14;
        this.worldHeight = this.layerStartY + ROCK_LAYERS.length * this.layerHeight + this.viewHeight * 0.55;
        this.anchorX = Math.round(this.viewWidth * 0.55);
        this.anchorY = this.surfaceY - 78;
        this.initialCameraY = this.surfaceY - this.viewHeight * 0.54;
        this.anchorScreenY = this.anchorY - this.initialCameraY;
        this.maxPull = Math.max(72, Math.min(
            this.anchorScreenY - 44,
            this.viewHeight * 0.46,
            this.viewWidth * 0.36,
            360
        ));

        this.cameras.main.setBounds(0, 0, this.viewWidth, this.worldHeight);
        this.cameras.main.alpha = 1;
        this.cameras.main.visible = true;
        this.cameras.main.zoom = 1;
        this.cameras.main.rotation = 0;
        this.cameras.main.scrollY = this.initialCameraY;
        this.world = new ExpeditionWorld(this, {
            width: this.viewWidth,
            height: this.viewHeight,
            surfaceY: this.surfaceY,
            layerStartY: this.layerStartY,
            layerHeight: this.layerHeight,
            anchorX: this.anchorX,
            record: this.record
        });
        this.impactEffects = new ImpactEffects(this);

        this.bandGraphics = this.add.graphics().setDepth(6);
        this.aimGraphics = this.add.graphics().setDepth(7);
        const drillParts = makeDrill(this);
        this.drill = drillParts.container.setDepth(10).setSize(58, 92);
        this.drawDrillBit = drillParts.drawBit;
        this.drill.setInteractive(
            new Phaser.Geom.Rectangle(-29, -42, 58, 92),
            Phaser.Geom.Rectangle.Contains
        );
        this.drill.input.cursor = "grab";

        this.createInterface();
        this.notebook = new LayerNotebookOverlay(this, () => currentRecord().discovered);
        this.layerBriefing = new LayerBriefingOverlay(this, () => this.playAreaRight || this.viewWidth);
        this.quizOverlay = new QuizOverlay(this, () => this.playAreaRight || this.viewWidth);
        this.upgradeOverlay = new UpgradeOverlay(this, () => this.playAreaRight || this.viewWidth);
        this.howToPlay = new HowToPlayOverlay(this);
        this.bindInput();
        this.resetRound();
        this.openHowToPlay();

        this.scale.on("resize", this.handleResize, this);
        this.events.once("shutdown", this.cleanupScene, this);
        showStatus(`Phaser ${Phaser.VERSION} ready • V4.6 expedition`, "success");
    }

    createInterface() {
        const font = "Arial, Helvetica, sans-serif";
        const shadow = { offsetX: 3, offsetY: 3, color: "#241923", blur: 0, fill: true };

        this.titleText = this.add.text(
            18,
            16,
            this.viewWidth < 650 ? "GC DRILL // V4.6" : "GRAND CANYON DRILL // V4.6",
            {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "18px" : "28px",
            fontStyle: "bold",
            color: "#fff1c1",
            shadow
            }
        ).setScrollFactor(0).setDepth(40);
        this.progressText = this.add.text(20, 52, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "11px" : "14px",
            color: "#ffd166",
            shadow
        }).setScrollFactor(0).setDepth(40);
        this.helpText = this.add.text(this.viewWidth / 2, this.viewHeight - 28, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "11px" : "15px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#2d2029dd",
            padding: { x: 12, y: 8 },
            shadow
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40);

        this.powerGraphics = this.add.graphics().setScrollFactor(0).setDepth(40);
        this.powerText = this.add.text(0, 0, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "11px" : "14px",
            fontStyle: "bold",
            color: "#fff1c1",
            shadow
        }).setScrollFactor(0).setDepth(41);

        this.fullscreenButton = this.add.text(this.viewWidth - 16, 16, "[ FULLSCREEN ]", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "11px" : "14px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#39252bdd",
            padding: { x: 9, y: 7 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(45).setInteractive({ useHandCursor: true });
        this.fullscreenButton.on("pointerdown", () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen();
            else this.scale.startFullscreen();
        });

        this.musicButton = this.add.text(
            this.viewWidth - (this.viewWidth < 650 ? 126 : 158),
            16,
            `[ ${retroMusic.label()} ]`,
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "10px" : "13px",
                fontStyle: "bold",
                color: "#17121b",
                backgroundColor: "#8ff2dc",
                padding: { x: 8, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(46).setInteractive({ useHandCursor: true });
        this.musicButton.on("pointerdown", async (pointer, localX, localY, event) => {
            event?.stopPropagation();
            await retroMusic.toggle();
            this.musicButton.setText(`[ ${retroMusic.label()} ]`);
        });

        this.sfxButton = this.add.text(
            this.viewWidth - (this.viewWidth < 650 ? 126 : 270),
            this.viewWidth < 650 ? 52 : 16,
            `[ ${retroMusic.sfxLabel()} ]`,
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "10px" : "13px",
                fontStyle: "bold",
                color: "#17121b",
                backgroundColor: "#ffd166",
                padding: { x: 8, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(46).setInteractive({ useHandCursor: true });
        this.sfxButton.on("pointerdown", async (pointer, localX, localY, event) => {
            event?.stopPropagation();
            await retroMusic.toggleSfx();
            this.sfxButton.setText(`[ ${retroMusic.sfxLabel()} ]`);
        });

        this.fieldNotesButton = this.add.text(
            this.viewWidth - (this.viewWidth < 650 ? 12 : 380),
            this.viewWidth < 650 ? 88 : 16,
            "[ FIELD NOTES ]",
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "10px" : "13px",
                fontStyle: "bold",
                color: "#8ff2dc",
                backgroundColor: "#39252bdd",
                padding: { x: 8, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(45).setInteractive({ useHandCursor: true });
        this.fieldNotesButton.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation();
            this.notebook?.open();
        });

        this.impactText = this.add.text(this.viewWidth / 2, this.viewHeight * 0.37, "SURFACE BREACH!", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "18px" : "28px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#291b22ee",
            padding: { x: 18, y: 14 },
            stroke: "#ff8a3d",
            strokeThickness: 3,
            shadow
        }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);

        this.drillHudShade = this.add.rectangle(0, 0, this.viewWidth, 80, 0x17121b, 0.9)
            .setOrigin(0).setScrollFactor(0).setDepth(35).setVisible(false);
        this.drillHudText = this.add.text(16, 12, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "12px" : "15px",
            fontStyle: "bold",
            color: "#fff1c1",
            lineSpacing: 4
        }).setScrollFactor(0).setDepth(36).setVisible(false);
        this.economyText = this.add.text(0, 12, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "13px" : "17px",
            fontStyle: "bold",
            color: "#ffd166",
            align: "right"
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(37).setVisible(false);
        this.energyGraphics = this.add.graphics().setScrollFactor(0).setDepth(36).setVisible(false);
        this.laneGraphics = this.add.graphics().setScrollFactor(0).setDepth(36).setVisible(false);

        this.layerBanner = this.add.text(this.viewWidth / 2, 96, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "13px" : "17px",
            fontStyle: "bold",
            color: "#fff1c1",
            align: "center",
            backgroundColor: "#211720e8",
            padding: { x: 16, y: 11 },
            wordWrap: { width: Math.min(540, this.viewWidth - 30), useAdvancedWrap: true },
            stroke: "#ff9f43",
            strokeThickness: 2,
            shadow
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(44).setAlpha(0);

        const compact = this.viewWidth < 720;
        const noteWidth = compact
            ? Math.min(240, this.viewWidth * 0.46)
            : Math.min(380, this.viewWidth * 0.3);
        const noteLeft = this.viewWidth - noteWidth - 14;
        const noteTop = 96;
        const noteHeight = Math.min(430, this.viewHeight - noteTop - 24);
        this.noteLeft = noteLeft;
        this.noteWidth = noteWidth;
        this.playAreaRight = Math.max(138, noteLeft - 18);
        this.economyText.setPosition(this.playAreaRight - 4, 12);
        this.currentNotePanel = this.add.rectangle(
            noteLeft,
            noteTop,
            noteWidth,
            noteHeight,
            0x17121b,
            0.94
        ).setOrigin(0).setStrokeStyle(3, 0x45d6c4, 1).setScrollFactor(0).setDepth(38).setVisible(false);
        this.currentNoteTitle = this.add.text(noteLeft + 13, noteTop + 11, "", {
            fontFamily: font,
            fontSize: compact ? "14px" : "17px",
            fontStyle: "bold",
            color: "#fff1c1",
            wordWrap: { width: noteWidth - 26, useAdvancedWrap: true }
        }).setScrollFactor(0).setDepth(39).setVisible(false);
        this.currentNoteBody = this.add.text(noteLeft + 13, noteTop + (compact ? 52 : 61), "", {
            fontFamily: font,
            fontSize: compact ? "14px" : "15px",
            color: "#f8ead0",
            lineSpacing: compact ? 6 : 8,
            wordWrap: { width: noteWidth - 26, useAdvancedWrap: true }
        }).setScrollFactor(0).setDepth(39).setVisible(false);
        this.currentNoteHint = this.add.text(
            noteLeft + 13,
            noteTop + noteHeight - 23,
            "Collect a sample to reveal its field note.",
            {
                fontFamily: font,
                fontSize: compact ? "12px" : "13px",
                fontStyle: "italic",
                color: "#8ff2dc"
            }
        ).setScrollFactor(0).setDepth(39).setVisible(false);

        this.boostButton = this.add.text(
            18,
            this.viewHeight - 82,
            "[ HOLD BOOST • SPACE ]",
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "11px" : "14px",
                fontStyle: "bold",
                color: "#17121b",
                backgroundColor: "#ffd166",
                padding: { x: 11, y: 9 }
            }
        ).setScrollFactor(0).setDepth(47).setVisible(false).setInteractive({ useHandCursor: true });
        this.boostButton.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation();
            this.unlockAudio();
            if (this.roundState === "drilling") {
                this.touchBoostHeld = true;
                this.boostPointerId = pointer.id;
            }
        });
        this.boostButton.on("pointerup", (pointer) => {
            if (pointer.id === this.boostPointerId) {
                this.touchBoostHeld = false;
                this.boostPointerId = null;
            }
        });
        this.boostButton.on("pointerout", (pointer) => {
            if (pointer.id !== this.boostPointerId) return;
            this.touchBoostHeld = false;
            this.boostPointerId = null;
        });

        this.secretPanel = this.add.text(this.viewWidth / 2, this.viewHeight * 0.3, "", {
            fontFamily: "Arial, sans-serif",
            fontSize: this.viewWidth < 650 ? "14px" : "18px",
            fontStyle: "bold",
            color: "#fff7df",
            align: "left",
            lineSpacing: 7,
            backgroundColor: "#17121bf2",
            padding: { x: 18, y: 15 },
            wordWrap: { width: Math.min(610, this.viewWidth - 34), useAdvancedWrap: true },
            stroke: "#211720",
            strokeThickness: 2
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(59).setVisible(false);
    }

    bindInput() {
        this.drill.on("pointerdown", (pointer) => {
            this.unlockAudio();
            if (this.roundState !== "ready" || this.notebook?.isOpen) return;
            this.roundState = "dragging";
            this.dragPointerId = pointer.id;
            this.drill.input.cursor = "grabbing";
            this.helpText.setText("AIM • PULL HIGH • RELEASE");
            this.updateDrag(pointer);
        });

        this.input.on("pointermove", (pointer) => {
            if (this.roundState === "dragging" && pointer.id === this.dragPointerId) {
                this.updateDrag(pointer);
            }
        });
        this.input.on("pointerup", (pointer) => {
            if (this.roundState === "dragging" && pointer.id === this.dragPointerId) {
                this.releaseDrill();
            }
            if (pointer.id === this.touchPointerId) {
                this.touchSteerX = 0;
                this.touchSteerY = 0;
                this.touchPointerId = null;
            }
            if (pointer.id === this.boostPointerId) {
                this.touchBoostHeld = false;
                this.boostPointerId = null;
            }
        });
        this.input.on("pointerdown", (pointer) => {
            this.unlockAudio();
            if (this.layerBriefing?.isOpen) {
                this.layerBriefing.tryContinue();
                return;
            }
            if (
                this.notebook?.isOpen ||
                this.roundState !== "drilling" ||
                pointer.y < 82 ||
                pointer.x > this.corridorRight
            ) return;
            const playCenter = (this.corridorLeft + this.corridorRight) / 2;
            const dx = pointer.x - playCenter;
            const dy = pointer.y - this.viewHeight / 2;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.touchSteerX = Math.sign(dx);
                this.touchSteerY = 0;
            } else {
                this.touchSteerX = 0;
                this.touchSteerY = Math.sign(dy);
            }
            this.touchPointerId = pointer.id;
            const tapStep = 18 * (1 + this.upgrades.speed * 0.25) *
                (this.touchBoostHeld ? 2.15 : 1);
            this.drill.x += this.touchSteerX * tapStep;
            this.drill.y += this.touchSteerY * tapStep;
            this.pendingTapDistance += tapStep;
        });
        this.input.on("gameout", () => {
            this.touchSteerX = 0;
            this.touchSteerY = 0;
            this.touchPointerId = null;
            this.touchBoostHeld = false;
            this.boostPointerId = null;
        });

        if (this.input.keyboard) {
            this.input.keyboard.once("keydown", () => this.unlockAudio());
            this.keys = this.input.keyboard.addKeys({
                leftA: Phaser.Input.Keyboard.KeyCodes.A,
                rightD: Phaser.Input.Keyboard.KeyCodes.D,
                upW: Phaser.Input.Keyboard.KeyCodes.W,
                downS: Phaser.Input.Keyboard.KeyCodes.S,
                leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
                rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
                upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
                downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
                reset: Phaser.Input.Keyboard.KeyCodes.R,
                continue: Phaser.Input.Keyboard.KeyCodes.SPACE,
                notes: Phaser.Input.Keyboard.KeyCodes.N,
                closeNotes: Phaser.Input.Keyboard.KeyCodes.ESC
            });
        }
    }

    async unlockAudio() {
        await retroMusic.start();
        this.musicButton?.setText(`[ ${retroMusic.label()} ]`);
        this.sfxButton?.setText(`[ ${retroMusic.sfxLabel()} ]`);
    }

    resetRound() {
        this.roundState = "ready";
        this.power = 0;
        this.dragPointerId = null;
        this.velocity.set(0, 0);
        this.touchSteerX = 0;
        this.touchSteerY = 0;
        this.touchPointerId = null;
        this.touchBoostHeld = false;
        this.boostPointerId = null;
        this.wasBoosting = false;
        this.nearMissCombo = 0;
        this.nearMissExpiresAt = 0;
        this.nearMissSlowUntil = 0;
        this.pendingTapDistance = 0;
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);
        this.quizOverlay?.close();
        this.upgradeOverlay?.close();
        this.layerBriefing?.close(false);
        this.cameras.main.scrollY = this.initialCameraY;
        this.drill.setPosition(this.anchorX, this.anchorY).setAngle(0).setScale(1).setDepth(10);
        this.drill.input.cursor = "grab";
        this.bandGraphics.clear();
        this.aimGraphics.clear();
        this.impactText.setVisible(false);
        this.titleText.setVisible(true);
        this.progressText.setVisible(true).setText(
            `${database.currentPlayer}  •  REPRESENTATIVE UNITS ` +
            `${String(this.record.discovered).padStart(2, "0")}/${ROCK_LAYERS.length}`
        );
        this.powerGraphics.setVisible(true);
        this.powerText.setVisible(true);
        this.fieldNotesButton.setVisible(true);
        this.drillHudShade.setVisible(false);
        this.drillHudText.setVisible(false);
        this.economyText.setVisible(false);
        this.energyGraphics.setVisible(false);
        this.laneGraphics.setVisible(false);
        this.boostButton.setVisible(false);
        this.secretPanel.setVisible(false);
        this.currentNotePanel.setVisible(false);
        this.currentNoteTitle.setVisible(false);
        this.currentNoteBody.setVisible(false);
        this.currentNoteHint.setVisible(false);
        this.helpText.setText(
            this.record.discovered > 0
                ? "AIM FOR THE OLD SHAFT • PULL UP • RELEASE"
                : "GRAB THE DRILL • PULL UP • RELEASE"
        );
        this.drawBands();
        this.drawPowerMeter();
    }

    openHowToPlay() {
        this.roundState = "instructions";
        this.howToPlay.open(() => {
            this.roundState = "ready";
            this.helpText.setText(
                this.record.discovered > 0
                    ? "AIM FOR THE OLD SHAFT • PULL UP • RELEASE"
                    : "GRAB THE DRILL • PULL UP • RELEASE"
            );
            showStatus("Expedition ready", "success");
        });
    }

    updateDrag(pointer) {
        const pullX = Phaser.Math.Clamp(
            pointer.x - this.anchorX,
            -this.maxPull * 0.68,
            this.maxPull * 0.68
        );
        const pullY = Phaser.Math.Clamp(pointer.y - this.anchorScreenY, -this.maxPull, -8);
        const vector = new Phaser.Math.Vector2(pullX, pullY);
        if (vector.length() > this.maxPull) vector.setLength(this.maxPull);

        this.power = Phaser.Math.Clamp(vector.length() / this.maxPull, 0, 1);
        const cameraLift = vector.y * 0.55;
        this.cameras.main.scrollY = this.initialCameraY + cameraLift;
        this.drill.setPosition(
            this.anchorX + vector.x,
            this.anchorY + vector.y + cameraLift
        );
        this.drawBands();
        this.drawAimGuide();
        this.drawPowerMeter();
    }

    drawBands() {
        const anchors = this.world.bandAnchors();
        const color = this.power > 0.82 ? 0xff694a : this.power > 0.45 ? 0xffa044 : 0x4a2528;
        const width = Math.max(4, Math.round(5 + this.power * 5));
        this.bandGraphics.clear().lineStyle(width + 3, 0x241923, 1);
        this.bandGraphics.lineBetween(anchors.left.x, anchors.left.y, this.drill.x, this.drill.y + 4);
        this.bandGraphics.lineBetween(anchors.right.x, anchors.right.y, this.drill.x, this.drill.y + 4);
        this.bandGraphics.lineStyle(width, color, 1);
        this.bandGraphics.lineBetween(anchors.left.x, anchors.left.y, this.drill.x, this.drill.y + 4);
        this.bandGraphics.lineBetween(anchors.right.x, anchors.right.y, this.drill.x, this.drill.y + 4);
    }

    predictedVelocity() {
        return new Phaser.Math.Vector2(
            (this.anchorX - this.drill.x) * (1.5 + this.power * 0.8),
            Math.max(240, (this.anchorY - this.drill.y) * (1.45 + this.power * 0.9))
        );
    }

    drawAimGuide() {
        this.aimGraphics.clear();
        if (this.roundState !== "dragging") return;
        const velocity = this.predictedVelocity();
        const color = this.power > 0.75 ? 0xffd166 : 0xfff1c1;
        this.aimGraphics.fillStyle(color, 0.92);
        for (let step = 1; step <= 16; step += 1) {
            const time = step * 0.065;
            const x = this.drill.x + velocity.x * time;
            const y = this.drill.y + velocity.y * time + 0.5 * this.gravity * time * time;
            if (x < 0 || x > this.viewWidth || y > this.surfaceY + 40) break;
            const size = step < 8 ? 6 : 4;
            this.aimGraphics.fillRect(Math.round(x), Math.round(y), size, size);
        }
    }

    drawPowerMeter() {
        const compact = this.viewWidth < 650;
        const width = compact ? Math.min(210, this.viewWidth - 36) : Math.min(280, this.viewWidth * 0.3);
        const x = compact ? 18 : this.viewWidth - width - 20;
        const y = compact ? 84 : 70;
        const color = this.power > 0.82 ? 0xff5d43 : this.power > 0.5 ? 0xffa044 : 0x45d6c4;
        this.powerGraphics.clear().fillStyle(0x241923, 0.92).fillRect(x, y, width, 22);
        this.powerGraphics.fillStyle(0xfff1c1, 1).fillRect(x + 4, y + 4, width - 8, 14);
        this.powerGraphics.fillStyle(color, 1).fillRect(x + 4, y + 4, (width - 8) * this.power, 14);
        this.powerText.setText(`LAUNCH POWER ${String(Math.round(this.power * 100)).padStart(3, "0")}%`);
        this.powerText.setPosition(x, y + 28);
    }

    releaseDrill() {
        if (this.power < 0.06) {
            this.resetRound();
            return;
        }
        this.roundState = "launched";
        this.dragPointerId = null;
        this.velocity.copy(this.predictedVelocity());
        this.launchPower = Math.round(this.power * 100);
        retroMusic.effect("launch");
        this.bandGraphics.clear();
        this.aimGraphics.clear();
        this.helpText.setText("IMPACT INCOMING!");
        this.tweens.add({
            targets: this.drill,
            scaleX: 1.16,
            scaleY: 0.84,
            duration: 90,
            yoyo: true,
            ease: "Quad.Out"
        });
    }

    update(time, delta) {
        if (this.howToPlay?.isOpen) {
            if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.continue)) {
                this.howToPlay.start();
            }
            return;
        }
        this.layerBriefing?.update();
        if (
            this.layerBriefing?.isOpen &&
            this.keys &&
            Phaser.Input.Keyboard.JustDown(this.keys.continue)
        ) {
            this.layerBriefing.tryContinue();
        }
        if (this.layerBriefing?.isOpen) return;
        if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.notes)) {
            if (this.notebook.isOpen) this.notebook.close();
            else if (this.roundState === "ready") this.notebook.open();
        }
        if (
            this.keys &&
            this.notebook.isOpen &&
            Phaser.Input.Keyboard.JustDown(this.keys.closeNotes)
        ) {
            this.notebook.close();
        }
        if (this.notebook?.isOpen) return;

        if (["dragging", "launched", "drilling", "layerSummary"].includes(this.roundState)) {
            this.drawDrillBit(Math.floor(time / 70) % 2 === 0);
        }
        if (this.roundState === "launched") this.updateLaunch(time, delta);
        if (this.roundState === "drilling") this.updateDrilling(time, delta);
    }

    updateLaunch(time, delta) {
        const dt = Math.min(delta / 1000, 0.034);
        this.velocity.y += this.gravity * dt;
        this.drill.x += this.velocity.x * dt;
        this.drill.y += this.velocity.y * dt;
        this.drill.angle = Phaser.Math.RadToDeg(Math.atan2(this.velocity.y, this.velocity.x)) - 90;

        const desiredScroll = Phaser.Math.Clamp(
            this.drill.y - this.viewHeight * 0.29,
            0,
            this.worldHeight - this.viewHeight
        );
        this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, desiredScroll, 0.12);
        this.spawnFallStreak(time);

        if (this.drill.y + 43 >= this.surfaceY && this.velocity.y > 0) {
            this.drill.y = this.surfaceY - 43;
            this.impact();
        } else if (
            this.drill.x < -150 ||
            this.drill.x > this.viewWidth + 150 ||
            this.drill.y > this.surfaceY + 180
        ) {
            showStatus("The drill left the launch area. Resetting safely.", "error");
            this.time.delayedCall(500, () => {
                showStatus("Ready", "success");
                this.resetRound();
            });
        }
    }

    spawnFallStreak(time) {
        if (time - this.lastFallStreakAt < 48) return;
        this.lastFallStreakAt = time;
        for (let index = 0; index < 2; index += 1) {
            const streak = this.add.rectangle(
                this.drill.x + Phaser.Math.Between(-45, 45),
                this.drill.y - Phaser.Math.Between(35, 80),
                3,
                Phaser.Math.Between(22, 52),
                0xffefd0,
                0.75
            ).setDepth(8);
            this.tweens.add({
                targets: streak,
                y: streak.y - 55,
                alpha: 0,
                duration: 180,
                onComplete: () => streak.destroy()
            });
        }
    }

    impact() {
        this.roundState = "impact";
        const impactSpeed = this.velocity.length();
        this.velocity.set(0, 0);
        this.drill.setAngle(0);

        const hadShaft = this.record.discovered > 0 && this.record.holeX !== null;
        const targetX = hadShaft ? this.record.holeX * this.viewWidth : this.drill.x;
        const distance = Math.abs(this.drill.x - targetX);
        this.accuracy = hadShaft
            ? Math.round(Phaser.Math.Clamp(1 - distance / (this.viewWidth * 0.32), 0.5, 1) * 100)
            : 100;
        this.usesShaft = hadShaft && this.accuracy >= 72;

        if (!hadShaft) {
            this.record.holeX = Phaser.Math.Clamp(this.drill.x / this.viewWidth, 0.08, 0.92);
        }
        this.record.shots += 1;
        this.record.bestPower = Math.max(this.record.bestPower, this.launchPower);
        this.record.bestAccuracy = Math.max(this.record.bestAccuracy, this.accuracy);
        saveDatabase();

        this.energyMax = Math.round(
            (34 + this.launchPower * 0.82) * (0.72 + this.accuracy / 100 * 0.28)
        );
        this.energy = this.energyMax;
        this.shaftCenterX = this.usesShaft ? targetX : this.drill.x;
        this.world.drawCrater(this.drill.x, this.launchPower);
        retroMusic.effect("impact");
        this.impactText
            .setText(this.usesShaft ? "BOOM! OLD SHAFT HIT!" : "BOOM! SURFACE BREACH!")
            .setVisible(true)
            .setAlpha(1);
        this.helpText.setText(`IMPACT SPEED ${Math.round(impactSpeed)}`);

        this.impactEffects.play(
            this.drill.x,
            this.surfaceY,
            this.launchPower,
            ROCK_LAYERS[0].color,
            () => this.beginDrilling()
        );
    }

    beginDrilling() {
        this.roundState = "transition";
        this.corridorLeft = 28;
        this.corridorRight = this.playAreaRight;
        const laneGap = (this.corridorRight - this.corridorLeft) / 4;
        this.shaftCenterX = (this.corridorLeft + this.corridorRight) / 2;
        this.laneCenters = [
            this.corridorLeft + laneGap,
            this.shaftCenterX,
            this.corridorRight - laneGap
        ];
        this.drawShaftCorridor(laneGap);
        this.evidenceCourse = new EvidenceCourse(this, {
            laneCenters: this.laneCenters,
            layerStartY: this.layerStartY,
            layerHeight: this.layerHeight,
            previousBest: this.previousBest,
            usesShaft: this.usesShaft,
            arenaLeft: this.corridorLeft,
            arenaRight: this.corridorRight
        });
        this.setDrillingInterface();
        this.impactText.setVisible(false);

        this.tweens.add({
            targets: this.drill,
            x: this.laneCenters[1],
            y: this.layerStartY + 10,
            angle: 0,
            duration: 480,
            ease: "Cubic.InOut",
            onUpdate: () => {
                const desired = this.drill.y - this.viewHeight * 0.3;
                this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, desired, 0.12);
            },
            onComplete: () => {
                this.roundState = "drilling";
                this.enterLayer(0);
            }
        });
    }

    drawShaftCorridor(laneGap) {
        const height = ROCK_LAYERS.length * this.layerHeight;
        this.shaftGraphics = this.add.graphics().setDepth(1);
        this.shaftGraphics.fillStyle(0x17121b, 0.025)
            .fillRect(0, this.layerStartY, this.viewWidth, height);
    }

    setDrillingInterface() {
        // Keep the player visible if the route passes behind the persistent field note.
        this.drill.setDepth(42);
        this.titleText.setVisible(false);
        this.progressText.setVisible(false);
        this.powerGraphics.setVisible(false);
        this.powerText.setVisible(false);
        this.fieldNotesButton.setVisible(false);
        this.drillHudShade.setVisible(true);
        this.drillHudText.setVisible(true);
        this.economyText.setVisible(true);
        this.energyGraphics.setVisible(true);
        this.laneGraphics.setVisible(true);
        this.boostButton.setVisible(true);
        this.setCurrentNoteVisible(true);
        const playCenter = (this.corridorLeft + this.corridorRight) / 2;
        this.helpText.setX(playCenter);
        this.layerBanner.setX(playCenter);
        this.helpText.setText("WASD / ARROWS / TOUCH • EXPLORE THE WHOLE LAYER • FIND 5");
        this.drawEnergyBar();
        this.drawSampleIndicator(0);
    }

    updateDrilling(time, delta) {
        const slowMotionScale = time < this.nearMissSlowUntil ? 0.28 : 1;
        const dt = Math.min(delta / 1000, 0.034) * slowMotionScale;
        const layerIndex = Phaser.Math.Clamp(
            Math.floor((this.drill.y - this.layerStartY) / this.layerHeight),
            0,
            ROCK_LAYERS.length - 1
        );
        this.enterLayer(layerIndex);
        if (this.roundState !== "drilling") return;
        this.activeElapsedMs += delta;
        this.layerElapsedMs += delta;
        if (this.nearMissCombo > 0 && time > this.nearMissExpiresAt) {
            this.nearMissCombo = 0;
        }
        this.challengeClockMs += delta * slowMotionScale;
        const layer = ROCK_LAYERS[layerIndex];
        const challenge = getLayerChallenge(layerIndex);
        this.evidenceCourse.update(this.challengeClockMs);
        const knownLayer = layerIndex < this.previousBest;
        const boostInputHeld = this.touchBoostHeld || Boolean(this.keys?.continue.isDown);
        let moveX = this.touchSteerX;
        let moveY = this.touchSteerY;
        if (this.keys) {
            const keyboardTapStep = 18 * (1 + this.upgrades.speed * 0.25) *
                (boostInputHeld ? 2.15 : 1);
            const leftDown = this.keys.leftA.isDown || this.keys.leftArrow.isDown;
            const rightDown = this.keys.rightD.isDown || this.keys.rightArrow.isDown;
            const upDown = this.keys.upW.isDown || this.keys.upArrow.isDown;
            const downDown = this.keys.downS.isDown || this.keys.downArrow.isDown;
            moveX += (rightDown ? 1 : 0) - (leftDown ? 1 : 0);
            moveY += (downDown ? 1 : 0) - (upDown ? 1 : 0);
            if (
                Phaser.Input.Keyboard.JustDown(this.keys.leftA) ||
                Phaser.Input.Keyboard.JustDown(this.keys.leftArrow)
            ) {
                this.drill.x -= keyboardTapStep;
                this.pendingTapDistance += keyboardTapStep;
            }
            if (
                Phaser.Input.Keyboard.JustDown(this.keys.rightD) ||
                Phaser.Input.Keyboard.JustDown(this.keys.rightArrow)
            ) {
                this.drill.x += keyboardTapStep;
                this.pendingTapDistance += keyboardTapStep;
            }
            if (
                Phaser.Input.Keyboard.JustDown(this.keys.upW) ||
                Phaser.Input.Keyboard.JustDown(this.keys.upArrow)
            ) {
                this.drill.y -= keyboardTapStep;
                this.pendingTapDistance += keyboardTapStep;
            }
            if (
                Phaser.Input.Keyboard.JustDown(this.keys.downS) ||
                Phaser.Input.Keyboard.JustDown(this.keys.downArrow)
            ) {
                this.drill.y += keyboardTapStep;
                this.pendingTapDistance += keyboardTapStep;
            }
        }
        const movement = new Phaser.Math.Vector2(moveX, moveY);
        if (movement.length() > 1) movement.normalize();
        const boosting = boostInputHeld && movement.lengthSq() > 0.01 && this.energy > 0;
        const boostFactor = boosting ? 2.15 : 1;
        if (boosting && !this.wasBoosting) retroMusic.effect("boost");
        this.wasBoosting = boosting;
        this.drill.setScale(boosting ? 1.1 : 1);
        this.boostButton
            .setText(boosting ? "[ BOOSTING • FUEL −8%/s ]" : "[ HOLD BOOST • SPACE ]")
            .setColor(boosting ? "#fff1c1" : "#17121b")
            .setBackgroundColor(boosting ? "#c44437" : "#ffd166");
        const passFactor = knownLayer ? (this.usesShaft ? 0.55 : 0.78) : 1;
        const slowFactor = time < this.slowUntil ? 0.42 : 1;
        const upgradeFactor = 1 + this.upgrades.speed * 0.25;
        const environment = this.evidenceCourse.getEnvironmentEffect(
            layerIndex,
            this.drill.x,
            this.drill.y,
            this.challengeClockMs
        );
        const speed = (165 + (30 - layer.resistance) * 1.5) * slowFactor *
            upgradeFactor * boostFactor * environment.speedMultiplier;
        const layerTop = this.layerStartY + layerIndex * this.layerHeight + 48;
        const layerBottom = this.layerStartY + (layerIndex + 1) * this.layerHeight - 48;
        const beforeX = this.drill.x;
        const beforeY = this.drill.y;
        this.drill.x = Phaser.Math.Clamp(
            this.drill.x + (movement.x * speed + environment.pushX) * dt,
            this.corridorLeft,
            this.corridorRight
        );
        this.drill.y += (movement.y * speed + environment.pushY) * dt;
        this.drill.y = Phaser.Math.Clamp(this.drill.y, layerTop, layerBottom);
        const mazeResult = this.evidenceCourse.resolveMazeCollision(
            layerIndex,
            beforeX,
            beforeY,
            this.drill.x,
            this.drill.y
        );
        this.drill.setPosition(mazeResult.x, mazeResult.y);
        if (mazeResult.hit && time >= (this.mazeBumpUntil || 0)) {
            this.mazeBumpUntil = time + 360;
            this.cameras.main.shake(80, 0.003);
            this.helpText.setText("STROMATOLITE WALL • FIND THE OPEN GAP");
            this.alertUntil = time + 700;
        }
        if (movement.lengthSq() > 0.01) {
            const targetAngle = Phaser.Math.RadToDeg(Math.atan2(movement.y, movement.x)) - 90;
            this.drill.angle += Phaser.Math.Angle.ShortestBetween(
                this.drill.angle,
                targetAngle
            ) * Math.min(1, dt * 9);
        }
        const distance = Phaser.Math.Distance.Between(beforeX, beforeY, this.drill.x, this.drill.y);
        const travelDistance = distance + this.pendingTapDistance;
        const playerMoved = movement.lengthSq() > 0.01 || this.pendingTapDistance > 0;
        this.pendingTapDistance = 0;
        const fuelConsumptionMultiplier = 6;
        this.energy -= layer.resistance * passFactor *
            (travelDistance / (this.layerHeight * 15)) * fuelConsumptionMultiplier;
        if (boosting) {
            this.energy -= this.energyMax * 0.08 * Math.min(delta / 1000, 0.05);
        }
        if (environment.energyHitKey && !this.triggeredEnergyHazards.has(environment.energyHitKey)) {
            this.triggeredEnergyHazards.add(environment.energyHitKey);
            this.energy -= this.energyMax * 0.15;
            this.cameras.main.flash(110, 255, 96, 48, false);
            retroMusic.effect("hazard");
            this.showScreenPopup("HOT BASALT  −15% FUEL", "#ff8a66");
            this.helpText.setText("HOT BASALT POCKET • FUEL LOST");
            this.alertUntil = time + 1350;
        }
        // Movement stays quiet so collectible, quiz, impact, and transition cues remain clear.
        retroMusic.setMotor(false);
        retroMusic.setAmbience(true, layerIndex / Math.max(1, ROCK_LAYERS.length - 1));

        const magnetRadius = 33 + this.upgrades.magnet * 20;
        const sample = this.evidenceCourse.findSampleCollision(
            this.drill.x,
            this.drill.y,
            magnetRadius
        );
        if (sample) this.collectEvidence(sample, time);

        const fuelCan = this.evidenceCourse.findFuelCollision(
            this.drill.x,
            this.drill.y,
            34 + this.upgrades.magnet * 8
        );
        if (fuelCan) this.collectFuel(fuelCan, time);

        if (time >= this.collisionCooldownUntil && time >= this.layerEntryGraceUntil) {
            const obstacle = this.evidenceCourse.findObstacleCollision(this.drill.x, this.drill.y);
            if (obstacle) {
                this.handleObstacleCollision(obstacle, layer, time);
            } else if (playerMoved && travelDistance > 2.5) {
                const nearMiss = this.evidenceCourse.trackNearMiss(this.drill.x, this.drill.y);
                if (nearMiss) this.registerNearMiss(nearMiss, time);
            }
        }

        if (time > this.alertUntil && this.roundState === "drilling") {
            this.helpText.setText(
                environment.label
                    ? `${environment.label} • STEER AND FIND 5`
                    : `${challenge.name} • SEARCH THE WHOLE LAYER • FIND 5`
            );
        }

        if (travelDistance > 0.5) this.spawnDrillParticles(time, layer);
        if (boosting) this.spawnBoostTrail(time, layer);
        const desiredScroll = Phaser.Math.Clamp(
            this.layerStartY + (layerIndex + 0.5) * this.layerHeight - this.viewHeight * 0.52,
            0,
            this.worldHeight - this.viewHeight
        );
        this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, desiredScroll, 0.14);
        const evidenceLabel = `EVIDENCE ${this.layerSamples[layerIndex].size}/5`;
        const energyPercent = Math.round(Phaser.Math.Clamp(this.energy / this.energyMax, 0, 1) * 100);
        this.drillHudText.setText(this.viewWidth < 650
            ? `RUN ${formatRunTime(this.activeElapsedMs)}  •  LAYER ${formatRunTime(this.layerElapsedMs)}\n` +
                `CLUES ${this.layerSamples[layerIndex].size}/5  •  ENERGY ${energyPercent}%  •  BUMPS ${this.collisions}`
            : `RUN ${formatRunTime(this.activeElapsedMs)}  •  LAYER ${formatRunTime(this.layerElapsedMs)}  •  ` +
                `${String(layerIndex + 1).padStart(2, "0")}/${ROCK_LAYERS.length} ${layer.name}\n` +
                `${evidenceLabel}  •  ENERGY ${energyPercent}%  •  R ${layer.resistance}/30  •  BUMPS ${this.collisions}`
        );
        const comboLabel = this.nearMissCombo > 0 && time <= this.nearMissExpiresAt
            ? `\nNEAR MISS x${this.nearMissCombo}`
            : "";
        this.economyText.setText(`SCORE ${this.score}\nCREDITS ${this.credits}${comboLabel}`);
        this.drawEnergyBar();
        this.drawSampleIndicator(layerIndex);

        const bottom = this.layerStartY + this.layerHeight * ROCK_LAYERS.length - 42;
        if (this.roundState === "drilling" && this.drill.y >= bottom) {
            this.record.bestRunShots = this.record.bestRunShots === null
                ? this.record.shots
                : Math.min(this.record.bestRunShots, this.record.shots);
            saveDatabase();
            this.finishRun(true);
        } else if (this.roundState === "drilling" && this.energy <= 0) {
            this.finishRun(false);
        }
    }

    handleObstacleCollision(obstacle, layer, time) {
        if (this.roundState !== "drilling") return;
        this.roundState = "quiz";
        this.collisionCooldownUntil = time + 1200;
        this.collisions += 1;
        this.nearMissCombo = 0;
        this.nearMissExpiresAt = 0;
        this.touchBoostHeld = false;
        this.boostPointerId = null;
        this.wasBoosting = false;
        this.drill.setScale(1);
        this.boostButton.setVisible(false);
        retroMusic.effect("bump");
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);
        this.cameras.main.shake(170, 0.01);
        const knockDirection = this.drill.x <= obstacle.x ? -1 : 1;
        this.drill.x = Phaser.Math.Clamp(
            this.drill.x + knockDirection * 28,
            this.corridorLeft,
            this.corridorRight
        );
        this.drill.y -= 7;
        this.helpText.setText("MEMORY CHECK • FIELD NOTE HIDDEN UNTIL YOU ANSWER");
        this.setCurrentNoteVisible(false);
        const quiz = getLayerQuiz(layer, obstacle.quizIndex);
        this.quizOverlay.open(quiz, (correct) => this.resolveRockQuiz(obstacle, layer, correct));
    }

    registerNearMiss(obstacle, time) {
        this.evidenceCourse.markNearMiss(obstacle);
        if (time > this.nearMissExpiresAt) this.nearMissCombo = 0;
        this.nearMissCombo = Math.min(4, this.nearMissCombo + 1);
        this.nearMissExpiresAt = time + 2500;
        this.nearMissSlowUntil = time + 150;
        this.totalNearMisses += 1;
        this.bestNearMissCombo = Math.max(this.bestNearMissCombo, this.nearMissCombo);
        const scoreGain = 50 * this.nearMissCombo;
        this.score += scoreGain;
        retroMusic.effect("nearMiss");
        this.cameras.main.shake(70, 0.0016);
        this.cameras.main.flash(45, 143, 242, 220, false);
        const comboText = this.nearMissCombo > 1 ? ` x${this.nearMissCombo}` : "";
        this.showScreenPopup(`NEAR MISS${comboText}  +${scoreGain}`, "#8ff2dc");
        this.helpText.setText(
            this.nearMissCombo > 1
                ? `SKILL STREAK x${this.nearMissCombo} • KEEP MOVING`
                : "CLEAN DODGE • CHAIN ANOTHER WITHIN 2.5s"
        );
        this.alertUntil = time + 900;
    }

    resolveRockQuiz(obstacle, layer, correct) {
        this.evidenceCourse.resolveObstacle(obstacle, correct);
        if (correct) {
            this.correctAnswers += 1;
            this.score += 50;
            retroMusic.effect("correct");
            this.showScreenPopup("CORRECT  +50", "#8ff2dc");
            this.helpText.setText(`CORRECT • ${layer.name.toUpperCase()} ROCK CLEARED`);
        } else {
            this.wrongAnswers += 1;
            this.score -= 100;
            this.slowUntil = this.time.now + 2000;
            retroMusic.effect("wrong");
            this.showScreenPopup("WRONG  −100 • SLOW 2s", "#ff8a66");
            this.helpText.setText("CHECK THE NOTE • DRILL SLOWED FOR 2 SECONDS");
        }
        this.setCurrentNoteVisible(true);
        this.roundState = "drilling";
        this.boostButton.setVisible(true);
        this.alertUntil = this.time.now + 1500;
    }

    showScreenPopup(message, color) {
        const centerX = (this.corridorLeft + this.corridorRight) / 2;
        const popup = this.add.text(centerX, this.viewHeight * 0.44, message, {
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: this.viewWidth < 650 ? "18px" : "26px",
            fontStyle: "bold",
            color,
            backgroundColor: "#17121bee",
            padding: { x: 14, y: 10 },
            stroke: "#17121b",
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(95);
        this.tweens.add({
            targets: popup,
            y: popup.y - 38,
            alpha: 0,
            duration: 900,
            ease: "Cubic.Out",
            onComplete: () => popup.destroy()
        });
    }

    collectEvidence(sample, time) {
        const collected = this.layerSamples[sample.layerIndex];
        if (collected.has(sample.clueIndex)) {
            this.evidenceCourse.collectSample(sample);
            return;
        }
        collected.add(sample.clueIndex);
        this.score += 100;
        const creditGain = Math.round(50 * (1 + this.upgrades.earnings * 0.25));
        this.credits += creditGain;
        retroMusic.effect("collect");
        this.collectedSecrets.push({
            layerIndex: sample.layerIndex,
            clueIndex: sample.clueIndex,
            type: sample.clue.type,
            text: sample.clue.text
        });
        this.evidenceCourse.collectSample(sample);
        this.cameras.main.flash(90, 255, 209, 102, false);
        const scorePopup = this.add.text(
            sample.x,
            sample.y - 25,
            `+100 SCORE\n+${creditGain} CREDITS`,
            {
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "17px",
            fontStyle: "bold",
            color: "#ffd166",
            align: "center",
            stroke: "#17121b",
            strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(48);
        this.tweens.add({
            targets: scorePopup,
            y: scorePopup.y - 54,
            alpha: 0,
            duration: 720,
            ease: "Cubic.Out",
            onComplete: () => scorePopup.destroy()
        });
        this.helpText.setText(`PING! ${sample.clue.type} • +100 SCORE • +${creditGain} CREDITS`);
        this.alertUntil = time + 1350;
        this.drawSampleIndicator(sample.layerIndex);
        this.renderCurrentLayerNote(sample.layerIndex);

        if (collected.size === getLayerEvidence(ROCK_LAYERS[sample.layerIndex]).length) {
            this.completeLayer(sample.layerIndex);
        }
    }

    collectFuel(fuelCan, time) {
        const before = this.energy;
        if (before >= this.energyMax * 0.98) {
            if (!fuelCan.fullHintShown) {
                fuelCan.fullHintShown = true;
                this.showScreenPopup("FUEL FULL • SAVE IT", "#8ff2dc");
                this.helpText.setText("FUEL FULL • RETURN AFTER USING ENERGY");
                this.alertUntil = time + 1200;
            }
            return;
        }
        this.energy = Math.min(this.energyMax, this.energy + this.energyMax * 0.25);
        const restored = Math.max(0, Math.round((this.energy - before) / this.energyMax * 100));
        this.evidenceCourse.collectFuelCan(fuelCan);
        retroMusic.effect("fuel");
        this.cameras.main.flash(90, 69, 214, 196, false);
        this.showScreenPopup(`FUEL +${restored}%`, "#8ff2dc");
        this.helpText.setText(`FUEL CAN RECOVERED • +${restored}% ENERGY`);
        this.alertUntil = time + 1250;
    }

    completeLayer(index) {
        if (this.completedLayers.has(index)) return;
        this.completedLayers.add(index);
        const layer = ROCK_LAYERS[index];
        this.touchBoostHeld = false;
        this.boostPointerId = null;
        this.wasBoosting = false;
        this.drill.setScale(1);
        this.boostButton.setVisible(false);
        retroMusic.effect("layer");
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);

        if (index >= this.previousBest && !this.newLayers.includes(index)) {
            this.newLayers.push(index);
            this.record.discovered = Math.max(this.record.discovered, index + 1);
            if (this.record.discovered > this.record.highScore) {
                this.record.highScore = this.record.discovered;
                this.record.bestRunShots = this.record.shots;
            }
            saveDatabase();
        }

        if (index === ROCK_LAYERS.length - 1) {
            const lines = getLayerEvidence(layer)
                .map((clue) => `• ${clue.type}: ${clue.text}`)
                .join("\n");
            this.secretPanel
                .setText(`FINAL CORE COMPLETE\n${layer.name} • ${layer.ma} Ma\n\n${lines}`)
                .setVisible(true)
                .setAlpha(0)
                .setScale(0.94);
            this.roundState = "layerSummary";
            this.tweens.add({
                targets: this.secretPanel,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 180,
                ease: "Back.Out"
            });
            this.time.delayedCall(1600, () => {
                if (this.roundState !== "layerSummary") return;
                this.secretPanel.setVisible(false);
                this.roundState = "drilling";
                this.finishRun(true);
            });
            return;
        }

        this.roundState = "upgrade";
        this.openUpgradeShop(index, layer);
    }

    upgradeCost(type) {
        return 200;
    }

    openUpgradeShop(index, layer) {
        const choices = ["speed", "magnet", "earnings"].map((type) => {
            const cost = this.upgradeCost(type);
            return {
                type,
                cost,
                maxed: false,
                available: this.credits >= cost
            };
        });
        this.upgradeOverlay.open({
            layer,
            credits: this.credits,
            upgrades: this.upgrades,
            choices
        }, (type) => this.chooseUpgrade(index, type));
    }

    chooseUpgrade(index, type) {
        if (this.roundState !== "upgrade") return;
        if (type) {
            const cost = this.upgradeCost(type);
            if (this.credits < cost) return;
            this.credits -= cost;
            this.upgrades[type] += 1;
            retroMusic.effect("upgrade");
            const upgradeMessage = type === "speed"
                ? `SPEED LV ${this.upgrades.speed} • ${Math.round((1 + this.upgrades.speed * 0.25) * 100)}% MOVE`
                : `${type.toUpperCase()} UPGRADED`;
            this.showScreenPopup(upgradeMessage, "#ffd166");
        }
        this.upgradeOverlay.close();
        this.roundState = "transition";
        this.time.delayedCall(type ? 520 : 180, () => this.advanceToNextLayer(index));
    }

    advanceToNextLayer(index) {
        if (this.roundState !== "transition") return;
        this.drill.y = this.layerStartY + (index + 1) * this.layerHeight + 52;
        this.currentLayer = -1;
        this.layerEntryGraceUntil = this.time.now + 1500;
        this.roundState = "drilling";
        this.boostButton.setVisible(true);
        this.helpText.setText("TRANSITION COMPLETE • ENTERING THE NEXT STRATA");
        this.alertUntil = this.time.now + 1000;
    }

    enterLayer(index) {
        if (index < 0 || index >= ROCK_LAYERS.length || index === this.currentLayer) return;
        this.currentLayer = index;
        this.layerElapsedMs = 0;
        const layer = ROCK_LAYERS[index];
        const challenge = getLayerChallenge(index);
        const isNew = index >= this.previousBest;
        this.renderCurrentLayerNote(index);

        this.layerBanner.setText(
            `${isNew ? "NEW LAYER" : "RESURVEY"} — FIND 5 CLUES  ${String(index + 1).padStart(2, "0")}/${ROCK_LAYERS.length}\n` +
            `${layer.name}  •  ${layer.ma} Ma\n` +
            `${challenge.name} • COLLECT A • R • F • E • L/!`
        );
        this.tweens.killTweensOf(this.layerBanner);
        if (this.viewWidth < 650) {
            this.layerBanner.setAlpha(0);
        } else {
            this.layerBanner.setAlpha(0).setY(92);
            this.tweens.add({
                targets: this.layerBanner,
                alpha: 1,
                y: 104,
                duration: 160,
                hold: 850,
                yoyo: true
            });
        }

        if (!this.briefedLayers.has(index)) {
            this.briefedLayers.add(index);
            this.roundState = "briefing";
            this.boostButton.setVisible(false);
            retroMusic.setMotor(false);
            retroMusic.setAmbience(false);
            this.layerBriefing.open({
                layer,
                index,
                total: ROCK_LAYERS.length,
                challenge,
                isNew
            }, () => {
                if (this.roundState !== "briefing") return;
                this.roundState = "drilling";
                this.boostButton.setVisible(true);
                this.layerEntryGraceUntil = this.time.now + 1500;
                this.collisionCooldownUntil = Math.max(this.collisionCooldownUntil, this.layerEntryGraceUntil);
                retroMusic.effect("layer");
                this.helpText.setText(`${challenge.name} • FIND ALL 5 EVIDENCE SAMPLES`);
                this.alertUntil = this.time.now + 1500;
            });
        }
    }

    renderCurrentLayerNote(index) {
        if (index < 0 || index >= ROCK_LAYERS.length) return;
        const layer = ROCK_LAYERS[index];
        const evidence = getLayerEvidence(layer);
        const collected = this.layerSamples[index] || new Set();
        this.currentNoteTitle.setText(
            `FIELD NOTE ${String(index + 1).padStart(2, "0")}/10\n${layer.name}`
        );
        this.currentNoteBody.setText(evidence.map((clue, clueIndex) => {
            const marker = collected.has(clueIndex) ? "✓" : "○";
            const type = String(clue?.type || "NOTE").padEnd(5, " ");
            const note = clue?.note || clue?.text || "Field evidence unavailable.";
            return `${marker} ${type}  ${note}`;
        }).join("\n"));
        this.currentNoteHint.setText(
            `${collected.size}/5 • +100 score • sample credits increase with Earnings.`
        );
    }

    setCurrentNoteVisible(visible) {
        [
            this.currentNotePanel,
            this.currentNoteTitle,
            this.currentNoteBody,
            this.currentNoteHint
        ].forEach((item) => item?.setVisible(visible));
    }

    spawnDrillParticles(time, layer) {
        if (time - this.lastDrillParticleAt < 72) return;
        this.lastDrillParticleAt = time;
        const angle = Phaser.Math.DegToRad(this.drill.angle);
        const tipX = this.drill.x + Math.sin(angle) * 39;
        const tipY = this.drill.y + Math.cos(angle) * 39;
        for (let index = 0; index < 3; index += 1) {
            const chip = this.add.rectangle(
                tipX + Phaser.Math.Between(-8, 8),
                tipY + Phaser.Math.Between(-8, 8),
                Phaser.Math.Between(3, 7),
                Phaser.Math.Between(3, 7),
                index === 0 ? 0xffe890 : layer.color
            ).setDepth(9);
            this.tweens.add({
                targets: chip,
                x: chip.x + Phaser.Math.Between(-48, 48),
                y: chip.y + Phaser.Math.Between(-5, 42),
                angle: Phaser.Math.Between(-160, 160),
                alpha: 0,
                duration: Phaser.Math.Between(240, 420),
                onComplete: () => chip.destroy()
            });
        }
    }

    spawnBoostTrail(time, layer) {
        if (time - this.lastBoostParticleAt < 38) return;
        this.lastBoostParticleAt = time;
        const angle = Phaser.Math.DegToRad(this.drill.angle);
        const trail = this.add.rectangle(
            this.drill.x - Math.sin(angle) * 42,
            this.drill.y - Math.cos(angle) * 42,
            8,
            26,
            Phaser.Utils.Array.GetRandom([0x8ff2dc, 0xffd166, layer.color]),
            0.86
        ).setAngle(this.drill.angle).setDepth(9);
        this.tweens.add({
            targets: trail,
            scaleY: 1.8,
            alpha: 0,
            duration: 210,
            ease: "Quad.Out",
            onComplete: () => trail.destroy()
        });
    }

    drawEnergyBar() {
        if (!this.energyGraphics.visible || !this.energyMax) return;
        const width = Math.min(270, (this.playAreaRight || this.viewWidth) * 0.36);
        const x = (this.playAreaRight || this.viewWidth) - width - 8;
        const y = 52;
        const ratio = Phaser.Math.Clamp(this.energy / this.energyMax, 0, 1);
        const color = ratio > 0.55 ? 0x45d6c4 : ratio > 0.25 ? 0xffa044 : 0xff5d43;
        this.energyGraphics.clear().fillStyle(0x0e0a10, 1).fillRect(x, y, width, 20);
        this.energyGraphics.fillStyle(0xfff1c1, 1).fillRect(x + 3, y + 3, width - 6, 14);
        this.energyGraphics.fillStyle(color, 1).fillRect(x + 3, y + 3, (width - 6) * ratio, 14);
    }

    drawSampleIndicator(layerIndex) {
        if (!this.laneGraphics.visible) return;
        const y = this.viewHeight - 76;
        const center = (this.corridorLeft + this.corridorRight) / 2;
        const gap = 34;
        const collected = this.layerSamples[layerIndex] || new Set();
        const colors = [0xf6e27a, 0xffa044, 0xf28dc8, 0x45d6c4, 0xffd166];
        this.laneGraphics.clear();
        for (let clue = 0; clue < 5; clue += 1) {
            const found = collected.has(clue);
            const x = center + (clue - 2) * gap;
            this.laneGraphics.fillStyle(found ? colors[clue] : 0x3b2a32, 1);
            this.laneGraphics.lineStyle(2, found ? 0xfff1c1 : 0x826b69, 1);
            this.laneGraphics.fillRect(x - 10, y - 10, 20, 20);
            this.laneGraphics.strokeRect(x - 10, y - 10, 20, 20);
        }
    }

    finishRun(complete) {
        if (this.roundState !== "drilling") return;
        this.roundState = "stopped";
        this.touchBoostHeld = false;
        this.boostPointerId = null;
        this.wasBoosting = false;
        this.drill.setScale(1);
        this.boostButton.setVisible(false);
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);
        this.energy = Math.max(0, this.energy);
        if (this.score > this.record.bestScore) {
            this.record.bestScore = this.score;
        }
        const elapsedMs = Math.max(0, Math.round(this.activeElapsedMs));
        const isTimeRecord = complete && elapsedMs > 0 &&
            (!this.record.bestTimeMs || elapsedMs < this.record.bestTimeMs);
        if (isTimeRecord) this.record.bestTimeMs = elapsedMs;
        saveDatabase();
        retroMusic.effect(complete ? "finish" : "fail");
        this.cameras.main.shake(170, 0.005);
        const message = complete ? "CORE MISSION COMPLETE!" : "DRILL ENERGY DEPLETED";
        const stopText = this.add.text(
            (this.corridorLeft + this.corridorRight) / 2,
            this.viewHeight * 0.48,
            message,
            {
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: this.viewWidth < 650 ? "18px" : "26px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#211720ee",
            padding: { x: 16, y: 12 },
            stroke: "#ff8a3d",
            strokeThickness: 2
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(60);
        stopText.setAlpha(0);
        this.tweens.add({ targets: stopText, alpha: 1, duration: 180 });

        this.time.delayedCall(1050, () => this.scene.start("ResultsScene", {
            launchPower: this.launchPower,
            accuracy: this.accuracy,
            usedShaft: this.usesShaft,
            previousBest: this.previousBest,
            previousBestScore: this.previousBestScore,
            previousBestTimeMs: this.previousBestTimeMs,
            newLayers: this.newLayers,
            collisions: this.collisions,
            samplesCollected: this.collectedSecrets.length,
            secrets: this.collectedSecrets,
            score: this.score,
            credits: this.credits,
            correctAnswers: this.correctAnswers,
            wrongAnswers: this.wrongAnswers,
            nearMisses: this.totalNearMisses,
            bestNearMissCombo: this.bestNearMissCombo,
            upgrades: { ...this.upgrades },
            elapsedMs,
            isTimeRecord,
            complete
        }));
    }

    handleResize() {
        showStatus("Screen size changed. Returning safely to launch.", "error");
        this.scene.start("ExpeditionScene");
        this.time.delayedCall(700, () => showStatus("Ready", "success"));
    }

    cleanupScene() {
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);
        this.quizOverlay?.close();
        this.upgradeOverlay?.close();
        this.layerBriefing?.close(false);
        this.howToPlay?.close(false);
        this.scale.off("resize", this.handleResize, this);
        this.input.removeAllListeners();
    }
}
