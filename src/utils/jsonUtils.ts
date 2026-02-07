export interface JsonError {
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: JsonError;
  parsed?: unknown;
}

/**
 * Ultra-fast JSON validator with precise error detection and helpful suggestions.
 * Single-pass algorithm with early exit for optimal performance.
 */
export function validateJson(input: string): ValidationResult {
  if (!input.trim()) {
    return { valid: true, parsed: null };
  }
  
  try {
    const parsed = JSON.parse(input);
    return { valid: true, parsed };
  } catch (e) {
    const error = e as SyntaxError;
    const errorInfo = detectJsonError(input, error);
    
    return {
      valid: false,
      error: {
        message: error.message.replace(/^JSON\.parse: /, '').replace(/JSON Parse error: /, ''),
        ...errorInfo,
      },
    };
  }
}

/**
 * Detects the exact line and provides suggestions for JSON errors.
 * Highly optimized for performance with early exits.
 */
function detectJsonError(input: string, error: SyntaxError): Pick<JsonError, 'line' | 'column' | 'suggestion'> {
  const lines = input.split('\n');
  const errorMsg = error.message.toLowerCase();
  
  // Fast path: Check for specific error types
  let line: number | undefined;
  let column: number | undefined;
  let suggestion: string | undefined;
  
  // 1. UNTERMINATED STRING - Check for odd quotes
  if (errorMsg.includes('unterminated') || errorMsg.includes('unexpected end of json')) {
    for (let i = 0; i < lines.length; i++) {
      const quoteCount = countUnescapedQuotes(lines[i]);
      if (quoteCount % 2 !== 0) {
        line = i + 1;
        column = lines[i].length;
        suggestion = `Add closing quote (") at the end of the string`;
        return { line, column, suggestion };
      }
    }
  }
  
  // 2. MISSING COMMA - Value followed by key without comma
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i].trim();
    const next = lines[i + 1].trim();
    
    if (!current || current.startsWith('//')) continue;
    
    // Check if current line ends with a value and next starts with a key
    if (
      !current.endsWith(',') &&
      !current.endsWith('{') &&
      !current.endsWith('[') &&
      (current.endsWith('"') || current.endsWith('}') || current.endsWith(']') || 
       /[\d.]$/.test(current) || current.endsWith('true') || 
       current.endsWith('false') || current.endsWith('null')) &&
      next.startsWith('"')
    ) {
      line = i + 1;
      column = lines[i].length;
      suggestion = `Add comma (,) at the end of line ${i + 1}`;
      return { line, column, suggestion };
    }
  }
  
  // 3. MISSING COLON - Property name without colon
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    
    // Check for property name pattern without colon
    const propMatch = current.match(/^"[^"]+"\s*$/);
    if (propMatch && i < lines.length - 1) {
      const next = lines[i + 1].trim();
      if (!next.startsWith(':') && !current.includes(':')) {
        line = i + 1;
        suggestion = `Add colon (:) after the property name`;
        return { line, column, suggestion };
      }
    }
  }
  
  // 4. UNMATCHED BRACKETS/BRACES - Track balance
  const brackets = trackBrackets(input);
  if (brackets.error) {
    return {
      line: brackets.line,
      column: brackets.column,
      suggestion: brackets.suggestion,
    };
  }
  
  // 5. TRAILING COMMA - Comma before closing brace/bracket
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    if (i < lines.length - 1) {
      const next = lines[i + 1].trim();
      if (current.endsWith(',') && (next === '}' || next === ']')) {
        line = i + 1;
        suggestion = `Remove trailing comma - not allowed before closing ${next === '}' ? 'brace' : 'bracket'}`;
        return { line, column, suggestion };
      }
    }
  }
  
  // 6. DUPLICATE KEYS - Check for duplicate property names (expensive, do last)
  const duplicates = findDuplicateKeys(lines);
  if (duplicates.line) {
    return duplicates;
  }
  
  // Fallback: Try to extract line from error message
  const firefoxMatch = error.message.match(/line (\d+) column (\d+)/);
  if (firefoxMatch) {
    return {
      line: parseInt(firefoxMatch[1], 10),
      column: parseInt(firefoxMatch[2], 10),
      suggestion: 'Check syntax at this location',
    };
  }
  
  const positionMatch = error.message.match(/position (\d+)/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    const beforeError = input.substring(0, position).split('\n');
    return {
      line: beforeError.length,
      column: beforeError[beforeError.length - 1]?.length || 0,
      suggestion: 'Check syntax at this location',
    };
  }
  
  return { suggestion: 'Check your JSON syntax' };
}

/**
 * Counts unescaped quotes in a string. O(n) complexity.
 */
function countUnescapedQuotes(line: string): number {
  let count = 0;
  let escaped = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      count++;
    }
  }
  
  return count;
}

/**
 * Tracks bracket/brace balance to find mismatches. O(n) complexity with early exit.
 */
