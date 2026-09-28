import { ROCK_LAYERS } from "../data/layers.js?v=4.6.3";
import { GAME_FONT } from "../core/theme.js?v=4.6.1";

const Phaser = window.Phaser;

function makeButton(scene, x, y, label, callback, fontSize) {
    const button = scene.add.text(x, y, `[ ${label} ]`, {
        fontFamily: GAME_FONT,
        fontSize,
        fontStyle: "bold",
        color: "#08131d",
        backgroundColor: "#ffd166",
        padding: { x: 10, y: 7 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on("pointerdown", (pointer, localX, localY, event) => {
        event?.stopPropagation();
        callback();
    });
    button.on("pointerover", () => button.setStyle({ backgroundColor: "#f7fbff" }));
    button.on("pointerout", () => button.setStyle({ backgroundColor: "#ffd166" }));
    return button;
}

export class LayerNotebookOverlay {
    constructor(scene, getUnlockedCount) {
        this.scene = scene;
        this.getUnlockedCount = getUnlockedCount;
        this.index = 0;
        this.isOpen = false;
        this.build();
    }

    build() {
        const width = Math.max(320, this.scene.scale.width);
        const height = Math.max(420, this.scene.scale.height);
        const compact = width < 650;
        const panelWidth = Math.min(compact ? width - 18 : 790, width - 28);
        const panelHeight = Math.min(compact ? height - 24 : 700, height - 42);
        const left = (width - panelWidth) / 2;
        const top = (height - panelHeight) / 2;
        const font = GAME_FONT;

        const backdrop = this.scene.add.rectangle(
            width / 2,
            height / 2,
            width,
            height,
            0x071018,
            0.9
        ).setInteractive();
        backdrop.on("pointerdown", (pointer, localX, localY, event) => event?.stopPropagation());

        const panel = this.scene.add.rectangle(
            width / 2,
            height / 2,
            panelWidth,
            panelHeight,
            0x172433,
            1
        ).setStrokeStyle(5, 0xffa044, 1);

        this.heading = this.scene.add.text(left + 20, top + 18, "FIELD NOTEBOOK", {
            fontFamily: font,
            fontSize: compact ? "24px" : "34px",
            fontStyle: "bold",
            color: "#ffd166"
        });

        this.pageText = this.scene.add.text(left + panelWidth - 20, top + 23, "", {
            fontFamily: font,
            fontSize: compact ? "16px" : "18px",
            color: "#91eadc"
        }).setOrigin(1, 0);

        this.layerTitle = this.scene.add.text(left + 20, top + (compact ? 58 : 66), "", {
            fontFamily: font,
            fontSize: compact ? "20px" : "27px",
            fontStyle: "bold",
            color: "#f7fbff",
            wordWrap: { width: panelWidth - 40 }
        });

        this.body = this.scene.add.text(left + 20, top + (compact ? 98 : 112), "", {
            fontFamily: font,
            fontSize: compact ? "16px" : "19px",
            color: "#eaf2f8",
            lineSpacing: compact ? 8 : 11,
            wordWrap: { width: panelWidth - 40, useAdvancedWrap: true }
        });

        this.sourceText = this.scene.add.text(left + 20, top + panelHeight - (compact ? 68 : 78), "", {
            fontFamily: font,
            fontSize: compact ? "14px" : "16px",
            color: "#b8cadd",
            wordWrap: { width: panelWidth - 40 }
        });

        const buttonY = top + panelHeight - 28;
        const previous = makeButton(
            this.scene,
            left + (compact ? 58 : 80),
            buttonY,
            "PREV",
            () => this.changePage(-1),
            compact ? "15px" : "18px"
        );
        const close = makeButton(
            this.scene,
            width / 2,
            buttonY,
            "CLOSE",
            () => this.close(),
            compact ? "15px" : "18px"
        );
        const next = makeButton(
            this.scene,
            left + panelWidth - (compact ? 58 : 80),
            buttonY,
            "NEXT",
            () => this.changePage(1),
            compact ? "15px" : "18px"
        );

        this.elements = [
            backdrop,
            panel,
            this.heading,
            this.pageText,
            this.layerTitle,
            this.body,
            this.sourceText,
            previous,
            close,
            next
        ];
        backdrop.setScrollFactor(0).setDepth(120);
        panel.setScrollFactor(0).setDepth(121);
        [this.heading, this.pageText, this.layerTitle, this.body, this.sourceText]
            .forEach((element) => element.setScrollFactor(0).setDepth(122));
        [previous, close, next]
            .forEach((element) => element.setScrollFactor(0).setDepth(123));
        this.elements.forEach((element) => element.setVisible(false));
    }

    open(index = null) {
        const unlocked = Phaser.Math.Clamp(Number(this.getUnlockedCount()) || 0, 0, ROCK_LAYERS.length);
        this.index = Phaser.Math.Clamp(
            index === null ? Math.max(0, unlocked - 1) : index,
            0,
            ROCK_LAYERS.length - 1
        );
        this.isOpen = true;
        this.elements.forEach((element) => element.setVisible(true));
        this.render();
    }

    close() {
        this.isOpen = false;
        this.elements.forEach((element) => element.setVisible(false));
    }

    changePage(direction) {
        this.index = Phaser.Math.Wrap(this.index + direction, 0, ROCK_LAYERS.length);
        this.render();
    }

    render() {
        const layer = ROCK_LAYERS[this.index];
        const unlocked = Phaser.Math.Clamp(Number(this.getUnlockedCount()) || 0, 0, ROCK_LAYERS.length);
        const available = this.index < unlocked;
        this.pageText.setText(`${String(this.index + 1).padStart(2, "0")}/${ROCK_LAYERS.length}  •  UNLOCKED ${unlocked}`);

        if (!available) {
            this.layerTitle.setText("LOCKED STRATUM");
            this.body.setText("Reach this layer to unlock its field note.");
            this.sourceText.setText("Not yet observed.");
            return;
        }

        this.layerTitle.setText(`${layer.name}  •  ${layer.ma.toLocaleString()} Ma`);
        const sections = [
            `${layer.age}  •  ${layer.group}`,
            `WHERE\n${layer.position}`,
            `ROCK\n${layer.rockType}`,
            `LOOK FOR\n${layer.feature}`,
            `FORMED\n${layer.formed}`,
            `LIFE / EVENT\n${layer.fossil}`,
            `WHY IT MATTERS\n${layer.significance}`
        ];
        if (layer.boundary) sections.push(`IMPORTANT LIMIT\n${layer.boundary}`);
        this.body.setText(sections.join("\n\n"));
        this.sourceText.setText(
            `${layer.source}  •  Game scale and physics are simplified.`
        );
    }
}
