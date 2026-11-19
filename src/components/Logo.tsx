interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="#0E0E10" />
      <rect x="2" y="2" width="60" height="60" rx="12" stroke="#3A3A40" strokeWidth="2" />
      <rect x="14" y="18" width="26" height="6" rx="3" fill="#FF8A3D" />
      <circle cx="46" cy="21" r="3.5" fill="#FFE45E" />
      <rect x="14" y="29" width="36" height="6" rx="3" fill="#FF8A3D" />
      <rect x="14" y="40" width="20" height="6" rx="3" fill="#FFF9EE" />
      <circle cx="40" cy="43" r="3" fill="#FF8A3D" />
    </svg>
  );
}
