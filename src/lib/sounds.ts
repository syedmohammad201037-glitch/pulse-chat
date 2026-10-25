/**
 * Web Audio API Sound Synthesizer
 * Generates custom, high-fidelity pleasant harmonic chimes for alerts,
 * incoming calls, and message notifications entirely in-code.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private ringIntervalId: any = null;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    // resume if suspended (browser behavior)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play a pleasant message alert chime (sweet modern dual-tone "Chime")
   */
  public playMessageAlert() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      
      // Tone 1: Fundamental sweet chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6 slide

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.82);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      // Tone 2: Warm undertone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now); // A4
      
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.1, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      // Start & Stop
      osc1.start(now);
      osc1.stop(now + 0.85);
      osc2.start(now);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn('Synthesizer message alert failed:', e);
    }
  }

  /**
   * Play a short, crisp UI interaction sound (subtle click / pop)
   */
  public playSentBeep() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.warn('Sent beep failed:', e);
    }
  }

  /**
   * Start looping a beautiful electronic phone ringing chime for active call signals
   */
  public startRingingLoop(isOutgoing: boolean = false) {
    if (this.ringIntervalId) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const playRingtoneInstance = () => {
        if (!this.ctx) return;
        this.initContext();
        
        const now = this.ctx.currentTime;
        const duration = isOutgoing ? 1.6 : 1.2;

        const frequencies = isOutgoing 
          ? [440, 554, 659] // Crisp rising major triad for outgoing ringback
          : [659, 784, 987]; // Sweet high melody for incoming WhatsApp style

        frequencies.forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          
          osc.type = 'sine';
          // staggered start offsets
          const startOffset = idx * 0.12;
          
          osc.frequency.setValueAtTime(freq, now + startOffset);
          // subtle vibrato setup
          osc.frequency.linearRampToValueAtTime(freq + (idx % 2 === 0 ? 8 : -8), now + startOffset + duration);

          gainNode.gain.setValueAtTime(0, now + startOffset);
          gainNode.gain.linearRampToValueAtTime(0.12, now + startOffset + 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration - startOffset);

          osc.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc.start(now + startOffset);
          osc.stop(now + duration);
        });
      };

      // Trigger immediately and then loop
      playRingtoneInstance();
      this.ringIntervalId = setInterval(playRingtoneInstance, isOutgoing ? 3000 : 2200);
    } catch (e) {
      console.warn('Synthesizer ringer failed:', e);
    }
  }

  /**
   * Stop any actively playing ringtone loops
   */
  public stopRingingLoop() {
    if (this.ringIntervalId) {
      clearInterval(this.ringIntervalId);
      this.ringIntervalId = null;
    }
  }
}

export const soundSynthesizer = new AudioSynthesizer();

export const playNotificationSound = (enableSounds?: any) => {
  if (enableSounds === false) return;
  soundSynthesizer.playMessageAlert();
};
