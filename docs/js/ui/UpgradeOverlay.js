import { GAME_FONT } from "../core/theme.js?v=5.1.2";

export class UpgradeOverlay {
    constructor(scene, getPlayWidth) {
        this.scene = scene;
        this.getPlayWidth = getPlayWidth;
        this.items = [];
    }

    open({ layer, credits, upgrades, choices, stars = 1, noHits = false, underTime = false, targetSeconds = 45 }, onChoice) {
        this.close();
        const width = Math.max(260, this.getPlayWidth());
        const height = this.scene.viewHeight;
        const compact = width < 680;
        const centerX = width / 2;
        const panelWidth = Math.min(width - 26, compact ? 480 : 760);
        const panelHeight = compact ? 510 : 390;
        const top = Math.max(82, (height - panelHeight) / 2);
        const font = GAME_FONT;

        this.add(this.scene.add.rectangle(width / 2, height / 2, width, height, 0x071018, 0.82)
            .setScrollFactor(0).setDepth(80));
        this.add(this.scene.add.rectangle(centerX, top + panelHeight / 2, panelWidth, panelHeight, 0x101923, 0.99)
            .setStrokeStyle(4, 0x66e0cf, 1).setScrollFactor(0).setDepth(81));
        this.add(this.scene.add.text(centerX, top + 18, "LAYER COMPLETE", {
            fontFamily: font, fontSize: compact ? "28px" : "36px", fontStyle: "bold", color: "#ffd166"
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));
        // Ba sao nói ngay người chơi thiếu gì để lần sau làm tốt hơn.
        this.add(this.scene.add.text(
            centerX,
            top + (compact ? 50 : 54),
            `${"\u2605".repeat(stars)}${"\u2606".repeat(3 - stars)}`,
            {
                fontFamily: font,
                fontSize: compact ? "26px" : "32px",
                fontStyle: "bold",
                color: "#f0c66a",
                letterSpacing: 4
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));

        this.add(this.scene.add.text(
            centerX,
            top + (compact ? 84 : 92),
            `${layer.name} • ${layer.ma} Ma  •  CREDITS ${credits}\n` +
            `${noHits ? "\u2605" : "\u2606"} no rock hits   ` +
            `${underTime ? "\u2605" : "\u2606"} under ${targetSeconds}s`,
            {
                fontFamily: font,
                fontSize: compact ? "16px" : "19px",
                color: "#cdd5d0",
                align: "center",
                lineSpacing: 6
            }
        ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));

        // Thẻ có bề rộng cố định; mô tả phải ngắn để không bị cắt mất chữ.
        const descriptions = {
            speed: "+25% move speed",
            magnet: "+20px reach",
            earnings: "+25% credits"
        };
        choices.forEach((choice, index) => {
            const cardWidth = compact ? panelWidth - 36 : (panelWidth - 64) / 3;
            const x = compact ? centerX : centerX - panelWidth / 2 + 22 + cardWidth / 2 + index * (cardWidth + 10);
            const y = compact ? top + 150 + index * 105 : top + 156;
            const button = this.scene.add.text(
                x,
                y,
                `${choice.type.toUpperCase()}  LV ${upgrades[choice.type]}\n${descriptions[choice.type]}\n${choice.cost} CREDITS`,
                {
                    fontFamily: font,
                    fontSize: compact ? "16px" : "18px",
                    fontStyle: "bold",
                    color: choice.available ? "#101923" : "#8e7f78",
                    backgroundColor: choice.available ? "#ffd166" : "#332a2e",
                    padding: { x: 12, y: 12 },
                    fixedWidth: cardWidth,
                    fixedHeight: compact ? 90 : 150,
                    align: "center"
                }
            ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82);
            if (choice.available) {
                button.setInteractive({ useHandCursor: true });
                button.on("pointerdown", () => onChoice(choice.type));
            }
            this.add(button);
        });

        const skip = this.scene.add.text(centerX, top + panelHeight - 34, "[ SKIP UPGRADE ]", {
            fontFamily: font, fontSize: "20px", fontStyle: "bold", color: "#91eadc"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(82).setInteractive({ useHandCursor: true });
        skip.on("pointerdown", () => onChoice(null));
        this.add(skip);
    }

    add(item) {
        this.items.push(item);
        return item;
    }

    close() {
        this.items.forEach((item) => item?.destroy());
        this.items = [];
    }
}
