/**
 * Flow Diagram Generator
 * Generates flow diagram data from any decoded swap calldata.
 *
 * Supported function families:
 *  - dagSwap*       → Full DAG with inputIndex / outputIndex
 *  - smartSwap*     → Batch-based parallel / sequential routing
 *  - unxswap*       → Linear pool chain
 *  - uniswapV3Swap* → Linear pool chain
 *  - swapWrap*      → Simple wrap / unwrap
 */

// ============================================================
//  Well-known tokens (USDT, USDC, DAI, WETH, ETH)
//  Chains: Ethereum, BSC, Base, Arbitrum, Optimism, XLayer
// ============================================================
const KNOWN_TOKENS = {
    // Native ETH placeholder (same across all chains)
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ETH',

    // Ethereum Mainnet
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',

    // BSC
    '0x55d398326f99059ff775485246999027b3197955': 'USDT',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'USDC',
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': 'DAI',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'WBNB',

    // Base
    '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': 'USDT',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
    '0x4200000000000000000000000000000000000006': 'WETH',

    // Arbitrum
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT',
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': 'DAI',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',

    // Optimism (DAI & WETH shared with Arb/Base — already listed)
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'USDT',
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 'USDC',

    // XLayer
    '0x1e4a5963abfd975d8c9021ce480b42188849d41d': 'USDT',
    '0x74b7f16337b8972027f6196a17a631ac6de26d22': 'USDC',
    '0x5a77f1443d16ee5761d310e38b62f77f726bc71c': 'WETH',
};

// ============================================================
//  Helpers
// ============================================================

