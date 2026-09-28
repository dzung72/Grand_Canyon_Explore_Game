import { ROCK_LAYERS, getLayerEvidence } from "../data/layers.js?v=4.6.3";
import { getLayerChallenge } from "./layerChallenges.js?v=4.6.3";
import { GAME_FONT } from "../core/theme.js?v=4.6.1";

const Phaser = window.Phaser;

const SAMPLE_STYLES = {
    AGE: { color: 0xf6e27a, letter: "A" },
    ROCK: { color: 0xffa044, letter: "R" },
    FIELD: { color: 0xf28dc8, letter: "F" },
    ENV: { color: 0x66e0cf, letter: "E" },
    LIFE: { color: 0xffd166, letter: "L" },
    EVENT: { color: 0xc69cff, letter: "!" }
};

function shadeColor(color, factor) {
    const red = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
    const green = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
    const blue = Math.min(255, Math.round((color & 0xff) * factor));
    return (red << 16) | (green << 8) | blue;
}

export class EvidenceCourse {
    constructor(scene, config) {
        this.scene = scene;
        this.laneCenters = config.laneCenters;
        this.arenaLeft = config.arenaLeft;
        this.arenaRight = config.arenaRight;
        this.layerStartY = config.layerStartY;
        this.layerHeight = config.layerHeight;
        this.previousBest = config.previousBest;
        this.usesShaft = config.usesShaft;
        this.samples = [];
        this.fuelCans = [];
        this.obstacles = [];
        this.environmentZones = [];
        this.mazeWalls = [];
        this.build();
    }

    build() {
        const samplePattern = [
            { x: 0.38, y: 0.18 },
            { x: 0.84, y: 0.3 },
            { x: 0.54, y: 0.46 },
            { x: 0.18, y: 0.68 },
            { x: 0.78, y: 0.8 }
        ];
        const arenaWidth = this.arenaRight - this.arenaLeft;
        ROCK_LAYERS.forEach((layer, layerIndex) => {
            const challenge = getLayerChallenge(layerIndex);
            this.createLayerDetails(layer, layerIndex);
            getLayerEvidence(layer).forEach((clue, clueIndex) => {
                const point = samplePattern[(clueIndex + layerIndex * 2) % samplePattern.length];
                const ratioX = layerIndex % 2 === 0 ? point.x : 1 - point.x;
                const x = this.arenaLeft + arenaWidth * ratioX;
                const y = this.layerStartY + (layerIndex + point.y) * this.layerHeight;
                this.samples.push(this.createSample(layerIndex, clueIndex, clue, x, y));
            });
            const hasTwoFuelCans = layerIndex >= 2;
            const fuelPositions = hasTwoFuelCans
                ? [
                    { x: layerIndex % 2 === 0 ? 0.86 : 0.14, y: 0.24 },
                    { x: layerIndex % 2 === 0 ? 0.18 : 0.82, y: 0.72 }
                ]
                : [{ x: layerIndex % 2 === 0 ? 0.9 : 0.1, y: 0.54 }];
            fuelPositions.forEach((position) => {
                this.fuelCans.push(this.createFuelCan(
                    layerIndex,
                    this.arenaLeft + arenaWidth * position.x,
                    this.layerStartY + (layerIndex + position.y) * this.layerHeight
                ));
            });

            const obstacleRatios = layerIndex % 2 === 0
                ? [
                    { x: 0.66, y: 0.2 }, { x: 0.24, y: 0.4 },
                    { x: 0.7, y: 0.61 }, { x: 0.42, y: 0.84 }
                ]
                : [
                    { x: 0.3, y: 0.22 }, { x: 0.7, y: 0.4 },
                    { x: 0.28, y: 0.61 }, { x: 0.62, y: 0.84 }
                ];
            if (layerIndex >= 4) obstacleRatios.push({ x: layerIndex % 2 === 0 ? 0.47 : 0.53, y: 0.31 });
            if (layerIndex >= 7) obstacleRatios.push({ x: layerIndex % 2 === 0 ? 0.55 : 0.45, y: 0.72 });
            obstacleRatios.forEach((point, obstacleIndex) => {
                const x = this.arenaLeft + arenaWidth * point.x;
                const y = this.layerStartY + (layerIndex + point.y) * this.layerHeight;
                this.obstacles.push(this.createObstacle(
                    layer,
                    layerIndex,
                    x,
                    y,
                    (layerIndex + obstacleIndex) % 5,
                    challenge,
                    obstacleIndex
                ));
            });
            this.createLayerEnvironment(layer, layerIndex, challenge);
        });
    }

