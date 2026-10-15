import { LEVEL_LABEL, type LevelFilter } from '../data/words';
import { useProgress } from '../contexts/ProgressContext';

const LEVELS: LevelFilter[] = ['basic', 'advanced', 'mine', 'all'];

export default function LevelPicker() {
  const { level, setLevel } = useProgress();
  return (
    <div className="inline-flex bg-white border-2 border-paper-line rounded-full p-1 gap-1 shadow-pop">
      {LEVELS.map((l) => (
        <button
          key={l}
          onClick={() => setLevel(l)}
          className={`px-3.5 py-1.5 rounded-full font-display text-[15px] whitespace-nowrap transition ${
            level === l ? 'bg-sunny text-ink' : 'text-ink-mute hover:bg-sunny-soft'
          }`}
        >
          {LEVEL_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
