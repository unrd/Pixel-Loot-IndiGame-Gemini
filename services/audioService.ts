
// Dark Fantasy Atmospheric Audio Engine

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;

let currentTrackId: string | null = null;
let musicTimeout: any = null;
let isMuted: boolean = false;

// --- Initialization & Reverb ---

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.4; // Master volume
    masterGain.connect(audioCtx.destination);

    // Create Dark Reverb Impulse
    reverbNode = audioCtx.createConvolver();
    reverbNode.buffer = createImpulseResponse(audioCtx, 3.0, 2.0); // 3 seconds tail
    reverbNode.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return { ctx: audioCtx, master: masterGain, reverb: reverbNode };
};

// Generate a synthetic reverb impulse (Dark/Cave sound)
const createImpulseResponse = (ctx: AudioContext, duration: number, decay: number) => {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const impulse = ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i / length;
        // Exponential decay noise
        const noise = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        left[i] = noise;
        right[i] = noise;
    }
    return impulse;
};

// --- Instruments ---

// String/Pad Swell (Detuned Sawtooths + LowPass)
const playPadChord = (ctx: AudioContext, dest: AudioNode, notes: number[], duration: number, time: number) => {
    notes.forEach(freq => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        // Slight detune for chorus effect
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.005; // Detuned

        // Lowpass to make it dark/soft
        filter.type = 'lowpass';
        filter.frequency.value = 600; 
        filter.Q.value = 1;

        // Envelope: Slow attack, long release
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + duration * 0.3); // Attack
        gain.gain.setValueAtTime(0.15, time + duration * 0.7); // Sustain
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // Release

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(dest); // Connect to Reverb

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + duration);
        osc2.stop(time + duration);
    });
};

// Bell/Chime (Sine + FM)
const playBell = (ctx: AudioContext, dest: AudioNode, freq: number, time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Bright sine
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // Sharp attack, long bell-like decay
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 4.0);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 4.0);
};

// Deep Drone (Bass)
const playDrone = (ctx: AudioContext, dest: AudioNode, freq: number, duration: number, time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 2.0);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + duration);
}

// --- Compositions (Dark Fantasy) ---

interface TrackStep {
    chord?: number[]; // Frequencies
    bell?: number; // Frequency
    bass?: number;
    dur: number;
}

const SCALE = {
    C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94, Bb3: 233.08,
    C4: 261.63, E4: 329.63, G4: 392.00, A4: 440.00,
    C5: 523.25, E5: 659.25,
    Db3: 138.59, Eb3: 155.56, Gb3: 185.00
};

// Forest: Mysterious, Minor chords
const THEME_FOREST: TrackStep[] = [
    { chord: [SCALE.A3, SCALE.C4, SCALE.E4], bass: SCALE.A2, dur: 4.0 },
    { chord: [SCALE.F3, SCALE.A3, SCALE.C4], bass: SCALE.F2, dur: 4.0 },
    { chord: [SCALE.G3, SCALE.B3, SCALE.D3], bass: SCALE.G2, dur: 4.0 },
    { chord: [SCALE.E3, SCALE.G3, SCALE.B3], bass: SCALE.E2, bell: SCALE.E5, dur: 4.0 },
];

// Cave: Deep, Sparse, Drones
const THEME_CAVE: TrackStep[] = [
    { bass: SCALE.C2, dur: 6.0 },
    { chord: [SCALE.C3, SCALE.G3], bell: SCALE.C5, dur: 3.0 },
    { bass: SCALE.G2, dur: 6.0 },
    { chord: [SCALE.G3, SCALE.D3], dur: 3.0 },
];

// Castle: Majestic, Sad
const THEME_CASTLE: TrackStep[] = [
    { chord: [SCALE.D3, SCALE.F3, SCALE.A3], bass: SCALE.D3, dur: 3.0 },
    { chord: [SCALE.Bb3, SCALE.D3, SCALE.F3], bass: SCALE.Bb3, dur: 3.0 }, // Bb manually
    { chord: [SCALE.A3, SCALE.C4, SCALE.E4], bell: SCALE.A4, dur: 3.0 },
    { chord: [SCALE.D3, SCALE.A3, SCALE.D3], dur: 3.0 },
];

// Void: Dissonant, High tension
const THEME_VOID: TrackStep[] = [
    { chord: [SCALE.C3, SCALE.F3, SCALE.B3], bass: SCALE.C2, dur: 5.0 }, // Tritone
    { chord: [SCALE.C3, SCALE.E3, SCALE.Bb3], bell: SCALE.C5, dur: 5.0 },
];

