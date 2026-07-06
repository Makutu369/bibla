import { ChevronDown } from 'lucide-react';
import { TranslationInfo } from '../types/bible';

interface TranslationPickerProps {
  translations: TranslationInfo[];
  currentTranslation: string;
  onSelect: (fileName: string) => void;
}

export function TranslationPicker({ translations, currentTranslation, onSelect }: TranslationPickerProps) {
  return (
    <div className="relative flex-shrink-0">
      <select value={currentTranslation} onChange={e => onSelect(e.target.value)}
        className="appearance-none h-8 pl-3 pr-7 text-[13px] font-medium bg-transparent border border-border rounded-full text-fg-secondary outline-none focus:border-border-focus cursor-pointer transition-colors">
        {translations.map(t => (
          <option key={t.fileName} value={t.fileName}>{t.displayName}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-muted pointer-events-none" />
    </div>
  );
}
