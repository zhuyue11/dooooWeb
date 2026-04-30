import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { isHtml } from '@/utils/html';

interface CollapsibleDescriptionProps {
  content: string;
  collapsedHeight?: number;
  collapsible?: boolean;
  className?: string;
}

export function CollapsibleDescription({
  content,
  collapsedHeight = 220,
  collapsible = true,
  className,
}: CollapsibleDescriptionProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  useEffect(() => {
    if (!collapsible || !contentRef.current) return;
    const height = contentRef.current.scrollHeight;
    setNeedsCollapse(height > collapsedHeight + 40); // 40px buffer to avoid collapsing trivially
  }, [content, collapsedHeight, collapsible]);

  const isCollapsed = collapsible && needsCollapse && !expanded;
  const html = isHtml(content);
  // Content is sanitized via DOMPurify before rendering as HTML
  const sanitizedHtml = html ? DOMPurify.sanitize(content) : '';

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={contentRef}
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: isCollapsed ? `${collapsedHeight}px` : undefined }}
        >
          {html ? (
            <div
              className="rich-text text-sm text-(--el-panel-description)"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : (
            <p className="text-sm leading-relaxed text-(--el-panel-description)">{content}</p>
          )}
        </div>
        {/* Gradient fade when collapsed */}
        {isCollapsed && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{ background: 'linear-gradient(transparent, var(--el-panel-bg))' }}
          />
        )}
      </div>
      {needsCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs font-medium text-(--el-btn-primary-bg) hover:opacity-80"
        >
          {expanded ? t('itemView.showLess') : t('itemView.showMore')}
        </button>
      )}
    </div>
  );
}
