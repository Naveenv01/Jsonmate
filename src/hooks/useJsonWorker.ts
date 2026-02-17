import { useEffect, useRef, useCallback } from 'react';
import { ValidationResult, JsonError, DiffResult, validateJson, getJsonStats, compareJson, formatJson } from '../utils/jsonUtils';

type WorkerMessage = 
  | { type: 'VALIDATE_RESULT'; payload: ValidationResult; id: string }
  | { type: 'STATS_RESULT'; payload: { keys: number; depth: number; size: string }; id: string }
  | { type: 'COMPARE_RESULT'; payload: DiffResult[]; id: string }
  | { type: 'ERROR'; payload: string; id: string };

export function useJsonWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    // Create worker instance (Vite handles the import with ?worker)
    const worker = new Worker(new URL('../workers/json.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const { id, type, payload } = e.data;
      const callback = callbacksRef.current.get(id);
      
      if (callback) {
        if (type === 'ERROR') {
          console.error('Worker Error:', payload);
          // Depending on needs, we might want to reject the promise here
          // For now, we'll let individual handlers decide or just log
        } else {
          callback(payload);
        }
        callbacksRef.current.delete(id);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const postMessage = useCallback((type: string, payload: any): Promise<any> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(2, 9);
      callbacksRef.current.set(id, resolve);
      workerRef.current?.postMessage({ type, payload, id });
    });
  }, []);

  const validate = useCallback(async (json: string): Promise<ValidationResult> => {
    try {
      return await postMessage('VALIDATE', json);
    } catch (error) {
      console.warn('Worker failed for validate, using sync fallback:', error);
      return validateJson(json);
    }
  }, [postMessage]);

  const getStats = useCallback(async (json: string): Promise<{ keys: number; depth: number; size: string }> => {
    try {
      return await postMessage('STATS', json);
    } catch (error) {
      console.warn('Worker failed for getStats, using sync fallback:', error);
      return getJsonStats(json);
    }
  }, [postMessage]);

  const compare = useCallback(async (left: string, right: string): Promise<DiffResult[]> => {
    try {
      return await postMessage('COMPARE', { left, right });
    } catch (error) {
      console.warn('Worker failed for compare, using sync fallback:', error);
      return compareJson(left, right);
    }
  }, [postMessage]);

  const format = useCallback(async (json: string): Promise<string> => {
    try {
      return await postMessage('FORMAT', json);
    } catch (error) {
      console.warn('Worker failed for format, using sync fallback:', error);
      return formatJson(json);
    }
  }, [postMessage]);

  return { validate, getStats, compare, format };
}
