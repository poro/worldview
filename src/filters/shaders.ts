// GLSL Fragment Shaders for post-processing filters
// All shaders now accept uniform parameters for real-time control

export const nightVisionFS = `
uniform sampler2D colorTexture;
uniform float u_intensity;
uniform float u_noise;
uniform float u_bloom;
uniform float u_vignette;
in vec2 v_textureCoordinates;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec4 color = texture(colorTexture, v_textureCoordinates);
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Green phosphor — intensity controls green strength
  float greenMul = 1.0 + u_intensity * 0.5;
  vec3 green = vec3(0.1 * u_intensity, luminance * greenMul, 0.1 * u_intensity);

  // Noise
  float noiseAmt = u_noise * 0.15;
  float noise = random(v_textureCoordinates + vec2(czm_frameNumber * 0.001)) * noiseAmt;
  green += noise;

  // Vignette
  vec2 center = v_textureCoordinates - 0.5;
  float vignetteStr = u_vignette * 3.0;
  float vignette = 1.0 - dot(center, center) * vignetteStr;
  green *= vignette;

  // Bloom on bright areas
  float bloomStr = u_bloom * 0.6;
  green += max(luminance - 0.5, 0.0) * vec3(0.0, bloomStr, 0.0);

  out_FragColor = vec4(green, 1.0);
}
`;

export const flirFS = `
uniform sampler2D colorTexture;
uniform float u_sensitivity;
uniform float u_palette;
uniform float u_pixelation;
in vec2 v_textureCoordinates;

vec3 classicPalette(float t) {
  if (t < 0.15) return mix(vec3(0.0, 0.0, 0.1), vec3(0.1, 0.0, 0.4), t / 0.15);
  if (t < 0.3) return mix(vec3(0.1, 0.0, 0.4), vec3(0.5, 0.0, 0.5), (t - 0.15) / 0.15);
  if (t < 0.5) return mix(vec3(0.5, 0.0, 0.5), vec3(0.8, 0.1, 0.1), (t - 0.3) / 0.2);
  if (t < 0.7) return mix(vec3(0.8, 0.1, 0.1), vec3(1.0, 0.5, 0.0), (t - 0.5) / 0.2);
  if (t < 0.85) return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.7) / 0.15);
  return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
}

vec3 whiteHotPalette(float t) {
  return vec3(t);
}

vec3 blackHotPalette(float t) {
  return vec3(1.0 - t);
}

vec3 rainbowPalette(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.0, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = v_textureCoordinates;

  // Pixelation
  if (u_pixelation > 0.5) {
    vec2 dims = czm_viewport.zw;
    float blockSize = u_pixelation;
    vec2 blocks = dims / blockSize;
    uv = floor(uv * blocks) / blocks;
  }

  vec4 color = texture(colorTexture, uv);
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Sensitivity adjusts contrast mapping
  float thermal = clamp((luminance - 0.5) * (1.0 + u_sensitivity * 2.0) + 0.5, 0.0, 1.0);

  // Palette selection
  vec3 result;
  int pal = int(u_palette);
  if (pal == 1) result = whiteHotPalette(thermal);
  else if (pal == 2) result = blackHotPalette(thermal);
  else if (pal == 3) result = rainbowPalette(thermal);
  else result = classicPalette(thermal);

  // Slight noise for realism
  float noise = fract(sin(dot(v_textureCoordinates * 500.0 + czm_frameNumber * 0.01, vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
  result += noise;

  // Vignette
  vec2 center = v_textureCoordinates - 0.5;
  float vignette = 1.0 - dot(center, center) * 0.8;
  result *= vignette;

  out_FragColor = vec4(result, 1.0);
}
`;

export const crtFS = `
uniform sampler2D colorTexture;
uniform float u_scanlines;
uniform float u_aberration;
uniform float u_curvature;
uniform float u_flicker;
in vec2 v_textureCoordinates;

void main() {
  vec2 uv = v_textureCoordinates;

  // Barrel distortion
  vec2 center = uv - 0.5;
  float dist = dot(center, center);
  float curveMul = u_curvature * 0.2;
  uv = uv + center * dist * curveMul;

  // Chromatic aberration
  float offset = u_aberration * 0.004;
  float r = texture(colorTexture, uv + vec2(offset, 0.0)).r;
  float g = texture(colorTexture, uv).g;
  float b = texture(colorTexture, uv - vec2(offset, 0.0)).b;
  vec3 color = vec3(r, g, b);

  // Scanlines
  float scanStr = u_scanlines * 0.15;
  float scanline = sin(uv.y * 800.0) * scanStr;
  color -= scanline;

  // Horizontal line flicker
  float flickerStr = u_flicker * 0.04;
  float flicker = sin(czm_frameNumber * 0.05 + uv.y * 20.0) * flickerStr;
  color += flicker;

  // Vignette (stronger for CRT)
  float vignette = 1.0 - dot(center, center) * 2.5;
  color *= vignette;

  // Green tint
  color *= vec3(0.85, 1.0, 0.85);

  // Brightness boost
  color *= 1.1;

  out_FragColor = vec4(color, 1.0);
}
`;

export const enhancedFS = `
uniform sampler2D colorTexture;
uniform float u_edgeStrength;
uniform float u_contrast;
uniform float u_saturation;
in vec2 v_textureCoordinates;

void main() {
  vec2 texelSize = 1.0 / czm_viewport.zw;
  vec4 color = texture(colorTexture, v_textureCoordinates);

  // Sobel edge detection
  vec4 tl = texture(colorTexture, v_textureCoordinates + vec2(-texelSize.x, texelSize.y));
  vec4 t  = texture(colorTexture, v_textureCoordinates + vec2(0.0, texelSize.y));
  vec4 tr = texture(colorTexture, v_textureCoordinates + vec2(texelSize.x, texelSize.y));
  vec4 l  = texture(colorTexture, v_textureCoordinates + vec2(-texelSize.x, 0.0));
  vec4 r2 = texture(colorTexture, v_textureCoordinates + vec2(texelSize.x, 0.0));
  vec4 bl = texture(colorTexture, v_textureCoordinates + vec2(-texelSize.x, -texelSize.y));
  vec4 b  = texture(colorTexture, v_textureCoordinates + vec2(0.0, -texelSize.y));
  vec4 br = texture(colorTexture, v_textureCoordinates + vec2(texelSize.x, -texelSize.y));

  vec4 gx = -tl - 2.0*l - bl + tr + 2.0*r2 + br;
  vec4 gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = length(gx.rgb) + length(gy.rgb);

  // Contrast boost
  float contrastMul = 1.0 + u_contrast * 0.6;
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 enhanced = color.rgb * contrastMul;

  // Add edge overlay in cyan, scaled by edgeStrength
  float edgeMul = u_edgeStrength;
  enhanced += vec3(0.0, edge * 0.4 * edgeMul, edge * 0.5 * edgeMul);

  // Saturation control — mix between luminance (gray) and color
  float satMix = 1.0 - u_saturation;
  enhanced = mix(enhanced, vec3(luminance * contrastMul), satMix * 0.4);

  // Vignette
  vec2 center = v_textureCoordinates - 0.5;
  float vignette = 1.0 - dot(center, center) * 1.0;
  enhanced *= vignette;

  out_FragColor = vec4(enhanced, 1.0);
}
`;
