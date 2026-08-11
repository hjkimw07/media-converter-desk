import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  turbopack: {
    root: projectRoot,
  },
  // 교차 출처 격리를 켜면 SharedArrayBuffer가 열리고, 이미지 Worker 안의 wasm 인코더가
  // 멀티스레드 빌드로 승격됩니다. 실측상 1920x1920 AVIF 인코딩이 2639ms -> 1444ms.
  // 헤더가 전달되지 않는 환경에서도 단일스레드로 동작하므로 기능이 깨지지는 않습니다.
  //
  // 주의: COEP require-corp는 CORP/CORS 헤더가 없는 교차 출처 리소스를 차단합니다.
  // 현재 외부 리소스는 FFmpeg 코어를 받는 unpkg 하나뿐이고 CORP: cross-origin을 보냅니다.
  // 외부 폰트/이미지/스크립트를 추가할 때는 해당 호스트의 헤더를 먼저 확인하세요.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