    createLayerEnvironment(layer, layerIndex, challenge) {
        if (!challenge.environment) return;
        const width = this.arenaRight - this.arenaLeft;
        const top = this.layerStartY + layerIndex * this.layerHeight;
        const zoneGraphic = this.scene.add.graphics().setDepth(4);
        const addZone = (type, xRatio, yRatio, widthRatio, heightRatio, direction = 1, extra = {}) => {
            const bounds = new Phaser.Geom.Rectangle(
                this.arenaLeft + width * xRatio,
                top + this.layerHeight * yRatio,
                width * widthRatio,
                this.layerHeight * heightRatio
            );
            this.environmentZones.push({ type, layerIndex, bounds, direction, graphic: zoneGraphic, ...extra });
            return bounds;
        };

        if (challenge.environment === "sandGust") {
            const zones = [
                addZone("sandGust", 0.04, 0.18, 0.58, 0.24, 1),
                addZone("sandGust", 0.38, 0.59, 0.58, 0.22, -1)
            ];
            zones.forEach((bounds, index) => {
                zoneGraphic.fillStyle(0xf6e27a, 0.1).fillRectShape(bounds);
                zoneGraphic.lineStyle(3, 0xffe0a3, 0.48).strokeRectShape(bounds);
                for (let line = 0; line < 5; line += 1) {
                    const lineY = bounds.y + 15 + line * Math.max(12, (bounds.height - 30) / 4);
                    const direction = index === 0 ? 1 : -1;
                    const startX = direction > 0 ? bounds.x + 14 : bounds.right - 14;
                    zoneGraphic.lineBetween(startX, lineY, startX + direction * Math.min(70, bounds.width * 0.35), lineY);
                }
            });
            this.addEnvironmentLabel("WIND-BLOWN SAND GUSTS", top + this.layerHeight * 0.5, 0xf6e27a);
            return;
        }

        if (challenge.environment === "caveDrop") {
            const bounds = addZone("caveDrop", 0.34, 0.3, 0.34, 0.4);
            zoneGraphic.fillStyle(0x071018, 0.78).fillEllipse(
                bounds.centerX,
                bounds.centerY,
                bounds.width,
                bounds.height
            );
            zoneGraphic.lineStyle(4, 0x9c4f43, 0.8).strokeEllipse(
                bounds.centerX,
                bounds.centerY,
                bounds.width,
                bounds.height
            );
            for (let arrow = 0; arrow < 3; arrow += 1) {
                const arrowY = bounds.y + 28 + arrow * (bounds.height - 56) / 2;
                zoneGraphic.lineBetween(bounds.centerX, arrowY - 12, bounds.centerX, arrowY + 12);
                zoneGraphic.lineBetween(bounds.centerX, arrowY + 12, bounds.centerX - 7, arrowY + 4);
                zoneGraphic.lineBetween(bounds.centerX, arrowY + 12, bounds.centerX + 7, arrowY + 4);
            }
            this.addEnvironmentLabel("KARST CAVE DROP", bounds.y - 18, 0xff8a66);
            return;
        }

        if (challenge.environment === "shaleSlide") {
            const zones = [
                addZone("shaleSlide", 0.08, 0.24, 0.38, 0.2),
                addZone("shaleSlide", 0.54, 0.57, 0.38, 0.2)
            ];
            zones.forEach((bounds) => {
                zoneGraphic.fillStyle(0x434b40, 0.28).fillRectShape(bounds);
                zoneGraphic.lineStyle(3, 0xc7d0ad, 0.6).strokeRectShape(bounds);
                for (let slice = 10; slice < bounds.width; slice += 28) {
                    zoneGraphic.lineBetween(bounds.x + slice, bounds.y + 5, bounds.x + slice + 12, bounds.bottom - 5);
                }
            });
            this.addEnvironmentLabel("FRAGILE SHALE SLIDE", top + this.layerHeight * 0.5, 0xc7d0ad);
            return;
        }

        if (challenge.environment === "resistance") {
            [
                addZone("resistance", 0.08, 0.22, 0.2, 0.16, 1, { id: `hot-${layerIndex}-0` }),
                addZone("resistance", 0.38, 0.39, 0.2, 0.15, 1, { id: `hot-${layerIndex}-1` }),
                addZone("resistance", 0.73, 0.61, 0.18, 0.14, 1, { id: `hot-${layerIndex}-2` })
            ].forEach((bounds) => {
                zoneGraphic.fillStyle(0x101923, 0.38).fillRectShape(bounds);
                zoneGraphic.lineStyle(3, 0xffa044, 0.62).strokeRectShape(bounds);
                for (let offset = -bounds.height; offset < bounds.width; offset += 26) {
                    zoneGraphic.lineBetween(
                        bounds.x + Math.max(0, offset),
                        bounds.y + Math.max(0, -offset),
                        bounds.x + Math.min(bounds.width, offset + bounds.height),
                        bounds.bottom - Math.max(0, offset + bounds.height - bounds.width)
                    );
                }
            });
            this.addEnvironmentLabel("HOT BASALT POCKETS • −15% FUEL", top + this.layerHeight * 0.52, 0xffa044);
            return;
        }

        if (challenge.environment === "riverDelta") {
            const channelColor = 0x69b7d6;
            const channels = [
                { bounds: addZone("riverCurrent", 0.02, 0.12, 0.62, 0.18, 1, { pushY: 38 }), direction: 1 },
                { bounds: addZone("riverCurrent", 0.36, 0.39, 0.62, 0.18, -1, { pushY: 48 }), direction: -1 },
                { bounds: addZone("riverCurrent", 0.02, 0.68, 0.62, 0.18, 1, { pushY: 34 }), direction: 1 }
            ];
            channels.forEach(({ bounds, direction }) => {
                zoneGraphic.fillStyle(channelColor, 0.2).fillRectShape(bounds);
                zoneGraphic.lineStyle(4, 0x91eadc, 0.7).strokeRectShape(bounds);
                for (let column = 0; column < 5; column += 1) {
                    const arrowX = bounds.x + 28 + column * Math.max(26, (bounds.width - 56) / 4);
                    const arrowY = bounds.centerY;
                    zoneGraphic.lineBetween(arrowX - 12 * direction, arrowY, arrowX + 12 * direction, arrowY);
                    zoneGraphic.lineBetween(arrowX + 12 * direction, arrowY, arrowX + 5 * direction, arrowY - 7);
                    zoneGraphic.lineBetween(arrowX + 12 * direction, arrowY, arrowX + 5 * direction, arrowY + 7);
                }
            });

            const eddy = {
                type: "eddy",
                layerIndex,
                centerX: this.arenaLeft + width * 0.78,
                centerY: top + this.layerHeight * 0.78,
                radius: Math.min(62, width * 0.1),
                graphic: zoneGraphic
            };
            eddy.bounds = new Phaser.Geom.Rectangle(
                eddy.centerX - eddy.radius,
                eddy.centerY - eddy.radius,
                eddy.radius * 2,
                eddy.radius * 2
            );
            this.environmentZones.push(eddy);
            zoneGraphic.fillStyle(0x69b7d6, 0.18).fillCircle(eddy.centerX, eddy.centerY, eddy.radius);
            zoneGraphic.lineStyle(4, 0x91eadc, 0.78).strokeCircle(eddy.centerX, eddy.centerY, eddy.radius);
            zoneGraphic.beginPath();
            zoneGraphic.arc(eddy.centerX, eddy.centerY, eddy.radius * 0.58, 0.25, Math.PI * 1.72, false);
            zoneGraphic.strokePath();
            this.addEnvironmentLabel("BRAIDED CHANNELS + EDDY", top + this.layerHeight * 0.59, 0x91eadc);
            return;
        }

        if (["current", "pulse"].includes(challenge.environment)) {
            const type = challenge.environment;
            const bounds = addZone(type, 0.04, 0.28, 0.92, 0.42, layerIndex % 2 === 0 ? 1 : -1);
            const color = type === "pulse" ? 0x91eadc : 0x69b7d6;
            zoneGraphic.fillStyle(color, 0.11).fillRectShape(bounds);
            zoneGraphic.lineStyle(3, color, 0.55).strokeRectShape(bounds);
            for (let row = 0; row < 3; row += 1) {
                for (let column = 0; column < 6; column += 1) {
                    const arrowX = bounds.x + 30 + column * (bounds.width - 60) / 5;
                    const arrowY = bounds.y + 28 + row * (bounds.height - 56) / 2;
                    zoneGraphic.lineBetween(arrowX - 13, arrowY, arrowX + 13, arrowY);
                    zoneGraphic.lineBetween(arrowX + 13, arrowY, arrowX + 5, arrowY - 7);
                    zoneGraphic.lineBetween(arrowX + 13, arrowY, arrowX + 5, arrowY + 7);
                }
            }
            this.addEnvironmentLabel(type === "pulse" ? "REVERSING TIDAL FLOW" : "CHANNEL CURRENT", bounds.y - 18, color);
            return;
        }

        if (challenge.environment === "maze") {
            const wallColor = shadeColor(layer.color, 0.55);
            const wallHeight = 30;
            const wallWidth = width * 0.82;
            [0.31, 0.54, 0.76].forEach((ratioY, index) => {
                const bounds = new Phaser.Geom.Rectangle(
                    this.arenaLeft,
                    top + this.layerHeight * ratioY,
                    wallWidth,
                    wallHeight
                );
                const wallGraphic = this.scene.add.graphics().setPosition(bounds.x, bounds.y).setDepth(5);
                wallGraphic.fillStyle(wallColor, 0.97).fillRect(0, 0, bounds.width, bounds.height);
                wallGraphic.lineStyle(3, 0xa45d4f, 0.95).strokeRect(0, 0, bounds.width, bounds.height);
                for (let mound = 18; mound < bounds.width; mound += 42) {
                    wallGraphic.strokeCircle(mound, wallHeight / 2, 10 + index * 2);
                }
                this.mazeWalls.push({
                    layerIndex,
                    bounds,
                    graphic: wallGraphic,
                    travel: width - wallWidth,
                    phase: index * 0.34,
                    speed: 0.00007225 + index * 0.0000074375
                });
            });
            this.addEnvironmentLabel("SHIFTING STROMATOLITE GATES", top + this.layerHeight * 0.44, 0xffd166);
            return;
        }

        if (challenge.environment === "gauntlet") {
            const resistance = addZone("resistance", 0.35, 0.38, 0.3, 0.25);
            const current = addZone("current", 0.04, 0.68, 0.92, 0.18, -1);
            zoneGraphic.fillStyle(0x101923, 0.42).fillRectShape(resistance);
            zoneGraphic.lineStyle(3, 0xe7d2bd, 0.65).strokeRectShape(resistance);
            zoneGraphic.fillStyle(0x91eadc, 0.1).fillRectShape(current);
            zoneGraphic.lineStyle(3, 0x91eadc, 0.52).strokeRectShape(current);
            this.addEnvironmentLabel("FOLIATION PRESSURE", top + this.layerHeight * 0.33, 0xe7d2bd);
        }
    }

