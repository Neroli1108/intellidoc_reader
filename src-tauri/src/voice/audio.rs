//! Audio Capture and Playback
//!
//! Handles microphone input and speaker output for voice interaction.

use crate::voice::{AudioData, VoiceError};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

// ============================================================================
// Audio Configuration
// ============================================================================

/// Audio configuration
#[derive(Debug, Clone)]
pub struct AudioConfig {
    /// Sample rate in Hz
    pub sample_rate: u32,
    /// Number of channels (1 = mono, 2 = stereo)
    pub channels: u16,
    /// Buffer size in samples
    pub buffer_size: u32,
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            sample_rate: 16000, // 16kHz for speech recognition
            channels: 1,       // Mono for STT
            buffer_size: 1024,
        }
    }
}

// ============================================================================
// Audio Capture
// ============================================================================

/// Audio capture state
pub struct AudioCapture {
    config: AudioConfig,
    is_recording: Arc<AtomicBool>,
    audio_tx: Option<mpsc::Sender<Vec<f32>>>,
}

impl AudioCapture {
    /// Create a new audio capture instance
    pub fn new(config: AudioConfig) -> Self {
        Self {
            config,
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_tx: None,
        }
    }

    /// Start capturing audio from the microphone
    pub fn start_capture(&mut self) -> Result<mpsc::Receiver<Vec<f32>>, VoiceError> {
        if self.is_recording.load(Ordering::SeqCst) {
            return Err(VoiceError::AudioError("Already recording".to_string()));
        }

        let (tx, rx) = mpsc::channel(100);
        self.audio_tx = Some(tx.clone());
        self.is_recording.store(true, Ordering::SeqCst);

        let is_recording = self.is_recording.clone();
        let config = self.config.clone();

        // Spawn audio capture thread
        std::thread::spawn(move || {
            if let Err(e) = capture_audio_loop(config, tx, is_recording) {
                tracing::error!("Audio capture error: {}", e);
            }
        });

        tracing::info!("Started audio capture");
        Ok(rx)
    }

    /// Stop capturing audio
    pub fn stop_capture(&mut self) {
        self.is_recording.store(false, Ordering::SeqCst);
        self.audio_tx = None;
        tracing::info!("Stopped audio capture");
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::SeqCst)
    }
}

/// Audio capture loop using cpal
#[cfg(feature = "audio-capture")]
fn capture_audio_loop(
    config: AudioConfig,
    tx: mpsc::Sender<Vec<f32>>,
    is_recording: Arc<AtomicBool>,
) -> Result<(), VoiceError> {
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| VoiceError::AudioError("No input device found".to_string()))?;

    let supported_config = device
        .default_input_config()
        .map_err(|e| VoiceError::AudioError(e.to_string()))?;

    let stream_config = cpal::StreamConfig {
        channels: config.channels,
        sample_rate: cpal::SampleRate(config.sample_rate),
        buffer_size: cpal::BufferSize::Fixed(config.buffer_size),
    };

    let err_fn = |err| tracing::error!("Audio stream error: {}", err);

    let stream = match supported_config.sample_format() {
        cpal::SampleFormat::F32 => device.build_input_stream(
            &stream_config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if is_recording.load(Ordering::SeqCst) {
                    let _ = tx.blocking_send(data.to_vec());
                }
            },
            err_fn,
            None,
        ),
        cpal::SampleFormat::I16 => device.build_input_stream(
            &stream_config,
            move |data: &[i16], _: &cpal::InputCallbackInfo| {
                if is_recording.load(Ordering::SeqCst) {
                    let samples: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                    let _ = tx.blocking_send(samples);
                }
            },
            err_fn,
            None,
        ),
        cpal::SampleFormat::U16 => device.build_input_stream(
            &stream_config,
            move |data: &[u16], _: &cpal::InputCallbackInfo| {
                if is_recording.load(Ordering::SeqCst) {
                    let samples: Vec<f32> = data
                        .iter()
                        .map(|&s| (s as f32 - 32768.0) / 32768.0)
                        .collect();
                    let _ = tx.blocking_send(samples);
                }
            },
            err_fn,
            None,
        ),
        _ => {
            return Err(VoiceError::AudioError(
                "Unsupported sample format".to_string(),
            ))
        }
    }
    .map_err(|e| VoiceError::AudioError(e.to_string()))?;

    stream
        .play()
        .map_err(|e| VoiceError::AudioError(e.to_string()))?;

    // Keep the stream alive while recording
    while is_recording.load(Ordering::SeqCst) {
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    Ok(())
}

