let serverTimeOffset = 0;

export function syncServerTime(serverTime?: number): void {
  if (typeof serverTime === 'number' && !Number.isNaN(serverTime)) {
    serverTimeOffset = serverTime - Date.now();
  }
}

export function getNow(): Date {
  return new Date(Date.now() + serverTimeOffset);
}

export function getTodayJakarta(): string {
  const now = getNow();
  const yyyy = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' });
  const mm = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', month: '2-digit' });
  const dd = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', day: '2-digit' });
  return `${yyyy}-${mm}-${dd}`;
}

export function formatSheetDate(dateStr?: string): string {
  if (!dateStr) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
    return dt.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSheetTime(timeStr?: string): string {
  if (!timeStr) return '-';
  if (typeof timeStr === 'string' && /^\d{2}:\d{2}/.test(timeStr)) {
    return timeStr.substring(0, 5);
  }
  const d = new Date(timeStr);
  if (Number.isNaN(d.getTime())) return timeStr;
  return d
    .toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace('.', ':');
}

export function getInputDate(dateStr?: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' });
  const mm = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', month: '2-digit' });
  const dd = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', day: '2-digit' });
  return `${yyyy}-${mm}-${dd}`;
}

export function parseExamDate(tanggalStr: string, jamStr: string): Date {
  const dateInputStr = getInputDate(tanggalStr);
  const timeInputStr = formatSheetTime(jamStr);
  return new Date(`${dateInputStr}T${timeInputStr}:00+07:00`);
}
