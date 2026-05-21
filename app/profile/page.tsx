'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }
      const name = user.user_metadata?.full_name ?? '';
      setCurrentName(name);
      setDisplayName(name);
      setInitializing(false);
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('表示名を入力してください');
      return;
    }
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });

    if (error) {
      setError('保存に失敗しました。もう一度お試しください。');
      setLoading(false);
      return;
    }

    router.push('/scan');
    router.refresh();
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-800">
        <p className="text-white text-lg">読み込み中...</p>
      </div>
    );
  }

  const isFirstTime = !currentName;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isFirstTime ? 'はじめに' : '表示名の変更'}
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          {isFirstTime
            ? '作業画面に表示される名前を設定してください'
            : '新しい表示名を入力してください'}
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="displayName" className="block text-base font-medium text-gray-700 mb-1">
              表示名
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              maxLength={50}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="例：山田 太郎"
            />
            <p className="text-gray-400 text-xs mt-1 text-right">{displayName.length} / 50</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 rounded-xl px-4 py-3 text-red-700 text-base">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-lg rounded-xl py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
          >
            {loading ? '保存中...' : '保存してスキャン画面へ'}
          </button>

          {!isFirstTime && (
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-base rounded-xl py-3 min-h-[48px]"
            >
              キャンセル
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
