/**
 * Default shader templates
 * Contains default GLSL code for sound and visual shaders
 */

// =============================================================================
// DEFAULT: Simple drum pattern (kick, hihat, snare)
// =============================================================================
export const DEFAULT_SOUND_SHADER = `// Utility functions
float timeToBeat(float time) {
  return time / 60.0 * u_bpm;
}

float beatToTime(float beat) {
  return beat / u_bpm * 60.0;
}

float sine(float phase) {
  return sin(TAU * phase);
}

// Hash function for noise
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

// Kick drum
float kick(float time) {
  float amp = exp(-4.0 * time);
  float pitch = 50.0 + 150.0 * exp(-60.0 * time);
  return amp * sine(pitch * time);
}

// Hihat (closed)
float hihat(float time) {
  float amp = exp(-50.0 * time);
  float noise = hash21(vec2(time * 1000.0, 0.0)) * 2.0 - 1.0;
  return amp * noise;
}

// Snare
float snare(float time) {
  float pitch = 180.0 + 80.0 * exp(-40.0 * time);
  float body = sine(pitch * time) * exp(-8.0 * time);
  float noise = (hash21(vec2(time * 1000.0, 1.0)) * 2.0 - 1.0) * exp(-12.0 * time);
  return body * 0.6 + noise * 0.3;
}

vec2 mainSound(float time) {
  float beat = timeToBeat(time);
  vec2 o = vec2(0.0);

  // Kick: every beat
  float kickTime = beatToTime(mod(beat, 1.0));
  o += vec2(kick(kickTime)) * 0.7;

  // Hihat: 8th notes
  float hihatTime = beatToTime(mod(beat, 0.5));
  o += vec2(hihat(hihatTime)) * 0.3;

  // Snare: beats 2 and 4
  float snareTime = beatToTime(mod(beat + 1.0, 2.0));
  o += vec2(snare(snareTime)) * 0.6;

  return o;
}`;

// =============================================================================
// DEMO: Full track with bass, lead, pad (120 BPM recommended)
// =============================================================================
export const DEMO_SOUND_SHADER_UTILS = `// Utility functions
float timeToBeat(float time) {
  return time / 60.0 * u_bpm;
}

float beatToTime(float beat) {
  return beat / u_bpm * 60.0;
}

// MIDI note to frequency (A4 = 69 = 440Hz)
float mtof(float note) {
  return 440.0 * pow(SEMITONE, note - 69.0);
}

// Quantize beat to grid division (e.g., 0.25 = 16th notes)
float quantize(float beat, float division) {
  return floor(beat / division) * division;
}

// ADSR envelope
float adsr(float time, float a, float d, float s, float r, float duration) {
  if (time < 0.0) return 0.0;
  if (time < a) return time / a;
  if (time < a + d) return 1.0 - (1.0 - s) * (time - a) / d;
  if (time < duration - r) return s;
  if (time < duration) return s * (duration - time) / r;
  return 0.0;
}

// LFO (low frequency oscillator)
float lfo(float time, float rate) {
  return sin(TAU * rate * time);
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

// Clap - layered noise bursts
float clap(float time) {
  float amp = exp(-25.0 * time);
  // Multiple short bursts for clap texture
  float burst1 = exp(-200.0 * time);
  float burst2 = exp(-150.0 * mod(time - 0.01, 1.0)) * step(0.01, time);
  float burst3 = exp(-100.0 * mod(time - 0.02, 1.0)) * step(0.02, time);
  float noise = hash21(vec2(time * 2000.0, 3.0)) * 2.0 - 1.0;
  return noise * amp * (burst1 + burst2 * 0.7 + burst3 * 0.5);
}

// Rim shot / Click - short percussive hit
float rim(float time) {
  float click = exp(-200.0 * time) * sine(1200.0 * time);
  float body = exp(-80.0 * time) * sine(400.0 * time);
  return click * 0.6 + body * 0.4;
}

// Tom - pitched drum
float tom(float time, float freq) {
  float amp = exp(-6.0 * time);
  float pitch = freq + freq * 0.5 * exp(-30.0 * time);
  return amp * sine(pitch * time);
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

// Bitcrush - reduce bit depth for lo-fi effect
float bitcrush(float x, float bits) {
  float steps = pow(2.0, bits);
  return floor(x * steps) / steps;
}

// Chorus - thicken sound with detuned copies
float chorus(float phase, float depth, float rate, float time) {
  float mod1 = sine(phase + depth * lfo(time, rate));
  float mod2 = sine(phase + depth * lfo(time, rate * 1.1));
  return (sine(phase) + mod1 + mod2) / 3.0;
}`;