    addEnvironmentLabel(text, y, color) {
        this.scene.add.text((this.arenaLeft + this.arenaRight) / 2, y, text, {
            fontFamily: GAME_FONT,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#101923",
            backgroundColor: Phaser.Display.Color.IntegerToColor(color).rgba,
            padding: { x: 7, y: 3 }
        }).setOrigin(0.5).setDepth(5);
    }

    createLayerDetails(layer, layerIndex) {
        const graphic = this.scene.add.graphics().setDepth(3);
        const width = this.arenaRight - this.arenaLeft;
        const top = this.layerStartY + layerIndex * this.layerHeight;
        const x = (ratio) => this.arenaLeft + width * ratio;
        const y = (ratio) => top + this.layerHeight * ratio;
        const light = shadeColor(layer.color, 1.28);
        const dark = shadeColor(layer.color, 0.42);
        graphic.lineStyle(3, light, 0.66).fillStyle(dark, 0.62);
        const landmarkNames = {
            chertyLimestone: "SHELLS + CHERT",
            crossBedding: "TRACKWAY",
            massiveLimestone: "KARST CAVE",
            thinShale: "TRILOBITE + BURROWS",
            pebblySandstone: "ROUNDED PEBBLES",
            basaltFlows: "LAVA + COOLING JOINTS",
            mixedBeds: "ANCIENT CHANNEL",
            rippleMud: "MUDCRACKS",
            stromatoliteBeds: "STROMATOLITES",
            foldedFoliation: "GRANITE VEIN"
        };
        this.scene.add.text(x(0.06), y(0.91), landmarkNames[layer.texture] || "FIELD CLUE", {
            fontFamily: GAME_FONT,
            fontSize: "17px",
            fontStyle: "bold",
            color: "#f7fbff",
            backgroundColor: "#101923cc",
            padding: { x: 7, y: 4 }
        }).setOrigin(0, 0.5).setDepth(4);

        if (layer.texture === "chertyLimestone") {
            [0.24, 0.58, 0.88].forEach((ratio, index) => {
                graphic.fillEllipse(x(ratio), y(0.34 + index * 0.18), 26, 13);
            });
            [0.12, 0.7].forEach((ratio) => {
                graphic.beginPath();
                graphic.arc(x(ratio), y(0.76), 18, Math.PI, Math.PI * 2, false);
                graphic.strokePath();
                graphic.lineBetween(x(ratio) - 18, y(0.76), x(ratio) + 18, y(0.76));
            });
            return;
        }

        if (layer.texture === "crossBedding") {
            graphic.fillStyle(dark, 0.72);
            for (let step = 0; step < 5; step += 1) {
                const px = x(0.18 + step * 0.14);
                const py = y(0.28 + step * 0.1);
                graphic.fillEllipse(px, py, 11, 20);
                graphic.fillCircle(px - 7, py - 11, 3);
                graphic.fillCircle(px, py - 14, 3);
                graphic.fillCircle(px + 7, py - 11, 3);
            }
            return;
        }

        if (layer.texture === "massiveLimestone") {
            graphic.fillStyle(0x101923, 0.72).fillEllipse(x(0.16), y(0.7), 108, 58);
            graphic.lineStyle(3, light, 0.72);
            [0.68, 0.73, 0.78].forEach((ratio) => {
                graphic.lineBetween(x(ratio), y(0.42), x(ratio), y(0.72));
                graphic.strokeCircle(x(ratio), y(0.39), 9);
            });
            return;
        }

        if (layer.texture === "thinShale") {
            const tx = x(0.25);
            const ty = y(0.68);
            graphic.strokeEllipse(tx, ty, 58, 30);
            graphic.lineBetween(tx, ty - 15, tx, ty + 15);
            [-10, 0, 10].forEach((offset) => {
                graphic.lineBetween(tx - 27, ty + offset, tx + 27, ty + offset);
            });
            graphic.lineBetween(x(0.72), y(0.27), x(0.8), y(0.48));
            graphic.lineBetween(x(0.8), y(0.48), x(0.74), y(0.66));
            return;
        }

        if (layer.texture === "pebblySandstone") {
            for (let pebble = 0; pebble < 11; pebble += 1) {
                graphic.fillEllipse(
                    x(0.1 + (pebble % 6) * 0.15),
                    y(0.7 + Math.floor(pebble / 6) * 0.09),
                    12 + (pebble % 3) * 4,
                    8 + (pebble % 2) * 3
                );
            }
            return;
        }

        if (layer.texture === "basaltFlows") {
            [0.18, 0.34, 0.7, 0.86].forEach((ratio, index) => {
                graphic.strokeCircle(x(ratio), y(0.3 + (index % 2) * 0.44), 8 + index * 2);
            });
            [0.43, 0.52, 0.61].forEach((ratio) => {
                graphic.lineBetween(x(ratio), y(0.2), x(ratio - 0.025), y(0.78));
            });
            return;
        }

        if (layer.texture === "mixedBeds") {
            graphic.lineStyle(6, light, 0.48);
            const points = [[0.08, 0.72], [0.28, 0.62], [0.5, 0.7], [0.72, 0.58], [0.92, 0.66]];
            points.slice(0, -1).forEach((point, index) => {
                graphic.lineBetween(x(point[0]), y(point[1]), x(points[index + 1][0]), y(points[index + 1][1]));
            });
            return;
        }

        if (layer.texture === "rippleMud") {
            [0.2, 0.5, 0.8].forEach((ratio) => {
                const cx = x(ratio);
                const cy = y(0.64);
                graphic.lineBetween(cx - 35, cy, cx, cy - 30);
                graphic.lineBetween(cx, cy - 30, cx + 28, cy + 8);
                graphic.lineBetween(cx, cy - 30, cx + 4, cy - 62);
            });
            return;
        }

        if (layer.texture === "stromatoliteBeds") {
            [0.16, 0.36, 0.63, 0.84].forEach((ratio, index) => {
                graphic.beginPath();
                graphic.arc(x(ratio), y(0.72), 22 + (index % 2) * 9, Math.PI, Math.PI * 2, false);
                graphic.strokePath();
                graphic.beginPath();
                graphic.arc(x(ratio), y(0.72), 13 + (index % 2) * 6, Math.PI, Math.PI * 2, false);
                graphic.strokePath();
            });
            return;
        }

        if (layer.texture === "foldedFoliation") {
            graphic.lineStyle(7, 0xe7d2bd, 0.64);
            const vein = [[0.1, 0.7], [0.26, 0.46], [0.43, 0.58], [0.6, 0.28], [0.78, 0.43], [0.92, 0.2]];
            vein.slice(0, -1).forEach((point, index) => {
                graphic.lineBetween(x(point[0]), y(point[1]), x(vein[index + 1][0]), y(vein[index + 1][1]));
            });
        }
    }

