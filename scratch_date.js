const formatYMD = (d) => {
  // Ensure local timezone doesn't mess up the date by doing timezone offset math
  // or just use UTC
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

const startDate = '2026-06-30';
const parseDate = (dString) => new Date(dString + "T00:00:00");

const target = parseDate(startDate);

// 1. today
const d1 = formatYMD(target);

// 2. today LY
const targetLY = new Date(target);
targetLY.setFullYear(targetLY.getFullYear() - 1);
const d2 = formatYMD(targetLY);

// 3. mtd
const mtdStart = new Date(target);
mtdStart.setDate(1);
const d3_start = formatYMD(mtdStart);
const d3_end = formatYMD(target);

// 4. mtd LY
const mtdStartLY = new Date(mtdStart);
mtdStartLY.setFullYear(mtdStartLY.getFullYear() - 1);
const d4_start = formatYMD(mtdStartLY);
const d4_end = formatYMD(targetLY);

console.log("Today:", d1, d1);
console.log("TodayLY:", d2, d2);
console.log("MTD:", d3_start, d3_end);
console.log("MTDLY:", d4_start, d4_end);
