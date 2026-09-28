import { GAME_FONT, UI } from "../core/theme.js?v=5.1.2";

export function makeDrill(scene, scale = 1) {
    const body = scene.add.graphics();
    body.fillStyle(0x271d28, 1).fillRect(-19, -35, 38, 55).fillRect(-25, 5, 50, 13);
    body.fillStyle(0x66e0cf, 1).fillRect(-14, -30, 28, 44);
    body.fillStyle(0x91eadc, 1).fillRect(-9, -25, 7, 31);
    body.fillStyle(0xffd166, 1).fillRect(-9, -18, 18, 12);
    body.fillStyle(0x28394d, 1).fillRect(-5, -15, 10, 7);
    body.fillStyle(0xf5e4ba, 1).fillRect(-17, 15, 34, 7);

    const bit = scene.add.graphics();
    const drawBit = (alternate = false) => {
        bit.clear();
        bit.fillStyle(0x271d28, 1).fillTriangle(-13, 23, 13, 23, 0, 49);
        bit.fillStyle(0xc7d0d1, 1).fillTriangle(-8, 24, 8, 24, 0, 44);
        bit.fillStyle(0xffffff, 1);
        const offset = alternate ? 4 : -4;
        bit.fillRect(offset - 3, 28, 7, 5).fillRect(-offset - 3, 36, 7, 5);
    };
    drawBit(false);

    const container = scene.add.container(0, 0, [body, bit]).setScale(scale);
    return { container, drawBit };
}

export function pixelButton(scene, label, callback) {
    const button = scene.add.text(0, 0, `[ ${label} ]`, {
        fontFamily: GAME_FONT,
        fontSize: "21px",
        fontStyle: "bold",
        color: "#08131d",
        backgroundColor: "#ffd166",
        padding: { x: 12, y: 9 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on("pointerover", () => button.setStyle({ backgroundColor: "#f7fbff" }));
    button.on("pointerout", () => button.setStyle({ backgroundColor: "#ffd166" }));
    button.on("pointerdown", callback);
    return button;
}

// Overlays are drawn in screen space. Containers pass their transform down, so
// every nested child needs the scroll factor cleared too.
export function pinToScreen(object) {
    object?.setScrollFactor?.(0);
    if (Array.isArray(object?.list)) object.list.forEach(pinToScreen);
    return object;
}

// Shared button for the onboarding cards and the start menu: fixed box, so a
// longer label never moves the target the player is aiming at.
export function makePanelButton(scene, {
    x,
    y,
    width,
    height,
    label,
    fontSize = 24,
    primary = false,
    depth = 153,
    onPress
}) {
    const face = scene.add.rectangle(x, y, width, height, primary ? UI.accent : UI.card, 1)
        .setStrokeStyle(3, primary ? UI.accent : UI.cardEdge, 1)
        .setScrollFactor(0)
        .setDepth(depth)
        .setInteractive({ useHandCursor: true });

    const text = scene.add.text(x, y, label, {
        fontFamily: GAME_FONT,
        fontSize: `${fontSize}px`,
        fontStyle: "bold",
        color: primary ? UI.backdropHex : UI.bodyHex
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth + 1);

    const button = { face, text, primary, enabled: true, width };

    const fit = () => {
        text.setScale(1);
        if (text.width > width - 18) text.setScale((width - 18) / text.width);
    };

    button.paint = (hover = false) => {
        if (!button.enabled) {
            face.setFillStyle(UI.card, 1).setStrokeStyle(3, UI.cardEdge, 1);
            text.setColor(UI.mutedHex).setAlpha(0.45);
            return;
        }
        text.setAlpha(1);
        if (primary) {
            face.setFillStyle(hover ? 0x8fe3d4 : UI.accent, 1).setStrokeStyle(3, UI.accent, 1);
            text.setColor(UI.backdropHex);
        } else {
            face.setFillStyle(hover ? 0x27414b : UI.card, 1)
                .setStrokeStyle(3, hover ? UI.accent : UI.cardEdge, 1);
            text.setColor(hover ? UI.accentHex : UI.bodyHex);
        }
    };

    button.setLabel = (next) => {
        if (text.text === next) return;
        text.setText(next);
        fit();
    };

    button.setEnabled = (enabled) => {
        button.enabled = enabled;
        if (enabled) face.setInteractive({ useHandCursor: true });
        else face.disableInteractive();
        button.paint(false);
    };

    button.destroy = () => {
        face.destroy();
        text.destroy();
    };

    face.on("pointerover", () => button.paint(true));
    face.on("pointerout", () => button.paint(false));
    face.on("pointerdown", () => {
        if (!button.enabled) return;
        scene.unlockAudio?.();
        onPress?.();
    });

    fit();
    button.paint(false);
    return button;
}
