
import React, { useState } from 'react';
import { Highlight, Reflection } from '../types';
import { exportHighlightsToMarkdown } from '../utils/highlightExporter';
import { summarizeHighlights } from '../services/geminiService';

interface HighlightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  reflections?: Reflection[];
  onDeleteHighlight: (id: string) => void;
  onDeleteReflection?: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onNavigate: (sectionId: string, text?: string) => void;
  onShareLink: (sectionId: string, text: string) => void;
  onShareImage: (text: string, sectionTitle: string) => void;
}

export const HighlightsDrawer: React.FC<HighlightsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  highlights, 
  reflections = [],
  onDeleteHighlight,
  onDeleteReflection,
  onUpdateNote,
  onNavigate,
  onShareLink,
  onShareImage
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'summary'>('list');
  const [filter, setFilter] = useState<'all' | 'notes' | 'reflections'>('all');
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  if (!isOpen) return null;

  const sortedHighlights = [...highlights].sort((a, b) => b.date - a.date);
  const notesOnly = sortedHighlights.filter(h => h.note && h.note.trim().length > 0);
  const sortedReflections = [...reflections].sort((a, b) => b.date - a.date);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleSummarize = async () => {
    setView('summary');
    if (summary) return; 
    
    setIsSummarizing(true);
    try {
        const result = await summarizeHighlights(highlights);
        setSummary(result);
    } catch (e) {
        setSummary("Failed to generate summary. Please check your internet connection or API key.");
    } finally {
        setIsSummarizing(false);
    }
  };

  // Simple markdown renderer for the summary
  const renderSummary = (text: string) => {
      return text.split('\n').map((line, i) => {
          if (line.startsWith('###')) return <h4 key={i} className="text-base font-bold text-indigo-700 dark:text-indigo-400 mt-4 mb-2">{line.replace('###', '').trim()}</h4>;
          if (line.startsWith('##')) return <h3 key={i} className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mt-6 mb-3">{line.replace('##', '').trim()}</h3>;
          if (line.startsWith('#')) return <h2 key={i} className="text-xl font-bold text-indigo-900 dark:text-indigo-200 mt-6 mb-3">{line.replace('#', '').trim()}</h2>;
          if (line.startsWith('-') || line.startsWith('*')) return <li key={i} className="ml-4 text-gray-700 dark:text-gray-300 mb-1">{line.replace(/^[-*]\s/, '')}</li>;
          if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-gray-700 dark:text-gray-300 mb-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
          if (line.trim() === '') return <div key={i} className="h-2"></div>;
          // Bold parsing
          const parts = line.split(/(\*\*.*?\*\*)/);
          return (
            <p key={i} className="text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </p>
          );
      });
  };

  const renderContent = () => {
      if (filter === 'reflections') {
          if (sortedReflections.length === 0) {
              return (
                <div className="text-center text-gray-400 dark:text-gray-500 mt-10 flex flex-col items-center">
                    <span className="material-symbols-outlined text-5xl mb-3 opacity-50">psychology_alt</span>
                    <p>No reflections saved yet.</p>
                    <p className="text-xs mt-2 max-w-[200px]">Use the "Key Lessons & Reflections" box at the end of each section to add one.</p>
                </div>
              );
          }
          return (
              <div className="space-y-6">
                  {sortedReflections.map(r => (
                      <div key={r.id} className="bg-white dark:bg-gray-900 p-5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                          <div className="flex justify-between items-start mb-3 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">
                                <button 
                                    onClick={() => onNavigate(r.sectionId)}
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline text-left"
                                >
                                    {r.sectionTitle}
                                </button>
                                {onDeleteReflection && (
                                    <button 
                                        onClick={() => onDeleteReflection(r.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                        title="Delete Reflection"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                )}
                          </div>
                          <div className="prose prose-sm text-gray-700 dark:text-gray-300">
                              <p className="whitespace-pre-wrap">{r.content}</p>
                          </div>
                          <div className="mt-3 text-right text-[10px] text-gray-400 dark:text-gray-500">
                              {new Date(r.date).toLocaleDateString()}
                          </div>
                      </div>
                  ))}
              </div>
          );
      }

      const listToRender = filter === 'notes' ? notesOnly : sortedHighlights;

      if (listToRender.length === 0) {
        return (
            <div className="text-center text-gray-400 dark:text-gray-500 mt-10 flex flex-col items-center">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-50">
                    {filter === 'notes' ? 'sticky_note_2' : 'description'}
                </span>
                <p>{filter === 'notes' ? 'No highlights with notes found.' : 'No notes or highlights yet.'}</p>
                {filter === 'all' && <p className="text-xs mt-2">Select text while reading to add one.</p>}
            </div>
        );
      }

      return (
        <div className="space-y-6">
            {listToRender.map((h) => (
                <div key={h.id} className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-2">
                        <button 
                            onClick={() => onNavigate(h.sectionId, h.text)}
                            className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider hover:underline text-left max-w-[55%]"
                        >
                            {h.sectionTitle}
                        </button>
                        <div className="flex items-center gap-1">
                                <button 
                                onClick={() => handleCopy(h.id, h.text)}
                                className="text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1 rounded"
                                title="Copy text"
                            >
                                {copiedId === h.id ? (
                                        <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-500">check</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                )}
                            </button>
                            <button 
                                onClick={() => onShareLink(h.sectionId, h.text)}
                                className="text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1 rounded"
                                title="Copy Link to Highlight"
                            >
                                <span className="material-symbols-outlined text-sm">link</span>
                            </button>
                            <button 
                                onClick={() => onShareImage(h.text, h.sectionTitle)}
                                className="text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1 rounded"
                                title="Share as Image"
                            >
                                <span className="material-symbols-outlined text-sm">image</span>
                            </button>
                            <button 
                                onClick={() => onDeleteHighlight(h.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                                title="Remove highlight"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                    <blockquote 
                        onClick={() => onNavigate(h.sectionId, h.text)}
                        className="text-gray-700 dark:text-gray-300 italic text-sm border-l-2 border-amber-300 dark:border-amber-700 pl-3 leading-relaxed cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 mb-3"
                    >
                        "{h.text}"
                    </blockquote>
                    
                    <div className="mb-3">
                        <textarea
                            value={h.note || ''}
                            onChange={(e) => onUpdateNote(h.id, e.target.value)}
                            placeholder="Add a note..."
                            className={`w-full text-xs p-2 border rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:outline-none resize-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition-colors ${h.note ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                            rows={2}
                        />
                    </div>

                    <div className="text-right flex justify-between items-end">
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 text-left">
                            {h.author && <span>— {h.author}</span>}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}
        </div>
      );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 transform transition-transform duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                {view === 'summary' ? (
                    <button onClick={() => setView('list')} className="mr-1 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-1">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                ) : (
                    <span className="material-symbols-outlined">bookmarks</span>
                )}
                <h2 className="font-bold text-lg">
                    {view === 'list' ? 'Your Notes' : 'AI Summary'}
                </h2>
            </div>
            <button onClick={onClose} className="hover:bg-indigo-200 dark:hover:bg-indigo-800 p-1 rounded flex items-center text-indigo-700 dark:text-indigo-300">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>
        
        {/* Tabs */}
        {view === 'list' && (
            <div className="flex p-1 bg-white/50 dark:bg-black/20 rounded-lg border border-indigo-100 dark:border-indigo-900">
                <button 
                    onClick={() => setFilter('all')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('notes')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'notes' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
                >
                    Notes
                </button>
                <button 
                    onClick={() => setFilter('reflections')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'reflections' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300'}`}
                >
                    Reflections
                </button>
            </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
        {view === 'list' ? (
             renderContent()
        ) : (
            // SUMMARY VIEW
            <div className="h-full flex flex-col">
                {isSummarizing ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping"></div>
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <p className="text-sm font-medium">Analyzing your notes...</p>
                     </div>
                ) : (
                    <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none">
                        {renderSummary(summary)}
                        
                        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
                            <button 
                                onClick={() => {
                                    setSummary(''); 
                                    handleSummarize();
                                }}
                                className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline"
                            >
                                Regenerate Summary
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Footer Actions */}
      {view === 'list' && (
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <button 
                onClick={handleSummarize}
                disabled={highlights.length === 0 && reflections.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium text-sm shadow-sm hover:shadow"
            >
                <span className="material-symbols-outlined">psychology</span>
                Identify Key Lessons (AI)
            </button>
            
            <button 
                onClick={() => exportHighlightsToMarkdown(highlights)}
                disabled={highlights.length === 0}
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium text-sm"
            >
                <span className="material-symbols-outlined">file_download</span>
                Export to Markdown
            </button>
        </div>
      )}
    </div>
  );
};
