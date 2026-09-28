// Dải đá vẽ tràn ra ngoài mép màn hình một chút để camera giật ngang khi va
// chạm không để lộ nền trống.
export const WORLD_BLEED = 48;

import { ROCK_LAYERS } from "../data/layers.js?v=5.1.2";

const Phaser = window.Phaser;

export class ExpeditionWorld {
    constructor(scene, config) {
        this.scene = scene;
        this.width = config.width;
        this.height = config.height;
        this.surfaceY = config.surfaceY;
        this.layerStartY = config.layerStartY;
        this.layerHeight = config.layerHeight;
        this.anchorX = config.anchorX;
        this.record = config.record;

        this.background = scene.add.graphics().setDepth(-20);
        this.craterGraphics = scene.add.graphics().setDepth(2);
        this.draw();
    }

    draw() {
        this.drawSky();
        this.drawCanyon();
        this.drawStrata();
        this.drawSurfaceDetails();
    }

    drawSky() {
        const g = this.background;
        const top = 0;
        const height = this.surfaceY;
        const colors = [0x555a78, 0x74627d, 0x9a6c7d, 0xc87972, 0xe89162, 0xf6bd69];
        const band = Math.ceil(height / colors.length);

        colors.forEach((color, index) => {
            g.fillStyle(color, 1).fillRect(-WORLD_BLEED, top + index * band, this.width + WORLD_BLEED * 2, band + 2);
        });

        const unit = Math.max(3, Math.round(Math.min(this.width, this.height) / 190));
        const sunX = Math.round(this.width * 0.78);
        const sunY = Math.round(this.surfaceY - this.height * 0.82);
        g.fillStyle(0xffd27a, 1);
        g.fillRect(sunX - unit * 5, sunY - unit * 3, unit * 10, unit * 6);
        g.fillRect(sunX - unit * 4, sunY - unit * 4, unit * 8, unit * 8);
        this.drawCloud(this.width * 0.11, this.surfaceY - this.height * 0.73, unit);
        this.drawCloud(this.width * 0.52, this.surfaceY - this.height * 0.58, unit);
    }

    drawCloud(x, y, unit) {
        const g = this.background;
        const u = Math.max(3, Math.round(unit));
        g.fillStyle(0xffead6, 0.75).fillRect(x, y, u * 12, u * 3);
        g.fillRect(x + u * 2, y - u * 2, u * 7, u * 3);
        g.fillRect(x + u * 5, y - u * 3, u * 3, u * 2);
    }

    drawCanyon() {
        const g = this.background;
        const w = this.width;
        const sy = this.surfaceY;

        g.fillStyle(0x71434b, 1).fillPoints([
            new Phaser.Geom.Point(0, sy), new Phaser.Geom.Point(0, sy - 92),
            new Phaser.Geom.Point(w * 0.12, sy - 92), new Phaser.Geom.Point(w * 0.16, sy - 138),
            new Phaser.Geom.Point(w * 0.31, sy - 138), new Phaser.Geom.Point(w * 0.35, sy - 84),
            new Phaser.Geom.Point(w * 0.48, sy - 84), new Phaser.Geom.Point(w * 0.53, sy - 154),
            new Phaser.Geom.Point(w * 0.67, sy - 154), new Phaser.Geom.Point(w * 0.72, sy - 88),
            new Phaser.Geom.Point(w * 0.85, sy - 88), new Phaser.Geom.Point(w * 0.89, sy - 122),
            new Phaser.Geom.Point(w, sy - 122), new Phaser.Geom.Point(w, sy)
        ], true);

        g.fillStyle(0xa65342, 1).fillPoints([
            new Phaser.Geom.Point(0, sy), new Phaser.Geom.Point(0, sy - 38),
            new Phaser.Geom.Point(w * 0.18, sy - 38), new Phaser.Geom.Point(w * 0.24, sy - 66),
            new Phaser.Geom.Point(w * 0.42, sy - 66), new Phaser.Geom.Point(w * 0.48, sy - 34),
            new Phaser.Geom.Point(w * 0.64, sy - 34), new Phaser.Geom.Point(w * 0.71, sy - 62),
            new Phaser.Geom.Point(w * 0.9, sy - 62), new Phaser.Geom.Point(w, sy - 30),
            new Phaser.Geom.Point(w, sy)
        ], true);
    }

