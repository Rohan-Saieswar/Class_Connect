import QRCode from "qrcode";

/**
 * Generates a high-quality Data URL (Base64 PNG) for a given URL or text payload
 */
export async function generateQrDataUrl(
  payload: string,
  options?: {
    color?: { dark?: string; light?: string };
    width?: number;
  }
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      width: options?.width || 300,
      margin: 2,
      color: {
        dark: options?.color?.dark || "#0f172a",
        light: options?.color?.light || "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
    return dataUrl;
  } catch (err) {
    console.error("QR Code generation error:", err);
    return "";
  }
}
