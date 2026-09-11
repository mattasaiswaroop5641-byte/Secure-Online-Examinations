import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Exam, QuestionAdmin } from '../../types';
import { questionService } from '../../services/questions';
import { examService } from '../../services/exams';
import { Check, Plus, Trash2 } from 'lucide-react';

interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam?: Exam | null;
  onSaved: () => void;
}

export const ExamFormModal: React.FC<ExamFormModalProps> = ({
  isOpen,
  onClose,
  exam,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalMarks, setTotalMarks] = useState(20);
  const [passingMarks, setPassingMarks] = useState(8);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.25);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [status, setStatus] = useState<Exam['status']>('active');

  const [allQuestions, setAllQuestions] = useState<QuestionAdmin[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const questions = await questionService.listQuestions();
        setAllQuestions(questions);

        if (exam) {
          setTitle(exam.title);
          setSubject(exam.subject);
          setDescription(exam.description || '');
          setInstructions(exam.instructions || '');
          setDurationMinutes(exam.duration_minutes);
          setTotalMarks(exam.total_marks);
          setPassingMarks(exam.passing_marks);
          setNegativeMarking(exam.negative_marking);
          setNegativeMarkValue(exam.negative_mark_value);
          setRandomizeQuestions(exam.randomize_questions);
          setRandomizeOptions(exam.randomize_options);
          setStatus(exam.status);

          // Fetch currently linked questions
          const linked = await examService.getExamQuestionsAdmin(exam.id);
          setSelectedQuestionIds(linked.map((q) => q.id));
        } else {
          // Reset form
          setTitle('');
          setSubject('');
          setDescription('');
          setInstructions('1. Keep face visible.\n2. Fullscreen mode is enforced.\n3. Timer will submit automatically on expiry.');
          setDurationMinutes(30);
          setTotalMarks(20);
          setPassingMarks(8);
          setNegativeMarking(true);
          setNegativeMarkValue(0.25);
          setRandomizeQuestions(false);
          setRandomizeOptions(false);
          setStatus('active');
          setSelectedQuestionIds([]);
        }
      } catch (err) {
        console.error('Failed to load questions:', err);
      }
    }
    if (isOpen) {
      loadData();
    }
  }, [isOpen, exam]);

  const toggleQuestionSelection = (id: number) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) {
      setErrorMessage('Please provide both exam title and subject.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      duration_minutes: Number(durationMinutes),
      total_marks: Number(totalMarks),
      passing_marks: Number(passingMarks),
      negative_marking: negativeMarking,
      negative_mark_value: Number(negativeMarkValue),
      randomize_questions: randomizeQuestions,
      randomize_options: randomizeOptions,
      status,
      question_ids: selectedQuestionIds,
    };

    try {
      if (exam) {
        await examService.updateExam(exam.id, payload);
      } else {
        await examService.createExam(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save examination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={exam ? 'Edit Examination' : 'Create New Examination'}
      subtitle="Configure test timing, pass marks, randomization, and question bank selection."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Exam Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Operating Systems Midterm"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject / Department *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of examination topics and scope..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Configurations Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <div>
            <label className="block font-medium text-slate-400 mb-1">Duration (Mins)</label>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">Total Marks</label>
            <input
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">Passing Marks</label>
            <input
              type="number"
              min={0}
              value={passingMarks}
              onChange={(e) => setPassingMarks(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Security & Marking Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center space-x-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={negativeMarking}
              onChange={(e) => setNegativeMarking(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
            />
            <div>
              <p className="font-semibold text-slate-200">Negative Marking</p>
              <p className="text-[10px] text-slate-500">Deduct penalty on wrong answer</p>
            </div>
          </label>

          <label className="flex items-center space-x-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={randomizeQuestions}
              onChange={(e) => setRandomizeQuestions(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
            />
            <div>
              <p className="font-semibold text-slate-200">Randomize Questions</p>
              <p className="text-[10px] text-slate-500">Scramble order for each candidate</p>
            </div>
          </label>

          <label className="flex items-center space-x-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={randomizeOptions}
              onChange={(e) => setRandomizeOptions(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
            />
            <div>
              <p className="font-semibold text-slate-200">Randomize Options</p>
              <p className="text-[10px] text-slate-500">Scramble MCQ options A/B/C/D</p>
            </div>
          </label>
        </div>

        {/* Question Bank Linker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-300">
              Assign Questions ({selectedQuestionIds.length} Selected)
            </label>
            <span className="text-xs text-slate-500">
              Select questions to include in this exam
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-950/40">
            {allQuestions.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 text-center">No questions available in Question Bank.</p>
            ) : (
              allQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestionSelection(q.id)}
                    className={`p-3 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden pr-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="truncate">
                        <span className="text-slate-200 font-medium">{q.text}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {q.subject} • {q.marks} Mark(s) • {q.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isSubmitting ? 'Saving Exam...' : exam ? 'Update Examination' : 'Create Examination'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