export const DEMO_SOUND_SHADER = `vec2 mainSound(float time) {
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

  // --- Optional: uncomment to try ---

  // Clap: layered with snare on beats 2 and 4
  // o += vec2(clap(snareTime)) * 0.3;

  // Rim: 16th note accents
  // float rimTime = beatToTime(mod(beat, 0.25));
  // o += vec2(rim(rimTime)) * 0.2;

  // Tom: fill every 4 bars
  // float tomTime = beatToTime(mod(beat, 16.0));
  // o += vec2(tom(tomTime, mtof(48.0))) * 0.4; // C3

  // Using mtof for lead (MIDI notes instead of Hz)
  // float leadFreq = mtof(69.0 + leadStep * 2.0); // A4, B4, C#5, D#5

  // ADSR envelope example
  // float env = adsr(leadTime, 0.01, 0.1, 0.5, 0.2, beatToTime(0.25));
  // o += vec2(sine(440.0 * time) * env) * 0.2;

  // LFO modulation on filter
  // float lfoMod = lfo(time, 0.5) * 0.5 + 0.5; // 0-1 range
  // bassCutoff *= lfoMod;

  // Bitcrush effect
  // o = vec2(bitcrush(o.x, 8.0), bitcrush(o.y, 8.0));

  // Chorus on pad
  // o += vec2(chorus(padFreq * time, 0.02, 0.5, time)) * 0.1;

  // Distortion on final mix
  // o = vec2(distort(o.x, 1.5), distort(o.y, 1.5));

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

// Polygon SDF - n sides
float sdPolygon(vec2 p, float r, float n) {
    float a = atan(p.x, p.y) + PI;
    float s = TAU / n;
    return cos(floor(0.5 + a / s) * s - a) * length(p) - r;
}

// Rotate 2D
vec2 rot2d(vec2 p, float a) {
    float c = cos(a), s = sin(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Circle SDF
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Scene function for chromatic aberration
vec3 scene(vec2 pos) {
    vec3 color = vec3(0.01, 0.02, 0.06);

    // === Central morphing shape ===
    // Switch shape every 2 seconds (instant change)
    float shapeIndex = floor(mod(u_time * 0.5, 5.0));
    float sides = shapeIndex == 0.0 ? 3.0   // triangle
                : shapeIndex == 1.0 ? 4.0   // square
                : shapeIndex == 2.0 ? 5.0   // pentagon
                : shapeIndex == 3.0 ? 6.0   // hexagon
                : 32.0;                      // circle (many sides)

    float polySize = 0.25 + u_kickPeak * 0.15;

    // Rotate with time
    vec2 polyPos = rot2d(pos, u_time * 0.5);
    float shape = sdPolygon(polyPos, polySize, sides);

    // Glow - purple, intensity on kick
    vec3 polyColor = hsv2rgb(vec3(0.75 + u_kickOnset * 0.1, 0.8, 0.9));
    float polyGlow = exp(-shape * 4.0) * (0.5 + u_kickPeak * 0.5);
    color += polyColor * polyGlow;

    // Edge line
    float polyEdge = smoothstep(0.02, 0.0, abs(shape));
    color += polyColor * polyEdge * 0.8;

    // === Outer rotating polygons ===
    for (float i = 0.0; i < 3.0; i++) {
        float offset = i * TAU / 3.0;
        float dist = 0.6 + i * 0.15 + u_bassPeak * 0.1;

        // Position around center
        vec2 ringPos = pos - vec2(cos(u_time + offset), sin(u_time + offset)) * dist * 0.3;

        // Switch shape every 1.5 seconds (offset per polygon)
        float outerIndex = floor(mod(u_time * 0.67 + i * 1.5, 4.0));
        float outerSides = outerIndex == 0.0 ? 3.0
                         : outerIndex == 1.0 ? 4.0
                         : outerIndex == 2.0 ? 6.0
                         : 32.0;
        float outerSize = 0.08 + u_hihatPeak * 0.04;

        vec2 outerRotPos = rot2d(ringPos, -u_time * 2.0 + i);
        float outerPoly = sdPolygon(outerRotPos, outerSize, outerSides);

        // Cyan to blue colors
        float hue = 0.5 + i * 0.08;
        vec3 outerColor = hsv2rgb(vec3(hue, 0.7, 0.8));

        float outerGlow = exp(-outerPoly * 8.0) * (0.3 + u_hihat * 0.4);
        color += outerColor * outerGlow;
    }

    // === Background geometric pattern ===
    vec2 gridPos = rot2d(pos, u_time * 0.2);
    float gridScale = 4.0 + u_bass * 2.0;
    vec2 gridUV = fract(gridPos * gridScale) - 0.5;

    // Tiny polygons in grid
    float gridSides = 4.0 + u_bass * 2.0;
    float gridPoly = sdPolygon(gridUV, 0.2, gridSides);
    float gridLine = smoothstep(0.03, 0.0, abs(gridPoly));

    // Green/teal grid
    vec3 gridColor = hsv2rgb(vec3(0.4, 0.6, 0.4));
    color += gridColor * gridLine * u_bass * 0.3;

    // === Onset flash ===
    float totalOnset = max(max(u_kickOnset, u_hihatOnset), u_bassOnset);
    color += vec3(0.6, 0.7, 1.0) * totalOnset * 0.2;

    // === Vignette ===
    float vignette = 1.0 - length(pos) * 0.35;
    color *= saturate(vignette);

    return saturate(color);
}

vec3 visualMain(vec2 uv, vec2 resolution) {
    // === Zoom pulse - kick pushes camera in ===
    vec2 center = vec2(0.5);
    float zoom = 1.0 - u_kickPeak * 0.08;
    vec2 zoomedUV = center + (uv - center) * zoom;

    // Convert to pos coordinates
    vec2 pos = (zoomedUV - 0.5) * 2.0;
    pos.x *= resolution.x / resolution.y;

    return scene(pos);
}`;
