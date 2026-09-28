import { GAME_FONT, UI } from "../core/theme.js?v=5.1.2";
import { makePanelButton, pinToScreen } from "./components.js?v=5.1.2";
import { buildTutorialArt } from "./tutorialArt.js?v=5.1.2";
import { retroMusic } from "../services/AudioManager.js?v=5.1.2";

const Phaser = window.Phaser;

// One idea per card, one line of text, and a moving picture doing the teaching.
// Boost and near miss are deliberately absent: the scene teaches those in play.
const CARDS = [
    { kind: "launch", title: "LAUNCH", body: "Pull the drill up, then release." },
    { kind: "steer", title: "STEER", body: "Use WASD, arrows, or touch." },
    { kind: "collect", title: "COLLECT", body: "Collect 5 samples to clear the layer." },
    { kind: "refuel", title: "REFUEL", body: "Fuel cans restore 25%." },
    { kind: "rock", title: "ROCK CHECK", body: "Hit a rock? Answer from memory." }
];

const SLIDE_MS = 250;

export class HowToPlayOverlay {
    constructor(scene) {
        this.scene = scene;
        this.chrome = [];
        this.buttons = [];
        this.timers = [];
        this.card = null;
        this.index = 0;
        this.busy = false;
        this.isOpen = false;
        this.onStart = null;
        this.pointerStart = null;
        this.pointerUpHandler = null;
    }

    open(onStart) {
        this.close(false);
        this.isOpen = true;
        this.onStart = onStart;
        this.index = 0;

        const width = Math.max(320, this.scene.viewWidth || this.scene.scale.width);
        const height = Math.max(420, this.scene.viewHeight || this.scene.scale.height);
        const compact = width < 720 || height < 620;
        const panelWidth = Math.min(width - 24, 940);
        const panelHeight = Math.min(height - 24, 720);
        const centerX = width / 2;
        const top = (height - panelHeight) / 2;

        const pad = compact ? 12 : 18;
        const headerHeight = compact ? 34 : 46;
        const titleHeight = compact ? 42 : 58;
        const bodyHeight = compact ? 36 : 44;
        const navHeight = compact ? 64 : 78;
        const stageHeight = panelHeight - pad * 2 - headerHeight - titleHeight -
            bodyHeight - navHeight;

        this.layout = {
            compact,
            centerX,
            panelLeft: centerX - panelWidth / 2,
            panelRight: centerX + panelWidth / 2,
            panelWidth,
            pad,
            stageWidth: panelWidth - pad * 2 - 16,
            stageHeight,
            headerY: top + pad + headerHeight / 2,
            stageY: top + pad + headerHeight + stageHeight / 2,
            titleY: top + pad + headerHeight + stageHeight + titleHeight / 2,
            bodyY: top + pad + headerHeight + stageHeight + titleHeight + bodyHeight / 2,
            navY: top + panelHeight - pad - navHeight / 2,
            titleSize: compact ? 32 : 48,
            bodySize: compact ? 20 : 28,
            slide: compact ? 44 : 72
        };

        const backdrop = this.addChrome(this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            UI.backdrop,
            0.97
        ).setDepth(150).setInteractive());
        backdrop.on("pointerdown", (pointer) => {
            this.scene.unlockAudio?.();
            this.pointerStart = { x: pointer.x, y: pointer.y };
        });

        this.addChrome(this.scene.add.rectangle(
            centerX,
            top + panelHeight / 2,
            panelWidth,
            panelHeight,
            UI.card,
            1
        ).setStrokeStyle(3, UI.cardEdge, 1).setDepth(151));

        this.dots = this.addChrome(this.scene.add.graphics().setDepth(153));
        this.counter = this.addChrome(this.scene.add.text(
            this.layout.panelRight - pad - 4,
            this.layout.headerY,
            "1 / 5",
            {
                fontFamily: GAME_FONT,
                fontSize: compact ? "15px" : "18px",
                fontStyle: "bold",
                color: UI.mutedHex
            }
        ).setOrigin(1, 0.5).setDepth(153));

