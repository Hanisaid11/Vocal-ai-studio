/**
 * High-Accuracy Pitch Detection Engine
 * Implements the YIN Algorithm, Normalized Difference Function,
 * Parabolic Peak Interpolation, and Spectral Energy Analysis.
 */

export interface PitchAnalysis {
  frequency: number | null;
  clarity: number; // 0 (noise) to 1 (pure harmonic periodicity)
  rms: number;     // Volume level 0 to 1
  spectralCentroid: number; // Brightness / formant indicator
}

export class PitchDetector {
  private bufferSize: number;
  private sampleRate: number;
  private yinThreshold: number;
  private yinBuffer: Float32Array;
  private recentPitches: number[] = [];
  private readonly filterWindowSize = 5;

  constructor(sampleRate: number = 44100, bufferSize: number = 2048, threshold: number = 0.15) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.yinThreshold = threshold;
    this.yinBuffer = new Float32Array(Math.floor(bufferSize / 2));
  }

  public setSampleRate(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  /**
   * Calculate Root Mean Square (Loudness/Energy)
   */
  public calculateRMS(buffer: Float32Array<ArrayBufferLike>): number {
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    return Math.sqrt(sumSquares / buffer.length);
  }

  /**
   * Calculate Spectral Centroid (Timbre brightness indicator)
   */
  public calculateSpectralCentroid(frequencyData: Uint8Array<ArrayBufferLike>): number {
    let numerator = 0;
    let denominator = 0;
    const nyquist = this.sampleRate / 2;
    const binSize = nyquist / frequencyData.length;

    for (let i = 0; i < frequencyData.length; i++) {
      const mag = frequencyData[i];
      const freq = i * binSize;
      numerator += freq * mag;
      denominator += mag;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * YIN Algorithm Implementation
   * Accurate for human singing voice across 40 Hz to 2000 Hz.
   */
  public detectPitch(
    timeData: Float32Array<ArrayBufferLike>,
    frequencyData?: Uint8Array<ArrayBufferLike>
  ): PitchAnalysis {
    const rms = this.calculateRMS(timeData);

    // Silence gate: minimum energy threshold to reject background room noise
    if (rms < 0.012) {
      return {
        frequency: null,
        clarity: 0,
        rms,
        spectralCentroid: 0,
      };
    }

    const halfBuffer = Math.floor(this.bufferSize / 2);
    const yinBuffer = this.yinBuffer;

    // Step 1: Difference Function
    for (let tau = 0; tau < halfBuffer; tau++) {
      let sum = 0;
      for (let i = 0; i < halfBuffer; i++) {
        const delta = timeData[i] - timeData[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference Function (CMNDF)
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfBuffer; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] = runningSum > 0 ? (yinBuffer[tau] * tau) / runningSum : 1;
    }

    // Step 3: Absolute Thresholding
    // Human vocal range limits:
    // C1 is ~32.7 Hz -> maxTau = sampleRate / 32
    // C7 is ~2093 Hz -> minTau = sampleRate / 2200
    const minTau = Math.max(2, Math.floor(this.sampleRate / 2200));
    const maxTau = Math.min(halfBuffer - 2, Math.floor(this.sampleRate / 32));

    let tauEstimate = -1;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (yinBuffer[tau] < this.yinThreshold) {
        while (tau + 1 < maxTau && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Fallback: search for global minimum if threshold wasn't met but signal has strong periodicity
    let minVal = 1;
    if (tauEstimate === -1) {
      for (let tau = minTau; tau < maxTau; tau++) {
        if (yinBuffer[tau] < minVal) {
          minVal = yinBuffer[tau];
          tauEstimate = tau;
        }
      }
      // If even best minimum is too noisy (> 0.45 CMNDF value), reject as unvoiced/noise
      if (minVal > 0.45) {
        return {
          frequency: null,
          clarity: Math.max(0, 1 - minVal),
          rms,
          spectralCentroid: frequencyData ? this.calculateSpectralCentroid(frequencyData) : 0,
        };
      }
    } else {
      minVal = yinBuffer[tauEstimate];
    }

    // Step 4: Parabolic Peak Interpolation for sub-sample precision
    let betterTau = tauEstimate;
    if (tauEstimate > 0 && tauEstimate < halfBuffer - 1) {
      const s0 = yinBuffer[tauEstimate - 1];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[tauEstimate + 1];
      const bottom = 2 * (2 * s1 - s2 - s0);
      if (bottom !== 0) {
        betterTau = tauEstimate + (s2 - s0) / bottom;
      }
    }

    const rawFrequency = this.sampleRate / betterTau;
    const clarity = Math.max(0, Math.min(1, 1 - minVal));

    // Frequency sanity bounds for human singing voice (30 Hz to 2400 Hz)
    if (rawFrequency < 30 || rawFrequency > 2400) {
      return {
        frequency: null,
        clarity,
        rms,
        spectralCentroid: frequencyData ? this.calculateSpectralCentroid(frequencyData) : 0,
      };
    }

    // Step 5: Median pitch smoothing buffer to prevent sporadic single-frame glitch spikes
    this.recentPitches.push(rawFrequency);
    if (this.recentPitches.length > this.filterWindowSize) {
      this.recentPitches.shift();
    }

    // Calculate median
    const sorted = [...this.recentPitches].sort((a, b) => a - b);
    const medianFrequency = sorted[Math.floor(sorted.length / 2)];

    const spectralCentroid = frequencyData ? this.calculateSpectralCentroid(frequencyData) : 0;

    return {
      frequency: Math.round(medianFrequency * 10) / 10,
      clarity,
      rms,
      spectralCentroid,
    };
  }

  public reset() {
    this.recentPitches = [];
  }
}
