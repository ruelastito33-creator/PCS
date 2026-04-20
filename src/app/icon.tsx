import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
          borderRadius: "38px",
          fontSize: 80,
          fontWeight: 700,
          color: "white",
          letterSpacing: "-2px",
        }}
      >
        PCS
      </div>
    ),
    { ...size }
  );
}
