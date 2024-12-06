'use client';

import { useState, useCallback } from 'react';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleRefine = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setIsRefining(true);
    setError('');
    
    try {
      const response = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refine text');
      }

      setOutputText(data.refinedText);
    } catch (err) {
      setError(err.message);
      console.error('Refinement error:', err);
    } finally {
      setIsRefining(false);
    }
  }, [inputText]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputText]);

  const getWordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="flex-none p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Translation Refinement</h1>
        <p className="text-gray-600 mt-1">Enhance your machine-translated text into natural, fluent English</p>
      </header>

      {/* Main Content */}
      <div className="flex-1 min-h-0 p-6 pt-0">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="h-full flex flex-col min-h-0">
            <div className="flex-none flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-700">Machine Translation</h2>
              <span className="text-sm text-gray-500">
                {getWordCount(inputText)} words
              </span>
            </div>
            <div className="flex-1 relative min-h-0">
              <textarea
                className="absolute inset-0 p-4 rounded-lg border border-gray-300 
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          resize-none bg-white shadow-sm text-black"
                placeholder="Paste your machine-translated text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                onClick={() => setInputText('')}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                title="Clear text"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="h-full flex flex-col min-h-0">
            <div className="flex-none flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-700">Refined Translation</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {getWordCount(outputText)} words
                </span>
                <button
                  onClick={handleCopy}
                  disabled={!outputText}
                  className={`text-sm px-3 py-1 rounded-md transition-colors
                    ${outputText 
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex-1 relative min-h-0">
              <div className="absolute inset-0 p-4 rounded-lg border border-gray-300 
                            bg-white shadow-sm overflow-auto text-black">
                {error ? (
                  <div className="text-red-500">{error}</div>
                ) : outputText ? (
                  outputText
                ) : (
                  <span className="text-gray-400">
                    Refined translation will appear here...
                  </span>
                )}
              </div>
              {isRefining && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white shadow-md">
                    <div className="w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-600">Refining translation...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex-none flex justify-center p-6">
        <button
          onClick={handleRefine}
          disabled={!inputText.trim() || isRefining}
          className={`px-6 py-3 rounded-lg font-medium transition-all transform
            ${inputText.trim() && !isRefining
              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            shadow-md hover:shadow-lg`}
        >
          {isRefining ? 'Refining...' : 'Refine Translation'}
        </button>
      </div>
    </main>
  );
}
