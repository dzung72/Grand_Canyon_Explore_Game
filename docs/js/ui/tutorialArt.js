import { GAME_FONT, UI } from "../core/theme.js?v=5.1.3";
import { makeDrill } from "./components.js?v=5.1.3";

const Phaser = window.Phaser;

// Every illustration is drawn inside this nominal box and then scaled to the
// card stage, so one set of coordinates works on a phone and on a projector.
const ART_WIDTH = 520;
const ART_HEIGHT = 300;

const INK = 0x0f1a22;
const PAPER = 0xf7fbff;
const MINT = 0x66e0cf;
const GOLD = 0xffd166;
const EMBER = 0xff694a;

export function buildTutorialArt(scene, kind, stageWidth, stageHeight) {
    const root = scene.add.container(0, 0);
    const timers = [];
    const cycles = [];

    const timer = (event) => {
        if (event) timers.push(event);
        return event;
    };

    // A cycle is one loop of the animation: it rebuilds its tweens each period
    // so every illustration keeps moving without a static frame.
    const cycle = (period, build) => {
        let active = [];
        const add = (config) => {
            const tween = scene.tweens.add(config);
            active.push(tween);
            return tween;
        };
        const clear = () => {
            active.forEach((tween) => tween?.destroy?.());
            active = [];
        };
        const run = () => {
            clear();
            build(add);
        };
        cycles.push({ clear });
        run();
        timer(scene.time.addEvent({ delay: period, loop: true, callback: run }));
    };

    const builders = {
        launch: launchArt,
        steer: steerArt,
        collect: collectArt,
        refuel: refuelArt,
        rock: rockArt
    };
    (builders[kind] || steerArt)({ scene, root, timer, cycle });

    root.setScale(Phaser.Math.Clamp(
        Math.min(stageWidth / ART_WIDTH, stageHeight / ART_HEIGHT),
        0.4,
        2.2
    ));

    return {
        root,
        dispose() {
            timers.forEach((event) => event?.remove(false));
            cycles.forEach((entry) => entry.clear());
            timers.length = 0;
            cycles.length = 0;
            root.destroy();
        }
    };
}

function addDrill(scene, root, timer, { scale = 1, x = 0, y = 0 } = {}) {
    const { container, drawBit } = makeDrill(scene, scale);
    container.setPosition(x, y);
    root.add(container);
    let flip = false;
    timer(scene.time.addEvent({
        delay: 90,
        loop: true,
        callback: () => {
            flip = !flip;
            drawBit(flip);
        }
    }));
    container.baseScale = scale;
    return container;
}

function addLabel(scene, root, x, y, text, size, color, origin = 0.5) {
    const label = scene.add.text(x, y, text, {
        fontFamily: GAME_FONT,
        fontSize: `${size}px`,
        fontStyle: "bold",
        color
    }).setOrigin(origin, 0.5);
    root.add(label);
    return label;
}

function addGround(scene, root, topY) {
    const depth = ART_HEIGHT / 2 - topY;
    const ground = scene.add.graphics();
    ground.fillStyle(0x23343d, 1).fillRect(-ART_WIDTH / 2, topY, ART_WIDTH, depth);
    ground.fillStyle(0x3b5462, 1).fillRect(-ART_WIDTH / 2, topY, ART_WIDTH, 7);
    ground.fillStyle(0x1a2932, 1);
    for (let index = 0; index < 11; index += 1) {
        const y = topY + 24 + (index % 3) * 20;
        if (y + 8 > topY + depth) continue;
        ground.fillRect(-244 + index * 47, y, 15, 8);
    }
    root.add(ground);
    return ground;
}

function makeSampleIcon(scene, root, x, y, letter, color) {
    const shape = [[0, -19], [17, -8], [13, 13], [-13, 13], [-17, -8]]
        .map(([px, py]) => new Phaser.Geom.Point(px, py));
    const graphic = scene.add.graphics();
    graphic.fillStyle(0x101923, 0.95).lineStyle(3, PAPER, 1);
    graphic.fillPoints(shape, true).strokePoints(shape, true);
    graphic.fillStyle(color, 1).fillCircle(0, -1, 10);
    const label = scene.add.text(0, -2, letter, {
        fontFamily: GAME_FONT,
        fontSize: "18px",
        fontStyle: "bold",
        color: "#101923"
    }).setOrigin(0.5);
    const icon = scene.add.container(x, y, [graphic, label]);
    icon.homeX = x;
    icon.homeY = y;
    root.add(icon);
    return icon;
}

