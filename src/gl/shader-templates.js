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

// Basic waveforms
float saw(float phase) {
  return 2.0 * fract(phase) - 1.0;
}

float square(float phase) {
  return fract(phase) < 0.5 ? -1.0 : 1.0;
}

float triangle(float phase) {
  return 1.0 - 4.0 * abs(fract(phase) - 0.5);
}

float sine(float phase) {
  return sin(TAU * phase);
}

// Hash functions (uint-based, high quality)
const uint UINT_MAX = 0xffffffffu;
const uvec3 k = uvec3(0x456789abu, 0x6789ab45u, 0x89ab4567u);
const uvec3 u = uvec3(1, 2, 3);

uvec2 uhash22(uvec2 n) {
  n ^= (n.yx << u.xy);
  n ^= (n.yx >> u.xy);
  n *= k.xy;
  n ^= (n.yx << u.xy);
  return n * k.xy;
}

float hash21(vec2 p) {
  uvec2 n = floatBitsToUint(p);
  return float(uhash22(n).x) / float(UINT_MAX);
}

vec2 hash22(vec2 p) {
  uvec2 n = floatBitsToUint(p);
  return vec2(uhash22(n)) / vec2(UINT_MAX);
}

// Kick drum - pitch and amplitude decay
float kick(float time) {
  float amp = exp(-4.0 * time);
  float pitch = 50.0 + 150.0 * exp(-60.0 * time);
  return amp * sine(pitch * time);
}

// Hihat (closed) - noise-based, fast decay
float hihat(float time) {
  float amp = exp(-50.0 * time);
  float noise = hash21(vec2(time * 1000.0, 0.0)) * 2.0 - 1.0;
  return amp * noise;
}

// Open hihat - noise-based, slower decay
float openHihat(float time) {
  float amp = exp(-8.0 * time);
  float noise = hash21(vec2(time * 1000.0, 2.0)) * 2.0 - 1.0;
  return amp * noise;
}

// Snare 808 - tonal with pitch envelope
float snare(float time) {
  float pitch = 180.0 + 80.0 * exp(-40.0 * time);
  float body = sine(pitch * time) * exp(-8.0 * time);
  float noise = (hash21(vec2(time * 1000.0, 1.0)) * 2.0 - 1.0) * exp(-12.0 * time);
  return body * 0.6 + noise * 0.3;
}

// Filtered saw - saw wave with cutoff control (0-1)
float filteredSaw(float phase, float cutoff) {
  float harmonics = 1.0 + cutoff * 7.0; // 1-8 harmonics
  float o = 0.0;
  for (float i = 1.0; i <= 8.0; i++) {
    if (i > harmonics) break;
    float amp = 1.0 / i;
    o += sine(phase * i) * amp;
  }
  return o * 0.5;
}

// Bass - filtered saw with envelope
float bass(float time, float freq, float cutoff) {
  float amp = exp(-3.0 * time);
  float osc = filteredSaw(freq * time, cutoff);
  return osc * amp;
}

// Sub bass - pure sine, synced with kick
float subBass(float time, float freq) {
  float amp = exp(-5.0 * time);
  return sine(freq * time) * amp;
}

// Lead / Blip - percussive melodic element
float lead(float time, float freq) {
  float amp = exp(-12.0 * time);
  float osc = sine(freq * time) + sine(freq * 2.0 * time) * 0.3; // fundamental + octave
  return osc * amp;
}

// Pad - sustained chord with slow attack
float pad(float time, float freq, float duration) {
  float attack = smoothstep(0.0, 0.3, time);
  float release = smoothstep(duration, duration - 0.3, time);
  float amp = attack * release;
  // Detuned oscillators for thickness
  float osc = sine(freq * time) * 0.5
            + sine(freq * 1.005 * time) * 0.25
            + sine(freq * 0.995 * time) * 0.25;
  return osc * amp;
}

// --- Effects ---

// Distortion - soft clipping using tanh
float distort(float x, float drive) {
  return tanh(x * drive);
}

// Filter (lowpass approximation) - blend between raw and filtered
float lowpass(float osc, float cutoff) {
  // Simple approximation: reduce high frequency content
  return mix(osc, sine(osc * 0.5), 1.0 - cutoff);
}