    drawStrata() {
        const g = this.background;
        ROCK_LAYERS.forEach((layer, index) => {
            const y = this.layerStartY + index * this.layerHeight;
            g.fillStyle(layer.color, 1).fillRect(-WORLD_BLEED, y, this.width + WORLD_BLEED * 2, this.layerHeight + 1);
            g.fillStyle(0x211720, 0.42).fillRect(-WORLD_BLEED, y, this.width + WORLD_BLEED * 2, 5);
            this.drawLayerTexture(g, layer, y);
        });

        g.fillStyle(0x17121b, 1).fillRect(
            -WORLD_BLEED,
            this.layerStartY + ROCK_LAYERS.length * this.layerHeight,
            this.width + WORLD_BLEED * 2,
            this.height * 0.6
        );
        g.fillStyle(0xf0b45f, 1).fillRect(-WORLD_BLEED, this.surfaceY - 12, this.width + WORLD_BLEED * 2, 14);
    }

    drawLayerTexture(g, layer, y) {
        const w = this.width;
        const h = this.layerHeight;
        const accent = layer.accent;
        g.lineStyle(3, accent, 0.5).fillStyle(accent, 0.48);

        if (layer.texture === "chertyLimestone") {
            [0.32, 0.66].forEach((ratio) => g.fillRect(0, y + h * ratio, w, 4));
            for (let x = 0; x < w; x += 72) {
                g.fillRect(x + 26, y + 6, 4, h * 0.3);
                g.fillRect(x + 58, y + h * 0.34, 4, h * 0.3);
                g.fillEllipse(x + 18, y + h * 0.22, 18, 9);
                g.fillEllipse(x + 52, y + h * 0.78, 22, 10);
            }
            return;
        }

        if (layer.texture === "crossBedding") {
            g.lineStyle(4, accent, 0.52);
            for (let row = 0; row < 4; row += 1) {
                const rowY = y + 16 + row * h * 0.24;
                for (let x = -50; x < w; x += 82) g.lineBetween(x, rowY, x + 72, rowY + 34);
            }
            return;
        }

        if (layer.texture === "massiveLimestone") {
            g.lineStyle(5, accent, 0.52);
            [0.27, 0.58, 0.82].forEach((ratio) => g.lineBetween(0, y + h * ratio, w, y + h * ratio));
            for (let x = 55; x < w; x += 108) {
                g.lineBetween(x, y + 6, x, y + h * 0.27);
                g.lineBetween(x + 48, y + h * 0.3, x + 48, y + h * 0.58);
            }
            g.fillStyle(layer.secondary, 0.38);
            for (let x = 20; x < w; x += 96) g.fillRect(x, y + 8, 6, h - 18);
            return;
        }

        if (layer.texture === "thinShale") {
            for (let line = 1; line < 11; line += 1) {
                const lineY = y + line * (h / 11);
                const offset = line % 2 === 0 ? 0 : 18;
                for (let x = -offset; x < w; x += 58) g.fillRect(x, lineY, 43, 3);
            }
            return;
        }

        if (layer.texture === "pebblySandstone") {
            g.lineStyle(3, accent, 0.42);
            for (let row = 0; row < 3; row += 1) {
                const rowY = y + 22 + row * h * 0.3;
                for (let x = -40; x < w; x += 96) g.lineBetween(x, rowY + 26, x + 82, rowY);
            }
            g.fillStyle(accent, 0.62);
            for (let x = 15; x < w; x += 42) {
                const pebbleY = y + h * (0.2 + ((x / 42) % 4) * 0.18);
                g.fillEllipse(x, pebbleY, 10 + (x % 3) * 3, 7);
            }
            return;
        }

        if (layer.texture === "basaltFlows") {
            [0.22, 0.47, 0.72].forEach((ratio) => g.fillRect(0, y + h * ratio, w, 8));
            for (let x = 28; x < w; x += 58) {
                const offset = (x / 58) % 2 === 0 ? 0 : h * 0.12;
                g.fillRect(x, y + 10 + offset, 5, h * 0.28);
                g.fillRect(x + 18, y + h * 0.55 - offset, 5, h * 0.26);
            }
            g.fillStyle(layer.secondary, 0.65).fillRect(0, y + h * 0.84, w, 7);
            return;
        }

        if (layer.texture === "mixedBeds") {
            for (let band = 0; band < 9; band += 1) {
                const bandY = y + 12 + band * (h / 9);
                g.fillRect((band % 3) * 14, bandY, w - (band % 2) * 36, band % 2 === 0 ? 6 : 3);
            }
            return;
        }

        if (layer.texture === "rippleMud") {
            g.lineStyle(3, accent, 0.55);
            for (let row = 0; row < 7; row += 1) {
                const rowY = y + 16 + row * (h / 7);
                for (let x = 0; x < w; x += 48) {
                    g.lineBetween(x, rowY, x + 22, rowY - 4);
                    g.lineBetween(x + 22, rowY - 4, x + 46, rowY);
                }
            }
            for (let x = 34; x < w; x += 94) {
                g.lineBetween(x, y + h * 0.42, x + 8, y + h * 0.55);
                g.lineBetween(x + 8, y + h * 0.55, x - 3, y + h * 0.66);
            }
            return;
        }

        if (layer.texture === "stromatoliteBeds") {
            g.lineStyle(4, accent, 0.5);
            [0.3, 0.62, 0.88].forEach((ratio) => g.lineBetween(0, y + h * ratio, w, y + h * ratio));
            g.lineStyle(4, layer.secondary, 0.7);
            for (let x = 24; x < w; x += 70) {
                const radius = 18 + (x % 4);
                g.beginPath();
                g.arc(x, y + h * 0.62, radius, Math.PI, Math.PI * 2, false);
                g.strokePath();
                g.beginPath();
                g.arc(x, y + h * 0.3, radius * 0.72, Math.PI, Math.PI * 2, false);
                g.strokePath();
            }
            return;
        }

        if (layer.texture === "foldedFoliation") {
            g.lineStyle(4, accent, 0.58);
            for (let x = 18; x < w; x += 42) {
                let lastX = x;
                let lastY = y;
                for (let segment = 1; segment <= 8; segment += 1) {
                    const nextY = y + segment * (h / 8);
                    const nextX = x + Math.sin(segment * 1.5 + x) * 12;
                    g.lineBetween(lastX, lastY, nextX, nextY);
                    lastX = nextX;
                    lastY = nextY;
                }
            }
        }
    }

