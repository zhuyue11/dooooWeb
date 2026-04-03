interface StubPageProps {
  title: string;
  description?: string;
}

export function StubPage({ title, description }: StubPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-6 rounded-lg border border-dashed border-border px-8 py-4 text-sm text-muted-foreground">
        Coming soon
      </div>
    </div>
  );
}
