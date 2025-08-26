'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  // YYYY-MM-DD (e.g., "2025-08-29")
  selectedDate?: string;
  basePath?: string; // defaults to /calendar
};

function fmtYMD(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MonthCalendar({ selectedDate, basePath = '/calendar' }: Props) {
  const router = useRouter();
  const search = useSearchParams();

  // selected (default: today)
  const initial = selectedDate ?? (new Date()).toISOString().slice(0, 10);
  const [anchorMonth, setAnchorMonth] = useState(() => {
    const d = new Date(initial + 'T00:00:00Z');
    // store as UTC-first day of that month
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });

  const days = useMemo(() => {
    const result: { date: Date; inMonth: boolean }[] = [];
    // first weekday (Mon=1 .. Sun=7) – we’ll show Mon–Sun header
    const firstDay = new Date(anchorMonth);
    const startWeekday = (firstDay.getUTCDay() + 6) % 7; // convert Sun=0 to 6
    const start = new Date(firstDay);
    start.setUTCDate(firstDay.getUTCDate() - startWeekday);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      result.push({ date: d, inMonth: d.getUTCMonth() === anchorMonth.getUTCMonth() });
    }
    return result;
  }, [anchorMonth]);

  const selected = initial;

  function gotoMonth(offset: number) {
    const next = new Date(anchorMonth);
    next.setUTCMonth(anchorMonth.getUTCMonth() + offset);
    setAnchorMonth(next);
  }

  function pick(d: Date) {
    const ymd = fmtYMD(d);
    // preserve other query params but set date
    const params = new URLSearchParams(search?.toString() || '');
    params.set('date', ymd);
    router.push(`${basePath}?${params.toString()}`);
  }

  const monthLabel = anchorMonth.toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <button className="btn" onClick={() => gotoMonth(-1)} aria-label="Previous month">←</button>
        <div className="font-semibold">{monthLabel}</div>
        <button className="btn" onClick={() => gotoMonth(1)} aria-label="Next month">→</button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-600 mb-2">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, inMonth }) => {
          const ymd = fmtYMD(date);
          const isSelected = ymd === selected;
          return (
            <button
              key={ymd}
              onClick={() => pick(date)}
              className={[
                'rounded-xl py-2',
                inMonth ? 'bg-white border' : 'bg-gray-50 border',
                isSelected ? 'border-black font-semibold' : 'border-gray-200',
                'hover:shadow'
              ].join(' ')}
              aria-current={isSelected ? 'date' : undefined}
            >
              {date.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