/// Stub audio capture loop when cpal is not available
#[cfg(not(feature = "audio-capture"))]
fn capture_audio_loop(
    _config: AudioConfig,
    _tx: mpsc::Sender<Vec<f32>>,
    is_recording: Arc<AtomicBool>,
) -> Result<(), VoiceError> {
    tracing::warn!("Audio capture not available - cpal feature not enabled");

    // Simulate audio capture with silence
    while is_recording.load(Ordering::SeqCst) {
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    Ok(())
}

// ============================================================================
// Audio Playback
// ============================================================================

/// Play audio data through the speakers
pub async fn play_audio(audio: &AudioData) -> Result<(), VoiceError> {
    #[cfg(feature = "audio-playback")]
    {
        use rodio::{buffer::SamplesBuffer, OutputStream, Sink};

        let (_stream, stream_handle) =
            OutputStream::try_default().map_err(|e| VoiceError::AudioError(e.to_string()))?;

        let sink =
            Sink::try_new(&stream_handle).map_err(|e| VoiceError::AudioError(e.to_string()))?;

        let source = SamplesBuffer::new(
            audio.channels as u16,
            audio.sample_rate,
            audio.samples.clone(),
        );

        sink.append(source);
        sink.sleep_until_end();

        Ok(())
    }

    #[cfg(not(feature = "audio-playback"))]
    {
        tracing::warn!("Audio playback not available - rodio feature not enabled");
        // Simulate playback delay based on audio duration
        let duration_secs = audio.samples.len() as f32 / audio.sample_rate as f32;
        tokio::time::sleep(tokio::time::Duration::from_secs_f32(duration_secs)).await;
        Ok(())
    }
}

/// Play audio with position callbacks for synchronization
pub async fn play_audio_with_sync<F>(
    audio: &AudioData,
    word_timings: &[(u64, u64)], // (start_ms, end_ms) pairs
    mut on_word: F,
) -> Result<(), VoiceError>
where
    F: FnMut(usize) + Send + 'static,
{
    let start_time = std::time::Instant::now();
    let mut current_word = 0;

    // Spawn playback
    let audio_clone = audio.clone();
    let playback_handle = tokio::spawn(async move { play_audio(&audio_clone).await });

    // Track word positions
    while current_word < word_timings.len() {
        let elapsed_ms = start_time.elapsed().as_millis() as u64;
        let (word_start, _word_end) = word_timings[current_word];

        if elapsed_ms >= word_start {
            on_word(current_word);
            current_word += 1;
        } else {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
    }

    // Wait for playback to complete
    playback_handle
        .await
        .map_err(|e| VoiceError::AudioError(e.to_string()))??;

    Ok(())
}

// ============================================================================
// Audio Processing Utilities
// ============================================================================

/// Voice Activity Detection (VAD) result
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum VadResult {
    /// Speech detected
    Speech,
    /// Silence/noise
    Silence,
}

/// Simple energy-based voice activity detection
pub fn detect_voice_activity(samples: &[f32], threshold: f32) -> VadResult {
    if samples.is_empty() {
        return VadResult::Silence;
    }

    // Calculate RMS energy
    let sum_squares: f32 = samples.iter().map(|s| s * s).sum();
    let rms = (sum_squares / samples.len() as f32).sqrt();

    if rms > threshold {
        VadResult::Speech
    } else {
        VadResult::Silence
    }
}

/// Resample audio to target sample rate
pub fn resample(samples: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate {
        return samples.to_vec();
    }

    let ratio = to_rate as f32 / from_rate as f32;
    let new_len = (samples.len() as f32 * ratio) as usize;
    let mut result = Vec::with_capacity(new_len);

    for i in 0..new_len {
        let src_idx = i as f32 / ratio;
        let idx_floor = src_idx.floor() as usize;
        let idx_ceil = (idx_floor + 1).min(samples.len() - 1);
        let frac = src_idx - idx_floor as f32;

        // Linear interpolation
        let sample = samples[idx_floor] * (1.0 - frac) + samples[idx_ceil] * frac;
        result.push(sample);
    }

    result
}

/// Convert stereo to mono
pub fn stereo_to_mono(samples: &[f32]) -> Vec<f32> {
    samples
        .chunks(2)
        .map(|chunk| {
            if chunk.len() == 2 {
                (chunk[0] + chunk[1]) / 2.0
            } else {
                chunk[0]
            }
        })
        .collect()
}

/// Normalize audio samples to [-1, 1] range
pub fn normalize(samples: &mut [f32]) {
    let max_abs = samples
        .iter()
        .map(|s| s.abs())
        .fold(0.0f32, |a, b| a.max(b));

    if max_abs > 0.0 && max_abs != 1.0 {
        let scale = 1.0 / max_abs;
        for sample in samples.iter_mut() {
            *sample *= scale;
        }
    }
}

/// Apply simple noise gate
pub fn noise_gate(samples: &mut [f32], threshold: f32) {
    for sample in samples.iter_mut() {
        if sample.abs() < threshold {
            *sample = 0.0;
        }
    }
}

/// Convert f32 samples to i16 PCM
pub fn f32_to_i16(samples: &[f32]) -> Vec<i16> {
    samples
        .iter()
        .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0) as i16)
        .collect()
}

