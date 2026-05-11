import Image from 'next/image';

/**
 * OCS brand logo component.
 * variant="icon" — S-mark only (square, for small contexts)
 * variant="full" — S-mark + "Open Cap Stack" wordmark (for wider contexts)
 * color="dark" (default) — dark mark on light/transparent bg
 * color="light" — white/light mark for dark backgrounds
 */
export default function OCSLogo({ variant = 'full', color = 'dark', className = '', height = 32 }) {
  if (variant === 'icon') {
    return (
      <Image
        src="/ocs-icon.png"
        alt="Open Cap Stack"
        width={height}
        height={height}
        className={className}
        style={color === 'light' ? { filter: 'invert(1) brightness(2)' } : {}}
      />
    );
  }

  // Full lockup: icon + wordmark
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/ocs-icon.png"
        alt=""
        width={height}
        height={height}
        style={color === 'light' ? { filter: 'invert(1) brightness(2)' } : {}}
      />
      <span
        className="font-bold leading-tight"
        style={{
          fontSize: height * 0.5,
          color: color === 'light' ? 'white' : '#111827',
          lineHeight: 1.1,
        }}
      >
        Open Cap Stack
      </span>
    </span>
  );
}
