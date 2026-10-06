const GOVERNORATES: Record<string, string> = {
  "01": "القاهرة",
  "02": "الإسكندرية",
  "03": "بورسعيد",
  "04": "السويس",
  "11": "دمياط",
  "12": "الدقهلية",
  "13": "الشرقية",
  "14": "القليوبية",
  "15": "كفر الشيخ",
  "16": "الغربية",
  "17": "المنوفية",
  "18": "البحيرة",
  "19": "الإسماعيلية",
  "21": "الجيزة",
  "22": "بني سويف",
  "23": "الفيوم",
  "24": "المنيا",
  "25": "أسيوط",
  "26": "سوهاج",
  "27": "قنا",
  "28": "أسوان",
  "29": "الأقصر",
  "31": "البحر الأحمر",
  "32": "الوادي الجديد",
  "33": "مطروح",
  "34": "شمال سيناء",
  "35": "جنوب سيناء",
  "88": "خارج الجمهورية",
};

export type NationalIdInfo = {
  nationalId: string;
  birthDate: string;
  age: number;
  gender: "ذكر" | "أنثى";
  governorate: string;
  yearsToRetirement: number;
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function parseEgyptianNid(raw: string | null | undefined, retirementAge = 60): NationalIdInfo | null {
  const nationalId = (raw ?? "").replace(/\D/g, "");
  if (nationalId.length !== 14) return null;
  const centuryDigit = nationalId[0];
  const century = centuryDigit === "2" ? 1900 : centuryDigit === "3" ? 2000 : null;
  if (century == null) return null;
  const year = century + Number(nationalId.slice(1, 3));
  const month = Number(nationalId.slice(3, 5));
  const day = Number(nationalId.slice(5, 7));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age -= 1;
  const serial = Number(nationalId.slice(9, 13));
  const gender: "ذكر" | "أنثى" = serial % 2 === 1 ? "ذكر" : "أنثى";
  const govCode = nationalId.slice(7, 9);
  return {
    nationalId,
    birthDate: `${year}-${pad(month)}-${pad(day)}`,
    age,
    gender,
    governorate: GOVERNORATES[govCode] ?? `كود ${govCode}`,
    yearsToRetirement: retirementAge - age,
  };
}
