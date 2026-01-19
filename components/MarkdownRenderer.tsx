
import React, { useState, useEffect, useRef, memo, forwardRef, useImperativeHandle } from 'react';
import { Highlight, Reflection } from '../types';

export interface MarkdownRendererHandle {
    toggleReadAloud: () => void;
}

// Redefine types locally for component independence
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
type MaxWidth = 'sm' | 'md' | 'lg' | 'full';

interface MarkdownRendererProps {
  content: string;
  highlights?: Highlight[];
  reflection?: Reflection;
  onSaveReflection?: (content: string) => void;
  onOpenHighlight?: () => void;
  // Readability Props
  fontSize?: FontSize;
  lineHeight?: LineHeight;
  maxWidth?: MaxWidth;
}

const MarkdownRendererComponent = forwardRef<MarkdownRendererHandle, MarkdownRendererProps>(({ 
    content, 
    highlights = [], 
    reflection, 
    onSaveReflection,
    onOpenHighlight,
    fontSize = 'base',
    lineHeight = 'relaxed',
    maxWidth = 'md'
}, ref) => {
  // Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const synth = useRef<SpeechSynthesis | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (reflection) {
          setReflectionText(reflection.content);
      } else {
          setReflectionText('');
      }
  }, [reflection]);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synth.current = window.speechSynthesis;
    }
    
    // Cleanup on unmount
    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);

  // Stop speech when content changes
  useEffect(() => {
      if (synth.current) {
          synth.current.cancel();
          setIsSpeaking(false);
          setIsPaused(false);
      }
  }, [content]);

  const handleSaveReflectionClick = () => {
      if (onSaveReflection) {
          onSaveReflection(reflectionText);
      }
  };

  // Helper to strip markdown/html for reading
  const getReadableText = (markdown: string) => {
      return markdown
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/#{1,6}\s/g, '') // Remove heading markers
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
        .replace(/>\s/g, '') // Remove blockquote markers
        .replace(/`/g, '') // Remove code ticks
        .replace(/___NEWLINE___/g, ' ') // Clean temp placeholders if any
        .trim();
  };

  const handleSpeak = () => {
    if (!synth.current) return;

    if (isPaused) {
      synth.current.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else if (isSpeaking) {
      synth.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    } else {
      const text = getReadableText(content);
      utterance.current = new SpeechSynthesisUtterance(text);
      
      // Optional: Select a voice (English)
      const voices = synth.current.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices.find(v => v.lang.includes('en'));
      if (preferredVoice) {
          utterance.current.voice = preferredVoice;
      }

      utterance.current.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      utterance.current.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
      };

      synth.current.speak(utterance.current);
      setIsSpeaking(true);
    }
  };

  const handleStop = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // Expose methods to parent via Ref for Keyboard Shortcuts
  useImperativeHandle(ref, () => ({
      toggleReadAloud: () => {
          handleSpeak();
      }
  }));

  // Helper to generate IDs for headings
  const slugify = (text: string) => {
    const slug = text
      .toLowerCase()
      .replace(/<[^>]*>/g, '') 
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Fallback for empty slugs (e.g. if text was just emojis or special chars)
    return slug || `section-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper to highlight text
  const highlightText = (text: string): React.ReactNode[] => {
      const highlightTexts = highlights.map(h => h.text);
      
      if (!highlightTexts.length || !text.trim()) return [text];
      
      // Sort highlights by length (longest first) to ensure specific matches take precedence
      const uniqueHighlights = Array.from(new Set(highlightTexts.filter(h => h && h.trim())));
      if (uniqueHighlights.length === 0) return [text];

      const sortedHighlights = uniqueHighlights.sort((a, b) => b.length - a.length);
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create regex pattern
      const patternString = `(${sortedHighlights.map(escapeRegExp).join('|')})`;
      const pattern = new RegExp(patternString, 'gi');
      
      const parts = text.split(pattern);
      
      return parts.map((part, i) => {
          // Case insensitive check
          const isMatch = sortedHighlights.some(h => h.toLowerCase() === part.toLowerCase());
          if (isMatch) {
              return <mark key={`hl-${i}`} className="bg-amber-200 dark:bg-amber-700 text-gray-900 dark:text-white rounded-sm py-0.5 px-0.5 decoration-clone">{part}</mark>;
          }
          return part;
      });
  };

  // Helper for just Bold: **text**
  const parseBold = (text: string): React.ReactNode[] => {
    // Split by bold syntax
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const content = part.slice(2, -2);
        return <strong key={j} className="font-bold text-gray-900 dark:text-white">{highlightText(content)}</strong>;
      }
      return highlightText(part);
    }).flat();
  };

  // Helper to parse inline styles (Bold and Links)
  const parseInline = (text: string): React.ReactNode => {
    // 1. Split by Links: [text](url)
    // This regex captures the whole link group
    const linkRegex = /(\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(linkRegex);

    return parts.map((part, i) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      
      if (linkMatch) {
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        // Recursively parse bold inside the link text
        return (
          <a 
            key={i} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline decoration-indigo-300 dark:decoration-indigo-500 underline-offset-2 transition-colors"
          >
            {parseBold(linkText)}
          </a>
        );
      }
      
      // Parse bold in non-link text
      return <React.Fragment key={i}>{parseBold(part)}</React.Fragment>;
    });
  };

  // Pre-process content to protect <aside> blocks from splitting
  let processedContent = content.replace(/<aside>([\s\S]*?)<\/aside>/g, (match) => {
    return match.replace(/\n/g, '___NEWLINE___');
  });

  const blocks = processedContent.split(/\n\n+/);

  // Helper to find relevant highlights for a block of text to show margin notes
  const getHighlightsForBlock = (blockText: string) => {
      return highlights.filter(h => h.note && blockText.toLowerCase().includes(h.text.toLowerCase()));
  };

  // Map props to classes
  const getFontSizeClass = () => {
      // Scale up sizes: Base mapped to 'lg' (18px) for better readability
      switch (fontSize) {
          case 'sm': return 'prose-base'; // 16px
          case 'base': return 'prose-lg'; // 18px (Targeted size)
          case 'lg': return 'prose-xl';   // 20px
          case 'xl': return 'prose-2xl';  // 24px
          default: return 'prose-lg';
      }
  };
  
  const getLineHeightClass = () => {
      switch (lineHeight) {
          case 'tight': return 'leading-tight';
          case 'normal': return 'leading-normal';
          case 'relaxed': return 'leading-relaxed';
          case 'loose': return 'leading-loose';
          default: return 'leading-relaxed';
      }
  };

  // Main prose container class
  const proseClass = `prose prose-indigo dark:prose-invert max-w-none prose-content text-gray-700 dark:text-gray-300 ${getFontSizeClass()} ${getLineHeightClass()}`;

  return (
    <div className="relative" ref={containerRef}>
        {/* Read Aloud Controls */}
        <div className="flex justify-end mb-4 gap-2">
            <button 
                onClick={handleSpeak}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm border
                    ${isSpeaking 
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 animate-pulse' 
                        : isPaused
                            ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }
                `}
                title={isSpeaking ? "Pause (Shortcut: 'a')" : isPaused ? "Resume (Shortcut: 'a')" : "Read Aloud (Shortcut: 'a')"}
            >
                {isSpeaking ? (
                    <>
                        <span className="material-symbols-outlined text-lg">pause</span>
                        Pause
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-lg">volume_up</span>
                        {isPaused ? "Resume" : "Read Aloud"}
                    </>
                )}
            </button>
            
            {(isSpeaking || isPaused) && (
                <button 
                    onClick={handleStop}
                    className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors flex items-center justify-center"
                    title="Stop Reading"
                >
                    <span className="material-symbols-outlined text-lg">stop</span>
                </button>
            )}
        </div>

        <div className={proseClass}>
          {blocks.map((block, index) => {
            const restoredBlock = block.replace(/___NEWLINE___/g, '\n');
            
            // Identify Margin Notes for this block
            const blockHighlights = getHighlightsForBlock(restoredBlock);

            // Wrapper for margin notes positioning
            const BlockWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
                <div className="relative group">
                    {children}
                    {blockHighlights.length > 0 && maxWidth !== 'full' && (
                        <div className="hidden xl:flex flex-col gap-3 absolute left-full top-0 ml-8 w-64 z-10 animate-fade-in-up">
                             {blockHighlights.map(h => (
                                 <div 
                                    key={h.id} 
                                    onClick={onOpenHighlight}
                                    className="bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 p-3 rounded-md shadow-sm text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors relative group/note"
                                 >
                                     <div className="absolute -left-2 top-4 w-2 h-2 bg-amber-200 dark:bg-amber-700 transform rotate-45 border-l border-b border-amber-200 dark:border-amber-700"></div>
                                     <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1 border-b border-amber-200 dark:border-amber-700 pb-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                                        Note
                                     </div>
                                     <p className="text-gray-600 dark:text-gray-400 italic mb-2 line-clamp-2 border-l-2 border-amber-300 dark:border-amber-600 pl-2">"{h.text}"</p>
                                     <p className="text-gray-900 dark:text-gray-200 font-medium">{h.note}</p>
                                 </div>
                             ))}
                        </div>
                    )}
                    {/* Mobile/Tablet/FullWidth Indicator for Notes */}
                     {blockHighlights.length > 0 && (
                        <button 
                            onClick={onOpenHighlight}
                            className={`absolute -right-6 top-0 text-amber-500 hover:text-amber-600 ${maxWidth === 'full' ? 'block' : 'xl:hidden block'}`}
                            title="View Notes"
                        >
                            <span className="material-symbols-outlined text-xl material-symbols-filled">sticky_note_2</span>
                        </button>
                    )}
                </div>
            );

            // Aside / Callout
            if (restoredBlock.includes('<aside>')) {
                const contentInside = restoredBlock.replace(/<aside>|<\/aside>/g, '').trim();
                const cleanText = contentInside.replace(/<img[^>]*>/g, ''); 
                
                return (
                    <BlockWrapper key={index}>
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500 p-5 my-8 rounded-r-lg shadow-sm">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 text-indigo-600 dark:text-indigo-400 mt-1">
                                    <span className="material-symbols-outlined">lightbulb</span>
                                </div>
                                <div className="text-indigo-900 dark:text-indigo-100 text-base leading-relaxed font-medium">
                                    {parseInline(cleanText)}
                                </div>
                            </div>
                        </div>
                    </BlockWrapper>
                );
            }

            // Headings
            if (restoredBlock.startsWith('# ')) {
              const text = restoredBlock.replace('# ', '');
              const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
              return (
                <BlockWrapper key={index}>
                    <h1 id={slugify(plainText)} className="mt-12 mb-6 text-gray-900 dark:text-white tracking-tight scroll-mt-20">{parseInline(text)}</h1>
                </BlockWrapper>
              );
            }
            if (restoredBlock.startsWith('## ')) {
              const text = restoredBlock.replace('## ', '');
              const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
              return (
                <BlockWrapper key={index}>
                     <h2 id={slugify(plainText)} className="mt-10 mb-5 text-gray-900 dark:text-gray-100 scroll-mt-20">{parseInline(text)}</h2>
                </BlockWrapper>
              );
            }
            if (restoredBlock.startsWith('### ')) {
              const text = restoredBlock.replace('### ', '');
              const plainText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
              return (
                <BlockWrapper key={index}>
                    <h3 id={slugify(plainText)} className="mt-8 mb-4 text-gray-800 dark:text-gray-200 scroll-mt-20">{parseInline(text)}</h3>
                </BlockWrapper>
              );
            }

            // Blockquotes
            if (restoredBlock.startsWith('> ')) {
              return (
                <BlockWrapper key={index}>
                    <blockquote className="pl-6 border-l-4 border-indigo-200 dark:border-indigo-700 italic text-gray-700 dark:text-gray-300 my-8 py-2 leading-loose bg-gray-50 dark:bg-gray-800/50 rounded-r-lg pr-4">
                    {parseInline(restoredBlock.replace(/> /g, ''))}
                    </blockquote>
                </BlockWrapper>
              );
            }

            // Lists
            if (restoredBlock.match(/^\d\./) || restoredBlock.match(/^- /)) {
              const items = restoredBlock.split('\n');
              return (
                <BlockWrapper key={index}>
                    <ul className="list-disc pl-6 space-y-3 my-6 marker:text-indigo-400 dark:marker:text-indigo-500">
                    {items.map((item, i) => (
                        <li key={i} className="text-gray-700 dark:text-gray-300 pl-2">
                        {parseInline(item.replace(/^\d\.\s/, '').replace(/^-\s/, ''))}
                        </li>
                    ))}
                    </ul>
                </BlockWrapper>
              );
            }

            // Tables
            if (restoredBlock.includes('|')) {
                const rows = restoredBlock.split('\n').filter(row => row.trim() !== '');
                return (
                    <div key={index} className="overflow-x-auto my-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <tbody>
                                {rows.map((row, rIdx) => (
                                    <tr 
                                        key={rIdx} 
                                        className={
                                            rIdx === 0 
                                                ? 'bg-gray-100 dark:bg-gray-800 font-bold text-gray-900 dark:text-white' 
                                                : `transition-colors ${rIdx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'} hover:bg-indigo-50 dark:hover:bg-indigo-900/20`
                                        }
                                    >
                                        {row.split('|').filter(c => c.trim() !== '').map((cell, cIdx) => (
                                            <td key={cIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-x border-gray-200 dark:border-gray-700 first:border-l-0 last:border-r-0">
                                                {parseInline(cell.trim())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            // Paragraphs
            return (
                <BlockWrapper key={index}>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        {parseInline(restoredBlock)}
                    </p>
                </BlockWrapper>
            );
          })}
        </div>

        {/* Key Lessons & Reflections Section */}
        {onSaveReflection && (
            <div className="mt-16 pt-8 border-t-2 border-gray-100 dark:border-gray-800">
                <div className="bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-900 rounded-xl p-8 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-indigo-900 dark:text-indigo-100">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                             <span className="material-symbols-outlined">psychology_alt</span>
                        </div>
                        <h3 className="text-xl font-bold">Key Lessons & Reflections</h3>
                    </div>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-6 leading-relaxed">
                        Use this space to jot down your key takeaways, specific lessons learned, or questions you want to follow up on from this section. These notes will be saved to your dashboard.
                    </p>
                    <textarea
                        value={reflectionText}
                        onChange={(e) => setReflectionText(e.target.value)}
                        className="w-full p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 min-h-[150px] text-gray-800 dark:text-gray-100 shadow-inner placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="What are the main points you want to remember? How does this apply to your practice?..."
                    />
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={handleSaveReflectionClick}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:transform active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">save</span>
                            Save Reflection
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
});

export const MarkdownRenderer = memo(MarkdownRendererComponent);
