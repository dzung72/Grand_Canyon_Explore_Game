import { GAME_FONT } from "../core/theme.js?v=4.6.1";

export class UpgradeOverlay {
    constructor(scene, getPlayWidth) {
        this.scene = scene;
        this.getPlayWidth = getPlayWidth;
        this.items = [];
    }

    open({ layer, credits, upgrades, choices }, onChoice) {
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
            fontFamily: font, fontSize: compact ? "25px" : "32px", fontStyle: "bold", color: "#ffd166"
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));
        this.add(this.scene.add.text(centerX, top + 54, `${layer.name} • ${layer.ma} Ma\nCREDITS: ${credits}`, {
            fontFamily: font, fontSize: compact ? "16px" : "20px", color: "#f7fbff", align: "center"
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));

        const descriptions = {
            speed: "+25% movement speed",
            magnet: "+20 px sample range",
            earnings: "+25% sample credits"
        };
        choices.forEach((choice, index) => {
            const cardWidth = compact ? panelWidth - 36 : (panelWidth - 64) / 3;
            const x = compact ? centerX : centerX - panelWidth / 2 + 22 + cardWidth / 2 + index * (cardWidth + 10);
            const y = compact ? top + 112 + index * 105 : top + 118;
            const button = this.scene.add.text(
                x,
                y,
                `${choice.type.toUpperCase()}  LV ${upgrades[choice.type]}\n${descriptions[choice.type]}\n${choice.cost} CREDITS`,
                {
                    fontFamily: font,
                    fontSize: compact ? "15px" : "17px",
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
            fontFamily: font, fontSize: "18px", fontStyle: "bold", color: "#91eadc"
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
