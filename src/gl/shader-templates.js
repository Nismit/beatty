/**
 * Default shader templates
 * Contains default GLSL code for sound and visual shaders
 */

// =============================================================================
// DEFAULT: Simple sound shader for beginners
// =============================================================================
export const DEFAULT_SOUND_SHADER = `// Utility functions
float timeToBeat(float time) {
  return time / 60.0 * u_bpm;
}

float beatToTime(float beat) {
  return beat / u_bpm * 60.0;
}

float sine(float phase) {
  return sin(phase * 6.28318530718);
}

// Simple kick drum
float kick(float time) {
  float amp = exp(-5.0 * time);
  float phase = 50.0 * time - 10.0 * exp(-70.0 * time);
  return amp * sine(phase);
}

// Simple hihat (noise-based)
float hihat(float time) {
  float amp = exp(-50.0 * time);
  float noise = fract(sin(time * 1000.0) * 43758.5453);
  return amp * (noise * 2.0 - 1.0);
}

// Simple bass
float bass(float time, float freq) {
  float amp = exp(-3.0 * time);
  return amp * sine(freq * time);
}

vec2 mainSound(float time) {
  vec2 out2 = vec2(0.0);

  float beat = timeToBeat(time);

  // Kick: every beat
  float kickTime = beatToTime(mod(beat, 1.0));
  out2 += vec2(kick(kickTime)) * 0.7;

  // Hihat: offbeat (8th notes)
  float hihatTime = beatToTime(mod(beat + 0.5, 1.0));
  out2 += vec2(hihat(hihatTime)) * 0.3;

  // Bass: 2 bar pattern
  float bassTime = beatToTime(mod(beat, 2.0));
  float bassFreq = mod(beat, 8.0) < 4.0 ? 55.0 : 73.42; // A1 or D2
  out2 += vec2(bass(bassTime, bassFreq)) * 0.4;

  return out2;
}`;

// =============================================================================
// DEMO: Minimal Techno - 125 BPM recommended
// =============================================================================
export const DEMO_SOUND_SHADER = `// Utility functions
float timeToBeat(float time) {
  return time / 60.0 * u_bpm;
}

float beatToTime(float beat) {
  return beat / u_bpm * 60.0;
}

float sine(float phase) {
  return sin(phase * 6.28318530718);
}

float saw(float phase) {
  return 2.0 * fract(phase) - 1.0;
}

float noise(float n) {
  return fract(sin(n) * 43758.5453);
}

// Minimal kick - deep and clean
float kick(float time) {
  float amp = exp(-4.0 * time);
  float pitch = 50.0 - 30.0 * exp(-60.0 * time);
  return amp * sine(pitch * time);
}

// Closed hi-hat - tight
float hihat(float time) {
  float amp = exp(-80.0 * time);
  return amp * (noise(time * 20000.0) * 2.0 - 1.0);
}

// Rim shot / click
float rim(float time) {
  float click = exp(-200.0 * time) * sine(1200.0 * time);
  float body = exp(-80.0 * time) * sine(400.0 * time);
  return click * 0.6 + body * 0.4;
}

// Filtered saw bass with cutoff modulation
float bass(float time, float freq, float cutoff) {
  float osc = saw(freq * time);
  // Simple lowpass approximation
  float filtered = osc * cutoff;
  return filtered;
}

// Percussive blip
float blip(float time, float freq) {
  float amp = exp(-30.0 * time);
  return amp * sine(freq * time);
}

vec2 mainSound(float time) {
  vec2 out2 = vec2(0.0);

  float beat = timeToBeat(time);
  float bar = floor(beat / 4.0);
  float beatInBar = mod(beat, 4.0);

  // Kick: four on the floor
  float kickTime = beatToTime(mod(beat, 1.0));
  out2 += vec2(kick(kickTime)) * 0.8;

  // Sidechain envelope
  float sidechain = smoothstep(0.0, 0.3, kickTime);

  // Hi-hat: offbeat 8ths with subtle variation
  float hatTime = beatToTime(mod(beat + 0.5, 1.0));
  float hatVel = 0.2 + 0.1 * sine(beat * 0.5);
  out2 += vec2(hihat(hatTime)) * hatVel * sidechain;

  // Rim: sparse pattern, every 2 bars with variation
  float rimPattern = mod(bar, 2.0);
  if (rimPattern < 1.0 && (beatInBar == 1.5 || beatInBar == 3.0)) {
    float rimTime = beatToTime(mod(beat, 0.5));
    out2 += vec2(rim(rimTime)) * 0.3 * sidechain;
  }

  // Bass: 2 bar loop, filter opens slowly over 8 bars
  float bassTime = beatToTime(mod(beat, 0.5));
  float bassFreq = 55.0; // A1
  float filterMod = 0.3 + 0.4 * (mod(bar, 8.0) / 8.0);
  filterMod *= sidechain;
  float bassEnv = exp(-8.0 * bassTime);
  out2 += vec2(bass(time, bassFreq, filterMod)) * bassEnv * 0.4;

  // Subtle variation: extra 16th note bass hits
  if (mod(bar, 4.0) >= 2.0) {
    float bassTime2 = beatToTime(mod(beat + 0.25, 0.5));
    float bassEnv2 = exp(-12.0 * bassTime2);
    out2 += vec2(bass(time, bassFreq * 2.0, filterMod * 0.5)) * bassEnv2 * 0.15;
  }

  // Blip melody: appears every 4 bars, simple pattern
  if (mod(bar, 4.0) >= 2.0) {
    float blipBeat = mod(beat, 2.0);
    float blipStep = floor(blipBeat * 2.0);
    float blipTime = beatToTime(mod(blipBeat, 0.5));

    // Simple 4-note pattern
    float blipFreq = blipStep == 0.0 ? 440.0 :
                     blipStep == 1.0 ? 392.0 :
                     blipStep == 2.0 ? 349.2 : 330.0;

    float blipAmp = 0.15 * sidechain;
    // Stereo width
    out2 += vec2(
      blip(blipTime, blipFreq * 0.995),
      blip(blipTime, blipFreq * 1.005)
    ) * blipAmp;
  }

  return out2;
}`;

