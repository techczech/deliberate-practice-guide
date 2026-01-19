import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';

interface TableOfContentsProps {
  content: string;
}

export interface TableOfContentsHandle {
  focus: () => void;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

export const TableOfContents = forwardRef<TableOfContentsHandle, TableOfContentsProps>(({ content }, ref) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Helper to generate consistent IDs
  const slugify = (text: string) => {
    const slug = text
      .toLowerCase()
      .replace(/<[^>]*>/g, '') 
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return slug || `heading-${Math.random().toString(36).substr(2, 9)}`;
  };

  useImperativeHandle(ref, () => ({
    focus: () => {
        // Focus the active link if there is one, otherwise the first link
        const activeIndex = headings.findIndex(h => h.id === activeId);
        if (activeIndex !== -1 && linkRefs.current[activeIndex]) {
            linkRefs.current[activeIndex]?.focus();
        } else if (linkRefs.current[0]) {
            linkRefs.current[0]?.focus();
        } else {
            document.getElementById('toc-container')?.focus();
        }
    }
  }));

  useEffect(() => {
    const lines = content.split('\n');
    const extracted: Heading[] = [];
    
    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        let cleanText = match[2];
        cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1'); 
        cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); 
        
        const id = slugify(cleanText);
        extracted.push({ id, text: cleanText.trim(), level });
      }
    });

    setHeadings(extracted);
    // Reset refs array
    linkRefs.current = linkRefs.current.slice(0, extracted.length);
  }, [content]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | null = null;

    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        { rootMargin: '0px 0px -80% 0px' }
      );

      headings.forEach((heading) => {
        if (!heading.id) return;
        const element = document.getElementById(heading.id);
        if (element) observer?.observe(element);
      });
    } catch (e) {
      console.error('IntersectionObserver error:', e);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveId(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    
    if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        nextIndex = Math.min(index + 1, headings.length - 1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        nextIndex = Math.max(index - 1, 0);
    }

    if (nextIndex !== -1) {
        const link = linkRefs.current[nextIndex];
        const heading = headings[nextIndex];
        if (link) link.focus();
        if (heading) scrollToHeading(heading.id);
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav 
        id="toc-container"
        tabIndex={-1}
        className="hidden xl:block w-64 shrink-0 order-last pt-12 pb-8 pr-8 h-screen sticky top-0 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-l-lg"
    >
      <div className="border-l border-gray-200 dark:border-gray-700 pl-4 py-2">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          On this page
        </h4>
        <ul className="space-y-3 text-sm">
          {headings.map((heading, index) => (
            <li 
              key={heading.id}
              style={{ paddingLeft: `${(heading.level - 1) * 0.5}rem` }}
            >
              <a
                ref={el => linkRefs.current[index] = el}
                href={`#${heading.id}`}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHeading(heading.id);
                }}
                className={`
                  block transition-colors duration-200 line-clamp-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm
                  ${activeId === heading.id 
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium border-l-2 border-indigo-600 dark:border-indigo-400 -ml-[1.1rem] pl-[calc(1.1rem-2px)]' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                `}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
});