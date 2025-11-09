// types/entry.ts
export interface Entry {
  id: string;
  text: string;
  effort: number;
  tags: string[];
  date: string;
}

// app/page.tsx
"use client";

import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Entry } from "@/types/entry";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const [text, setText] = useState("");
  const [effort, setEffort] = useState(3);
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: fetchError, size, setSize, mutate, isLoading } = useSWRInfinite<{ entries: Entry[], nextCursor: string | null }>(
    (index) => `/api/entries?page=${index + 1}`,
    fetcher
  );

  const list = data ? data.flatMap(page => page.entries) : [];
  const hasMore = data && data[data.length - 1]?.entries.length > 0;

  const calcStreak = (entries: Entry[]): number => {
    if (entries.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].date);
      entryDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (entryDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const validateInput = (): string | null => {
    if (!text.trim()) {
      return "成長内容を入力してください";
    }
    if (text.length > 500) {
      return "500文字以内で入力してください";
    }
    return null;
  };

  const addEntry = async () => {
    const validationError = validateInput();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        text: text.trim(),
        effort,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      const response = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("記録に失敗しました");
      }

      // 成功時にフォームをリセット
      setText("");
      setEffort(3);
      setTags("");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      addEntry();
    }
  };

  return (
    <main className="max-w-xl mx-auto p-4 space-y-6">
      {/* 入力フォーム */}
      <section className="rounded-xl border p-4 space-y-3 bg-white shadow-sm">
        <h1 className="text-xl font-bold">今日の1成長</h1>
        
        <div>
          <label htmlFor="entry-text" className="sr-only">
            成長内容
          </label>
          <textarea
            id="entry-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="例：SWR InfiniteのgetKeyの挙動を理解した"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="effort-range" className="text-sm font-medium">
            努力度: {effort}
          </label>
          <input
            id="effort-range"
            type="range"
            min={1}
            max={5}
            value={effort}
            onChange={(e) => setEffort(Number(e.target.value))}
            className="flex-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="tags-input" className="sr-only">
            タグ
          </label>
          <input
            id="tags-input"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="タグ（カンマ区切り）: 勉強, 家族"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">
            {error}
          </div>
        )}

        <button
          onClick={addEntry}
          disabled={isSubmitting || !text.trim()}
          className="w-full px-3 py-2 rounded bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "記録中..." : "記録する"}
        </button>
      </section>

      {/* タイムライン */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">タイムライン</h2>
          <span className="text-sm text-gray-600 font-medium">
            連続: {calcStreak(list)} 日
          </span>
        </div>

        {fetchError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded" role="alert">
            データの読み込みに失敗しました
          </div>
        )}

        {list.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 py-8">
            まだ記録がありません
          </div>
        )}

        <div className="space-y-3">
          {list.map((entry, index) => (
            <EntryCard key={`${entry.id}-tag-${index}`} entry={entry} />
          ))}
        </div>

        {hasMore && (
          <button
            onClick={() => setSize(size + 1)}
            disabled={isLoading}
            className="w-full border rounded p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "読み込み中..." : "もっと見る"}
          </button>
        )}
      </section>
    </main>
  );
}

// コンポーネントの分離
function EntryCard({ entry }: { entry: Entry }) {
  return (
    <article className="border rounded p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      <time className="text-sm text-gray-500" dateTime={entry.date}>
        {new Date(entry.date).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
      <p className="font-medium mt-1">{entry.text}</p>
      <div className="flex gap-4 text-xs text-gray-600 mt-2">
        <span>努力度: {"★".repeat(entry.effort)}</span>
        {entry.tags.length > 0 && (
          <span className="flex gap-1">
            {entry.tags.map((tag, index) => (
              <span 
                key={`${entry.id}-tag-${index}`} 
                className="px-2 py-0.5 bg-gray-100 rounded"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}