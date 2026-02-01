import {
    BookOpen,
    CheckCircle,
    Database,
    ExternalLink,
    FileText,
    Globe,
    Loader,
    Search,
    Sparkles,
    XCircle
} from 'lucide-react';
import React, { useState } from 'react';

interface ResearchResult {
  title: string;
  content: string;
  keyFindings: string[];
  methodology: string;
  conclusions: string;
  citations: string[];
}

interface ResearchSession {
  sessionId: string;
  url: string;
  data: ResearchResult | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

const ResearcherScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [history, setHistory] = useState<ResearchSession[]>([]);

  const handleResearch = async () => {
    if (!url.trim()) return;

    setCurrentSession({
      sessionId: '',
      url,
      data: null,
      status: 'loading'
    });

    try {
      const response = await fetch('http://localhost:3170/api/research/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          query: query || 'Extract all relevant medical research information, including key findings, methodologies, and conclusions'
        })
      });

      const result = await response.json();

      if (result.success) {
        const session: ResearchSession = {
          sessionId: result.sessionId,
          url: result.url,
          data: result.data,
          status: 'success'
        };
        setCurrentSession(session);
        setHistory(prev => [session, ...prev]);
      } else {
        setCurrentSession(prev => prev ? {
          ...prev,
          status: 'error',
          error: result.error || 'Failed to extract data'
        } : null);
      }
    } catch (error) {
      setCurrentSession(prev => prev ? {
        ...prev,
        status: 'error',
        error: 'Network error. Make sure the research server is running on port 3170.'
      } : null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleResearch();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Medical Research Assistant</h1>
                <p className="text-sm text-gray-500">AI-powered web research with Browserbase</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="relative">
              <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter research URL (e.g., PubMed, medical journal, clinical trial)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Sparkles className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What would you like to extract? (optional - AI will extract key research data by default)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleResearch}
              disabled={!url.trim() || currentSession?.status === 'loading'}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {currentSession?.status === 'loading' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Start Research
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {currentSession?.status === 'loading' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Research...</h3>
                <p className="text-gray-500">AI is extracting key information from the source</p>
              </div>
            )}

            {currentSession?.status === 'error' && (
              <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-medium text-red-900 mb-1">Research Failed</h3>
                    <p className="text-red-700">{currentSession.error}</p>
                  </div>
                </div>
              </div>
            )}

            {currentSession?.status === 'success' && currentSession.data && (
              <div className="space-y-4">
                {/* Success Header */}
                <div className="bg-green-50 rounded-lg border border-green-200 p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div className="flex-1">
                    <h3 className="font-medium text-green-900">Research Completed</h3>
                    <a 
                      href={currentSession.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline flex items-center gap-1"
                    >
                      {currentSession.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Title */}
                {currentSession.data.title && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {currentSession.data.title}
                        </h2>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                {currentSession.data.content && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      Summary
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {currentSession.data.content}
                    </p>
                  </div>
                )}

                {/* Key Findings */}
                {currentSession.data.keyFindings && currentSession.data.keyFindings.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      Key Findings
                    </h3>
                    <ul className="space-y-2">
                      {currentSession.data.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-gray-700 flex-1">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Methodology */}
                {currentSession.data.methodology && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Database className="w-5 h-5 text-purple-500" />
                      Methodology
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {currentSession.data.methodology}
                    </p>
                  </div>
                )}

                {/* Conclusions */}
                {currentSession.data.conclusions && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Conclusions
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {currentSession.data.conclusions}
                    </p>
                  </div>
                )}

                {/* Citations */}
                {currentSession.data.citations && currentSession.data.citations.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Citations</h3>
                    <ul className="space-y-2">
                      {currentSession.data.citations.map((citation, idx) => (
                        <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-300">
                          {citation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!currentSession && history.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Research</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Enter a URL to any medical research paper, clinical trial, or health article. 
                  Our AI will extract and organize the key information for you.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">PubMed</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Clinical Trials</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Medical Journals</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Health Articles</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - History */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Research History</h2>
          <p className="text-sm text-gray-500">{history.length} searches</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.map((session, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSession(session)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-start gap-2 mb-2">
                {session.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
                {session.status === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.data?.title || 'Research Session'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{session.url}</p>
                </div>
              </div>
            </button>
          ))}
          
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No research history yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResearcherScreen;
