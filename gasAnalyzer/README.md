# DEX Router Gas Analysis Tool

A comprehensive Node.js tool for analyzing gas consumption of DEX Router swap methods across multiple EVM chains using QuickNode's `debug_traceCall` RPC API.

## Overview

This tool provides detailed gas breakdowns for three swap methods:
- **dagSwapByOrderId** - DAG-based swap routing
- **unxswapByOrderId** - Uniswap X style swaps
- **uniswapV3SwapTo** - Uniswap V3 routing

## Key Features

- **Detailed Gas Breakdown**: Splits total gas into beforeSwap, adapter/pool hops, and afterSwap
- **Multi-Scenario Analysis**: Tests 6 different scenarios including commission configurations
- **Comparison Tables**: Delta analysis comparing each scenario to baseline
- **Multi-Chain Support**: Analyze the same contracts across different EVM chains
- **Export Options**: CSV and JSON export for further analysis
- **Adapter Detection**: Automatically identifies and measures gas for each swap hop

## Gas Breakdown Formula

```
Total Gas = beforeSwap + adapter₁ + adapter₂ + ... + adapterₙ + afterSwap
```

Where:
- **beforeSwap**: Gas used before executing swaps (parameter validation, setup)
- **adapter gas**: Gas used by each swap adapter/pool in the route
- **afterSwap**: Gas used after swaps complete (token transfers, cleanup)

## Prerequisites

### 1. Node.js
- Node.js version 16 or higher
- npm or yarn package manager

### 2. QuickNode RPC Endpoint
This tool requires an RPC endpoint that supports `debug_traceCall`. QuickNode provides this capability.

**Get QuickNode**: https://www.quicknode.com/

When creating your endpoint, ensure:
- Select the correct network (Ethereum, Arbitrum, Base, or BSC)
- Enable **Debug & Trace APIs** add-on

## Installation

1. Clone or download this repository:
```bash
cd DEX-Router-Tools-Suite
```

2. Install dependencies:
```bash
npm install
```

3. Update `config.js` with your QuickNode RPC URLs:
```javascript
chains: {
  eth: {
    rpcUrl: 'YOUR_QUICKNODE_ETHEREUM_URL',
    // ...
  },
  arb: {
    rpcUrl: 'YOUR_QUICKNODE_ARBITRUM_URL',
    // ...
  }
}
```

## Configuration

### config.js

Contains all chain configurations, method selectors, and example calldata:

```javascript
module.exports = {
  chains: {
    eth: {
      name: 'Ethereum Mainnet',
      chainId: 1,
      rpcUrl: 'https://your-quicknode-url.quiknode.pro/',
      contract: '0x5E1f62Dac767b0491e3CE72469C217365D5B48cC',
      explorer: 'https://etherscan.io'
    },
    // ... arb, base, bsc
  },
  methods: {
    dagSwap: {
      selector: '0xf2c42696',
      name: 'dagSwapByOrderId',
      adapterSelectors: ['0x0a5ea466', '0x30e6ae31', '0x6f7929f2']
    },
    // ... unxSwap, uniswapV3
  }
}
```

## Quick Start

### 1. Test Your RPC Connection

First, verify your QuickNode endpoint supports `debug_traceCall`:

```bash
node utils/quickTest.js
```

**Expected output:**
```
✅ Success! Response received:
Type: CALL
From: 0xF2048e7a1D4c19F658c19b3Cd35369f9f96223aF
To: 0x368E01160C2244B0363a35B3fF0A971E44a89284
Gas Used: 234,567
Number of calls: 12

🎉 Your RPC endpoint works with debug_traceCall!
```

### 2. Verify Scenario Generation

Check that all test scenarios generate unique calldata:

```bash
node utils/verify_scenarios.js
```

**Expected output:**
```
链: arb, 方法: dagSwap

Swap 类型: ERC20->ETH
--------------------------------------------------------------------------------
 1. basic                                长度: 1234
 2. fromToken_single_commission          长度: 1298 (+64)
 3. fromToken_double_commission          长度: 1362 (+128)
 4. toToken_single_commission            长度: 1298 (+64)
 5. toToken_double_commission            长度: 1362 (+128)
 6. max_gas_scenario                     长度: 1554 (+320)

✅ 验证完成！如果看到不同的长度，说明场景配置正确。
```

### 3. Run Gas Analysis

Analyze a specific swap type:
```bash
node analyzer/gasAnalyzer.js arb dagSwap ERC20->ETH
```

