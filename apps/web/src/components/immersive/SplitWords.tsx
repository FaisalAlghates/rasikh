import { Fragment, type CSSProperties } from 'react';
import { cn } from '@/components/ui/cn';

/**
 * Kinetic headline: each word rises out of a mask. Works without JavaScript (CSS animation).
 * With `onView` the animation waits until the headline scrolls into view.
 */
export function SplitWords({
  text,
  className,
  onView = false,
  delay = 0,
}: {
  text: string;
  className?: string;
  onView?: boolean;
  delay?: number;
}) {
  return (
    <span className={cn('words', className)} data-reveal-words={onView ? '' : undefined}>
      {text.split(' ').map((word, i) => (
        <Fragment key={i}>
          <span className="w">
            <span style={{ '--i': i + delay } as CSSProperties}>{word}</span>
          </span>{' '}
        </Fragment>
      ))}
    </span>
  );
}
