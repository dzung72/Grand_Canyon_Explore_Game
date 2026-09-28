class RetroMusicManager {
    constructor() {
        this.context = null;
        this.master = null;
        this.musicBus = null;
        this.sfxBus = null;
        this.timer = null;
        this.step = 0;
        this.motorOscillator = null;
        this.motorGain = null;
        this.motorFilter = null;
        this.ambienceSource = null;
        this.ambienceGain = null;
        this.ambienceFilter = null;
        this.ambienceActive = false;
        this.ambienceDepth = -1;
        this.musicEnabled = localStorage.getItem("gc-music-enabled") !== "false";
        this.sfxEnabled = localStorage.getItem("gc-sfx-enabled") !== "false";
    }

    async unlock() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            this.context = this.context || new AudioContext();
            if (this.context.state === "suspended") await this.context.resume();
            if (!this.master) {
                this.master = this.context.createGain();
                this.musicBus = this.context.createGain();
                this.sfxBus = this.context.createGain();
                this.master.gain.setValueAtTime(0.16, this.context.currentTime);
                this.musicBus.gain.setValueAtTime(this.musicEnabled ? 0.72 : 0.0001, this.context.currentTime);
                this.sfxBus.gain.setValueAtTime(this.sfxEnabled ? 1.15 : 0.0001, this.context.currentTime);
                this.musicBus.connect(this.master);
                this.sfxBus.connect(this.master);
                this.master.connect(this.context.destination);
            }
            return this.context.state === "running";
        } catch (error) {
            console.warn("Audio could not be unlocked:", error);
            return false;
        }
    }

    async start() {
        const ready = await this.unlock();
        if (!ready || !this.musicEnabled || this.timer) return;
        try {
            this.musicBus.gain.setTargetAtTime(0.72, this.context.currentTime, 0.04);
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
        this.tone(frequency, 0.24, "triangle", 0.16, 0, "music");

        if (this.step % 4 === 0) {
            const bassFrequency = 110 * (2 ** (bass[Math.floor(this.step / 4) % bass.length] / 12));
            this.tone(bassFrequency, 0.62, "sine", 0.22, 0, "music");
        }
        if (this.step % 8 === 6) this.tone(frequency * 2, 0.12, "square", 0.045, 0, "music");
        this.step += 1;
    }

    effect(name) {
        if (!this.sfxEnabled) return;
        if (!this.context || !this.master || this.context.state !== "running") {
            this.unlock().then((ready) => {
                if (ready && this.sfxEnabled) this.playEffect(name);
            });
            return;
        }
        this.playEffect(name);
    }

    playEffect(name) {
        const effects = {
            launch: [
                [180, 0.12, "square", 0.12, 0],
                [270, 0.16, "triangle", 0.1, 0.08]
            ],
            impact: [
                [118, 0.16, "sawtooth", 0.58, 0],
                [48, 0.86, "sine", 1.05, 0.012]
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
            ],
            fuel: [
                [330, 0.09, "square", 0.11, 0],
                [494, 0.12, "triangle", 0.12, 0.08],
                [659, 0.22, "sine", 0.13, 0.17]
            ],
            hazard: [
                [174, 0.14, "sawtooth", 0.18, 0],
                [116, 0.24, "square", 0.13, 0.1]
            ],
            nearMiss: [
                [720, 0.08, "sine", 0.09, 0],
                [960, 0.12, "triangle", 0.08, 0.055]
            ],
            boost: [
                [120, 0.09, "sawtooth", 0.13, 0],
                [240, 0.16, "triangle", 0.12, 0.055]
            ]
        };
        (effects[name] || []).forEach((note) => this.tone(...note, "sfx"));
        if (name === "impact") {
            this.duckMusic(0.9);
            this.boom();
            this.noise(0.72, 0.92, 260);
            this.noise(0.2, 0.88, 1250, 0, "bandpass", 0.9);
            this.noise(0.08, 0.72, 2800, 0.01, "highpass", 0.6);
            this.noise(0.09, 0.34, 2100, 0.16, "bandpass", 1.5);
            this.noise(0.07, 0.28, 2600, 0.28, "bandpass", 1.7);
            this.noise(0.06, 0.2, 1900, 0.39, "bandpass", 1.2);
        }
        if (name === "bump") this.noise(0.14, 0.32, 680);
        if (name === "correct") this.noise(0.16, 0.28, 1450, 0.02);
        if (name === "wrong") this.noise(0.12, 0.12, 1100, 0.08);
        if (name === "nearMiss") this.noise(0.18, 0.18, 2100, 0, "highpass", 0.9);
        if (name === "boost") this.noise(0.16, 0.16, 950, 0, "bandpass", 0.8);
    }

    duckMusic(duration = 0.7) {
        if (!this.musicEnabled || !this.context || !this.musicBus) return;
        const now = this.context.currentTime;
        this.musicBus.gain.cancelScheduledValues(now);
        this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), now);
        this.musicBus.gain.setTargetAtTime(0.12, now, 0.018);
        this.musicBus.gain.setTargetAtTime(0.72, now + duration, 0.08);
    }

    setMotor(active, speedRatio = 0, resistance = 20) {
        if (!this.sfxEnabled || !this.context || !this.sfxBus) return;
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
            this.motorGain.connect(this.sfxBus);
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
        this.ambienceGain.gain.setTargetAtTime(active ? 0.055 + depth * 0.018 : 0.0001, now, active ? 0.25 : 0.08);
    }

    boom() {
        if (!this.context || !this.sfxBus) return;
        const start = this.context.currentTime;
        [
            { type: "sine", from: 150, to: 34, volume: 1.15, duration: 0.82 },
            { type: "triangle", from: 96, to: 42, volume: 0.72, duration: 0.58 }
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

    tone(frequency, duration, type, volume, delay = 0, bus = "sfx") {
        if (!this.context || !this.master) return;
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
        gain.connect(bus === "music" ? this.musicBus : this.sfxBus);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
    }

    stopMusic() {
        if (this.timer) window.clearInterval(this.timer);
        this.timer = null;
        if (this.musicBus && this.context) {
            this.musicBus.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.035);
        }
    }

    stopMotor() {
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
                this.sfxEnabled ? 1.15 : 0.0001,
                this.context.currentTime,
                0.025
            );
        }
        if (!this.sfxEnabled) {
            this.stopMotor();
            this.stopAmbience();
        }
        else this.effect("collect");
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
