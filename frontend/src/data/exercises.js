// Shared exercise list. Images in public folder (paths from root).
const publicUrl = process.env.PUBLIC_URL || "";
const PLACEHOLDER = (text) => `https://placehold.co/600x400?text=${encodeURIComponent(text)}`;
export const EXERCISES = [
  {
    id: "tree-pose",
    name: "Tree Pose",
    short: "Balance",
    emoji: "🙏",
    imageUrl: `${publicUrl}/tree.jpeg`,
    description: "A standing yoga pose that improves balance, focus, and ankle stability.",
    youtubeUrl: "https://youtu.be/_u3NOB8pZf8?si=QZ3i70fQrfC3hd8G",
  },
  {
    id: "plank",
    name: "Plank",
    short: "Core",
    emoji: "🧍‍♀️",
    imageUrl: `${publicUrl}/Plank.jpg`,
    description: "A core-strength move that engages your abs, shoulders, and glutes in one hold.",
    youtubeUrl: "https://youtu.be/pvIjsG5Svck?si=1I7FvBx39s8vJ1Bn",
  },
  {
    id: "bicep-curl",
    name: "Bicep Curl",
    short: "Arms",
    emoji: "💪",
    imageUrl: `${publicUrl}/BIC2.jpeg`,
    description: "Targets the front of your upper arms with controlled curling of the weights.",
    youtubeUrl: "https://youtu.be/cBSD6mQIPQk?si=QLC1LmQVTWOWOefB",
  },
  {
    id: "squat",
    name: "Squat",
    short: "Legs",
    emoji: "🦵",
    imageUrl: `${publicUrl}/Squat.jpg`,
    description: "A fundamental lower-body move that works your quads, glutes, and core.",
    youtubeUrl: "https://youtu.be/xqvCmoLULNY?si=NmXOMObwcGDcLSwL",
  },
  {
    id: "pushup",
    name: "Push-up",
    short: "Upper body",
    emoji: "🏋🏻‍♂️",
    imageUrl: `${publicUrl}/pushup.jpg`,
    description: "Classic bodyweight press that trains chest, shoulders, and triceps.",
    youtubeUrl: "https://youtu.be/lsRAK6cr5kY?si=tbTxhh4WDFBTXNOK",
  },
  {
    id: "lunges",
    name: "Lunges",
    short: "Legs",
    emoji: "🧘🏽‍♀️",
    imageUrl: `${publicUrl}/Lunge.png`,
    description: "Alternating step exercise that builds single-leg strength and balance.",
    youtubeUrl: "https://youtu.be/9gglI77Kzq8?si=1rpluCADtCTs7woL",
  },
];

export function getExerciseById(id) {
  return EXERCISES.find((e) => e.id === id) || null;
}
