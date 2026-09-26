import { ROCK_LAYERS } from "../data/layers.js";
import { database, currentRecord, saveDatabase } from "../services/storage.js";
import { makeDrill } from "../ui/components.js";
import { showStatus } from "../core/status.js";

const Phaser = window.Phaser;

export class LaunchScene extends Phaser.Scene {
    constructor() {
        super("LaunchScene");
    }

    create() {
        this.record = currentRecord();
        this.roundState = "ready";
        this.power = 0;
        this.dragPointerId = null;
        this.gravity = 920;
        this.velocity = new Phaser.Math.Vector2();

        this.skyGraphics = this.add.graphics().setDepth(-10);
        this.surfaceWorld = this.add.container(0, 0).setDepth(-5);
        this.surfaceGraphics = this.add.graphics();
        this.surfaceWorld.add(this.surfaceGraphics);
        this.bandGraphics = this.add.graphics().setDepth(3);
        this.aimGraphics = this.add.graphics().setDepth(4);

        const drillParts = makeDrill(this);
        this.drill = drillParts.container.setDepth(6).setSize(58, 92);
        this.drawDrillBit = drillParts.drawBit;
        this.drill.setInteractive(
            new Phaser.Geom.Rectangle(-29, -42, 58, 92),
            Phaser.Geom.Rectangle.Contains
        );
        this.drill.input.cursor = "grab";

        this.createInterface();
        this.bindInput();
        this.layout(this.scale.width, this.scale.height);
        this.scale.on("resize", this.handleResize, this);
        this.events.once("shutdown", () => this.scale.off("resize", this.handleResize, this));
        showStatus(`Phaser ${Phaser.VERSION} ready`, "success");
    }

    createInterface() {
        const shadow = { offsetX: 3, offsetY: 3, color: "#241923", blur: 0, fill: true };
        const font = "Courier New, monospace";
        this.titleText = this.add.text(20, 18, "GRAND CANYON DRILL", {
            fontFamily: font, fontSize: "28px", fontStyle: "bold", color: "#fff1c1", shadow
        }).setDepth(20);
        this.progressText = this.add.text(20, 54, "", {
            fontFamily: font, fontSize: "14px", color: "#ffd166", shadow
        }).setDepth(20);
        this.helpText = this.add.text(0, 0, "", {
            fontFamily: font,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#2d2029dd",
            padding: { x: 12, y: 8 },
            shadow
        }).setOrigin(0.5).setDepth(20);
        this.powerGraphics = this.add.graphics().setDepth(20);
        this.powerText = this.add.text(0, 0, "", {
            fontFamily: font, fontSize: "14px", fontStyle: "bold", color: "#fff1c1", shadow
        }).setDepth(21);
        this.fullscreenButton = this.add.text(0, 0, "[ FULLSCREEN ]", {
            fontFamily: font,
            fontSize: "14px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#39252bdd",
            padding: { x: 9, y: 7 }
        }).setOrigin(1, 0).setDepth(22).setInteractive({ useHandCursor: true });
        this.fullscreenButton.on("pointerdown", () => {
            if (this.scale.isFullscreen) this.scale.stopFullscreen();
            else this.scale.startFullscreen();
        });
        this.impactText = this.add.text(0, 0, "SURFACE BREACH!", {
            fontFamily: font,
            fontSize: "24px",
            fontStyle: "bold",
            color: "#fff1c1",
            backgroundColor: "#291b22ee",
            padding: { x: 18, y: 14 },
            stroke: "#ff8a3d",
            strokeThickness: 2,
            shadow
        }).setOrigin(0.5).setDepth(30).setVisible(false);
    }

    bindInput() {
        this.drill.on("pointerdown", (pointer) => {
            if (this.roundState !== "ready") return;
            this.roundState = "dragging";
            this.dragPointerId = pointer.id;
            this.drill.input.cursor = "grabbing";
            this.helpText.setText("AIM WITH THE DOTTED LINE • RELEASE TO LAUNCH");
            this.updateDrag(pointer);
        });
        this.input.on("pointermove", (pointer) => {
            if (this.roundState === "dragging" && pointer.id === this.dragPointerId) this.updateDrag(pointer);
        });
        this.input.on("pointerup", (pointer) => {
            if (this.roundState === "dragging" && pointer.id === this.dragPointerId) this.releaseDrill();
        });
        if (this.input.keyboard) this.input.keyboard.on("keydown-R", () => this.resetRound());
    }

