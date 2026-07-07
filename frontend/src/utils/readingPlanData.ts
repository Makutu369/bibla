import { ReadingPlan } from '../types/plan';

// Bible books with chapter counts for building reading plans
const BOOK_CHAPTERS: { bookNumber: number; chapters: number }[] = [
  // Genesis through Revelation
  { bookNumber: 10, chapters: 50 },   // Genesis
  { bookNumber: 20, chapters: 40 },   // Exodus
  { bookNumber: 30, chapters: 27 },   // Leviticus
  { bookNumber: 40, chapters: 36 },   // Numbers
  { bookNumber: 50, chapters: 34 },   // Deuteronomy
  { bookNumber: 60, chapters: 24 },   // Joshua
  { bookNumber: 70, chapters: 21 },   // Judges
  { bookNumber: 75, chapters: 4 },    // Ruth
  { bookNumber: 80, chapters: 31 },   // 1 Samuel
  { bookNumber: 90, chapters: 24 },   // 2 Samuel
  { bookNumber: 100, chapters: 22 },  // 1 Kings
  { bookNumber: 110, chapters: 25 },  // 2 Kings
  { bookNumber: 120, chapters: 29 },  // 1 Chronicles
  { bookNumber: 130, chapters: 36 },  // 2 Chronicles
  { bookNumber: 140, chapters: 10 },  // Ezra
  { bookNumber: 150, chapters: 13 },  // Nehemiah
  { bookNumber: 155, chapters: 10 },  // Esther
  { bookNumber: 160, chapters: 42 },  // Job
  { bookNumber: 170, chapters: 150 }, // Psalms
  { bookNumber: 180, chapters: 31 },  // Proverbs
  { bookNumber: 190, chapters: 12 },  // Ecclesiastes
  { bookNumber: 195, chapters: 8 },   // Song of Solomon
  { bookNumber: 200, chapters: 66 },  // Isaiah
  { bookNumber: 210, chapters: 52 },  // Jeremiah
  { bookNumber: 220, chapters: 5 },   // Lamentations
  { bookNumber: 230, chapters: 48 },  // Ezekiel
  { bookNumber: 240, chapters: 12 },  // Daniel
  { bookNumber: 250, chapters: 14 },  // Hosea
  { bookNumber: 260, chapters: 3 },   // Joel
  { bookNumber: 270, chapters: 9 },   // Amos
  { bookNumber: 275, chapters: 1 },   // Obadiah
  { bookNumber: 280, chapters: 4 },   // Jonah
  { bookNumber: 285, chapters: 7 },   // Micah
  { bookNumber: 290, chapters: 3 },   // Nahum
  { bookNumber: 295, chapters: 3 },   // Habakkuk
  { bookNumber: 300, chapters: 1 },   // Zephaniah
  { bookNumber: 305, chapters: 2 },   // Haggai
  { bookNumber: 310, chapters: 14 },  // Zechariah
  { bookNumber: 315, chapters: 4 },   // Malachi
  { bookNumber: 320, chapters: 28 },  // Matthew
  { bookNumber: 330, chapters: 16 },  // Mark
  { bookNumber: 340, chapters: 24 },  // Luke
  { bookNumber: 350, chapters: 21 },  // John
  { bookNumber: 360, chapters: 28 },  // Acts
  { bookNumber: 370, chapters: 16 },  // Romans
  { bookNumber: 380, chapters: 16 },  // 1 Corinthians
  { bookNumber: 390, chapters: 13 },  // 2 Corinthians
  { bookNumber: 400, chapters: 6 },   // Galatians
  { bookNumber: 410, chapters: 6 },   // Ephesians
  { bookNumber: 420, chapters: 4 },   // Philippians
  { bookNumber: 430, chapters: 4 },   // Colossians
  { bookNumber: 440, chapters: 5 },   // 1 Thessalonians
  { bookNumber: 450, chapters: 3 },   // 2 Thessalonians
  { bookNumber: 460, chapters: 5 },   // 1 Timothy
  { bookNumber: 470, chapters: 3 },   // 2 Timothy
  { bookNumber: 480, chapters: 3 },   // Titus
  { bookNumber: 485, chapters: 1 },   // Philemon
  { bookNumber: 490, chapters: 13 },  // Hebrews
  { bookNumber: 500, chapters: 5 },   // James
  { bookNumber: 510, chapters: 5 },   // 1 Peter
  { bookNumber: 520, chapters: 3 },   // 2 Peter
  { bookNumber: 530, chapters: 5 },   // 1 John
  { bookNumber: 540, chapters: 1 },   // 2 John
  { bookNumber: 545, chapters: 1 },   // 3 John
  { bookNumber: 550, chapters: 1 },   // Jude
  { bookNumber: 560, chapters: 22 },  // Revelation
];

function buildDailyPlan(days: number): ReadingPlan {
  const allReadings: { bookNumber: number; chapter: number }[] = [];
  for (const book of BOOK_CHAPTERS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      allReadings.push({ bookNumber: book.bookNumber, chapter: ch });
    }
  }

  const chaptersPerDay = Math.ceil(allReadings.length / days);
  const planDays: { day: number; readings: { bookNumber: number; chapter: number }[] }[] = [];
  for (let i = 0; i < days; i++) {
    const start = i * chaptersPerDay;
    const readings = allReadings.slice(start, start + chaptersPerDay);
    planDays.push({ day: i + 1, readings });
  }

  return {
    id: 'bible-in-a-year',
    name: 'Bible in a Year',
    days: planDays,
  };
}

export const BIBLE_READING_PLAN = buildDailyPlan(365);
