import { GAME_FONT } from "../core/theme.js?v=5.1.2";

const Phaser = window.Phaser;

export class QuizOverlay {
    constructor(scene, getPlayWidth) {
        this.scene = scene;
        this.getPlayWidth = getPlayWidth;
        this.items = [];
        this.opened = false;
    }

    open(quiz, onAnswer) {
        this.close();
        this.opened = true;
        this.locked = false;
        const width = Math.max(260, this.getPlayWidth());
        const height = this.scene.viewHeight;
        const compact = width < 560;
        const panelWidth = Math.min(width - 28, compact ? 430 : 650);
        const panelHeight = compact ? 445 : 470;
        const centerX = width / 2;
        const top = Math.max(84, (height - panelHeight) / 2);
        const font = GAME_FONT;

        this.add(this.scene.add.rectangle(width / 2, height / 2, width, height, 0x071018, 0.78)
            .setScrollFactor(0).setDepth(80));
        this.add(this.scene.add.rectangle(centerX, top + panelHeight / 2, panelWidth, panelHeight, 0x101923, 0.98)
            .setStrokeStyle(4, 0xffa044, 1).setScrollFactor(0).setDepth(81));
        this.add(this.scene.add.text(centerX, top + 24, "ROCK CHECK", {
            fontFamily: font,
            fontSize: compact ? "28px" : "36px",
            fontStyle: "bold",
            color: "#ffd166"
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));
        this.add(this.scene.add.text(centerX, top + 68, quiz.question, {
            fontFamily: font,
            fontSize: compact ? "19px" : "23px",
            fontStyle: "bold",
            color: "#f7fbff",
            align: "center",
            wordWrap: { width: panelWidth - 46, useAdvancedWrap: true }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82));

        const buttonTop = top + 145;
        const answerButtons = quiz.answers.map((answer, index) => {
            const button = this.scene.add.text(centerX, buttonTop + index * 72, `${index + 1}. ${answer.text}`, {
                fontFamily: font,
                fontSize: compact ? "17px" : "20px",
                fontStyle: "bold",
                color: "#101923",
                backgroundColor: "#f7fbff",
                padding: { x: 15, y: 12 },
                fixedWidth: panelWidth - 46,
                align: "left",
                wordWrap: { width: panelWidth - 72, useAdvancedWrap: true }
            }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(82).setInteractive({ useHandCursor: true });
            button.on("pointerdown", () => this.choose(index, quiz, answerButtons, onAnswer));
            this.add(button);
            return button;
        });

        const unknown = this.scene.add.text(centerX, top + panelHeight - 42, "[ I DON'T KNOW ]", {
            fontFamily: font,
            fontSize: compact ? "17px" : "20px",
            fontStyle: "bold",
            color: "#ffb49f"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(82).setInteractive({ useHandCursor: true });
        unknown.on("pointerdown", () => this.choose(-1, quiz, answerButtons, onAnswer));
        this.add(unknown);
    }

    choose(index, quiz, buttons, onAnswer) {
        if (this.locked) return;
        this.locked = true;
        const correct = index >= 0 && quiz.answers[index]?.correct;
        buttons.forEach((button, answerIndex) => {
            button.disableInteractive();
            if (quiz.answers[answerIndex].correct) {
                button.setStyle({ backgroundColor: "#91eadc", color: "#101923" });
            } else if (answerIndex === index) {
                button.setStyle({ backgroundColor: "#ff9f85", color: "#101923" });
            }
        });
        this.scene.time.delayedCall(520, () => {
            this.close();
            onAnswer(Boolean(correct));
        });
    }

    add(item) {
        this.items.push(item);
        return item;
    }

    close() {
        this.items.forEach((item) => item?.destroy());
        this.items = [];
        this.opened = false;
        this.locked = false;
    }
}
