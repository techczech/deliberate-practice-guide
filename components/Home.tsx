
import React, { useState } from 'react';
import { GUIDE_CONTENT } from '../data';
import { generateEPUB } from '../utils/epubGenerator';

interface HomeProps {
  onStart: () => void;
  onSelectSection: (id: string) => void;
  onOpenSearch: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart, onSelectSection, onOpenSearch }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const categories = Array.from(new Set(GUIDE_CONTENT.map(s => s.category)));

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
        await generateEPUB();
    } catch (e) {
        console.error("Failed to generate EPUB", e);
        alert("Could not generate eBook at this time.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-10">
            <div className="max-w-3xl">
                <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-sm font-medium mb-6 backdrop-blur-sm">
                    Self-Paced Learning Guide
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                    Deliberate Practice: <br/>
                    <span className="text-indigo-200">A Universal Learning Method</span>
                </h1>
                <p className="text-xl text-indigo-100 mb-10 leading-relaxed max-w-2xl">
                    The key limit to fluent performance is working memory. Discover how to overcome these limits and master any skill through structured, reflective practice.
                </p>
                
                <div className="flex flex-wrap gap-4">
                    <button 
                        onClick={onStart}
                        className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-full shadow-xl hover:bg-indigo-50 transition-all transform hover:-translate-y-1 text-lg flex items-center gap-2"
                    >
                        Start Reading
                    </button>
                    
                    <button 
                        onClick={onOpenSearch}
                        className="px-8 py-4 bg-indigo-500/40 border border-indigo-300/40 text-white font-bold rounded-full shadow-lg hover:bg-indigo-500/60 transition-all backdrop-blur-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">search</span>
                        Search Guide
                    </button>
                    
                    <button 
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="px-8 py-4 bg-indigo-800/50 border border-indigo-400/50 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-800/70 transition-all flex items-center gap-2 backdrop-blur-sm disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isGenerating ? (
                             <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined">download</span>
                        )}
                        {isGenerating ? 'Generating...' : 'eBook'}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Key Concepts / Quick Summary */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="sr-only">Key Concepts</h2>
        <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">memory</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Working Memory</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    The bottleneck of learning. Understand its limits to break through performance plateaus.
                </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-indigo-600 dark:text-indigo-400">account_tree</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Mental Schemas</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Build robust mental representations (chunks) to bypass cognitive overload during complex tasks.
                </p>
            </div>
             <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-green-600 dark:text-green-400">ads_click</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Targeted Practice</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Don't just repeat. Use structured reflection, feedback loops, and specific design to improve.
                </p>
            </div>
        </div>
      </div>

      {/* Course Map / TOC */}
      <div className="bg-gray-50 dark:bg-gray-900 py-20 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Course Overview</h2>
                <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">Navigate through the theory and application of Deliberate Practice.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                {categories.map((category) => (
                    <div key={category} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-6 flex items-center gap-2">
                            <span className="w-8 h-1 bg-indigo-100 dark:bg-indigo-900 block rounded-full"></span>
                            {category}
                        </h3>
                        <ul className="space-y-4">
                            {GUIDE_CONTENT.filter(s => s.category === category).map(section => (
                                <li key={section.id}>
                                    <button 
                                        onClick={() => onSelectSection(section.id)}
                                        className="group flex items-center text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 w-full text-left transition-colors"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mr-3 group-hover:bg-indigo-500 transition-colors"></span>
                                        <span className="group-hover:underline decoration-indigo-200 dark:decoration-indigo-500 underline-offset-4">{section.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      {/* Footer / Author */}
      <div className="bg-white dark:bg-gray-900 py-12 border-t border-gray-200 dark:border-gray-800 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Written by Dominik Lukeš between 2022 and 2024.</p>
        <div className="flex flex-col items-center justify-center gap-2">
             <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/" target="_blank" className="hover:opacity-80 transition-opacity">
                <img alt="Creative Commons License" style={{borderWidth:0}} src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" width="88" height="31" />
            </a>
            <span className="text-xs text-gray-400 dark:text-gray-500">
                This work is licensed under a <a href="http://creativecommons.org/licenses/by-sa/4.0/" className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="license noopener noreferrer">Creative Commons Attribution-ShareAlike 4.0 International License</a>.
            </span>
        </div>
      </div>
    </div>
  );
};
