import type { ApiResponse } from '../shared/types';
import { dispatchFirestoreAction } from '../services/firestoreService';
import { syncServerTime } from './date';

export async function apiCall<T = unknown>(
  action: string,
  payload: unknown = {}
): Promise<ApiResponse<T>> {
  const res = await dispatchFirestoreAction<T>(
    action,
    (payload ?? {}) as Record<string, unknown> | unknown[]
  );
  if (res.serverTime) {
    syncServerTime(res.serverTime);
  }
  return res;
}
