# Block Finder Tool

Find the closest block after a given timestamp (in seconds) via RPC.

## Features

- ✅ Supports both second and millisecond timestamps (auto-detection and conversion)
- ✅ Uses binary search algorithm for fast and efficient searching
- ✅ Automatically estimates search range to reduce RPC calls
- ✅ Detailed progress logging with iteration information
- ✅ Supports any EVM-compatible chain
- ✅ Multi-chain support with chain-specific RPC configuration

## Installation

### 1. Install Dependencies

```bash
cd block-finder
npm install
```

### 2. Configure RPC Nodes

Create a `.env` file in the project root directory (DEX-Router-Tools-Suite):

```bash
cd ..
touch .env
```

Edit the `.env` file and add your RPC URLs for different chains:

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
ARB_RPC_URL=https://arb1.arbitrum.io/rpc
BASE_RPC_URL=https://mainnet.base.org
OP_RPC_URL=https://mainnet.optimism.io
POLYGON_RPC_URL=https://polygon-rpc.com/
```

Supported networks:
- **Ethereum**: `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- **BSC**: `https://bsc-dataseed.binance.org/`
- **Polygon**: `https://polygon-rpc.com/`
- **Arbitrum**: `https://arb1.arbitrum.io/rpc`
- **Base**: `https://mainnet.base.org`
- **Optimism**: `https://mainnet.optimism.io`

## Usage

### Basic Syntax

```bash
node findBlock.js <chain> <timestamp>
```

### Examples

```bash
cd block-finder

# Ethereum mainnet
node findBlock.js eth 1704067200

# BSC
node findBlock.js bsc 1704067200

# Arbitrum
node findBlock.js arb 1704067200

# Base
node findBlock.js base 1704067200
```

### Timestamp Format

Supports both second and millisecond timestamps:

```bash
# Second-level timestamp
node findBlock.js eth 1704067200

# Millisecond-level timestamp (auto-converted)
node findBlock.js eth 1704067200000
```

## Example Output

### Progress Logs (stderr)

```
[SEARCH] Target timestamp: 1704067200 (2024-01-01 08:00:00 UTC+8)
[SEARCH] Fetching latest block...
[SEARCH] Latest block: #18885234, timestamp: 1705305645
[SEARCH] Estimating average block time...
[SEARCH] Average block time: 12.15 seconds
[SEARCH] Search range: #18785234 ~ #18885234 (100001 blocks)
[SEARCH] Starting binary search...

[ITER 1] Block #18835234, timestamp: 1704697440, diff: +630240s
[ITER 2] Block #18810234, timestamp: 1704393840, diff: +326640s
[ITER 3] Block #18797734, timestamp: 1704241950, diff: +174750s
...
[ITER 15] Block #18783456, timestamp: 1704067201, diff: +1s

[SEARCH] Search completed in 15 iterations
[RESULT] Found block #18783456, timestamp difference: +1s
```

### Result (stdout, JSON format)

```json
{
  "chain": "eth",
  "blockNumber": 18783456,
  "blockHash": "0x1234567890abcdef...",
  "timestamp": 1704067201,
  "time": "2024-01-01 08:00:01 UTC+8",
  "transactions": 150
}
```

## How It Works

1. **Initialization**: Connect to RPC node and fetch latest block information
2. **Range Estimation**: Estimate starting search point based on average block time
3. **Binary Search**: Use binary search algorithm to quickly locate target block
4. **Validation**: Ensure the found block is the first one after the target timestamp

## Timestamp Utilities

To get current timestamp:

```bash
# Second-level timestamp
node -e "console.log(Math.floor(Date.now() / 1000))"

# Millisecond-level timestamp
node -e "console.log(Date.now())"

# Timestamp for a specific date
node -e "console.log(Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000))"
```

## API Usage

You can also use this tool as a module:

```javascript
const { findBlockByTimestamp } = require('./findBlock');
const { ethers } = require('ethers');

const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const timestamp = 1704067200;

findBlockByTimestamp(provider, timestamp)
  .then(block => {
    console.log('Found block:', block.number);
  });
```

## Troubleshooting

### Error: RPC_URL environment variable not found

Make sure you've created a `.env` file in the project root directory with the appropriate chain RPC configuration.

Example: For Ethereum, add `ETH_RPC_URL=https://...` to your `.env` file.

### Error: NETWORK_ERROR

Check:
- RPC URL is correct
- Network connection is stable
- API Key is valid (if using services like Alchemy, Infura, etc.)

### Target timestamp is in the future

The provided timestamp is greater than the latest block's timestamp. Please check if the timestamp is correct.

### Missing chain configuration

If you see an error like `ETH_RPC_URL environment variable not found`, add the corresponding RPC URL to your `.env` file:

```env
<CHAIN>_RPC_URL=https://your-rpc-url-here
```

Replace `<CHAIN>` with your chain name in uppercase (e.g., ETH, BSC, ARB, BASE, OP, POLYGON).

## Performance

- Uses binary search with O(log n) time complexity
- Automatically estimates search range to reduce unnecessary RPC calls
- Typically requires only 10-20 RPC requests to find the target block
- Progress logging helps track search status without impacting JSON output

## Output Format

- **Progress logs**: Output to `stderr` for tracking progress
- **Final result**: Output to `stdout` as JSON for easy parsing
- This separation allows piping the JSON output while still seeing progress:

```bash
# Save JSON to file while seeing progress
node findBlock.js eth 1704067200 > result.json

# Extract only block number
node findBlock.js eth 1704067200 2>/dev/null | jq -r '.blockNumber'
```

## License

MIT
