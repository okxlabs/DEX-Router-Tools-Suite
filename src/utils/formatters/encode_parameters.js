import { 
    packSrcToken, 
    packReceiver, 
    packRawdata, 
    packUniswapV3Pool, 
    packUnxswapPool 
} from './encode_packers.js';
import { 
    prepareBaseRequestTuple, 
    prepareBatchesTuples, 
    preparePathsTuples,
    prepareDagPathsTuples 
} from './encode_helpers.js';

/**
 * Prepare parameters for smartSwapByOrderId function
 * ABI: (uint256 orderId, BaseRequest baseRequest, uint256[] batchesAmount, RouterPath[][] batches, ExtraData[] extraData)
 */
export function prepareSmartSwapByOrderIdParams(jsonData) {
    const {
        orderId,
        baseRequest,
        batchesAmount,
        batches,
        extraData = []
    } = jsonData;

    // Validate required fields
    if (!orderId || !baseRequest || !batchesAmount || !batches) {
        throw new Error('Missing required parameters for smartSwapByOrderId');
    }

    return [
        orderId,
        prepareBaseRequestTuple(baseRequest),
        batchesAmount,
        prepareBatchesTuples(batches),
        extraData
    ];
}

/**
 * Prepare parameters for smartSwapByInvest function
 * ABI: (BaseRequest baseRequest, uint256[] batchesAmount, RouterPath[][] batches, ExtraData[] extraData, address to)
 */
export function prepareSmartSwapByInvestParams(jsonData) {
    const {
        baseRequest,
        batchesAmount,
        batches,
        extraData = [],
        to
    } = jsonData;

    if (!baseRequest || !batchesAmount || !batches || !to) {
        throw new Error('Missing required parameters for smartSwapByInvest');
    }
    
    return [
        prepareBaseRequestTuple(baseRequest),
        batchesAmount,
        prepareBatchesTuples(batches),
        extraData,
        to
    ];
}

/**
 * Prepare parameters for smartSwapByInvestWithRefund function
 * ABI: (BaseRequest baseRequest, uint256[] batchesAmount, RouterPath[][] batches, ExtraData[] extraData, address to, address refundTo)
 */
export function prepareSmartSwapByInvestWithRefundParams(jsonData) {
    const {
        baseRequest,
        batchesAmount,
        batches,
        extraData = [],
        to,
        refundTo
    } = jsonData;

    if (!baseRequest || !batchesAmount || !batches || !to || !refundTo) {
        throw new Error('Missing required parameters for smartSwapByInvestWithRefund');
    }
    
    return [
        prepareBaseRequestTuple(baseRequest),
        batchesAmount,
        prepareBatchesTuples(batches),
        extraData,
        to,
        refundTo
    ];
}

/**
 * Prepare parameters for uniswapV3SwapTo function
 * ABI: (uint256 receiver, uint256 amount, uint256 minReturn, uint256[] pools)
 */
export function prepareUniswapV3SwapToParams(jsonData) {
    const { receiver, amount, minReturn, pools } = jsonData;
    
    if (!receiver || !amount || !minReturn || !pools) {
        throw new Error('Missing required parameters for uniswapV3SwapTo');
    }
    
    // Pack receiver and pools
    const packedReceiver = packReceiver(receiver);
    const packedPools = pools.map(pool => packUniswapV3Pool(pool));
    
    return [packedReceiver, amount, minReturn, packedPools];
}

/**
 * Prepare parameters for smartSwapTo function
 * ABI: (uint256 orderId, address receiver, BaseRequest baseRequest, uint256[] batchesAmount, RouterPath[][] batches, ExtraData[] extraData)
 */
export function prepareSmartSwapToParams(jsonData) {
    const {
        orderId,
        receiver,
        baseRequest,
        batchesAmount,
        batches,
        extraData = []
    } = jsonData;

    if (!orderId || !receiver || !baseRequest || !batchesAmount || !batches) {
        throw new Error('Missing required parameters for smartSwapTo');
    }

    return [
        orderId,
        receiver, // This is a plain address, not packed
        prepareBaseRequestTuple(baseRequest),
        batchesAmount,
        prepareBatchesTuples(batches),
        extraData
    ];
}

/**
 * Prepare parameters for unxswapByOrderId function
 * ABI: (uint256 srcToken, uint256 amount, uint256 minReturn, bytes32[] pools)
 */
export function prepareUnxswapByOrderIdParams(jsonData) {
    const { srcToken, amount, minReturn, pools } = jsonData;
    
    if (!srcToken || !amount || !minReturn || !pools) {
        throw new Error('Missing required parameters for unxswapByOrderId');
    }
    
    // Pack srcToken and pools
    const packedSrcToken = packSrcToken(srcToken);
    const packedPools = pools.map(pool => packUnxswapPool(pool));
    
    return [packedSrcToken, amount, minReturn, packedPools];
}

