import { ROCK_LAYERS, getLayerEvidence, getLayerQuiz } from "../data/layers.js?v=5.1.3";
import { storyFor, timeGapFor } from "../data/story.js?v=5.1.3";
import {
    database,
    currentRecord,
    formatRunTime,
    saveDatabase,
    hasSeenTutorial,
    markTutorialSeen,
    hasSeenHint,
    markHintSeen,
    recordLayerStars,
    markSampleFound,
    collectionCount
} from "../services/storage.js?v=5.1.3";
import { makeDrill } from "../ui/components.js?v=5.1.3";
import { showStatus } from "../core/status.js?v=5.1.3";
import { GAME_FONT, UI } from "../core/theme.js?v=5.1.3";
import { ExpeditionWorld, WORLD_BLEED } from "../world/ExpeditionWorld.js?v=5.1.3";
import { ImpactEffects } from "../effects/ImpactEffects.js?v=5.1.3";
import { EvidenceCourse } from "../gameplay/EvidenceCourse.js?v=5.1.3";
import { getLayerChallenge } from "../gameplay/layerChallenges.js?v=5.1.3";
import { LayerNotebookOverlay } from "../ui/LayerNotebookOverlay.js?v=5.1.3";
import { LayerBriefingOverlay } from "../ui/LayerBriefingOverlay.js?v=5.1.3";
import { UpgradeOverlay } from "../ui/UpgradeOverlay.js?v=5.1.3";
import { QuizOverlay } from "../ui/QuizOverlay.js?v=5.1.3";
import { TimeGapOverlay } from "../ui/TimeGapOverlay.js?v=5.1.3";
import { HowToPlayOverlay } from "../ui/HowToPlayOverlay.js?v=5.1.3";
import { StartMenuOverlay } from "../ui/StartMenuOverlay.js?v=5.1.3";
import { retroMusic } from "../services/AudioManager.js?v=5.1.3";

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
        this.totalNearMisses = 0;
        this.bestNearMissCombo = 0;
        this.challengeClockMs = 0;
        this.layerSamples = ROCK_LAYERS.map(() => new Set());
        this.completedLayers = new Set();
        this.briefedLayers = new Set();
        this.shownTimeGaps = new Set();
        this.collectedSecrets = [];
        this.score = 0;
        this.credits = 0;
        this.correctAnswers = 0;
        this.wrongAnswers = 0;
        this.upgrades = { speed: 0, magnet: 0, efficiency: 0 };
        this.activeElapsedMs = 0;
        this.layerElapsedMs = 0;
        this.energyDrainFlashAt = 0;
        this.triggeredEnergyHazards = new Set();
        this.boostHintDone = false;
        this.hitstopUntil = 0;
        this.layerHits = 0;
        this.layerStarTargetMs = 45000;
        this.cameraKickX = 0;
        this.cameraKickY = 0;
        this.appliedKickY = 0;
        this.cameraLeadY = 0;
        this.allowVibration = Boolean(navigator.vibrate) &&
            Boolean(this.sys.game.device.input.touch);

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

        this.cameras.main.setBounds(
            -WORLD_BLEED,
            0,
            this.viewWidth + WORLD_BLEED * 2,
            this.worldHeight
        );
        this.cameras.main.alpha = 1;
        this.cameras.main.visible = true;
        this.cameras.main.zoom = 1;
        this.cameras.main.rotation = 0;
        this.cameras.main.scrollX = 0;
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
        this.layoutTopButtons();
        this.comboGlow = this.add.graphics().setScrollFactor(0).setDepth(94);
        this.magnetGlow = this.add.graphics().setDepth(7);
        this.createDeepTimeGauge();
        this.notebook = new LayerNotebookOverlay(this, () => currentRecord().discovered);
        this.layerBriefing = new LayerBriefingOverlay(this, () => this.playAreaRight || this.viewWidth);
        this.quizOverlay = new QuizOverlay(this, () => this.playAreaRight || this.viewWidth);
        this.timeGap = new TimeGapOverlay(this);
        this.upgradeOverlay = new UpgradeOverlay(this, () => this.playAreaRight || this.viewWidth);
        this.howToPlay = new HowToPlayOverlay(this);
        this.startMenu = new StartMenuOverlay(this);
        this.bindInput();
        this.resetRound();
        this.openIntro();

        this.scale.on("resize", this.handleResize, this);
        this.events.once("shutdown", this.cleanupScene, this);
        showStatus("Ready", "success");
    }

    createInterface() {
        const font = GAME_FONT;
        const shadow = { offsetX: 3, offsetY: 3, color: "#08131d", blur: 0, fill: true };

        this.titleText = this.add.text(
            18,
            16,
            this.viewWidth < 650 ? "GRAND CANYON DRILL" : "GRAND CANYON DRILL",
            {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "20px" : "30px",
            fontStyle: "bold",
            color: "#f7fbff",
            shadow
            }
        ).setScrollFactor(0).setDepth(40);
        this.progressText = this.add.text(20, 52, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "15px" : "18px",
            color: "#ffd166",
            shadow
        }).setScrollFactor(0).setDepth(40);
        this.helpText = this.add.text(this.viewWidth / 2, this.viewHeight - 12, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "16px" : "20px",
            fontStyle: "bold",
            color: "#f7fbff",
            backgroundColor: "#142330f2",
            padding: { x: 12, y: 8 },
            align: "center",
            // Dòng trạng thái xuống hàng thay vì bị cắt mất chữ ở mép màn hẹp.
            wordWrap: { width: this.viewWidth - 44, useAdvancedWrap: true },
            shadow
        }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(40);

        this.powerGraphics = this.add.graphics().setScrollFactor(0).setDepth(40);
        this.powerText = this.add.text(0, 0, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "15px" : "18px",
            fontStyle: "bold",
            color: "#f7fbff",
            shadow
        }).setScrollFactor(0).setDepth(41);

        const narrow = this.viewWidth < 650;
        this.fullscreenButton = this.add.text(
            this.viewWidth - (narrow ? 10 : 16),
            narrow ? 10 : 16,
            narrow ? "[ FULL ]" : "[ FULLSCREEN ]",
            {
                fontFamily: font,
                fontSize: narrow ? "15px" : "18px",
                fontStyle: "bold",
                color: "#f7fbff",
                backgroundColor: "#1b2b39f2",
                padding: { x: 9, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(45).setInteractive({ useHandCursor: true });
        this.fullscreenButton.on("pointerdown", () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen();
            else this.scale.startFullscreen();
        });

        this.musicButton = this.add.text(
            this.viewWidth - (narrow ? 10 : 158),
            narrow ? 44 : 16,
            `[ ${retroMusic.label()} ]`,
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "14px" : "17px",
                fontStyle: "bold",
                color: "#101923",
                backgroundColor: "#91eadc",
                padding: { x: 8, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(46).setInteractive({ useHandCursor: true });
        this.musicButton.on("pointerdown", async (pointer, localX, localY, event) => {
            event?.stopPropagation();
            await retroMusic.toggle();
            this.musicButton.setText(`[ ${retroMusic.label()} ]`);
            this.layoutTopButtons();
        });

        this.sfxButton = this.add.text(
            this.viewWidth - (narrow ? 10 : 270),
            narrow ? 78 : 16,
            `[ ${retroMusic.sfxLabel()} ]`,
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "14px" : "17px",
                fontStyle: "bold",
                color: "#101923",
                backgroundColor: "#ffd166",
                padding: { x: 8, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(46).setInteractive({ useHandCursor: true });
        this.sfxButton.on("pointerdown", async (pointer, localX, localY, event) => {
            event?.stopPropagation();
            await retroMusic.toggleSfx();
            this.sfxButton.setText(`[ ${retroMusic.sfxLabel()} ]`);
            this.layoutTopButtons();
        });

        this.fieldNotesButton = this.add.text(
            this.viewWidth - (narrow ? 10 : 380),
            narrow ? 112 : 16,
            "[ FIELD NOTES ]",
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "14px" : "17px",
                fontStyle: "bold",
                color: "#91eadc",
                backgroundColor: "#1b2b39f2",
                padding: { x: 8, y: 7 }
            }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(45).setInteractive({ useHandCursor: true });
        this.fieldNotesButton.on("pointerdown", (pointer, localX, localY, event) => {
            event?.stopPropagation();
            this.notebook?.open();
        });

        this.impactText = this.add.text(this.viewWidth / 2, this.viewHeight * 0.37, "SURFACE BREACH!", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "22px" : "32px",
            fontStyle: "bold",
            color: "#f7fbff",
            backgroundColor: "#13222ff2",
            padding: { x: 18, y: 14 },
            stroke: "#ffb35c",
            strokeThickness: 3,
            shadow
        }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);

        this.drillHudShade = this.add.rectangle(0, 0, this.viewWidth, 80, 0x101923, 0.9)
            .setOrigin(0).setScrollFactor(0).setDepth(35).setVisible(false);
        this.drillHudText = this.add.text(16, 12, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "16px" : "19px",
            fontStyle: "bold",
            color: "#f7fbff",
            lineSpacing: 7
        }).setScrollFactor(0).setDepth(36).setVisible(false);
        this.economyText = this.add.text(0, 12, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "16px" : "19px",
            fontStyle: "bold",
            color: "#91eadc",
            backgroundColor: "#101923e6",
            padding: { x: 8, y: 4 }
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(37).setVisible(false);
        this.energyGraphics = this.add.graphics().setScrollFactor(0).setDepth(36).setVisible(false);
        this.energyLabel = this.add.text(0, 0, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "14px" : "16px",
            fontStyle: "bold",
            color: "#cdd5d0"
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(37).setVisible(false);
        this.laneGraphics = this.add.graphics().setScrollFactor(0).setDepth(36).setVisible(false);

        this.layerBanner = this.add.text(this.viewWidth / 2, 96, "", {
            fontFamily: font,
            fontSize: this.viewWidth < 650 ? "17px" : "22px",
            fontStyle: "bold",
            color: "#f7fbff",
            align: "center",
            backgroundColor: "#172433e8",
            padding: { x: 16, y: 11 },
            wordWrap: { width: Math.min(540, this.viewWidth - 30), useAdvancedWrap: true },
            stroke: "#ff9f43",
            strokeThickness: 2,
            shadow
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(44).setAlpha(0);

        const compact = this.viewWidth < 720;
        // Trên màn hẹp, panel ghi chú cố định ăn hơn nửa chiều ngang. Bỏ nó đi,
        // nút FIELD NOTES vẫn mở được sổ tay đầy đủ bất cứ lúc nào.
        this.usesSideNote = !compact;
        const noteWidth = compact
            ? Math.min(270, this.viewWidth * 0.48)
            : Math.min(420, this.viewWidth * 0.32);
        const noteLeft = this.viewWidth - noteWidth - 14;
        const noteTop = 96;
        const noteHeight = Math.min(450, this.viewHeight - noteTop - 24);
        this.noteLeft = noteLeft;
        this.noteWidth = noteWidth;
        this.playAreaRight = this.usesSideNote
            ? Math.max(138, noteLeft - 18)
            : this.viewWidth - 14;
        // Chuỗi near miss nằm ngay dưới khối HUD bên trái, không tranh chỗ với nút.
        this.economyText.setPosition(16, 12);
        this.currentNotePanel = this.add.rectangle(
            noteLeft,
            noteTop,
            noteWidth,
            noteHeight,
            0x101923,
            0.94
        ).setOrigin(0).setStrokeStyle(3, 0x66e0cf, 1).setScrollFactor(0).setDepth(38).setVisible(false);
        this.currentNoteTitle = this.add.text(noteLeft + 13, noteTop + 11, "", {
            fontFamily: font,
            fontSize: compact ? "18px" : "22px",
            fontStyle: "bold",
            color: "#f7fbff",
            wordWrap: { width: noteWidth - 26, useAdvancedWrap: true }
        }).setScrollFactor(0).setDepth(39).setVisible(false);
        this.currentNoteBody = this.add.text(noteLeft + 13, noteTop + (compact ? 48 : 52), "", {
            fontFamily: font,
            fontSize: compact ? "18px" : "20px",
            color: "#eaf2f8",
            lineSpacing: compact ? 9 : 11,
            wordWrap: { width: noteWidth - 26, useAdvancedWrap: true }
        }).setScrollFactor(0).setDepth(39).setVisible(false);
        this.currentNoteHint = this.add.text(
            noteLeft + 13,
            noteTop + noteHeight - 44,
            "Collect a sample to reveal its field note.",
            {
                fontFamily: font,
                fontSize: compact ? "16px" : "17px",
                fontStyle: "italic",
                color: "#91eadc",
                wordWrap: { width: noteWidth - 26, useAdvancedWrap: true }
            }
        ).setScrollFactor(0).setDepth(39).setVisible(false);

        this.boostButton = this.add.text(
            18,
            this.viewHeight - 74,
            "[ HOLD BOOST • SPACE ]",
            {
                fontFamily: font,
                fontSize: this.viewWidth < 650 ? "16px" : "18px",
                fontStyle: "bold",
                color: "#101923",
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
            fontFamily: GAME_FONT,
            fontSize: this.viewWidth < 650 ? "18px" : "22px",
            fontStyle: "bold",
            color: "#eaf2f8",
            align: "left",
            lineSpacing: 10,
            backgroundColor: "#101923f2",
            padding: { x: 18, y: 15 },
            wordWrap: { width: Math.min(610, this.viewWidth - 34), useAdvancedWrap: true },
            stroke: "#172433",
            strokeThickness: 2
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(59).setVisible(false);
    }

    // Trước đây bốn nút đặt ở các khoảng cách cố định đoán sẵn, nên nhãn dài
    // ngắn khác nhau là chúng dính vào nhau. Giờ đo rồi xếp.
    layoutTopButtons() {
        const buttons = [
            this.fullscreenButton,
            this.musicButton,
            this.sfxButton,
            this.fieldNotesButton
        ].filter(Boolean);
        if (!buttons.length) return;
        if (this.viewWidth < 650) {
            buttons.forEach((button, index) => button.setPosition(this.viewWidth - 10, 10 + index * 34));
            this.topButtonsLeft = this.viewWidth - 10 -
                Math.max(...buttons.map((button) => button.width));
            return;
        }
        let right = this.viewWidth - 16;
        buttons.forEach((button) => {
            button.setPosition(right, 16);
            right -= button.width + 12;
        });
        this.topButtonsLeft = right + 12;
    }

    bindInput() {
        this.drill.on("pointerdown", (pointer) => {
            this.unlockAudio();
            if (this.roundState !== "ready" || this.notebook?.isOpen) return;
            this.roundState = "dragging";
            this.dragPointerId = pointer.id;
            this.drill.input.cursor = "grabbing";
            this.helpText.setText("PULL UP • RELEASE");
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
        this.layoutTopButtons();
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
        this.pendingTapDistance = 0;
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);
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
        this.energyLabel?.setVisible(false);
        this.laneGraphics.setVisible(false);
        this.deepTimeGraphics?.setVisible(false);
        this.boostButton.setVisible(false);
        this.secretPanel.setVisible(false);
        this.currentNotePanel.setVisible(false);
        this.currentNoteTitle.setVisible(false);
        this.currentNoteBody.setVisible(false);
        this.currentNoteHint.setVisible(false);
        this.helpText.setText(
            this.record.discovered > 0
                ? "AIM AT SHAFT • PULL • RELEASE"
                : "PULL UP • RELEASE"
        );
        this.drawBands();
        this.drawPowerMeter();
    }

    openIntro() {
        this.roundState = "instructions";
        if (!hasSeenTutorial()) {
            this.openHowToPlay();
            return;
        }
        this.startMenu.open({
            subtitle: this.record.bestScore > 0
                ? `BEST ${this.record.bestScore} • ${this.record.discovered}/${ROCK_LAYERS.length} LAYERS FOUND`
                : "10 LAYERS • FIELD EXPEDITION",
            onPlay: () => this.beginExpedition(),
            onHowToPlay: () => this.openHowToPlay()
        });
    }

    openHowToPlay() {
        this.roundState = "instructions";
        this.howToPlay.open(() => {
            markTutorialSeen();
            this.beginExpedition();
        });
    }

    beginExpedition() {
        this.roundState = "ready";
        retroMusic.setIntensity(0);
        this.helpText.setText(
            this.record.discovered > 0
                ? "AIM AT SHAFT • PULL • RELEASE"
                : "PULL UP • RELEASE"
        );
        showStatus("Expedition ready", "success");
    }

    // Advanced moves are taught the moment the player meets them, once ever.
    showHintOnce(name, message) {
        if (hasSeenHint(name)) return;
        markHintSeen(name);
        this.showHint(message);
    }

    // Đóng băng vài chục mili giây: cú va có sức nặng hơn mọi kiểu rung camera.
    createDeepTimeGauge() {
        this.deepTimeGraphics = this.add.graphics()
            .setScrollFactor(0).setDepth(40).setVisible(false);
        this.deepTimeLabel = "";
    }

    // Thời gian địa chất là khái niệm khó dạy nhất. Hiện nó chạy liên tục theo
    // độ sâu thì học sinh cảm được nó, thay vì đọc một con số rời rạc.
    drawDeepTime(layerIndex) {
        if (!this.deepTimeGraphics?.visible) return;
        const top = 118;
        const bottom = Math.max(top + 90, this.viewHeight - 132);
        const x = this.corridorLeft + 16;
        const current = ROCK_LAYERS[layerIndex].ma;
        const previous = ROCK_LAYERS[Math.max(0, layerIndex - 1)].ma;
        const next = layerIndex + 1 < ROCK_LAYERS.length
            ? ROCK_LAYERS[layerIndex + 1].ma
            : current + (current - previous) * 0.3;
        const layerTop = this.layerStartY + layerIndex * this.layerHeight;
        const within = Phaser.Math.Clamp((this.drill.y - layerTop) / this.layerHeight, 0, 1);
        const ma = current + (next - current) * within;
        const markerY = top + (bottom - top) * ((layerIndex + within) / ROCK_LAYERS.length);

        const gauge = this.deepTimeGraphics;
        gauge.clear();
        gauge.fillStyle(0x14232b, 0.82).fillRect(x - 5, top - 8, 18, bottom - top + 16);
        gauge.fillStyle(0x2b4350, 1).fillRect(x, top, 8, bottom - top);
        ROCK_LAYERS.forEach((entry, index) => {
            const tickY = top + (bottom - top) * (index / ROCK_LAYERS.length);
            gauge.fillStyle(index <= layerIndex ? 0xf0c66a : 0x4a5e68, 1);
            gauge.fillRect(x - 3, tickY, 14, 3);
        });
        gauge.fillStyle(0x78d5c5, 1).fillRect(x - 7, markerY - 2, 22, 5);

        // Con số đi vào HUD để không bao giờ đè lên câu hỏi của cổng.
        this.deepTimeLabel = `\u2248 ${Math.round(ma).toLocaleString()} Ma`;
    }

    hitstop(duration = 70) {
        this.hitstopUntil = Math.max(this.hitstopUntil, this.time.now + duration);
    }

    // Giật camera theo đúng hướng va chạm, thay cho rung ngẫu nhiên vô hướng.
    cameraKick(dirX, dirY, strength = 1) {
        this.cameraKickX = Phaser.Math.Clamp(
            dirX * 16 * strength,
            -WORLD_BLEED * 0.7,
            WORLD_BLEED * 0.7
        );
        this.cameraKickY = Phaser.Math.Clamp(dirY * 13 * strength, -28, 28);
    }

    rumble(pattern) {
        if (!this.allowVibration) return;
        try {
            navigator.vibrate(pattern);
        } catch (error) {
            this.allowVibration = false;
        }
    }

    // Viền màn hình sáng dần theo chuỗi near miss, tắt dần cùng đồng hồ combo.
    drawComboGlow(time) {
        if (!this.comboGlow) return;
        this.comboGlow.clear();
        const active = this.nearMissCombo > 0 && time <= this.nearMissExpiresAt;
        if (!active) return;
        const remaining = Phaser.Math.Clamp((this.nearMissExpiresAt - time) / 2500, 0, 1);
        const level = Phaser.Math.Clamp(this.nearMissCombo, 1, 4);
        const colors = [0x66e0cf, 0x91eadc, 0xffd166, 0xff9f5a];
        const thickness = 5 + level * 6;
        const alpha = (0.14 + level * 0.09) * (0.35 + remaining * 0.65);
        this.comboGlow.lineStyle(thickness, colors[level - 1], alpha);
        this.comboGlow.strokeRect(
            thickness / 2,
            thickness / 2,
            this.viewWidth - thickness,
            this.viewHeight - thickness
        );
    }

    drawMagnetGlow(radius, active, time) {
        this.magnetGlow.clear();
        if (!active || radius <= 0) return;
        const pulse = 0.72 + Math.sin(time * 0.012) * 0.16;
        this.magnetGlow
            .lineStyle(3, 0x66e0cf, pulse * 0.5)
            .strokeCircle(this.drill.x, this.drill.y, radius)
            .lineStyle(2, 0xf7fbff, pulse * 0.32)
            .strokeCircle(this.drill.x, this.drill.y, Math.max(38, radius * 0.42));
    }

    // Chuyển tầng: một dải đá quét ngang màn hình theo màu của tầng mới.
    playLayerWipe(layer) {
        const height = Math.max(120, this.viewHeight * 0.32);
        const band = this.add.rectangle(
            this.viewWidth / 2,
            -height,
            this.viewWidth,
            height,
            layer.color,
            1
        ).setScrollFactor(0).setDepth(80);
        const edge = this.add.rectangle(
            this.viewWidth / 2,
            -height,
            this.viewWidth,
            7,
            layer.secondary ?? 0xf7fbff,
            1
        ).setScrollFactor(0).setDepth(81);
        const travel = this.viewHeight + height;
        [band, edge].forEach((part, index) => {
            this.tweens.add({
                targets: part,
                y: part.y + travel + (index === 1 ? height / 2 : 0),
                alpha: index === 0 ? 0.25 : 0.9,
                duration: 430,
                ease: "Cubic.In",
                onComplete: () => part.destroy()
            });
        });
    }

    showHint(message) {
        const centerX = (this.corridorLeft + this.corridorRight) / 2 || this.viewWidth / 2;
        const chip = this.add.text(centerX, this.viewHeight * 0.3, message, {
            fontFamily: GAME_FONT,
            fontSize: this.viewWidth < 650 ? "20px" : "27px",
            fontStyle: "bold",
            color: UI.keywordHex,
            backgroundColor: "#14232bf2",
            padding: { x: 18, y: 12 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(96).setAlpha(0);
        this.tweens.add({ targets: chip, alpha: 1, duration: 180, ease: "Quad.Out" });
        this.tweens.add({
            targets: chip,
            alpha: 0,
            y: chip.y - 22,
            delay: 2300,
            duration: 420,
            ease: "Cubic.Out",
            onComplete: () => chip.destroy()
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
        this.bandGraphics.clear().lineStyle(width + 3, 0x08131d, 1);
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
        const color = this.power > 0.75 ? 0xffd166 : 0xf7fbff;
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
        const color = this.power > 0.82 ? 0xff5d43 : this.power > 0.5 ? 0xffa044 : 0x66e0cf;
        this.powerGraphics.clear().fillStyle(0x08131d, 0.92).fillRect(x, y, width, 22);
        this.powerGraphics.fillStyle(0xf7fbff, 1).fillRect(x + 4, y + 4, width - 8, 14);
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
        retroMusic.setIntensity(1);
        this.dragPointerId = null;
        this.velocity.copy(this.predictedVelocity());
        this.launchPower = Math.round(this.power * 100);
        retroMusic.effect("launch");
        this.bandGraphics.clear();
        this.aimGraphics.clear();
        this.helpText.setText("INCOMING!");
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
        if (this.startMenu?.isOpen) {
            this.startMenu.handleKeys(this.keys);
            return;
        }
        if (this.howToPlay?.isOpen) {
            this.howToPlay.handleKeys(this.keys);
            return;
        }
        if (this.timeGap?.isOpen) {
            if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.continue)) {
                this.timeGap.tryContinue();
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

        if (time < this.hitstopUntil) return;
        // Cú giật ngang lắng lại cả khi đang mở câu hỏi, không để camera kẹt lệch.
        if (this.roundState !== "drilling" && this.cameraKickX !== 0) {
            this.cameraKickX *= 0.8;
            if (Math.abs(this.cameraKickX) < 0.3) this.cameraKickX = 0;
            this.cameras.main.scrollX = this.cameraKickX;
        }
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
        this.helpText.setText(`IMPACT ${Math.round(impactSpeed)}`);

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
        this.shaftGraphics.fillStyle(0x101923, 0.025)
            .fillRect(0, this.layerStartY, this.viewWidth, height);
    }

    setDrillingInterface() {
        retroMusic.setIntensity(2);
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
        this.energyLabel.setVisible(true);
        this.laneGraphics.setVisible(true);
        this.boostButton.setVisible(true);
        this.setCurrentNoteVisible(true);
        const playCenter = (this.corridorLeft + this.corridorRight) / 2;
        this.helpText.setX(playCenter);
        this.layerBanner.setX(playCenter);
        const startLayer = ROCK_LAYERS[Math.max(0, this.currentLayer)];
        this.helpText.setText(
            `${startLayer.name.toUpperCase()}  •  ${startLayer.rockType.toUpperCase()}`
        );
        this.deepTimeGraphics.setVisible(true);
        this.drawEnergyBar();
        this.drawSampleIndicator(0);
    }

    updateDrilling(time, delta) {
        const dt = Math.min(delta / 1000, 0.034);
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
        this.challengeClockMs += delta;
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
        if (!this.boostHintDone && movement.lengthSq() > 0.01) {
            this.boostHintDone = true;
            this.showHintOnce("boost", "HOLD SPACE TO BOOST");
        }
        this.drill.setScale(boosting ? 1.1 : 1);
        const fuelDrainMultiplier = 0.85 ** this.upgrades.efficiency;
        const boostDrainPercent = (6 * fuelDrainMultiplier).toFixed(1);
        this.boostButton
            .setText(boosting ? `[ BOOST • FUEL −${boostDrainPercent}%/s ]` : "[ BOOST • SPACE ]")
            .setColor(boosting ? "#f7fbff" : "#101923")
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
            this.hitstop(45);
            this.cameraKick(Math.sign(this.drill.x - beforeX) || 0, Math.sign(this.drill.y - beforeY) || 0, 0.5);
            this.rumble(18);
            this.helpText.setText("GATE • FIND THE GAP");
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
        const fuelConsumptionMultiplier = 4.5;
        this.energy -= layer.resistance * passFactor *
            (travelDistance / (this.layerHeight * 15)) * fuelConsumptionMultiplier *
            fuelDrainMultiplier;
        if (boosting) {
            this.energy -= this.energyMax * 0.06 * fuelDrainMultiplier *
                Math.min(delta / 1000, 0.05);
        }
        if (environment.energyHitKey && !this.triggeredEnergyHazards.has(environment.energyHitKey)) {
            this.triggeredEnergyHazards.add(environment.energyHitKey);
            this.energy -= this.energyMax * 0.15;
            this.cameras.main.flash(110, 255, 96, 48, false);
            retroMusic.effect("hazard");
            this.showScreenPopup("HOT BASALT  −15% FUEL", "#ff9f85");
            this.helpText.setText("HOT ROCK • −15% FUEL");
            this.alertUntil = time + 1350;
        }
        // Tiếng máy khoan chạy liên tục gây nhức đầu và lấn tiếng mẫu vật, va
        // chạm, chuyển tầng — để im.
        retroMusic.setMotor(false);
        retroMusic.setAmbience(true, layerIndex / Math.max(1, ROCK_LAYERS.length - 1));
        // Sắp cạn nhiên liệu thì nhạc nhanh lên và dày hat — hồi hộp mà không cần chữ.
        retroMusic.setIntensity(this.energy / this.energyMax < 0.25 ? 3 : 2);

        const magnetPull = this.evidenceCourse.attractCollectibles(
            this.drill.x,
            this.drill.y,
            layerIndex,
            this.upgrades.magnet,
            delta
        );
        this.drawMagnetGlow(magnetPull.radius, magnetPull.count > 0, time);
        const sample = this.evidenceCourse.findSampleCollision(
            this.drill.x,
            this.drill.y,
            33
        );
        if (sample) this.collectEvidence(sample, time);

        const fuelCan = this.evidenceCourse.findFuelCollision(
            this.drill.x,
            this.drill.y,
            34
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
            // Dòng trạng thái mặc định gọi đúng tên hệ tầng đang khoan.
            this.helpText.setText(
                environment.label
                    ? `${environment.label}  •  ${layer.name.toUpperCase()}`
                    : `${layer.name.toUpperCase()}  •  ${layer.rockType.toUpperCase()}`
            );
        }

        if (travelDistance > 0.5) this.spawnDrillParticles(time, layer);
        if (boosting) this.spawnBoostTrail(time, layer);
        this.cameraKickX *= 0.82;
        this.cameraKickY *= 0.82;
        if (Math.abs(this.cameraKickX) < 0.3) this.cameraKickX = 0;
        if (Math.abs(this.cameraKickY) < 0.3) this.cameraKickY = 0;
        // Camera nhìn trước một chút về phía đang lái, mạnh hơn khi tăng tốc.
        const leadTarget = movement.y * this.viewHeight * (boosting ? 0.062 : 0.036);
        this.cameraLeadY = Phaser.Math.Linear(this.cameraLeadY, leadTarget, 0.08);
        const desiredScroll = Phaser.Math.Clamp(
            this.layerStartY + (layerIndex + 0.5) * this.layerHeight -
                this.viewHeight * 0.52 + this.cameraLeadY,
            0,
            this.worldHeight - this.viewHeight
        );
        const settled = Phaser.Math.Linear(
            this.cameras.main.scrollY - this.appliedKickY,
            desiredScroll,
            0.14
        );
        this.appliedKickY = this.cameraKickY;
        this.cameras.main.scrollY = settled + this.cameraKickY;
        this.cameras.main.scrollX = this.cameraKickX;
        this.drawComboGlow(time);
        this.drawDeepTime(layerIndex);
        const energyPercent = Math.round(Phaser.Math.Clamp(this.energy / this.energyMax, 0, 1) * 100);
        // Một khối duy nhất bên trái. Trước đây điểm số là một text riêng
        // căn phải, nó đâm thẳng vào hàng nút ở góc phải.
        const compactHud = this.viewWidth < 650;
        // Số mẫu đã có ô ở dưới, nhiên liệu đã có thanh riêng, số lần va nằm ở
        // màn kết — bảng này chỉ giữ thứ không hiện ở đâu khác.
        this.drillHudText.setText(compactHud
            ? `RUN ${formatRunTime(this.activeElapsedMs)}\n` +
                `${this.score} PTS  •  ${this.credits} CR\n` +
                `${String(layerIndex + 1).padStart(2, "0")}/${ROCK_LAYERS.length}  •  ${this.deepTimeLabel}`
            : `RUN ${formatRunTime(this.activeElapsedMs)}  •  LAYER ${formatRunTime(this.layerElapsedMs)}\n` +
                `SCORE ${this.score}  •  CREDITS ${this.credits}\n` +
                `${String(layerIndex + 1).padStart(2, "0")}/${ROCK_LAYERS.length} ${layer.name}  •  ${this.deepTimeLabel}`
        );
        // Chữ HUD phải tránh cả hàng nút lẫn thanh nhiên liệu ở góc phải.
        const hudLimit = Math.min(
            this.topButtonsLeft || this.viewWidth - 150,
            compactHud ? this.viewWidth : (this.energyBarLeft || this.viewWidth)
        ) - 22;
        this.fitTextWidth(this.drillHudText, hudLimit, 13);
        this.drillHudShade
            .setSize(Math.min(this.viewWidth, this.drillHudText.width + 34), this.drillHudText.height + 24);
        this.economyText.setPosition(16, this.drillHudText.height + 22);
        const comboActive = this.nearMissCombo > 0 && time <= this.nearMissExpiresAt;
        this.economyText
            .setText(comboActive ? `NEAR MISS x${this.nearMissCombo}` : "")
            .setVisible(comboActive);
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

    // Va đá mở bảng câu hỏi như bản gốc, nhưng cú va được giữ lại sức nặng:
    // khựng hình trước, bảng hỏi mở sau khi cảm giác va đã đọng lại.
    handleObstacleCollision(obstacle, layer, time) {
        if (this.roundState !== "drilling") return;
        this.roundState = "quiz";
        this.collisionCooldownUntil = time + 1200;
        this.collisions += 1;
        this.layerHits += 1;
        this.nearMissCombo = 0;
        this.nearMissExpiresAt = 0;
        this.touchBoostHeld = false;
        this.boostPointerId = null;
        this.wasBoosting = false;
        this.drill.setScale(1);
        this.boostButton.setVisible(false);
        this.comboGlow?.clear();
        this.magnetGlow?.clear();
        retroMusic.effect("bump");
        retroMusic.setMotor(false);
        retroMusic.setAmbience(false);
        this.cameras.main.shake(150, 0.006);
        const knockDirection = this.drill.x <= obstacle.x ? -1 : 1;
        this.hitstop(70);
        this.cameraKick(knockDirection, 0.55, 1);
        this.rumble([26, 40, 18]);
        this.drill.x = Phaser.Math.Clamp(
            this.drill.x + knockDirection * 30,
            this.corridorLeft,
            this.corridorRight
        );
        this.drill.y -= 8;
        this.helpText.setText("ROCK QUIZ • NOTE HIDDEN");
        this.setCurrentNoteVisible(false);
        retroMusic.setReading(true);
        const quiz = getLayerQuiz(layer, obstacle.quizIndex);
        this.time.delayedCall(140, () => {
            if (this.roundState !== "quiz") return;
            this.quizOverlay.open(quiz, (correct) => this.resolveRockQuiz(obstacle, layer, correct));
        });
    }

    resolveRockQuiz(obstacle, layer, correct) {
        retroMusic.setReading(false);
        this.evidenceCourse.resolveObstacle(obstacle, correct);
        if (correct) {
            this.correctAnswers += 1;
            this.score += 50;
            retroMusic.effect("correct");
            this.cameras.main.flash(90, 105, 230, 200, false);
            this.showScreenPopup("CORRECT  +50", "#91eadc");
            this.helpText.setText("CORRECT +50 • ROCK CLEARED");
        } else {
            this.wrongAnswers += 1;
            this.score = Math.max(0, this.score - 100);
            this.slowUntil = this.time.now + 2000;
            this.energy -= this.energyMax * 0.07;
            retroMusic.effect("wrong");
            this.rumble([30, 50, 30]);
            this.showScreenPopup("WRONG  −100 • SLOW 2s", "#ff9f85");
            this.helpText.setText("−100 • SLOW 2s • CHECK NOTE");
        }
        this.setCurrentNoteVisible(true);
        this.roundState = "drilling";
        this.boostButton.setVisible(true);
        this.alertUntil = this.time.now + 1500;
    }

    registerNearMiss(obstacle, time) {
        this.evidenceCourse.markNearMiss(obstacle);
        if (time > this.nearMissExpiresAt) this.nearMissCombo = 0;
        this.nearMissCombo = Math.min(4, this.nearMissCombo + 1);
        this.nearMissExpiresAt = time + 2500;
        this.totalNearMisses += 1;
        this.bestNearMissCombo = Math.max(this.bestNearMissCombo, this.nearMissCombo);
        const scoreGain = 50 * this.nearMissCombo;
        this.score += scoreGain;
        retroMusic.effect("nearMiss", { combo: this.nearMissCombo });
        this.cameras.main.shake(70, 0.0016);
        this.cameras.main.flash(45, 143, 242, 220, false);
        this.rumble(12);
        const comboText = this.nearMissCombo > 1 ? ` x${this.nearMissCombo}` : "";
        this.showHintOnce("nearMiss", "CLOSE PASS — NEAR MISS!");
        this.showScreenPopup(`NEAR MISS${comboText}  +${scoreGain}`, "#91eadc");
        this.helpText.setText(
            this.nearMissCombo > 1
                ? `COMBO x${this.nearMissCombo} • KEEP GOING`
                : "NEAR MISS • CHAIN WITHIN 2.5s"
        );
        this.alertUntil = time + 900;
    }

    // Ghi chú dài ngắn khác nhau; thu chữ lại cho vừa panel thay vì để tràn đáy.
    fitTextHeight(text, maxHeight, minSize = 13) {
        if (!text || maxHeight <= 0) return;
        const original = text.getData("baseFontSize") ||
            Number.parseFloat(text.style.fontSize) || 18;
        text.setData("baseFontSize", original);
        let size = original;
        text.setFontSize(size);
        while (text.height > maxHeight && size > minSize) {
            size -= 1;
            text.setFontSize(size);
        }
    }

    // Tên tầng dài ngắn khác nhau; thu chữ lại thay vì để nó đâm vào hàng nút.
    fitTextWidth(text, maxWidth, minSize = 13) {
        if (!text || maxWidth <= 0) return;
        const original = text.getData("baseFontSize") ||
            Number.parseFloat(text.style.fontSize) || 19;
        text.setData("baseFontSize", original);
        let size = original;
        text.setFontSize(size);
        while (text.width > maxWidth && size > minSize) {
            size -= 1;
            text.setFontSize(size);
        }
    }

    showScreenPopup(message, color) {
        const centerX = (this.corridorLeft + this.corridorRight) / 2;
        // Xếp hàng theo chiều dọc: hai thông báo liền nhau không đè lên nhau.
        const now = this.time.now;
        if (now - (this.lastPopupAt || 0) > 900) this.popupSlot = 0;
        else this.popupSlot = ((this.popupSlot || 0) + 1) % 3;
        this.lastPopupAt = now;
        const popup = this.add.text(centerX, this.viewHeight * 0.44 + this.popupSlot * 42, message, {
            fontFamily: GAME_FONT,
            fontSize: this.viewWidth < 650 ? "20px" : "28px",
            fontStyle: "bold",
            color,
            backgroundColor: "#101923ee",
            padding: { x: 14, y: 10 },
            stroke: "#101923",
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
        markSampleFound(sample.layerIndex, sample.clueIndex);
        this.score += 100;
        const creditGain = 50;
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
            fontFamily: GAME_FONT,
            fontSize: "19px",
            fontStyle: "bold",
            color: "#ffd166",
            align: "center",
            stroke: "#101923",
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
        this.helpText.setText(`${sample.clue.type} SAMPLE • +100 • +${creditGain} CREDITS`);
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
                this.showScreenPopup("FUEL FULL • SAVE IT", "#91eadc");
                this.helpText.setText("FUEL FULL");
                this.alertUntil = time + 1200;
            }
            return;
        }
        this.energy = Math.min(this.energyMax, this.energy + this.energyMax * 0.25);
        const restored = Math.max(0, Math.round((this.energy - before) / this.energyMax * 100));
        this.evidenceCourse.collectFuelCan(fuelCan);
        retroMusic.effect("fuel");
        this.cameras.main.flash(90, 69, 214, 196, false);
        this.showScreenPopup(`FUEL +${restored}%`, "#91eadc");
        this.helpText.setText(`FUEL +${restored}%`);
        this.alertUntil = time + 1250;
    }

    // Ba sao: xong tầng · không va đá · dưới mốc thời gian.
    // Sao một ai cũng lấy được; sao ba phải thật sự hiểu tầng đó.
    scoreLayerStars(index) {
        let stars = 1;
        if (this.layerHits === 0) stars += 1;
        if (this.layerElapsedMs <= this.layerStarTargetMs) stars += 1;
        recordLayerStars(index, stars);
        return stars;
    }

    completeLayer(index) {
        if (this.completedLayers.has(index)) return;
        this.magnetGlow.clear();
        this.completedLayers.add(index);
        const layer = ROCK_LAYERS[index];
        const stars = this.scoreLayerStars(index);
        const starLine = `${"\u2605".repeat(stars)}${"\u2606".repeat(3 - stars)}`;
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
                .setText(`FINAL CORE COMPLETE  ${starLine}\n${layer.name} • ${layer.ma} Ma\n\n${lines}`)
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
        this.openUpgradeShop(index, layer, stars);
    }

    upgradeCost(type) {
        return 200;
    }

    openUpgradeShop(index, layer, stars = 1) {
        const choices = ["speed", "magnet", "efficiency"].map((type) => {
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
            stars,
            noHits: this.layerHits === 0,
            underTime: this.layerElapsedMs <= this.layerStarTargetMs,
            targetSeconds: Math.round(this.layerStarTargetMs / 1000),
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
                : type === "efficiency"
                    ? `FUEL SAVE LV ${this.upgrades.efficiency} • −${Math.round((1 - 0.85 ** this.upgrades.efficiency) * 100)}% DRAIN`
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
        this.helpText.setText("NEXT LAYER");
        this.alertUntil = this.time.now + 1000;
    }

    enterLayer(index) {
        if (index < 0 || index >= ROCK_LAYERS.length || index === this.currentLayer) return;
        this.currentLayer = index;
        this.layerElapsedMs = 0;
        this.layerHits = 0;
        // Thang âm, cao độ gốc và mật độ nốt của nhạc đổi theo tầng đá.
        retroMusic.setLayer(index);
        retroMusic.resetCollectLadder();
        const layer = ROCK_LAYERS[index];
        const challenge = getLayerChallenge(index);
        const isNew = index >= this.previousBest;
        const alreadyBriefed = this.briefedLayers.has(index);
        this.playLayerWipe(layer);
        this.renderCurrentLayerNote(index);

        this.layerBanner.setText(
            `${isNew ? "NEW" : "RESURVEY"} ${String(index + 1).padStart(2, "0")}/${ROCK_LAYERS.length} • ${layer.name} • ${layer.ma} Ma\n` +
            `${challenge.name} • ${layer.rockType}`
        );
        this.tweens.killTweensOf(this.layerBanner);
        if (this.viewWidth < 650 || !alreadyBriefed) {
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

        // Mặt bất chỉnh hợp phải được cảm thấy trước khi tầng mới tự giới thiệu.
        const gap = timeGapFor(index, ROCK_LAYERS);
        if (gap && !this.shownTimeGaps.has(index)) {
            this.shownTimeGaps.add(index);
            const previousState = this.roundState;
            this.roundState = "timeGap";
            this.boostButton.setVisible(false);
            retroMusic.setMotor(false);
            retroMusic.setAmbience(false);
            this.timeGap.open(gap, () => {
                this.roundState = previousState === "briefing" ? previousState : "drilling";
                this.boostButton.setVisible(true);
                this.openLayerBriefing(index, layer, challenge, isNew, alreadyBriefed);
            });
            return;
        }
        this.openLayerBriefing(index, layer, challenge, isNew, alreadyBriefed);
    }

    openLayerBriefing(index, layer, challenge, isNew, alreadyBriefed) {
        if (!alreadyBriefed) {
            this.briefedLayers.add(index);
            this.roundState = "briefing";
            this.boostButton.setVisible(false);
            retroMusic.setMotor(false);
            retroMusic.setAmbience(false);
            retroMusic.setReading(true);
            this.layerBriefing.open({
                layer,
                index,
                total: ROCK_LAYERS.length,
                challenge,
                isNew,
                story: storyFor(index)
            }, () => {
                if (this.roundState !== "briefing") return;
                this.roundState = "drilling";
                retroMusic.setReading(false);
                retroMusic.setIntensity(2);
                this.boostButton.setVisible(true);
                this.layerEntryGraceUntil = this.time.now + 1500;
                this.collisionCooldownUntil = Math.max(this.collisionCooldownUntil, this.layerEntryGraceUntil);
                retroMusic.effect("layer");
                this.helpText.setText(`${layer.name.toUpperCase()}  •  ${layer.rockType.toUpperCase()}`);
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
            `${String(index + 1).padStart(2, "0")}/10  ${layer.name}`
        );
        const shortLabels = {
            AGE: "AGE",
            ROCK: "ROCK",
            FIELD: "LOOK",
            ENV: "FORMED",
            LIFE: "LIFE",
            EVENT: "EVENT"
        };
        this.currentNoteBody.setText(evidence.map((clue, clueIndex) => {
            const marker = collected.has(clueIndex) ? "✓" : "○";
            const type = shortLabels[clue?.type] || "NOTE";
            const note = clue?.note || clue?.text || "Field evidence unavailable.";
            return `${marker} ${type} · ${note}`;
        }).join("\n"));
        this.currentNoteHint.setText(
            `${collected.size}/5 • +100 SCORE + CREDITS EACH`
        );
        // Ghi chú của mỗi tầng dài ngắn khác nhau — thu cho vừa panel.
        const bodyRoom = this.currentNoteHint.y - this.currentNoteBody.y - 12;
        this.fitTextHeight(this.currentNoteBody, bodyRoom, 13);
    }

    setCurrentNoteVisible(visible) {
        if (!this.usesSideNote) visible = false;
        [
            this.currentNotePanel,
            this.currentNoteTitle,
            this.currentNoteBody,
            this.currentNoteHint
        ].forEach((item) => item?.setVisible(visible));
    }

    // Đá mềm thì bụi mù, đá cứng thì bắn tia lửa. Người chơi nhìn ra độ cứng
    // của tầng mà không cần đọc con số nào.
    spawnDrillParticles(time, layer) {
        const hard = layer.resistance >= 18;
        if (time - this.lastDrillParticleAt < (hard ? 58 : 80)) return;
        this.lastDrillParticleAt = time;
        const angle = Phaser.Math.DegToRad(this.drill.angle);
        const tipX = this.drill.x + Math.sin(angle) * 39;
        const tipY = this.drill.y + Math.cos(angle) * 39;

        if (hard) {
            for (let index = 0; index < 5; index += 1) {
                const spark = this.add.rectangle(
                    tipX + Phaser.Math.Between(-5, 5),
                    tipY + Phaser.Math.Between(-5, 5),
                    Phaser.Math.Between(2, 4),
                    Phaser.Math.Between(2, 9),
                    index % 2 === 0 ? 0xfff3c4 : 0xffd166
                ).setDepth(9);
                this.tweens.add({
                    targets: spark,
                    x: spark.x + Phaser.Math.Between(-90, 90),
                    y: spark.y + Phaser.Math.Between(-34, 60),
                    angle: Phaser.Math.Between(-220, 220),
                    alpha: 0,
                    duration: Phaser.Math.Between(150, 260),
                    ease: "Quad.Out",
                    onComplete: () => spark.destroy()
                });
            }
            return;
        }

        for (let index = 0; index < 4; index += 1) {
            const puff = this.add.rectangle(
                tipX + Phaser.Math.Between(-13, 13),
                tipY + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(9, 20),
                Phaser.Math.Between(7, 15),
                index === 0 ? (layer.secondary ?? layer.color) : layer.color,
                0.55
            ).setDepth(9);
            this.tweens.add({
                targets: puff,
                x: puff.x + Phaser.Math.Between(-46, 46),
                y: puff.y + Phaser.Math.Between(-28, 34),
                scaleX: 1.7,
                scaleY: 1.7,
                alpha: 0,
                duration: Phaser.Math.Between(360, 620),
                ease: "Sine.Out",
                onComplete: () => puff.destroy()
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
            Phaser.Utils.Array.GetRandom([0x91eadc, 0xffd166, layer.color]),
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

    // Dải trên cùng chỉ còn chữ HUD và hàng nút. Nhiên liệu xuống hàng dưới,
    // nằm cạnh ô mẫu vật — hai thứ người chơi liếc nhiều nhất, cùng một chỗ.
    hudBottomRowY() {
        return this.viewHeight - 118;
    }

    drawEnergyBar() {
        if (!this.energyGraphics.visible || !this.energyMax) return;
        const right = this.playAreaRight || this.viewWidth;
        const narrow = this.viewWidth < 650;
        const width = Math.min(narrow ? 300 : 270, (right - this.corridorLeft) * 0.46);
        // Màn rộng: nhiên liệu về góc trên phải như cũ. Màn hẹp: giữ ở hàng dưới,
        // vì góc trên phải là chỗ của cột nút.
        const x = narrow ? this.corridorLeft + 4 : right - width - 8;
        const y = narrow ? this.hudBottomRowY() : 52;
        const ratio = Phaser.Math.Clamp(this.energy / this.energyMax, 0, 1);
        const color = ratio > 0.55 ? 0x66e0cf : ratio > 0.25 ? 0xffa044 : 0xff5d43;
        this.energyGraphics.clear().fillStyle(0x101923, 0.92).fillRect(x - 4, y - 6, width + 8, 32);
        this.energyGraphics.fillStyle(0x0e0a10, 1).fillRect(x, y, width, 20);
        this.energyGraphics.fillStyle(0xf7fbff, 1).fillRect(x + 3, y + 3, width - 6, 14);
        this.energyGraphics.fillStyle(color, 1).fillRect(x + 3, y + 3, (width - 6) * ratio, 14);
        this.energyBarLeft = x;
        // Màn rộng: nhãn nằm dưới thanh, tránh hàng nút. Màn hẹp: nằm trên,
        // tránh ô mẫu vật ở hàng dưới.
        this.energyLabel
            .setOrigin(1, narrow ? 1 : 0)
            .setPosition(x + width, narrow ? y - 5 : y + 25)
            .setText(`FUEL ${Math.round(ratio * 100)}%`)
            .setColor(ratio > 0.25 ? "#cdd5d0" : "#ff9f85");
    }

    drawSampleIndicator(layerIndex) {
        if (!this.laneGraphics.visible) return;
        const y = this.hudBottomRowY() + 10;
        const gap = 34;
        const right = this.playAreaRight || this.viewWidth;
        const center = right - 12 - gap * 2 - 10;
        const collected = this.layerSamples[layerIndex] || new Set();
        const colors = [0xf6e27a, 0xffa044, 0xf28dc8, 0x66e0cf, 0xffd166];
        this.laneGraphics.clear();
        for (let clue = 0; clue < 5; clue += 1) {
            const found = collected.has(clue);
            const x = center + (clue - 2) * gap;
            this.laneGraphics.fillStyle(found ? colors[clue] : 0x3b2a32, 1);
            this.laneGraphics.lineStyle(2, found ? 0xf7fbff : 0x826b69, 1);
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
        this.magnetGlow.clear();
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
            fontFamily: GAME_FONT,
            fontSize: this.viewWidth < 650 ? "20px" : "28px",
            fontStyle: "bold",
            color: "#f7fbff",
            backgroundColor: "#172433ee",
            padding: { x: 16, y: 12 },
            stroke: "#ffb35c",
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
        this.upgradeOverlay?.close();
        this.layerBriefing?.close(false);
        this.quizOverlay?.close();
        this.timeGap?.close(false);
        this.howToPlay?.close(false);
        this.startMenu?.close();
        this.scale.off("resize", this.handleResize, this);
        this.input.removeAllListeners();
    }
}
