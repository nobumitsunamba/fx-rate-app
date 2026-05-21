'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { createClient } from '@/lib/supabase';
import type { ScanStep } from '@/lib/types';

export default function ScanPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState<ScanStep>('scan');
  const [scannedCode, setScannedCode] = useState('');
  const [recordId, setRecordId] = useState('');
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }
      setUserId(user.id);
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'ユーザー';
      setUsername(name);
    });
  }, [router]);

  useEffect(() => {
    if (step === 'working' && startedAt) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, startedAt]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    readerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  function playBeep() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  async function startScan() {
    setError('');
    setScanning(true);

    if (!videoRef.current) {
      setError('カメラの準備ができませんでした。ページを再読み込みしてください。');
      setScanning(false);
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result, err) => {
          if (result) {
            playBeep();
            const code = result.getText();
            // ストリーム参照を保存してから停止
            if (videoRef.current?.srcObject instanceof MediaStream) {
              streamRef.current = videoRef.current.srcObject;
            }
            stopCamera();
            setScannedCode(code);
            setStep('start');
          } else if (err && !(err instanceof NotFoundException)) {
            // 読み取り試行中の通常エラーは無視
          }
        }
      );
      controlsRef.current = controls;
      // 起動後にストリーム参照を保持
      if (videoRef.current?.srcObject instanceof MediaStream) {
        streamRef.current = videoRef.current.srcObject;
      }
    } catch (err) {
      console.error(err);
      setError('カメラの起動に失敗しました。カメラへのアクセスを許可してください。');
      stopCamera();
    }
  }

  async function handleStart() {
    setError('');
    setLoading(true);
    const supabase = createClient();

    const { data: existing } = await supabase
      .from('work_records')
      .select('id')
      .eq('work_order_no', scannedCode)
      .is('completed_at', null)
      .limit(1)
      .single();

    if (existing) {
      setLoading(false);
      setShowConfirm(true);
      return;
    }

    await doInsert();
  }

  async function doInsert() {
    setShowConfirm(false);
    setError('');
    setLoading(true);
    const supabase = createClient();
    const now = new Date();

    const { data, error } = await supabase
      .from('work_records')
      .insert({
        work_order_no: scannedCode,
        user_id: userId,
        username: username,
        started_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) {
      setError('着手の登録に失敗しました。もう一度お試しください。');
      setLoading(false);
      return;
    }

    setRecordId(data.id);
    setStartedAt(now);
    setElapsed(0);
    setStep('working');
    setLoading(false);
  }

  async function handleComplete() {
    setError('');
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('work_records')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', recordId);

    if (error) {
      setError('完了の登録に失敗しました。もう一度お試しください。');
      setLoading(false);
      return;
    }

    setStep('completed');
    setLoading(false);

    setTimeout(() => {
      setStep('scan');
      setScannedCode('');
      setRecordId('');
      setStartedAt(null);
      setElapsed(0);
    }, 3000);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function handleReset() {
    stopCamera();
    setScannedCode('');
    setStep('scan');
    setError('');
  }

  function formatElapsed(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}時間${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-gray-900 text-xl font-bold mb-3">着手の確認</h2>
            <p className="text-gray-700 text-base mb-1">
              作業指示番号：<span className="font-bold">{scannedCode}</span>
            </p>
            <p className="text-gray-700 text-base mb-6">
              すでに着手中の記録があります。続けて着手しますか？
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={doInsert}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-bold text-lg rounded-xl py-4 min-h-[56px]"
              >
                続けて着手する
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-base rounded-xl py-3 min-h-[48px]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white text-base font-medium">
            こんにちは、<span className="text-yellow-300 font-bold">{username}</span>さん
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => router.push('/records')}
            className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-3 py-2 rounded-lg min-h-[44px]"
          >
            実績一覧
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium px-3 py-2 rounded-lg min-h-[44px]"
          >
            名前変更
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-lg min-h-[44px]"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

        {error && (
          <div className="w-full max-w-sm bg-red-100 border-2 border-red-500 rounded-xl px-4 py-3 text-red-800 text-base font-medium">
            {error}
          </div>
        )}

        {/* Step: scan */}
        {step === 'scan' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="inline-block bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full mb-3">
                ステップ 1 / 3
              </div>
              <h2 className="text-white text-2xl font-bold">バーコードをスキャン</h2>
            </div>

            {/* video要素は常にDOMに存在させる（refをstartScan時に確実に取得するため） */}
            <div className={scanning ? 'w-full flex flex-col items-center gap-4' : 'sr-only'}>
              <div className="text-white text-base font-medium animate-pulse">
                カメラ起動中... バーコードをカメラに向けてください
              </div>
              <div className="w-full relative rounded-2xl overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-yellow-400 w-3/4 h-1/3 rounded-lg opacity-70" />
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold text-lg rounded-xl py-4 min-h-[56px]"
              >
                キャンセル
              </button>
            </div>

            {!scanning && (
              <button
                onClick={startScan}
                className="w-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 font-bold text-xl rounded-2xl py-6 shadow-lg min-h-[80px] flex items-center justify-center gap-3"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                作業指示番号をスキャン
              </button>
            )}
          </div>
        )}

        {/* Step: start */}
        {step === 'start' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="inline-block bg-green-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full mb-3">
                ステップ 2 / 3
              </div>
              <h2 className="text-white text-2xl font-bold">着手確認</h2>
            </div>

            <div className="w-full bg-white rounded-2xl p-6 text-center shadow-lg">
              <p className="text-gray-500 text-sm mb-2">作業指示番号</p>
              <p className="text-gray-900 text-3xl font-bold break-all">{scannedCode}</p>
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-bold text-2xl rounded-2xl py-6 shadow-lg min-h-[80px] disabled:opacity-50"
            >
              {loading ? '登録中...' : '着　手'}
            </button>

            <button
              onClick={handleReset}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold text-base rounded-xl py-3 min-h-[48px]"
            >
              やり直す
            </button>
          </div>
        )}

        {/* Step: working */}
        {step === 'working' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="inline-block bg-blue-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full mb-3">
                ステップ 3 / 3
              </div>
              <h2 className="text-white text-2xl font-bold">作業中</h2>
            </div>

            <div className="w-full bg-white rounded-2xl p-6 text-center shadow-lg">
              <p className="text-gray-500 text-sm mb-1">作業指示番号</p>
              <p className="text-gray-900 text-2xl font-bold break-all mb-4">{scannedCode}</p>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-gray-500 text-sm mb-1">着手時刻</p>
                <p className="text-gray-700 text-lg font-medium mb-3">
                  {startedAt ? formatTime(startedAt) : ''}
                </p>
                <p className="text-gray-500 text-sm mb-1">経過時間</p>
                <p className="text-blue-600 text-3xl font-bold tabular-nums">
                  {formatElapsed(elapsed)}
                </p>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-2xl rounded-2xl py-6 shadow-lg min-h-[80px] disabled:opacity-50"
            >
              {loading ? '登録中...' : '完　了'}
            </button>
          </div>
        )}

        {/* Step: completed */}
        {step === 'completed' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <div className="w-full bg-white rounded-2xl p-8 text-center shadow-lg">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-gray-900 text-2xl font-bold mb-2">完了しました！</h2>
              <p className="text-gray-500 text-base">3秒後にスキャン画面に戻ります...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