Analyze all swap types:
```bash
node analyzer/gasAnalyzer.js arb dagSwap all
```

## Usage Examples

### Single Chain, Single Method, Single Swap Type
```bash
node analyzer/gasAnalyzer.js arb dagSwap ERC20->ETH
```

### Single Chain, Single Method, All Swap Types
```bash
node analyzer/gasAnalyzer.js eth unxSwap all
```

### All Available Combinations
```bash
# Ethereum - dagSwap
node analyzer/gasAnalyzer.js eth dagSwap all

# Arbitrum - unxSwap
node analyzer/gasAnalyzer.js arb unxSwap all

# Base - uniswapV3
node analyzer/gasAnalyzer.js base uniswapV3 all

# BSC - dagSwap
node analyzer/gasAnalyzer.js bsc dagSwap ERC20->ERC20
```

## Output Format

### Gas Breakdown (Per Scenario)

```
============================================================
Analyzing: basic - ERC20->ETH
============================================================

Tracing call on Arbitrum One...
Contract: 0x368E01160C2244B0363a35B3fF0A971E44a89284
Block: latest

=== Gas Breakdown ===
Method: dagSwapByOrderId
Total Gas: 0x38c51

Before Swap: ~46,892

Adapters/Pools:
  1. dagSwap_adapter: 127,841

Total Adapter Gas: 127,841

After Swap: ~70,339
====================
```

### Comparison Table

```
=== Gas Comparison Table: ERC20->ETH ===
Method: dagSwapByOrderId
Chain: Arbitrum One

Scenario                                Before      Adapters    After       Total
----------------------------------------------------------------------------------------
basic                                   46,892      127,841     70,339      245,072
  (delta from basic)                    0           0           0           0
fromToken_single_commission             47,123      127,841     70,892      245,856
  (delta from basic)                    +231        0           +553        +784
fromToken_double_commission             47,354      127,841     71,445      246,640
  (delta from basic)                    +462        0           +1,106      +1,568
toToken_single_commission               47,123      127,841     70,892      245,856
  (delta from basic)                    +231        0           +553        +784
toToken_double_commission               47,354      127,841     71,445      246,640
  (delta from basic)                    +462        0           +1,106      +1,568
max_gas_scenario                        48,912      127,841     73,892      250,645
  (delta from basic)                    +2,020      0           +3,553      +5,573
========================================================================================
```

### Exported Files

After analysis completes:
- **CSV**: `gas-analysis-arb-dagSwap-{timestamp}.csv`
- **JSON**: `gas-analysis-arb-dagSwap-{timestamp}.json`

## Test Scenarios

### 1. basic
Basic swap without any additional parameters.

### 2. fromToken_single_commission
Adds a single commission on the source token.

**Calldata suffix:**
```
800000000000000000000000{fromToken}3ca20afc2aaa000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad
```

### 3. fromToken_double_commission
Adds two commissions on the source token.

**Calldata suffix:**
```
800000000000000000000000{fromToken}3ca20afc2aaa000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad
800000000000000000000000{fromToken}3ca20afc2aaa000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad
```

### 4. toToken_single_commission
Adds a single commission on the destination token.

**Calldata suffix:**
```
800000000000000000000000{toToken}3ca20afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad
```

### 5. toToken_double_commission
Adds two commissions on the destination token.

**Calldata suffix:**
```
800000000000000000000000{toToken}3ca20afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad
800000000000000000000000{toToken}3ca20afc2bbb000000989680399efa78cacd7784751cd9fbf2523edf9efdf6ad
```

### 6. max_gas_scenario
Maximum gas scenario with multiple parameters and commissions.

**Calldata suffix:**
```
77777777222200000000000a591342772bbc7d0630efbdea3c0b704e7addad17
7777777722220000000000000000000000000000000000000000000000000064
77777777222200000000000a591342772bbc7d0630efbdea3c0b704e7addad17
22220afc2bbb000000989680591342772bbc7d0630efbdea3c0b704e7addad17
800000000000000000000000{toToken}22220afc2bbb000000989680591342772bbc7d0630efbdea3c0b704e7addad17
```

## Project Structure

