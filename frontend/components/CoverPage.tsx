import { ArrowRight, Bot, Check, FileText, Sparkles, Stethoscope, Zap } from 'lucide-react';
import React from 'react';

interface CoverPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const CoverPage: React.FC<CoverPageProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col relative overflow-hidden">
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(203 213 225 / 0.15) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}></div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* Header/Navigation */}
        <header className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Stethoscope size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-slate-800">ClinXplain</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </button>
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </button>
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Contact
            </button>
            <button 
              onClick={onSignIn}
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="max-w-5xl w-full text-center space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full">
              <Sparkles size={14} className="text-blue-600" strokeWidth={2} />
              <span className="text-sm font-semibold text-blue-700">AI-Powered Clinical Documentation</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-slate-900 tracking-tight leading-tight">
                Transform Patient Visits<br />
                Into Clinical Notes
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Real-time AI assistance for comprehensive clinical documentation. 
                Save time, improve accuracy, and focus on what matters most—your patients.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <button 
                onClick={onGetStarted}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 transition-all"
              >
                Get Started Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
              </button>
              <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-700 rounded-xl font-semibold text-base border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 pt-6 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Check size={16} className="text-emerald-500" strokeWidth={3} />
                <span>No credit card required</span>
              </div>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div className="flex items-center gap-1.5">
                <Check size={16} className="text-emerald-500" strokeWidth={3} />
                <span>Free 14-day trial</span>
              </div>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div className="flex items-center gap-1.5">
                <Check size={16} className="text-emerald-500" strokeWidth={3} />
                <span>HIPAA compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-8 py-16 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <Sparkles size={24} className="text-blue-600" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI-Powered Insights</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Real-time clinical suggestions, potential diagnoses, and protocol recommendations powered by advanced AI.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <FileText size={24} className="text-blue-600" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Documentation</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Automatic SOAP note generation from conversations with intelligent formatting and clinical accuracy.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50 transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <Zap size={24} className="text-blue-600" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">70% Time Savings</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Reduce documentation time significantly while maintaining comprehensive and accurate clinical records.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-slate-200 bg-slate-50/50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Bot size={16} strokeWidth={2} />
                <span>10,000+ Physicians Trust ClinXplain</span>
              </div>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Stethoscope size={16} strokeWidth={2} />
                <span>HIPAA Compliant Platform</span>
              </div>
            </div>
            <p className="text-sm text-slate-400">© 2026 ClinXplain. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CoverPage;