    layout(width, height) {
        this.viewWidth = Math.max(320, width);
        this.viewHeight = Math.max(420, height);
        const portrait = this.viewWidth < this.viewHeight;
        this.surfaceY = Math.round(this.viewHeight * (portrait ? 0.48 : 0.51));
        this.layerHeight = Math.max(12, (this.viewHeight - this.surfaceY) / ROCK_LAYERS.length);
        this.anchorBaseX = Math.round(this.viewWidth * 0.55);
        this.anchorBaseY = this.surfaceY - 78;
        this.maxPull = Math.min(this.viewHeight * 0.43, this.viewWidth * 0.38, 390);

        this.drawSky();
        this.drawSurfaceWorld();
        const compact = this.viewWidth < 650;
        this.titleText.setPosition(18, 16).setFontSize(compact ? 20 : 28);
        this.progressText.setPosition(20, 52).setFontSize(compact ? 11 : 14);
        this.fullscreenButton.setPosition(this.viewWidth - 16, 16).setFontSize(compact ? 11 : 14);
        this.helpText.setPosition(this.viewWidth / 2, this.viewHeight - 30).setFontSize(compact ? 11 : 16);
        this.impactText.setPosition(this.viewWidth / 2, this.viewHeight * 0.35).setFontSize(compact ? 17 : 24);
        this.progressText.setText(
            `${database.currentPlayer}  •  REPRESENTATIVE UNITS ` +
            `${String(this.record.discovered).padStart(2, "0")}/${ROCK_LAYERS.length}`
        );
        this.helpText.setText(
            this.record.discovered > 0
                ? "AIM FOR THE OLD SHAFT • PULL UP • RELEASE"
                : "GRAB THE DRILL • PULL UP • RELEASE"
        );
        this.drawPowerMeter();
        if (this.roundState === "ready") this.resetRound();
    }

    drawSky() {
        const g = this.skyGraphics;
        const colors = [0x6e6a86, 0x9a7182, 0xc67b78, 0xe68a63, 0xf2a65e, 0xf6c36c];
        const height = Math.ceil(this.surfaceY / colors.length);
        g.clear();
        colors.forEach((color, index) => {
            g.fillStyle(color, 1).fillRect(0, index * height, this.viewWidth, height + 2);
        });
        const unit = Math.max(3, Math.round(Math.min(this.viewWidth, this.viewHeight) / 190));
        const sunX = Math.round(this.viewWidth * 0.78);
        const sunY = Math.round(this.surfaceY * 0.24);
        g.fillStyle(0xffd27a, 1).fillRect(sunX - unit * 5, sunY - unit * 3, unit * 10, unit * 6);
        g.fillRect(sunX - unit * 4, sunY - unit * 4, unit * 8, unit * 8);
        this.drawCloud(g, this.viewWidth * 0.13, this.surfaceY * 0.17, unit);
        this.drawCloud(g, this.viewWidth * 0.54, this.surfaceY * 0.29, unit);
    }

    drawCloud(g, x, y, unit) {
        const u = Math.max(3, Math.round(unit));
        g.fillStyle(0xffe8d0, 0.78).fillRect(x, y, u * 12, u * 3);
        g.fillRect(x + u * 2, y - u * 2, u * 7, u * 3);
        g.fillRect(x + u * 5, y - u * 3, u * 3, u * 2);
    }

