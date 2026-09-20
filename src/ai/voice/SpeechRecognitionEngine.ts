/**
 * Browser Speech Recognition Engine
 * Interfaces with Web Speech API (webkitSpeechRecognition / SpeechRecognition)
 * Provides audio activity detection for waveform animations and continuous recognition.
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
  private callbacks: SpeechRecognitionCallbacks = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.isSupported = true;
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onStart?.();
        this.startAudioAnalysis();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript && !finalTranscript) {
          this.callbacks.onInterim?.(interimTranscript);
        }

        if (finalTranscript) {
          this.callbacks.onFinal?.(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        let msg = 'Speech recognition error occurred.';
        if (event.error === 'not-allowed') {
          msg = 'Microphone permission denied. Please allow microphone access.';
        } else if (event.error === 'no-speech') {
          msg = 'No speech detected. Listening timed out.';
        } else if (event.error === 'network') {
          msg = 'Speech recognition network error.';
        }
        this.callbacks.onError?.(msg);
        this.stop();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.stopAudioAnalysis();
        this.callbacks.onEnd?.();
      };
    } else {
      this.isSupported = false;
      console.warn('Web Speech API is not supported in this browser. Falling back to text prompt.');
    }
  }

  public setCallbacks(callbacks: SpeechRecognitionCallbacks): void {
    this.callbacks = callbacks;
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public async start(): Promise<boolean> {
    if (!this.isSupported || !this.recognition) {
      this.callbacks.onError?.('Web Speech API is not available in your browser. Use the text input below.');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('SpeechRecognition start error:', err);
      // If already started, ignore
      return true;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
    }
    this.isListening = false;
    this.stopAudioAnalysis();
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

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
        this.callbacks.onAudioLevel?.(Math.min(1.0, avg * 2.2));

        this.animFrameId = requestAnimationFrame(sampleLoop);
      };

      sampleLoop();
    } catch (err) {
      // Audio level analysis is optional visual enhancement
      console.debug('Microphone audio level stream unavailable:', err);
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
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.callbacks.onAudioLevel?.(0);
  }
}