    drawSurfaceDetails() {
        this.drawTree(Math.round(this.width * 0.18), this.surfaceY - 14);
        this.drawSlingshot();
        if (this.record.discovered > 0 && this.record.holeX !== null) {
            this.drawOldShaft(this.record.holeX * this.width);
        }
    }

    drawTree(x, y) {
        const g = this.background;
        const u = Math.round(6 * Phaser.Math.Clamp(Math.min(this.width, this.height) / 650, 0.75, 1.45));
        g.fillStyle(0x5b322c, 1).fillRect(x - u, y - u * 8, u * 2, u * 8);
        g.fillStyle(0x355047, 1).fillRect(x - u * 3, y - u * 10, u * 6, u * 4);
        g.fillRect(x - u * 5, y - u * 8, u * 4, u * 3);
        g.fillRect(x + u, y - u * 7, u * 4, u * 3);
    }

    drawSlingshot() {
        const g = this.background;
        const x = this.anchorX;
        const y = this.surfaceY;
        g.fillStyle(0x241923, 1).fillRect(x - 12, y - 57, 24, 58);
        g.fillRect(x - 49, y - 83, 22, 58).fillRect(x + 27, y - 83, 22, 58);
        g.fillStyle(0x734330, 1).fillRect(x - 7, y - 52, 14, 53);
        g.fillRect(x - 44, y - 78, 12, 50).fillRect(x + 32, y - 78, 12, 50);
        g.fillStyle(0xb76b3f, 1).fillRect(x - 42, y - 76, 5, 41);
        g.fillRect(x + 34, y - 76, 5, 41);
    }

    drawOldShaft(x) {
        const g = this.craterGraphics;
        const safeX = Phaser.Math.Clamp(x, 30, this.width - 30);
        g.fillStyle(0xffd166, 0.55).fillRect(safeX - 27, this.surfaceY - 18, 54, 5);
        g.fillStyle(0x17121b, 1).fillEllipse(safeX, this.surfaceY - 2, 38, 17);
        g.fillStyle(0xffd166, 1).fillRect(safeX - 3, this.surfaceY - 31, 6, 10);
    }

    drawCrater(x, power) {
        const g = this.craterGraphics;
        const radius = 34 + power * 0.38;
        g.fillStyle(0x3a2024, 1).fillEllipse(x, this.surfaceY - 1, radius * 2.2, radius * 0.72);
        g.fillStyle(0x17121b, 1).fillEllipse(x, this.surfaceY + 2, radius * 1.55, radius * 0.47);
        g.lineStyle(4, 0x653335, 0.9);
        for (let index = 0; index < 8; index += 1) {
            const angle = (Math.PI * 2 * index) / 8;
            const innerX = x + Math.cos(angle) * radius * 0.72;
            const innerY = this.surfaceY + Math.sin(angle) * radius * 0.2;
            const outerX = x + Math.cos(angle) * radius * 1.45;
            const outerY = this.surfaceY + Math.sin(angle) * radius * 0.42;
            g.lineBetween(innerX, innerY, outerX, outerY);
        }
    }

    bandAnchors() {
        return {
            left: { x: this.anchorX - 38, y: this.surfaceY - 79 },
            right: { x: this.anchorX + 38, y: this.surfaceY - 79 }
        };
    }
}