function shortenAddress(address) {
    if (!address) return '???';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTokenSymbol(address) {
    if (!address) return null;
    return KNOWN_TOKENS[address.toLowerCase()] || null;
}

function getTokenDisplayName(address) {
    if (!address) return 'Unknown';
    return getTokenSymbol(address) || shortenAddress(address);
}

/** Case-insensitive address equality */
function addrEq(a, b) {
    if (!a || !b) return false;
    return a.toLowerCase() === b.toLowerCase();
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isZeroAddress(addr) {
    return !addr || addr.toLowerCase() === ZERO_ADDRESS;
}

/** Create a node object */
function makeNode(id, tokenAddress) {
    return {
        id: String(id),
        token: tokenAddress || null,
        symbol: getTokenSymbol(tokenAddress),
        shortAddr: tokenAddress ? shortenAddress(tokenAddress) : null,
        displayName: tokenAddress ? getTokenDisplayName(tokenAddress) : 'Unknown',
    };
}

// ============================================================
//  Detection — which function types are supported
// ============================================================

function getFunctionFamily(decodedResult) {
    if (!decodedResult?.function?.name) return null;
    const n = decodedResult.function.name;
    if (n.startsWith('dagSwap'))       return 'dag';
    if (n.startsWith('smartSwap'))     return 'smart';
    if (n.startsWith('unxswap'))       return 'unxswap';
    if (n.startsWith('uniswapV3Swap')) return 'uniV3';
    if (n.startsWith('swapWrap'))      return 'wrap';
    return null;
}

function supportsFlowDiagram(decodedResult) {
    const family = getFunctionFamily(decodedResult);
    return family === 'dag' || family === 'smart';
}

// ============================================================
//  Generator — dagSwap (full DAG)
// ============================================================

function generateDagFlowData(decodedResult) {
    const { paths, baseRequest } = decodedResult;
    if (!paths?.length) return null;

    // Node → token mapping
    const nodeTokenMap = {};
    paths.forEach(path => {
        if (path.rawData?.length) {
            const idx = String(path.rawData[0].inputIndex);
            const addr = path.fromToken?.address || path.fromToken;
            if (addr) nodeTokenMap[idx] = addr;
        }
    });

    let maxOut = 0;
    paths.forEach(p => (p.rawData || []).forEach(rd => {
        const o = parseInt(rd.outputIndex);
        if (o > maxOut) maxOut = o;
    }));
    if (baseRequest?.toToken) nodeTokenMap[String(maxOut)] = baseRequest.toToken;

    // Edges grouped by (in → out)
    const edgeMap = {};
    paths.forEach((path, pi) => {
        (path.rawData || []).forEach((rd, ri) => {
            const from = String(rd.inputIndex);
            const to = String(rd.outputIndex);
            const key = `${from}->${to}`;
            if (!edgeMap[key]) edgeMap[key] = { from, to, routes: [], totalWeight: 0 };
            edgeMap[key].routes.push({
                adapter: path.mixAdapters?.[ri] || 'Unknown',
                pool: rd.poolAddress,
                weight: parseInt(rd.weight) || 0,
                reverse: rd.reverse,
                pathIndex: pi,
            });
            edgeMap[key].totalWeight += parseInt(rd.weight) || 0;
        });
    });

    // Percentages
    const inputTotals = {};
    Object.values(edgeMap).forEach(e => {
        inputTotals[e.from] = (inputTotals[e.from] || 0) + e.totalWeight;
    });

    const edges = Object.values(edgeMap).map(e => ({
        ...e,
        percentage: ((e.totalWeight / (inputTotals[e.from] || 10000)) * 100).toFixed(1),
        routes: [...e.routes].sort((a, b) => b.weight - a.weight),
    }));

    // Nodes
    const ids = new Set();
    edges.forEach(e => { ids.add(e.from); ids.add(e.to); });
    const nodes = Array.from(ids)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => makeNode(id, nodeTokenMap[id]));

    return { nodes, edges };
}

// ============================================================
//  Generator — smartSwap (batch paths)
// ============================================================

function generateSmartSwapFlowData(decodedResult) {
    const { batches, baseRequest } = decodedResult;
    if (!batches?.length) return null;

    // Build an ordered token chain from baseRequest + path fromTokens
    const tokenChain = [];
    const addUnique = (addr) => {
        if (addr && !tokenChain.some(t => addrEq(t, addr))) tokenChain.push(addr);
    };

    if (baseRequest?.fromToken) addUnique(baseRequest.fromToken);

    batches.forEach(batch => {
        (batch || []).forEach(path => {
            addUnique(path.fromToken?.address || path.fromToken);
        });
    });

    if (baseRequest?.toToken) addUnique(baseRequest.toToken);

    // Nodes
    const nodes = tokenChain.map((t, i) => makeNode(i, t));

    // Edges — group by (fromTokenIndex → fromTokenIndex+1)
    const edgeMap = {};

    batches.forEach(batch => {
        (batch || []).forEach((path, pathIdx) => {
            const fromAddr = path.fromToken?.address || path.fromToken;
            const fromIdx = tokenChain.findIndex(t => addrEq(t, fromAddr));
            const toIdx = fromIdx + 1;
            if (fromIdx < 0 || toIdx >= tokenChain.length) return;

            const key = `${fromIdx}->${toIdx}`;
            if (!edgeMap[key]) edgeMap[key] = { from: String(fromIdx), to: String(toIdx), routes: [], totalWeight: 0 };

            (path.rawData || []).forEach((rd, ri) => {
                edgeMap[key].routes.push({
                    adapter: path.mixAdapters?.[ri] || 'Unknown',
                    pool: rd.poolAddress,
                    weight: parseInt(rd.weight) || 0,
                    reverse: rd.reverse,
                    pathIndex: pathIdx,
                });
                edgeMap[key].totalWeight += parseInt(rd.weight) || 0;
            });
        });
    });

    // If baseRequest.fromToken ≠ first path's fromToken, add an implicit edge
    if (tokenChain.length >= 2) {
        const firstPathAddr = batches[0]?.[0]?.fromToken?.address || batches[0]?.[0]?.fromToken;
        if (baseRequest?.fromToken && firstPathAddr && !addrEq(baseRequest.fromToken, firstPathAddr)) {
            const key = '0->1';
            if (!edgeMap[key]) {
                edgeMap[key] = {
                    from: '0', to: '1',
                    routes: [{ adapter: '-', pool: '-', weight: 10000, reverse: false, pathIndex: -1 }],
                    totalWeight: 10000,
                };
            }
        }
    }

    // Percentages
    const inputTotals = {};
    Object.values(edgeMap).forEach(e => { inputTotals[e.from] = (inputTotals[e.from] || 0) + e.totalWeight; });
    const edges = Object.values(edgeMap)
        .sort((a, b) => parseInt(a.from) - parseInt(b.from))
        .map(e => ({
            ...e,
            percentage: ((e.totalWeight / (inputTotals[e.from] || 10000)) * 100).toFixed(1),
            routes: [...e.routes].sort((a, b) => b.weight - a.weight),
        }));

    return { nodes, edges };
}

// ============================================================
//  Generator — unxswap / uniswapV3 (linear pool chain)
// ============================================================

function generatePoolChainFlowData(decodedResult) {
    const { pools, baseRequest, srcToken } = decodedResult;
    if (!pools?.length) return null;

    const fromToken = baseRequest?.fromToken || srcToken || null;
    const toToken = baseRequest?.toToken || null;

    // Nodes: start → (intermediate hops) → end
    const nodes = [makeNode(0, fromToken)];

    // Intermediate hops (unknown tokens — label as "Hop N")
    for (let i = 0; i < pools.length - 1; i++) {
        const hop = makeNode(i + 1, null);
        hop.displayName = `Hop ${i + 1}`;
        hop.shortAddr = `Hop ${i + 1}`;
        nodes.push(hop);
    }

    const endIdx = pools.length;
    nodes.push(makeNode(endIdx, toToken));

    // Edges: one per pool
    const edges = pools.map((pool, idx) => {
        const poolAddr = pool.address || pool.pool || 'Unknown';
        const isReverse = pool.isOneForZero || false;
        return {
            from: String(idx),
            to: String(idx + 1),
            routes: [{
                adapter: 'Direct Pool',
                pool: poolAddr,
                weight: 10000,
                reverse: isReverse,
                pathIndex: 0,
            }],
            totalWeight: 10000,
            percentage: '100.0',
        };
    });

    return { nodes, edges };
}

// ============================================================
//  Generator — swapWrap (simple wrap / unwrap)
// ============================================================

function generateSwapWrapFlowData(decodedResult) {
    const { baseRequest, rawdata } = decodedResult;
    const isReversed = rawdata?.reversed;

    // If baseRequest exists (swapWrapToWithBaseRequest), use it
    if (baseRequest?.fromToken && baseRequest?.toToken) {
        return {
            nodes: [makeNode(0, baseRequest.fromToken), makeNode(1, baseRequest.toToken)],
            edges: [{
                from: '0', to: '1',
                routes: [{ adapter: 'Wrap Contract', pool: '-', weight: 10000, reverse: isReversed || false, pathIndex: 0 }],
                totalWeight: 10000, percentage: '100.0',
            }],
        };
    }

    // Plain swapWrap — no token addresses available, use generic labels
    const fromLabel = isReversed ? 'Wrapped Native' : 'Native Token';
    const toLabel   = isReversed ? 'Native Token'   : 'Wrapped Native';

    const fromNode = makeNode(0, null);
    fromNode.displayName = fromLabel; fromNode.shortAddr = fromLabel;
    const toNode = makeNode(1, null);
    toNode.displayName = toLabel; toNode.shortAddr = toLabel;

    return {
        nodes: [fromNode, toNode],
        edges: [{
            from: '0', to: '1',
            routes: [{ adapter: 'Wrap Contract', pool: '-', weight: 10000, reverse: isReversed || false, pathIndex: 0 }],
            totalWeight: 10000, percentage: '100.0',
        }],
    };
}

// ============================================================
//  Branch helpers — trim/charge/commission branches from a node
// ============================================================

const COMMISSION_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/**
 * Create branch nodes and edges from a source node.
 * @param {string} sourceNodeId - Node to branch from (e.g. "0" or last node id)
 * @param {Object} options - { nodeIdPrefix, items }
 * @param {string} options.nodeIdPrefix - Prefix for branch node ids (e.g. "" for trim/charge, "comm_from" or "comm_to")
 * @param {Array<{address: string, ratePct: string, nodeIdSuffix: string, nodeType: string}>} options.items
 * @returns {{ nodesToAdd: Array, edgesToAdd: Array }}
 */
function createBranch(sourceNodeId, options) {
    const { nodeIdPrefix, items } = options;
    if (!items?.length) return { nodesToAdd: [], edgesToAdd: [] };

    const nodesToAdd = [];
    const edgesToAdd = [];

    for (const item of items) {
        if (!item.address || isZeroAddress(item.address)) continue;

        const nodeId = nodeIdPrefix ? `${nodeIdPrefix}_${item.nodeIdSuffix}` : item.nodeIdSuffix;
        const rateLabel = `${item.ratePct}%`;

        nodesToAdd.push({
            id: nodeId,
            token: item.address,
            symbol: null,
            shortAddr: shortenAddress(item.address),
            displayName: item.displayName || `${item.nodeType}: ${shortenAddress(item.address)}`,
            type: item.nodeType,
        });

        const edge = {
            from: sourceNodeId,
            to: nodeId,
            percentage: item.ratePct,
            routes: [],
            totalWeight: 0,
            isBranchEdge: true,
            branchRateLabel: rateLabel,
        };
        if (item.nodeType === 'trim') edge.isTrimEdge = true;
        else if (item.nodeType === 'charge') edge.isChargeEdge = true;
        else if (item.nodeType === 'commission') edge.isCommissionEdge = true;
        edge.trimRateLabel = edge.chargeRateLabel = edge.commissionRateLabel = rateLabel;
        edgesToAdd.push(edge);
    }

    return { nodesToAdd, edgesToAdd };
}

function getSwapNodeIds(flowData) {
    const numericIds = flowData.nodes
        .filter(n => n.type !== 'trim' && n.type !== 'charge' && n.type !== 'commission' && !isNaN(parseInt(n.id, 10)))
        .map(n => parseInt(n.id, 10));
    const firstId = numericIds.length ? String(Math.min(...numericIds)) : null;
    const lastId = numericIds.length ? String(Math.max(...numericIds)) : null;
    return { firstId, lastId };
}

/** Trim/charge: branch from last node when hasTrim is set */
function injectTrimCharge(flowData, decodedResult) {
    if (!flowData?.nodes?.length || !decodedResult?.hasTrim) return flowData;

    const { lastId } = getSwapNodeIds(flowData);
    if (lastId == null) return flowData;

    const trimRate = decodedResult.trimRate;
    const trimAddress = decodedResult.trimAddress;
    const chargeRate = decodedResult.chargeRate;
    const chargeAddress = decodedResult.chargeAddress;
    if (!trimRate || !trimAddress || isZeroAddress(trimAddress)) return flowData;

    const trimRatePct = ((parseInt(trimRate, 10) || 0) / 10000 * 100).toFixed(2);
    const items = [
        { address: trimAddress, ratePct: trimRatePct, nodeIdSuffix: 'trim', nodeType: 'trim', displayName: `Trim: ${shortenAddress(trimAddress)}` },
    ];
    const chargeRateNum = parseInt(chargeRate, 10) || 0;
    if (chargeRateNum > 0 && chargeAddress && !isZeroAddress(chargeAddress)) {
        const chargeRatePct = (chargeRateNum / 10000 * 100).toFixed(2);
        items.push({ address: chargeAddress, ratePct: chargeRatePct, nodeIdSuffix: 'charge', nodeType: 'charge', displayName: `Charge: ${shortenAddress(chargeAddress)}` });
    }

    const { nodesToAdd, edgesToAdd } = createBranch(lastId, { nodeIdPrefix: '', items });
    return {
        nodes: [...flowData.nodes, ...nodesToAdd],
        edges: [...flowData.edges, ...edgesToAdd],
    };
}

/** Commission: branch from node 0 (fromToken) or last node (toToken); up to 8 addresses per side */
function injectCommission(flowData, decodedResult) {
    if (!flowData?.nodes?.length || !decodedResult?.hasCommission) return flowData;

    const { firstId, lastId } = getSwapNodeIds(flowData);
    if (firstId == null || lastId == null) return flowData;

    const referCount = Math.min(parseInt(decodedResult.referCount, 10) || 0, 8);
    if (referCount === 0) return flowData;

    const fromTokenItems = [];
    const toTokenItems = [];

    for (let i = 0; i < referCount; i++) {
        const key = COMMISSION_ORDINALS[i];
        const block = decodedResult[key];
        if (!block || !block.rate || !block.address || isZeroAddress(block.address)) continue;

        // Commission rate: 10000000 = 1%
        const ratePct = ((parseInt(block.rate, 10) || 0) / 10000000).toFixed(2);
        const displayName = `Comm: ${shortenAddress(block.address)}`;
        const item = { address: block.address, ratePct, nodeIdSuffix: String(i), nodeType: 'commission', displayName };

        const ct = block.commissionType || '';
        if (ct.endsWith('FROM_TOKEN_COMMISSION')) {
            fromTokenItems.push(item);
        } else if (ct.endsWith('TO_TOKEN_COMMISSION')) {
            toTokenItems.push(item);
        }
    }

    let nodes = [...flowData.nodes];
    let edges = [...flowData.edges];

    if (fromTokenItems.length) {
        const fromItems = fromTokenItems.map((it, idx) => ({ ...it, nodeIdSuffix: String(idx) }));
        const out = createBranch(firstId, { nodeIdPrefix: 'comm_from', items: fromItems });
        nodes = nodes.concat(out.nodesToAdd);
        edges = edges.concat(out.edgesToAdd);
    }
    if (toTokenItems.length) {
        const toItems = toTokenItems.map((it, idx) => ({ ...it, nodeIdSuffix: String(idx) }));
        const out = createBranch(lastId, { nodeIdPrefix: 'comm_to', items: toItems });
        nodes = nodes.concat(out.nodesToAdd);
        edges = edges.concat(out.edgesToAdd);
    }

    return { nodes, edges };
}

// ============================================================
//  Main entry point — dispatch to the right generator
// ============================================================

function generateFlowData(decodedResult) {
    const family = getFunctionFamily(decodedResult);
    let flowData = null;
    switch (family) {
        case 'dag':     flowData = generateDagFlowData(decodedResult); break;
        case 'smart':   flowData = generateSmartSwapFlowData(decodedResult); break;
        case 'unxswap': flowData = generatePoolChainFlowData(decodedResult); break;
        case 'uniV3':   flowData = generatePoolChainFlowData(decodedResult); break;
        case 'wrap':    flowData = generateSwapWrapFlowData(decodedResult); break;
        default:        return null;
    }
    if (!flowData) return null;
    flowData = injectTrimCharge(flowData, decodedResult);
    flowData = injectCommission(flowData, decodedResult);
    return flowData;
}

// ============================================================
//  Mermaid definition generator (shared across all types)
// ============================================================

function generateMermaidDefinition(flowData) {
    if (!flowData?.nodes?.length || !flowData?.edges?.length) return null;

    const { nodes, edges } = flowData;

    // Theme config
    let def = '';
    def += '%%{init: {"theme": "dark", "themeVariables": {';
    def += '"primaryColor": "#1e3a5f", ';
    def += '"primaryTextColor": "#ffffff", ';
    def += '"primaryBorderColor": "#38bdf8", ';
    def += '"lineColor": "#7dd3fc", ';
    def += '"secondaryColor": "#1a1a2e", ';
    def += '"tertiaryColor": "#282c34", ';
    def += '"edgeLabelBackground": "#1e293b", ';
    def += '"nodeTextColor": "#ffffff", ';
    def += '"mainBkg": "#1e293b", ';
    def += '"nodeBorder": "#38bdf8"';
    def += '}}}%%\n\n';
    def += 'graph LR\n\n';

    const swapNodesList = nodes.filter(n => n.type !== 'trim' && n.type !== 'charge' && n.type !== 'commission');
    const branchNodesList = nodes.filter(n => n.type === 'trim' || n.type === 'charge' || n.type === 'commission');

    // Main flow nodes only
    swapNodesList.forEach(node => {
        const name = node.symbol || node.shortAddr || node.displayName;
        const addrLine = node.token ? shortenAddress(node.token) : '';
        if (node.symbol && addrLine) {
            def += `  N${node.id}["<b>Node ${node.id}: ${name}</b><br/>${addrLine}"]\n`;
        } else {
            def += `  N${node.id}["Node ${node.id}: ${name}"]\n`;
        }
    });

    def += '\n';

    // Main flow edges only (no branch edges)
    edges.filter(e => !e.isBranchEdge).forEach(edge => {
        const cnt = edge.routes.length;
        const label = `${edge.percentage}% &middot; ${cnt} route${cnt > 1 ? 's' : ''}`;
        const isImplicit = edge.routes.length === 1 && edge.routes[0].adapter === '-';
        if (isImplicit) {
            def += `  N${edge.from} -.->|"converted"| N${edge.to}\n`;
        } else {
            def += `  N${edge.from} -->|"${label}"| N${edge.to}\n`;
        }
    });

    // Branch nodes in a subgraph at the bottom (Trim / Charge / Commission)
    if (branchNodesList.length > 0) {
        def += '\n  subgraph bottom [Commission / Trim]\n';
        branchNodesList.forEach(node => {
            const label = node.displayName || node.shortAddr || node.id;
            def += `    N${node.id}{{"${label}"}}\n`;
        });
        def += '  end\n\n';
    }

    // Branch edges (from token nodes down to branch nodes)
    edges.filter(e => e.isBranchEdge && e.branchRateLabel).forEach(edge => {
        def += `  N${edge.from} -.->|"${edge.branchRateLabel}"| N${edge.to}\n`;
    });

    def += '\n';

    // Styling — start (green), end (orange), intermediates (blue)
    const swapNodes = nodes.filter(n => n.type !== 'trim' && n.type !== 'charge' && n.type !== 'commission');
    const sorted = [...swapNodes].sort((a, b) => {
        const na = parseInt(a.id, 10);
        const nb = parseInt(b.id, 10);
        if (isNaN(na) || isNaN(nb)) return 0;
        return na - nb;
    });
    if (sorted.length >= 2) {
        def += `  style N${sorted[0].id} fill:#0d3320,stroke:#4caf50,stroke-width:3px,color:#fff\n`;
        def += `  style N${sorted[sorted.length - 1].id} fill:#3d1a00,stroke:#ff9800,stroke-width:3px,color:#fff\n`;
        sorted.slice(1, -1).forEach(n => {
            def += `  style N${n.id} fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff\n`;
        });
    } else if (sorted.length === 1) {
        def += `  style N${sorted[0].id} fill:#0d3320,stroke:#4caf50,stroke-width:3px,color:#fff\n`;
    }
    nodes.filter(n => n.type === 'trim' || n.type === 'charge' || n.type === 'commission').forEach(n => {
        def += `  style N${n.id} fill:#3d1a1a,stroke:#dc2626,stroke-width:2px,color:#fff\n`;
    });
    // Subgraph box: match dark background, subtle border (no blue highlight)
    if (branchNodesList.length > 0) {
        def += '  style bottom fill:#1e293b,stroke:#475569,stroke-width:1px\n';
    }

    return def;
}

// ============================================================
//  Exports
// ============================================================

export {
    supportsFlowDiagram,
    generateFlowData,
    generateMermaidDefinition,
    getTokenSymbol,
    getTokenDisplayName,
    shortenAddress,
    KNOWN_TOKENS,
};
