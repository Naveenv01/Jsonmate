import { useEffect, useRef, useCallback } from 'react';
import { ValidationResult, JsonError, DiffResult } from '../utils/jsonUtils';

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

  const validate = useCallback((json: string): Promise<ValidationResult> => {
    return postMessage('VALIDATE', json);
  }, [postMessage]);

  const getStats = useCallback((json: string): Promise<{ keys: number; depth: number; size: string }> => {
    return postMessage('STATS', json);
  }, [postMessage]);

  const compare = useCallback((left: string, right: string): Promise<DiffResult[]> => {
    return postMessage('COMPARE', { left, right });
  }, [postMessage]);

  const format = useCallback((json: string): Promise<string> => {
    return postMessage('FORMAT', json);
  }, [postMessage]);

  return { validate, getStats, compare, format };
}