function makeFuelCan(scene, root, x, y) {
    const graphic = scene.add.graphics();
    graphic.fillStyle(0x101923, 0.96).lineStyle(3, PAPER, 1);
    graphic.fillRoundedRect(-21, -26, 42, 52, 6).strokeRoundedRect(-21, -26, 42, 52, 6);
    graphic.fillStyle(EMBER, 1).fillRoundedRect(-15, -20, 30, 40, 4);
    graphic.fillStyle(0x101923, 1).fillRect(-8, -32, 19, 9);
    graphic.lineStyle(3, GOLD, 1).strokeCircle(0, 0, 9);
    graphic.lineBetween(-6, 0, 6, 0);
    graphic.lineBetween(0, -6, 0, 6);
    const can = scene.add.container(x, y, [graphic]);
    can.homeX = x;
    can.homeY = y;
    root.add(can);
    return can;
}

function makeRock(scene, root, x, y, width = 92, height = 66) {
    const points = [
        [-width * 0.48, -height * 0.12],
        [-width * 0.28, -height * 0.5],
        [width * 0.3, -height * 0.42],
        [width * 0.5, 0],
        [width * 0.28, height * 0.46],
        [-width * 0.34, height * 0.42]
    ].map(([px, py]) => new Phaser.Geom.Point(px, py));
    const graphic = scene.add.graphics();
    graphic.fillStyle(0x4a3f3a, 1).lineStyle(3, 0x1b2731, 1);
    graphic.fillPoints(points, true).strokePoints(points, true);
    graphic.lineStyle(3, 0x7d6c61, 0.8);
    graphic.lineBetween(-width * 0.26, -6, width * 0.25, -9);
    graphic.lineBetween(-width * 0.12, 10, width * 0.32, 14);
    const rock = scene.add.container(x, y, [graphic]);
    root.add(rock);
    return rock;
}

// 1 — LAUNCH: pull the drill up against the bands, release, it fires into the rock.
function launchArt({ scene, root, timer, cycle }) {
    const groundY = 62;
    addGround(scene, root, groundY);

    const restY = groundY - 58;
    const post = { left: -98, right: 98, y: restY - 4 };
    const posts = scene.add.graphics();
    [post.left, post.right].forEach((x) => {
        posts.fillStyle(INK, 1).fillRect(x - 10, post.y, 20, 76);
        posts.fillStyle(0x3d5361, 1).fillRect(x - 6, post.y + 4, 12, 68);
        posts.fillStyle(GOLD, 1).fillRect(x - 12, post.y - 9, 24, 10);
    });
    root.add(posts);

    const bands = scene.add.graphics();
    root.add(bands);
    const guide = scene.add.graphics();
    root.add(guide);

    const drill = addDrill(scene, root, timer, { scale: 1.3, x: 0, y: restY });

    const redraw = () => {
        bands.clear();
        guide.clear();
        if (drill.alpha < 0.5) return;
        const stretch = Phaser.Math.Clamp((post.y - drill.y) / 108, 0, 1);
        const color = stretch > 0.72 ? EMBER : stretch > 0.35 ? 0xffa044 : 0x5c3a35;
        bands.lineStyle(10, INK, 1);
        bands.lineBetween(post.left, post.y, drill.x, drill.y + 8);
        bands.lineBetween(post.right, post.y, drill.x, drill.y + 8);
        bands.lineStyle(6, color, 1);
        bands.lineBetween(post.left, post.y, drill.x, drill.y + 8);
        bands.lineBetween(post.right, post.y, drill.x, drill.y + 8);
        if (stretch > 0.25) {
            guide.fillStyle(GOLD, 0.55 + stretch * 0.4);
            for (let step = 0; step < 8; step += 1) {
                const y = drill.y + 62 + step * 24;
                if (y > 138) break;
                guide.fillRect(-4, y, 8, 10);
            }
        }
    };
    timer(scene.time.addEvent({ delay: 16, loop: true, callback: redraw }));
    redraw();

    cycle(1750, (add) => {
        drill.setAlpha(1).setPosition(0, restY).setAngle(0);
        add({ targets: drill, y: restY - 104, duration: 600, ease: "Sine.Out" });
        add({
            targets: drill,
            y: 152,
            duration: 300,
            delay: 960,
            ease: "Quad.In",
            onComplete: () => drill.setAlpha(0)
        });
    });
}