vec2 mainSound(float time) {
  float beat = timeToBeat(time);
  vec2 o = vec2(0.0);

  // Kick: every beat
  float kickTime = beatToTime(mod(beat, 1.0));
  o += vec2(kick(kickTime)) * 0.7;

  // Sub bass: synced with kick
  o += vec2(subBass(kickTime, 40.0)) * 0.5;

  // Sidechain envelope (duck when kick hits)
  float sidechain = smoothstep(0.0, 0.1, kickTime);

  // Hihat: offbeat (8th notes)
  float hihatTime = beatToTime(mod(beat + 0.5, 1.0));
  o += vec2(hihat(hihatTime)) * 0.3;

  // Open hihat: every 2 bars, beat 4 offbeat
  float ohTime = beatToTime(mod(beat + 0.5, 8.0));
  o += vec2(openHihat(ohTime)) * 0.2;

  // Snare: beats 2 and 4
  float snareTime = beatToTime(mod(beat + 1.0, 2.0));
  o += vec2(snare(snareTime)) * 0.6;

  // Bass: every beat with filter sweep (cutoff opens over 4 bars)
  float bassTime = beatToTime(mod(beat, 1.0));
  float bassFreq = mod(beat, 8.0) < 4.0 ? 55.0 : 73.42; // A1 or D2
  float bassCutoff = mod(beat, 16.0) / 16.0; // filter sweep over 4 bars
  o += vec2(bass(bassTime, bassFreq, bassCutoff)) * 0.25 * sidechain;

  // Lead: 16th note arpeggio pattern with delay
  float leadBeat = mod(beat, 0.25);
  float leadTime = beatToTime(leadBeat);
  float leadStep = floor(mod(beat * 4.0, 4.0));
  float leadFreq = leadStep == 0.0 ? 440.0   // A4
                 : leadStep == 1.0 ? 523.25  // C5
                 : leadStep == 2.0 ? 659.25  // E5
                 : 783.99;                   // G5
  float leadDry = lead(leadTime, leadFreq);
  // Delay: 8th note delay with feedback simulation
  float delayTime = beatToTime(0.5);
  float leadDelay1 = lead(leadTime + delayTime, leadFreq) * 0.4;
  float leadDelay2 = lead(leadTime + delayTime * 2.0, leadFreq) * 0.2;
  o += vec2(leadDry + leadDelay1, leadDry + leadDelay2) * 0.12 * sidechain;

  // Pad: sustained chord, 4 bar loop
  float padTime = beatToTime(mod(beat, 16.0));
  float padDuration = beatToTime(16.0);
  float padFreq = 220.0; // A3
  o += vec2(
    pad(padTime, padFreq, padDuration),           // root
    pad(padTime, padFreq * 1.25, padDuration)     // major 3rd (stereo)
  ) * 0.1 * sidechain;

  // Apply soft distortion to final mix (optional)
  // o = vec2(distort(o.x, 1.5), distort(o.y, 1.5));

  return o;
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
  vec2 o = vec2(0.0);

  float beat = timeToBeat(time);
  float bar = floor(beat / 4.0);
  float beatInBar = mod(beat, 4.0);

  // Kick: four on the floor
  float kickTime = beatToTime(mod(beat, 1.0));
  o += vec2(kick(kickTime)) * 0.8;

  // Sidechain envelope
  float sidechain = smoothstep(0.0, 0.3, kickTime);

  // Hi-hat: offbeat 8ths with subtle variation
  float hatTime = beatToTime(mod(beat + 0.5, 1.0));
  float hatVel = 0.2 + 0.1 * sine(beat * 0.5);
  o += vec2(hihat(hatTime)) * hatVel * sidechain;

  // Rim: sparse pattern, every 2 bars with variation
  float rimPattern = mod(bar, 2.0);
  if (rimPattern < 1.0 && (beatInBar == 1.5 || beatInBar == 3.0)) {
    float rimTime = beatToTime(mod(beat, 0.5));
    o += vec2(rim(rimTime)) * 0.3 * sidechain;
  }

  // Bass: 2 bar loop, filter opens slowly over 8 bars
  float bassTime = beatToTime(mod(beat, 0.5));
  float bassFreq = 55.0; // A1
  float filterMod = 0.3 + 0.4 * (mod(bar, 8.0) / 8.0);
  filterMod *= sidechain;
  float bassEnv = exp(-8.0 * bassTime);
  o += vec2(bass(time, bassFreq, filterMod)) * bassEnv * 0.4;

  // Subtle variation: extra 16th note bass hits
  if (mod(bar, 4.0) >= 2.0) {
    float bassTime2 = beatToTime(mod(beat + 0.25, 0.5));
    float bassEnv2 = exp(-12.0 * bassTime2);
    o += vec2(bass(time, bassFreq * 2.0, filterMod * 0.5)) * bassEnv2 * 0.15;
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
    o += vec2(
      blip(blipTime, blipFreq * 0.995),
      blip(blipTime, blipFreq * 1.005)
    ) * blipAmp;
  }

  return o;
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
