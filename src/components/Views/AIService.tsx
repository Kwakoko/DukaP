import React, { useState, useRef, useEffect } from 'react';
import { useModule } from '../../context/ModuleContext';
import { useAuth } from '../../context/AuthContext';
import { X, Sparkles, Send, Mic, AlertTriangle, BarChart3 } from 'lucide-react';

interface AIServiceProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  chartData?: { name: string; value: number }[];
  fraudFlags?: string[];
}

export const AIService: React.FC<AIServiceProps> = ({ isOpen, onClose }) => {
  const { activeModule } = useModule();
  const { currentBranch } = useAuth();
  
  const [inputVal, setInputVal] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello! I am your DukaPos AI Assistant. I have analyzed your ${activeModule} transactions for branch "${currentBranch.name}". Ask me to forecast stock, audit cash registers, or search inventory.`,
      timestamp: new Date()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = { sender: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    let replyText = '';
    let chartData: any[] | undefined = undefined;
    let fraudFlags: string[] | undefined = undefined;

    const lower = text.toLowerCase();

    if (lower.includes('forecast') || lower.includes('predict') || lower.includes('sales')) {
      replyText = `Based on transaction velocity in your ${activeModule} module, here is your 5-day sales forecast model. We project stable customer acquisition with a weekend spike.`;
      chartData = [
        { name: 'Today', value: 12500 },
        { name: 'Day 1', value: 13200 },
        { name: 'Day 2', value: 14800 },
        { name: 'Day 3', value: 17200 }, // Weekend Peak
        { name: 'Day 4', value: 12100 }
      ];
    } else if (lower.includes('fraud') || lower.includes('anomaly') || lower.includes('risk') || lower.includes('audit')) {
      replyText = `Risk Evaluation Engine: Cash drawers audit logs compared with POS checkout logs. I detected 0 fatal transaction overrides. Here are minor observations:`;
      fraudFlags = [
        'Drawer opened without transaction (Nairobi cashier 02 - 14:10)',
        '10% manual discount override applied twice on the same invoice',
        'Offline transaction sync occurred after a 2-hour latency gap'
      ];
    } else if (lower.includes('stock') || lower.includes('inventory') || lower.includes('replenish')) {
      replyText = `I recommend purchasing these replenishment items based on sales turnover:`;
      if (activeModule === 'Pharmacy') {
        replyText += ` Amoxicillin Syrup (only 8 units remaining, average daily sale is 2 units). Expiry warning: 3 batches of Vitamin C expire in 18 days.`;
      } else if (activeModule === 'Restaurant') {
        replyText += ` Beef Burger Patties and Latte Milk cartons (high dinner traffic projected).`;
      } else {
        replyText += ` Premium Rice 5kg (120 units in stock, but weekend purchase rates are high).`;
      }
    } else {
      replyText = `I have received your request: "${text}". As an integrated SaaS assistant, I can connect to Postgres views, MinIO files, and local IndexedDB parameters to compile reports or trigger alerts. Please try asking for "sales forecast" or "fraud audit".`;
    }

    const aiMsg: Message = {
      sender: 'ai',
      text: replyText,
      timestamp: new Date(),
      chartData,
      fraudFlags
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const startVoiceCommand = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const voiceTexts = [
        'Show sales forecast for this week',
        'Check inventory expiry anomalies',
        'Audit recent cash drawer transactions'
      ];
      const randomText = voiceTexts[Math.floor(Math.random() * voiceTexts.length)];
      handleSend(randomText);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white border-l border-slate-200 dark:border-darkbg-border dark:bg-darkbg-card shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-darkbg-border px-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold">DukaPos AI Co-Pilot</h3>
            <p className="text-[10px] text-slate-400">Integrated Business Intelligence</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-darkbg/20">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex flex-col max-w-[85%] ${
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            {/* Bubble */}
            <div 
              className={`rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-800 dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border dark:text-slate-200 shadow-sm'
              }`}
            >
              {msg.text}
              
              {/* Dynamic simulated chart */}
              {msg.chartData && (
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2 dark:border-darkbg-border dark:bg-darkbg">
                  <div className="text-[9px] font-bold text-slate-400 mb-1.5 flex items-center space-x-1">
                    <BarChart3 className="h-3 w-3" />
                    <span>Projected Revenue (Tsh.)</span>
                  </div>
                  <div className="space-y-1.5">
                    {msg.chartData.map((d, index) => (
                      <div key={index} className="flex items-center text-[10px]">
                        <span className="w-12 text-slate-400">{d.name}</span>
                        <div className="flex-1 bg-slate-200 dark:bg-darkbg-border h-2.5 rounded overflow-hidden mx-2">
                          <div 
                            className="bg-primary dark:bg-primary-dark h-full rounded" 
                            style={{ width: `${(d.value / 20000) * 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Tsh. {d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic fraud checklist */}
              {msg.fraudFlags && (
                <div className="mt-3 space-y-1.5">
                  {msg.fraudFlags.map((flag, index) => (
                    <div key={index} className="flex items-start space-x-2 rounded-lg border border-amber-100 bg-amber-50/50 p-2 dark:border-amber-950/20 dark:bg-amber-950/5 text-[10px]">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                      <span className="text-amber-800 dark:text-amber-300">{flag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="mt-1 text-[9px] text-slate-400">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="flex space-x-1.5 items-center p-3 max-w-[80px] bg-slate-100 dark:bg-darkbg-border rounded-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      <div className="border-t border-slate-100 dark:border-darkbg-border/30 p-2.5 bg-slate-50 dark:bg-darkbg/40 flex space-x-1.5 overflow-x-auto select-none">
        {[
          { label: '📈 Forecast Sales', prompt: 'Forecast sales for this weekend' },
          { label: '🛡️ Audit Fraud', prompt: 'Perform a fraud audit anomaly check' },
          { label: '📦 Stock check', prompt: 'What items need replenishment?' }
        ].map((btn, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(btn.prompt)}
            className="px-3 py-1.5 rounded-full bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border text-[10px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Chat input controls */}
      <div className="border-t border-slate-100 dark:border-darkbg-border/30 p-4 flex items-center space-x-2 bg-white dark:bg-darkbg-card">
        {/* Voice Command Button */}
        <button
          onClick={startVoiceCommand}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
            isRecording 
              ? 'bg-danger text-white border-danger animate-pulse scale-105' 
              : 'border-slate-200 hover:bg-slate-50 text-slate-500 dark:border-darkbg-border dark:hover:bg-slate-800'
          }`}
          title="Voice assistant input"
        >
          <Mic className="h-4.5 w-4.5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          placeholder={isRecording ? 'Listening...' : 'Ask business questions...'}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputVal)}
          disabled={isRecording}
          className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:outline-none dark:border-darkbg-border dark:bg-darkbg/50"
        />

        {/* Send Button */}
        <button
          onClick={() => handleSend(inputVal)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover shadow-sm transition active:scale-95 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
