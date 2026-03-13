/**
 * WhatsApp Desktop app open karta hai (whatsapp:// protocol).
 * App installed honi chahiye.
 */
export function openWhatsApp(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.click();
}

/**
 * WhatsApp chat URL. Optional text pre-fills the message in the chat input.
 */
export function getWaChatUrl(phone: string, text?: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const withCountry = cleaned.length === 10 ? "91" + cleaned : cleaned;
  let url = `whatsapp://send?phone=${withCountry}`;
  if (text?.trim()) {
    url += "&text=" + encodeURIComponent(text.trim());
  }
  return url;
}
