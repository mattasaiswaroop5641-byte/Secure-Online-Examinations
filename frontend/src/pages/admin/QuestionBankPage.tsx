import React, { useState, useEffect } from 'react';
import { questionService } from '../../services/questions';
import { QuestionAdmin } from '../../types';
import { QuestionFormModal } from '../../components/admin/QuestionFormModal';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Filter,
} from 'lucide-react';

export const QuestionBankPage: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionAdmin[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionAdmin | null>(null);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const [qData, subData] = await Promise.all([
        questionService.listQuestions({
          subject: selectedSubject || undefined,
          difficulty: selectedDifficulty || undefined,
          search: search || undefined,
        }),
        questionService.getSubjects(),
      ]);
      setQuestions(qData);
      setSubjects(subData);
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, selectedDifficulty]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Delete this question from the Question Bank?')) return;
    try {
      await questionService.deleteQuestion(id);
      loadQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Question Bank</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Central repository of technical assessment items, correct options, and grading points.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingQuestion(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions by keyword..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center space-x-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No Questions Found</p>
          <p className="text-xs text-slate-500 mt-1">Add items to build your question repository.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-sm hover:border-slate-700/80 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-slate-500">#{q.id}</span>
                  <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20 text-xs">
                    {q.subject}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      q.difficulty === 'easy'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : q.difficulty === 'hard'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-emerald-400 font-semibold font-mono">+{q.marks} Marks</span>
                  {q.negative_marks > 0 && (
                    <span className="text-rose-400 font-mono">-{q.negative_marks} Neg</span>
                  )}

                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                    <button
                      onClick={() => {
                        setEditingQuestion(q);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-sm font-medium text-slate-100 whitespace-pre-wrap leading-relaxed">
                {q.text}
              </p>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      opt.is_correct
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 font-semibold'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <span className="truncate">{opt.option_text}</span>
                    {opt.is_correct && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </div>
                ))}
              </div>

              {/* Explanation Note */}
              {q.explanation && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Question Form Modal */}
      {isModalOpen && (
        <QuestionFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          question={editingQuestion}
          onSaved={loadQuestions}
        />
      )}
    </div>
  );
};
