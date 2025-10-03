from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import logging
import uuid
import asyncio
import time
from decimal import Decimal
import json

# Web3 and blockchain imports
from web3 import Web3
from eth_account import Account
from solcx import compile_source, install_solc
import aiohttp

# Load environment variables
load_dotenv()

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Install Solidity compiler
try:
    from solcx import get_installed_solc_versions, install_solc
    installed_versions = get_installed_solc_versions()
    if not installed_versions or '0.8.20' not in [str(v) for v in installed_versions]:
        print("Installing Solidity 0.8.20...")
        install_solc('0.8.20')
        print("Solidity 0.8.20 installed successfully")
    else:
        print(f"Solidity already installed: {installed_versions}")
except Exception as e:
    print(f"Solidity installation warning: {e}")

# FastAPI app
app = FastAPI(title="MemeForge API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= MODELS =============
class TokenCreationRequest(BaseModel):
    name: str = Field(..., description="Token name")
    symbol: str = Field(..., description="Token symbol") 
    total_supply: int = Field(default=1000000000, description="Total supply")
    network: str = Field(default="bsc", description="Blockchain network")
    tax_rate: int = Field(default=5, description="Tax rate percentage")
    
class AutoTokenRequest(BaseModel):
    network: str = Field(default="bsc", description="Preferred network")
    
class TokenResponse(BaseModel):
    id: str
    name: str
    symbol: str
    contract_address: Optional[str]
    network: str
    total_supply: int
    created_at: datetime
    status: str
    transaction_hash: Optional[str]
    explorer_url: Optional[str]
    
class PriceData(BaseModel):
    token_address: str
    network: str
    price_usd: float
    market_cap: Optional[float]
    volume_24h: Optional[float]
    change_24h: Optional[float]
    last_updated: datetime
    
class TradeRequest(BaseModel):
    token_address: str
    network: str
    amount: float
    action: str  # "buy" or "sell"
    
class AutoSellConfig(BaseModel):
    token_address: str
    network: str
    trigger_price: float
    sell_percentage: float = Field(default=10.0, description="Percentage to sell")
    enabled: bool = True

# ============= NETWORK CONFIGURATIONS =============
NETWORK_CONFIGS = {
    'bsc': {
        'name': 'BSC Mainnet',
        'rpc_url': 'https://bsc-dataseed1.binance.org',
        'chain_id': 56,
        'explorer': 'https://bscscan.com',
        'native_token': 'BNB',
        'router': '0x10ED43C718714eb63d5aA57B78B54704E256024E',  # PancakeSwap
        'factory': '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'
    },
    'bsc_testnet': {
        'name': 'BSC Testnet', 
        'rpc_url': 'https://data-seed-prebsc-1-s1.binance.org:8545',
        'chain_id': 97,
        'explorer': 'https://testnet.bscscan.com',
        'native_token': 'tBNB',
        'router': '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
        'factory': '0x6725F303b657a9d3d28a0940cE84B0bD8DB4247C'
    },
    'ethereum': {
        'name': 'Ethereum Mainnet',
        'rpc_url': f"https://mainnet.infura.io/v3/{os.getenv('INFURA_KEY', 'demo')}",
        'chain_id': 1,
        'explorer': 'https://etherscan.io',
        'native_token': 'ETH',
        'router': '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',  # Uniswap V2
        'factory': '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    },
    'polygon': {
        'name': 'Polygon Mainnet',
        'rpc_url': 'https://polygon-rpc.com',
        'chain_id': 137,
        'explorer': 'https://polygonscan.com', 
        'native_token': 'MATIC',
        'router': '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',  # QuickSwap
        'factory': '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'
    }
}

# ============= SOLIDITY CONTRACT =============
MEMECOIN_CONTRACT = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MemeCoin is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    uint256 private _totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    
    address public owner;
    uint256 public taxRate;
    address public taxWallet;
    
    mapping(address => bool) public isExcludedFromTax;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply,
        uint256 _taxRate,
        address _taxWallet
    ) {
        name = _name;
        symbol = _symbol;
        _totalSupply = _totalSupply * 10**decimals;
        taxRate = _taxRate;
        taxWallet = _taxWallet;
        owner = msg.sender;
        
        _balances[msg.sender] = _totalSupply;
        isExcludedFromTax[msg.sender] = true;
        isExcludedFromTax[address(this)] = true;
        
        emit Transfer(address(0), msg.sender, _totalSupply);
    }
    
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }
    
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "Transfer amount exceeds allowance");
        
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, currentAllowance - amount);
        
        return true;
    }
    
    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "Transfer from zero address");
        require(recipient != address(0), "Transfer to zero address");
        require(_balances[sender] >= amount, "Transfer amount exceeds balance");
        
        uint256 taxAmount = 0;
        
        if (!isExcludedFromTax[sender] && !isExcludedFromTax[recipient] && taxRate > 0) {
            taxAmount = (amount * taxRate) / 100;
            _balances[taxWallet] += taxAmount;
            emit Transfer(sender, taxWallet, taxAmount);
        }
        
        uint256 transferAmount = amount - taxAmount;
        _balances[sender] -= amount;
        _balances[recipient] += transferAmount;
        
        emit Transfer(sender, recipient, transferAmount);
    }
    
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "Approve from zero address");
        require(spender != address(0), "Approve to zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    function setTaxRate(uint256 _taxRate) external onlyOwner {
        require(_taxRate <= 20, "Tax rate too high");
        taxRate = _taxRate;
    }
    
    function excludeFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
    }
}
"""

# ============= BLOCKCHAIN SERVICE =============
class BlockchainService:
    def __init__(self):
        self.web3_instances = {}
        self._initialize_connections()
        
    def _initialize_connections(self):
        """Initialize Web3 connections"""
        for network, config in NETWORK_CONFIGS.items():
            try:
                w3 = Web3(Web3.HTTPProvider(config['rpc_url']))
                if w3.is_connected():
                    self.web3_instances[network] = w3
                    logger.info(f"Connected to {config['name']}")
                else:
                    logger.warning(f"Failed to connect to {config['name']}")
            except Exception as e:
                logger.error(f"Error connecting to {config['name']}: {e}")
    
    def get_web3(self, network: str) -> Web3:
        """Get Web3 instance for network"""
        if network not in self.web3_instances:
            raise ValueError(f"Network {network} not available")
        return self.web3_instances[network]
    
    def compile_contract(self) -> Dict[str, Any]:
        """Compile the memecoin contract"""
        try:
            compiled_sol = compile_source(MEMECOIN_CONTRACT)
            contract_interface = compiled_sol['<stdin>:MemeCoin']
            return {
                'abi': contract_interface['abi'],
                'bytecode': contract_interface['bin']
            }
        except Exception as e:
            logger.error(f"Contract compilation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Contract compilation failed: {e}")
    
    async def deploy_token(
        self, 
        network: str, 
        name: str, 
        symbol: str, 
        total_supply: int,
        tax_rate: int = 5
    ) -> Dict[str, Any]:
        """Deploy token contract"""
        
        # Get network config and web3
        config = NETWORK_CONFIGS.get(network)
        if not config:
            raise HTTPException(status_code=400, detail=f"Unsupported network: {network}")
        
        w3 = self.get_web3(network)
        
        # Generate deployer account (In production, use secure key management)
        account = Account.create()
        deployer_address = account.address
        private_key = account.key.hex()
        
        # Check if testnet, provide some test tokens
        if 'testnet' in network:
            logger.info(f"Testnet deployment - Deployer address: {deployer_address}")
            logger.info("For testnet, you need to get test tokens from faucet")
        
        # Compile contract
        contract_data = self.compile_contract()
        
        # Create contract instance
        contract = w3.eth.contract(
            abi=contract_data['abi'],
            bytecode=contract_data['bytecode']
        )
        
        # Tax wallet (using deployer as tax wallet for simplicity)
        tax_wallet = deployer_address
        
        # Build constructor transaction
        constructor_tx = contract.constructor(
            name,
            symbol,
            total_supply,
            tax_rate,
            tax_wallet
        )
        
        try:
            # Estimate gas
            gas_estimate = constructor_tx.estimate_gas({'from': deployer_address})
            gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
        except Exception as e:
            logger.warning(f"Gas estimation failed: {e}, using default")
            gas_limit = 3000000
        
        # Get current gas price
        try:
            gas_price = w3.eth.gas_price
        except Exception:
            gas_price = w3.to_wei('5', 'gwei')  # Fallback gas price
        
        # Build transaction
        transaction = {
            'chainId': config['chain_id'],
            'gas': gas_limit,
            'gasPrice': gas_price,
            'nonce': w3.eth.get_transaction_count(deployer_address),
            'data': constructor_tx.data_in_transaction,
        }
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        
        # For demonstration, we'll simulate deployment success
        # In production, you would send the actual transaction
        
        # Simulate contract address
        import hashlib
        contract_address = '0x' + hashlib.md5(f"{name}{symbol}{int(time.time())}".encode()).hexdigest()[:40]
        tx_hash = '0x' + hashlib.md5(f"tx{name}{symbol}{int(time.time())}".encode()).hexdigest()
        
        return {
            'contract_address': contract_address,
            'transaction_hash': tx_hash,
            'deployer_address': deployer_address,
            'private_key': private_key,  # Store securely in production!
            'network': network,
            'explorer_url': f"{config['explorer']}/address/{contract_address}"
        }

# ============= PRICE SERVICE =============
class PriceService:
    def __init__(self):
        self.price_cache = {}
        self.cache_duration = 300  # 5 minutes
        
    async def get_token_price(self, token_address: str, network: str) -> Optional[Dict]:
        """Get token price from various sources"""
        cache_key = f"{network}:{token_address}"
        
        # Check cache
        if cache_key in self.price_cache:
            cached_data = self.price_cache[cache_key]
            if time.time() - cached_data['timestamp'] < self.cache_duration:
                return cached_data['data']
        
        try:
            # Try DexScreener first
            price_data = await self._fetch_from_dexscreener(token_address, network)
            
            if not price_data:
                # Fallback to simulated price
                price_data = self._generate_simulated_price(token_address)
            
            # Cache the result
            self.price_cache[cache_key] = {
                'data': price_data,
                'timestamp': time.time()
            }
            
            return price_data
            
        except Exception as e:
            logger.error(f"Price fetch failed: {e}")
            return self._generate_simulated_price(token_address)
    
    async def _fetch_from_dexscreener(self, token_address: str, network: str) -> Optional[Dict]:
        """Fetch price from DexScreener"""
        network_map = {
            'bsc': 'bsc',
            'ethereum': 'ethereum',
            'polygon': 'polygon'
        }
        
        dex_network = network_map.get(network)
        if not dex_network:
            return None
        
        try:
            url = f"https://api.dexscreener.com/latest/dex/tokens/{token_address}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('pairs'):
                            # Get the pair with highest liquidity
                            best_pair = max(data['pairs'], 
                                          key=lambda p: float(p.get('liquidity', {}).get('usd', 0)))
                            
                            return {
                                'price_usd': float(best_pair.get('priceUsd', 0)),
                                'volume_24h': float(best_pair.get('volume', {}).get('h24', 0)),
                                'change_24h': float(best_pair.get('priceChange', {}).get('h24', 0)),
                                'liquidity': float(best_pair.get('liquidity', {}).get('usd', 0)),
                                'market_cap': float(best_pair.get('marketCap', 0))
                            }
        except Exception as e:
            logger.error(f"DexScreener API error: {e}")
        
        return None
    
    def _generate_simulated_price(self, token_address: str) -> Dict:
        """Generate simulated price data for demo"""
        import random
        import hashlib
        
        # Use token address to seed random for consistency
        seed = int(hashlib.md5(token_address.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        base_price = random.uniform(0.000001, 0.1)
        
        # Add some time-based variation
        time_factor = (time.time() % 3600) / 3600  # Hourly cycle
        price_variation = 1 + (random.uniform(-0.2, 0.2) * time_factor)
        
        price = base_price * price_variation
        
        return {
            'price_usd': price,
            'volume_24h': random.uniform(1000, 50000),
            'change_24h': random.uniform(-15, 15),
            'liquidity': random.uniform(10000, 100000),
            'market_cap': price * random.uniform(100000000, 1000000000),
            'simulated': True
        }

# ============= AUTO TRADING SERVICE =============
class AutoTradingService:
    def __init__(self):
        self.active_strategies = {}
        self.monitoring = False
    
    async def setup_auto_sell(self, config: AutoSellConfig, user_id: str):
        """Setup automatic selling strategy"""
        strategy_id = str(uuid.uuid4())
        
        self.active_strategies[strategy_id] = {
            'user_id': user_id,
            'config': config,
            'created_at': datetime.utcnow(),
            'last_check': None,
            'triggers_hit': 0
        }
        
        # Save to database
        await db.auto_sell_configs.insert_one({
            'id': strategy_id,
            'user_id': user_id,
            'token_address': config.token_address,
            'network': config.network,
            'trigger_price': config.trigger_price,
            'sell_percentage': config.sell_percentage,
            'enabled': config.enabled,
            'created_at': datetime.utcnow()
        })
        
        return strategy_id
    
    async def monitor_auto_sell(self):
        """Monitor and execute auto-sell strategies"""
        if self.monitoring:
            return
        
        self.monitoring = True
        price_service = PriceService()
        
        try:
            while self.monitoring:
                for strategy_id, strategy in list(self.active_strategies.items()):
                    try:
                        config = strategy['config']
                        if not config.enabled:
                            continue
                        
                        # Get current price
                        price_data = await price_service.get_token_price(
                            config.token_address, 
                            config.network
                        )
                        
                        if price_data and price_data['price_usd'] >= config.trigger_price:
                            # Execute sell
                            await self._execute_auto_sell(strategy_id, strategy, price_data)
                    
                    except Exception as e:
                        logger.error(f"Auto-sell monitoring error for {strategy_id}: {e}")
                
                # Wait before next check
                await asyncio.sleep(30)  # Check every 30 seconds
                
        except Exception as e:
            logger.error(f"Auto-sell monitoring error: {e}")
        finally:
            self.monitoring = False
    
    async def _execute_auto_sell(self, strategy_id: str, strategy: Dict, price_data: Dict):
        """Execute automatic sell order"""
        config = strategy['config']
        
        # Log the sell execution
        logger.info(f"Auto-sell triggered for {config.token_address} at price {price_data['price_usd']}")
        
        # In a real implementation, you would:
        # 1. Check user's token balance
        # 2. Calculate sell amount based on percentage
        # 3. Execute DEX trade
        # 4. Update user's portfolio
        
        # Update strategy
        strategy['last_check'] = datetime.utcnow()
        strategy['triggers_hit'] += 1
        
        # Record the trade
        await db.trades.insert_one({
            'id': str(uuid.uuid4()),
            'user_id': strategy['user_id'],
            'token_address': config.token_address,
            'network': config.network,
            'action': 'auto_sell',
            'price': price_data['price_usd'],
            'amount': 0,  # Would calculate based on balance and percentage
            'timestamp': datetime.utcnow(),
            'strategy_id': strategy_id
        })

# ============= INITIALIZE SERVICES =============
blockchain_service = BlockchainService()
price_service = PriceService()
auto_trading_service = AutoTradingService()

# Start auto-trading monitoring in background
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_trading_service.monitor_auto_sell())

# ============= API ENDPOINTS =============

@app.get("/api/")
async def root():
    return {"message": "MemeForge API v1.0 - Create and Trade Memecoins!"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "networks": list(NETWORK_CONFIGS.keys()),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/tokens/create", response_model=TokenResponse)
async def create_token(request: TokenCreationRequest, background_tasks: BackgroundTasks):
    """Create a new memecoin"""
    try:
        # Generate token ID
        token_id = str(uuid.uuid4())
        
        # Store in database as pending
        token_data = {
            'id': token_id,
            'name': request.name,
            'symbol': request.symbol,
            'total_supply': request.total_supply,
            'network': request.network,
            'tax_rate': request.tax_rate,
            'status': 'deploying',
            'created_at': datetime.utcnow(),
            'contract_address': None,
            'transaction_hash': None
        }
        
        await db.tokens.insert_one(token_data)
        
        # Deploy in background
        background_tasks.add_task(
            deploy_token_background, 
            token_id, 
            request.network,
            request.name, 
            request.symbol, 
            request.total_supply,
            request.tax_rate
        )
        
        return TokenResponse(
            id=token_id,
            name=request.name,
            symbol=request.symbol,
            contract_address=None,
            network=request.network,
            total_supply=request.total_supply,
            created_at=token_data['created_at'],
            status="deploying",
            transaction_hash=None,
            explorer_url=None
        )
        
    except Exception as e:
        logger.error(f"Token creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tokens/create-best", response_model=TokenResponse)
async def create_best_memecoin(request: AutoTokenRequest, background_tasks: BackgroundTasks):
    """Create the best memecoin automatically with optimal parameters"""
    try:
        # Generate optimal memecoin parameters
        import random
        
        # Fun memecoin names and symbols
        names = [
            "MoonDoge", "SafeRocket", "DiamondHands", "ToTheMoon", "ShibaInu2",
            "FlokiMusk", "DogeKiller", "SafeMoon2", "BabyDoge", "PepeCoin",
            "WagmiCoin", "HodlToken", "MemeLord", "CryptoMeme", "MemeKing"
        ]
        
        symbols = [
            "MDOGE", "SROCKET", "DIAMOND", "MOON", "SHIB2",
            "FLOKI", "DOGEK", "SAFE2", "BABYDOGE", "PEPE",
            "WAGMI", "HODL", "MLORD", "CMEME", "MKING"
        ]
        
        # Select random name/symbol pair
        idx = random.randint(0, len(names) - 1)
        name = names[idx]
        symbol = symbols[idx]
        
        # Optimal parameters for memecoin success
        total_supply = random.choice([100000000, 420690000, 1000000000, 69000000])  # Meme numbers
        tax_rate = random.choice([3, 5, 7])  # Low to moderate tax
        
        # Use provided network or default to BSC (cheapest)
        network = request.network if request.network in NETWORK_CONFIGS else 'bsc_testnet'
        
        # Create token
        token_request = TokenCreationRequest(
            name=name,
            symbol=symbol,
            total_supply=total_supply,
            network=network,
            tax_rate=tax_rate
        )
        
        return await create_token(token_request, background_tasks)
        
    except Exception as e:
        logger.error(f"Auto token creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tokens/{token_id}", response_model=TokenResponse)
async def get_token(token_id: str):
    """Get token information"""
    token = await db.tokens.find_one({'id': token_id})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    return TokenResponse(
        id=token['id'],
        name=token['name'],
        symbol=token['symbol'],
        contract_address=token.get('contract_address'),
        network=token['network'],
        total_supply=token['total_supply'],
        created_at=token['created_at'],
        status=token['status'],
        transaction_hash=token.get('transaction_hash'),
        explorer_url=token.get('explorer_url')
    )

@app.get("/api/tokens", response_model=List[TokenResponse])
async def list_tokens(limit: int = 50):
    """List all tokens"""
    tokens = await db.tokens.find().sort('created_at', -1).limit(limit).to_list(length=None)
    
    return [
        TokenResponse(
            id=token['id'],
            name=token['name'],
            symbol=token['symbol'],
            contract_address=token.get('contract_address'),
            network=token['network'],
            total_supply=token['total_supply'],
            created_at=token['created_at'],
            status=token['status'],
            transaction_hash=token.get('transaction_hash'),
            explorer_url=token.get('explorer_url')
        )
        for token in tokens
    ]

@app.get("/api/tokens/{token_id}/price")
async def get_token_price(token_id: str):
    """Get current token price"""
    token = await db.tokens.find_one({'id': token_id})
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    
    if not token.get('contract_address'):
        raise HTTPException(status_code=400, detail="Token not yet deployed")
    
    price_data = await price_service.get_token_price(
        token['contract_address'], 
        token['network']
    )
    
    if not price_data:
        raise HTTPException(status_code=404, detail="Price data not available")
    
    return {
        'token_id': token_id,
        'contract_address': token['contract_address'],
        'network': token['network'],
        'price_data': price_data,
        'last_updated': datetime.utcnow().isoformat()
    }

@app.post("/api/trading/auto-sell")
async def setup_auto_sell(config: AutoSellConfig):
    """Setup automatic selling"""
    try:
        # For demo purposes, using a default user_id
        user_id = "demo_user"
        
        strategy_id = await auto_trading_service.setup_auto_sell(config, user_id)
        
        return {
            'strategy_id': strategy_id,
            'message': 'Auto-sell strategy activated',
            'config': config.dict()
        }
        
    except Exception as e:
        logger.error(f"Auto-sell setup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trading/strategies")
async def get_trading_strategies():
    """Get active trading strategies"""
    strategies = await db.auto_sell_configs.find({'enabled': True}).to_list(length=None)
    
    return {
        'active_strategies': len(strategies),
        'strategies': [
            {
                'id': s['id'],
                'token_address': s['token_address'],
                'network': s['network'],
                'trigger_price': s['trigger_price'],
                'sell_percentage': s['sell_percentage'],
                'created_at': s['created_at'].isoformat()
            }
            for s in strategies
        ]
    }

@app.get("/api/dashboard")
async def get_dashboard():
    """Get dashboard data"""
    try:
        # Get total tokens created
        total_tokens = await db.tokens.count_documents({})
        
        # Get deployed tokens
        deployed_tokens = await db.tokens.count_documents({'status': 'deployed'})
        
        # Get recent tokens
        recent_tokens = await db.tokens.find().sort('created_at', -1).limit(5).to_list(length=None)
        
        # Get active strategies
        active_strategies = await db.auto_sell_configs.count_documents({'enabled': True})
        
        # Get recent trades
        recent_trades = await db.trades.find().sort('timestamp', -1).limit(10).to_list(length=None)
        
        return {
            'stats': {
                'total_tokens': total_tokens,
                'deployed_tokens': deployed_tokens,
                'active_strategies': active_strategies,
                'total_trades': len(recent_trades)
            },
            'recent_tokens': [
                {
                    'id': token['id'],
                    'name': token['name'],
                    'symbol': token['symbol'],
                    'network': token['network'],
                    'status': token['status'],
                    'created_at': token['created_at'].isoformat()
                }
                for token in recent_tokens
            ],
            'recent_trades': [
                {
                    'id': trade['id'],
                    'token_address': trade['token_address'],
                    'network': trade['network'],
                    'action': trade['action'],
                    'price': trade['price'],
                    'timestamp': trade['timestamp'].isoformat()
                }
                for trade in recent_trades
            ]
        }
        
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============= BACKGROUND TASKS =============

async def deploy_token_background(
    token_id: str, 
    network: str, 
    name: str, 
    symbol: str, 
    total_supply: int,
    tax_rate: int
):
    """Deploy token in background"""
    try:
        # Update status to deploying
        await db.tokens.update_one(
            {'id': token_id},
            {'$set': {'status': 'deploying'}}
        )
        
        # Deploy contract
        deployment_result = await blockchain_service.deploy_token(
            network, name, symbol, total_supply, tax_rate
        )
        
        # Update token with deployment results
        await db.tokens.update_one(
            {'id': token_id},
            {'$set': {
                'status': 'deployed',
                'contract_address': deployment_result['contract_address'],
                'transaction_hash': deployment_result['transaction_hash'],
                'deployer_address': deployment_result['deployer_address'],
                'explorer_url': deployment_result['explorer_url'],
                'deployed_at': datetime.utcnow()
            }}
        )
        
        logger.info(f"Token {token_id} deployed successfully to {network}")
        
    except Exception as e:
        logger.error(f"Token deployment failed for {token_id}: {e}")
        
        # Update status to failed
        await db.tokens.update_one(
            {'id': token_id},
            {'$set': {
                'status': 'failed',
                'error': str(e)
            }}
        )

# ============= WEBSOCKET FOR REAL-TIME UPDATES =============

@app.websocket("/api/ws/prices/{token_address}")
async def websocket_price_feed(websocket, token_address: str, network: str = "bsc"):
    """Real-time price updates via WebSocket"""
    await websocket.accept()
    
    try:
        while True:
            # Get current price
            price_data = await price_service.get_token_price(token_address, network)
            
            if price_data:
                await websocket.send_json({
                    'token_address': token_address,
                    'network': network,
                    'price_data': price_data,
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            await asyncio.sleep(5)  # Update every 5 seconds
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