    createSample(layerIndex, clueIndex, clue, x, y) {
        const style = SAMPLE_STYLES[clue.type] || SAMPLE_STYLES.ROCK;
        const graphic = this.scene.add.graphics();
        graphic.fillStyle(0x101923, 0.92).lineStyle(3, 0xf7fbff, 1);
        graphic.fillPoints([
            new Phaser.Geom.Point(0, -17),
            new Phaser.Geom.Point(15, -7),
            new Phaser.Geom.Point(12, 12),
            new Phaser.Geom.Point(-12, 12),
            new Phaser.Geom.Point(-15, -7)
        ], true).strokePoints([
            new Phaser.Geom.Point(0, -17),
            new Phaser.Geom.Point(15, -7),
            new Phaser.Geom.Point(12, 12),
            new Phaser.Geom.Point(-12, 12),
            new Phaser.Geom.Point(-15, -7)
        ], true);
        graphic.fillStyle(style.color, 1).fillCircle(0, -1, 9);

        const label = this.scene.add.text(0, -2, style.letter, {
            fontFamily: GAME_FONT,
            fontSize: "17px",
            fontStyle: "bold",
            color: "#101923"
        }).setOrigin(0.5);
        const container = this.scene.add.container(x, y, [graphic, label]).setDepth(8);
        this.scene.tweens.add({
            targets: container,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 620,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut"
        });

        return {
            x,
            y,
            layerIndex,
            clueIndex,
            clue,
            active: true,
            graphic: container,
            bounds: new Phaser.Geom.Rectangle(x - 18, y - 21, 36, 42)
        };
    }