    drawSurfaceWorld() {
        const g = this.surfaceGraphics;
        const w = this.viewWidth;
        const sy = this.surfaceY;
        g.clear();
        g.fillStyle(0x75444a, 1).fillPoints([
            new Phaser.Geom.Point(0, sy), new Phaser.Geom.Point(0, sy - 76),
            new Phaser.Geom.Point(w * 0.12, sy - 76), new Phaser.Geom.Point(w * 0.16, sy - 112),
            new Phaser.Geom.Point(w * 0.31, sy - 112), new Phaser.Geom.Point(w * 0.35, sy - 68),
            new Phaser.Geom.Point(w * 0.47, sy - 68), new Phaser.Geom.Point(w * 0.52, sy - 126),
            new Phaser.Geom.Point(w * 0.67, sy - 126), new Phaser.Geom.Point(w * 0.71, sy - 73),
            new Phaser.Geom.Point(w * 0.84, sy - 73), new Phaser.Geom.Point(w * 0.88, sy - 98),
            new Phaser.Geom.Point(w, sy - 98), new Phaser.Geom.Point(w, sy)
        ], true);
        g.fillStyle(0xa55242, 1).fillPoints([
            new Phaser.Geom.Point(0, sy), new Phaser.Geom.Point(0, sy - 34),
            new Phaser.Geom.Point(w * 0.19, sy - 34), new Phaser.Geom.Point(w * 0.23, sy - 57),
            new Phaser.Geom.Point(w * 0.42, sy - 57), new Phaser.Geom.Point(w * 0.47, sy - 31),
            new Phaser.Geom.Point(w * 0.65, sy - 31), new Phaser.Geom.Point(w * 0.70, sy - 54),
            new Phaser.Geom.Point(w * 0.91, sy - 54), new Phaser.Geom.Point(w, sy - 25),
            new Phaser.Geom.Point(w, sy)
        ], true);

        ROCK_LAYERS.forEach((layer, index) => {
            const y = sy + index * this.layerHeight;
            g.fillStyle(layer.color, 1).fillRect(0, Math.floor(y), w, Math.ceil(this.layerHeight + 1));
            g.fillStyle(0x241923, 0.35).fillRect(0, Math.floor(y), w, 3);
            const spacing = Math.max(38, Math.round(w / 24));
            for (let x = (index * 29) % spacing; x < w; x += spacing) {
                if (index % 3 === 0) {
                    g.fillRect(x, y + this.layerHeight * 0.45, Math.max(7, spacing * 0.28), 3);
                } else if (index % 3 === 1) {
                    g.fillRect(x, y + this.layerHeight * 0.22, 4, Math.max(5, this.layerHeight * 0.38));
                } else {
                    g.fillRect(x, y + this.layerHeight * 0.62, 5, 5);
                }
            }
        });
        g.fillStyle(0xf0b45f, 1).fillRect(0, sy - 12, w, 14);
        this.drawTree(g, Math.round(w * 0.18), sy - 14);
        this.drawSlingshot(g);
        if (this.record.discovered > 0 && this.record.holeX !== null) this.drawOldShaft(g);
    }

    drawTree(g, x, y) {
        const u = Math.round(6 * Phaser.Math.Clamp(Math.min(this.viewWidth, this.viewHeight) / 650, 0.75, 1.45));
        g.fillStyle(0x5b322c, 1).fillRect(x - u, y - u * 8, u * 2, u * 8);
        g.fillStyle(0x355047, 1).fillRect(x - u * 3, y - u * 10, u * 6, u * 4);
        g.fillRect(x - u * 5, y - u * 8, u * 4, u * 3);
        g.fillRect(x + u, y - u * 7, u * 4, u * 3);
    }

    drawSlingshot(g) {
        const x = this.anchorBaseX;
        const y = this.surfaceY;
        g.fillStyle(0x241923, 1).fillRect(x - 12, y - 57, 24, 58);
        g.fillRect(x - 49, y - 83, 22, 58).fillRect(x + 27, y - 83, 22, 58);
        g.fillStyle(0x734330, 1).fillRect(x - 7, y - 52, 14, 53);
        g.fillRect(x - 44, y - 78, 12, 50).fillRect(x + 32, y - 78, 12, 50);
        g.fillStyle(0xb76b3f, 1).fillRect(x - 42, y - 76, 5, 41);
        g.fillRect(x + 34, y - 76, 5, 41);
    }

    drawOldShaft(g) {
        const x = Phaser.Math.Clamp(this.record.holeX * this.viewWidth, 30, this.viewWidth - 30);
        g.fillStyle(0xffd166, 0.55).fillRect(x - 24, this.surfaceY - 17, 48, 5);
        g.fillStyle(0x1a151b, 1).fillRect(x - 16, this.surfaceY - 10, 32, 12);
        g.fillStyle(0xffd166, 1).fillRect(x - 3, this.surfaceY - 27, 6, 8);
    }

    getWorldPoint(x, y) {
        const scale = this.surfaceWorld.scaleX;
        return { x: this.surfaceWorld.x + x * scale, y: this.surfaceWorld.y + y * scale };
    }

    updateDrag(pointer) {
        const x = Phaser.Math.Clamp(pointer.x - this.anchorBaseX, -this.maxPull * 0.68, this.maxPull * 0.68);
        const y = Phaser.Math.Clamp(pointer.y - this.anchorBaseY, -this.maxPull, -8);
        const vector = new Phaser.Math.Vector2(x, y);
        if (vector.length() > this.maxPull) vector.setLength(this.maxPull);
        this.power = Phaser.Math.Clamp(vector.length() / this.maxPull, 0, 1);
        this.drill.setPosition(this.anchorBaseX + vector.x, this.anchorBaseY + vector.y);
        const scale = 1 - this.power * 0.23;
        this.surfaceWorld.setScale(scale).setPosition(
            this.viewWidth * (1 - scale) * 0.5,
            this.viewHeight * 0.17 * this.power
        );
        this.drawBands();
        this.drawAimGuide();
        this.drawPowerMeter();
    }

