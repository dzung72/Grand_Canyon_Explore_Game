import { ROCK_LAYERS, getLayerEvidence } from "../data/layers.js?v=4.1.1";

const Phaser = window.Phaser;

const SAMPLE_STYLES = {
    AGE: { color: 0xf6e27a, letter: "A" },
    ROCK: { color: 0xffa044, letter: "R" },
    FIELD: { color: 0xf28dc8, letter: "F" },
    ENV: { color: 0x45d6c4, letter: "E" },
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
        this.obstacles = [];
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
            this.createLayerDetails(layer, layerIndex);
            getLayerEvidence(layer).forEach((clue, clueIndex) => {
                const point = samplePattern[(clueIndex + layerIndex * 2) % samplePattern.length];
                const ratioX = layerIndex % 2 === 0 ? point.x : 1 - point.x;
                const x = this.arenaLeft + arenaWidth * ratioX;
                const y = this.layerStartY + (layerIndex + point.y) * this.layerHeight;
                this.samples.push(this.createSample(layerIndex, clueIndex, clue, x, y));
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
            obstacleRatios.forEach((point, obstacleIndex) => {
                const x = this.arenaLeft + arenaWidth * point.x;
                const y = this.layerStartY + (layerIndex + point.y) * this.layerHeight;
                this.obstacles.push(this.createObstacle(
                    layer,
                    layerIndex,
                    x,
                    y,
                    (layerIndex + obstacleIndex) % 5
                ));
            });
        });
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
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#17121bcc",
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
            graphic.fillStyle(0x17121b, 0.72).fillEllipse(x(0.16), y(0.7), 108, 58);
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
        graphic.fillStyle(0x17121b, 0.92).lineStyle(3, 0xfff1c1, 1);
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
            fontFamily: "Arial, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#17121b"
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

    createObstacle(layer, layerIndex, x, y, quizIndex) {
        const width = Phaser.Math.Clamp((this.arenaRight - this.arenaLeft) * 0.08, 40, 78);
        const height = Phaser.Math.Clamp(34 + layer.resistance * 0.45, 40, 50);
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
        graphic.fillStyle(dark, 0.98).lineStyle(3, 0x211720, 0.95);
        graphic.fillPoints(points, true).strokePoints(points, true);
        graphic.lineStyle(3, light, 0.7);
        graphic.lineBetween(-width * 0.26, -5, width * 0.25, -8);
        graphic.lineBetween(-width * 0.12, 8, width * 0.32, 12);

        return {
            x,
            y,
            layerIndex,
            quizIndex,
            active: true,
            graphic,
            bounds: new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height)
        };
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
        const drillBounds = new Phaser.Geom.Rectangle(drillX - 31, drillY - 31, 62, 62);
        return this.obstacles.find((obstacle) =>
            obstacle.active && Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, obstacle.bounds)
        );
    }

    resolveObstacle(obstacle, correct) {
        if (!obstacle?.active) return;
        obstacle.active = false;
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
