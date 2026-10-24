import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import React from "react";
import { ImageResponse } from "next/og.js";

// Colores de los iconos actuales de public/icons, de la paleta anterior a Mi Rincón.
// Para rehacerlos con la de ahora, usa los valores de --accent y --text de app/globals.css
// y ejecuta `npm run iconos`.
const ACCENT = "#1e7480";
const INK = "#0a0b0d";

const e = React.createElement;

function oliveBranchIcon(size) {
  const glyph = Math.round(size * 0.62);

  return e(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: INK,
        borderRadius: Math.round(size * 0.22),
      },
    },
    e(
      "svg",
      {
        width: glyph,
        height: glyph,
        viewBox: "0 0 140 140",
        fill: "none",
        stroke: ACCENT,
        strokeWidth: 7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
      e("path", { d: "M40 100 Q70 40 104 44" }),
      e("ellipse", {
        cx: 62,
        cy: 74,
        rx: 11,
        ry: 5,
        fill: ACCENT,
        stroke: "none",
        transform: "rotate(-38 62 74)",
      }),
      e("ellipse", {
        cx: 80,
        cy: 60,
        rx: 11,
        ry: 5,
        fill: ACCENT,
        stroke: "none",
        transform: "rotate(-30 80 60)",
      }),
      e("ellipse", {
        cx: 96,
        cy: 52,
        rx: 10,
        ry: 5,
        fill: ACCENT,
        stroke: "none",
        transform: "rotate(-22 96 52)",
      })
    )
  );
}

async function render(size, outPath) {
  const response = new ImageResponse(oliveBranchIcon(size), { width: size, height: size });
  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);
  console.log("wrote", outPath);
}

const root = path.resolve(import.meta.dirname, "..", "public");

await render(512, path.join(root, "icons", "icon-512.png"));
await render(192, path.join(root, "icons", "icon-192.png"));
await render(180, path.join(root, "icons", "apple-touch-icon.png"));
await render(32, path.join(root, "icons", "favicon.png"));
