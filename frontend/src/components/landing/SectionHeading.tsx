import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  children,
  id,
  align = 'left',
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  id?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-[clamp(2rem,3.5vw,3rem)] font-semibold">
        {title}
      </h2>
      {children && <p className="mt-4 text-fg-muted">{children}</p>}
    </div>
  );
}
