const Phaser = window.Phaser;

export class LayerBriefingOverlay {
    constructor(scene, getPlayWidth) {
        this.scene = scene;
        this.getPlayWidth = getPlayWidth;
        this.items = [];
        this.timer = null;
        this.startedAt = 0;
        this.duration = 5500;
        this.minimumSkipDelay = 1000;
        this.onComplete = null;
        this.isOpen = false;
    }

    open({ layer, index, total, challenge, isNew }, onComplete) {
        this.close(false);
        this.isOpen = true;
        this.onComplete = onComplete;
        this.startedAt = this.scene.time.now;

        const playWidth = Math.max(300, this.getPlayWidth());
        const screenHeight = Math.max(420, this.scene.scale.height);
        const compact = playWidth < 620;
        const centerX = playWidth / 2;
        const panelWidth = Math.min(playWidth - 28, compact ? 430 : 650);
        const panelHeight = compact ? 286 : 304;
        const top = Math.max(92, (screenHeight - panelHeight) / 2);
        const font = "Arial, Helvetica, sans-serif";

        this.add(this.scene.add.rectangle(
            playWidth / 2,
            screenHeight / 2,
            playWidth,
            screenHeight,
            0x09070b,
            0.72
        ).setScrollFactor(0).setDepth(100).setInteractive());

        this.add(this.scene.add.rectangle(
            centerX,
            top + panelHeight / 2,
            panelWidth,
            panelHeight,
            0x17121b,
            0.98
        ).setStrokeStyle(5, layer.color, 1).setScrollFactor(0).setDepth(101));

        this.add(this.scene.add.text(centerX, top + 18,
            `${isNew ? "NEW STRATUM" : "FIELD RESURVEY"}  ${String(index + 1).padStart(2, "0")}/${total}`,
            {
                fontFamily: font,
                fontSize: compact ? "13px" : "16px",
                fontStyle: "bold",
                color: "#8ff2dc",
                letterSpacing: 1
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.add(this.scene.add.text(centerX, top + 50, layer.name.toUpperCase(), {
            fontFamily: font,
            fontSize: compact ? "22px" : "30px",
            fontStyle: "bold",
            color: "#fff1c1",
            align: "center",
            wordWrap: { width: panelWidth - 36, useAdvancedWrap: true }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.add(this.scene.add.text(centerX, top + (compact ? 92 : 98),
            `${layer.age}  •  ~${layer.ma.toLocaleString()} Ma\n${layer.rockType}\n\n${challenge.name}: ${challenge.briefing}`,
            {
                fontFamily: font,
                fontSize: compact ? "14px" : "17px",
                color: "#f8ead0",
                lineSpacing: compact ? 5 : 7,
                align: "center",
                wordWrap: { width: panelWidth - 42, useAdvancedWrap: true }
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(102));

        this.countdown = this.add(this.scene.add.text(centerX, top + panelHeight - 42,
            "CONTINUE IN 5.5s  •  click after 1s to skip",
            {
                fontFamily: font,
                fontSize: compact ? "12px" : "14px",
                fontStyle: "bold",
                color: "#ffd166",
                backgroundColor: "#30212add",
                padding: { x: 12, y: 7 }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(103).setInteractive({ useHandCursor: true }));
        this.countdown.on("pointerdown", () => this.tryContinue());

        this.timer = this.scene.time.delayedCall(this.duration, () => this.finish());
    }

    update() {
        if (!this.isOpen || !this.countdown) return;
        const elapsed = this.scene.time.now - this.startedAt;
        const remaining = Math.max(0, this.duration - elapsed) / 1000;
        const canSkip = elapsed >= this.minimumSkipDelay;
        this.countdown
            .setText(canSkip
                ? `CONTINUE  •  AUTO ${remaining.toFixed(1)}s`
                : `READING…  ${remaining.toFixed(1)}s`)
            .setColor(canSkip ? "#8ff2dc" : "#ffd166");
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
        this.timer?.remove(false);
        this.timer = null;
        this.items.forEach((item) => item?.destroy());
        this.items = [];
        this.countdown = null;
        this.onComplete = null;
        this.isOpen = false;
        callback?.();
    }
}
