import { useId } from "react";

export default function Logo({ tone = "mix", size = 44 }) {
  const raw = useId().replace(/:/g, "");
  const fill = tone === "hombre" ? "#3b82f6" : tone === "mujer" ? "#fb4b93" : `url(#${raw})`;
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={raw} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#fb4b93" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill={fill} />
      <text x="24" y="31" textAnchor="middle" fontSize="22" fontFamily="Segoe UI, sans-serif" fontWeight="700" fill="#fff">
        E
      </text>
    </svg>
  );
}
