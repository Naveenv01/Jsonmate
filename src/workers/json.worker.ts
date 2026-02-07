
import { validateJson, getJsonStats, compareJson, formatJson } from '../utils/jsonUtils';

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'VALIDATE':
        const validation = validateJson(payload);
        self.postMessage({ type: 'VALIDATE_RESULT', payload: validation, id });
        break;
      case 'STATS':
        const stats = getJsonStats(payload);
        self.postMessage({ type: 'STATS_RESULT', payload: stats, id });
        break;
      case 'COMPARE':
        const { left, right } = payload;
        const diffs = compareJson(left, right);
        self.postMessage({ type: 'COMPARE_RESULT', payload: diffs, id });
        break;
      case 'FORMAT':
        const formatted = formatJson(payload);
        self.postMessage({ type: 'FORMAT_RESULT', payload: formatted, id });
        break;
      default:
        console.warn('Unknown worker message type:', type);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      payload: error instanceof Error ? error.message : String(error), 
      id 
    });
  }
};
