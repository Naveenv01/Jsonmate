 import React, { useState, useMemo } from 'react';
 import { X, ArrowLeftRight } from 'lucide-react';
 import { JsonEditor } from './JsonEditor';
 import { compareJson, DiffResult, validateJson, formatJson } from '../utils/jsonUtils';
 
 interface CompareViewProps {
   initialLeft?: string;
   onClose: () => void;
 }
 
 export const CompareView: React.FC<CompareViewProps> = ({ initialLeft = '', onClose }) => {
   const [leftJson, setLeftJson] = useState(initialLeft);
   const [rightJson, setRightJson] = useState('');
   
   const diffs = useMemo(() => {
     if (!leftJson.trim() || !rightJson.trim()) return [];
     return compareJson(leftJson, rightJson);
   }, [leftJson, rightJson]);
   
   const leftValid = validateJson(leftJson).valid || !leftJson.trim();
   const rightValid = validateJson(rightJson).valid || !rightJson.trim();
   
   const handleSwap = () => {
     const temp = leftJson;
     setLeftJson(rightJson);
     setRightJson(temp);
   };
   
   const handleFormat = (side: 'left' | 'right') => {
     if (side === 'left') {
       setLeftJson(formatJson(leftJson));
     } else {
       setRightJson(formatJson(rightJson));
     }
   };
   
   return (
     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in">
       <div className="glass-panel w-full max-w-6xl h-[80vh] rounded-2xl shadow-glass-lg flex flex-col overflow-hidden">
         {/* Header */}
         <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
           <h2 className="text-lg font-semibold">Compare JSON</h2>
           <div className="flex items-center gap-2">
             <button
               onClick={handleSwap}
               className="glass-button flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
             >
               <ArrowLeftRight className="w-4 h-4" />
               Swap
             </button>
             <button
               onClick={onClose}
               className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
           </div>
         </div>
         
         {/* Editors */}
         <div className="flex-1 flex overflow-hidden">
           {/* Left panel */}
           <div className="flex-1 flex flex-col border-r border-border/50">
             <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
               <span className="text-sm font-medium text-muted-foreground">Original</span>
               <div className="flex items-center gap-2">
                 <span className={`text-xs ${leftValid ? 'text-syntax-string' : 'text-destructive'}`}>
                   {leftValid ? '✓ Valid' : '✗ Invalid'}
                 </span>
                 <button
                   onClick={() => handleFormat('left')}
                   className="text-xs text-muted-foreground hover:text-foreground"
                 >
                   Format
                 </button>
               </div>
             </div>
             <JsonEditor
               value={leftJson}
               onChange={setLeftJson}
               placeholder="Paste first JSON..."
             />
           </div>
           
           {/* Right panel */}
           <div className="flex-1 flex flex-col">
             <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
               <span className="text-sm font-medium text-muted-foreground">Modified</span>
               <div className="flex items-center gap-2">
                 <span className={`text-xs ${rightValid ? 'text-syntax-string' : 'text-destructive'}`}>
                   {rightValid ? '✓ Valid' : '✗ Invalid'}
                 </span>
                 <button
                   onClick={() => handleFormat('right')}
                   className="text-xs text-muted-foreground hover:text-foreground"
                 >
                   Format
                 </button>
               </div>
             </div>
             <JsonEditor
               value={rightJson}
               onChange={setRightJson}
               placeholder="Paste second JSON..."
             />
           </div>
         </div>
         
         {/* Diff results */}
         {diffs.length > 0 && (
           <div className="border-t border-border/50 max-h-48 overflow-auto custom-scrollbar">
             <div className="px-4 py-2 bg-muted/30">
               <span className="text-sm font-medium">{diffs.length} difference{diffs.length !== 1 ? 's' : ''} found</span>
             </div>
             <div className="divide-y divide-border/30">
               {diffs.map((diff, idx) => (
                 <DiffRow key={idx} diff={diff} />
               ))}
             </div>
           </div>
         )}
       </div>
     </div>
   );
 };
 
 const DiffRow: React.FC<{ diff: DiffResult }> = ({ diff }) => {
   const bgClass = {
     added: 'diff-added',
     removed: 'diff-removed',
     changed: 'diff-changed',
     unchanged: '',
   }[diff.type];
   
   return (
     <div className={`px-4 py-2 text-sm font-mono ${bgClass}`}>
       <span className="text-muted-foreground">{diff.path || '(root)'}: </span>
       {diff.type === 'added' && (
         <span className="syntax-string">+ {JSON.stringify(diff.rightValue)}</span>
       )}
       {diff.type === 'removed' && (
         <span className="syntax-null">- {JSON.stringify(diff.leftValue)}</span>
       )}
       {diff.type === 'changed' && (
         <>
           <span className="syntax-null">{JSON.stringify(diff.leftValue)}</span>
           <span className="text-muted-foreground"> → </span>
           <span className="syntax-string">{JSON.stringify(diff.rightValue)}</span>
         </>
       )}
     </div>
   );
 };