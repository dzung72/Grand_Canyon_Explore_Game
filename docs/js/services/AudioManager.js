// Descent: một hệ thống nhạc phản ứng thay cho một vòng lặp cố định.
// Thang âm, cao độ gốc và mật độ nốt đổi theo tầng đá, nên càng khoan sâu
// nhạc càng cổ sơ — tầng đáy chỉ còn quãng 5 rỗng và drone.

const MODES = {
    lydian: [0, 2, 4, 6, 7, 9, 11],
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    drone: [0, 7, 12]
};

// Tầng 0 là trẻ nhất (Kaibab ~270 triệu năm), tầng 9 là Vishnu Schist ~1.7 tỉ năm.
const LAYER_VOICES = [
    { mode: "lydian", root: 233.08, air: 1 },
    { mode: "lydian", root: 220, air: 0.93 },
    { mode: "ionian", root: 207.65, air: 0.86 },
    { mode: "ionian", root: 196, air: 0.78 },
    { mode: "dorian", root: 185, air: 0.7 },
    { mode: "dorian", root: 174.61, air: 0.62 },
    { mode: "aeolian", root: 164.81, air: 0.52 },
    { mode: "aeolian", root: 155.56, air: 0.43 },
    { mode: "phrygian", root: 146.83, air: 0.32 },
    { mode: "drone", root: 130.81, air: 0.16 }
];

// Thang 5 bậc cho tiếng nhặt mẫu: năm mẫu ghép thành một câu nhạc trọn vẹn.
const COLLECT_LADDER = [0, 2, 4, 7, 12];
const COLLECT_BASE = 523.25;

const STEPS_PER_PHRASE = 16;

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Giai điệu sinh theo hạt giống của tầng: mỗi tầng một câu riêng, ổn định
// trong suốt phiên chơi, nhưng không bao giờ là cùng một mảng cứng.
function buildMotif(scaleLength, seed, density) {
    const random = mulberry32(seed);
    const motif = new Array(STEPS_PER_PHRASE).fill(null);
    const anchors = [0, 3, 6, 8, 11, 14, 5, 12];
    anchors.forEach((step, index) => {
        if (index > 1 && random() > density) return;
        const degree = Math.floor(random() * scaleLength);
        const lift = random() < 0.22 ? scaleLength : 0;
        motif[step] = degree + lift;
    });
    return motif;
}

class RetroMusicManager {
    constructor() {
        this.context = null;
        this.master = null;
        this.limiter = null;
        this.musicBus = null;
        this.sfxBus = null;
        this.reverb = null;
        this.reverbReturn = null;
        this.musicSend = null;
        this.sfxSend = null;

        this.scheduler = null;
        this.stepIndex = 0;
        this.phrase = 0;
        this.nextStepTime = 0;

        this.layerIndex = 0;
        this.motif = buildMotif(7, 1, 0.7);
        this.intensity = 1;
        this.reading = false;
        this.collectStep = 0;

        this.motorOscillator = null;
        this.motorSub = null;
        this.motorGain = null;
        this.motorFilter = null;
        this.motorLevel = 0.0001;
        this.ambienceSource = null;
        this.ambienceGain = null;
        this.ambienceFilter = null;
        this.ambienceActive = false;
        this.ambienceDepth = -1;

        this.musicEnabled = localStorage.getItem("gc-music-enabled") !== "false";
        this.sfxEnabled = localStorage.getItem("gc-sfx-enabled") !== "false";
    }

    // ---------------------------------------------------------------- graph