/**
 * Prepare parameters for unxswapTo function
 * ABI: (uint256 srcToken, uint256 amount, uint256 minReturn, address receiver, bytes32[] pools)
 */
export function prepareUnxswapToParams(jsonData) {
    const { srcToken, amount, minReturn, receiver, pools } = jsonData;
    
    if (!srcToken || !amount || !minReturn || !receiver || !pools) {
        throw new Error('Missing required parameters for unxswapTo');
    }
    
    // Pack srcToken and pools
    const packedSrcToken = packSrcToken(srcToken);
    const packedPools = pools.map(pool => packUnxswapPool(pool));
    
    return [packedSrcToken, amount, minReturn, receiver, packedPools];
}

/**
 * Prepare parameters for uniswapV3SwapToWithBaseRequest function
 * ABI: (uint256 orderId, address receiver, BaseRequest baseRequest, uint256[] pools)
 */
export function prepareUniswapV3SwapToWithBaseRequestParams(jsonData) {
    const { orderId, receiver, baseRequest, pools } = jsonData;
    
    if (!orderId || !receiver || !baseRequest || !pools) {
        throw new Error('Missing required parameters for uniswapV3SwapToWithBaseRequest');
    }
    
    // Pack pools
    const packedPools = pools.map(pool => packUniswapV3Pool(pool));
    
    return [orderId, receiver, prepareBaseRequestTuple(baseRequest, 'uniswapV3SwapToWithBaseRequest'), packedPools];
}

/**
 * Prepare parameters for unxswapToWithBaseRequest function
 * ABI: (uint256 orderId, address receiver, BaseRequest baseRequest, bytes32[] pools)
 */
export function prepareUnxswapToWithBaseRequestParams(jsonData) {
    const { orderId, receiver, baseRequest, pools } = jsonData;
    
    if (!orderId || !receiver || !baseRequest || !pools) {
        throw new Error('Missing required parameters for unxswapToWithBaseRequest');
    }
    
    // Pack pools
    const packedPools = pools.map(pool => packUnxswapPool(pool));
    
    return [orderId, receiver, prepareBaseRequestTuple(baseRequest, 'unxswapToWithBaseRequest'), packedPools];
}

/**
 * Prepare parameters for swapWrap function
 * ABI: (uint256 orderId, uint256 rawdata)
 */
export function prepareSwapWrapParams(jsonData) {
    const { orderId, rawdata } = jsonData;
    
    if (!orderId || !rawdata) {
        throw new Error('Missing required parameters for swapWrap');
    }
    
    // Pack rawdata
    const packedRawdata = packRawdata(rawdata);
    
    return [orderId, packedRawdata];
}

/**
 * Prepare parameters for swapWrapToWithBaseRequest function
 * ABI: (uint256 orderId, address receiver, BaseRequest baseRequest)
 */
export function prepareSwapWrapToWithBaseRequestParams(jsonData) {
    const { orderId, receiver, baseRequest } = jsonData;
    
    if (!orderId || !receiver || !baseRequest) {
        throw new Error('Missing required parameters for swapWrapToWithBaseRequest');
    }
    
    return [orderId, receiver, prepareBaseRequestTuple(baseRequest)];
}

/**
 * Prepare parameters for dagSwapByOrderId function
 * ABI: (uint256 orderId, BaseRequest baseRequest, RouterPath[] paths)
 */
export function prepareDagSwapByOrderIdParams(jsonData) {
    const { orderId, baseRequest, paths } = jsonData;
    
    if (!orderId || !baseRequest || !paths) {
        throw new Error('Missing required parameters for dagSwapByOrderId');
    }
    
    return [orderId, prepareBaseRequestTuple(baseRequest), prepareDagPathsTuples(paths)];
}

/**
 * Prepare parameters for dagSwapTo function
 * ABI: (uint256 orderId, address receiver, BaseRequest baseRequest, RouterPath[] paths)
 */
export function prepareDagSwapToParams(jsonData) {
    const { orderId, receiver, baseRequest, paths } = jsonData;
    
    if (!orderId || !receiver || !baseRequest || !paths) {
        throw new Error('Missing required parameters for dagSwapTo');
    }
    
    return [orderId, receiver, prepareBaseRequestTuple(baseRequest), prepareDagPathsTuples(paths)];
}

/**
 * Prepare parameters for approve function (ERC20)
 * ABI: (address spender, uint256 amount)
 */
export function prepareApproveParams(jsonData) {
    const { spender, amount } = jsonData;
    
    if (!spender || !amount) {
        throw new Error('Missing required parameters for approve: spender and amount are required');
    }
    
    // Validate spender is a valid address
    if (!/^0x[a-fA-F0-9]{40}$/.test(spender)) {
        throw new Error('Invalid spender address format');
    }
    
    // Convert amount to string to ensure proper handling
    const amountStr = amount.toString();
    
    return [spender, amountStr];
}
