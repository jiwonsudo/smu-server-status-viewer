import text from '../../lib/text';

export const metadata = {
  title: `${text.privacy.title} | ${text.site.name}`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">{text.privacy.title}</h1>
      <p className="mt-1 text-xs text-slate-500">{text.privacy.updated}</p>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">{text.privacy.intro}</p>

      <div className="mt-6 flex flex-col gap-6">
        {text.privacy.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="font-semibold text-slate-800">{section.heading}</h2>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-600">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
