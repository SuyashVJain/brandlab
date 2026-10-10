import type { MetadataRoute } from "next";

/** Web app manifest, served at /manifest.webmanifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BRAND LAB",
    short_name: "BRAND LAB",
    start_url: "/",
    display: "standalone",
    theme_color: "#FFD21F",
    background_color: "#EFECE6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
