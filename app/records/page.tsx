'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { WorkRecord } from '@/lib/types';

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalPhotoUrl, setModalPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }
      fetchRecords();
    });
  }, [router]);

  async function fetchRecords() {
    setLoading(true);
    setError('');
    const supabase = createClient();

    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      setError('データの取得に失敗しました。');
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }

  function formatDateTime(iso: string | null) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function calcMinutes(start: string, end: string | null): string {
    if (!end) return '—';
    const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${diff}分`;
  }

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">

      {/* 写真拡大モーダル */}
      {modalPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalPhotoUrl(null)}
        >
          <div
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalPhotoUrl}
              alt="作業写真"
              className="max-w-full max-h-[80vh] rounded-xl object-contain"
            />
            <button
              onClick={() => setModalPhotoUrl(null)}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <header className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <h1 className="text-white text-lg font-bold">実績一覧</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchRecords}
            className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-3 py-2 rounded-lg min-h-[44px]"
          >
            更新
          </button>
          <button
            onClick={() => router.push('/scan')}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg min-h-[44px]"
          >
            スキャン画面へ
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {error && (
          <div className="bg-red-100 border-2 border-red-500 rounded-xl px-4 py-3 text-red-800 text-base font-medium mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-white text-lg">読み込み中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-400 text-lg">実績がありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-2xl shadow p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-gray-900 text-lg font-bold break-all flex-1">
                    {record.work_order_no}
                  </p>
                  {record.completed_at === null ? (
                    <span className="shrink-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      作業中
                    </span>
                  ) : (
                    <span className="shrink-0 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                      完了
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">作業者</span>
                    <p className="text-gray-800 font-medium">{record.username}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">作業時間</span>
                    <p className="text-gray-800 font-medium">
                      {calcMinutes(record.started_at, record.completed_at)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">着手</span>
                    <p className="text-gray-800 font-medium">{formatDateTime(record.started_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">完了</span>
                    <p className="text-gray-800 font-medium">{formatDateTime(record.completed_at)}</p>
                  </div>
                </div>

                {record.photo_url && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <span className="text-gray-500 text-xs">作業写真</span>
                    <img
                      src={record.photo_url}
                      alt="作業写真"
                      className="w-16 h-16 object-cover rounded-lg cursor-pointer border border-gray-200 active:opacity-70"
                      onClick={() => setModalPhotoUrl(record.photo_url!)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
