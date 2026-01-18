const express = require('express');
const { generateDiagram, generateGameWords, analyzeDrawing } = require('../services/gemini');

const router = express.Router();

router.post('/diagram', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateDiagram(prompt);
    res.json(result);
  } catch (error) {
    console.error('Diagram generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/words', async (req, res) => {
  try {
    const { category, count } = req.body;
    const result = await generateGameWords(category, count);
    res.json(result);
  } catch (error) {
    console.error('Word generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = await analyzeDrawing(description);
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
