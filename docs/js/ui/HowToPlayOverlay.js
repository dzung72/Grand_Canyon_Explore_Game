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
        const panelHeight = Math.min(height - 28, compact ? 560 : 650);
        const centerX = width / 2;
        const top = (height - panelHeight) / 2;
        const font = "Arial, Helvetica, sans-serif";

        this.add(this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x09070b,
            0.9
        ).setScrollFactor(0).setDepth(150).setInteractive());

        this.add(this.scene.add.rectangle(
            centerX,
            height / 2,
            panelWidth,
            panelHeight,
            0x17121b,
            0.99
        ).setStrokeStyle(5, 0xffa044, 1).setScrollFactor(0).setDepth(151));

        this.add(this.scene.add.text(centerX, top + 22, "HOW TO PLAY", {
            fontFamily: font,
            fontSize: compact ? "24px" : "34px",
            fontStyle: "bold",
            color: "#ffd166",
            stroke: "#241923",
            strokeThickness: 4
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(152));

        this.add(this.scene.add.text(centerX, top + (compact ? 58 : 70),
            "GRAND CANYON FIELD EXPEDITION • 10 LAYERS",
            {
                fontFamily: font,
                fontSize: compact ? "11px" : "15px",
                fontStyle: "bold",
                color: "#8ff2dc",
                letterSpacing: 1
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(152));

        const instructions = [
            ["1  LAUNCH", "Grab the drill, pull upward and release."],
            ["2  STEER", "Use WASD, arrow keys, or touch. Explore in four directions."],
            ["3  COLLECT", "Find all five evidence samples in every rock layer."],
            ["4  ROCK CHECK", "Touch a quiz rock and answer using the field note you read."],
            ["5  FUEL + BOOST", "Fuel cans restore up to 25%. Hold Space/BOOST for 2.15× speed, but lose an extra 8% fuel per second."],
            ["6  NEAR MISS", "Enter a rock's danger margin and escape without touching it. Chain up to x4 for bonus score."]
        ];
        const body = compact
            ? instructions.map(([title, text]) => `${title}: ${text}`).join("\n")
            : instructions.map(([title, text]) => `${title}\n${text}`).join("\n\n");
        this.add(this.scene.add.text(
            centerX - panelWidth / 2 + (compact ? 20 : 42),
            top + (compact ? 92 : 112),
            body,
            {
                fontFamily: font,
                fontSize: compact ? "10px" : "15px",
                fontStyle: "normal",
                color: "#f8ead0",
                lineSpacing: compact ? 3 : 4,
                wordWrap: { width: panelWidth - (compact ? 40 : 84), useAdvancedWrap: true }
            }
        ).setScrollFactor(0).setDepth(152));

        this.add(this.scene.add.text(centerX, top + panelHeight - (compact ? 84 : 92),
            "RUN TIME + LAYER TIME pause during notes, quizzes and upgrades.",
            {
                fontFamily: font,
                fontSize: compact ? "11px" : "14px",
                fontStyle: "bold",
                color: "#8ff2dc",
                align: "center",
                wordWrap: { width: panelWidth - 36, useAdvancedWrap: true }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(152));

        const startButton = this.scene.add.text(centerX, top + panelHeight - 42,
            "[ START EXPEDITION ]",
            {
                fontFamily: font,
                fontSize: compact ? "15px" : "19px",
                fontStyle: "bold",
                color: "#17121b",
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
