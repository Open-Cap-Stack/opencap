// dataProcessing.js
const dataForge = require('data-forge');
require('data-forge-fs'); // Required to enable file operations

// Function to process dataset
const processDataset = (datasetPath) => {
  // Read CSV file and parse it into a DataFrame
  const dataframe = dataForge.readFileSync(datasetPath).parseCSV();

  // Apply transformations (example: filter and select specific columns)
  const processedData = dataframe
    .where(row => parseFloat(row['value']) > 10) // Filter rows where 'value' > 10
    .select(row => ({ name: row['name'], value: parseFloat(row['value']) })) // Select 'name' and 'value' columns
    .toArray(); // Convert DataFrame to an array of objects

  return processedData;
};


module.exports = { processDataset };
