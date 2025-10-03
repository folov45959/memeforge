import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';

// Import UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

// Icons
import { 
  Rocket, 
  Coins, 
  TrendingUp, 
  Zap, 
  Settings, 
  Eye,
  ExternalLink,
  Copy,
  RefreshCw,
  DollarSign,
  BarChart3,
  Bot,
  Wallet,
  Target,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Main App Component
function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Router>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">MemeForge</h1>
                  <p className="text-blue-200">Create & Trade Real Memecoins</p>
                </div>
              </div>
              
              <nav className="flex space-x-4">
                <Link to="/">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/create">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Create Token
                  </Button>
                </Link>
                <Link to="/trading">
                  <Button variant="ghost" className="text-white hover:bg-white/10">
                    Auto Trading
                  </Button>
                </Link>
              </nav>
            </div>
          </header>

          {/* Routes */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateToken />} />
            <Route path="/trading" element={<AutoTrading />} />
            <Route path="/token/:id" element={<TokenDetails />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

// Dashboard Component
function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadTokens();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const loadTokens = async () => {
    try {
      const response = await axios.get(`${API}/tokens`);
      setTokens(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'deployed': return 'bg-green-500';
      case 'deploying': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="h-4 w-4" />;
      case 'deploying': return <Clock className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">Total Tokens</p>
                  <p className="text-2xl font-bold text-white">{dashboardData.stats.total_tokens}</p>
                </div>
                <Coins className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">Deployed</p>
                  <p className="text-2xl font-bold text-white">{dashboardData.stats.deployed_tokens}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">Auto Strategies</p>
                  <p className="text-2xl font-bold text-white">{dashboardData.stats.active_strategies}</p>
                </div>
                <Bot className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{dashboardData.stats.total_trades}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/create" className="block">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" size="lg">
                <Zap className="mr-2 h-5 w-5" />
                Create Best Memecoin
              </Button>
            </Link>
            
            <Link to="/create" className="block">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" size="lg">
                <Settings className="mr-2 h-5 w-5" />
                Custom Token Creator
              </Button>
            </Link>
            
            <Link to="/trading" className="block">
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" size="lg">
                <Bot className="mr-2 h-5 w-5" />
                Setup Auto Trading
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.recent_tokens?.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_tokens.slice(0, 5).map(token => (
                  <div key={token.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(token.status)}`} />
                      <div>
                        <p className="text-white font-medium">{token.name} ({token.symbol})</p>
                        <p className="text-xs text-blue-200">{token.network}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {token.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-200 text-center py-8">No tokens created yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tokens List */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Your Tokens</CardTitle>
          <CardDescription className="text-blue-200">
            Manage your created memecoins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map(token => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <p className="text-white text-lg font-medium mb-2">No tokens yet</p>
              <p className="text-blue-200 mb-6">Create your first memecoin to get started!</p>
              <Link to="/create">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                  <Rocket className="mr-2 h-4 w-4" />
                  Create Token
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Create Token Component
function CreateToken() {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    total_supply: 1000000000,
    network: 'bsc_testnet',
    tax_rate: 5
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const networks = [
    { value: 'bsc_testnet', label: 'BSC Testnet (Free)' },
    { value: 'bsc', label: 'BSC Mainnet' },
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'polygon', label: 'Polygon' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API}/tokens/create`, formData);
      setResult(response.data);
    } catch (error) {
      console.error('Token creation failed:', error);
      setResult({ error: error.response?.data?.detail || 'Failed to create token' });
    } finally {
      setLoading(false);
    }
  };

  const createBestToken = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API}/tokens/create-best`, {
        network: formData.network
      });
      setResult(response.data);
    } catch (error) {
      console.error('Auto token creation failed:', error);
      setResult({ error: error.response?.data?.detail || 'Failed to create token' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Create Your Memecoin</h2>
        <p className="text-blue-200">Launch your own cryptocurrency on the blockchain</p>
      </div>

      <Tabs defaultValue="best" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/10">
          <TabsTrigger value="best" className="text-white data-[state=active]:bg-white/20">
            <Zap className="mr-2 h-4 w-4" />
            Best Memecoin (Auto)
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-white data-[state=active]:bg-white/20">
            <Settings className="mr-2 h-4 w-4" />
            Custom Creation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="best">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Auto-Generate Best Memecoin</CardTitle>
              <CardDescription className="text-blue-200">
                Let our AI create the perfect memecoin with optimal parameters for maximum success
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="auto-network" className="text-white">Blockchain Network</Label>
                <Select 
                  value={formData.network} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, network: value }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map(network => (
                      <SelectItem key={network.value} value={network.value}>
                        {network.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">✨ What you'll get:</h4>
                <ul className="text-blue-200 text-sm space-y-1">
                  <li>• Viral memecoin name & symbol</li>
                  <li>• Optimal supply & tokenomics</li>
                  <li>• Low tax rate for trading</li>
                  <li>• Instant deployment</li>
                  <li>• Direct explorer link</li>
                </ul>
              </div>

              <Button 
                onClick={createBestToken}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-5 w-5" />
                )}
                {loading ? 'Creating...' : 'Create Best Memecoin'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Custom Token Creation</CardTitle>
              <CardDescription className="text-blue-200">
                Configure your memecoin with custom parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Token Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. SafeMoon"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-white">Token Symbol</Label>
                    <Input
                      id="symbol"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SAFE"
                      className="bg-white/10 border-white/20 text-white placeholder:text-blue-300"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="supply" className="text-white">Total Supply</Label>
                    <Input
                      id="supply"
                      type="number"
                      value={formData.total_supply}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_supply: parseInt(e.target.value) }))}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax" className="text-white">Tax Rate (%)</Label>
                    <Input
                      id="tax"
                      type="number"
                      min="0"
                      max="20"
                      value={formData.tax_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: parseInt(e.target.value) }))}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="network" className="text-white">Blockchain Network</Label>
                  <Select 
                    value={formData.network} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, network: value }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map(network => (
                        <SelectItem key={network.value} value={network.value}>
                          {network.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit"
                  disabled={loading || !formData.name || !formData.symbol}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  size="lg"
                >
                  {loading ? (
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Rocket className="mr-2 h-5 w-5" />
                  )}
                  {loading ? 'Creating Token...' : 'Create Token'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Display */}
      {result && (
        <Card className={`bg-white/10 backdrop-blur-sm border-white/20 ${result.error ? 'border-red-500/50' : 'border-green-500/50'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center ${result.error ? 'text-red-400' : 'text-green-400'}`}>
              {result.error ? (
                <AlertCircle className="mr-2 h-5 w-5" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {result.error ? 'Creation Failed' : 'Token Created Successfully!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <p className="text-red-300">{result.error}</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-200">Token Name</p>
                    <p className="text-white font-medium">{result.name} ({result.symbol})</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">Network</p>
                    <p className="text-white font-medium">{result.network}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">Total Supply</p>
                    <p className="text-white font-medium">{result.total_supply.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">Status</p>
                    <Badge className={`${getStatusColor(result.status)} text-white`}>
                      {result.status}
                    </Badge>
                  </div>
                </div>
                
                {result.contract_address && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <p className="text-sm text-green-200 mb-2">Contract Address:</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-green-300 font-mono text-sm bg-black/20 px-2 py-1 rounded">
                        {result.contract_address}
                      </code>
                      <Button size="sm" variant="ghost" className="text-green-300 hover:bg-green-500/20">
                        <Copy className="h-4 w-4" />
                      </Button>
                      {result.explorer_url && (
                        <Button size="sm" variant="ghost" className="text-green-300 hover:bg-green-500/20">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <Alert className="bg-blue-500/10 border-blue-500/20">
                  <AlertDescription className="text-blue-200">
                    Your token is being deployed to the blockchain. This may take a few minutes to complete.
                    You can track the progress in your dashboard.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  function getStatusColor(status) {
    switch (status) {
      case 'deployed': return 'bg-green-500';
      case 'deploying': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
}

// Auto Trading Component
function AutoTrading() {
  const [tokens, setTokens] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [newStrategy, setNewStrategy] = useState({
    token_address: '',
    network: 'bsc_testnet',
    trigger_price: 0,
    sell_percentage: 10,
    enabled: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTokens();
    loadStrategies();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await axios.get(`${API}/tokens`);
      setTokens(response.data.filter(token => token.status === 'deployed'));
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  const loadStrategies = async () => {
    try {
      const response = await axios.get(`${API}/trading/strategies`);
      setStrategies(response.data.strategies || []);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  };

  const setupAutoSell = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/trading/auto-sell`, newStrategy);
      await loadStrategies();
      setNewStrategy({
        token_address: '',
        network: 'bsc_testnet',
        trigger_price: 0,
        sell_percentage: 10,
        enabled: true
      });
    } catch (error) {
      console.error('Failed to setup auto-sell:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Auto Trading</h2>
        <p className="text-blue-200">Set up automated trading strategies for your tokens</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setup Auto Sell */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              Setup Auto Sell
            </CardTitle>
            <CardDescription className="text-blue-200">
              Automatically sell tokens when price reaches target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={setupAutoSell} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Select Token</Label>
                <Select 
                  value={newStrategy.token_address} 
                  onValueChange={(value) => setNewStrategy(prev => ({ ...prev, token_address: value }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Choose a token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map(token => (
                      <SelectItem key={token.id} value={token.contract_address}>
                        {token.name} ({token.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Trigger Price ($)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newStrategy.trigger_price}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, trigger_price: parseFloat(e.target.value) }))}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="0.00001"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Sell Percentage (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newStrategy.sell_percentage}
                    onChange={(e) => setNewStrategy(prev => ({ ...prev, sell_percentage: parseFloat(e.target.value) }))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  checked={newStrategy.enabled}
                  onCheckedChange={(checked) => setNewStrategy(prev => ({ ...prev, enabled: checked }))}
                />
                <Label className="text-white">Enable Strategy</Label>
              </div>

              <Button 
                type="submit"
                disabled={loading || !newStrategy.token_address}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Target className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Setting up...' : 'Setup Auto Sell'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Strategies */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Active Strategies
            </CardTitle>
            <CardDescription className="text-blue-200">
              {strategies.length} active trading strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            {strategies.length > 0 ? (
              <div className="space-y-3">
                {strategies.map(strategy => (
                  <div key={strategy.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">Auto Sell Strategy</p>
                      <Badge className="bg-green-500/20 text-green-300">
                        Active
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-blue-200">Token:</p>
                        <p className="text-white">{strategy.token_address.slice(0, 10)}...</p>
                      </div>
                      <div>
                        <p className="text-blue-200">Network:</p>
                        <p className="text-white">{strategy.network}</p>
                      </div>
                      <div>
                        <p className="text-blue-200">Trigger:</p>
                        <p className="text-white">${strategy.trigger_price}</p>
                      </div>
                      <div>
                        <p className="text-blue-200">Sell %:</p>
                        <p className="text-white">{strategy.sell_percentage}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <p className="text-white mb-2">No strategies active</p>
                <p className="text-blue-200 text-sm">Set up your first auto-sell strategy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trading Features Info */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">🚀 Coming Soon: Advanced Trading Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h4 className="text-white font-medium">Smart Buy Orders</h4>
              <p className="text-blue-200 text-sm">Automated buying at optimal prices</p>
            </div>
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-pink-400 mx-auto mb-2" />
              <h4 className="text-white font-medium">Portfolio Rebalancing</h4>
              <p className="text-blue-200 text-sm">Automatic portfolio optimization</p>
            </div>
            <div className="text-center">
              <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <h4 className="text-white font-medium">MEV Protection</h4>
              <p className="text-blue-200 text-sm">Advanced sandwich attack protection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Token Card Component
function TokenCard({ token }) {
  const [priceData, setPriceData] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'deployed': return 'bg-green-500';
      case 'deploying': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="h-4 w-4" />;
      case 'deploying': return <Clock className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const loadPrice = async () => {
    if (!token.contract_address || token.status !== 'deployed') return;
    
    setLoadingPrice(true);
    try {
      const response = await axios.get(`${API}/tokens/${token.id}/price`);
      setPriceData(response.data.price_data);
    } catch (error) {
      console.error('Failed to load price:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-white font-bold">{token.name}</h4>
            <p className="text-blue-200 text-sm">{token.symbol}</p>
          </div>
          <Badge className={`${getStatusColor(token.status)} text-white`}>
            {getStatusIcon(token.status)}
            <span className="ml-1">{token.status}</span>
          </Badge>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-blue-200">Supply:</span>
            <span className="text-white">{token.total_supply.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-200">Network:</span>
            <span className="text-white">{token.network}</span>
          </div>
          {priceData && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Price:</span>
              <span className="text-green-400">${priceData.price_usd.toFixed(8)}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          {token.status === 'deployed' && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                onClick={loadPrice}
                disabled={loadingPrice}
              >
                {loadingPrice ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <DollarSign className="h-3 w-3" />
                )}
              </Button>
              
              {token.explorer_url && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.open(token.explorer_url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
          
          <Button 
            size="sm" 
            variant="outline" 
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              if (token.contract_address) {
                navigator.clipboard.writeText(token.contract_address);
              }
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Token Details Component (placeholder)
function TokenDetails() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-white mb-4">Token Details</h2>
      <p className="text-blue-200">Detailed token view coming soon...</p>
    </div>
  );
}

export default App;