// =============================================================================
// VISUAL: Default visual shader
// =============================================================================
export const DEFAULT_VISUAL_SHADER = `// Audio uniforms:
// Smoothed: u_kick, u_hihat, u_bass (0-1)
// Peak: u_kickPeak, u_hihatPeak, u_bassPeak (decay付き)
// Onset: u_kickOnset, u_hihatOnset, u_bassOnset (1.0 on beat, 0.0 otherwise)

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdRing(vec2 p, float r, float thickness) {
    return abs(length(p) - r) - thickness;
}

vec3 visualMain(vec2 uv, vec2 resolution) {
    // Center and aspect correct
    vec2 pos = (uv - 0.5) * 2.0;
    pos.x *= resolution.x / resolution.y;

    // Background
    vec3 bgColor = vec3(0.02, 0.02, 0.04);
    vec3 color = bgColor;

    // === Kick: Center circle with pulse ===
    float kickScale = 0.3 + u_kickPeak * 0.4;
    float kickCircle = sdCircle(pos, kickScale);

    // Flash on onset
    float kickFlash = u_kickOnset * 0.8;
    vec3 kickColor = hsv2rgb(vec3(0.0, 0.8, 0.9 + kickFlash));

    // Glow effect
    float kickGlow = exp(-kickCircle * 3.0) * (u_kick + kickFlash);
    color += kickColor * kickGlow;

    // === Hihat: Rotating rings ===
    float angle = u_time * 2.0 + u_hihatPeak * 3.14159;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotPos = rot * pos;

    // Multiple rings
    for (float i = 0.0; i < 3.0; i++) {
        float ringRadius = 0.5 + i * 0.2 + u_hihatPeak * 0.1;
        float ring = sdRing(rotPos, ringRadius, 0.01 + u_hihat * 0.02);

        // Color shift on onset
        float hue = 0.55 + i * 0.1 + u_hihatOnset * 0.3;
        vec3 ringColor = hsv2rgb(vec3(hue, 0.7, 0.8));

        float ringGlow = exp(-abs(ring) * 20.0) * (u_hihat * 0.5 + u_hihatOnset * 0.5);
        color += ringColor * ringGlow;
    }

    // === Bass: Background pulse and distortion ===
    float bassWave = sin(length(pos) * 10.0 - u_time * 3.0 - u_bassPeak * 5.0);
    bassWave = bassWave * 0.5 + 0.5;

    vec3 bassColor = hsv2rgb(vec3(0.7 + u_bassOnset * 0.2, 0.6, 0.3));
    color += bassColor * bassWave * u_bass * 0.3;

    // Vignette that pulses with bass
    float vignette = 1.0 - length(pos) * (0.4 - u_bassPeak * 0.1);
    vignette = clamp(vignette, 0.0, 1.0);
    color *= vignette;

    // === Combined onset flash (white flash on any strong beat) ===
    float totalOnset = max(max(u_kickOnset, u_hihatOnset), u_bassOnset);
    color += vec3(1.0) * totalOnset * 0.15;

    // === Subtle noise for texture ===
    float noise = fract(sin(dot(uv * u_time, vec2(12.9898, 78.233))) * 43758.5453);
    color += vec3(noise * 0.02);

    return clamp(color, 0.0, 1.0);
}`;