    drawBands() {
        const left = this.getWorldPoint(this.anchorBaseX - 38, this.surfaceY - 79);
        const right = this.getWorldPoint(this.anchorBaseX + 38, this.surfaceY - 79);
        const color = this.power > 0.8 ? 0xff694a : this.power > 0.45 ? 0xffa044 : 0x4a2528;
        const width = Math.max(4, Math.round(5 + this.power * 5));
        this.bandGraphics.clear().lineStyle(width + 3, 0x241923, 1);
        this.bandGraphics.lineBetween(left.x, left.y, this.drill.x, this.drill.y + 4);
        this.bandGraphics.lineBetween(right.x, right.y, this.drill.x, this.drill.y + 4);
        this.bandGraphics.lineStyle(width, color, 1);
        this.bandGraphics.lineBetween(left.x, left.y, this.drill.x, this.drill.y + 4);
        this.bandGraphics.lineBetween(right.x, right.y, this.drill.x, this.drill.y + 4);
    }

    predictedVelocity() {
        const target = this.getWorldPoint(this.anchorBaseX, this.anchorBaseY);
        return new Phaser.Math.Vector2(
            (target.x - this.drill.x) * (1.45 + this.power * 0.8),
            Math.max(170, (target.y - this.drill.y) * (1.55 + this.power))
        );
    }

    drawAimGuide() {
        this.aimGraphics.clear();
        if (this.roundState !== "dragging") return;
        const velocity = this.predictedVelocity();
        const color = this.power > 0.75 ? 0xffd166 : 0xfff1c1;
        this.aimGraphics.fillStyle(color, 0.9);
        for (let step = 1; step <= 13; step += 1) {
            const time = step * 0.075;
            const x = this.drill.x + velocity.x * time;
            const y = this.drill.y + velocity.y * time + 0.5 * this.gravity * time * time;
            if (x < 0 || x > this.viewWidth || y > this.viewHeight) break;
            const size = step < 7 ? 6 : 4;
            this.aimGraphics.fillRect(Math.round(x), Math.round(y), size, size);
        }
        const ring = 54 + this.power * 48;
        this.aimGraphics.lineStyle(3, color, 0.8);
        this.aimGraphics.strokeRect(this.drill.x - ring / 2, this.drill.y - ring / 2, ring, ring);
    }

    drawPowerMeter() {
        const compact = this.viewWidth < 650;
        const width = compact ? Math.min(210, this.viewWidth - 36) : Math.min(280, this.viewWidth * 0.3);
        const x = compact ? 18 : this.viewWidth - width - 20;
        const y = compact ? 84 : 70;
        const color = this.power > 0.82 ? 0xff5d43 : this.power > 0.5 ? 0xffa044 : 0x45d6c4;
        this.powerGraphics.clear().fillStyle(0x241923, 0.92).fillRect(x, y, width, 22);
        this.powerGraphics.fillStyle(0xfff1c1, 1).fillRect(x + 4, y + 4, width - 8, 14);
        this.powerGraphics.fillStyle(color, 1).fillRect(x + 4, y + 4, (width - 8) * this.power, 14);
        this.powerText.setText(`LAUNCH POWER ${String(Math.round(this.power * 100)).padStart(3, "0")}%`);
        this.powerText.setPosition(x, y + 28).setFontSize(compact ? 11 : 14);
    }

    releaseDrill() {
        if (this.power < 0.06) return this.resetRound();
        this.roundState = "launched";
        this.dragPointerId = null;
        this.velocity.copy(this.predictedVelocity());
        this.launchPower = Math.round(this.power * 100);
        this.bandGraphics.clear();
        this.aimGraphics.clear();
        this.helpText.setText("DRILL AWAY!");
        this.tweens.add({
            targets: this.surfaceWorld,
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            duration: 650,
            ease: "Cubic.In"
        });
    }

