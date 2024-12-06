import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.NEXT_APP_GEMINI_API_KEY);

const REFINEMENT_PROMPT = `You are an expert translator specializing in Korean web novels, particularly in Murim, Medieval, and Fantasy genres. Your task is to refine machine-translated text into natural, engaging English while maintaining the web novel style.

Core Objectives:
1. Smooth out phrasing and structure for natural flow
2. Fix grammar and awkward sentences
3. Maintain the original tone and intent
4. Make it engaging and clear

Please focus on the following aspects:
- Polishing the translation: Make the English text smoother and more readable, ensuring it sounds like it was originally written in English, not a direct machine translation.
- Fixing awkward sentences: Revise any clunky or robotic-sounding phrases to make them sound natural while keeping the meaning intact.
- Maintaining the context: Keep the original tone, style, and intent of the Korean text, ensuring the translation feels appropriate in its cultural and emotional context.
- Improving clarity: Make the sentences clearer and more engaging for English-speaking readers.

Web Novel Formatting Guidelines:
- Maintain proper web novel paragraph breaks (short paragraphs for easy reading)
- Use appropriate line breaks for dialogue and scene transitions
- Keep consistent spacing between paragraphs
- Format dialogue with proper quotation marks and spacing
- Preserve any scene breaks or chapter markers
- Ensure the text flows like a web novel with vivid emotions and natural dialogue

Note:
- Note that most of the input text is machine-translated from Korean to English.
- The original Korean text might be slightly different from the original meaning, but it should still have the same meaning.
- The spacing and punctuation in the input text might be slightly different from the original Korean text, but it should still have the same meaning.
- The spacing and line text is for web novels
- Genre context: Murim, Medieval, Fantasy

Important:
- Keep the same meaning and context
- Preserve paragraph breaks and formatting
- Maintain any dialogue or quotations
- Keep the same level of formality
- Make it look like it was an official translation
- The emotion should be vivid and natural
- Words should be clear and easy to understand
- The translation should be smooth and natural

Here is the machine-translated text to refine:

`;

// Simple rate limiting
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS = 60;
let requestCount = 0;
let windowStart = Date.now();

export async function POST(request) {
  try {
    // Rate limiting check
    const now = Date.now();
    if (now - windowStart > RATE_LIMIT_WINDOW) {
      // Reset window
      requestCount = 0;
      windowStart = now;
    }

    if (requestCount >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in about an hour.' },
        { status: 429 }
      );
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
    });

    // Configure generation parameters for better quality
    const generationConfig = {
      temperature: 0.7, // Balance between creativity and consistency
      topP: 0.8, // Nucleus sampling for more natural text
      topK: 40, // Limit vocabulary diversity for consistency
      maxOutputTokens: 8192, // Allow for longer outputs
    };

    // Generate refined text with enhanced configuration
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: REFINEMENT_PROMPT + text }] }],
      generationConfig,
    });

    const response = await result.response;
    let refinedText = response.text();

    // Post-process the refined text for web novel formatting
    refinedText = refinedText
      .replace(/\n\n/g, '\n') // Remove excessive newlines
      .replace(/\n/g, '\n\n') // Ensure double newlines for paragraph breaks
      .replace(/"(.*?)"/g, '“$1”') // Convert quotes to smart quotes
      .replace(/\s+([.,!?])/g, '$1') // Fix spacing before punctuation
      .trim();

    // Increment request count after successful generation
    requestCount++;

    return NextResponse.json({ 
      refinedText,
      success: true 
    });

  } catch (error) {
    console.error('Refinement error:', error);
    
    // Handle rate limit errors specifically
    if (error.message?.includes('rate limit exceeded')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in about an hour.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to refine text' },
      { status: 500 }
    );
  }
}
