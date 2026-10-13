export interface Poster {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Motivation artwork in /public/images. The quote text is part of each image, so `alt` repeats it. */
export const POSTERS: Poster[] = [
  {
    src: "/images/consistency-beats-talent.png",
    alt: "Motivation poster: “Consistency beats talent when talent stops practicing.” A developer with a laptop and books overlooks a glowing futuristic city at sunset.",
    width: 1091,
    height: 1442,
  },
  {
    src: "/images/small-progress-big-results.png",
    alt: "Motivation poster: “Small progress every day adds up to big results.” A hiker stands on a cliff facing a purple mountain sunrise.",
    width: 1091,
    height: 1442,
  },
];
