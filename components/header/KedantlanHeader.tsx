'use client';

import { useEffect, useRef } from 'react';
import { mountKedantlanHeader } from './kedantlan-header';

type Props = {
  /** Where tiles/ and region.json are served. Default '/kedantlan-header/' (public/kedantlan-header/). */
  base?: string;
  /** Optional link shown as a button, for example to the full atlas. */
  atlasHref?: string;
  atlasLabel?: string;
  /** Draw the Kedantlan region outline. Default true. */
  outline?: boolean;
  className?: string;
};

export default function KedantlanHeader({ base, atlasHref, atlasLabel, outline, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return mountKedantlanHeader(ref.current, { base, atlasHref, atlasLabel, outline });
  }, [base, atlasHref, atlasLabel, outline]);
  return <div ref={ref} className={className} />;
}
