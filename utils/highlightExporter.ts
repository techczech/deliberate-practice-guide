import * as FileSaverPkg from 'file-saver';
import { Highlight } from '../types';

let saveAs: any;

try {
  // @ts-ignore
  saveAs = FileSaverPkg.saveAs || FileSaverPkg.default?.saveAs || FileSaverPkg.default || FileSaverPkg;
} catch (e) {
  console.error("Module resolution error in highlightExporter:", e);
}

export const exportHighlightsToMarkdown = (highlights: Highlight[]) => {
  if (!highlights || highlights.length === 0) {
    alert("No highlights to export.");
    return;
  }

  // Group by Section
  const grouped: Record<string, Highlight[]> = {};
  highlights.forEach(h => {
    if (!grouped[h.sectionTitle]) {
      grouped[h.sectionTitle] = [];
    }
    grouped[h.sectionTitle].push(h);
  });

  let mdContent = `# My Deliberate Practice Notes & Highlights\n\nExported on ${new Date().toLocaleDateString()}\n\n`;

  Object.keys(grouped).forEach(title => {
    mdContent += `## ${title}\n\n`;
    grouped[title].forEach(h => {
      // Format as citation with optional note
      mdContent += `> ${h.text.replace(/\n/g, '\n> ')}\n>\n> — ${h.author || 'Unknown'}, *${h.sectionTitle}*\n\n`;
      
      if (h.note && h.note.trim()) {
          mdContent += `**Note:**\n${h.note.trim()}\n\n`;
      }
    });
    mdContent += `---\n\n`;
  });

  const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
  
  if (saveAs) {
    saveAs(blob, "deliberate-practice-notes.md");
  } else {
    console.error("FileSaver not loaded");
    alert("Could not save file. Please try again.");
  }
};