// Boss: Fast, Aggressive, Low Drones
const THEME_BOSS: TrackStep[] = [
  { chord: [SCALE.C3, SCALE.Eb3, SCALE.Gb3], bass: SCALE.C2, dur: 2.0 }, // Diminished
  { chord: [SCALE.C3, SCALE.E3, SCALE.G3], bass: SCALE.G2, dur: 2.0 },
  { chord: [SCALE.Db3, SCALE.F3, SCALE.A3], bass: SCALE.Db3, dur: 2.0 },
  { chord: [SCALE.C3, SCALE.Eb3, SCALE.Gb3], bass: SCALE.C2, bell: SCALE.C5, dur: 2.0 },
];

const TRACKS: Record<string, TrackStep[]> = {
    'forest': THEME_FOREST,
    'cave': THEME_CAVE,
    'castle': THEME_CASTLE,
    'volcano': THEME_CASTLE, // Re-use for now
    'void': THEME_VOID,
    'boss': THEME_BOSS
};

// --- Sequencer ---

export const stopBackgroundMusic = () => {
  if (musicTimeout) clearTimeout(musicTimeout);
  currentTrackId = null;
};

export const playBackgroundMusic = (zoneId: string) => {
    if (isMuted || currentTrackId === zoneId) return;
    
    // Initial Setup check
    const { ctx, reverb } = getCtx();
    if (!ctx || !reverb) return;

    stopBackgroundMusic();
    currentTrackId = zoneId;

    const track = TRACKS[zoneId] || THEME_FOREST;
    let stepIndex = 0;

    const playNextStep = () => {
        if (currentTrackId !== zoneId) return;
        if (isMuted) {
             musicTimeout = setTimeout(playNextStep, 1000);
             return;
        }

        const now = ctx.currentTime;
        const step = track[stepIndex];
        
        // Play Elements
        if (step.chord) playPadChord(ctx, reverb, step.chord, step.dur, now);
        if (step.bass) playDrone(ctx, reverb, step.bass, step.dur, now);
        if (step.bell) playBell(ctx, reverb, step.bell, now);

        stepIndex = (stepIndex + 1) % track.length;
        musicTimeout = setTimeout(playNextStep, (step.dur * 1000) - 100); // Slight overlap
    };

    playNextStep();
};

export const playZoneUnlockTheme = () => {
    if (isMuted) return Promise.resolve();
    const { ctx, master } = getCtx();
    if (!ctx || !master) return Promise.resolve();
    
    stopBackgroundMusic();

    return new Promise<void>((resolve) => {
        const now = ctx.currentTime;
        playBell(ctx, master, SCALE.C4, now);
        playBell(ctx, master, SCALE.E4, now + 0.2);
        playBell(ctx, master, SCALE.G4, now + 0.4);
        playBell(ctx, master, SCALE.C5, now + 0.6);
        
        // Resume BGM after fanfare
        setTimeout(() => {
            currentTrackId = null; 
            resolve();
        }, 3000);
    });
};

export const toggleMute = (mute: boolean) => {
    isMuted = mute;
    if (audioCtx) {
        if (mute) audioCtx.suspend();
        else {
             audioCtx.resume();
             currentTrackId = null; // force restart logic if needed
        }
    }
};

// --- SFX (8-Bit Retro) ---

// Square Wave Click
export const playClickSound = () => {
    if (isMuted) return;
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
};

export const playGoldSound = () => {
    if (isMuted) return;
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;
    playBell(ctx, master, 1200 + Math.random() * 200, ctx.currentTime);
};

// Noise/Sawtooth Crash for Death
export const playDeathSound = () => {
    if (isMuted) return;
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    // Frequency drop for "crumbling" effect
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
};

export const playUpgradeSound = () => {
    if (isMuted) return;
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;
    // Retro powerup: two square beeps
    const t = ctx.currentTime;
    [440, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.1, t + i*0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + i*0.1 + 0.1);
        osc.connect(g);
        g.connect(master);
        osc.start(t + i*0.1);
        osc.stop(t + i*0.1 + 0.1);
    });
};

export const playGachaPullSound = () => {
    if (isMuted) return;
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;
    
    // Rising tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 1.0);
};

export const playGachaRevealSound = (isLegendary: boolean) => {
    if (isMuted) return;
    const { ctx, master } = getCtx();
    if (!ctx || !master) return;

    if (isLegendary) {
        playBell(ctx, master, SCALE.C4, ctx.currentTime);
        playBell(ctx, master, SCALE.E4, ctx.currentTime + 0.15);
        playBell(ctx, master, SCALE.G4, ctx.currentTime + 0.3);
        playBell(ctx, master, SCALE.C5, ctx.currentTime + 0.45);
    } else {
        playBell(ctx, master, SCALE.C5, ctx.currentTime);
    }
};
