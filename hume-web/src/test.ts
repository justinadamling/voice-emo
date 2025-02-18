// Test case 1: Most basic approach
const test1 = () => {
    const headerResponse: SheetResponse = {
        data: {
            values: [['a', 'b', 'c']]
        }
    };
    const headers: string[] = headerResponse.data.values?.[0] ?? [];
    headers.forEach(header => {
        console.log(header);
    });
};

// Test case 2: Simulating our actual code scenario
const test2 = () => {
    type EmotionDict = { [key: string]: number };
    const emotionDict: EmotionDict = { 'happy': 0.8, 'sad': 0.2 };
    
    const headerResponse: SheetResponse = {
        data: {
            values: [['timestamp', 'id', 'text', 'context', 'happy', 'sad']]
        }
    };
    
    const headerRow: string[] = headerResponse.data.values?.[0] ?? [];
    const rowData: (string | number)[] = ['2024-02-14', 'T001', 'test', 'test'];
    
    headerRow.slice(4).forEach(header => {
        rowData.push(emotionDict[header] || 0.0);
    });
    
    console.log(rowData);
};

// Test case 3: Using type inference with proper interface
interface SheetResponse {
    data: {
        values?: string[][];
    };
}

const test3 = () => {
    const headerResponse: SheetResponse = {
        data: {
            values: [['a', 'b', 'c']]
        }
    };
    const headers = headerResponse.data.values?.[0] ?? [];
    headers.forEach(header => {
        console.log(header);
    });
};

// Test case 4: Simulating our actual code scenario
const test4 = () => {
    type EmotionDict = { [key: string]: number };
    const emotionDict: EmotionDict = { 'happy': 0.8, 'sad': 0.2 };
    
    const headerResponse: SheetResponse = {
        data: {
            values: [['timestamp', 'id', 'text', 'context', 'happy', 'sad']]
        }
    };
    
    const headerRow: string[] = headerResponse.data.values?.[0] ?? [];
    const rowData: (string | number)[] = ['2024-02-14', 'T001', 'test', 'test'];
    
    headerRow.slice(4).forEach(header => {
        rowData.push(emotionDict[header] || 0.0);
    });
    
    console.log(rowData);
}; 