export const PREVIEW_IMAGE_WIDTH = 1200;
export const PREVIEW_IMAGE_HEIGHT = 675;

export const LINE_OA_URL = "https://lin.ee/wNUnj5c";
export const CONTACT_EMAIL = "superchoice@hotmail.com";

export type Preview = {
  slug: string;
  business: string;
};

export const PREVIEWS: Record<string, Preview> = {
  buycarthailand: { slug: "buycarthailand", business: "BuycarThailand" },
  "ts-motorsport": { slug: "ts-motorsport", business: "TS Motorsport" },
  "g2c-glass-coating": { slug: "g2c-glass-coating", business: "G2C ศูนย์เคลือบแก้วรถยนต์" },
  "armor-diamond": { slug: "armor-diamond", business: "Armor Diamond" },
  "d-fent": { slug: "d-fent", business: "D-FENT Thailand" },
  youngmeedee: { slug: "youngmeedee", business: "Youngmeedee Car Care" },
  "elite-auto-rent": { slug: "elite-auto-rent", business: "Elite Auto Rent" },
  "mayrisa-clinic": { slug: "mayrisa-clinic", business: "เมริษา คลินิก" },
  "wellogy-clinic": { slug: "wellogy-clinic", business: "Wellogy Clinic" },
  "linna-clinic": { slug: "linna-clinic", business: "LINNA Clinic" },
  "celia-clinic-phuket": { slug: "celia-clinic-phuket", business: "Celia Clinic Phuket" },
  "sea-aesthetic": { slug: "sea-aesthetic", business: "SEA Aesthetic And Wellness" },
  "siam-clinic-phuket": { slug: "siam-clinic-phuket", business: "Siam Clinic Phuket" },
  "ponsarin-clinic": { slug: "ponsarin-clinic", business: "PONSARIN Clinic" },
  "yoskarn-clinic": { slug: "yoskarn-clinic", business: "ยศการ คลินิก" },
  "casa-dental": { slug: "casa-dental", business: "CASA Dental Clinic" },
  "bangkok-dental-spa": { slug: "bangkok-dental-spa", business: "Bangkok Dental Spa" },
  "the-smile-bar": { slug: "the-smile-bar", business: "The Smile Bar" },
  "pmdc-dental": { slug: "pmdc-dental", business: "PMDC Dental" },
  narongpotiket: { slug: "narongpotiket", business: "Narongpotiket" },
  "the-next-optical": { slug: "the-next-optical", business: "THE NEXT Optical" },
  "so-thai-spa": { slug: "so-thai-spa", business: "So Thai Spa Bangkok" },
  "erawan-thai-massage": {
    slug: "erawan-thai-massage",
    business: "Erawan Thai Massage and Head Spa",
  },
  "top-thai-massage": { slug: "top-thai-massage", business: "ท็อปไทยมาสสาจ" },
  "wannapha-sense-spa": { slug: "wannapha-sense-spa", business: "Wannapha Sense Spa" },
  "asmr-massage": { slug: "asmr-massage", business: "ASMR Massage & Wellness" },
  "albatross-cafe": { slug: "albatross-cafe", business: "Albatross Café" },
  "chim-chim": { slug: "chim-chim", business: "Chim Chim Restaurant" },
  "i-sang": { slug: "i-sang", business: "I-Sang" },
  sorn: { slug: "sorn", business: "SORN" },
  tamtam: { slug: "tamtam", business: "TamTam Restaurant & Cafe" },
  foodees: { slug: "foodees", business: "Foodee’s" },
  "mornii-bakery": { slug: "mornii-bakery", business: "Mornii Bakery" },
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function previewBySlug(slug: string): Preview | null {
  if (!SLUG.test(slug)) return null;
  return PREVIEWS[slug] ?? null;
}
