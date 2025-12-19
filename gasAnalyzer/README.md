# DEX Router Gas Analyzer

A tool for analyzing gas consumption of DEX Router swap methods using `debug_traceCall`.

## Quick Start

### 1. Install

```bash
cd DEX-Router-Tools-Suite/gasAnalyzer
npm install
```

### 2. Configure RPC

Edit `config/chains.js` with your QuickNode RPC URL (must support `debug_traceCall`):

```javascript
eth: {
  rpcUrl: 'YOUR_QUICKNODE_URL',
  // ...
}
```

### 3. Test RPC Connection

```bash
node utils/quickTest.js
```

### 4. Run Analysis

```bash
# Single swap type
node analyzer/dynamicGasAnalyzer.js arb dagSwap ERC20->ETH

# All swap types
node analyzer/dynamicGasAnalyzer.js arb dagSwap all

# With UniV3 pool (for dagSwap)
POOL_TYPE=uniV3 node analyzer/dynamicGasAnalyzer.js arb dagSwap all
```

## Supported Methods

| Method | Command |
|--------|---------|
| dagSwapByOrderId | `node analyzer/dynamicGasAnalyzer.js {chain} dagSwap {swapType}` |
| unxswapByOrderId | `node analyzer/dynamicGasAnalyzer.js {chain} unxSwap {swapType}` |
| uniswapV3SwapTo | `node analyzer/dynamicGasAnalyzer.js {chain} uniswapV3 {swapType}` |

## Swap Types

- **Swap Types**: `ERC20->ERC20`, `ETH->ERC20`, `ERC20->ETH`, `all`

## Output

Results are saved to `result/` folder:
- CSV: `gas-analysis-{chain}-{method}-{timestamp}.csv`
- JSON: `gas-analysis-{chain}-{method}-{timestamp}.json`

## Project Structure

```
gasAnalyzer/
├── config/           # Chain & pool configurations
├── encoder/          # Calldata encoding
├── analyzer/         # Gas analysis scripts
├── utils/            # Helper scripts
└── result/           # Output files
```
