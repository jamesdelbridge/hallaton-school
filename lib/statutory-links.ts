export const statutoryReports = [
  { id: "home-report-ofsted", label: "Ofsted report", target: "ofsted-and-siams" },
  { id: "home-report-ks2", label: "KS2 performance", target: "ks2-performance" },
  { id: "home-report-send", label: "SEND and Local Offer", target: "send-information" },
  { id: "home-report-admissions", label: "Admissions", target: "admissions-information" },
  { id: "home-report-pupil", label: "Pupil Premium", target: "pupil-premium" },
  { id: "home-report-sports", label: "Sports Premium", target: "pupil-premium" },
] as const;

export function validStatutoryLink(value: string) {
  if (!value) return true;
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
