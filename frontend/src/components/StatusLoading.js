import text from '../lib/text';

const StatusLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-sm text-muted-foreground">{text.loading.checkingStatus}</p>
    </div>
  );
};

export default StatusLoading;