// 2 — STEER: the drill drives to all four sides, one arrow lit at a time.
function steerArt({ scene, root, timer, cycle }) {
    const directions = [
        { key: "right", x: 1, y: 0, at: { x: 176, y: 0 }, angle: 0 },
        { key: "down", x: 0, y: 1, at: { x: 0, y: 124 }, angle: 90 },
        { key: "left", x: -1, y: 0, at: { x: -176, y: 0 }, angle: 180 },
        { key: "up", x: 0, y: -1, at: { x: 0, y: -124 }, angle: -90 }
    ];

    const arrows = {};
    directions.forEach((direction) => {
        const arrow = scene.add.graphics();
        arrow.fillStyle(UI.accent, 1).fillTriangle(-12, -17, -12, 17, 19, 0);
        arrow.setPosition(direction.at.x, direction.at.y).setAngle(direction.angle).setAlpha(0.24);
        root.add(arrow);
        arrows[direction.key] = arrow;
    });

    const drill = addDrill(scene, root, timer, { scale: 1.4, x: 0, y: 0 });

    const highlight = (key) => {
        Object.entries(arrows).forEach(([name, arrow]) => {
            const lit = name === key;
            arrow.setAlpha(lit ? 1 : 0.24).setScale(lit ? 1.3 : 1);
        });
    };

    cycle(2720, (add) => {
        drill.setPosition(0, 0);
        directions.forEach((direction, index) => {
            const at = index * 680;
            add({
                targets: drill,
                x: direction.x * 92,
                y: direction.y * 58,
                duration: 300,
                delay: at,
                ease: "Sine.Out",
                onStart: () => highlight(direction.key)
            });
            add({
                targets: drill,
                x: 0,
                y: 0,
                duration: 300,
                delay: at + 340,
                ease: "Sine.In"
            });
        });
    });
}

// 3 — COLLECT: five samples fly into the drill and fill the layer counter.
function collectArt({ scene, root, timer, cycle }) {
    const drill = addDrill(scene, root, timer, { scale: 1.3, x: 0, y: 26 });
    const seats = [
        { x: -196, y: -34, letter: "F", color: GOLD },
        { x: -100, y: -84, letter: "S", color: MINT },
        { x: 0, y: -104, letter: "M", color: 0x9bd4ff },
        { x: 100, y: -84, letter: "T", color: 0xffa9d2 },
        { x: 196, y: -34, letter: "R", color: 0xbfae8f }
    ];
    const samples = seats.map((seat) =>
        makeSampleIcon(scene, root, seat.x, seat.y, seat.letter, seat.color));

    const pips = scene.add.graphics();
    root.add(pips);
    const drawPips = (count) => {
        pips.clear();
        for (let index = 0; index < 5; index += 1) {
            const x = -108 + index * 54;
            pips.fillStyle(INK, 1).fillRect(x - 20, 96, 40, 30);
            pips.fillStyle(index < count ? UI.accent : 0x2b4350, 1).fillRect(x - 15, 101, 30, 20);
        }
    };
    const counter = addLabel(scene, root, 0, 143, "0 / 5", 17, UI.mutedHex);

    cycle(3400, (add) => {
        drawPips(0);
        counter.setText("0 / 5").setColor(UI.mutedHex);
        drill.setScale(drill.baseScale);
        samples.forEach((sample, index) => {
            sample.setPosition(sample.homeX, sample.homeY).setScale(1).setAlpha(1);
            add({
                targets: sample,
                x: drill.x,
                y: drill.y - 6,
                scale: 0.2,
                alpha: 0.1,
                duration: 320,
                delay: 420 + index * 420,
                ease: "Quad.In",
                onComplete: () => {
                    const collected = index + 1;
                    drawPips(collected);
                    counter
                        .setText(`${collected} / 5`)
                        .setColor(collected === 5 ? UI.accentHex : UI.mutedHex);
                    add({
                        targets: drill,
                        scaleX: drill.baseScale * 1.2,
                        scaleY: drill.baseScale * 0.86,
                        duration: 110,
                        yoyo: true,
                        ease: "Quad.Out"
                    });
                }
            });
        });
    });
}