    createFuelCan(layerIndex, x, y) {
        const graphic = this.scene.add.graphics();
        graphic.fillStyle(0x101923, 0.96).lineStyle(3, 0xf7fbff, 1);
        graphic.fillRoundedRect(-17, -21, 34, 42, 5).strokeRoundedRect(-17, -21, 34, 42, 5);
        graphic.fillStyle(0xff694a, 1).fillRoundedRect(-12, -16, 24, 32, 3);
        graphic.fillStyle(0x101923, 1).fillRect(-6, -26, 15, 7);
        graphic.lineStyle(3, 0xffd166, 1).strokeCircle(0, 0, 7);
        graphic.lineBetween(-5, 0, 5, 0);
        graphic.lineBetween(0, -5, 0, 5);
        const label = this.scene.add.text(0, 30, "FUEL", {
            fontFamily: GAME_FONT,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#f7fbff",
            backgroundColor: "#101923cc",
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        const container = this.scene.add.container(x, y, [graphic, label]).setDepth(8);
        this.scene.tweens.add({
            targets: container,
            y: y - 7,
            duration: 720,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut"
        });
        return {
            x,
            y,
            layerIndex,
            active: true,
            graphic: container,
            bounds: new Phaser.Geom.Rectangle(x - 21, y - 29, 42, 62)
        };
    }

    createObstacle(layer, layerIndex, x, y, quizIndex, challenge, obstacleIndex) {
        const difficultyScale = 1 + layerIndex * 0.035;
        const width = Phaser.Math.Clamp(
            (this.arenaRight - this.arenaLeft) * 0.08 * difficultyScale,
            42,
            96
        );
        const height = Phaser.Math.Clamp((34 + layer.resistance * 0.45) * difficultyScale, 42, 66);
        const dark = shadeColor(layer.color, 0.48);
        const light = shadeColor(layer.color, 1.12);
        const graphic = this.scene.add.graphics().setPosition(x, y).setDepth(6);
        const points = [
            new Phaser.Geom.Point(-width * 0.48, -height * 0.12),
            new Phaser.Geom.Point(-width * 0.28, -height * 0.5),
            new Phaser.Geom.Point(width * 0.3, -height * 0.42),
            new Phaser.Geom.Point(width * 0.5, 0),
            new Phaser.Geom.Point(width * 0.28, height * 0.46),
            new Phaser.Geom.Point(-width * 0.34, height * 0.42)
        ];
        graphic.fillStyle(dark, 0.98).lineStyle(3, 0x172433, 0.95);
        graphic.fillPoints(points, true).strokePoints(points, true);
        graphic.lineStyle(3, light, 0.7);
        graphic.lineBetween(-width * 0.26, -5, width * 0.25, -8);
        graphic.lineBetween(-width * 0.12, 8, width * 0.32, 12);

        const moving = obstacleIndex < (challenge.movingCount || 0);
        const motion = moving ? challenge.obstacleMotion : "static";
        const warning = motion === "drop"
            ? this.scene.add.text(x, y + (challenge.amplitude || 80) * 0.52, "▼", {
                fontFamily: GAME_FONT,
                fontSize: "24px",
                fontStyle: "bold",
                color: "#ff5d43",
                stroke: "#101923",
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(7).setVisible(false)
            : null;
        return {
            x,
            y,
            baseX: x,
            baseY: y,
            layerIndex,
            quizIndex,
            active: true,
            nearMissed: false,
            nearMissTracking: false,
            graphic,
            warning,
            motion,
            amplitude: challenge.amplitude || 0,
            speed: challenge.speed || 0,
            phase: obstacleIndex * 0.21 + layerIndex * 0.07,
            bounds: new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height)
        };
    }

    update(time) {
        this.obstacles.forEach((obstacle, index) => {
            if (!obstacle.active || obstacle.motion === "static") return;
            const wave = time * obstacle.speed * Math.PI * 2 + obstacle.phase * Math.PI * 2;
            let x = obstacle.baseX;
            let y = obstacle.baseY;
            let angle = 0;

            if (["horizontal", "rolling"].includes(obstacle.motion)) {
                x += Math.sin(wave) * obstacle.amplitude;
                if (obstacle.motion === "rolling") angle = Phaser.Math.RadToDeg(wave) * (index % 2 === 0 ? 1 : -1);
            } else if (obstacle.motion === "vertical") {
                y += Math.sin(wave) * obstacle.amplitude;
            } else if (obstacle.motion === "mixed") {
                if (index % 2 === 0) x += Math.sin(wave) * obstacle.amplitude;
                else y += Math.sin(wave) * obstacle.amplitude * 0.72;
            } else if (obstacle.motion === "drop") {
                const phase = ((time * obstacle.speed + obstacle.phase) % 1 + 1) % 1;
                const top = obstacle.baseY - obstacle.amplitude * 0.48;
                const bottom = obstacle.baseY + obstacle.amplitude * 0.48;
                obstacle.warning?.setVisible(phase >= 0.22 && phase < 0.48)
                    .setAlpha(0.45 + Math.sin(time * 0.018) * 0.45);
                if (phase < 0.48) y = top;
                else if (phase < 0.61) y = Phaser.Math.Linear(top, bottom, (phase - 0.48) / 0.13);
                else if (phase < 0.78) y = bottom;
                else y = Phaser.Math.Linear(bottom, top, (phase - 0.78) / 0.22);
            }

            obstacle.x = Phaser.Math.Clamp(x, this.arenaLeft + obstacle.bounds.width / 2, this.arenaRight - obstacle.bounds.width / 2);
            const layerTop = this.layerStartY + obstacle.layerIndex * this.layerHeight;
            obstacle.y = Phaser.Math.Clamp(
                y,
                layerTop + obstacle.bounds.height / 2 + 8,
                layerTop + this.layerHeight - obstacle.bounds.height / 2 - 8
            );
            obstacle.graphic.setPosition(obstacle.x, obstacle.y).setAngle(angle);
            obstacle.bounds.setPosition(
                obstacle.x - obstacle.bounds.width / 2,
                obstacle.y - obstacle.bounds.height / 2
            );
        });

        this.mazeWalls.forEach((wall) => {
            const ratio = (Math.sin(time * wall.speed * Math.PI * 2 + wall.phase * Math.PI * 2) + 1) / 2;
            wall.bounds.x = this.arenaLeft + ratio * wall.travel;
            wall.graphic.setX(wall.bounds.x);
        });
    }

    getEnvironmentEffect(layerIndex, x, y, time) {
        const effect = { speedMultiplier: 1, pushX: 0, pushY: 0, energyHitKey: null, label: "" };
        this.environmentZones
            .filter((zone) => {
                if (zone.layerIndex !== layerIndex || !zone.bounds.contains(x, y)) return false;
                if (zone.type !== "eddy") return true;
                return Phaser.Math.Distance.Between(x, y, zone.centerX, zone.centerY) <= zone.radius;
            })
            .forEach((zone) => {
                if (zone.type === "sandGust") {
                    const gust = 112 + Math.sin(time * 0.006) * 34;
                    effect.pushX += gust * zone.direction;
                    effect.label = zone.direction > 0 ? "SAND GUST →" : "← SAND GUST";
                }
                if (zone.type === "caveDrop") {
                    effect.speedMultiplier = Math.max(effect.speedMultiplier, 1.2);
                    effect.pushY += 175;
                    effect.label = "KARST DROP ↓";
                }
                if (zone.type === "shaleSlide") {
                    effect.speedMultiplier = Math.max(effect.speedMultiplier, 1.12);
                    effect.pushY += 125;
                    effect.label = "SHALE SLIDE ↓";
                }
                if (zone.type === "resistance") {
                    effect.speedMultiplier = Math.min(effect.speedMultiplier, 0.34);
                    if (zone.id) {
                        effect.energyHitKey = zone.id;
                        effect.label = "HOT BASALT • FUEL −15%";
                    } else {
                        effect.label = "HIGH-RESISTANCE ROCK";
                    }
                }
                if (zone.type === "current") {
                    effect.pushX += 145 * zone.direction;
                    effect.label = zone.direction > 0 ? "STRONG CURRENT →" : "← STRONG CURRENT";
                }
                if (zone.type === "pulse") {
                    const direction = Math.floor(time / 1800) % 2 === 0 ? 1 : -1;
                    effect.pushX += 155 * direction;
                    effect.label = direction > 0 ? "TIDAL FLOW →" : "← TIDAL FLOW";
                }
                if (zone.type === "riverCurrent") {
                    effect.pushX += 165 * zone.direction;
                    effect.pushY += zone.pushY || 0;
                    effect.label = zone.direction > 0 ? "RIVER CURRENT ↘" : "↙ RIVER CURRENT";
                }
                if (zone.type === "eddy") {
                    const dx = x - zone.centerX;
                    const dy = y - zone.centerY;
                    const length = Math.max(1, Math.hypot(dx, dy));
                    effect.pushX += (-dy / length) * 190;
                    effect.pushY += (dx / length) * 190;
                    effect.label = "EDDY SPIN";
                }
            });
        return effect;
    }

    resolveMazeCollision(layerIndex, beforeX, beforeY, nextX, nextY) {
        const drillBounds = new Phaser.Geom.Rectangle(nextX - 25, nextY - 25, 50, 50);
        const hit = this.mazeWalls.some((wall) =>
            wall.layerIndex === layerIndex &&
            Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, wall.bounds)
        );
        return hit ? { x: beforeX, y: beforeY, hit: true } : { x: nextX, y: nextY, hit: false };
    }

    findSampleCollision(drillX, drillY, radius = 33) {
        const drillBounds = new Phaser.Geom.Rectangle(
            drillX - radius,
            drillY - radius,
            radius * 2,
            radius * 2
        );
        return this.samples.find((sample) =>
            sample.active && Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, sample.bounds)
        );
    }

    findFuelCollision(drillX, drillY, radius = 34) {
        const drillBounds = new Phaser.Geom.Rectangle(
            drillX - radius,
            drillY - radius,
            radius * 2,
            radius * 2
        );
        return this.fuelCans.find((fuelCan) =>
            fuelCan.active && Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, fuelCan.bounds)
        );
    }