    async unlock() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            this.context = this.context || new AudioContext();
            if (this.context.state === "suspended") await this.context.resume();
            if (!this.master) this.buildGraph();
            return this.context.state === "running";
        } catch (error) {
            console.warn("Audio could not be unlocked:", error);
            return false;
        }
    }

    buildGraph() {
        const context = this.context;
        const now = context.currentTime;

        // Limiter đứng cuối chuỗi: nhiều âm chồng nhau không còn vỡ tiếng.
        this.limiter = context.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-9, now);
        this.limiter.knee.setValueAtTime(2, now);
        this.limiter.ratio.setValueAtTime(14, now);
        this.limiter.attack.setValueAtTime(0.003, now);
        this.limiter.release.setValueAtTime(0.14, now);
        this.limiter.connect(context.destination);

        this.master = context.createGain();
        this.master.gain.setValueAtTime(0.2, now);
        this.master.connect(this.limiter);

        // Reverb dùng chung để nhạc và tiếng động nghe như ở cùng một hang.
        this.reverb = context.createConvolver();
        this.reverb.buffer = this.createImpulse(1.9, 2.4);
        this.reverbReturn = context.createGain();
        this.reverbReturn.gain.setValueAtTime(0.9, now);
        this.reverb.connect(this.reverbReturn);
        this.reverbReturn.connect(this.master);

        this.musicBus = context.createGain();
        this.sfxBus = context.createGain();
        this.musicBus.gain.setValueAtTime(this.musicEnabled ? 0.72 : 0.0001, now);
        this.sfxBus.gain.setValueAtTime(this.sfxEnabled ? 1.05 : 0.0001, now);
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);

        this.musicSend = context.createGain();
        this.sfxSend = context.createGain();
        this.musicSend.gain.setValueAtTime(0.3, now);
        this.sfxSend.gain.setValueAtTime(0.16, now);
        this.musicBus.connect(this.musicSend);
        this.sfxBus.connect(this.sfxSend);
        this.musicSend.connect(this.reverb);
        this.sfxSend.connect(this.reverb);
    }

    createImpulse(seconds, decay) {
        const rate = this.context.sampleRate;
        const length = Math.ceil(rate * seconds);
        const impulse = this.context.createBuffer(2, length, rate);
        for (let channel = 0; channel < 2; channel += 1) {
            const data = impulse.getChannelData(channel);
            for (let index = 0; index < length; index += 1) {
                const progress = index / length;
                // Trễ đầu một chút để tiếng trực tiếp không bị nhoè.
                const preDelay = progress < 0.012 ? progress / 0.012 : 1;
                data[index] = (Math.random() * 2 - 1) *
                    ((1 - progress) ** decay) * preDelay * 0.7;
            }
        }
        return impulse;
    }

    bus(name) {
        return name === "music" ? this.musicBus : this.sfxBus;
    }

    // ---------------------------------------------------------------- music

    voice() {
        return LAYER_VOICES[Math.max(0, Math.min(LAYER_VOICES.length - 1, this.layerIndex))];
    }

    scale() {
        return MODES[this.voice().mode] || MODES.aeolian;
    }

    // Tầng nào cũng có câu nhạc riêng; tầng sâu thưa nốt dần.
    setLayer(index) {
        const next = Math.max(0, Math.round(index) || 0);
        if (next === this.layerIndex) return;
        this.layerIndex = next;
        const voice = this.voice();
        this.motif = buildMotif(this.scale().length, next * 977 + 13, 0.2 + voice.air * 0.62);
        this.collectStep = 0;
        if (this.context && this.musicEnabled) this.stepIndex = 0;
    }

    resetCollectLadder() {
        this.collectStep = 0;
    }

    // 0 chờ · 1 rơi · 2 đang khoan · 3 sắp hết nhiên liệu
    setIntensity(level) {
        this.intensity = Math.max(0, Math.min(3, Math.round(level) || 0));
    }

    // Nhạc lùi lại khi người chơi cần đọc câu hỏi hoặc sổ tay.
    setReading(active) {
        const next = Boolean(active);
        if (next === this.reading) return;
        this.reading = next;
        if (!this.context || !this.musicBus || !this.musicEnabled) return;
        const now = this.context.currentTime;
        this.musicBus.gain.cancelScheduledValues(now);
        this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), now);
        this.musicBus.gain.setTargetAtTime(next ? 0.2 : 0.72, now, 0.08);
        if (this.motorGain) {
            this.motorGain.gain.setTargetAtTime(next ? 0.0001 : this.motorLevel || 0.0001, now, 0.08);
        }
    }

    beatSeconds() {
        const bpm = this.intensity >= 3 ? 112 : this.intensity >= 2 ? 96 : 84;
        return 60 / bpm / 2;
    }

    async start() {
        const ready = await this.unlock();
        if (!ready || !this.musicEnabled || this.scheduler) return;
        try {
            this.musicBus.gain.setTargetAtTime(
                this.reading ? 0.2 : 0.72,
                this.context.currentTime,
                0.05
            );
            this.stepIndex = 0;
            this.phrase = 0;
            this.nextStepTime = this.context.currentTime + 0.08;
            // Lên lịch trước bằng đồng hồ của Web Audio; setInterval chỉ đóng vai
            // trò đánh thức, nên nhịp không còn trôi khi tab bị hãm.
            this.scheduler = window.setInterval(() => this.pump(), 25);
            this.pump();
        } catch (error) {
            console.warn("Background music is unavailable:", error);
        }
    }

    pump() {
        if (!this.context || !this.musicBus) return;
        const horizon = this.context.currentTime + 0.12;
        let guard = 0;
        while (this.nextStepTime < horizon && guard < 64) {
            this.scheduleStep(this.stepIndex, this.nextStepTime);
            this.nextStepTime += this.beatSeconds();
            this.stepIndex += 1;
            if (this.stepIndex >= STEPS_PER_PHRASE) {
                this.stepIndex = 0;
                this.phrase += 1;
            }
            guard += 1;
        }
    }

    noteHz(degree, octave = 0) {
        const scale = this.scale();
        const wrapped = ((degree % scale.length) + scale.length) % scale.length;
        const lift = Math.floor(degree / scale.length) + octave;
        return this.voice().root * (2 ** ((scale[wrapped] + lift * 12) / 12));
    }

    scheduleStep(step, when) {
        const voice = this.voice();
        const beat = this.beatSeconds();
        const phraseLength = beat * STEPS_PER_PHRASE;

        // Pad: nền hoà âm dài, luôn có mặt, ướt reverb.
        if (step === 0) {
            const chord = voice.mode === "drone" ? [0, 2] : [0, 2, 4];
            chord.forEach((degree, index) => {
                this.tone(this.noteHz(degree, -1), phraseLength * 0.96, "sine",
                    0.05 + voice.air * 0.03, when - this.context.currentTime + index * 0.02,
                    "music", 0.35);
            });
        }

        // Bass: xương sống nhịp, vào từ lúc bắt đầu rơi.
        if (this.intensity >= 1 && (step === 0 || step === 3 || step === 8 || step === 11)) {
            const degree = step < 8 ? 0 : voice.mode === "drone" ? 1 : 4;
            this.tone(this.noteHz(degree, -2), beat * 1.6, "triangle", 0.14,
                when - this.context.currentTime, "music", 0.012);
        }

        // Lead: chỉ khi đang khoan, và tầng đáy thì im hẳn — 1.7 tỉ năm không có giai điệu.
        if (this.intensity >= 2 && voice.mode !== "drone") {
            const shift = this.phrase % 2 === 1 && step % 5 === 3 ? 1 : 0;
            const degree = this.motif[step];
            if (degree !== null && degree !== undefined) {
                this.tone(this.noteHz(degree + shift), beat * 1.25, "triangle",
                    0.075 + voice.air * 0.04, when - this.context.currentTime, "music", 0.008);
            }
        }

        // Trống: kick và hat rất nhẹ, chỉ để có groove chứ không lấn tiếng động.
        if (this.intensity >= 2) {
            if (step === 0 || step === 8 || (this.intensity >= 3 && step === 6)) {
                this.kick(when, 0.5);
            }
            const hat = this.intensity >= 3 || step % 2 === 1;
            if (hat) this.hat(when, this.intensity >= 3 ? 0.05 : 0.035);
        }
    }

    kick(when, volume = 0.5) {
        if (!this.context || !this.musicBus) return;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(128, when);
        oscillator.frequency.exponentialRampToValueAtTime(42, when + 0.11);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(volume * 0.3, when + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
        oscillator.connect(gain);
        gain.connect(this.musicBus);
        oscillator.start(when);
        oscillator.stop(when + 0.2);
    }

    hat(when, volume = 0.04) {
        if (!this.context || !this.musicBus) return;
        const rate = this.context.sampleRate;
        const length = Math.ceil(rate * 0.04);
        const buffer = this.context.createBuffer(1, length, rate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < length; index += 1) {
            data[index] = (Math.random() * 2 - 1) * ((1 - index / length) ** 3);
        }
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        source.buffer = buffer;
        filter.type = "highpass";
        filter.frequency.setValueAtTime(7200, when);
        gain.gain.setValueAtTime(volume, when);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicBus);
        source.start(when);
    }

    duckMusic(duration = 0.7) {
        if (!this.musicEnabled || !this.context || !this.musicBus || this.reading) return;
        const now = this.context.currentTime;
        this.musicBus.gain.cancelScheduledValues(now);
        this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), now);
        this.musicBus.gain.setTargetAtTime(0.12, now, 0.018);
        this.musicBus.gain.setTargetAtTime(0.72, now + duration, 0.08);
    }

    // ------------------------------------------------------------------ sfx

    effect(name, options = {}) {
        if (!this.sfxEnabled) return;
        if (!this.context || !this.master || this.context.state !== "running") {
            this.unlock().then((ready) => {
                if (ready && this.sfxEnabled) this.playEffect(name, options);
            });
            return;
        }
        this.playEffect(name, options);
    }

    playEffect(name, options = {}) {
        const table = {
            launch: () => this.sfxLaunch(),
            impact: () => this.sfxImpact(),
            collect: () => this.sfxCollect(),
            bump: () => this.sfxBump(),
            correct: () => this.sfxCorrect(),
            wrong: () => this.sfxWrong(),
            upgrade: () => this.sfxUpgrade(),
            layer: () => this.sfxLayerEnter(),
            layerEnter: () => this.sfxLayerEnter(),
            finish: () => this.sfxFinish(),
            fail: () => this.sfxFail(),
            fuel: () => this.sfxFuel(),
            hazard: () => this.sfxHazard(),
            nearMiss: () => this.sfxNearMiss(options.combo || 1),
            boost: () => this.sfxBoost(),
            uiClick: () => this.sfxUiClick(),
            hush: () => this.sfxHush()
        };
        (table[name] || (() => {}))();
    }

    // Lệch nhẹ cao độ mỗi lần phát: tai không nhận ra là cùng một mẫu.
    vary(frequency, amount = 0.03) {
        return frequency * (1 + (Math.random() * 2 - 1) * amount);
    }

    sfxLaunch() {
        this.tone(this.vary(184), 0.13, "square", 0.12, 0);
        this.tone(this.vary(276), 0.18, "triangle", 0.1, 0.075);
        this.noise(0.22, 0.2, 900, 0.02, "bandpass", 0.9);
    }

    // Va chạm: cú nổ, rồi vụn đá rơi lộp độp trong hang.
    sfxImpact() {
        this.duckMusic(0.9);
        this.boom();
        this.noise(0.72, 0.92, 260);
        this.noise(0.2, 0.86, 1250, 0, "bandpass", 0.9);
        this.noise(0.08, 0.7, 2800, 0.01, "highpass", 0.6);
        const debris = 3 + Math.floor(Math.random() * 2);
        for (let index = 0; index < debris; index += 1) {
            const delay = 0.1 + Math.random() * 0.3;
            this.noise(
                0.05 + Math.random() * 0.04,
                0.26 - index * 0.045,
                1700 + Math.random() * 1400,
                delay,
                "bandpass",
                1.6
            );
            this.tone(this.vary(320 + Math.random() * 260, 0.08), 0.06, "square", 0.03, delay, "sfx", 0.004);
        }
        this.tail(0.55, 0.34);
    }

    // Năm mẫu = năm bậc đi lên. Nhặt đủ là nghe trọn một câu.
    sfxCollect() {
        const step = this.collectStep % COLLECT_LADDER.length;
        const semitone = COLLECT_LADDER[step];
        const frequency = COLLECT_BASE * (2 ** (semitone / 12));
        this.tone(this.vary(frequency, 0.006), 0.13, "triangle", 0.12, 0);
        this.tone(this.vary(frequency * 2, 0.006), 0.09, "sine", 0.05, 0.02);
        this.noise(0.05, 0.1, 5200, 0, "highpass", 0.8);
        if (step === COLLECT_LADDER.length - 1) {
            // Nốt thứ năm khép câu bằng một hợp âm nhỏ.
            [0, 4, 7].forEach((offset, index) => {
                this.tone(frequency * (2 ** (offset / 12)), 0.34, "sine", 0.07, 0.09 + index * 0.035);
            });
            this.tail(0.3, 0.22);
        }
        this.collectStep = (this.collectStep + 1) % COLLECT_LADDER.length;
    }

    sfxBump() {
        this.tone(this.vary(96), 0.12, "square", 0.3, 0);
        this.tone(this.vary(70), 0.18, "triangle", 0.2, 0.05);
        this.noise(0.14, 0.3, 680);
    }

    sfxCorrect() {
        const base = this.vary(523.25, 0.004);
        this.tone(base, 0.1, "square", 0.12, 0);
        this.tone(base * 1.26, 0.12, "triangle", 0.13, 0.075);
        this.tone(base * 1.5, 0.22, "triangle", 0.14, 0.15);
        this.noise(0.16, 0.24, 1450, 0.02);
        this.tail(0.22, 0.2);
    }

    // Cố ý hiền: âm phạt gay gắt làm học sinh sợ sai.
    sfxWrong() {
        this.tone(this.vary(196, 0.01), 0.16, "sine", 0.13, 0, "sfx", 0.01);
        this.tone(this.vary(155.56, 0.01), 0.24, "triangle", 0.1, 0.07, "sfx", 0.012);
        this.noise(0.1, 0.06, 520, 0.02, "lowpass", 0.6);
    }

    sfxUpgrade() {
        [392, 523, 659, 1047].forEach((frequency, index) => {
            this.tone(frequency, index === 3 ? 0.3 : 0.11, index === 3 ? "sine" : "square",
                0.12, index * 0.09);
        });
        this.tail(0.3, 0.24);
    }

    // Vào tầng mới: hợp âm rải theo thang âm của chính tầng đó.
    sfxLayerEnter() {
        const degrees = this.voice().mode === "drone" ? [0, 1, 2] : [0, 2, 4, 6];
        this.tone(this.noteHz(0, -2), 0.9, "sine", 0.1, 0, "sfx", 0.06);
        degrees.forEach((degree, index) => {
            this.tone(this.noteHz(degree), 0.42, "triangle", 0.1, 0.06 + index * 0.085, "sfx", 0.01);
        });
        this.tail(0.6, 0.4);
    }

    sfxFinish() {
        [330, 440, 550, 880].forEach((frequency, index) => {
            this.tone(frequency, index === 3 ? 0.5 : 0.18, index === 3 ? "sine" : "triangle",
                0.12, index * 0.13);
        });
        this.tail(0.8, 0.45);
    }

    sfxFail() {
        this.tone(184, 0.22, "triangle", 0.11, 0, "sfx", 0.02);
        this.tone(138, 0.34, "sine", 0.1, 0.16, "sfx", 0.02);
        this.tail(0.5, 0.3);
    }

    // Tiếng chất lỏng chảy vào bình, không còn là ba nốt rời.
    sfxFuel() {
        if (!this.context || !this.sfxBus) return;
        const start = this.context.currentTime;
        const duration = 0.42;
        const rate = this.context.sampleRate;
        const length = Math.ceil(rate * duration);
        const buffer = this.context.createBuffer(1, length, rate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < length; index += 1) {
            const progress = index / length;
            data[index] = (Math.random() * 2 - 1) * Math.sin(Math.PI * progress) ** 1.3;
        }
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        source.buffer = buffer;
        filter.type = "lowpass";
        filter.Q.setValueAtTime(6, start);
        filter.frequency.setValueAtTime(220, start);
        filter.frequency.exponentialRampToValueAtTime(1600, start + duration);
        gain.gain.setValueAtTime(0.36, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        source.start(start);

        // Ba bọt khí nhấp nhô cho ra chất lỏng.
        [0, 0.09, 0.19].forEach((delay, index) => {
            const bubble = this.context.createOscillator();
            const bubbleGain = this.context.createGain();
            const at = start + delay;
            bubble.type = "sine";
            bubble.frequency.setValueAtTime(120 + index * 30, at);
            bubble.frequency.exponentialRampToValueAtTime(320 + index * 90, at + 0.07);
            bubbleGain.gain.setValueAtTime(0.0001, at);
            bubbleGain.gain.exponentialRampToValueAtTime(0.16, at + 0.012);
            bubbleGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
            bubble.connect(bubbleGain);
            bubbleGain.connect(this.sfxBus);
            bubble.start(at);
            bubble.stop(at + 0.12);
        });
        this.tone(this.vary(880, 0.01), 0.2, "sine", 0.07, 0.3);
    }

    sfxHazard() {
        this.tone(this.vary(174), 0.16, "sawtooth", 0.16, 0);
        this.tone(this.vary(116), 0.26, "square", 0.12, 0.09);
        this.noise(0.3, 0.16, 900, 0, "bandpass", 1.2);
    }

    // Doppler thật: cao độ tụt khi tảng đá lướt qua; combo càng cao càng sáng.
    sfxNearMiss(combo = 1) {
        if (!this.context || !this.sfxBus) return;
        const start = this.context.currentTime;
        const duration = 0.38;
        const lift = 1 + (Math.min(4, Math.max(1, combo)) - 1) * 0.17;
        const rate = this.context.sampleRate;
        const length = Math.ceil(rate * duration);
        const buffer = this.context.createBuffer(1, length, rate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < length; index += 1) {
            const progress = index / length;
            data[index] = (Math.random() * 2 - 1) * (Math.sin(Math.PI * progress) ** 1.5);
        }
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        const panner = this.context.createStereoPanner?.();
        const direction = Math.random() > 0.5 ? 1 : -1;
        source.buffer = buffer;
        filter.type = "bandpass";
        filter.Q.setValueAtTime(1.4, start);
        filter.frequency.setValueAtTime(2600 * lift, start);
        filter.frequency.exponentialRampToValueAtTime(620 * lift, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.34, start + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        if (panner) {
            panner.pan.setValueAtTime(-0.8 * direction, start);
            panner.pan.linearRampToValueAtTime(0.8 * direction, start + duration);
            filter.connect(panner);
            panner.connect(gain);
        } else {
            filter.connect(gain);
        }
        gain.connect(this.sfxBus);
        source.start(start);
        source.stop(start + duration + 0.03);

        // Cao độ của chuỗi combo: x1 thấp, x4 vút lên.
        const tone = this.context.createOscillator();
        const toneGain = this.context.createGain();
        tone.type = "triangle";
        tone.frequency.setValueAtTime(880 * lift, start);
        tone.frequency.exponentialRampToValueAtTime(430 * lift, start + duration * 0.8);
        toneGain.gain.setValueAtTime(0.0001, start);
        toneGain.gain.exponentialRampToValueAtTime(0.07 + combo * 0.012, start + 0.04);
        toneGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.85);
        tone.connect(toneGain);
        toneGain.connect(this.sfxBus);
        tone.start(start);
        tone.stop(start + duration);
    }

    sfxBoost() {
        this.tone(this.vary(124), 0.1, "sawtooth", 0.13, 0);
        this.tone(this.vary(248), 0.18, "triangle", 0.11, 0.05);
        this.noise(0.2, 0.16, 950, 0, "bandpass", 0.8);
    }

    // Một nốt trầm ngân dài cho khoảnh khắc chạm mặt bất chỉnh hợp: không phải
    // tiếng báo hiệu, mà là tiếng của một khoảng trống.
    sfxHush() {
        if (!this.context || !this.sfxBus) return;
        const start = this.context.currentTime;
        [
            { frequency: 55, type: "sine", volume: 0.16, duration: 3.6 },
            { frequency: 82.4, type: "sine", volume: 0.09, duration: 3.2 },
            { frequency: 164.8, type: "triangle", volume: 0.035, duration: 2.4 }
        ].forEach((voice, index) => {
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            const at = start + index * 0.05;
            oscillator.type = voice.type;
            oscillator.frequency.setValueAtTime(voice.frequency, at);
            gain.gain.setValueAtTime(0.0001, at);
            gain.gain.exponentialRampToValueAtTime(voice.volume, at + 0.7);
            gain.gain.exponentialRampToValueAtTime(0.0001, at + voice.duration);
            oscillator.connect(gain);
            gain.connect(this.sfxBus);
            oscillator.start(at);
            oscillator.stop(at + voice.duration + 0.05);
        });
        this.tail(2.4, 0.5);
    }

    sfxUiClick() {
        this.tone(740, 0.035, "triangle", 0.045, 0);
        this.tone(1180, 0.05, "sine", 0.03, 0.028);
    }

    // Một chút đuôi vọng riêng cho các cú lớn.
    tail(duration, volume) {
        if (!this.context || !this.reverb) return;
        const rate = this.context.sampleRate;
        const length = Math.ceil(rate * 0.05);
        const buffer = this.context.createBuffer(1, length, rate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < length; index += 1) {
            data[index] = (Math.random() * 2 - 1) * ((1 - index / length) ** 2);
        }
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        const start = this.context.currentTime;
        source.buffer = buffer;
        gain.gain.setValueAtTime(volume * 0.5, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(gain);
        gain.connect(this.reverb);
        source.start(start);
    }

    // ---------------------------------------------------------- motor & air

    setMotor(active, speedRatio = 0, resistance = 20) {
        if (!this.sfxEnabled || !this.context || !this.sfxBus) return;
        const now = this.context.currentTime;
        if (!this.motorOscillator) {
            this.motorOscillator = this.context.createOscillator();
            this.motorSub = this.context.createOscillator();
            this.motorGain = this.context.createGain();
            this.motorFilter = this.context.createBiquadFilter();
            this.motorOscillator.type = "sawtooth";
            this.motorSub.type = "sine";
            this.motorGain.gain.setValueAtTime(0.0001, now);
            this.motorFilter.type = "lowpass";
            this.motorFilter.Q.setValueAtTime(3.2, now);
            this.motorOscillator.connect(this.motorFilter);
            this.motorSub.connect(this.motorFilter);
            this.motorFilter.connect(this.motorGain);
            this.motorGain.connect(this.sfxBus);
            this.motorOscillator.start(now);
            this.motorSub.start(now);
        }
        const motion = Math.max(0, Math.min(1, speedRatio));
        const hardness = Math.max(0, Math.min(1, resistance / 30));
        const frequency = 74 + motion * 132 - hardness * 20;
        const cutoff = 300 + motion * 1250 - hardness * 140;
        // Giữ thật khẽ: máy khoan là nền, không được lấn tiếng mẫu vật hay va chạm.
        this.motorLevel = active ? 0.026 + hardness * 0.03 + motion * 0.016 : 0.0001;
        const target = this.reading ? 0.0001 : this.motorLevel;
        this.motorOscillator.frequency.setTargetAtTime(frequency, now, 0.05);
        this.motorSub.frequency.setTargetAtTime(frequency * 0.5, now, 0.05);
        this.motorFilter.frequency.setTargetAtTime(Math.max(170, cutoff), now, 0.05);
        this.motorGain.gain.setTargetAtTime(target, now, active ? 0.04 : 0.1);
    }

    setAmbience(active, depthRatio = 0) {
        if (!this.sfxEnabled || !this.context || !this.sfxBus) return;
        const now = this.context.currentTime;
        const depth = Math.max(0, Math.min(1, depthRatio));
        if (
            this.ambienceSource &&
            active === this.ambienceActive &&
            Math.abs(depth - this.ambienceDepth) < 0.02
        ) return;
        if (!this.ambienceSource) {
            const duration = 2.4;
            const buffer = this.context.createBuffer(
                1,
                Math.ceil(this.context.sampleRate * duration),
                this.context.sampleRate
            );
            const data = buffer.getChannelData(0);
            let brown = 0;
            for (let index = 0; index < data.length; index += 1) {
                brown = brown * 0.985 + (Math.random() * 2 - 1) * 0.05;
                data[index] = brown;
            }
            this.ambienceSource = this.context.createBufferSource();
            this.ambienceGain = this.context.createGain();
            this.ambienceFilter = this.context.createBiquadFilter();
            this.ambienceSource.buffer = buffer;
            this.ambienceSource.loop = true;
            this.ambienceFilter.type = "bandpass";
            this.ambienceFilter.Q.setValueAtTime(0.62, now);
            this.ambienceGain.gain.setValueAtTime(0.0001, now);
            this.ambienceSource.connect(this.ambienceFilter);
            this.ambienceFilter.connect(this.ambienceGain);
            this.ambienceGain.connect(this.sfxBus);
            this.ambienceSource.start(now);
        }
        this.ambienceActive = active;
        this.ambienceDepth = depth;
        this.ambienceFilter.frequency.setTargetAtTime(510 - depth * 210, now, 0.18);
        this.ambienceGain.gain.setTargetAtTime(
            active ? 0.05 + depth * 0.02 : 0.0001,
            now,
            active ? 0.25 : 0.08
        );
    }

    boom() {
        if (!this.context || !this.sfxBus) return;
        const start = this.context.currentTime;
        [
            { type: "sine", from: 150, to: 34, volume: 1.05, duration: 0.82 },
            { type: "triangle", from: 96, to: 42, volume: 0.66, duration: 0.58 }
        ].forEach((voice, index) => {
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            const voiceStart = start + index * 0.008;
            oscillator.type = voice.type;
            oscillator.frequency.setValueAtTime(voice.from, voiceStart);
            oscillator.frequency.exponentialRampToValueAtTime(voice.to, voiceStart + voice.duration);
            gain.gain.setValueAtTime(0.0001, voiceStart);
            gain.gain.exponentialRampToValueAtTime(voice.volume, voiceStart + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, voiceStart + voice.duration);
            oscillator.connect(gain);
            gain.connect(this.sfxBus);
            oscillator.start(voiceStart);
            oscillator.stop(voiceStart + voice.duration + 0.03);
        });
    }

    noise(duration, volume, cutoff, delay = 0, filterType = "lowpass", q = 0.7) {
        if (!this.context || !this.master) return;
        const sampleRate = this.context.sampleRate;
        const buffer = this.context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < data.length; index += 1) {
            const decay = 1 - index / data.length;
            data[index] = (Math.random() * 2 - 1) * decay * decay;
        }
        const source = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        const gain = this.context.createGain();
        const start = this.context.currentTime + delay;
        source.buffer = buffer;
        filter.type = filterType;
        filter.frequency.setValueAtTime(cutoff, start);
        filter.Q.setValueAtTime(q, start);
        gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        source.start(start);
    }

    tone(frequency, duration, type, volume, delay = 0, busName = "sfx", attack = 0.025) {
        if (!this.context || !this.master) return;
        const start = this.context.currentTime + Math.max(0, delay);
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.max(0.002, attack));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(this.bus(busName));
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
    }

    // -------------------------------------------------------------- control

    stopMusic() {
        if (this.scheduler) window.clearInterval(this.scheduler);
        this.scheduler = null;
        if (this.musicBus && this.context) {
            this.musicBus.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.035);
        }
    }

    stopMotor() {
        [this.motorOscillator, this.motorSub].forEach((node) => {
            if (!node) return;
            try {
                node.stop();
            } catch (error) {
                console.warn("Drill motor could not stop cleanly.", error);
            }
            node.disconnect();
        });
        this.motorGain?.disconnect();
        this.motorFilter?.disconnect();
        this.motorOscillator = null;
        this.motorSub = null;
        this.motorGain = null;
        this.motorFilter = null;
        this.motorLevel = 0.0001;
    }

    stopAmbience() {
        if (this.ambienceSource) {
            try {
                this.ambienceSource.stop();
            } catch (error) {
                console.warn("Expedition ambience could not stop cleanly.", error);
            }
            this.ambienceSource.disconnect();
        }
        this.ambienceGain?.disconnect();
        this.ambienceFilter?.disconnect();
        this.ambienceSource = null;
        this.ambienceGain = null;
        this.ambienceFilter = null;
        this.ambienceActive = false;
        this.ambienceDepth = -1;
    }

    async toggle() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem("gc-music-enabled", String(this.musicEnabled));
        if (this.musicEnabled) await this.start();
        else this.stopMusic();
        return this.musicEnabled;
    }

    async toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        localStorage.setItem("gc-sfx-enabled", String(this.sfxEnabled));
        await this.unlock();
        if (this.sfxBus && this.context) {
            this.sfxBus.gain.setTargetAtTime(
                this.sfxEnabled ? 1.05 : 0.0001,
                this.context.currentTime,
                0.025
            );
        }
        if (!this.sfxEnabled) {
            this.stopMotor();
            this.stopAmbience();
        } else {
            this.effect("uiClick");
        }
        return this.sfxEnabled;
    }

    label() {
        return this.musicEnabled ? "MUSIC ON" : "MUSIC OFF";
    }

    sfxLabel() {
        return this.sfxEnabled ? "SFX ON" : "SFX OFF";
    }
}

export const retroMusic = new RetroMusicManager();
