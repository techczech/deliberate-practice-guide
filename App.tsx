
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { MarkdownRenderer, MarkdownRendererHandle } from './components/MarkdownRenderer';
import { ChatDrawer } from './components/ChatDrawer';
import { HighlightsDrawer } from './components/HighlightsDrawer';
import { Home } from './components/Home';
import { TableOfContents, TableOfContentsHandle } from './components/TableOfContents';
import { QuoteImageModal } from './components/QuoteImageModal';
import { Toast } from './components/Toast';
import { ShortcutsModal } from './components/ShortcutsModal';
import { GUIDE_CONTENT } from './data';
import { generateEPUB } from './utils/epubGenerator';
import { Highlight, Reflection } from './types';

// Types for Readability Settings
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';
export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
export type MaxWidth = 'sm' | 'md' | 'lg' | 'full';

export default function App() {
  // Helper to get section from URL
  const getInitialSection = () => {
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get('section');
    if (sectionParam && GUIDE_CONTENT.some(s => s.id === sectionParam)) {
      return sectionParam;
    }
    return 'home';
  };

  const [currentSectionId, setCurrentSectionId] = useState<string>(getInitialSection);
  
  // Load read sections from localStorage
  const [readSections, setReadSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('readSections');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      console.warn("Failed to load progress from localStorage", e);
      return new Set();
    }
  });

  // Load bookmarks from localStorage
  const [bookmarkedSections, setBookmarkedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('bookmarkedSections');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Highlights State
  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    try {
        const saved = localStorage.getItem('userHighlights');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  // Reflections State
  const [reflections, setReflections] = useState<Reflection[]>(() => {
    try {
        const saved = localStorage.getItem('userReflections');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      // Check system preference if no saved preference
      if (saved === null) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return JSON.parse(saved);
    } catch (e) {
      return false;
    }
  });

  // Readability Settings State
  const [fontSize, setFontSize] = useState<FontSize>(() => {
      return (localStorage.getItem('fontSize') as FontSize) || 'base';
  });
  const [lineHeight, setLineHeight] = useState<LineHeight>(() => {
      return (localStorage.getItem('lineHeight') as LineHeight) || 'relaxed';
  });
  const [maxWidth, setMaxWidth] = useState<MaxWidth>(() => {
      return (localStorage.getItem('maxWidth') as MaxWidth) || 'md';
  });

  useEffect(() => { localStorage.setItem('fontSize', fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem('lineHeight', lineHeight); }, [lineHeight]);
  useEffect(() => { localStorage.setItem('maxWidth', maxWidth); }, [maxWidth]);

  const cycleFontSize = () => {
      const sizes: FontSize[] = ['sm', 'base', 'lg', 'xl'];
      const next = sizes[(sizes.indexOf(fontSize) + 1) % sizes.length];
      setFontSize(next);
  };

  const cycleLineHeight = () => {
      const heights: LineHeight[] = ['tight', 'normal', 'relaxed', 'loose'];
      const next = heights[(heights.indexOf(lineHeight) + 1) % heights.length];
      setLineHeight(next);
  };

  const cycleMaxWidth = () => {
      const widths: MaxWidth[] = ['sm', 'md', 'lg', 'full'];
      const next = widths[(widths.indexOf(maxWidth) + 1) % widths.length];
      setMaxWidth(next);
  };

  // Map maxWidth state to Tailwind classes for the container
  const getContainerWidthClass = () => {
      if (isImmersiveMode) return 'max-w-3xl'; // Fixed width in focus mode for optimal reading
      switch (maxWidth) {
          case 'sm': return 'max-w-prose'; // Approx 65ch
          case 'md': return 'max-w-3xl';
          case 'lg': return 'max-w-5xl';
          case 'full': return 'max-w-none px-4 lg:px-12';
          default: return 'max-w-3xl';
      }
  };

  // Sidebar State Logic: Default open on desktop if not home
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
      return window.innerWidth >= 1024 && getInitialSection() !== 'home';
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isGeneratingEbook, setIsGeneratingEbook] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  
  // Ruler State
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerY, setRulerY] = useState(200); // Top position in px
  const [rulerLines, setRulerLines] = useState(2); // Number of lines (1-4)

  // Search State
  const [isSearchTriggered, setIsSearchTriggered] = useState(false);

  // Quote Modal & Toast State
  const [quoteModalData, setQuoteModalData] = useState<{ text: string, title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Text Selection State
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [highlightToScroll, setHighlightToScroll] = useState<string | null>(null);
  
  // Ref for the scrollable content area
  const contentRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MarkdownRendererHandle>(null);
  const tocRef = useRef<TableOfContentsHandle>(null);

  // Memoize derived data to prevent unnecessary re-renders in child components
  const currentSection = useMemo(() => GUIDE_CONTENT.find(s => s.id === currentSectionId), [currentSectionId]);
  const isHome = currentSectionId === 'home';
  const isBookmarked = bookmarkedSections.has(currentSectionId);

  // Get highlights for current section (Memoized)
  const currentSectionHighlights = useMemo(() => 
      highlights.filter(h => h.sectionId === currentSectionId), 
      [highlights, currentSectionId]
  );
  
  // Get reflection for current section (Memoized)
  const currentSectionReflection = useMemo(() => 
      reflections.find(r => r.sectionId === currentSectionId), 
      [reflections, currentSectionId]
  );

  // Apply Dark Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Save read sections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('readSections', JSON.stringify(Array.from(readSections)));
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  }, [readSections]);

  // Save bookmarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bookmarkedSections', JSON.stringify(Array.from(bookmarkedSections)));
    } catch (e) {
      console.error("Failed to save bookmarks", e);
    }
  }, [bookmarkedSections]);

  // Save highlights to localStorage
  useEffect(() => {
      try {
          localStorage.setItem('userHighlights', JSON.stringify(highlights));
      } catch (e) {
          console.error("Failed to save highlights", e);
      }
  }, [highlights]);

  // Save reflections to localStorage
  useEffect(() => {
      try {
          localStorage.setItem('userReflections', JSON.stringify(reflections));
      } catch (e) {
          console.error("Failed to save reflections", e);
      }
  }, [reflections]);

  // Handle Heading Navigation (Global j/k)
  const handleNavigateHeading = (direction: 'next' | 'prev') => {
      if (!contentRef.current) return;
      
      const container = contentRef.current;
      const headings = Array.from(container.querySelectorAll('h1, h2, h3')) as HTMLElement[];
      if (headings.length === 0) return;

      // Get positions relative to the viewport to avoid issues with scrollTop
      const containerRect = container.getBoundingClientRect();
      const threshold = 80; // Buffer for sticky header or visual comfort

      let target: HTMLElement | null = null;

      if (direction === 'next') {
          // Find first heading that is sufficiently below the top of the container
          target = headings.find(h => {
              const rect = h.getBoundingClientRect();
              return rect.top > containerRect.top + threshold;
          }) || headings[headings.length - 1];
      } else {
          // Find last heading that is above the top threshold
          // We reverse to find the closest one "above"
          target = [...headings].reverse().find(h => {
              const rect = h.getBoundingClientRect();
              return rect.top < containerRect.top + threshold - 20;
          }) || headings[0];
      }

      if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  // GLOBAL SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if typing in input, textarea or contentEditable
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }
        
        // Check if focus is inside TOC to prevent conflicting global J/K navigation
        const isTocFocused = document.activeElement && document.activeElement.closest('#toc-container');

        // Ignore if modifiers are pressed (Ctrl, Alt, Meta) to allow browser shortcuts
        // Exception for '?' which typically requires Shift
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        switch(e.key.toLowerCase()) {
            case '?': // Help
                if (e.shiftKey) { // Ensure it is shift + /
                    e.preventDefault();
                    setIsShortcutsOpen(true);
                }
                break;
            case 'h': // Highlight (only if selection)
                if (selectedText) {
                    e.preventDefault();
                    saveHighlight();
                }
                break;
            case 'l': // Copy Link
                e.preventDefault();
                if (selectedText) {
                    shareHighlightLink();
                } else {
                    sharePageLink();
                }
                break;
            case 'f': // Focus / Immersive Mode
                e.preventDefault();
                setIsImmersiveMode(prev => !prev);
                showToast("Toggled Focus Mode");
                break;
            case 'b': // Bookmark
                e.preventDefault();
                toggleBookmark();
                break;
            case 'r': // RULER
                e.preventDefault();
                setIsRulerActive(prev => !prev);
                if (!isRulerActive) showToast("Ruler Active");
                break;
            case 'a': // READ ALOUD (changed from r)
                e.preventDefault();
                rendererRef.current?.toggleReadAloud();
                break;
            case 'j': // Jump Next Heading
                if (!isTocFocused) {
                    e.preventDefault();
                    handleNavigateHeading('next');
                }
                break;
            case 'k': // Jump Prev Heading
                if (!isTocFocused) {
                    e.preventDefault();
                    handleNavigateHeading('prev');
                }
                break;
            case 'n': // Navigation / TOC
                e.preventDefault();
                if (isImmersiveMode) setIsImmersiveMode(false);
                // Small delay to allow layout to shift if turning off immersive mode
                setTimeout(() => {
                   tocRef.current?.focus();
                }, 50);
                break;
            case 's': // Sidebar
                e.preventDefault();
                setIsSidebarOpen(prev => !prev);
                break;
            case 'escape':
                setIsShortcutsOpen(false);
                setQuoteModalData(null);
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedText, isImmersiveMode, currentSectionId, isRulerActive]); 

  // Ruler Keyboard Listeners (Specific)
  useEffect(() => {
    if (!isRulerActive) return;

    const handleRulerKeys = (e: KeyboardEvent) => {
      const LINE_HEIGHT = 42;
      const MOVE_STEP = 20;
      const SCROLL_THRESHOLD = 150;
      
      // Resize commands
      if (['1', '2', '3', '4'].includes(e.key)) {
        setRulerLines(parseInt(e.key));
        showToast(`Ruler size: ${e.key} line${e.key === '1' ? '' : 's'}`);
      }
      
      // Move Down
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRulerY(prev => {
          const next = prev + MOVE_STEP;
          if (next > window.innerHeight - SCROLL_THRESHOLD) {
             window.scrollBy({ top: MOVE_STEP, behavior: 'smooth' });
             return prev;
          }
          return next;
        });
      }
      
      // Move Up
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRulerY(prev => {
          const next = prev - MOVE_STEP;
          if (next < SCROLL_THRESHOLD) {
             window.scrollBy({ top: -MOVE_STEP, behavior: 'smooth' });
             return prev;
          }
          return Math.max(0, next);
        });
      }

      if (e.key === 'Escape') {
        setIsRulerActive(false);
      }
    };

    window.addEventListener('keydown', handleRulerKeys);
    return () => window.removeEventListener('keydown', handleRulerKeys);
  }, [isRulerActive]);

  // Handle Browser Navigation (Back/Forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentSectionId(getInitialSection());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check URL for 'text' param to scroll to on load or section change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const textParam = params.get('text');
    if (textParam && contentRef.current) {
        setTimeout(() => {
             setHighlightToScroll(textParam);
        }, 500);
    }
  }, [currentSectionId]);

  // Automatically mark the current section as read
  useEffect(() => {
    if (currentSectionId !== 'home' && !readSections.has(currentSectionId)) {
      setReadSections(prev => {
        const newSet = new Set(prev);
        newSet.add(currentSectionId);
        return newSet;
      });
    }
  }, [currentSectionId, readSections]);

  // Scroll to Highlight Logic
  useEffect(() => {
    if (highlightToScroll && currentSectionId && contentRef.current) {
        const timer = setTimeout(() => {
            const container = contentRef.current;
            if (!container) return;

            const elements = container.querySelectorAll('p, li, h1, h2, h3, blockquote, td, div.bg-indigo-50, div.dark\\:bg-indigo-900\\/30');
            const searchLower = highlightToScroll.toLowerCase();
            
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i] as HTMLElement;
                if (el.textContent && el.textContent.toLowerCase().includes(searchLower)) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    const originalTransition = el.style.transition;
                    const originalBg = el.style.backgroundColor;
                    
                    el.style.transition = "background-color 0.5s ease";
                    el.style.backgroundColor = isDarkMode ? "#4338ca" : "#fef3c7"; 
                    
                    setTimeout(() => {
                        el.style.backgroundColor = originalBg;
                        setTimeout(() => {
                             el.style.transition = originalTransition;
                        }, 500);
                    }, 1500);
                    
                    break;
                }
            }
            setHighlightToScroll(null);
        }, 300); 
        return () => clearTimeout(timer);
    }
  }, [currentSectionId, highlightToScroll, isDarkMode]);

  // Handle finding next/prev for navigation buttons
  const currentIndex = GUIDE_CONTENT.findIndex(s => s.id === currentSectionId);
  const prevSection = currentIndex > 0 ? GUIDE_CONTENT[currentIndex - 1] : null;
  const nextSection = currentIndex >= 0 && currentIndex < GUIDE_CONTENT.length - 1 ? GUIDE_CONTENT[currentIndex + 1] : null;

  const handleSectionChange = (id: string, text?: string) => {
    setCurrentSectionId(id);
    
    // Open sidebar on desktop when navigating away from home, unless already open
    if (id !== 'home' && window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
    }

    const url = new URL(window.location.href);
    if (id === 'home') {
        url.pathname = window.location.pathname;
        url.search = ''; 
    } else {
        url.searchParams.set('section', id);
        if (text) {
            url.searchParams.set('text', text);
        } else {
            url.searchParams.delete('text');
        }
    }
    window.history.pushState({ section: id, text }, '', url.toString());
    
    if (text) {
        setHighlightToScroll(text);
    } else if (contentRef.current && !highlightToScroll) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setSelectionRect(null);
    // Close sidebar only on mobile when navigating
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    setIsSearchTriggered(false);
  };

  const handleOpenSearch = () => {
      setIsSidebarOpen(true);
      setIsSearchTriggered(true);
  };

  const toggleBookmark = () => {
    if (currentSectionId === 'home') return;
    setBookmarkedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(currentSectionId)) {
            newSet.delete(currentSectionId);
            showToast("Bookmark removed");
        } else {
            newSet.add(currentSectionId);
            showToast("Section bookmarked");
        }
        return newSet;
    });
  };

  const handleDownloadEbook = async () => {
    setIsGeneratingEbook(true);
    try {
        await generateEPUB();
        showToast("eBook downloaded successfully");
    } catch (e) {
        console.error("Failed to generate EPUB", e);
        alert("Could not generate eBook at this time.");
    } finally {
        setIsGeneratingEbook(false);
    }
  };

  // Text Selection Handler
  const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
          setSelectionRect(null);
          return;
      }

      const text = selection.toString().trim();
      if (text.length > 0 && currentSection) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          if (rect.width > 0) {
              setSelectionRect(rect);
              setSelectedText(text);
          }
      } else {
          setSelectionRect(null);
      }
  };

  const saveHighlight = () => {
      if (!selectedText || !currentSection) return;
      
      const newHighlight: Highlight = {
          id: Math.random().toString(36).substr(2, 9),
          text: selectedText,
          sectionId: currentSection.id,
          sectionTitle: currentSection.title,
          author: 'Dominik Lukeš',
          date: Date.now(),
          note: ''
      };
      
      setHighlights(prev => [...prev, newHighlight]);
      setSelectionRect(null);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
      
      setIsHighlightsOpen(true);
      showToast("Highlight saved");
  };

  const shareHighlightLink = () => {
      if (!selectedText || !currentSectionId || !currentSection) return;
      
      // Also save to highlights
      const newHighlight: Highlight = {
          id: Math.random().toString(36).substr(2, 9),
          text: selectedText,
          sectionId: currentSection.id,
          sectionTitle: currentSection.title,
          author: 'Dominik Lukeš',
          date: Date.now(),
          note: ''
      };
      setHighlights(prev => [...prev, newHighlight]);

      const url = new URL(window.location.href);
      url.searchParams.set('section', currentSectionId);
      url.searchParams.set('text', selectedText);
      
      navigator.clipboard.writeText(url.toString()).then(() => {
          showToast("Link copied & Saved to highlights!");
          setSelectionRect(null);
          window.getSelection()?.removeAllRanges();
          setIsHighlightsOpen(true);
      });
  };

  const shareHighlightImage = () => {
      if (!selectedText || !currentSection) return;

      // Also save to highlights
      const newHighlight: Highlight = {
          id: Math.random().toString(36).substr(2, 9),
          text: selectedText,
          sectionId: currentSection.id,
          sectionTitle: currentSection.title,
          author: 'Dominik Lukeš',
          date: Date.now(),
          note: ''
      };
      setHighlights(prev => [...prev, newHighlight]);
      
      setQuoteModalData({
          text: selectedText,
          title: currentSection.title
      });
      setSelectionRect(null);
      window.getSelection()?.removeAllRanges();
  };

  const sharePageLink = () => {
      const url = new URL(window.location.href);
      if (currentSectionId !== 'home') {
          url.searchParams.set('section', currentSectionId);
      } else {
          url.searchParams.delete('section');
      }
      // Clean text param for page share
      url.searchParams.delete('text');

      navigator.clipboard.writeText(url.toString()).then(() => {
          showToast("Page link copied!");
      });
  };

  // Callback for saving reflections - Memoized
  const handleSaveReflection = useCallback((content: string) => {
      const section = GUIDE_CONTENT.find(s => s.id === currentSectionId);
      if (!section) return;

      setReflections(prev => {
          const existingIdx = prev.findIndex(r => r.sectionId === section.id);
          const id = existingIdx >= 0 ? prev[existingIdx].id : Math.random().toString(36).substr(2, 9);
          
          const newReflection: Reflection = {
              id,
              sectionId: section.id,
              sectionTitle: section.title,
              content,
              date: Date.now()
          };

          if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = newReflection;
              return updated;
          }
          return [...prev, newReflection];
      });
      setToastMessage("Reflection saved");
  }, [currentSectionId]);

  // Callback for opening highlights - Memoized
  const handleOpenHighlightCallback = useCallback(() => setIsHighlightsOpen(true), []);

  // NEW Handlers for drawer actions
  const handleDrawerShareLink = (sectionId: string, text: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('section', sectionId);
      url.searchParams.set('text', text);
      
      navigator.clipboard.writeText(url.toString()).then(() => {
          showToast("Link copied!");
      });
  };

  const handleDrawerShareImage = (text: string, sectionTitle: string) => {
      setQuoteModalData({
          text: text,
          title: sectionTitle
      });
  };

  const deleteHighlight = (id: string) => {
      setHighlights(prev => prev.filter(h => h.id !== id));
  };

  const updateHighlightNote = (id: string, note: string) => {
      setHighlights(prev => prev.map(h => h.id === id ? { ...h, note } : h));
  };
  
  const deleteReflection = (id: string) => {
      setReflections(prev => prev.filter(r => r.id !== id));
  };

  const showToast = (msg: string) => {
      setToastMessage(msg);
  };

  const homeContext = `
    The user is currently on the Homepage of the "Guide to Deliberate Practice".
    Key concepts introduced here:
    - Working Memory is the limit to fluent performance.
    - Deliberate Practice overcomes these limits by building mental representations (chunks).
    - The guide covers Principles, Theory, and Specific Methods for practice.
  `;

  const rulerHeightPx = rulerLines * 42;

  return (
    <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300`} onMouseUp={handleMouseUp}>
      {/* Reading Ruler Overlay */}
      {isRulerActive && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
            <div 
                className="absolute left-0 right-0 bg-gray-900/80 dark:bg-black/80 transition-all duration-150 ease-out"
                style={{ top: 0, height: `${rulerY}px` }}
            />
            
            <div 
                className="absolute left-0 right-0 border-y-2 border-amber-400/30 dark:border-indigo-400/30 transition-all duration-150 ease-out"
                style={{ top: `${rulerY}px`, height: `${rulerHeightPx}px`, boxShadow: '0 0 30px rgba(0,0,0,0.5) inset' }}
            />

            <div 
                className="absolute left-0 right-0 bottom-0 bg-gray-900/80 dark:bg-black/80 transition-all duration-150 ease-out"
                style={{ top: `${rulerY + rulerHeightPx}px` }}
            />
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10">
                Arrows: Move | 1-4: Size | Esc: Exit
            </div>
        </div>
      )}

      {/* Left Sidebar */}
      {(!isHome || isSidebarOpen) && !isImmersiveMode && (
        <Sidebar 
          currentSectionId={currentSectionId} 
          onSelectSection={handleSectionChange}
          isOpen={isSidebarOpen}
          onClose={() => {
            setIsSidebarOpen(false);
            setIsSearchTriggered(false);
          }}
          readSections={readSections}
          bookmarkedSections={bookmarkedSections}
          onOpenHighlights={() => setIsHighlightsOpen(true)}
          shouldFocusSearch={isSearchTriggered}
          // Pass handlers for "Read Your Way" features
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          onToggleFocus={() => setIsImmersiveMode(!isImmersiveMode)}
          onToggleRuler={() => {
              setIsRulerActive(!isRulerActive);
              if (!isRulerActive) showToast("Ruler Active: Use Arrows to move");
          }}
          onToggleReadAloud={() => rendererRef.current?.toggleReadAloud()}
          onToggleCoach={() => setIsChatOpen(true)}
          onToggleShortcuts={() => setIsShortcutsOpen(true)}
          onDownloadEbook={handleDownloadEbook}
          
          // Readability Settings
          fontSize={fontSize}
          onCycleFontSize={cycleFontSize}
          lineHeight={lineHeight}
          onCycleLineHeight={cycleLineHeight}
          maxWidth={maxWidth}
          onCycleMaxWidth={cycleMaxWidth}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-500 ease-in-out">
        {/* Mobile Header */}
        {!isHome && (
          <header className={`lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between flex-shrink-0 z-20 relative shadow-sm transition-all duration-300 ${isImmersiveMode ? '-translate-y-full absolute w-full' : ''}`}>
              <div className="flex items-center gap-3">
                  <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center"
                  >
                      <span className="material-symbols-outlined">menu</span>
                  </button>
                  <h1 className="font-semibold text-gray-900 dark:text-white truncate text-sm max-w-[150px]">
                      {currentSection?.title}
                  </h1>
              </div>
              <div className="flex items-center gap-1">
                 <button
                    onClick={sharePageLink}
                    className="p-2 rounded-full flex items-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Copy Link"
                >
                    <span className="material-symbols-outlined">link</span>
                </button>
                 <button
                    onClick={toggleBookmark}
                    className={`p-2 rounded-full flex items-center transition-colors ${isBookmarked ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title={isBookmarked ? "Remove Bookmark" : "Bookmark Section"}
                >
                    <span className={`material-symbols-outlined ${isBookmarked ? 'material-symbols-filled' : ''}`}>
                        {isBookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                </button>
                <button 
                    onClick={() => setIsHighlightsOpen(true)}
                    className="text-gray-600 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex items-center"
                >
                    <span className="material-symbols-outlined">bookmarks</span>
                </button>
              </div>
          </header>
        )}

        {/* Desktop Floating Controls - COMPACT */}
        {!isHome && (
          <div className="hidden lg:flex absolute top-6 right-8 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-sm gap-1">
             {/* Dark Mode Toggle */}
             <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full w-9 h-9 flex items-center justify-center transition-all"
                title="Switch Mode"
            >
                <span className="material-symbols-outlined text-lg">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                </span>
            </button>

             {/* Ruler Mode Toggle */}
             <button
                onClick={() => {
                    setIsRulerActive(!isRulerActive);
                    if (!isRulerActive) showToast("Ruler Active: Use Arrows to move, 1-4 to resize");
                }}
                className={`rounded-full w-9 h-9 flex items-center justify-center transition-all ${
                    isRulerActive 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isRulerActive ? "Exit Reading Ruler (r)" : "Reading Ruler Mode (r)"}
            >
                <span className="material-symbols-outlined text-lg">horizontal_rule</span>
            </button>

             {/* Immersive Mode Toggle */}
             <button
                onClick={() => setIsImmersiveMode(!isImmersiveMode)}
                className={`rounded-full w-9 h-9 flex items-center justify-center transition-all ${
                    isImmersiveMode 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isImmersiveMode ? "Exit Focus Mode (f)" : "Enter Focus Mode (f)"}
            >
                <span className="material-symbols-outlined text-lg">
                    {isImmersiveMode ? 'fullscreen_exit' : 'fullscreen'}
                </span>
            </button>

             {/* eBook Download */}
             <button
                onClick={handleDownloadEbook}
                disabled={isGeneratingEbook}
                className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full w-9 h-9 flex items-center justify-center transition-all disabled:opacity-50"
                title="Download eBook"
            >
                {isGeneratingEbook ? (
                     <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined text-lg">download</span>
                )}
            </button>
          </div>
        )}

        {/* Floating Highlight Tooltip */}
        {selectionRect && (
            <div 
                className="fixed z-[60] animate-bounce-in"
                style={{
                    top: `${selectionRect.top - 60}px`,
                    left: `${selectionRect.left + (selectionRect.width / 2)}px`,
                    transform: 'translateX(-50%)'
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-full shadow-xl flex items-center p-1 gap-1 pointer-events-auto ring-1 ring-white/20">
                    <button 
                        onClick={saveHighlight}
                        className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
                        title="Save Highlight (h)"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <span className="material-symbols-outlined text-sm text-amber-400">ink_highlighter</span>
                        <span className="text-xs font-medium">Highlight</span>
                    </button>
                    <div className="w-px h-4 bg-gray-700 dark:bg-gray-600"></div>
                    <button 
                        onClick={shareHighlightLink}
                        className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-300 hover:text-white"
                        title="Copy Link to Text (l)"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <span className="material-symbols-outlined text-sm">link</span>
                    </button>
                    <button 
                        onClick={shareHighlightImage}
                        className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-300 hover:text-white"
                        title="Share as Image"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <span className="material-symbols-outlined text-sm">image</span>
                    </button>
                </div>
                <div className="w-3 h-3 bg-gray-900 dark:bg-gray-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5 z-[-1]"></div>
            </div>
        )}

        {/* Content Body */}
        <div ref={contentRef} className="flex-1 overflow-y-auto scroll-smooth bg-white dark:bg-gray-950">
            {isHome ? (
                <Home 
                    onStart={() => handleSectionChange(GUIDE_CONTENT[0].id)} 
                    onSelectSection={handleSectionChange}
                    onOpenSearch={handleOpenSearch}
                />
            ) : (
                <div className={`flex mx-auto w-full transition-all duration-500 ${getContainerWidthClass()}`}>
                    {/* Center Content */}
                    <div className={`flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-12 mx-auto ${!isImmersiveMode ? 'lg:mx-0' : ''}`}>
                         {/* Breadcrumb & Controls */}
                         {currentSection && !isImmersiveMode && (
                            <div className="mb-6 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center">
                                    <button 
                                        onClick={() => handleSectionChange('home')}
                                        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        Home
                                    </button>
                                    <span className="mx-2">/</span>
                                    <span className="uppercase tracking-wider font-medium text-xs">{currentSection.category}</span>
                                    <span className="mx-2">/</span>
                                    <span className="text-gray-900 dark:text-white font-medium truncate max-w-[150px] sm:max-w-none">{currentSection.title}</span>
                                </div>
                                
                                <div className="hidden lg:flex items-center gap-2">
                                     <button
                                        onClick={sharePageLink}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700"
                                        title="Copy Link to Page (l)"
                                    >
                                        <span className="material-symbols-outlined text-lg">link</span>
                                        <span className="text-xs font-semibold">Share</span>
                                    </button>

                                    <button
                                        onClick={toggleBookmark}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
                                            isBookmarked 
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                                                : 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                        title="Bookmark (b)"
                                    >
                                        <span className={`material-symbols-outlined text-lg ${isBookmarked ? 'material-symbols-filled' : ''}`}>
                                            {isBookmarked ? 'bookmark' : 'bookmark_border'}
                                        </span>
                                        <span className="text-xs font-semibold">{isBookmarked ? 'Saved' : 'Save'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Main Text */}
                        {currentSection && (
                            <div className={`bg-white dark:bg-gray-900 transition-all duration-500 ${isImmersiveMode ? '' : 'shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl'} p-6 sm:p-10 mb-12`}>
                                <MarkdownRenderer 
                                    ref={rendererRef}
                                    content={currentSection.content} 
                                    highlights={currentSectionHighlights}
                                    reflection={currentSectionReflection}
                                    onSaveReflection={handleSaveReflection}
                                    onOpenHighlight={handleOpenHighlightCallback}
                                    // Readability Props
                                    fontSize={fontSize}
                                    lineHeight={lineHeight}
                                    maxWidth={maxWidth}
                                />
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-8 mb-12">
                            {prevSection ? (
                                <button 
                                    onClick={() => handleSectionChange(prevSection.id)}
                                    className="group flex flex-col items-start max-w-[45%]"
                                >
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Previous</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 text-left">{prevSection.title}</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleSectionChange('home')}
                                    className="group flex flex-col items-start"
                                >
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Back</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Home</span>
                                </button>
                            )}

                            {nextSection && (
                                <button 
                                    onClick={() => handleSectionChange(nextSection.id)}
                                    className="group flex flex-col items-end text-right max-w-[45%]"
                                >
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Next</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 text-right">{nextSection.title}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right TOC Sidebar - Hidden in Immersive Mode */}
                    {currentSection && !isImmersiveMode && <TableOfContents ref={tocRef} content={currentSection.content} />}
                </div>
            )}
        </div>

        {/* Floating Chat Trigger */}
        {!isChatOpen && !isHome && (
            <button
                onClick={() => setIsChatOpen(true)}
                className={`
                    hidden lg:flex absolute bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-3 shadow-lg items-center gap-2 transition-all hover:scale-105 z-30
                    ${isImmersiveMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'}
                `}
            >
                <span className="material-symbols-outlined">smart_toy</span>
                <span className="font-medium">Ask Coach</span>
            </button>
        )}
      </main>

      <HighlightsDrawer 
        isOpen={isHighlightsOpen}
        onClose={() => setIsHighlightsOpen(false)}
        highlights={highlights}
        reflections={reflections}
        onDeleteHighlight={deleteHighlight}
        onDeleteReflection={deleteReflection}
        onUpdateNote={updateHighlightNote}
        onNavigate={(id, text) => {
            setHighlightToScroll(text || null);
            handleSectionChange(id, text);
            setIsHighlightsOpen(false);
        }}
        onShareLink={handleDrawerShareLink}
        onShareImage={handleDrawerShareImage}
      />
      
      <ChatDrawer 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        currentContext={currentSectionId === 'home' ? homeContext : (currentSection?.content || '')}
      />

      {quoteModalData && (
          <QuoteImageModal 
              text={quoteModalData.text} 
              title={quoteModalData.title} 
              onClose={() => setQuoteModalData(null)} 
          />
      )}

      <ShortcutsModal 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
      />

      {toastMessage && (
          <Toast 
            message={toastMessage} 
            onClose={() => setToastMessage(null)} 
          />
      )}
    </div>
  );
}
