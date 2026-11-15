import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { Camera } from "lucide-react";
import type { LandingPhoto } from "@/lib/landing/photos";

/**
 * One landing-page photo. Server component: it checks at render time whether
 * the file is in /public/landing and falls back to a labelled placeholder.
 * The parent sets the size and shape; this fills it.
 */
export default function PhotoSlot({
  photo,
  sizes,
  className = "",
  caption = true,
}: {
  photo: LandingPhoto;
  /** next/image `sizes`, e.g. "(min-width: 1024px) 220px, 40vw". */
  sizes: string;
  className?: string;
  /** false hides the overlaid caption (credit it elsewhere on the page instead). */
  caption?: boolean;
}) {
  const hasFile = existsSync(path.join(process.cwd(), "public", "landing", photo.file));

  return (
    <figure className={`relative overflow-hidden ${className}`}>
      {hasFile ? (
        <Image src={`/landing/${photo.file}`} alt={photo.alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className={`flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center ${photo.tint}`}>
          <Camera className="size-6" strokeWidth={1.5} aria-hidden />
          <span className="text-[13px] leading-tight font-semibold">{photo.label}</span>
          <span className="text-[11px] leading-tight opacity-80">Photo goes here</span>
        </div>
      )}
      {hasFile && caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-7 pb-2 text-[12px] leading-tight font-semibold text-white">
          {photo.label}
          {photo.credit && (
            <span className="block text-[10px] font-normal opacity-90">
              Photo: {photo.credit}
              {photo.license && `, ${photo.license}`}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