// 4 — REFUEL: a can flies into the drill and the fuel bar climbs a quarter.
function refuelArt({ scene, root, timer, cycle }) {
    const drill = addDrill(scene, root, timer, { scale: 1.3, x: -54, y: -14 });
    const can = makeFuelCan(scene, root, 196, -22);

    const bar = scene.add.graphics();
    root.add(bar);
    const state = { value: 0.45 };
    const barLeft = -162;
    const barWidth = 324;
    const drawBar = () => {
        bar.clear();
        bar.fillStyle(INK, 1).fillRect(barLeft - 5, 91, barWidth + 10, 40);
        bar.fillStyle(0x2b4350, 1).fillRect(barLeft, 96, barWidth, 30);
        const color = state.value < 0.3 ? EMBER : state.value < 0.6 ? GOLD : UI.accent;
        bar.fillStyle(color, 1).fillRect(barLeft, 96, barWidth * state.value, 30);
        bar.fillStyle(0x1a2932, 1);
        for (let index = 1; index < 4; index += 1) {
            bar.fillRect(barLeft + (barWidth / 4) * index - 2, 96, 4, 30);
        }
    };
    addLabel(scene, root, barLeft, 71, "FUEL", 17, UI.mutedHex, 0);
    const readout = addLabel(scene, root, barLeft + barWidth, 71, "45%", 17, UI.bodyHex, 1);
    const gain = addLabel(scene, root, -54, -60, "+25%", 26, UI.keywordHex).setAlpha(0);
    drawBar();

    cycle(2800, (add) => {
        state.value = 0.45;
        drawBar();
        readout.setText("45%");
        can.setPosition(can.homeX, can.homeY).setScale(1).setAlpha(1).setAngle(0);
        gain.setAlpha(0);
        add({
            targets: can,
            x: drill.x + 10,
            y: drill.y,
            angle: -20,
            duration: 520,
            delay: 260,
            ease: "Quad.In",
            onComplete: () => can.setAlpha(0)
        });
        add({
            targets: state,
            value: 0.7,
            duration: 520,
            delay: 800,
            ease: "Sine.Out",
            onUpdate: () => {
                drawBar();
                readout.setText(`${Math.round(state.value * 100)}%`);
            }
        });
        add({
            targets: drill,
            scaleX: drill.baseScale * 1.14,
            scaleY: drill.baseScale * 0.9,
            duration: 130,
            delay: 790,
            yoyo: true,
            ease: "Quad.Out"
        });
        add({
            targets: gain,
            y: -104,
            alpha: 0,
            duration: 950,
            delay: 800,
            ease: "Cubic.Out",
            onStart: () => gain.setPosition(drill.x, -60).setAlpha(1)
        });
    });
}

// 5 — ROCK CHECK: chạm đá là hiện câu hỏi; sổ tay giữ câu trả lời.
function rockArt({ scene, root, timer, cycle }) {
    const note = scene.add.graphics();
    note.fillStyle(0x101923, 0.96).lineStyle(3, 0x2b4350, 1);
    note.fillRoundedRect(-250, 52, 196, 92, 8).strokeRoundedRect(-250, 52, 196, 92, 8);
    note.fillStyle(UI.muted, 0.7);
    note.fillRect(-236, 94, 150, 7).fillRect(-236, 110, 122, 7).fillRect(-236, 126, 138, 7);
    root.add(note);
    addLabel(scene, root, -152, 73, "FIELD NOTE", 16, UI.mutedHex);

    const noteGlow = scene.add.graphics();
    noteGlow.lineStyle(4, UI.accent, 1).strokeRoundedRect(-252, 50, 200, 96, 8);
    noteGlow.fillStyle(UI.accent, 0.85).fillRect(-236, 110, 122, 7);
    noteGlow.setAlpha(0);
    root.add(noteGlow);

    const rock = makeRock(scene, root, 22, 8);
    const drill = addDrill(scene, root, timer, { scale: 1.25, x: -206, y: 4 });

    const card = scene.add.container(118, -78);
    const panel = scene.add.graphics();
    panel.fillStyle(UI.card, 1).lineStyle(4, UI.accent, 1);
    panel.fillRoundedRect(-104, -60, 208, 120, 10).strokeRoundedRect(-104, -60, 208, 120, 10);
    panel.fillStyle(0x2b4350, 1);
    panel.fillRect(-86, 4, 172, 16).fillRect(-86, 28, 172, 16);
    card.add(panel);
    const mark = scene.add.text(0, -28, "?", {
        fontFamily: GAME_FONT,
        fontSize: "44px",
        fontStyle: "bold",
        color: UI.keywordHex
    }).setOrigin(0.5);
    card.add(mark);
    const pick = scene.add.graphics();
    pick.fillStyle(UI.accent, 1).fillRect(-86, 28, 172, 16);
    pick.setAlpha(0);
    card.add(pick);
    card.setScale(0.2).setAlpha(0);
    root.add(card);

    cycle(3200, (add) => {
        drill.setPosition(-206, 4).setAngle(0);
        rock.setAngle(0).setPosition(22, 8);
        card.setScale(0.2).setAlpha(0);
        pick.setAlpha(0);
        noteGlow.setAlpha(0);
        add({ targets: drill, x: -46, duration: 720, delay: 200, ease: "Sine.In" });
        add({ targets: drill, x: -80, duration: 240, delay: 920, ease: "Quad.Out" });
        add({ targets: rock, angle: 7, duration: 80, delay: 920, yoyo: true, repeat: 2 });
        add({ targets: card, scale: 1, alpha: 1, duration: 260, delay: 1000, ease: "Back.Out" });
        add({ targets: noteGlow, alpha: 1, duration: 260, delay: 1440 });
        add({ targets: pick, alpha: 1, duration: 220, delay: 2000 });
    });
}
