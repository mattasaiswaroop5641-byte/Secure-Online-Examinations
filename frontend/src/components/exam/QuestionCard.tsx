import React from 'react';
import { QuestionStudent, AnswerState } from '../../types';
import { Bookmark, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface QuestionCardProps {
  question: QuestionStudent;
  currentIndex: number;
  totalQuestions: number;
  currentAnswer?: AnswerState;
  onSelectOption: (optionId: number | null) => void;
  onToggleMarkReview: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  currentAnswer,
  onSelectOption,
  onToggleMarkReview,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}) => {
  const selectedOptionId = currentAnswer?.selected_option_id ?? null;
  const isMarked = currentAnswer?.is_marked_for_review ?? false;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-full shadow-sm">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-slate-500 font-medium">{question.subject}</span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            +{question.marks} Marks
          </span>
          {question.negative_marks > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              -{question.negative_marks} Neg
            </span>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div className="py-6 flex-1 overflow-y-auto">
        <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap select-none">
          {question.text}
        </div>

        {/* Answer Options */}
        <div className="mt-6 space-y-3">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id;
            const letter = OPTION_LETTERS[idx] || `${idx + 1}`;

            return (
              <div
                key={opt.id}
                onClick={() => onSelectOption(isSelected ? null : opt.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center space-x-3 select-none ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm font-medium'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Option Letter Badge */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-300'
                  }`}
                >
                  {letter}
                </div>

                {/* Option Text */}
                <div className="text-sm font-medium flex-1 leading-snug">{opt.option_text}</div>

                {/* Selected Indicator */}
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 animate-in fade-in zoom-in-75" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {selectedOptionId !== null && (
            <button
              onClick={() => onSelectOption(null)}
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Choice</span>
            </button>
          )}

          <button
            onClick={onToggleMarkReview}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              isMarked
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-purple-600 text-purple-600' : ''}`} />
            <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            disabled={!hasPrevious}
            onClick={onPrevious}
            className={`flex items-center space-x-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
              hasPrevious
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer shadow-sm'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={onNext}
            className="flex items-center space-x-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span>{hasNext ? 'Save & Next' : 'Review & Submit'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
