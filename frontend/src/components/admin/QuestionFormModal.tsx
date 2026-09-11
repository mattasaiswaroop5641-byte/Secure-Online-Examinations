import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { QuestionAdmin } from '../../types';
import { questionService } from '../../services/questions';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: QuestionAdmin | null;
  onSaved: () => void;
}

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  question,
  onSaved,
}) => {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [marks, setMarks] = useState(1.0);
  const [negativeMarks, setNegativeMarks] = useState(0.25);
  const [explanation, setExplanation] = useState('');
  const [options, setOptions] = useState<{ option_text: string; is_correct: boolean }[]>([
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setSubject(question.subject);
      setText(question.text);
      setDifficulty(question.difficulty);
      setMarks(question.marks);
      setNegativeMarks(question.negative_marks);
      setExplanation(question.explanation || '');
      setOptions(
        question.options.map((o) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
        }))
      );
    } else {
      setSubject('');
      setText('');
      setDifficulty('medium');
      setMarks(2.0);
      setNegativeMarks(0.5);
      setExplanation('');
      setOptions([
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ]);
    }
  }, [question, isOpen]);

  const handleOptionTextChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[idx].option_text = val;
      return next;
    });
  };

  const handleSetCorrectOption = (idx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        is_correct: i === idx,
      }))
    );
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { option_text: '', is_correct: false }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // If deleted was correct, assign first one as correct
      if (!next.some((o) => o.is_correct)) {
        next[0].is_correct = true;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !text.trim()) {
      setErrorMessage('Please provide both subject and question text.');
      return;
    }

    const emptyOptions = options.some((o) => !o.option_text.trim());
    if (emptyOptions) {
      setErrorMessage('Please fill in text for all options.');
      return;
    }

    const hasCorrect = options.some((o) => o.is_correct);
    if (!hasCorrect) {
      setErrorMessage('Please designate at least one option as the correct answer.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      subject: subject.trim(),
      text: text.trim(),
      question_type: 'mcq_single',
      difficulty,
      marks: Number(marks),
      negative_marks: Number(negativeMarks),
      explanation: explanation.trim() || undefined,
      options: options.map((o) => ({
        option_text: o.option_text.trim(),
        is_correct: o.is_correct,
      })),
    };

    try {
      if (question) {
        await questionService.updateQuestion(question.id, payload);
      } else {
        await questionService.createQuestion(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={question ? 'Edit Question' : 'Add Question to Question Bank'}
      subtitle="Define question text, options, correct answer, and explanation."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject / Domain *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Algorithms & Complexity"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Marks</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Neg. Mark</label>
              <input
                type="number"
                step="0.25"
                min="0"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Question Prompt *</label>
          <textarea
            required
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type question or problem statement here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Options Builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300">
              Answer Options (Select correct answer using radio button)
            </label>
            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="correct_option"
                  checked={opt.is_correct}
                  onChange={() => handleSetCorrectOption(idx)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
                  title="Mark as correct answer"
                />

                <input
                  type="text"
                  required
                  value={opt.option_text}
                  onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className={`flex-1 bg-slate-950 border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none ${
                    opt.is_correct
                      ? 'border-emerald-500/80 bg-emerald-950/10'
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />

                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Answer Explanation / Educational Feedback
          </label>
          <textarea
            rows={2}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Detailed rationale explaining why the correct answer is valid (shown to students post-submission)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : question ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
