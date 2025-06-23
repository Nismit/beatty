// Shader Templates Module
// Contains default GLSL shader code templates for audio and visual shaders

export const ShaderTemplates = {
  
  /**
   * Default sound shader template with basic waveform functions,
   * envelope control, and example instruments (kick, hihat, bass)
   */
  defaultSoundCode: `vec2 hash21(float p) {
	vec3 p3 = fract(vec3(p) * vec3(.19615, .19901, .023118));
	p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise( float n ) {
  return fract(sin(n)*43758.5453123);
}

float timeToBeat(float time) {
  return time / 60.0 * u_bpm;
}

float beatToTime(float beat) { 
  return beat / u_bpm * 60.0; 
}

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
  return sin(phase * 6.28318530718);
}

// https://www.graffathon.fi/2016/presentations/additive_slides.pdf
float pitch(float p) {
  return pow(1.059460646483, p) * 440.0;
}

float kick(float time) {
  float amp = exp(-5.0 * time);
  float phase = 50.0 * time - 10.0 * exp(-70.0 * time);
  return amp * sine(phase);
}

float kick2(float time) {
  float amp = exp(-5.0 * time);
  float attack = 30.0; // attack---feel [10.0 -- 100.0]
  float pyuun = 5.0; // pyuun [10.0 --- 100.0]
  float botu = -30.0; // kotu <--> botu [-100.0 -- -10.0]
  float phase = attack * time - pyuun * exp(botu * time);
  return amp * sine(phase);
}

vec2 hihat( float time ) {
  float amp = exp( -50.0 * time );
  // return amp * noise( time * 100.0 ).xy;
  return amp * hash21(time * 100.0).xy;
}

vec2 hihat2( float time ) {
  float amp = exp( -40.0 * time );
  // return amp * noise( time * 100.0 ).xy;
  return amp * hash21(time * 300.0).xy;
}

float snare(float time) {
  float amp = exp(-5.0 * time);
  // float envelope = exp(-time * 10.0); // エンベロープ（減衰）
  float noise = 2.0 * (fract(sin(time) * 43758.5453) - 0.5); // ノイズ
  float frequency = 250.0; // サイン波の周波数
  float sineWave = sin(2.0 * 3.14159 * frequency * time);
  float envelope = smoothstep(0.0, 1.0, 1.0 - time * 10.0);

  float snareSound = amp * envelope * (0.5 * noise + 0.5 * sineWave);

  float highPassCutoff = 100.0; // ハイパスフィルタのカットオフ周波数
  snareSound *= smoothstep(highPassCutoff - 50.0, highPassCutoff + 50.0, frequency);

  return snareSound;
}

float chord( float n ) {
  return (
      n < 1.0 ? 55.0 :
      n < 2.0 ? 58.0 :
      n < 3.0 ? 62.0 :
                65.0
  );
}

float noteToFreq( float n ) {
  return 440.0 * pow( 2.0, ( n - 69.0 ) / 12.0 );
}

vec2 bass( float note, float time ) {
  float freq = noteToFreq( note );
  return vec2( square( freq * time ) + sine( freq * time ) ) / 2.0;
}

vec2 pad( float note, float time ) {
  float freq = noteToFreq( note );
  float vib = 0.2 * sine( 3.0 * time );
  return vec2(
      saw( freq * 0.99 * time + vib ),
      saw( freq * 1.01 * time + vib )
  );
}

vec2 arp( float note, float time ) {
  float freq = noteToFreq( note );
  float fmamp = 0.1 * exp( -50.0 * time );
  float fm = fmamp * sine( time * freq * 7.0 );
  float amp = exp( -20.0 * time );
  return amp * vec2(
      sine( freq * 0.99 * time + fm ),
      sine( freq * 1.01 * time + fm )
  );
}

vec2 arp2( float note, float time ) {
  float freq = noteToFreq( note );
  float fmamp = 0.3 * exp( -25.0 * time );
  float fm = fmamp * sine( time * freq * 5.0 );
  float amp = exp( -10.0 * time );
  return amp * vec2(
      sine( freq * 0.99 * time + fm ),
      sine( freq * 1.01 * time + fm )
  );
}

vec2 mainSound(float time) {
  vec2 res;

  float beat = timeToBeat(time);
  // 第二引数が各小節とリンクしている
  // beat, 2.0 = 2小節毎にkickが鳴る
  float kickTime = beatToTime( mod( beat, 1.0 ) );
  float hihatTime = beatToTime( mod( beat + 0.5, 1.0 ) );
  float hihatTime2 = beatToTime( mod( beat + 0.7, 1.0 ) );
  float snareTime = beatToTime( mod( beat, 2.0 ) );

  // 音を小さくする？
  float sidechain = smoothstep( 0.0, 0.3, kickTime );

  float freq = mod(beat, 4.0) >= 1.0 ? 440.0 : 880.0;
  // float amp = exp(-4.0 * fract(beat));

  float fmamp = 0.1 * exp( -3.0 * time );
  float fm = fmamp * sine( time * freq * 7.0 );
  float amp = exp( -1.0 * time );

  float arpTime = beatToTime( mod( beat, 0.25 ) );
  float arpSeed = floor( beat / 0.25 );
  float arpDice = fract( noise( arpSeed ) * 100.0 );

  // =============== Main

  float bassNote = chord( 0.0 ) - 12.0;

  // 64 小節まで
  if ( 0.0 < beat && beat < 64.0 ) {
    res += vec2(kick(kickTime));
    res += vec2(kick2(kickTime));
  }

  if ( 16.0 < beat && beat < 64.0 ) {
    res += vec2(hihat(hihatTime));
  }

  if ( 32.0 < beat && beat < 64.0 ) {
    float arpNote = chord( floor( 2.91 * arpDice ) );
    arpNote += 0.615 * floor( 1.0 * arpDice );
    res += sidechain * vec2 (arp2( arpNote, arpTime )) / 4.;
  }

  if ( 64.0 < beat && beat < 128.0 ) {
    hihatTime = beatToTime( mod( beat, 0.5 ) );
    res += vec2(kick(kickTime));
    res += vec2(hihat(hihatTime));
    res += vec2(hihat(hihatTime2));

    float arpNote = chord( floor( 2.0 * arpDice ) );
    arpNote += 12.0 * floor( 3.0 * arpDice );
    res += sidechain * vec2 (arp( arpNote, arpTime )) / 2.;

  }

  if ( 128.0 < beat && beat < 152.0 ) {
    hihatTime = beatToTime( mod( beat, 0.5 ) );
    res += vec2(kick(kickTime));
    res += vec2(kick2(kickTime));
    res += vec2(hihat(hihatTime2));

    float arpNote = chord( floor( 2.5 * arpDice ) );
    arpNote += 3.2 * floor( 8.0 * arpDice );
    res += sidechain * vec2 (arp( arpNote, arpTime )) / 3.;
  }

  return res;
}`,

  /**
   * Default visual shader template with audio-reactive morphing shapes,
   * HSV color conversion, and responsive visual effects
   */
  defaultVisualCode: `// uniforms: u_kick, u_hihat, u_bass, u_time, u_resolution

float smoothValue(float value, float smoothing) {
    return smoothstep(0.0, 1.0, value * smoothing);
}

float processAudioValue(float raw, float threshold, float gain) {
    float processed = max(0.0, raw - threshold) * gain;
    return smoothstep(0.0, 1.0, processed);
}

float morphShape(vec2 pos, float morphFactor) {
    float circle = length(pos);
    vec2 absPos = abs(pos);
    float square = max(absPos.x, absPos.y);
    return mix(circle, square, morphFactor);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// メイン関数（必須）
vec3 visualMain(vec2 uv, vec2 resolution) {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = (uv - center) * 2.0;
    pos.x *= resolution.x / resolution.y;
    
    float kick = processAudioValue(u_kick, 0.1, 2.0);
    float hihat = processAudioValue(u_hihat, 0.05, 1.5);
    float bass = processAudioValue(u_bass, 0.15, 1.8);
    
    kick = smoothValue(kick, 1.2);
    hihat = smoothValue(hihat, 0.8);
    bass = smoothValue(bass, 1.0);
    
    float baseScale = 0.3;
    float kickScale = kick * 0.4;
    float totalScale = baseScale + kickScale;
    
    float timeOscillation = sin(u_time * 5.0 + kick * 20.0) * 0.02;
    totalScale += timeOscillation;
    
    vec2 scaledPos = pos / totalScale;
    
    float morphFactor = bass * 0.8;
    float shapeDist = morphShape(scaledPos, morphFactor);
    
    float objectRadius = 1.0;
    float edge = 0.02;
    float objectMask = 1.0 - smoothstep(objectRadius - edge, objectRadius + edge, shapeDist);
    
    float baseHue = 0.6 + sin(u_time * 0.3) * 0.1;
    float hihatHue = hihat * 0.5;
    float finalHue = fract(baseHue + hihatHue);
    
    float baseSaturation = 0.7;
    float hihatSaturation = hihat * 0.3;
    float finalSaturation = min(1.0, baseSaturation + hihatSaturation);
    
    float baseBrightness = 0.8;
    float kickBrightness = kick * 0.2;
    float finalBrightness = min(1.0, baseBrightness + kickBrightness);
    
    vec3 mainColor = hsv2rgb(vec3(finalHue, finalSaturation, finalBrightness));
    
    float innerGrad = 1.0 - smoothstep(0.0, 0.7, shapeDist);
    float gradIntensity = 0.3 + bass * 0.4;
    innerGrad *= gradIntensity;
    
    float glowRadius = 1.2 + kick * 0.3;
    float glow = 1.0 - smoothstep(objectRadius, glowRadius, shapeDist);
    glow *= kick * 0.5;
    
    float pulseEffect = sin(u_time * 8.0 + kick * 30.0) * kick * 0.1 + 1.0;
    
    vec3 finalColor = mainColor * objectMask;
    finalColor += mainColor * innerGrad * 0.5;
    finalColor += vec3(1.0, 0.8, 0.6) * glow;
    finalColor *= pulseEffect;
    
    float totalEnergy = (kick + hihat + bass) / 3.0;
    vec3 bgColor = vec3(0.02, 0.01, 0.03) * (1.0 + totalEnergy * 0.5);
    
    float alpha = clamp(objectMask + glow, 0.0, 1.0);
    finalColor = mix(bgColor, finalColor, alpha);
    
    return finalColor;
}`,
};
