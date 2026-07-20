import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  History, 
  Columns, 
  Lightbulb, 
  ThumbsUp, 
  ShieldAlert,
  Coins,
  Clock
} from 'lucide-react';

interface Iteration {
  iterationNumber: number;
  draft: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  score: number;
  passed: boolean;
  feedback: string[];
  improvements: string[];
}

interface Metrics {
  totalCost: number;
  latencyMs: number;
  totalTokens: {
    prompt: number;
    completion: number;
  };
}

export default function App() {
  // Form State
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Tech Professionals & Developers');
  const [tone, setTone] = useState('Inspiring & Thought-provoking');
  const [length, setLength] = useState('Medium (approx 150 words)');

  // App Execution State
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'reflecting' | 'critiquing' | 'completed' | 'failed'>('idle');
  const [currentIteration, setCurrentIteration] = useState(1);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [selectedIterIndex, setSelectedIterIndex] = useState<number>(-1);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compare Mode State
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndexA, setCompareIndexA] = useState(0);
  const [compareIndexB, setCompareIndexB] = useState(0);
  const [minScore, setMinScore] = useState(9);

  const socketRef = useRef<Socket | null>(null);
  const iterationsEndRef = useRef<HTMLDivElement | null>(null);

  // Connect to WebSocket Server on startup
  useEffect(() => {
    // Connect to NestJS Backend WebSocket server
    const socketUrl = 'http://localhost:8080';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Listen to Job Updates when Job ID is set
  useEffect(() => {
    if (!currentJobId || !socketRef.current) return;

    const socket = socketRef.current;
    const eventName = `job:${currentJobId}:progress`;

    const handleProgress = (payload: { status: string; iteration: number; data?: any }) => {
      console.log('WS Update received:', payload);
      
      const { status: stepStatus, iteration, data } = payload;

      if (data?.minScore !== undefined) {
        setMinScore(data.minScore);
      }

      if (stepStatus === 'generating' || stepStatus === 'reflecting' || stepStatus === 'critiquing') {
        setStatus(stepStatus as any);
        setCurrentIteration(iteration);
        
        // If we get intermediate draft updates
        if (data?.currentDraft) {
          // If we completed a critic evaluation in this update, append it to iterations
          if (stepStatus === 'critiquing' && data.score !== undefined) {
            const newIter: Iteration = {
              iterationNumber: iteration,
              draft: data.currentDraft,
              strengths: data.strengths || [],
              weaknesses: data.weaknesses || [],
              suggestions: data.suggestions || [],
              score: data.score,
              passed: data.passed || false,
              feedback: data.feedback || [],
              improvements: data.improvements || [],
            };

            setIterations(prev => {
              // Avoid duplicates if WS triggers multiple times
              const filtered = prev.filter(it => it.iterationNumber !== iteration);
              const updated = [...filtered, newIter].sort((a, b) => a.iterationNumber - b.iterationNumber);
              setSelectedIterIndex(updated.length - 1);
              return updated;
            });
          }
        }

        if (stepStatus === 'reflecting') {
          setIterations(prev => {
            return prev.map(it => {
              if (it.iterationNumber === iteration) {
                return {
                  ...it,
                  strengths: data.strengths || it.strengths,
                  weaknesses: data.weaknesses || it.weaknesses,
                  suggestions: data.suggestions || it.suggestions,
                };
              }
              return it;
            });
          });
        }
      } else if (stepStatus === 'completed') {
        setStatus('completed');
        if (data) {
          setMetrics({
            totalCost: data.totalCost || 0,
            latencyMs: data.latencyMs || 0,
            totalTokens: data.totalTokens || { prompt: 0, completion: 0 },
          });
        }
      } else if (stepStatus === 'failed') {
        setStatus('failed');
        setError(data?.error || 'Execution encountered an unexpected failure.');
      }
    };

    socket.on(eventName, handleProgress);

    return () => {
      socket.off(eventName, handleProgress);
    };
  }, [currentJobId]);

  // Auto-scroll iterations container on new version addition
  useEffect(() => {
    if (iterationsEndRef.current) {
      iterationsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [iterations]);

  // Default dropdown presets
  const audiencePresets = [
    'Tech Professionals & Developers',
    'Startup Founders & VCs',
    'Product Managers & Designers',
    'Marketing Executives',
    'General Business Community'
  ];

  const tonePresets = [
    'Inspiring & Thought-provoking',
    'Educational & Step-by-step',
    'Bold & Contrarian',
    'Empathetic & Story-driven',
    'Professional & Data-backed'
  ];

  const lengthPresets = [
    'Short (under 100 words)',
    'Medium (approx 150 words)',
    'Long (250+ words)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    // Reset workflow states
    setError(null);
    setIterations([]);
    setMetrics(null);
    setCurrentIteration(1);
    setSelectedIterIndex(-1);
    setCompareMode(false);
    setStatus('generating');

    try {
      const backendUrl = 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, tone, length }),
      });

      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      const data = await response.json();
      setCurrentJobId(data.jobId);
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'Failed to submit post request. Ensure backend is running.');
    }
  };

  const handlePresetTopic = (preset: string) => {
    setTopic(preset);
  };

  const activeIteration = iterations[selectedIterIndex];

  return (
    <div className="app-container">
      {/* Background Orbs */}
      <div className="glow-bg glow-purple" style={{ top: '-10%', left: '10%' }}></div>
      <div className="glow-bg glow-cyan" style={{ bottom: '10%', right: '10%' }}></div>

      {/* Header */}
      <header className="app-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)', padding: '0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} style={{ color: 'white' }} />
            </div>
            <h1 style={{ fontSize: '2rem', background: 'linear-gradient(135deg, #ffffff 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LinkedIn Post Reflector
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
            Autonomous multi-agent self-reflection & critique workflow for viral copy generation.
          </p>
        </div>

        {status !== 'idle' && (
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(79, 70, 229, 0.08)', borderColor: 'rgba(79, 70, 229, 0.3)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: status === 'completed' ? 'var(--success)' : status === 'failed' ? 'var(--danger)' : 'var(--primary)', animation: status !== 'completed' && status !== 'failed' ? 'progressPulse 1.5s infinite' : 'none' }}></span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Workflow: {status}
            </span>
          </div>
        )}
      </header>

      {/* Main Grid Layout */}
      <main className="main-grid">
        
        {/* Left Column: Form & Configuration */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.8rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Post Configurator
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Topic or Hook Idea
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Why building in public is the ultimate developer hack..."
                  style={{ width: '100%', height: '100px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.8rem', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
                  required
                />
                
                {/* Topic Presets */}
                <div style={{ marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try a preset:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <button type="button" onClick={() => handlePresetTopic("Reflecting on 5 years as a remote tech lead and the raw lessons I learned.")} style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Remote Tech Lead
                    </button>
                    <button type="button" onClick={() => handlePresetTopic("Why AI won't replace software engineers, but engineers using AI will replace those who don't.")} style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      AI vs Engineers
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.7rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {audiencePresets.map(ap => <option key={ap} value={ap}>{ap}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.7rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {tonePresets.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Length limit
                </label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.7rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {lengthPresets.map(lp => <option key={lp} value={lp}>{lp}</option>)}
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={status !== 'idle' && status !== 'completed' && status !== 'failed'}
                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
              >
                {status !== 'idle' && status !== 'completed' && status !== 'failed' ? (
                  <>
                    <RotateCw size={18} className="anim-spin-slow" />
                    Executing Loop (Iter {currentIteration})...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate & Refine
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Workflow Stepper Panel */}
          {status !== 'idle' && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Active Agent Flow
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                {/* Vertical Line Connector */}
                <div style={{ position: 'absolute', left: '15px', top: '15px', bottom: '15px', width: '2px', backgroundColor: 'var(--bg-tertiary)', zIndex: 1 }}></div>

                {/* Node: Generator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 2 }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: status === 'generating' 
                      ? 'var(--primary)' 
                      : (status === 'reflecting' || status === 'critiquing' || status === 'completed') 
                        ? 'var(--success)' 
                        : 'var(--bg-tertiary)',
                    border: status === 'generating' ? '2px solid white' : 'none',
                    animation: status === 'generating' ? 'progressPulse 1.2s infinite' : 'none'
                  }}>
                    <Sparkles size={14} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: status === 'generating' ? 'white' : 'var(--text-secondary)' }}>Generator Agent</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drafting copy, hooks, and CTAs</p>
                  </div>
                </div>

                {/* Node: Self Reflection */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 2 }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: status === 'reflecting' 
                      ? 'var(--primary)' 
                      : (status === 'critiquing' || status === 'completed') 
                        ? 'var(--success)' 
                        : 'var(--bg-tertiary)',
                    border: status === 'reflecting' ? '2px solid white' : 'none',
                    animation: status === 'reflecting' ? 'progressPulse 1.2s infinite' : 'none'
                  }}>
                    <Lightbulb size={14} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: status === 'reflecting' ? 'white' : 'var(--text-secondary)' }}>Self-Reflection Agent</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Copyediting, finding clichés & formatting issues</p>
                  </div>
                </div>

                {/* Node: Critic */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 2 }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: status === 'critiquing' 
                      ? 'var(--primary)' 
                      : status === 'completed' 
                        ? 'var(--success)' 
                        : 'var(--bg-tertiary)',
                    border: status === 'critiquing' ? '2px solid white' : 'none',
                    animation: status === 'critiquing' ? 'progressPulse 1.2s infinite' : 'none'
                  }}>
                    <ShieldAlert size={14} style={{ color: 'white' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: status === 'critiquing' ? 'white' : 'var(--text-secondary)' }}>Critic Agent</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evaluating against threshold (score &ge; {minScore})</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Execution Output / Workspace */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {error && (
            <div className="glass-panel" style={{ padding: '1.2rem', backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <AlertCircle size={24} style={{ color: 'var(--danger)' }} />
              <div>
                <p style={{ fontWeight: 600, color: 'var(--danger)' }}>Execution Error</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Central Workspace Card */}
          {iterations.length === 0 && status === 'idle' && (
            <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <Sparkles size={48} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>Ready to Generate</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', fontSize: '0.95rem' }}>
                Enter your topic in the configurator, select your target variables, and start the self-reflection loop. The agents will draft, critique, and perfect the copy.
              </p>
            </div>
          )}

          {iterations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Iteration Stepper Tracker */}
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <History size={16} /> Iteration History:
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {iterations.map((iter, idx) => (
                    <button
                      key={iter.iterationNumber}
                      onClick={() => {
                        setSelectedIterIndex(idx);
                        setCompareMode(false);
                      }}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid',
                        borderColor: selectedIterIndex === idx && !compareMode ? 'var(--primary)' : 'var(--border-color)',
                        backgroundColor: selectedIterIndex === idx && !compareMode ? 'rgba(79, 70, 229, 0.15)' : 'var(--bg-secondary)',
                        color: selectedIterIndex === idx && !compareMode ? 'white' : 'var(--text-secondary)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      v{iter.iterationNumber}
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.1rem 0.3rem', 
                        borderRadius: '4px',
                        background: iter.passed ? 'var(--success-glow)' : 'var(--bg-tertiary)',
                        color: iter.passed ? 'var(--success)' : 'var(--text-muted)'
                      }}>
                        {iter.score}
                      </span>
                    </button>
                  ))}
                  <div ref={iterationsEndRef} />
                </div>

                {/* Compare Mode Toggle */}
                {iterations.length > 1 && (
                  <button
                    onClick={() => {
                      setCompareMode(!compareMode);
                      if (!compareMode) {
                        setCompareIndexA(Math.max(0, iterations.length - 2));
                        setCompareIndexB(iterations.length - 1);
                      }
                    }}
                    style={{
                      marginLeft: 'auto',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      borderColor: compareMode ? 'var(--accent-purple)' : 'var(--border-color)',
                      backgroundColor: compareMode ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                      color: compareMode ? 'white' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Columns size={16} />
                    {compareMode ? 'Exit Comparison' : 'Compare Versions'}
                  </button>
                )}
              </div>

              {/* Compare Mode Panel */}
              {compareMode ? (
                <div className="half-grid">
                  
                  {/* Version A Panel */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Compare Source</span>
                      <select 
                        value={compareIndexA} 
                        onChange={(e) => setCompareIndexA(Number(e.target.value))}
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.5rem', color: 'white', fontSize: '0.8rem' }}
                      >
                        {iterations.map((it, idx) => (
                          <option key={idx} value={idx}>Version {it.iterationNumber} (Score: {it.score})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', minHeight: '300px', fontFamily: 'inherit' }}>
                      {iterations[compareIndexA]?.draft}
                    </div>
                  </div>

                  {/* Version B Panel */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Compare Target</span>
                      <select 
                        value={compareIndexB} 
                        onChange={(e) => setCompareIndexB(Number(e.target.value))}
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.5rem', color: 'white', fontSize: '0.8rem' }}
                      >
                        {iterations.map((it, idx) => (
                          <option key={idx} value={idx}>Version {it.iterationNumber} (Score: {it.score})</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', minHeight: '300px', fontFamily: 'inherit' }}>
                      {iterations[compareIndexB]?.draft}
                    </div>
                  </div>

                </div>
              ) : (
                /* Detail Workspace Panel (Form + Reflections + Critic) */
                activeIteration && (
                  <div className="critic-grid">
                    
                    {/* Draft Editor View */}
                    <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.15rem' }}>Generated Draft v{activeIteration.iterationNumber}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.3rem 0.6rem', 
                            borderRadius: '6px',
                            fontWeight: 600,
                            background: activeIteration.passed ? 'var(--success-glow)' : 'var(--danger-glow)',
                            color: activeIteration.passed ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {activeIteration.passed ? 'PASSED CRITIC' : 'FAILED CRITIC'}
                          </span>
                        </div>
                      </div>

                      {/* Display Post Area */}
                      <div style={{ position: 'relative', flexGrow: 1 }}>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          backgroundColor: 'rgba(0, 0, 0, 0.2)', 
                          padding: '1.2rem', 
                          borderRadius: 'var(--radius-sm)', 
                          border: '1px solid var(--border-color)', 
                          fontSize: '0.95rem', 
                          lineHeight: '1.6', 
                          fontFamily: 'inherit',
                          color: 'var(--text-primary)',
                          minHeight: '280px'
                        }}>
                          {activeIteration.draft}
                        </pre>
                        
                        <button
                          onClick={() => navigator.clipboard.writeText(activeIteration.draft)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            bottom: '10px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          Copy Draft
                        </button>
                      </div>

                      {/* Strengths & Weaknesses (Self Reflection Info) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
                        <div>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.5rem' }}>
                            <ThumbsUp size={14} /> Draft Strengths
                          </p>
                          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {activeIteration.strengths.map((str, idx) => <li key={idx} style={{ marginBottom: '0.3rem' }}>{str}</li>)}
                            {activeIteration.strengths.length === 0 && <span style={{ color: 'var(--text-muted)' }}>None logged</span>}
                          </ul>
                        </div>

                        <div>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem' }}>
                            <ShieldAlert size={14} /> Areas to Improve
                          </p>
                          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {activeIteration.weaknesses.map((weak, idx) => <li key={idx} style={{ marginBottom: '0.3rem' }}>{weak}</li>)}
                            {activeIteration.weaknesses.length === 0 && <span style={{ color: 'var(--text-muted)' }}>None logged</span>}
                          </ul>
                        </div>
                      </div>

                      {/* Suggestions list */}
                      {activeIteration.suggestions.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                            <Lightbulb size={14} /> Editor Suggestions Implemented
                          </p>
                          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {activeIteration.suggestions.map((sug, idx) => <li key={idx} style={{ marginBottom: '0.2rem' }}>{sug}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Right Hand Critic Metrics & Feedback */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      {/* Metric Score Box */}
                      <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
                        <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                          Critic Score
                        </p>
                        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.2rem' }}>
                          <span style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, white 0%, var(--accent-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {activeIteration.score}
                          </span>
                          <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 10</span>
                        </div>
                        
                        <div style={{ 
                          marginTop: '0.8rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '0.4rem',
                          color: activeIteration.passed ? 'var(--success)' : 'var(--warning)',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          {activeIteration.passed ? (
                            <>
                              <CheckCircle2 size={16} /> Passes threshold (score &gt; {minScore})
                            </>
                          ) : (
                            <>
                              <XCircle size={16} /> Fails threshold (needs &gt; {minScore})
                            </>
                          )}
                        </div>
                      </div>

                      {/* Critic Feedback */}
                      <div className="glass-panel" style={{ padding: '1.5rem', flexGrow: 1 }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                          Critic Comments
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                          {activeIteration.feedback.map((f, idx) => (
                            <div key={idx} style={{ padding: '0.6rem', backgroundColor: 'var(--bg-secondary)', borderLeft: '3px solid var(--primary)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {f}
                            </div>
                          ))}
                          {activeIteration.feedback.length === 0 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No feedback registered.</span>
                          )}
                        </div>

                        {activeIteration.improvements.length > 0 && (
                          <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                              Actionable Improvements
                            </h4>
                            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {activeIteration.improvements.map((imp, idx) => <li key={idx} style={{ marginBottom: '0.3rem' }}>{imp}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}
