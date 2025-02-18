// Minimal test case
const headerRow: string[] = ['a', 'b', 'c', 'd', 'e', 'f'];
const emotionDict: { [key: string]: number } = { 'e': 0.5, 'f': 0.7 };
const rowData: (string | number)[] = ['1', '2', '3', '4'];

// Version 1: Current approach
headerRow.slice(4).forEach((header: string): void => {
    rowData.push(emotionDict[header] || 0.0);
});

// Version 2: Using map instead of forEach
const emotionValues = headerRow.slice(4).map((header: string): number => {
    return emotionDict[header] || 0.0;
});
rowData.push(...emotionValues);

// Version 3: Using for...of loop
for (const header of headerRow.slice(4)) {
    rowData.push(emotionDict[header] || 0.0);
} 