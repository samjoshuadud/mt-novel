import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const REFINEMENT_PROMPT = `You are an expert translator specializing in Korean web novels. Your task is to refine machine-translated text following strict web novel formatting rules.

WEB NOVEL FORMATTING RULES:
1. Each paragraph should be short (1-3 sentences maximum)
2. Add empty line breaks between ALL paragraphs
3. Dialogue must ALWAYS be on its own line
4. Internal thoughts must be on separate lines
5. Action sequences should be broken into very short paragraphs
6. Scene transitions need double line breaks

Examples of correct formatting:

Chapter Title should stand alone:
Chapter 1642: Are You Happy? (Part 1)

For dialogue and actions:
Ho Gakmyung blinked, covering his face with his hand.

"Was it a dream?" he whispered.

The cold air brushed against his nose.

For internal monologue:
'Am I still... ruthless?'

The question echoed in his mind.

For action sequences:
The sword gleamed.

He struck without hesitation.

Blood sprayed through the air.

For emotional scenes:
Tears welled in his eyes.

How could this happen? After everything they'd been through...

His fists clenched at his sides.

IMPORTANT RULES:
- Never combine dialogue with action descriptions
- Keep paragraphs extremely short
- Use empty lines between ALL paragraphs
- Start new paragraphs for every change in action/thought/dialogue
- Maintain dramatic pacing through paragraph breaks

Please refine the following machine-translated text while strictly following these formatting rules:

`;

// Constants
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MAX_REQUESTS = 60;
const CHUNK_SIZE = 4000; // Reduced from 5000 to leave room for prompt
const MAX_TOTAL_LENGTH = 50000; // Maximum total text length we'll process

// Helper function to split text into chunks
function splitIntoChunks(text) {
  const chunks = [];
  let currentChunk = '';
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size
    if ((currentChunk + paragraph).length > CHUNK_SIZE) {
      // If current chunk is not empty, push it
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If single paragraph is longer than chunk size, split by sentences
      if (paragraph.length > CHUNK_SIZE) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (sentence.length > CHUNK_SIZE) {
            // If a single sentence is too long, split it into smaller pieces
            for (let i = 0; i < sentence.length; i += CHUNK_SIZE) {
              chunks.push(sentence.slice(i, i + CHUNK_SIZE).trim());
            }
          } else {
            if ((currentChunk + sentence).length > CHUNK_SIZE) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += (currentChunk ? ' ' : '') + sentence;
            }
          }
        }
      } else {
        currentChunk = paragraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Push the last chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Helper function to process a single chunk
async function processChunk(chunk, model) {
  const fullPrompt = REFINEMENT_PROMPT + chunk;
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}

let requestCount = 0;
let windowStart = Date.now();

export async function POST(request) {
  try {
    // Add API key validation
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY environment variable');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Rate limiting check
    if (Date.now() - windowStart > RATE_LIMIT_WINDOW) {
      requestCount = 0;
      windowStart = Date.now();
    }

    if (requestCount >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { text } = await request.json();

    // Basic validation
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Check total length
    if (text.length > MAX_TOTAL_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds maximum length of ${MAX_TOTAL_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Split text into chunks
    const chunks = splitIntoChunks(text);
    
    // Process all chunks
    const refinedChunks = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          return await processChunk(chunk, model);
        } catch (error) {
          console.error('Error processing chunk:', error);
          throw error;
        }
      })
    );

    // Combine refined chunks with proper spacing
    const refinedText = refinedChunks
      .map(chunk => chunk.trim())
      .join('\n\n\n') // Add extra line break between chunks
      .replace(/\n{4,}/g, '\n\n\n') // Keep maximum of 2 empty lines
      .replace(/([.!?])\s+/g, '$1\n\n') // Add line breaks after sentences
      .replace(/"([^"]+)"/g, '\n"$1"\n\n') // Put quotes on their own lines
      .replace(/\n{4,}/g, '\n\n\n') // Clean up any excessive line breaks
      .trim();

    // Increment request counter
    requestCount += chunks.length;

    return NextResponse.json({ refinedText });

  } catch (error) {
    // Enhanced error logging
    console.error('Refinement error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    return NextResponse.json(
      { error: 'Failed to refine text. Please try again.' },
      { status: 500 }
    );
  }
}