```
gasAnalyzer/
├── config/                   # Configuration files
│   ├── index.js             # Unified config exports
│   ├── chains.js            # Chain and method configurations
│   └── pools.js             # Pool configurations for each chain
│
├── encoder/                  # Calldata encoding
│   ├── index.js             # Unified encoder exports
│   ├── calldataEncoder.js   # Dynamic calldata generation
│   ├── scenarioBuilder.js   # Generate scenario-specific suffixes
│   └── calldataGenerator.js # Calldata generation CLI
│
├── analyzer/                 # Gas analysis
│   ├── index.js             # Unified analyzer exports
│   ├── gasTracer.js         # Execute debug_traceCall
│   ├── gasAnalyzer.js       # Main analyzer (fixed calldata)
│   └── dynamicGasAnalyzer.js # Dynamic analyzer
│
├── utils/                    # Utility scripts
│   ├── quickTest.js         # Test RPC connectivity
│   └── verify_scenarios.js  # Verify scenario generation
│
├── result/                   # Analysis output (CSV/JSON)
├── node_modules/
├── package.json
└── README.md
```

## File Descriptions

### config/chains.js
Contains all chain configuration:
- Chain RPC URLs and contract addresses
- Method selectors (function signatures)
- Adapter selectors for gas attribution
- Example calldata for each chain/method combination

### config/pools.js
Pool configurations:
- WETH/USDC addresses per chain
- UniswapV2/V3 pool addresses
- Test amounts for each swap type

### encoder/scenarioBuilder.js
Generates test scenarios by:
- Extracting token addresses from base calldata
- Building scenario-specific suffixes
- Replacing placeholder addresses with actual tokens

### encoder/calldataGenerator.js
CLI tool for generating calldata:
```bash
node encoder/calldataGenerator.js arb dagSwap basic
node encoder/calldataGenerator.js eth unxSwap all
```

### encoder/calldataEncoder.js
Dynamic calldata generation:
- Generates calldata for uniswapV3, unxSwap, dagSwap
- No dependency on fixed examples
- Supports all swap types

### analyzer/gasTracer.js
Core tracing functionality:
- Executes `debug_traceCall` via ethers.js
- Identifies adapters by function selector
- Calculates gas breakdown

### analyzer/gasAnalyzer.js
Main analysis orchestrator:
- Analyzes multiple scenarios
- Generates comparison tables
- Exports to CSV/JSON
- Shows delta analysis

### analyzer/dynamicGasAnalyzer.js
Dynamic analysis:
- Uses dynamically generated calldata
- No fixed example dependency
- Full scenario support

### utils/verify_scenarios.js
Verification tool:
- Ensures each scenario has unique calldata
- Shows calldata length differences
- Quick sanity check before analysis

### utils/quickTest.js
RPC connectivity tester:
- Tests `debug_traceCall` support
- Verifies endpoint configuration
- Shows basic trace structure

## Adapter Detection

The tool identifies adapters by function selectors:

### dagSwap Adapters
- `0x0a5ea466` - UniswapV2 style pools
- `0x30e6ae31` - Curve style pools
- `0x6f7929f2` - Custom adapters

### unxSwap Adapters
- `0x022c0d9f` - UniswapX style execution

### uniswapV3 Adapters
- `0x128acb08` - UniswapV3 pools

## Multi-Chain Analysis

To analyze the same method across all chains:

```bash
node multiChainAnalyzer.js dagSwap all
```

This will execute analysis on all configured chains and generate a combined report.

## Troubleshooting

### Error: Method not found
**Cause**: RPC endpoint doesn't support `debug_traceCall`

**Solution**:
1. Use QuickNode: https://www.quicknode.com/
2. Enable "Debug & Trace APIs" add-on
3. Update `config.js` with your QuickNode URL

### Error: Invalid chain
**Cause**: Chain key not in `config.chains`

**Solution**: Use one of: `eth`, `arb`, `base`, `bsc`

### Error: No example calldata found
**Cause**: Missing calldata in `config.exampleCalldata[chain][method]`

**Solution**: Add example calldata to `config.js` for that chain/method combination

### Trace returns but no adapters detected
**Cause**: Adapter selectors may be incorrect or missing

**Solution**:
1. Examine trace output in generated JSON files
2. Find actual function selectors used
3. Update `config.methods[method].adapterSelectors`

## CSV Export Format

```csv
Chain,Method,Scenario,SwapType,BeforeSwap,TotalAdapterGas,AfterSwap,Total,NumAdapters,Timestamp
arb,dagSwap,basic,ERC20->ETH,46892,127841,70339,245072,1,2025-01-15T10:30:00.000Z
arb,dagSwap,fromToken_single_commission,ERC20->ETH,47123,127841,70892,245856,1,2025-01-15T10:31:00.000Z
```

## JSON Export Format

