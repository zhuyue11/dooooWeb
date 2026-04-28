import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-(--radius-card) border border-(--el-card-border) bg-(--el-card-bg) p-(--spacing-card) shadow-(--shadow-card) ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
