interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 36, className = '' }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 1025 1025"
      className={className}
    >
      <defs>
        <clipPath id="eye-cutout">
          <path
            d="M 0 0 H 1025 V 1025 H 0 Z M 768.5 512.5 a 128 128 0 1 0 0.001 0 Z"
            clipRule="evenodd"
          />
        </clipPath>
      </defs>
      <g clipPath="url(#eye-cutout)" fill="var(--el-logo-fill)">
        <ellipse cx="128.5" cy="128.5" rx="128" ry="128" />
        <ellipse cx="128.5" cy="384.5" rx="128" ry="128" />
        <ellipse cx="128.5" cy="640.5" rx="128" ry="128" />
        <ellipse cx="128.5" cy="896.5" rx="128" ry="128" />
        <path d="M 128.5 0.5 Q 1024.5 0.5 1024.5 512.5 Q 1024.5 1024.5 128.5 1024.5 Z" />
      </g>
      <ellipse cx="768.5" cy="640.5" rx="32" ry="32" fill="var(--el-logo-fill)" />
      <ellipse cx="768.5" cy="736.5" rx="40" ry="64" fill="var(--el-logo-fill)" />
    </svg>
  );
}
