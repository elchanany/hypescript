/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cross-origin isolation — נדרש ל-SharedArrayBuffer של ffmpeg.wasm הרב-תהליכי
  // (core-mt) לרינדור מהיר. הליבה נטענת דרך toBlobURL (blob same-origin), כך
  // שהכותרות האלה לא חוסמות אותה.
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

module.exports = nextConfig;
