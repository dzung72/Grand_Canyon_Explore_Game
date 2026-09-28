import { GAME_FONT, UI } from "../core/theme.js?v=5.1.2";
import { makePanelButton, pinToScreen } from "./components.js?v=5.1.2";
import { retroMusic } from "../services/AudioManager.js?v=5.1.2";

const Phaser = window.Phaser;

// Shown from the second visit onwards: the tutorial is no longer in the way,
// but it is still one press away.
export class StartMenuOverlay {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.buttons = [];
        this.isOpen = false;
        this.onPlay = null;
        this.onHowToPlay = null;
    }

    open({ onPlay, onHowToPlay, subtitle = "" }) {
        this.close();
        this.isOpen = true;
        this.onPlay = onPlay;
        this.onHowToPlay = onHowToPlay;

        const width = Math.max(320, this.scene.viewWidth || this.scene.scale.width);
        const height = Math.max(420, this.scene.viewHeight || this.scene.scale.height);
        const compact = width < 720 || height < 620;
        const centerX = width / 2;
        const panelWidth = Math.min(width - 24, compact ? 460 : 720);
        const panelHeight = Math.min(height - 24, compact ? 380 : 460);
        const top = (height - panelHeight) / 2;

        this.add(this.scene.add.rectangle(
            centerX,
            height / 2,
            width,
            height,
            UI.backdrop,
            0.97
        ).setDepth(150).setInteractive());

        this.add(this.scene.add.rectangle(
            centerX,
            top + panelHeight / 2,
            panelWidth,
            panelHeight,
            UI.card,
            1
        ).setStrokeStyle(3, UI.cardEdge, 1).setDepth(151));

        this.add(this.scene.add.text(centerX, top + panelHeight * 0.26, "GRAND CANYON", {
            fontFamily: GAME_FONT,
            fontSize: compact ? "34px" : "52px",
            fontStyle: "bold",
            color: UI.keywordHex,
            stroke: "#0f1a22",
            strokeThickness: compact ? 4 : 6
        }).setOrigin(0.5).setDepth(152));

        this.add(this.scene.add.text(centerX, top + panelHeight * 0.4, "DRILL", {
            fontFamily: GAME_FONT,
            fontSize: compact ? "42px" : "64px",
            fontStyle: "bold",
            color: UI.accentHex,
            stroke: "#0f1a22",
            strokeThickness: compact ? 4 : 6,
            letterSpacing: 6
        }).setOrigin(0.5).setDepth(152));

        this.add(this.scene.add.text(
            centerX,
            top + panelHeight * 0.53,
            subtitle || "10 LAYERS • FIELD EXPEDITION",
            {
                fontFamily: GAME_FONT,
                fontSize: compact ? "18px" : "22px",
                color: UI.mutedHex,
                align: "center",
                wordWrap: { width: panelWidth - 48, useAdvancedWrap: true }
            }
        ).setOrigin(0.5).setDepth(152));

        const buttonWidth = Math.min(panelWidth - 64, compact ? 300 : 380);
        const buttonHeight = compact ? 50 : 58;
        const playY = top + panelHeight * 0.71;
        const helpY = playY + buttonHeight + (compact ? 14 : 18);

        this.buttons.push(makePanelButton(this.scene, {
            x: centerX,
            y: playY,
            width: buttonWidth,
            height: buttonHeight,
            label: "PLAY",
            fontSize: compact ? 22 : 26,
            primary: true,
            depth: 152,
            onPress: () => this.play()
        }));

        this.buttons.push(makePanelButton(this.scene, {
            x: centerX,
            y: helpY,
            width: buttonWidth,
            height: buttonHeight,
            label: "HOW TO PLAY",
            fontSize: compact ? 20 : 24,
            primary: false,
            depth: 152,
            onPress: () => this.howToPlay()
        }));
    }

    play() {
        if (!this.isOpen) return;
        retroMusic.effect("uiClick");
        const callback = this.onPlay;
        this.close();
        callback?.();
    }

    howToPlay() {
        if (!this.isOpen) return;
        retroMusic.effect("uiClick");
        const callback = this.onHowToPlay;
        this.close();
        callback?.();
    }

    handleKeys(keys) {
        if (!this.isOpen || !keys) return;
        if (Phaser.Input.Keyboard.JustDown(keys.continue)) this.play();
    }

    add(item) {
        this.items.push(item);
        return pinToScreen(item);
    }

    close() {
        this.buttons.forEach((button) => button?.destroy());
        this.buttons = [];
        this.items.forEach((item) => item?.destroy());
        this.items = [];
        this.isOpen = false;
        this.onPlay = null;
        this.onHowToPlay = null;
    }
}
