/** A file in `public/`, with the base path of the static demo build (empty on the real site). */
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
