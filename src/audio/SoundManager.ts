class SoundManager {
  private ctx: AudioContext | null = null;
  private _enabled = true;

  set enabled(val: boolean) {
    this._enabled = val;
  }

  private getContext(): AudioContext | null {
    if (!this._enabled) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  playApplause(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const duration = 2.5;
    const numClaps = 40;

    for (let i = 0; i < numClaps; i++) {
      const t = ctx.currentTime + (i / numClaps) * duration * 0.9;
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2000 + Math.random() * 3000, t);
      bandpass.Q.setValueAtTime(0.5 + Math.random() * 0.5, t);

      const gain = ctx.createGain();
      const envelope = Math.max(0.08, 0.2 - (i / numClaps) * 0.15);
      gain.gain.setValueAtTime(envelope, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      source.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);
      source.start(t);
      source.stop(t + 0.06);
    }

    for (let i = 0; i < 6; i++) {
      const t = ctx.currentTime + duration * 0.92 + i * 0.1;
      const bufferSize = ctx.sampleRate * 0.03;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2000 + Math.random() * 3000, t);
      bandpass.Q.setValueAtTime(0.8, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      source.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(ctx.destination);
      source.start(t);
      source.stop(t + 0.04);
    }
  }
}

export const soundManager = new SoundManager();
