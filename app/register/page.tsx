'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (error) {
      setError('登録に失敗しました。メールアドレスまたはパスワードを確認してください。');
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push('/scan');
      router.refresh();
    } else {
      setRegistered(true);
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-800 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">確認メールを送信しました</h1>
          <p className="text-gray-600 text-base mb-6">
            <span className="font-medium">{email}</span> に確認メールを送りました。
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link
            href="/"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl py-4 text-center"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          新規アカウント登録
        </h1>
        <p className="text-center text-gray-500 text-sm mb-8">作業着完管理</p>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-base font-medium text-gray-700 mb-1">
              氏名
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={50}
              autoFocus
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="例：山田 太郎"
            />
          </div>

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
              autoComplete="new-password"
              minLength={6}
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:border-blue-500"
              placeholder="6文字以上"
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
            {loading ? '登録中...' : '登録する'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          アカウントをお持ちの方は{' '}
          <Link href="/" className="text-blue-600 font-medium hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
