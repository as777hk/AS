export type Studio = { _id: string; title: string; category: string; hourlyRate: number; securityDeposit: number; maxCapacity: number; location: string; imageUrl: string; gallery?: string[]; amenities: string[]; overview: string; ownerName: string; ownerEmail: string; rating?: number; reviewCount?: number; createdAt?: string };
export type Review = { _id: string; studioId: string; authorName: string; rating: number; comment: string; createdAt?: string };
export type Booking = { _id: string; studioId: string; studioTitle: string; date: string; startTime: string; endTime: string; hours: number; hourlyRate: number; securityDeposit: number; totalAmount: number; status: "Pending" | "Confirmed" | "Completed" | "Cancelled"; customerEmail: string; customerName: string; ownerEmail: string };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/server${path}`, { ...init, credentials: "same-origin", headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
  return payload as T;
}
export const api = {
  studios: (query = "") => request<{ data: Studio[]; total: number }>(`/studios${query}`),
  featured: () => request<{ data: Studio[] }>("/studios/featured?limit=6&sort=newest"),
  studio: (id: string) => request<{¶»§q«^t‰ÕÍ”±¥•¹Ðˆì)¥µÁ½ÉÐìÉ•…Ñ•ÕÑ¡±¥•¹Ðô™É½´€‰‰•ÑÑ•Èµ…ÕÑ ½É•…Ðˆì)¥µÁ½ÉÐì©ÝÑ±¥•¹Ðô™É½´€‰‰•ÑÑ•Èµ…ÕÑ ½±¥•¹Ð½Á±Õ¥¹Ìˆì)•áÁ½ÉÐ½¹ÍÐ…ÕÑ¡±¥•¹Ð€ôÉ•…Ñ•ÕÑ¡±¥•¹Ð¡ìÁ±Õ¥¹Ìèm©ÝÑ±¥•¹Ð ¥tô¤ì)•áÁ½ÉÐ…Íå¹Œ™Õ¹Ñ¥½¸Íå¹ÕÑ¡½½­¥” ¤ì(€½¹ÍÐì‘…Ñ„°•ÉÉ½Èô€ô…Ý…¥Ð…ÕÑ¡±¥•¹Ð¹Ñ½­•¸ ¤ì(€¥˜€¡•ÉÉ½Èñð€…‘…Ñ„ü¹Ñ½­•¸¤Ñ¡É½Ü¹•ÜÉÉ½È¡•ÉÉ½Èü¹µ•ÍÍ…”ñð€‰½Õ±¹½ÐÉ•…Ñ”Í•ÕÉ”A$Í•ÍÍ¥½¸¸ˆ¤ì(€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð™•Ñ  ˆ½…Á¤½…ÕÑ ½½½­¥”ˆ°ìµ•Ñ¡½è€‰A=MPˆ°¡•…‘•ÉÌèì€‰½¹Ñ•¹ÐµQåÁ”ˆè€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆô°‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡ìÑ½­•¸è‘…Ñ„¹Ñ½­•¸ô¤ô¤ì(€¥˜€ …É•ÍÁ½¹Í”¹½¬¤Ñ¡É½Ü¹•ÜÉÉ½È ‰½Õ±¹½Ð•ÍÑ…‰±¥Í Ñ¡”Í•ÕÉ”A$Í•ÍÍ¥½¸¸ˆ¤ì)ô