    collectFuelCan(fuelCan) {
        if (!fuelCan?.active) return;
        fuelCan.active = false;
        this.scene.tweens.killTweensOf(fuelCan.graphic);
        this.scene.tweens.add({
            targets: fuelCan.graphic,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 240,
            ease: "Back.In",
            onComplete: () => fuelCan.graphic.destroy()
        });
    }

    collectSample(sample) {
        if (!sample?.active) return;
        this.samples
            .filter((candidate) =>
                candidate.active &&
                candidate.layerIndex === sample.layerIndex &&
                candidate.clueIndex === sample.clueIndex
            )
            .forEach((candidate) => {
                candidate.active = false;
                this.scene.tweens.killTweensOf(candidate.graphic);
                this.scene.tweens.add({
                    targets: candidate.graphic,
                    scaleX: 1.8,
                    scaleY: 1.8,
                    alpha: 0,
                    duration: 220,
                    onComplete: () => candidate.graphic.destroy()
                });
            });
    }

    findObstacleCollision(drillX, drillY) {
        const drillBounds = new Phaser.Geom.Rectangle(drillX - 28, drillY - 42, 56, 84);
        return this.obstacles.find((obstacle) =>
            obstacle.active && Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, obstacle.bounds)
        );
    }

    trackNearMiss(drillX, drillY, margin = 24) {
        const drillBounds = new Phaser.Geom.Rectangle(drillX - 28, drillY - 42, 56, 84);
        let completedNearMiss = null;
        this.obstacles.forEach((obstacle) => {
            if (!obstacle.active || obstacle.nearMissed) return false;
            if (Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, obstacle.bounds)) {
                obstacle.nearMissTracking = false;
                return;
            }
            const nearBounds = new Phaser.Geom.Rectangle(
                obstacle.bounds.x - margin,
                obstacle.bounds.y - margin,
                obstacle.bounds.width + margin * 2,
                obstacle.bounds.height + margin * 2
            );
            const isNear = Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, nearBounds);
            if (isNear) {
                obstacle.nearMissTracking = true;
                return;
            }
            if (obstacle.nearMissTracking && !completedNearMiss) {
                obstacle.nearMissTracking = false;
                completedNearMiss = obstacle;
            }
        });
        return completedNearMiss;
    }

    markNearMiss(obstacle) {
        if (!obstacle?.active || obstacle.nearMissed) return;
        obstacle.nearMissed = true;
        this.scene.tweens.add({
            targets: obstacle.graphic,
            scaleX: 1.14,
            scaleY: 1.14,
            duration: 80,
            yoyo: true,
            ease: "Quad.Out"
        });
    }

    resolveObstacle(obstacle, correct) {
        if (!obstacle?.active) return;
        obstacle.active = false;
        obstacle.warning?.destroy();
        this.scene.tweens.add({
            targets: obstacle.graphic,
            x: obstacle.x + Phaser.Math.Between(-24, 24),
            y: obstacle.y + (correct ? Phaser.Math.Between(-25, 25) : 14),
            angle: Phaser.Math.Between(-22, 22),
            scaleX: correct ? 1.5 : 0.82,
            scaleY: correct ? 0.6 : 0.82,
            alpha: 0,
            duration: correct ? 260 : 420,
            ease: "Quad.Out",
            onComplete: () => obstacle.graphic.destroy()
        });
    }

}
