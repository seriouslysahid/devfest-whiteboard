require('dotenv').config();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function generateContent(prompt, type = 'text') {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`[GEMINI] Generating ${type} content...`); 
  console.log(`[GEMINI] Prompt preview: ${prompt.substring(0, 50)}...`);
  
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('[GEMINI] API Key missing or invalid');
    throw new Error('GEMINI_API_KEY not configured');
  }

  const systemPrompts = {
    diagram: `You are an EXPERT AI drawing assistant for a collaborative whiteboard canvas.
You can create ANYTHING the user asks - from technical diagrams to creative drawings.

## AVAILABLE DRAWING OPERATIONS

You can ONLY use these exact operation types:

### 1. SHAPES (for geometric elements)
{"type": "shape", "shapeType": "rectangle", "points": [{"x": START_X, "y": START_Y}, {"x": END_X, "y": END_Y}], "color": "#HEX", "lineWidth": NUMBER}
{"type": "shape", "shapeType": "circle", "points": [{"x": START_X, "y": START_Y}, {"x": END_X, "y": END_Y}], "color": "#HEX", "lineWidth": NUMBER}
{"type": "shape", "shapeType": "line", "points": [{"x": START_X, "y": START_Y}, {"x": END_X, "y": END_Y}], "color": "#HEX", "lineWidth": NUMBER}
{"type": "shape", "shapeType": "arrow", "points": [{"x": START_X, "y": START_Y}, {"x": END_X, "y": END_Y}], "color": "#HEX", "lineWidth": NUMBER}

### 2. TEXT (for labels, titles, content)
{"type": "text", "text": "Your Text Here", "x": NUMBER, "y": NUMBER, "color": "#HEX", "lineWidth": 2}

### 3. SVG PATHS (for complex, organic, creative drawings)
{"type": "path", "pathData": "SVG_PATH_STRING", "color": "#HEX", "lineWidth": NUMBER, "fill": "#HEX"}
Supported commands: M (move), L (line), C (cubic bezier), Q (quadratic bezier), A (arc), Z (close).
Use this for: Animals, characters, logos, detailed icons, organic shapes.

### 4. FREEFORM DRAWING (fallback for simple curves)
{"type": "draw", "points": [{"x": X1, "y": Y1}, ...], "color": "#HEX", "lineWidth": NUMBER}

## INTELLIGENT REQUEST DETECTION

Analyze the user's request and determine the type:

### TYPE A: TECHNICAL DIAGRAMS (UML, Flowcharts, Architecture)
- USE: SHAPES (rectangles, circles, lines, arrows) + TEXT
- WHY: Needs structure, alignment, clean geometric lines.

### TYPE B: CREATIVE/ORGANIC (Animals, Characters, Objects)
- USE: SVG PATHS
- WHY: Needs smooth curves, complex geometries, filled shapes.
- STYLE: "Masterpiece Mode".
  - LAYER 1: Base shapes (body, head) with base colors.
  - LAYER 2: Shadows (darker path with opacity or darker color) for 3D effect.
  - LAYER 3: Highlights (lighter path) for shine/volume.
  - LAYER 4: Details (eyes, scales, texture, outlines).
- EXAMPLE: "Draw a dragon" -> Use pathData with many C/Q commands, layered for depth.

### TYPE C: UI/WIREFRAMES
- USE: SHAPES + TEXT
- WHY: Grid-based layout, standard UI components.

## PATH DRAWING TIPS (For Creative Mode)
- Use 'C' (Cubic Bezier) for smooth curves (e.g., tail, wings, ears).
- Use 'fill' property to add color to closed shapes.
- Combine multiple path operations for complex objects (e.g., body path, eye path, wing path).
- Scale coordinates to fit 800x600 canvas.

## EXAMPLE OUTPUTS

### Example: "Draw a fierce dragon"
[
  {"type": "path", "pathData": "M 250 400 Q 200 350 250 300 Q 300 250 400 300 Q 500 350 450 450 Q 350 500 250 400 Z", "color": "#047857", "lineWidth": 0, "fill": "#059669"}, 
  {"type": "path", "pathData": "M 400 300 Q 450 200 550 250 Q 500 350 400 300 Z", "color": "#047857", "lineWidth": 0, "fill": "#10B981"},
  {"type": "path", "pathData": "M 250 300 Q 200 250 220 200 Q 260 220 250 300 Z", "color": "#047857", "lineWidth": 0, "fill": "#34D399"},
  {"type": "path", "pathData": "M 410 320 C 420 310 430 310 440 320", "color": "#000000", "lineWidth": 2},
  {"type": "shape", "shapeType": "circle", "points": [{"x": 420, "y": 315}, {"x": 425, "y": 320}], "color": "#000000", "lineWidth": 0, "fill": "#FCD34D"},
  {"type": "path", "pathData": "M 460 330 Q 550 330 600 350 L 550 380 Z", "color": "#DC2626", "lineWidth": 0, "fill": "#F87171"},
  {"type": "path", "pathData": "M 250 400 Q 350 450 450 450", "color": "#064E3B", "lineWidth": 4}
]

### Example: "UML class diagram for User"
[
  {"type": "shape", "shapeType": "rectangle", "points": [{"x": 100, "y": 100}, {"x": 300, "y": 300}], "color": "#3B82F6", "lineWidth": 2},
  {"type": "text", "text": "User", "x": 180, "y": 120, "color": "#1F2937", "lineWidth": 2}
]

## LAYOUT ALGORITHMS

### For Flowcharts (top-to-bottom):
- Start at y=80, increment by 120 for each row
- Center horizontally at x=400
- Box size: 150x60
- Arrow between boxes

### For UML Class Diagrams:
- Arrange classes in grid: 2-3 per row
- Class box: 180x120 minimum
- Spacing: 50px between classes
- Add text for: ClassName (top), attributes (middle), methods (bottom)

### For Mind Maps (radial):
- Center topic at (400, 300)
- Branches extend outward at angles: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
- Branch length: 150-200px

### For Creative Drawings:
- Center the main subject
- Build up from basic shapes
- Add details with smaller elements
- Use appropriate scale (fill 50-70% of canvas)

## COLOR PALETTES

### Professional/Technical:
- Primary: #3B82F6 (blue)
- Success: #10B981 (green)  
- Warning: #F59E0B (amber)
- Error: #EF4444 (red)
- Neutral: #6B7280 (gray)
- Text: #1F2937 (dark gray)

### Creative/Fun:
- #EC4899 (pink), #8B5CF6 (purple), #06B6D4 (cyan)
- #F97316 (orange), #84CC16 (lime), #FBBF24 (yellow)

### For specific subjects:
- Animals: Use natural colors (#92400E brown, #065F46 dark green, #FCD34D golden)
- Sky/Water: #0EA5E9 (sky blue), #1E40AF (deep blue)
- Nature: #16A34A (green), #A3E635 (lime), #78350F (wood)

## EXAMPLE OUTPUTS

### Example: "Draw a simple flowchart for login process"
[
  {"type": "shape", "shapeType": "circle", "points": [{"x": 375, "y": 30}, {"x": 425, "y": 80}], "color": "#10B981", "lineWidth": 2},
  {"type": "text", "text": "Start", "x": 385, "y": 48, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "arrow", "points": [{"x": 400, "y": 80}, {"x": 400, "y": 120}], "color": "#6B7280", "lineWidth": 2},
  {"type": "shape", "shapeType": "rectangle", "points": [{"x": 300, "y": 120}, {"x": 500, "y": 180}], "color": "#3B82F6", "lineWidth": 2},
  {"type": "text", "text": "Enter Credentials", "x": 330, "y": 142, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "arrow", "points": [{"x": 400, "y": 180}, {"x": 400, "y": 220}], "color": "#6B7280", "lineWidth": 2},
  {"type": "shape", "shapeType": "rectangle", "points": [{"x": 300, "y": 220}, {"x": 500, "y": 280}], "color": "#F59E0B", "lineWidth": 2},
  {"type": "text", "text": "Validate", "x": 370, "y": 242, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "arrow", "points": [{"x": 400, "y": 280}, {"x": 400, "y": 320}], "color": "#6B7280", "lineWidth": 2},
  {"type": "shape", "shapeType": "circle", "points": [{"x": 375, "y": 320}, {"x": 425, "y": 370}], "color": "#EF4444", "lineWidth": 2},
  {"type": "text", "text": "End", "x": 388, "y": 338, "color": "#1F2937", "lineWidth": 2}
]

### Example: "Draw a cat"
[
  {"type": "shape", "shapeType": "circle", "points": [{"x": 320, "y": 200}, {"x": 480, "y": 360}], "color": "#F59E0B", "lineWidth": 3},
  {"type": "shape", "shapeType": "line", "points": [{"x": 330, "y": 210}, {"x": 300, "y": 160}], "color": "#F59E0B", "lineWidth": 3},
  {"type": "shape", "shapeType": "line", "points": [{"x": 300, "y": 160}, {"x": 350, "y": 200}], "color": "#F59E0B", "lineWidth": 3},
  {"type": "shape", "shapeType": "line", "points": [{"x": 470, "y": 210}, {"x": 500, "y": 160}], "color": "#F59E0B", "lineWidth": 3},
  {"type": "shape", "shapeType": "line", "points": [{"x": 500, "y": 160}, {"x": 450, "y": 200}], "color": "#F59E0B", "lineWidth": 3},
  {"type": "shape", "shapeType": "circle", "points": [{"x": 350, "y": 250}, {"x": 380, "y": 280}], "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "circle", "points": [{"x": 420, "y": 250}, {"x": 450, "y": 280}], "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "circle", "points": [{"x": 385, "y": 290}, {"x": 415, "y": 310}], "color": "#EC4899", "lineWidth": 2},
  {"type": "shape", "shapeType": "line", "points": [{"x": 280, "y": 300}, {"x": 350, "y": 300}], "color": "#1F2937", "lineWidth": 1},
  {"type": "shape", "shapeType": "line", "points": [{"x": 280, "y": 310}, {"x": 350, "y": 305}], "color": "#1F2937", "lineWidth": 1},
  {"type": "shape", "shapeType": "line", "points": [{"x": 280, "y": 290}, {"x": 350, "y": 295}], "color": "#1F2937", "lineWidth": 1},
  {"type": "shape", "shapeType": "line", "points": [{"x": 450, "y": 300}, {"x": 520, "y": 300}], "color": "#1F2937", "lineWidth": 1},
  {"type": "shape", "shapeType": "line", "points": [{"x": 450, "y": 310}, {"x": 520, "y": 305}], "color": "#1F2937", "lineWidth": 1},
  {"type": "shape", "shapeType": "line", "points": [{"x": 450, "y": 290}, {"x": 520, "y": 295}], "color": "#1F2937", "lineWidth": 1},
  {"type": "draw", "points": [{"x": 390, "y": 315}, {"x": 385, "y": 330}, {"x": 395, "y": 340}, {"x": 405, "y": 330}, {"x": 400, "y": 315}], "color": "#1F2937", "lineWidth": 2}
]

### Example: "UML class diagram for User and Order"
[
  {"type": "shape", "shapeType": "rectangle", "points": [{"x": 100, "y": 80}, {"x": 300, "y": 250}], "color": "#3B82F6", "lineWidth": 2},
  {"type": "text", "text": "User", "x": 180, "y": 95, "color": "#1F2937", "lineWidth": 3},
  {"type": "shape", "shapeType": "line", "points": [{"x": 100, "y": 130}, {"x": 300, "y": 130}], "color": "#3B82F6", "lineWidth": 2},
  {"type": "text", "text": "- id: int", "x": 115, "y": 145, "color": "#1F2937", "lineWidth": 2},
  {"type": "text", "text": "- name: string", "x": 115, "y": 170, "color": "#1F2937", "lineWidth": 2},
  {"type": "text", "text": "- email: string", "x": 115, "y": 195, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "line", "points": [{"x": 100, "y": 220}, {"x": 300, "y": 220}], "color": "#3B82F6", "lineWidth": 2},
  {"type": "text", "text": "+ getOrders()", "x": 115, "y": 230, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "rectangle", "points": [{"x": 450, "y": 80}, {"x": 650, "y": 250}], "color": "#10B981", "lineWidth": 2},
  {"type": "text", "text": "Order", "x": 525, "y": 95, "color": "#1F2937", "lineWidth": 3},
  {"type": "shape", "shapeType": "line", "points": [{"x": 450, "y": 130}, {"x": 650, "y": 130}], "color": "#10B981", "lineWidth": 2},
  {"type": "text", "text": "- id: int", "x": 465, "y": 145, "color": "#1F2937", "lineWidth": 2},
  {"type": "text", "text": "- userId: int", "x": 465, "y": 170, "color": "#1F2937", "lineWidth": 2},
  {"type": "text", "text": "- total: float", "x": 465, "y": 195, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "line", "points": [{"x": 450, "y": 220}, {"x": 650, "y": 220}], "color": "#10B981", "lineWidth": 2},
  {"type": "text", "text": "+ getItems()", "x": 465, "y": 230, "color": "#1F2937", "lineWidth": 2},
  {"type": "shape", "shapeType": "arrow", "points": [{"x": 300, "y": 165}, {"x": 450, "y": 165}], "color": "#6B7280", "lineWidth": 2},
  {"type": "text", "text": "1", "x": 310, "y": 150, "color": "#1F2937", "lineWidth": 2},
  {"type": "text", "text": "*", "x": 430, "y": 150, "color": "#1F2937", "lineWidth": 2},
  {"type": "text", "text": "has", "x": 360, "y": 150, "color": "#6B7280", "lineWidth": 2}
]

## CRITICAL RULES

1. Return ONLY a valid JSON array - no markdown, no explanations, no code blocks
2. Every shape needs exactly 2 points (start and end)
3. Every text needs x, y coordinates (not points array)
4. Use meaningful colors that match the content
5. ALWAYS add text labels to diagrams
6. Make drawings fill the canvas appropriately (not too small, not clipped)
7. For creative requests, be imaginative - compose complex images from simple shapes
8. lineWidth for text controls font size (2 = normal, 3 = bold/header, 1 = small)

Now generate the drawing for the user's request:`,
    
    sketch: `You are a sketch assistant for a whiteboard.
Suggest improvements or additions to the current drawing.
Return a JSON object with: {"suggestions": ["suggestion1", "suggestion2"], "operations": []}`,
    
    words: `You are generating words for a drawing game like Skribbl.io.
Generate creative, drawable words of varying difficulty.
Return ONLY a JSON array of words: ["word1", "word2", ...]`
  };

  const body = {
    contents: [{
      parts: [{
        text: `${systemPrompts[type] || ''}\n\nUser request: ${prompt}`
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000000,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[GEMINI] API Error (${response.status}):`, error);
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  console.log('[GEMINI] API Response received');
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    console.error('[GEMINI] Empty response structure:', JSON.stringify(data));
    throw new Error('No response from Gemini');
  }

  console.log(`[GEMINI] Raw response length: ${text.length}`);
  console.log(`[GEMINI] Full raw text:\n${text}\n-------------------`);
  
  return parseGeminiResponse(text, type);
}

function parseGeminiResponse(text, type) {
  const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.warn('[GEMINI] No JSON found in response');
    console.debug('[GEMINI] Full response:', text);
    return type === 'words' ? [] : { operations: [], suggestions: [] };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[GEMINI] JSON parsed successfully. Is Array?', Array.isArray(parsed));
    
    if (type === 'diagram') {
      if (!Array.isArray(parsed) && parsed.operations) {
        console.log('[GEMINI] Found operations property in object');
        return parsed; 
      }
      return { operations: Array.isArray(parsed) ? parsed : [] };
    }
    
    if (type === 'words') {
      return { words: Array.isArray(parsed) ? parsed : [] };
    }
    
    return parsed;
  } catch {
    return type === 'words' ? { words: [] } : { operations: [], suggestions: [] };
  }
}

async function generateDiagram(prompt) {
  return generateContent(prompt, 'diagram');
}

async function generateGameWords(category = 'random', count = 10) {
  const prompt = `Generate ${count} creative, drawable words${category !== 'random' ? ` related to ${category}` : ''}. 
Mix easy, medium, and hard difficulty. Words should be single concepts that can be drawn.`;
  
  return generateContent(prompt, 'words');
}

async function analyzeDrawing(operationsDescription) {
  return generateContent(operationsDescription, 'sketch');
}

module.exports = {
  generateContent,
  generateDiagram,
  generateGameWords,
  analyzeDrawing
};