/// Convert i16 PCM to f32 samples
pub fn i16_to_f32(samples: &[i16]) -> Vec<f32> {
    samples.iter().map(|&s| s as f32 / 32768.0).collect()
}

// ============================================================================
// Audio Buffer
// ============================================================================

/// Ring buffer for audio samples
pub struct AudioBuffer {
    buffer: Vec<f32>,
    write_pos: usize,
    capacity: usize,
}

impl AudioBuffer {
    /// Create a new audio buffer
    pub fn new(capacity: usize) -> Self {
        Self {
            buffer: vec![0.0; capacity],
            write_pos: 0,
            capacity,
        }
    }

    /// Write samples to the buffer
    pub fn write(&mut self, samples: &[f32]) {
        for &sample in samples {
            self.buffer[self.write_pos] = sample;
            self.write_pos = (self.write_pos + 1) % self.capacity;
        }
    }

    /// Read all samples from the buffer (in order)
    pub fn read_all(&self) -> Vec<f32> {
        let mut result = Vec::with_capacity(self.capacity);
        for i in 0..self.capacity {
            let idx = (self.write_pos + i) % self.capacity;
            result.push(self.buffer[idx]);
        }
        result
    }

    /// Clear the buffer
    pub fn clear(&mut self) {
        self.buffer.fill(0.0);
        self.write_pos = 0;
    }

    /// Get buffer capacity
    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vad() {
        let silence = vec![0.0f32; 100];
        assert_eq!(detect_voice_activity(&silence, 0.01), VadResult::Silence);

        let speech = vec![0.5f32; 100];
        assert_eq!(detect_voice_activity(&speech, 0.01), VadResult::Speech);
    }

    #[test]
    fn test_resample() {
        let samples = vec![0.0, 1.0, 0.0, -1.0];
        let resampled = resample(&samples, 100, 200);
        assert_eq!(resampled.len(), 8);
    }

    #[test]
    fn test_stereo_to_mono() {
        let stereo = vec![0.5, 0.5, 1.0, 0.0, -0.5, -0.5];
        let mono = stereo_to_mono(&stereo);
        assert_eq!(mono.len(), 3);
        assert!((mono[0] - 0.5).abs() < 0.001);
        assert!((mono[1] - 0.5).abs() < 0.001);
        assert!((mono[2] - -0.5).abs() < 0.001);
    }

    #[test]
    fn test_audio_buffer() {
        let mut buffer = AudioBuffer::new(4);
        buffer.write(&[1.0, 2.0]);
        buffer.write(&[3.0, 4.0]);

        let samples = buffer.read_all();
        assert_eq!(samples, vec![1.0, 2.0, 3.0, 4.0]);
    }
}
