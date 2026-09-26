class RetroMusicManager {
    constructor() {
        this.context = null;
        this.master = null;
        this.timer = null;
        this.step = 0;
        this.motorOscillator = null;
        this.motorGain = null;
        this.motorFilter = null;
        this.enabled = localStorage.getItem("gc-music-enabled") !== "false";
    }

    async start() {
        if (!this.enabled || this.timer) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.context = this.context || new AudioContext();
            if (this.context.state === "suspended") await this.context.resume();
            if (!this.enabled || this.timer) return;
            this.master = this.context.createGain();
            this.master.gain.setValueAtTime(0.14, this.context.currentTime);
            this.master.connect(this.context.destination);
            this.step = 0;
            this.playStep();
            this.timer = window.setInterval(() => this.playStep(), 360);
        } catch (error) {
            console.warn("Background music is unavailable:", error);
        }
    }

    playStep() {
        if (!this.context || !this.master) return;
        const melody = [0, 3, 7, 10, 7, 3, 12, 10, 0, 5, 8, 12, 8, 5, 3, -2];
        const bass = [0, 0, -2, -2];
        const semitone = melody[this.step % melody.length];
        const frequency = 220 * (2 ** (semitone / 12));
        this.tone(frequency, 0.24, "triangle", 0.16);

        if (this.step % 4 === 0) {
            const bassFrequency = 110 * (2 ** (bass[Math.floor(this.step / 4) % bass.length] / 12));
            this.tone(bassFrequency, 0.62, "sine", 0.22);
        }
        if (this.step % 8 === 6) this.tone(frequency * 2, 0.12, "square", 0.045);
        this.step += 1;
    }

    effect(name) {
        if (!this.enabled || !this.context || !this.master) return;
        const effects = {
            launch: [
                [180, 0.12, "square", 0.12, 0],
                [270, 0.16, "triangle", 0.1, 0.08]
            ],
            impact: [
                [68, 0.48, "sawtooth", 0.58, 0],
                [42, 0.62, "square", 0.42, 0.02],
                [32, 0.75, "sine", 0.54, 0.01]
            ],
            collect: [
                [660, 0.09, "square", 0.1, 0],
                [880, 0.13, "triangle", 0.1, 0.08]
            ],
            bump: [
                [92, 0.12, "square", 0.32, 0],
                [68, 0.18, "sawtooth", 0.22, 0.06]
            ],
            correct: [
                [523, 0.1, "square", 0.13, 0],
                [659, 0.12, "triangle", 0.14, 0.08],
                [784, 0.2, "triangle", 0.15, 0.17]
            ],
            wrong: [
                [196, 0.18, "sawtooth", 0.2, 0],
                [147, 0.28, "square", 0.16, 0.12]
            ],
            upgrade: [
                [392, 0.11, "square", 0.11, 0],
                [523, 0.11, "square", 0.12, 0.09],
                [659, 0.11, "triangle", 0.13, 0.18],
                [1047, 0.32, "sine", 0.14, 0.27]
            ],
            layer: [
                [330, 0.12, "triangle", 0.1, 0],
                [440, 0.12, "triangle", 0.1, 0.1],
                [660, 0.2, "triangle", 0.12, 0.2]
            ],
            finish: [
                [330, 0.18, "triangle", 0.11, 0],
                [440, 0.18, "triangle", 0.11, 0.13],
                [550, 0.18, "triangle", 0.11, 0.26],
                [880, 0.45, "sine", 0.13, 0.39]
            ],
            fail: [
                [180, 0.2, "square", 0.1, 0],
                [135, 0.28, "square", 0.1, 0.16]
            ]
        };
        (effects[name] || []).forEach((note) => this.tone(...note));
        if (name === "impact") this.noise(0.58, 0.7, 210);
        if (name === "bump") this.noise(0.14, 0.32, 680);
        if (name === "correct") this.noise(0.16, 0.28, 1450, 0.02);
        if (name === "wrong") this.noise(0.12, 0.12, 1100, 0.08);
    }

    setMotor(active, speedRatio = 0, resistance = 20) {
        if (!this.enabled || !this.context || !this.master) return;
        const now = this.context.currentTime;
        if (!this.motorOscillator) {
            this.motorOscillator = this.context.createOscillator();
            this.motorGain = this.context.createGain();
            this.motorFilter = this.context.createBiquadFilter();
            this.motorOscillator.type = "sawtooth";
            this.motorGain.gain.setValueAtTime(0.0001, now);
            this.motorFilter.type = "lowpass";
            this.motorOscillator.connect(this.motorFilter);
            this.motorFilter.connect(this.motorGain);
            this.motorGain.connect(this.master);
            this.motorOscillator.start(now);
        }
        const motion = Math.max(0, Math.min(1, speedRatio));
        const hardness = Math.max(0, Math.min(1, resistance / 30));
        const frequency = 78 + motion * 145 - hardness * 24;
        const cutoff = 280 + motion * 1050 - hardness * 120;
        const volume = active ? 0.055 + hardness * 0.045 : 0.0001;
        this.motorOscillator.frequency.setTargetAtTime(frequency, now, 0.035);
        this.motorFilter.frequency.setTargetAtTime(Math.max(160, cutoff), now, 0.04);
        this.motorGain.gain.setTargetAtTime(volume, now, active ? 0.03 : 0.08);
    }

    noise(duration, volume, cutoff, delay = 0) {
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
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(cutoff, start);
        gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        source.start(start);
    }

    tone(frequency, duration, type, volume, delay = 0) {
        const now = this.context.currentTime;
        const start = now + delay;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
    }

    stop() {
        if (this.timer) window.clearInterval(this.timer);
        this.timer = null;
        if (this.master && this.context) {
            const oldMaster = this.master;
            const now = this.context.currentTime;
            oldMaster.gain.cancelScheduledValues(now);
            oldMaster.gain.setValueAtTime(Math.max(0.0001, oldMaster.gain.value), now);
            oldMaster.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            window.setTimeout(() => oldMaster.disconnect(), 100);
        }
        if (this.motorOscillator) {
            try {
                this.motorOscillator.stop();
            } catch (error) {
                console.warn("Drill motor could not stop cleanly.", error);
            }
            this.motorOscillator.disconnect();
        }
        this.motorGain?.disconnect();
        this.motorFilter?.disconnect();
        this.motorOscillator = null;
        this.motorGain = null;
        this.motorFilter = null;
        this.master = null;
    }

    async toggle() {
        if (this.enabled && !this.timer) {
            await this.start();
            return this.enabled;
        }
        this.enabled = !this.enabled;
        localStorage.setItem("gc-music-enabled", String(this.enabled));
        if (this.enabled) await this.start();
        else this.stop();
        return this.enabled;
    }

    label() {
        if (!this.enabled) return "MUSIC OFF";
        return this.timer ? "MUSIC ON" : "START MUSIC";
    }
}

export const retroMusic = new RetroMusicManager();
