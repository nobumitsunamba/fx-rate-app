'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません');
      setLoading(false);
      return;
    }

    router.push('/scan');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          作業着完管理
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">ログイン</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="example@factory.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="パスワード"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 rounded-xl px-4 py-3 text-red-700 text-base">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-lg rounded-xl py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          アカウントがない場合は{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
