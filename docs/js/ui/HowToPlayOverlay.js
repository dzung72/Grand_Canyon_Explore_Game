import { GAME_FONT } from "../core/theme.js?v=4.6.1";

export class HowToPlayOverlay {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.isOpen = false;
        this.onStart = null;
    }

    open(onStart) {
        this.close(false);
        this.isOpen = true;
        this.onStart = onStart;

        const width = this.scene.viewWidth;
        const height = this.scene.viewHeight;
        const compact = width < 700 || height < 650;
        const panelWidth = Math.min(width - 28, 860);
        const panelHeight = Math.min(height - 28, compact ? 500 : 540);
        const centerX = width / 2;
        const top = (height - panelHeight) / 2;
        const font = GAME_FONT;

        this.add(this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x071018,
            0.9
        ).setScrollFactor(0).setDepth(150).setInteractive());

        this.add(this.scene.add.rectangle(
            centerX,
            height / 2,
            panelWidth,
            panelHeight,
            0x101923,
            0.99
        ).setStrokeStyle(5, 0xffa044, 1).setScrollFactor(0).setDepth(151));

        this.add(this.scene.add.text(centerX, top + 22, "HOW TO PLAY", {
            fontFamily: font,
            fontSize: compact ? "27px" : "38px",
            fontStyle: "bold",
            color: "#ffd166",
            stroke: "#08131d",
            strokeThickness: 4
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(152));

        this.add(this.scene.add.text(centerX, top + (compact ? 58 : 70),
            "GRAND CANYON FIELD EXPEDITION • 10 LAYERS",
            {
                fontFamily: font,
                fontSize: compact ? "13px" : "17px",
                fontStyle: "bold",
                color: "#91eadc",
                letterSpacing: 1
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(152));

        const instructions = [
            ["1  LAUNCH", "Pull up. Release."],
            ["2  MOVE", "WASD, arrows, or touch."],
            ["3  GOAL", "Collect 5 samples per layer."],
            ["4  ROCK", "Hit one? Answer from the note."],
            ["5  FUEL", "Cans give 25%. Boost is fast but drains fuel."],
            ["6  NEAR MISS", "Pass close without contact. Chain up to x4."]
        ];
        const addInstructions = (items, x, y, textWidth) => {
            const body = items.map(([title, text]) => `${title} — ${text}`).join("\n\n");
            this.add(this.scene.add.text(x, y, body, {
                fontFamily: font,
                fontSize: compact ? "13px" : "17px",
                fontStyle: "normal",
                color: "#eaf2f8",
                lineSpacing: compact ? 5 : 7,
                wordWrap: { width: textWidth, useAdvancedWrap: true }
            }).setScrollFactor(0).setDepth(152));
        };
        if (compact) {
            addInstructions(instructions, centerX - panelWidth / 2 + 20, top + 92, panelWidth - 40);
        } else {
            const columnWidth = (panelWidth - 108) / 2;
            addInstructions(instructions.slice(0, 3), centerX - panelWidth / 2 + 42, top + 122, columnWidth);
            addInstructions(instructions.slice(3), centerX + 24, top + 122, columnWidth);
        }

        const startButton = this.scene.add.text(centerX, top + panelHeight - 42,
            "[ START EXPEDITION ]",
            {
                fontFamily: font,
                fontSize: compact ? "17px" : "21px",
                fontStyle: "bold",
                color: "#101923",
                backgroundColor: "#ffd166",
                padding: { x: 16, y: 10 }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(153).setInteractive({ useHandCursor: true });
        startButton.on("pointerdown", () => this.start());
        this.add(startButton);
    }

    start() {
        if (!this.isOpen) return;
        const callback = this.onStart;
        this.close(false);
        callback?.();
    }

    add(item) {
        this.items.push(item);
        return item;
    }

    close(runCallback = false) {
        const callback = runCallback ? this.onStart : null;
        this.items.forEach((item) => item?.destroy());
        this.items = [];
        this.onStart = null;
        this.isOpen = false;
        callback?.();
    }
}
