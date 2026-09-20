/**
 * Browser Speech Recognition Engine
 * Interfaces with Web Speech API (webkitSpeechRecognition / SpeechRecognition)
 * Provides audio activity detection for waveform animations, multi-subscriber callbacks,
 * and automatic lifecycle resilience.
 */

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void; // 0.0 - 1.0
}

export class SpeechRecognitionEngine {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private listeners: Set<SpeechRecognitionCallbacks> = new Set();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private shouldRestart: boolean = false;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.isSupported = true;
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.notifyAll((cb) => cb.onStart?.());
          this.startAudioAnalysis();
        };

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            const transcript = item[0]?.transcript || '';
            if (item.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (interimTranscript) {
            this.notifyAll((cb) => cb.onInterim?.(interimTranscript));
          }

          if (finalTranscript && finalTranscript.trim().length > 0) {
            const cleanFinal = finalTranscript.trim();
            this.notifyAll((cb) => cb.onFinal?.(cleanFinal));
          }
        };

        this.recognition.onerror = (event: any) => {
          let msg = 'Speech recognition error.';
          if (event.error === 'not-allowed') {
            msg =
              'Microphone permission denied. Click the lock/settings icon in your browser URL bar to allow microphone access.';
            this.shouldRestart = false;
          } else if (event.error === 'no-speech') {
            msg = 'Listening for speech...';
            // Do not treat silence as fatal error
            return;
          } else if (event.error === 'audio-capture') {
            msg = 'No microphone device found.';
            this.shouldRestart = false;
          } else if (event.error === 'network') {
            msg = 'Speech recognition network connection interrupted.';
          }

          this.notifyAll((cb) => cb.onError?.(msg));
        };

        this.recognition.onend = () => {
          if (this.shouldRestart && this.isListening) {
            try {
              this.recognition.start();
              return;
            } catch (e) {
              // ignore
            }
          }
          this.isListening = false;
          this.stopAudioAnalysis();
          this.notifyAll((cb) => cb.onEnd?.());
        };
      } catch (err) {
        this.isSupported = false;
        console.warn('SpeechRecognition initialization failed:', err);
      }
    } else {
      this.isSupported = false;
      console.warn(
        'Web Speech API (webkitSpeechRecognition) is not supported in this browser. Use text prompt fallback.'
      );
    }
  }

  /**
   * Subscribe to speech events (supports multiple subscribers without overwriting)
   */
  public addCallbacks(callbacks: SpeechRecognitionCallbacks): () => void {
    this.listeners.add(callbacks);
    return () => {
      this.listeners.delete(callbacks);
    };
  }

  /**
   * Legacy helper (merges callbacks)
   */
  public setCallbacks(callbacks: SpeechRecognitionCallbacks): void {
    this.listeners.add(callbacks);
  }

  public isVoiceSupported(): boolean {
    return this.isSupported;
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public addListener(listener: SpeechRecognitionCallbacks): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyAll(fn: (l: SpeechRecognitionCallbacks) => void): void {
    this.listeners.forEach((l) => {
      try {
        fn(l);
      } catch (err) {
        console.warn('Error in SpeechRecognition listener:', err);
      }
    });
  }

  public async start(): Promise<boolean> {
    if (!this.isSupported || !this.recognition) {
      this.notifyAll((cb) =>
        cb.onError?.('Speech recognition is not supported in this browser environment.')
      );
      return false;
    }

    if (this.isListening) return true;

    try {
      this.shouldRestart = true;
      this.recognition.start();
      this.isListening = true;
      this.startAudioAnalysis();
      this.notifyAll((cb) => cb.onStart?.());
      return true;
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      this.isListening = false;
      this.notifyAll((cb) => cb.onError?.(err?.message || 'Failed to start microphone input.'));
      return false;
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_err) {
        // ignore
      }
    }
    this.stopAudioAnalysis();
    this.notifyAll((cb) => cb.onEnd?.());
  }

  public toggle(): Promise<boolean> {
    if (this.isListening) {
      this.stop();
      return Promise.resolve(false);
    } else {
      return this.start();
    }
  }

  /**
   * Initialize audio analyser for dynamic HUD waveform visualization
   */
  private async startAudioAnalysis(): Promise<void> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioContext = new AudioCtxClass();
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const sampleLoop = () => {
        if (!this.isListening || !this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / (bufferLength * 255.0);
        this.notifyAll((cb) => cb.onAudioLevel?.(Math.min(1.0, avg * 2.2)));

        this.animFrameId = requestAnimationFrame(sampleLoop);
      };

      sampleLoop();
    } catch (_err) {
      // Microphone stream optional for waveform
    }
  }

  private stopAudioAnalysis(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((t) => t.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_e) {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.notifyAll((cb) => cb.onAudioLevel?.(0));
  }
}
