import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { FACE_MESH_B64 } from '@/components/face-id-mesh-asset';

const FB_BG = '#FFFFFF';
const FB_BLUE = '#1877F2';
const RING = 280;

/** Face ID ring animation adapted from face-id-animation.html (white background). */
function buildScanHtml() {
  const mesh = `data:image/png;base64,${FACE_MESH_B64}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: ${FB_BG};
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}
.fid-outer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.fid-ring {
  position: relative;
  width: ${RING}px;
  height: ${RING}px;
}
.fid-ring svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.arc-track { fill: none; stroke: #E4E6EB; stroke-width: 5; }
.arc-spin {
  fill: none;
  stroke: url(#ag);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 817;
  stroke-dashoffset: 204;
  animation: spin 2s linear infinite;
  transform-origin: 140px 140px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.arc-inner { fill: none; stroke: #D8E8F8; stroke-width: 1.5; opacity: 0.9; }
.face-img {
  animation: pulse 2.6s ease-in-out infinite;
  filter: invert(1) brightness(0.35) contrast(1.15);
}
@keyframes pulse { 0%, 100% { opacity: 0.72; } 50% { opacity: 1; } }
.scan-bar { animation: scan 2.6s ease-in-out infinite; }
@keyframes scan {
  0%, 100% { transform: translateY(0); opacity: 0; }
  8% { opacity: 1; }
  88% { opacity: 0.9; transform: translateY(112px); }
  99% { opacity: 0; transform: translateY(112px); }
}
.od { animation: od 2.2s ease-in-out infinite; }
.od:nth-child(2) { animation-delay: 0.4s; }
.od:nth-child(3) { animation-delay: 0.8s; }
.od:nth-child(4) { animation-delay: 1.2s; }
.od:nth-child(5) { animation-delay: 1.6s; }
.od:nth-child(6) { animation-delay: 2s; }
@keyframes od { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
.lbl { text-align: center; margin-top: 20px; }
.lbl-main {
  font-size: 18px;
  font-weight: 600;
  color: #1C1E21;
  letter-spacing: 0.04em;
}
.lbl-sub {
  font-size: 13px;
  color: #65676B;
  margin-top: 5px;
}
</style>
</head>
<body>
<div class="fid-outer">
  <div class="fid-ring">
    <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4DA3FF"/>
          <stop offset="50%" stop-color="${FB_BLUE}"/>
          <stop offset="100%" stop-color="#0D5FCC"/>
        </linearGradient>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${FB_BLUE}" stop-opacity="0"/>
          <stop offset="40%" stop-color="${FB_BLUE}" stop-opacity="0.55"/>
          <stop offset="60%" stop-color="${FB_BLUE}" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="${FB_BLUE}" stop-opacity="0"/>
        </linearGradient>
        <clipPath id="cc">
          <circle cx="140" cy="140" r="122"/>
        </clipPath>
      </defs>

      <circle class="arc-track" cx="140" cy="140" r="130"/>
      <circle class="arc-spin" cx="140" cy="140" r="130"/>
      <circle class="arc-inner" cx="140" cy="140" r="121"/>

      <circle class="od" cx="140" cy="6" r="3.5" fill="${FB_BLUE}"/>
      <circle class="od" cx="228" cy="42" r="3" fill="${FB_BLUE}"/>
      <circle class="od" cx="267" cy="152" r="3.5" fill="${FB_BLUE}"/>
      <circle class="od" cx="196" cy="258" r="3" fill="${FB_BLUE}"/>
      <circle class="od" cx="26" cy="206" r="3.5" fill="${FB_BLUE}"/>
      <circle class="od" cx="18" cy="80" r="3" fill="${FB_BLUE}"/>

      <g clip-path="url(#cc)">
        <image class="face-img"
          href="${mesh}"
          width="244" height="244" x="18" y="18"
          preserveAspectRatio="xMidYMid meet"/>
      </g>

      <g clip-path="url(#cc)">
        <rect class="scan-bar" x="18" y="18" width="244" height="26" fill="url(#sg)"/>
      </g>

      <g stroke="${FB_BLUE}" stroke-width="2.5" fill="none" opacity="0.85">
        <path d="M42,62 L42,48 L56,48"/>
        <path d="M224,48 L238,48 L238,62"/>
        <path d="M42,222 L42,236 L56,236"/>
        <path d="M224,236 L238,236 L238,222"/>
      </g>
    </svg>
  </div>

  <div class="lbl">
    <p class="lbl-main">Verifying...</p>
    <p class="lbl-sub">Please wait a moment</p>
  </div>
</div>
</body>
</html>`;
}

type FacialRecognitionCssProps = {
  height?: number;
};

export function FacialRecognitionCss({ height = 400 }: FacialRecognitionCssProps) {
  const html = useMemo(() => buildScanHtml(), []);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: FB_BG,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
