const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'api', 'migrations', 'schema_atual.sql');
const content = fs.readFileSync(schemaPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.toLowerCase().includes('key')) {
        // Check if it's not a common keyword like PRIMARY KEY or FOREIGN KEY
        const lower = line.toLowerCase();
        if (!lower.includes('primary key') && !lower.includes('foreign key') && !lower.includes('references')) {
            console.log(`L${index + 1}: ${line.trim()}`);
        }
    }
});
