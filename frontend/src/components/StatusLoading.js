import text from '../lib/text';

const StatusLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#0E207F]" />
      <p className="text-sm text-slate-500">{text.loading.checkingStatus}</p>
    </div>
  );
};

export default StatusLoading;
