import { GAME_FONT } from "../core/theme.js?v=5.1.2";

const Phaser = window.Phaser;

export class LayerBriefingOverlay {
    constructor(scene, getPlayWidth) {
        this.scene = scene;
        this.getPlayWidth = getPlayWidth;
        this.items = [];
        this.startedAt = 0;
        this.minimumSkipDelay = 700;
        this.onComplete = null;
        this.isOpen = false;
    }

    open({ layer, index, total, challenge, isNew, story = [] }, onComplete) {
        this.close(false);
        this.isOpen = true;
        this.onComplete = onComplete;
        this.startedAt = this.scene.time.now;

        const playWidth = Math.max(300, this.getPlayWidth());
        const screenHeight = Math.max(420, this.scene.scale.height);
        const compact = playWidth < 620;
        const centerX = playWidth / 2;
        const panelWidth = Math.min(playWidth - 28, compact ? 430 : 650);
        const panelHeight = compact ? 330 : 348;
        const top = Math.max(92, (screenHeight - panelHeight) / 2);
        const font = GAME_FONT;

        this.add(this.scene.add.rectangle(
            playWidth / 2,
            screenHeight / 2,
            playWidth,
            screenHeight,
            0x071018,
            0.72
        ).setScrollFactor(0).setDepth(100).setInteractive());

        this.add(this.scene.add.rectangle(
            centerX,
            top + panelHeight / 2,
            panelWidth,
            panelHeight,
            0x101923,
            0.98
        ).setStrokeStyle(5, layer.color, 1).setScrollFactor(0).setDepth(101));

        this.add(this.scene.add.text(centerX, top + 18,
            `${isNew ? "NEW STRATUM" : "FIELD RESURVEY"}  ${String(index + 1).padStart(2, "0")}/${total}`,
            {
                fontFamily: font,
                fontSize: compact ? "17px" : "20px",
                fontStyle: "bold",
                color: "#91eadc",
                letterSpacing: 1
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.add(this.scene.add.text(centerX, top + 50, layer.name.toUpperCase(), {
            fontFamily: font,
            fontSize: compact ? "28px" : "38px",
            fontStyle: "bold",
            color: "#f7fbff",
            align: "center",
            wordWrap: { width: panelWidth - 36, useAdvancedWrap: true }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.add(this.scene.add.text(centerX, top + (compact ? 92 : 98),
            `~${layer.ma.toLocaleString()} Ma  •  ${layer.rockType}`,
            {
                fontFamily: font,
                fontSize: compact ? "16px" : "19px",
                color: "#93a39e",
                align: "center",
                wordWrap: { width: panelWidth - 42, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        // Phần truyện là lý do người chơi dừng lại đọc — cho nó chỗ rộng nhất.
        const storyText = this.add(this.scene.add.text(
            centerX,
            top + (compact ? 126 : 136),
            story.join("\n"),
            {
                fontFamily: font,
                fontSize: compact ? "19px" : "23px",
                fontStyle: "italic",
                color: "#f0c66a",
                align: "center",
                lineSpacing: compact ? 9 : 12,
                wordWrap: { width: panelWidth - 48, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.add(this.scene.add.text(
            centerX,
            storyText.y + storyText.height + (compact ? 14 : 18),
            `${challenge.name}  •  ${challenge.tip}`,
            {
                fontFamily: font,
                fontSize: compact ? "15px" : "18px",
                color: "#cdd5d0",
                align: "center",
                lineSpacing: 6,
                wordWrap: { width: panelWidth - 42, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.countdown = this.add(this.scene.add.text(centerX, top + panelHeight - 42,
            "READING…",
            {
                fontFamily: font,
                fontSize: compact ? "16px" : "18px",
                fontStyle: "bold",
                color: "#ffd166",
                backgroundColor: "#152433ee",
                padding: { x: 12, y: 7 }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(103).setInteractive({ useHandCursor: true }));
        this.countdown.on("pointerdown", () => this.tryContinue());
    }

    update() {
        if (!this.isOpen || !this.countdown) return;
        const elapsed = this.scene.time.now - this.startedAt;
        const canSkip = elapsed >= this.minimumSkipDelay;
        this.countdown
            .setText(canSkip ? "CONTINUE" : "READING…")
            .setColor(canSkip ? "#91eadc" : "#ffd166");
    }

    tryContinue() {
        if (!this.isOpen) return false;
        if (this.scene.time.now - this.startedAt < this.minimumSkipDelay) return false;
        this.finish();
        return true;
    }

    finish() {
        if (!this.isOpen) return;
        const callback = this.onComplete;
        this.close(false);
        callback?.();
    }

    add(item) {
        this.items.push(item);
        return item;
    }

    close(runCallback = false) {
        const callback = runCallback ? this.onComplete : null;
        this.items.forEach((item) => item?.destroy());
        this.items = [];
        this.countdown = null;
        this.onComplete = null;
        this.isOpen = false;
        callback?.();
    }
}
