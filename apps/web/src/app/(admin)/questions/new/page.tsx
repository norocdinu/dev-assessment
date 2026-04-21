'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionForm } from '@/components/ui/QuestionForm';
import { api } from '@/lib/api';
import type { Technology } from '@dev-assessment/shared';

export default function NewQuestionPage() {
  const router = useRouter();
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/technologies').then((r) => setTechnologies(r.data)).catch(() => {});
  }, []);

  async function handleSubmit(data: Parameters<typeof QuestionForm>[0]['onSubmit'] extends (d: infer D) => unknown ? D : never) {
    setLoading(true);
    setError('');
    try {
      await api.post('/questions', data);
      router.push('/questions');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Failed to create question');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">New Question</h2>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <QuestionForm
        technologies={technologies}
        onSubmit={handleSubmit}
        isLoading={loading}
      />
    </div>
  );
}
