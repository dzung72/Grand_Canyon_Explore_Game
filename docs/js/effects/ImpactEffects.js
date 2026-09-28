const Phaser = window.Phaser;

export class ImpactEffects {
    constructor(scene) {
        this.scene = scene;
    }

    play(x, y, power, layerColor, onComplete) {
        const strength = Phaser.Math.Clamp(power / 100, 0.25, 1);
        const camera = this.scene.cameras.main;
        camera.flash(120, 255, 202, 125, false);
        camera.shake(260 + strength * 170, 0.008 + strength * 0.008);

        this.createShockwave(x, y, strength);
        this.createDebris(x, y, strength, layerColor);
        this.createDust(x, y, strength);

        this.scene.time.delayedCall(820, onComplete);
    }

    createShockwave(x, y, strength) {
        const ring = this.scene.add.graphics().setPosition(x, y).setDepth(15);
        ring.lineStyle(7, 0xffd786, 0.95).strokeEllipse(0, 0, 80, 25);
        ring.setScale(0.25);
        this.scene.tweens.add({
            targets: ring,
            scaleX: 2.2 + strength,
            scaleY: 2.2 + strength,
            alpha: 0,
            duration: 430,
            ease: "Quad.Out",
            onComplete: () => ring.destroy()
        });

        const blast = this.scene.add.graphics().setPosition(x, y).setDepth(16);
        blast.lineStyle(12, 0xffffff, 0.88).strokeEllipse(0, 0, 48, 16);
        blast.setScale(0.2);
        this.scene.tweens.add({
            targets: blast,
            scaleX: 4.4 + strength * 1.4,
            scaleY: 3.1 + strength,
            alpha: 0,
            duration: 270,
            ease: "Cubic.Out",
            onComplete: () => blast.destroy()
        });
    }

    createDebris(x, y, strength, layerColor) {
        const colors = [0xffd166, 0xd66f45, 0x8f4638, 0xffe0a1, layerColor];
        const count = Math.round(42 + strength * 46);
        for (let index = 0; index < count; index += 1) {
            const large = index < 18;
            const size = large ? Phaser.Math.Between(9, 21) : Phaser.Math.Between(3, 10);
            const piece = this.scene.add.rectangle(
                x + Phaser.Math.Between(-12, 12),
                y,
                size,
                Phaser.Math.Between(4, size),
                Phaser.Utils.Array.GetRandom(colors)
            ).setDepth(14);
            this.scene.tweens.add({
                targets: piece,
                x: x + Phaser.Math.Between(-230, 230) * (0.72 + strength * 0.65),
                y: y - Phaser.Math.Between(65, 245) * (0.78 + strength * 0.62),
                angle: Phaser.Math.Between(-240, 240),
                alpha: 0,
                duration: Phaser.Math.Between(620, 1050),
                ease: "Quad.Out",
                onComplete: () => piece.destroy()
            });
        }
    }

    createDust(x, y, strength) {
        for (let index = 0; index < 20; index += 1) {
            const dust = this.scene.add.rectangle(
                x + Phaser.Math.Between(-55, 55),
                y - Phaser.Math.Between(0, 28),
                Phaser.Math.Between(28, 78),
                Phaser.Math.Between(16, 38),
                0xd99761,
                0.45
            ).setDepth(13);
            this.scene.tweens.add({
                targets: dust,
                x: dust.x + Phaser.Math.Between(-130, 130),
                y: dust.y - Phaser.Math.Between(24, 100),
                scaleX: 1.4 + strength,
                scaleY: 1.4 + strength,
                alpha: 0,
                duration: Phaser.Math.Between(480, 800),
                onComplete: () => dust.destroy()
            });
        }
    }
}