        this.buildNav();
        this.pointerUpHandler = (pointer) => this.handleSwipe(pointer);
        this.scene.input.on("pointerup", this.pointerUpHandler);
        this.showCard(0, 0);
    }

    buildNav() {
        const { compact, pad, panelLeft, panelRight, panelWidth, navY } = this.layout;
        const buttonHeight = compact ? 46 : 54;
        const backWidth = compact ? 96 : 132;
        const nextWidth = Math.min(
            panelWidth - pad * 2 - backWidth - (compact ? 12 : 24),
            compact ? 236 : 330
        );
        const fontSize = compact ? 20 : 25;

        this.backButton = this.addButton(makePanelButton(this.scene, {
            x: panelLeft + pad + backWidth / 2,
            y: navY,
            width: backWidth,
            height: buttonHeight,
            label: "BACK",
            fontSize,
            primary: false,
            onPress: () => this.previous()
        }));

        this.nextButton = this.addButton(makePanelButton(this.scene, {
            x: panelRight - pad - nextWidth / 2,
            y: navY,
            width: nextWidth,
            height: buttonHeight,
            label: "START EXPEDITION",
            fontSize,
            primary: true,
            onPress: () => this.next()
        }));

        if (!compact) {
            this.addChrome(this.scene.add.text(
                (panelLeft + pad + backWidth + (panelRight - pad - nextWidth)) / 2,
                navY,
                "←  →  or SPACE",
                {
                    fontFamily: GAME_FONT,
                    fontSize: "16px",
                    color: UI.mutedHex
                }
            ).setOrigin(0.5).setDepth(153));
        }
    }

    buildCard(index) {
        const {
            centerX, stageY, stageWidth, stageHeight, titleY, bodyY, titleSize, bodySize,
            panelWidth, pad
        } = this.layout;
        const definition = CARDS[index];
        const card = this.scene.add.container(0, 0).setDepth(152);

        const art = buildTutorialArt(this.scene, definition.kind, stageWidth, stageHeight);
        art.root.setPosition(centerX, stageY);
        card.add(art.root);

        card.add(this.scene.add.text(centerX, titleY, definition.title, {
            fontFamily: GAME_FONT,
            fontSize: `${titleSize}px`,
            fontStyle: "bold",
            color: UI.keywordHex,
            letterSpacing: 2
        }).setOrigin(0.5));

        card.add(this.scene.add.text(centerX, bodyY, definition.body, {
            fontFamily: GAME_FONT,
            fontSize: `${bodySize}px`,
            color: UI.bodyHex,
            lineSpacing: Math.round(bodySize * 0.5),
            align: "center",
            wordWrap: { width: panelWidth - pad * 2 - 12, useAdvancedWrap: true }
        }).setOrigin(0.5));

        pinToScreen(card);
        return { card, art };
    }

    showCard(index, direction) {
        const previous = this.card;
        this.index = index;
        this.card = this.buildCard(index);

        if (direction === 0) {
            previous?.art.dispose();
            previous?.card.destroy();
        } else {
            const offset = direction * this.layout.slide;
            this.card.card.setX(offset).setAlpha(0);
            this.scene.tweens.add({
                targets: this.card.card,
                x: 0,
                alpha: 1,
                duration: SLIDE_MS,
                ease: "Cubic.Out"
            });
            if (previous) {
                this.scene.tweens.add({
                    targets: previous.card,
                    x: -offset,
                    alpha: 0,
                    duration: SLIDE_MS - 40,
                    ease: "Cubic.In",
                    onComplete: () => {
                        previous.art.dispose();
                        previous.card.destroy();
                    }
                });
            }
            this.busy = true;
            this.timers.push(this.scene.time.delayedCall(SLIDE_MS, () => {
                this.busy = false;
            }));
        }
        this.updateChrome();
    }

    updateChrome() {
        const { compact, centerX, headerY } = this.layout;
        const gap = compact ? 22 : 30;
        const radius = compact ? 7 : 9;
        this.dots.clear();
        CARDS.forEach((card, index) => {
            const x = centerX - ((CARDS.length - 1) * gap) / 2 + index * gap;
            const active = index === this.index;
            this.dots.fillStyle(active ? UI.accent : 0x2b4350, 1);
            this.dots.fillCircle(x, headerY, active ? radius : radius * 0.62);
        });
        this.counter.setText(`${this.index + 1} / ${CARDS.length}`);
        this.backButton.setEnabled(this.index > 0);
        this.nextButton.setLabel(
            this.index === CARDS.length - 1 ? "START EXPEDITION" : "NEXT"
        );
    }

    next() {
        if (!this.isOpen || this.busy) return;
        retroMusic.effect("uiClick");
        if (this.index >= CARDS.length - 1) {
            this.start();
            return;
        }
        this.showCard(this.index + 1, 1);
    }

    previous() {
        if (!this.isOpen || this.busy || this.index === 0) return;
        retroMusic.effect("uiClick");
        this.showCard(this.index - 1, -1);
    }

    handleSwipe(pointer) {
        if (!this.isOpen || !this.pointerStart) return;
        const dx = pointer.x - this.pointerStart.x;
        const dy = pointer.y - this.pointerStart.y;
        this.pointerStart = null;
        if (Math.abs(dx) < 46 || Math.abs(dx) <= Math.abs(dy)) return;
        if (dx < 0) this.next();
        else this.previous();
    }

    handleKeys(keys) {
        if (!this.isOpen || !keys) return;
        if (Phaser.Input.Keyboard.JustDown(keys.leftArrow)) this.previous();
        else if (Phaser.Input.Keyboard.JustDown(keys.rightArrow)) this.next();
        else if (Phaser.Input.Keyboard.JustDown(keys.continue)) this.next();
    }

    start() {
        if (!this.isOpen) return;
        const callback = this.onStart;
        this.close(false);
        callback?.();
    }

    addChrome(item) {
        this.chrome.push(item);
        return pinToScreen(item);
    }

    addButton(button) {
        this.buttons.push(button);
        return button;
    }

    close(runCallback = false) {
        const callback = runCallback ? this.onStart : null;
        if (this.pointerUpHandler) {
            this.scene.input.off("pointerup", this.pointerUpHandler);
            this.pointerUpHandler = null;
        }
        this.timers.forEach((timer) => timer?.remove(false));
        this.timers = [];
        this.card?.art.dispose();
        this.card?.card.destroy();
        this.card = null;
        this.buttons.forEach((button) => button?.destroy());
        this.buttons = [];
        this.chrome.forEach((item) => item?.destroy());
        this.chrome = [];
        this.backButton = null;
        this.nextButton = null;
        this.dots = null;
        this.counter = null;
        this.pointerStart = null;
        this.busy = false;
        this.isOpen = false;
        this.onStart = null;
        callback?.();
    }
}
