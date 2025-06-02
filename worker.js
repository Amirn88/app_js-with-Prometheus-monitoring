// worker.js
const { worker } = require('threads');

worker({
  processRequest: () => {
    return `[Thread ${process.threadId}] Processed at ${new Date().toISOString()}`;
  },
  heavyComputation: () => {
    // Simulate CPU-intensive task
    let result = 0;
    for (let i = 0; i < 1e7; i++) {
      result += Math.random();
    }
    return result;
  }
});