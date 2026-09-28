import { GAME_FONT, UI } from "../core/theme.js?v=5.1.3";
import { retroMusic } from "../services/AudioManager.js?v=5.1.3";

const Phaser = window.Phaser;

// Khoảnh khắc mũi khoan chạm một mặt bất chỉnh hợp. Mọi thứ dừng lại, vì đây
// là bài học khó nhất của địa tầng học: hồ sơ đá phần lớn là thời gian đã mất.
export class TimeGapOverlay {
    constructor(scene) {
        this.scene = scene;
        this.items = [];
        this.isOpen = false;
        this.openedAt = 0;
        this.onDone = null;
    }

    open(gap, onDone) {
        this.close(false);
        this.isOpen = true;
        this.onDone = onDone;
        this.openedAt = this.scene.time.now;

        const width = this.scene.viewWidth;
        const height = this.scene.viewHeight;
        const compact = width < 720;
        const centerX = width / 2;
        const lineY = Math.round(height * 0.46);

        retroMusic.setReading(true);
        retroMusic.effect("hush");

        const backdrop = this.add(this.scene.add.rectangle(
            centerX, height / 2, width, height, 0x070d12, 1
        ).setScrollFactor(0).setDepth(120).setAlpha(0).setInteractive());
        this.scene.tweens.add({ targets: backdrop, alpha: 0.97, duration: 520, ease: "Sine.Out" });

        // Chính mặt tiếp xúc: một đường mảnh mọc ra từ giữa màn hình.
        const contact = this.add(this.scene.add.graphics().setScrollFactor(0).setDepth(122));
        const state = { spread: 0 };
        const drawContact = () => {
            const half = (width / 2) * state.spread;
            contact.clear();
            if (half < 2) return;
            contact.fillStyle(UI.keyword, 0.9);
            // Mặt bào mòn không bao giờ phẳng tuyệt đối.
            for (let x = -half; x < half; x += 9) {
                const wobble = Math.sin(x * 0.035) * 2 + Math.sin(x * 0.011) * 3;
                contact.fillRect(centerX + x, lineY + Math.round(wobble), 8, 3);
            }
        };
        this.scene.tweens.add({
            targets: state,
            spread: 1,
            duration: 900,
            delay: 260,
            ease: "Cubic.Out",
            onUpdate: drawContact
        });

        const label = (y, text, size, color, origin = 0.5) => this.add(
            this.scene.add.text(centerX, y, text, {
                fontFamily: GAME_FONT,
                fontSize: `${size}px`,
                fontStyle: "bold",
                color,
                align: "center",
                lineSpacing: Math.round(size * 0.5),
                wordWrap: { width: width - 72, useAdvancedWrap: true }
            }).setOrigin(0.5, origin).setScrollFactor(0).setDepth(123).setAlpha(0)
        );

        const above = label(
            lineY - (compact ? 30 : 40),
            `${gap.above.name.toUpperCase()}  ·  ${gap.above.ma.toLocaleString()} Ma`,
            compact ? 15 : 18,
            UI.mutedHex,
            1
        );
        const below = label(
            lineY + (compact ? 30 : 40),
            `${gap.below.name.toUpperCase()}  ·  ${gap.below.ma.toLocaleString()} Ma`,
            compact ? 15 : 18,
            UI.mutedHex,
            0
        );

        const title = label(
            lineY - (compact ? 150 : 196),
            gap.title,
            compact ? 17 : 21,
            UI.accentHex
        );
        const amount = label(
            lineY - (compact ? 104 : 136),
            gap.millionYears.toLocaleString(),
            compact ? 58 : 84,
            UI.keywordHex
        );
        const unit = label(
            lineY - (compact ? 68 : 88),
            "MILLION YEARS MISSING",
            compact ? 16 : 20,
            UI.bodyHex
        );
        const closing = label(
            lineY + (compact ? 92 : 116),
            gap.closing,
            compact ? 16 : 20,
            UI.bodyHex
        );

        // Chữ hiện dần từ trên xuống, không ập ra cùng lúc.
        [title, amount, unit, above, below, closing].forEach((item, index) => {
            this.scene.tweens.add({
                targets: item,
                alpha: 1,
                duration: 460,
                delay: 420 + index * 180,
                ease: "Sine.Out"
            });
        });

        const continueButton = label(
            Math.min(height - 30, lineY + (compact ? 176 : 206)),
            "CONTINUE",
            compact ? 16 : 18,
            UI.accentHex
        ).setBackgroundColor("#152433ee").setPadding(16, 9).setInteractive({ useHandCursor: true });
        continueButton.on("pointerdown", () => this.tryContinue());
        this.scene.tweens.add({ targets: continueButton, alpha: 1, duration: 400, delay: 1500 });
    }

    tryContinue() {
        if (!this.isOpen) return false;
        if (this.scene.time.now - this.openedAt < 1500) return false;
        this.finish();
        return true;
    }

    finish() {
        if (!this.isOpen) return;
        if (this.scene.time.now - this.openedAt < 1500) return;
        const callback = this.onDone;
        this.close(false);
        retroMusic.setReading(false);
        callback?.();
    }

    add(item) {
        this.items.push(item);
        return item;
    }

    close(runCallback = false) {
        const callback = runCallback ? this.onDone : null;
        this.items.forEach((item) => item?.destroy());
        this.items = [];
        this.isOpen = false;
        this.onDone = null;
        callback?.();
    }
}
