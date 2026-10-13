import Image from "next/image";

export function PosterCard() {
  return (
    <section aria-label="Motivation poster" className="glass rise overflow-hidden rounded-2xl p-2">
      <div className="relative overflow-hidden rounded-xl">
        <Image
          src="/images/consistency-beats-talent.png"
          alt="Motivation poster: Consistency beats talent when talent stops practicing."
          width={1091}
          height={1442}
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 60vw, 92vw"
          className="rise h-auto w-full"
        />
      </div>
    </section>
  );
}
