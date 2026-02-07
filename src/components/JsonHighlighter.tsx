 import React, { useMemo } from 'react';
 
 interface JsonHighlighterProps {
   json: string;
   className?: string;
 }
 
 interface Token {
   type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'punctuation';
   value: string;
 }
 
 function tokenize(json: string): Token[] {
   const tokens: Token[] = [];
   let i = 0;
   
   while (i < json.length) {
     const char = json[i];
     
     // Whitespace
     if (/\s/.test(char)) {
       let whitespace = '';
       while (i < json.length && /\s/.test(json[i])) {
         whitespace += json[i];
         i++;
       }
       tokens.push({ type: 'punctuation', value: whitespace });
       continue;
     }
     
     // Brackets and braces
     if (/[{}\[\]]/.test(char)) {
       tokens.push({ type: 'bracket', value: char });
       i++;
       continue;
     }
     
     // Punctuation
     if (char === ':' || char === ',') {
       tokens.push({ type: 'punctuation', value: char });
       i++;
       continue;
     }
     
     // String
     if (char === '"') {
       let str = '"';
       i++;
       while (i < json.length && json[i] !== '"') {
         if (json[i] === '\\' && i + 1 < json.length) {
           str += json[i] + json[i + 1];
           i += 2;
         } else {
           str += json[i];
           i++;
         }
       }
       str += '"';
       i++;
       
       // Check if it's a key (followed by :)
       let j = i;
       while (j < json.length && /\s/.test(json[j])) j++;
       const isKey = json[j] === ':';
       
       tokens.push({ type: isKey ? 'key' : 'string', value: str });
       continue;
     }
     
     // Number
     if (/[-\d]/.test(char)) {
       let num = '';
       while (i < json.length && /[-\d.eE+]/.test(json[i])) {
         num += json[i];
         i++;
       }
       tokens.push({ type: 'number', value: num });
       continue;
     }
     
     // Boolean or null
     if (json.substring(i, i + 4) === 'true') {
       tokens.push({ type: 'boolean', value: 'true' });
       i += 4;
       continue;
     }
     if (json.substring(i, i + 5) === 'false') {
       tokens.push({ type: 'boolean', value: 'false' });
       i += 5;
       continue;
     }
     if (json.substring(i, i + 4) === 'null') {
       tokens.push({ type: 'null', value: 'null' });
       i += 4;
       continue;
     }
     
     // Unknown character
     tokens.push({ type: 'punctuation', value: char });
     i++;
   }
   
   return tokens;
 }
 
 export const JsonHighlighter: React.FC<JsonHighlighterProps> = React.memo(({ json, className }) => {
   const highlighted = useMemo(() => {
     if (!json.trim()) return null;
     
     const tokens = tokenize(json);
     
     return tokens.map((token, idx) => {
       const colorClass = {
         key: 'syntax-key',
         string: 'syntax-string',
         number: 'syntax-number',
         boolean: 'syntax-boolean',
         null: 'syntax-null',
         bracket: 'syntax-bracket',
         punctuation: '',
       }[token.type];
       
       return (
         <span key={idx} className={colorClass}>
           {token.value}
         </span>
       );
     });
   }, [json]);
   
   return (
     <pre className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${className || ''}`}>
       <code>{highlighted}</code>
     </pre>
   );
 });
 
 JsonHighlighter.displayName = 'JsonHighlighter';