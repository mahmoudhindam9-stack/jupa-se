import fs from 'fs';

const currentFile = fs.readFileSync('src/shared/services/translationService.ts', 'utf-8');

let newDict = {};
try { newDict = { ...newDict, ...JSON.parse(fs.readFileSync('new_dict.json', 'utf-8')) }; } catch (e) {}
try { newDict = { ...newDict, ...JSON.parse(fs.readFileSync('short_dict.json', 'utf-8')) }; } catch (e) {}

// Extract existing dictionary entries
const match = currentFile.match(/export const AR_TO_EN_DICTIONARY: Record<string, string> = {([\s\S]*?)};// Sorted list/);
if (match) {
  const newLines = [];
  for (const [ar, en] of Object.entries(newDict)) {
    if (ar && en && !ar.includes('"') && !en.includes('"') && ar !== en) {
      newLines.push(`  "${ar}": "${en}",`);
    }
  }
  
  const updatedBlock = `export const AR_TO_EN_DICTIONARY: Record<string, string> = {${match[1]}\n  // --- AUTO GENERATED ---\n${newLines.join('\n')}\n};\n\n// Sorted list`;
  
  const newFile = currentFile.replace(/export const AR_TO_EN_DICTIONARY: Record<string, string> = {[\s\S]*?};// Sorted list/, updatedBlock);
  fs.writeFileSync('src/shared/services/translationService.ts', newFile);
  console.log("Merged dictionaries successfully.");
} else {
  console.log("Could not find dictionary block");
}
