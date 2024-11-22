// setup/mongooseSetup.js

const mongoose = require('mongoose');

async function setupIndexes(model) {
  try {
    await model.createIndexes();
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

module.exports = {
  setupIndexes
};