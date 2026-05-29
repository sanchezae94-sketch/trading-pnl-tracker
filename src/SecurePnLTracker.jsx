import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, RefreshCw, Settings, Download, Upload, BarChart3, Moon, Sun, Lock, LogOut } from 'lucide-react';

const SecurePnLTracker = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [trades, setTrades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    quantity: '1',
    entryPrice: '',
    currentPrice: '',
    strikePrice: '',
    optionType: 'call',
    expiryDate: '',
    notes: '',
    underlyingSymbol: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('pnlTrackerData');
    const savedPassword = localStorage.getItem('pnlTrackerPassword');
    if (saved) setTrades(JSON.parse(saved));
    if (savedPassword) setPassword(savedPassword);
  }, []);

  useEffect(() => {
    if (authenticated) {
      localStorage.setItem('pnlTrackerData', JSON.stringify(trades));
    }
  }, [trades, authenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password && tempPassword === password) {
      setAuthenticated(true);
      setTempPassword('');
    } else if (!password) {
      setPassword(tempPassword);
      localStorage.setItem('pnlTrackerPassword', tempPassword);
      setAuthenticated(true);
      setTempPassword('');
    } else {
      alert('Incorrect password');
      setTempPassword('');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setTempPassword('');
  };

  const handleAddTrade = (e) => {
    e.preventDefault();
    if (!formData.symbol || !formData.entryPrice) return;

    const newTrade = {
      id: editingId || Date.now(),
      ...formData,
      quantity: parseFloat(formData.quantity) || 1,
      entryPrice: parseFloat(formData.entryPrice),
      currentPrice: parseFloat(formData.currentPrice) || parseFloat(formData.entryPrice),
      strikePrice: parseFloat(formData.strikePrice),
    };

    if (editingId) {
      setTrades(trades.map(t => t.id === editingId ? newTrade : t));
      setEditingId(null);
    } else {
      setTrades([...trades, newTrade]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symbol: '',
      quantity: '1',
      entryPrice: '',
      currentPrice: '',
      strikePrice: '',
      optionType: 'call',
      expiryDate: '',
      notes: '',
      underlyingSymbol: '',
    });
    setShowForm(false);
  };

  const deleteTrade = (id) => {
   if (window.confirm('Delete this trade?')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  const editTrade = (trade) => {
    setFormData(trade);
    setEditingId(trade.id);
    setShowForm(true);
  };

  const calculatePnL = (trade) => {
    const priceDiff = trade.currentPrice - trade.entryPrice;
    return priceDiff * trade.quantity * 100;
  };

  const calculateROI = (trade) => {
    if (trade.entryPrice === 0) return 0;
    return ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
  };

  const getTotalPnL = () => trades.reduce((sum, t) => sum + calculatePnL(t), 0);

  const stats = {
    totalTrades: trades.length,
    winningTrades: trades.filter(t => calculatePnL(t) > 0).length,
    losingTrades: trades.filter(t => calculatePnL(t) < 0).length,
    winRate: trades.length > 0 ? (trades.filter(t => calculatePnL(t) > 0).length / trades.length * 100).toFixed(1) : 0,
    avgWin: trades.filter(t => calculatePnL(t) > 0).length > 0 
      ? (trades.filter(t => calculatePnL(t) > 0).reduce((sum, t) => sum + calculatePnL(t), 0) / trades.filter(t => calculatePnL(t) > 0).length).toFixed(2)
      : 0,
    largestWin: trades.length > 0 ? Math.max(...trades.map(t => calculatePnL(t))).toFixed(2) : 0,
    largestLoss: trades.length > 0 ? Math.min(...trades.map(t => calculatePnL(t))).toFixed(2) : 0,
  };

  const exportTrades = () => {
    const headers = ['Date', 'Underlying', 'Symbol', 'Quantity', 'Entry', 'Current', 'Strike', 'Type', 'Expiry', 'P&L', 'ROI%', 'Notes'];
    const rows = trades.map(t => [
      t.date,
      t.underlyingSymbol,
      t.symbol,
      t.quantity,
      t.entryPrice,
      t.currentPrice,
      t.strikePrice,
      t.optionType,
      t.expiryDate,
      calculatePnL(t).toFixed(2),
      calculateROI(t).toFixed(2),
      t.notes,
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => csv += row.map(cell => `"${cell}"`).join(',') + '\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importTrades = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result;
        const lines = csv.split('\n');
        const imported = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, ''));
            return {
              id: Date.now() + Math.random(),
              date: values[0],
              underlyingSymbol: values[1],
              symbol: values[2],
              quantity: parseFloat(values[3]),
              entryPrice: parseFloat(values[4]),
              currentPrice: parseFloat(values[5]),
              strikePrice: parseFloat(values[6]),
              optionType: values[7],
              expiryDate: values[8],
              notes: values[11],
            };
          });

        setTrades([...trades, ...imported]);
        alert(`Imported ${imported.length} trades!`);
      } catch (error) {
        alert('Error importing CSV: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const totalPnL = getTotalPnL();

  if (!authenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Sora:wght@600;700&display=swap');
          body { font-family: 'Sora', sans-serif; }
          .mono { font-family: 'IBM Plex Mono', monospace; }
        `}</style>
        <div className={`w-full max-w-md p-8 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-center mb-6">
            <Lock size={40} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <h1 className={`text-3xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            StratTracker
          </h1>
          <p className={`text-center mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {password ? 'Enter your password' : 'Create a password'}
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder={password ? "Password" : "Create password"}
              className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
              }`}
            />
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              {password ? 'Login' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Sora:wght@600;700&display=swap');
        body { font-family: 'Sora', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .glass { background: ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'}; backdrop-filter: blur(20px); border: 1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; }
        .pnl-positive { color: #10b981; }
        .pnl-negative { color: #ef4444; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>StratTracker</h1>
          <div className="flex gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`p-3 glass rounded-lg ${darkMode ? 'text-yellow-400' : 'text-gray-600'}`}>
              {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button onClick={() => setShowStats(!showStats)} className={`p-3 glass rounded-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <BarChart3 size={24} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-3 glass rounded-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Settings size={24} />
            </button>
            <button onClick={handleLogout} className="p-3 glass rounded-lg text-red-500">
              <LogOut size={24} />
            </button>
          </div>
        </div>

        {showStats && (
          <div className="glass rounded-xl p-6 mb-8">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass rounded-lg p-4"><div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>TOTAL TRADES</div><div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalTrades}</div></div>
              <div className="glass rounded-lg p-4"><div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>WIN RATE</div><div className="text-2xl font-bold pnl-positive">{stats.winRate}%</div></div>
              <div className="glass rounded-lg p-4"><div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>LARGEST WIN</div><div className="text-2xl font-bold pnl-positive">${stats.largestWin}</div></div>
              <div className="glass rounded-lg p-4"><div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>LARGEST LOSS</div><div className="text-2xl font-bold pnl-negative">${stats.largestLoss}</div></div>
            </div>
          </div>
        )}

        {showSettings && (
          <div className="glass rounded-xl p-6 mb-8">
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
            <div className="space-y-4">
              <button onClick={exportTrades} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg">
                <Download size={18} /> Download CSV
              </button>
              <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer">
                <Upload size={18} /> Import CSV
                <input type="file" accept=".csv" onChange={importTrades} className="hidden" />
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <div className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>TOTAL P&L</div>
            <div className={`text-3xl font-bold mono ${totalPnL >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>${totalPnL.toFixed(2)}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>POSITIONS</div>
            <div className={`text-3xl font-bold mono ${darkMode ? 'text-white' : 'text-gray-900'}`}>{trades.length}</div>
          </div>
        </div>

        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold mb-6">
          <Plus size={20} /> Add Trade
        </button>

        {showForm && (
          <div className="glass rounded-xl p-6 mb-6">
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>New Position</h3>
            <form onSubmit={handleAddTrade} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
                <input type="text" placeholder="AAPL" value={formData.underlyingSymbol} onChange={(e) => setFormData({...formData, underlyingSymbol: e.target.value.toUpperCase()})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="AAPL 150 C" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
                <input type="number" placeholder="Contracts" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Entry Price" value={formData.entryPrice} onChange={(e) => setFormData({...formData, entryPrice: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
                <input type="number" step="0.01" placeholder="Current Price" value={formData.currentPrice} onChange={(e) => setFormData({...formData, currentPrice: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input type="number" step="0.01" placeholder="Strike" value={formData.strikePrice} onChange={(e) => setFormData({...formData, strikePrice: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
                <select value={formData.optionType} onChange={(e) => setFormData({...formData, optionType: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`}>
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
                <input type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
              </div>
              <input type="text" placeholder="Notes (optional)" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className={`w-full px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 border border-gray-600 text-white' : 'bg-gray-50 border border-gray-300'}`} />
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className={`flex-1 px-4 py-2 rounded-lg ${darkMode ? 'border border-gray-600 text-gray-300 hover:bg-gray-700' : 'border border-gray-300 hover:bg-gray-100'}`}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">{editingId ? 'Update' : 'Add Trade'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Open Positions</h2>
          {trades.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>No trades yet</p>
            </div>
          ) : (
            trades.map(trade => {
              const pnl = calculatePnL(trade);
              const roi = calculateROI(trade);
              return (
                <div key={trade.id} className="glass rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{trade.underlyingSymbol}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{trade.symbol}</div>
                      <div className={`text-xs mt-2 space-x-3 ${darkMode ? 'text-gray-500' : 'text-gray-700'}`}>
                        <span>Entry: ${trade.entryPrice.toFixed(2)}</span>
                        <span>Current: ${trade.currentPrice.toFixed(2)}</span>
                        <span>Qty: {trade.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold mono ${pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>${pnl.toFixed(2)}</div>
                      <div className={`text-sm ${roi >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>{roi >= 0 ? '+' : ''}{roi.toFixed(2)}%</div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => editTrade(trade)} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><Edit2 size={16} /></button>
                        <button onClick={() => deleteTrade(trade.id)} className={`p-1 rounded ${darkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}><Trash2 size={16} className="text-red-500" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurePnLTracker;