    update(time, delta) {
        if (this.roundState === "dragging" || this.roundState === "launched") {
            this.drawDrillBit(Math.floor(time / 80) % 2 === 0);
        }
        if (this.roundState !== "launched") return;

        const dt = Math.min(delta / 1000, 0.034);
        this.velocity.y += this.gravity * dt;
        this.drill.x += this.velocity.x * dt;
        this.drill.y += this.velocity.y * dt;
        this.drill.angle = Phaser.Math.RadToDeg(Math.atan2(this.velocity.y, this.velocity.x)) - 90;
        const ground = this.getWorldPoint(this.drill.x, this.surfaceY).y;

        if (this.drill.y + 42 >= ground && this.velocity.y > 0) {
            this.drill.y = ground - 42;
            this.impact();
        } else if (
            this.drill.x < -140 ||
            this.drill.x > this.viewWidth + 140 ||
            this.drill.y > this.viewHeight + 160
        ) {
            showStatus("The drill left the play area. Round reset safely.", "error");
            this.time.delayedCall(650, () => {
                showStatus("Ready", "success");
                this.resetRound();
            });
        }
    }

    impact() {
        this.roundState = "impact";
        this.velocity.set(0, 0);
        this.drill.setAngle(0);
        const hadShaft = this.record.discovered > 0 && this.record.holeX !== null;
        const targetX = hadShaft ? this.record.holeX * this.viewWidth : this.drill.x;
        const distance = Math.abs(this.drill.x - targetX);
        const accuracy = hadShaft
            ? Phaser.Math.Clamp(1 - distance / (this.viewWidth * 0.32), 0.5, 1)
            : 1;
        const usesShaft = hadShaft && accuracy >= 0.72;

        if (!hadShaft) {
            this.record.holeX = Phaser.Math.Clamp(this.drill.x / this.viewWidth, 0.08, 0.92);
        }
        this.record.shots += 1;
        this.record.bestPower = Math.max(this.record.bestPower, this.launchPower);
        this.record.bestAccuracy = Math.max(this.record.bestAccuracy, Math.round(accuracy * 100));
        saveDatabase();

        this.cameras.main.shake(180, 0.007);
        this.cameras.main.flash(90, 255, 198, 110, false);
        this.spawnDebris(this.drill.x, this.drill.y + 38);
        this.impactText.setText(usesShaft ? "OLD SHAFT HIT!" : "SURFACE BREACH!").setVisible(true).setAlpha(0);
        this.tweens.add({ targets: this.impactText, alpha: 1, duration: 180 });
        this.time.delayedCall(620, () => {
            this.cameras.main.fadeOut(260, 25, 16, 22);
            this.time.delayedCall(280, () => this.scene.start("DrillScene", {
                launchPower: this.launchPower,
                accuracy: Math.round(accuracy * 100),
                usesShaft,
                previousBest: this.record.discovered
            }));
        });
    }

    spawnDebris(x, y) {
        const colors = [0xffd166, 0xd66f45, 0x8f4638, 0xffe0a1];
        for (let index = 0; index < 22; index += 1) {
            const piece = this.add.rectangle(
                x,
                y,
                Phaser.Math.Between(4, 10),
                Phaser.Math.Between(4, 10),
                Phaser.Utils.Array.GetRandom(colors)
            ).setDepth(12);
            this.tweens.add({
                targets: piece,
                x: x + Phaser.Math.Between(-125, 125),
                y: y - Phaser.Math.Between(35, 130),
                angle: Phaser.Math.Between(-180, 180),
                alpha: 0,
                duration: Phaser.Math.Between(520, 900),
                ease: "Quad.Out",
                onComplete: () => piece.destroy()
            });
        }
    }

    resetRound() {
        this.tweens.killTweensOf(this.surfaceWorld);
        this.roundState = "ready";
        this.dragPointerId = null;
        this.power = 0;
        this.velocity.set(0, 0);
        this.surfaceWorld.setPosition(0, 0).setScale(1);
        this.drill.setPosition(this.anchorBaseX, this.anchorBaseY).setAngle(0);
        this.drill.input.cursor = "grab";
        this.impactText.setVisible(false);
        this.aimGraphics.clear();
        this.helpText.setText(
            this.record.discovered > 0
                ? "AIM FOR THE OLD SHAFT • PULL UP • RELEASE"
                : "GRAB THE DRILL • PULL UP • RELEASE"
        );
        this.drawBands();
        this.drawPowerMeter();
    }

    handleResize(gameSize) {
        this.tweens.killAll();
        this.roundState = "ready";
        this.power = 0;
        this.layout(gameSize.width, gameSize.height);
    }
}
