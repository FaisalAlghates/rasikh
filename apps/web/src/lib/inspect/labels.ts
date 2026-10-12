import { splitRoomKey } from '@rasikh/shared';

type T = (key: string, values?: Record<string, string | number>) => string;

/** `bedroom_2` → "غرفة نوم 2". Numbered rooms share one translation plus their number. */
export function roomLabel(t: T, key: string): string {
  const { base, index } = splitRoomKey(key);
  const name = t(`room_${base}`);
  return index ? `${name} ${index}` : name;
}

export const itemLabel = (t: T, item: string) => t(`item_${item}`);
export const conditionLabel = (t: T, c: string) => t(`cond_${c}`);