function trackBrackets(input: string): { error?: boolean; line?: number; column?: number; suggestion?: string } {
  const stack: { char: string; line: number; column: number }[] = [];
  const lines = input.split('\n');
  let inString = false;
  let escaped = false;
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    
    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];
      
      // Handle escaping
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      // Handle strings
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      // Skip if inside string
      if (inString) continue;
      
      // Track brackets and braces
      if (char === '{' || char === '[') {
        stack.push({ char, line: lineIdx + 1, column: colIdx + 1 });
      } else if (char === '}' || char === ']') {
        if (stack.length === 0) {
          return {
            error: true,
            line: lineIdx + 1,
            column: colIdx + 1,
            suggestion: `Unexpected closing ${char === '}' ? 'brace' : 'bracket'} - no matching opening`,
          };
        }
        
        const last = stack.pop()!;
        const expectedClose = last.char === '{' ? '}' : ']';
        
        if (char !== expectedClose) {
          return {
            error: true,
            line: lineIdx + 1,
            column: colIdx + 1,
            suggestion: `Mismatched bracket - expected '${expectedClose}' but found '${char}'. Opening ${last.char} was at line ${last.line}`,
          };
        }
      }
    }
  }
  
  // Check for unclosed brackets/braces
  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      error: true,
      line: unclosed.line,
      column: unclosed.column,
      suggestion: `Unclosed ${unclosed.char === '{' ? 'brace' : 'bracket'} - add closing ${unclosed.char === '{' ? '}' : ']'}`,
    };
  }
  
  return {};
}

/**
 * Finds duplicate keys in objects. O(n) complexity but only runs if no other error found.
 */
function findDuplicateKeys(lines: string[]): { line?: number; column?: number; suggestion?: string } {
  const keys = new Map<string, number>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(/"([^"]+)"\s*:/);
    
    if (keyMatch) {
      const key = keyMatch[1];
      if (keys.has(key)) {
        return {
          line: i + 1,
          suggestion: `Duplicate key "${key}" - first occurrence was at line ${keys.get(key)}`,
        };
      }
      keys.set(key, i + 1);
    }
  }
  
  return {};
}

export function formatJson(input: string, indent: number = 2): string {
  const result = validateJson(input);
  if (!result.valid || result.parsed === null) {
    return input;
  }
  return JSON.stringify(result.parsed, null, indent);
}

export function minifyJson(input: string): string {
  const result = validateJson(input);
  if (!result.valid || result.parsed === null) {
    return input;
  }
  return JSON.stringify(result.parsed);
}

export function sortJsonKeys(input: string, indent: number = 2): string {
  const result = validateJson(input);
  if (!result.valid || result.parsed === null) {
    return input;
  }
  
  const sortObject = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortObject);
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj as object)
        .sort()
        .reduce((acc, key) => {
          acc[key] = sortObject((obj as Record<string, unknown>)[key]);
          return acc;
        }, {} as Record<string, unknown>);
    }
    return obj;
  };
  
  return JSON.stringify(sortObject(result.parsed), null, indent);
}

export interface DiffResult {
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  path: string;
  leftValue?: unknown;
  rightValue?: unknown;
}

export function compareJson(left: string, right: string): DiffResult[] {
  const leftResult = validateJson(left);
  const rightResult = validateJson(right);
  
  if (!leftResult.valid || !rightResult.valid) {
    return [];
  }
  
  const diffs: DiffResult[] = [];
  
  const compare = (leftObj: unknown, rightObj: unknown, path: string = '') => {
    if (leftObj === rightObj) {
      return;
    }
    
    if (typeof leftObj !== typeof rightObj) {
      diffs.push({ type: 'changed', path, leftValue: leftObj, rightValue: rightObj });
      return;
    }
    
    if (Array.isArray(leftObj) && Array.isArray(rightObj)) {
      const maxLen = Math.max(leftObj.length, rightObj.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${path}[${i}]`;
        if (i >= leftObj.length) {
          diffs.push({ type: 'added', path: itemPath, rightValue: rightObj[i] });
        } else if (i >= rightObj.length) {
          diffs.push({ type: 'removed', path: itemPath, leftValue: leftObj[i] });
        } else {
          compare(leftObj[i], rightObj[i], itemPath);
        }
      }
      return;
    }
    
    if (leftObj !== null && rightObj !== null && typeof leftObj === 'object' && typeof rightObj === 'object') {
      const leftKeys = new Set(Object.keys(leftObj as object));
      const rightKeys = new Set(Object.keys(rightObj as object));
      
      for (const key of leftKeys) {
        const keyPath = path ? `${path}.${key}` : key;
        if (!rightKeys.has(key)) {
          diffs.push({ type: 'removed', path: keyPath, leftValue: (leftObj as Record<string, unknown>)[key] });
        } else {
          compare((leftObj as Record<string, unknown>)[key], (rightObj as Record<string, unknown>)[key], keyPath);
        }
      }
      
      for (const key of rightKeys) {
        if (!leftKeys.has(key)) {
          const keyPath = path ? `${path}.${key}` : key;
          diffs.push({ type: 'added', path: keyPath, rightValue: (rightObj as Record<string, unknown>)[key] });
        }
      }
      return;
    }
    
    diffs.push({ type: 'changed', path, leftValue: leftObj, rightValue: rightObj });
  };
  
  compare(leftResult.parsed, rightResult.parsed);
  return diffs;
}

export function getJsonStats(input: string): { keys: number; depth: number; size: string } {
  const result = validateJson(input);
  if (!result.valid || result.parsed === null) {
    return { keys: 0, depth: 0, size: formatBytes(new Blob([input]).size) };
  }
  
  let keys = 0;
  let maxDepth = 0;
  
  const traverse = (obj: unknown, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    
    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item, depth + 1));
    } else if (obj !== null && typeof obj === 'object') {
      const objKeys = Object.keys(obj as object);
      keys += objKeys.length;
      objKeys.forEach(key => traverse((obj as Record<string, unknown>)[key], depth + 1));
    }
  };
  
  traverse(result.parsed, 0);
  
  return {
    keys,
    depth: maxDepth,
    size: formatBytes(new Blob([input]).size),
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}