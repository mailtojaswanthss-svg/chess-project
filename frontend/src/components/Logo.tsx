import React, { useId } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * ChessWise AI mark: a knight on a two-tone board square in the board's own
 * green and cream, with a small spark for the AI coach.
 */
export const Logo: React.FC<LogoProps> = ({ size = 40, className }) => {
  const uid = useId().replace(/:/g, "");
  const tile = `cw-tile-${uid}`;
  const shine = `cw-shine-${uid}`;
  return (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 48 48"
    role="img"
    aria-label="ChessWise AI"
  >
    <defs>
      <clipPath id={tile}>
        <rect x="1" y="1" width="46" height="46" rx="13" />
      </clipPath>
      <linearGradient id={shine} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g clipPath={`url(#${tile})`}>
      <rect width="48" height="48" fill="#769656" />
      <rect width="24" height="24" fill="#eeeed2" />
      <rect x="24" y="24" width="24" height="24" fill="#eeeed2" />
      <rect width="48" height="48" fill={`url(#${shine})`} />
    </g>
    {/* Knight, facing left, on a pedestal */}
    <path
      d="M16.5 36C16.2 31.4 18.6 28.4 21.2 26.2L14.6 26.8C12.4 27 10.6 25.4 11.1 23.2L12.9 19C14.6 14.9 18.2 12.2 22.1 11.4L22.8 7.6L26.4 10.6C31.4 11.6 35.2 16.2 35.2 23C35.2 28.2 33.6 32.4 32.6 36Z"
      fill="#14200f"
      stroke="#eeeed2"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <rect x="12.5" y="35.5" width="23" height="5" rx="2" fill="#14200f" stroke="#eeeed2" strokeWidth="1.5" />
    <path d="M27.5 14.2C30.6 16 32.4 19.4 32.4 23.6" fill="none" stroke="#769656" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="18.6" cy="17.6" r="1.35" fill="#eeeed2" />
    {/* AI spark */}
    <path
      d="M38.5 6.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z"
      fill="#ffffff"
      stroke="#14200f"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <rect x="1" y="1" width="46" height="46" rx="13" fill="none" stroke="#14200f" strokeOpacity="0.35" strokeWidth="1.5" />
  </svg>
);
};
