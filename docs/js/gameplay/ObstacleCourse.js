import { ROCK_LAYERS } from "../data/layers.js";

const Phaser = window.Phaser;

function shadeColor(color, factor) {
    const red = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
    const green = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
    const blue = Math.min(255, Math.round((color & 0xff) * factor));
    return (red << 16) | (green << 8) | blue;
}

export class ObstacleCourse {
    constructor(scene, config) {
        this.scene = scene;
        this.laneCenters = config.laneCenters;
        this.layerStartY = config.layerStartY;
        this.layerHeight = config.layerHeight;
        this.previousBest = config.previousBest;
        this.usesShaft = config.usesShaft;
        this.obstacles = [];
        this.build();
    }

    build() {
        const laneGap = Math.abs(this.laneCenters[1] - this.laneCenters[0]);
        const width = Phaser.Math.Clamp(laneGap * 0.72, 42, 92);

        ROCK_LAYERS.forEach((layer, layerIndex) => {
            if (this.usesShaft && layerIndex < this.previousBest) return;

            const rowPositions = [0.42, 0.78];
            rowPositions.forEach((position, rowIndex) => {
                const y = this.layerStartY + (layerIndex + position) * this.layerHeight;
                const safeLane = (layerIndex * 2 + rowIndex + 1) % 3;
                const blockTwoLanes = layerIndex > 1 && (layerIndex + rowIndex) % 2 === 1;
                const blockedLanes = blockTwoLanes
                    ? [0, 1, 2].filter((lane) => lane !== safeLane)
                    : [(safeLane + 1 + rowIndex) % 3];

                blockedLanes.forEach((lane) => {
                    this.obstacles.push(this.createObstacle(layer, layerIndex, lane, y, width));
                });
            });
        });
    }

