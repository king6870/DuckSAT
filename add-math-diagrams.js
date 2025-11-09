//
// add-math-diagrams.js
// Now loads OpenAI API key from environment

class MathDiagramAdder {
  constructor() {
    this.AZURE_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview';
    this.API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
  }
  // ...rest of the code remains unchanged...
}

module.exports = MathDiagramAdder;