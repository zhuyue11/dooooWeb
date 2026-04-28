interface StubPageProps {
  title: string;
  description?: string;
}

export function StubPage({ title, description }: StubPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-2xl font-bold text-(--el-page-text)">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-(--el-page-text) opacity-60">{description}</p>
      )}
      <div className="mt-6 rounded-(--radius-card) border border-dashed border-(--el-card-border) px-8 py-4 text-sm text-(--el-page-text) opacity-60">
        Coming soon
      </div>
    </div>
  );
}
