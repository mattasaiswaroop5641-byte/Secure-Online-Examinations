import React from 'react';
import { QuestionStudent, AnswerState } from '../../types';
import { Bookmark, CheckCircle2, Circle } from 'lucide-react';

interface QuestionPaletteProps {
  questions: QuestionStudent[];
  currentIndex: number;
  answers: Record<number, AnswerState>;
  onSelectQuestion: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  answers,
  onSelectQuestion,
}) => {
  // Compute counts
  let answeredCount = 0;
  let markedCount = 0;

  questions.forEach((q) => {
    const ans = answers[q.id];
    if (ans && ans.selected_option_id !== null) {
      answeredCount++;
    }
    if (ans && ans.is_marked_for_review) {
      markedCount++;
    }
  });

  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-lg">
      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3">Question Palette</h4>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-[11px]">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-center">
          <p className="font-bold text-sm">{answeredCount}</p>
          <span className="text-[10px] text-emerald-300">Answered</span>
        </div>
        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 text-center">
          <p className="font-bold text-sm">{markedCount}</p>
          <span className="text-[10px] text-purple-300">Marked</span>
        </div>
        <div className="p-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-300 text-center">
          <p className="font-bold text-sm">{unansweredCount}</p>
          <span className="text-[10px] text-slate-400">Remaining</span>
        </div>
      </div>

      {/* Questions Numbers Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            const isAnswered = ans && ans.selected_option_id !== null;
            const isMarked = ans && ans.is_marked_for_review;
            const isCurrent = idx === currentIndex;

            let btnClass = 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border-slate-700/60';

            if (isAnswered && isMarked) {
              btnClass = 'bg-purple-600 text-white border-purple-400 font-bold';
            } else if (isAnswered) {
              btnClass = 'bg-emerald-600 text-white border-emerald-400 font-bold';
            } else if (isMarked) {
              btnClass = 'bg-purple-900/60 text-purple-300 border-purple-500/60 font-medium';
            }

            if (isCurrent) {
              btnClass += ' ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 border-transparent shadow-md';
            }

            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(idx)}
                className={`relative aspect-square flex items-center justify-center rounded-xl text-xs border transition-all ${btnClass}`}
              >
                <span>{idx + 1}</span>
                {isMarked && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 border border-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
