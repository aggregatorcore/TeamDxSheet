/**
 * WhatsApp Desktop app open karta hai (whatsapp:// protocol).
 * App installed honi chahiye.
 */
export function openWhatsApp(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.click();
}

export function getWaChatUrl(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const withCountry = cleaned.length === 10 ? "91" + cleaned : cleaned;
  return `whatsapp://send?phone=${withCountry}`;
}
