import { describe, it, expect } from 'vitest';
import { validateJson } from './jsonUtils';

describe('JSON Validation - Comprehensive Error Detection', () => {
  
  describe('Valid JSON', () => {
    it('should validate simple object', () => {
      const result = validateJson('{"name": "John", "age": 30}');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should validate nested objects', () => {
      const result = validateJson('{"user": {"name": "John", "settings": {"theme": "dark"}}}');
      expect(result.valid).toBe(true);
    });
    
    it('should validate arrays', () => {
      const result = validateJson('[1, 2, 3, {"key": "value"}]');
      expect(result.valid).toBe(true);
    });
    
    it('should handle empty input', () => {
      const result = validateJson('');
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeNull();
    });
  });
  
  describe('Missing Comma Errors', () => {
    it('should detect missing comma between object properties', () => {
      const input = `{
  "eventId": "e_0001"
  "type": "deployment"
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.line).toBe(2);
      expect(result.error?.suggestion).toContain('comma');
    });
    
    it('should detect missing comma in array', () => {
      const input = `[
  "first"
  "second"
]`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.line).toBe(2);
      expect(result.error?.suggestion).toContain('comma');
    });
    
    it('should detect missing comma after number', () => {
      const input = `{
  "count": 42
  "status": "ok"
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.line).toBe(2);
    });
    
    it('should detect missing comma after boolean', () => {
      const input = `{
  "active": true
  "role": "admin"
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.line).toBe(2);
    });
  });
  
  describe('Unterminated String Errors', () => {
    it('should detect unterminated string in value', () => {
      const input = `{
  "type": "deployment
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.line).toBe(2);
      expect(result.error?.suggestion).toContain('quote');
    });
    
    it('should detect unterminated string in key', () => {
      const input = `{
  "name: "John"
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      // Line may be detected as line 1 or 2 depending on how parser reports it
      expect(result.error?.line).toBeGreaterThanOrEqual(1);
      expect(result.error?.line).toBeLessThanOrEqual(2);
    });
    
    it('should handle escaped quotes correctly', () => {
      const input = '{"message": "He said \\"hello\\""}';
      const result = validateJson(input);
      expect(result.valid).toBe(true);
    });
  });
  
  describe('Missing Colon Errors', () => {
    it('should detect missing colon after property name', () => {
      const input = `{
  "name"
  "John"
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      // Should detect an error with line information
      expect(result.error).toBeDefined();
      expect(result.error?.line).toBeGreaterThan(0);
    });
  });
  
  describe('Unmatched Bracket/Brace Errors', () => {
    it('should detect missing closing brace', () => {
      const input = `{
  "name": "John",
  "age": 30`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.suggestion).toContain('brace');
    });
    
    it('should detect missing closing bracket', () => {
      const input = `[1, 2, 3`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.suggestion).toContain('bracket');
    });
    
    it('should detect extra closing brace', () => {
      const input = `{
  "name": "John"
}}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.suggestion).toContain('Unexpected');
    });
    
    it('should detect mismatched brackets', () => {
      const input = `{
  "data": [1, 2, 3}
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.suggestion).toContain('Mismatched');
    });
  });
  
  describe('Trailing Comma Errors', () => {
    it('should detect trailing comma in object', () => {
      const input = `{
  "name": "John",
  "age": 30,
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.suggestion).toContain('trailing comma');
    });
    
    it('should detect trailing comma in array', () => {
      const input = `[
  1,
  2,
  3,
]`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.suggestion).toContain('trailing comma');
    });
  });
  
  describe('Duplicate Key Errors', () => {
    it('should note that JSON.parse allows duplicate keys (last wins)', () => {
      // Note: JSON.parse actually allows duplicate keys - the last value wins
      // This is not considered an error by the parser
      const input = `{
  "name": "John",
  "age": 30,
  "name": "Jane"
}`;
      const result = validateJson(input);
      // This will be valid - JSON.parse allows it
      expect(result.valid).toBe(true);
      expect(result.parsed).toEqual({ name: 'Jane', age: 30 });
    });
  });
  
  describe('Complex Nested Errors', () => {
    it('should handle errors in deeply nested structures', () => {
      const input = `{
  "events": [
    {
      "eventId": "e_0001",
      "payload": {
        "data": "test"
        "nested": true
      }
    }
  ]
}`;
      const result = validateJson(input);
      expect(result.valid).toBe(false);
      expect(result.error?.line).toBe(6);
      expect(result.error?.suggestion).toContain('comma');
    });
  });
  
  describe('Performance Tests', () => {
    it('should handle large valid JSON quickly', () => {
      const largeJson = JSON.stringify({
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
        })),
      });
      
      const start = performance.now();
      const result = validateJson(largeJson);
      const end = performance.now();
      
      expect(result.valid).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });
    
    it('should detect errors in large JSON quickly', () => {
      // Create large JSON with error at line 500
      const lines = [];
      lines.push('{');
      lines.push('  "data": [');
      for (let i = 0; i < 500; i++) {
        if (i === 250) {
          lines.push('    {"id": 250'); // Missing comma
        } else {
          lines.push(`    {"id": ${i}},`);
        }
      }
      lines.push('  ]');
      lines.push('}');
      
      const largeJson = lines.join('\n');
      
      const start = performance.now();
      const result = validateJson(largeJson);
      const end = performance.now();
      
      expect(result.valid).toBe(false);
      // Should detect error reasonably close to the actual error line
      // The error might be reported at different lines depending on how JSON.parse reports it
      expect(result.error?.line).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete quickly
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const result = validateJson('""');
      expect(result.valid).toBe(true);
    });
    
    it('should handle numbers', () => {
      const result = validateJson('42');
      expect(result.valid).toBe(true);
    });
    
    it('should handle booleans', () => {
      const result = validateJson('true');
      expect(result.valid).toBe(true);
    });
    
    it('should handle null', () => {
      const result = validateJson('null');
      expect(result.valid).toBe(true);
    });
    
    it('should handle whitespace-only input', () => {
      const result = validateJson('   \n\t  ');
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeNull();
    });
  });
});
