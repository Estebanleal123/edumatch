import { useId } from "react";

export default function Logo({ size = 44 }) {
  const raw = useId().replace(/:/g, "");
  const fill = `url(#${raw})`;
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={raw} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0a07a" />
          <stop offset="100%" stopColor="#e07a4f" />
        </linearGradient>
      </defs>
      <path
        fill={fill}
        d="M32 6c-5.2 0-9.4 2.6-11.6 6.6-5.2-.8-10.4 3-10.4 8.4 0 1.8.6 3.4 1.6 4.8C8.2 28 6 32.2 6.6 36.8 7.4 43 13 47.6 19.2 48c1.2 5.2 6 9.2 12.8 9.2s11.6-4 12.8-9.2c6.2-.4 11.8-5 12.6-11.2.6-4.6-1.6-8.8-5-11 1-1.4 1.6-3 1.6-4.8 0-5.4-5.2-9.2-10.4-8.4C41.4 8.6 37.2 6 32 6z"
      />
      <path
        d="M32 16v30M22 24c2.4 2.2 4.2 2.2 6.2 0M36 24c2.2 2.2 4 2.2 6.2 0M21 33c2.8 2 5 2 7.4 0M36 33c2.6 2 4.8 2 7.2 0"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
