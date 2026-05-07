interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 text-muted/40">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-foreground/70 mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted/60 mb-4 max-w-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