    createObstacle(layer, layerIndex, lane, y, width) {
        const height = Phaser.Math.Clamp(34 + layer.resistance * 0.7, 42, 58);
        const x = this.laneCenters[lane];
        const dark = shadeColor(layer.color, 0.56);
        const light = shadeColor(layer.color, 1.1);
        const graphic = this.scene.add.graphics().setPosition(x, y).setDepth(5);

        graphic.fillStyle(dark, 1).lineStyle(4, 0x211720, 0.95);
        const points = [
            new Phaser.Geom.Point(-width * 0.5, -height * 0.18),
            new Phaser.Geom.Point(-width * 0.34, -height * 0.5),
            new Phaser.Geom.Point(width * 0.22, -height * 0.46),
            new Phaser.Geom.Point(width * 0.5, -height * 0.12),
            new Phaser.Geom.Point(width * 0.4, height * 0.42),
            new Phaser.Geom.Point(-width * 0.24, height * 0.5),
            new Phaser.Geom.Point(-width * 0.52, height * 0.16)
        ];
        graphic.fillPoints(points, true).strokePoints(points, true);
        this.drawObstacleTexture(graphic, layer, width, height, light);

        return {
            lane,
            x,
            y,
            width,
            height,
            layerIndex,
            color: layer.color,
            active: true,
            graphic,
            bounds: new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height)
        };
    }

    drawObstacleTexture(graphic, layer, width, height, light) {
        graphic.lineStyle(3, light, 0.72).fillStyle(light, 0.68);

        if (layer.texture === "chertyLimestone") {
            graphic.fillEllipse(-width * 0.18, -height * 0.08, 15, 8);
            graphic.fillEllipse(width * 0.2, height * 0.2, 18, 9);
            graphic.lineBetween(-width * 0.34, height * 0.08, width * 0.3, height * 0.08);
            return;
        }

        if (layer.texture === "crossBedding") {
            for (let offset = -16; offset <= 16; offset += 12) {
                graphic.lineBetween(-width * 0.34, offset + 10, width * 0.3, offset - 10);
            }
            return;
        }

        if (layer.texture === "massiveLimestone") {
            graphic.lineBetween(-width * 0.36, 0, width * 0.34, 0);
            graphic.lineBetween(0, -height * 0.34, 0, height * 0.34);
            graphic.fillStyle(layer.secondary, 0.7).fillRect(-width * 0.27, -height * 0.38, 5, height * 0.7);
            return;
        }

        if (layer.texture === "thinShale") {
            for (let line = -2; line <= 2; line += 1) {
                graphic.lineBetween(-width * 0.34, line * 7, width * (line % 2 === 0 ? 0.34 : 0.22), line * 7);
            }
            return;
        }

        if (layer.texture === "pebblySandstone") {
            for (let index = 0; index < 6; index += 1) {
                graphic.fillEllipse(-width * 0.26 + index * (width * 0.1), (index % 2) * 15 - 8, 8, 6);
            }
            graphic.lineBetween(-width * 0.28, height * 0.25, width * 0.3, -height * 0.16);
            return;
        }

        if (layer.texture === "basaltFlows") {
            graphic.lineBetween(-width * 0.36, -height * 0.08, width * 0.34, -height * 0.08);
            [-0.2, 0.05, 0.27].forEach((ratio) => {
                graphic.lineBetween(width * ratio, -height * 0.35, width * ratio, height * 0.28);
            });
            graphic.fillStyle(layer.secondary, 0.7).fillRect(-width * 0.3, height * 0.2, width * 0.58, 4);
            return;
        }

        if (layer.texture === "mixedBeds") {
            for (let line = -2; line <= 2; line += 1) {
                const inset = line % 2 === 0 ? 0.28 : 0.2;
                graphic.lineBetween(-width * inset, line * 8, width * 0.31, line * 8);
            }
            return;
        }

        if (layer.texture === "rippleMud") {
            for (let line = -1; line <= 1; line += 1) {
                const lineY = line * 12;
                graphic.lineBetween(-width * 0.32, lineY, -4, lineY - 5);
                graphic.lineBetween(-4, lineY - 5, width * 0.3, lineY);
            }
            graphic.lineBetween(4, -height * 0.3, -4, -4);
            graphic.lineBetween(-4, -4, 7, height * 0.28);
            return;
        }

        if (layer.texture === "stromatoliteBeds") {
            graphic.lineStyle(3, layer.secondary, 0.8);
            [-width * 0.18, width * 0.17].forEach((centerX) => {
                graphic.beginPath();
                graphic.arc(centerX, height * 0.16, 12, Math.PI, Math.PI * 2, false);
                graphic.strokePath();
            });
            graphic.lineBetween(-width * 0.34, height * 0.18, width * 0.32, height * 0.18);
            return;
        }

        if (layer.texture === "foldedFoliation") {
            for (let x = -width * 0.25; x <= width * 0.25; x += width * 0.25) {
                graphic.lineBetween(x, -height * 0.34, x + 8, -5);
                graphic.lineBetween(x + 8, -5, x - 2, height * 0.34);
            }
        }
    }

    findCollision(drillX, drillY) {
        const drillBounds = new Phaser.Geom.Rectangle(drillX - 19, drillY - 31, 38, 72);
        return this.obstacles.find((obstacle) =>
            obstacle.active && Phaser.Geom.Intersects.RectangleToRectangle(drillBounds, obstacle.bounds)
        );
    }

    breakObstacle(obstacle) {
        if (!obstacle?.active) return;
        obstacle.active = false;
        obstacle.graphic.setAlpha(0.3);
        this.scene.tweens.add({
            targets: obstacle.graphic,
            scaleX: 1.35,
            scaleY: 0.7,
            alpha: 0,
            duration: 220,
            onComplete: () => obstacle.graphic.destroy()
        });

        for (let index = 0; index < 7; index += 1) {
            const chip = this.scene.add.rectangle(
                obstacle.x,
                obstacle.y,
                Phaser.Math.Between(4, 9),
                Phaser.Math.Between(4, 9),
                obstacle.color
            ).setDepth(7);
            this.scene.tweens.add({
                targets: chip,
                x: obstacle.x + Phaser.Math.Between(-65, 65),
                y: obstacle.y + Phaser.Math.Between(-25, 55),
                angle: Phaser.Math.Between(-180, 180),
                alpha: 0,
                duration: Phaser.Math.Between(260, 480),
                onComplete: () => chip.destroy()
            });
        }
    }
}