```json
{
  "chain": "arb",
  "chainName": "Arbitrum One",
  "contract": "0x368E01160C2244B0363a35B3fF0A971E44a89284",
  "method": "dagSwap",
  "methodName": "dagSwapByOrderId",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "results": [
    {
      "scenario": "basic",
      "swapType": "ERC20->ETH",
      "description": "Basic ERC20->ETH swap",
      "breakdown": {
        "total": "0x38c51",
        "totalDecimal": 245072,
        "beforeSwap": 46892,
        "adapters": [
          {
            "name": "dagSwap_adapter",
            "selector": "0x0a5ea466",
            "gasUsed": 127841
          }
        ],
        "totalAdapterGas": 127841,
        "afterSwap": 70339
      }
    }
  ]
}
```

## Performance Considerations

- Analysis includes 1-second delay between scenarios to avoid rate limiting
- Each trace call can take 2-5 seconds depending on RPC provider
- Complete analysis (all scenarios, all swap types) takes ~2-3 minutes per method

## Rate Limiting

QuickNode plans have different rate limits:
- **Free**: 25 requests/second
- **Paid**: Higher limits available

For complete analysis across all chains/methods, consider:
- Running analyses sequentially
- Upgrading to paid QuickNode plan
- Adding custom delays in code

## Contributing

Contributions welcome! Areas for improvement:
- Additional swap method support
- More granular gas attribution
- Real-time monitoring capabilities
- Gas optimization recommendations

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions:
1. Check trace outputs in generated JSON files
2. Verify RPC endpoint supports `debug_traceCall`
3. Ensure calldata is valid for the target chain/method
4. Review adapter selectors in `config.js`

## Acknowledgments

- Built with [ethers.js](https://docs.ethers.org/)
- Powered by [QuickNode](https://www.quicknode.com/) RPC infrastructure
- Inspired by the need for detailed DEX gas analysis

## Dynamic Calldata Generation (NEW!)

### What's New

The tool now supports **dynamic calldata generation**, eliminating the need for fixed example transactions. You can now:

- ✅ Generate fresh calldata for any chain/pool combination
- ✅ Test with different token pairs and amounts
- ✅ Add new chains without finding example transactions
- ✅ Customize test scenarios easily

### Quick Start with Dynamic Generation

```bash
# 1. Verify dynamic generation works
node utils/verify_scenarios.js

# 2. Run analysis with dynamically generated calldata
node analyzer/dynamicGasAnalyzer.js arb uniswapV3 ERC20->ERC20

# 3. Analyze all scenarios
node analyzer/dynamicGasAnalyzer.js arb uniswapV3 all
```

### New Files

- **`config/pools.js`** - Pool and token configurations for each chain
- **`encoder/calldataEncoder.js`** - Generates base calldata for all methods
- **`encoder/scenarioBuilder.js`** - Adds commission/trim suffixes
- **`analyzer/dynamicGasAnalyzer.js`** - Main analyzer using dynamic calldata

### How It Works

1. **Pool Configuration** (`poolConfig.js`):
   - Defines WETH-USDC pools for each chain
   - Specifies test amounts for each swap type
   - Configures UniswapV2 and UniswapV3 pools

2. **Calldata Encoding** (`calldataEncoder.js`):
   - Dynamically generates base calldata
   - Supports all three swap methods (uniswapV3, unxSwap, dagSwap)
   - Handles all swap types (ERC20->ERC20, ETH->ERC20, ERC20->ETH)

3. **Scenario Building** (`scenarioBuilder.js`):
   - Adds commission suffixes (fromToken/toToken)
   - Adds trim suffixes (positive slippage)
   - Generates 6 scenarios per swap type

4. **Gas Analysis** (`dynamicGasAnalyzer.js`):
   - Uses dynamically generated calldata
   - No dependency on fixed examples
   - Exports CSV and JSON results

### Migration Guide

**Old way** (fixed calldata):
```bash
node analyzer/gasAnalyzer.js arb dagSwap all
# Uses hardcoded calldata from config/chains.js
```

**New way** (dynamic calldata):
```bash
node analyzer/dynamicGasAnalyzer.js arb uniswapV3 all
# Generates fresh calldata from config/pools.js
```

Both methods work, but dynamic generation is more flexible!

### Configuration Example

Add a new chain in `config/pools.js`:

```javascript
polygon: {
  weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  uniswapV3: {
    pool: '0xA374094527e1673A86dE625aa59517c5dE346d32',
    fee: 500,
    token0: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    token1: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  amounts: {
    'ERC20->ERC20': { fromAmount: '10000', ... }
  }
}
```

See the README for complete documentation.

