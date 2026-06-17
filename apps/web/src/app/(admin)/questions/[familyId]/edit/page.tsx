'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuestionForm } from '@/components/ui/QuestionForm';
import type { QuestionFormValues } from '@/components/ui/QuestionForm';
import { api } from '@/lib/api';
import type { Question, Technology } from '@dev-assessment/shared';

export default function EditQuestionPage() {
  const router = useRouter();
  const { familyId } = useParams<{ familyId: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/questions/${familyId}/versions`),
      api.get('/technologies'),
    ]).then(([qRes, tRes]) => {
      // versions are ordered DESC — first is latest
      setQuestion(qRes.data[0] ?? null);
      setTechnologies(tRes.data);
    }).catch(() => setError('Failed to load question'));
  }, [familyId]);

  async function handleSubmit(data: QuestionFormValues) {
    setLoading(true);
    setError('');
    try {
      await api.put(`/questions/${familyId}`, data);
      router.push('/questions');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to update question');
    } finally {
      setLoading(false);
    }
  }

  if (!question && !error) return <div className="p-6 text-muted">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">Edit Question</h2>
      <QuestionForm
        technologies={technologies}
        initialValues={{
          technology_id: question!.technology_id,
          difficulty: question!.difficulty,
          skill_area: question!.skill_area,
          type: question!.type,
          content: question!.content,
          answer_key: question!.answer_key,
          explanation: question!.explanation ?? '',
        }}
        currentVersion={question!.version}
        onSubmit={handleSubmit}
        isLoading={loading}
      />
    </div>
  );
}
