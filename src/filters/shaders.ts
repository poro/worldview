// GLSL Fragment Shaders for post-processing filters

export const nightVisionFS = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec4 color = texture(colorTexture, v_textureCoordinates);
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Green phosphor
  vec3 green = vec3(0.1, luminance * 1.5, 0.1);

  // Noise
  float noise = random(v_textureCoordinates + vec2(czm_frameNumber * 0.001)) * 0.08;
  green += noise;

  // Vignette
  vec2 center = v_textureCoordinates - 0.5;
  float vignette = 1.0 - dot(center, center) * 1.5;
  green *= vignette;

  // Slight bloom on bright areas
  green += max(luminance - 0.5, 0.0) * vec3(0.0, 0.3, 0.0);

  out_FragColor = vec4(green, 1.0);
}
`;

export const flirFS = `
uniform sampler2D colorTexture;
in vec2 v_textureCoordinates;

vec3 thermalPalette(float t) {
  // Black -> Blue -> Purple -> Red -> Orange -> Yellow -> White
  if (t < 0.15) return mix(vec3(0.0, 0.0, 0.1), vec3(0.1, 0.0, 0.4), t / 0.15);
  if (t < 0.3) return mix(vec3(0.1, 0.0, 0.4), vec3(0.5, 0.0, 0.5), (t - 0.15) / 0.15);
  if (t < 0.5) return mix(vec3(0.5, 0.0, 0.5), vec3(0.8, 0.1, 0.1), (t - 0.3) / 0.2);
  if (t < 0.7) return mix(vec3(0.8, 0.1, 0.1), vec3(1.0, 0.5, 0.0), (t - 0.5) / 0.2);
  if (t < 0.85) return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.7) / 0.15);
  return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
}

void main() {
  vec4 color = texture(colorTexture, v_textureCoordinates);
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Invert for FLIR white-hot
  float thermal = luminance;
  vec3 result = thermalPalette(thermal);

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
in vec2 v_textureCoordinates;

void main() {
  vec2 uv = v_textureCoordinates;

  // Barrel distortion
  vec2 center = uv - 0.5;
  float dist = dot(center, center);
  uv = uv + center * dist * 0.1;

  // Chromatic aberration
  float offset = 0.002;
  float r = texture(colorTexture, uv + vec2(offset, 0.0)).r;
  float g = texture(colorTexture, uv).g;
  float b = texture(colorTexture, uv - vec2(offset, 0.0)).b;
  vec3 color = vec3(r, g, b);

  // Scanlines
  float scanline = sin(uv.y * 800.0) * 0.08;
  color -= scanline;

  // Horizontal line flicker
  float flicker = sin(czm_frameNumber * 0.05 + uv.y * 20.0) * 0.02;
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

  // High contrast base
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  vec3 enhanced = color.rgb * 1.3;

  // Add edge overlay in cyan
  enhanced += vec3(0.0, edge * 0.4, edge * 0.5);

  // Desaturate slightly
  enhanced = mix(enhanced, vec3(luminance * 1.3), 0.2);

  // Vignette
  vec2 center = v_textureCoordinates - 0.5;
  float vignette = 1.0 - dot(center, center) * 1.0;
  enhanced *= vignette;

  out_FragColor = vec4(enhanced, 1.0);
}
`;
