const DEXROUTER_ABI = [
    "function smartSwapByOrderId(uint256 orderId, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, uint256[] batchesAmount, tuple(address[] mixAdapters, address[] assetTo, uint256[] rawData, bytes[] extraData, uint256 fromToken)[][] batches, tuple(uint256 fromToken, address toToken, address receiver, address payer, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine, uint256 orderId, bool isToB, bytes settlerData)[] extraData) external payable returns (uint256 returnAmount)",
    "function unxswapByOrderId(uint256 srcToken, uint256 amount, uint256 minReturn, bytes32[] pools) external payable returns (uint256 returnAmount)",
    "function smartSwapByInvest(tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, uint256[] batchesAmount, tuple(address[] mixAdapters, address[] assetTo, uint256[] rawData, bytes[] extraData, uint256 fromToken)[][] batches, tuple(uint256 fromToken, address toToken, address receiver, address payer, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine, uint256 orderId, bool isToB, bytes settlerData)[] extraData, address to) external payable returns (uint256 returnAmount)",
    "function smartSwapByInvestWithRefund(tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, uint256[] batchesAmount, tuple(address[] mixAdapters, address[] assetTo, uint256[] rawData, bytes[] extraData, uint256 fromToken)[][] batches, tuple(uint256 fromToken, address toToken, address receiver, address payer, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine, uint256 orderId, bool isToB, bytes settlerData)[] extraData, address to, address refundTo) public payable returns (uint256 returnAmount)",
    "function uniswapV3SwapTo(uint256 receiver, uint256 amount, uint256 minReturn, uint256[] pools) external payable returns (uint256 returnAmount)",
    "function smartSwapTo(uint256 orderId, address receiver, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, uint256[] batchesAmount, tuple(address[] mixAdapters, address[] assetTo, uint256[] rawData, bytes[] extraData, uint256 fromToken)[][] batches, tuple(uint256 fromToken, address toToken, address receiver, address payer, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine, uint256 orderId, bool isToB, bytes settlerData)[] extraData) external payable returns (uint256 returnAmount)",
    "function unxswapTo(uint256 srcToken, uint256 amount, uint256 minReturn, address receiver, bytes32[] pools) public payable returns (uint256 returnAmount)",
    "function uniswapV3SwapToWithBaseRequest(uint256 orderId, address receiver, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, uint256[] pools) external payable returns (uint256 returnAmount)",
    "function unxswapToWithBaseRequest(uint256 orderId, address receiver, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, bytes32[] pools) external payable returns (uint256 returnAmount)",
    "function swapWrap(uint256 orderId, uint256 rawdata) external payable",
    "function swapWrapToWithBaseRequest(uint256 orderId, address receiver, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest) external payable",
    "function dagSwapByOrderId(uint256 orderId, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, tuple(address[] mixAdapters, address[] assetTo, uint256[] rawData, bytes[] extraData, uint256 fromToken)[] paths) external payable returns (uint256 returnAmount)",
    "function dagSwapTo(uint256 orderId, address receiver, tuple(uint256 fromToken, address toToken, uint256 fromTokenAmount, uint256 minReturnAmount, uint256 deadLine) baseRequest, tuple(address[] mixAdapters, address[] assetTo, uint256[] rawData, bytes[] extraData, uint256 fromToken)[] paths) external payable returns (uint256 returnAmount)",
];

// Auto-generated function selectors
const FUNCTION_SELECTORS = {
    SMARTSWAPBYORDERID: "0xb80c2f09",
    UNXSWAPBYORDERID: "0x9871efa4",
    SMARTSWAPBYINVEST: "0xe99bfa95",
    SMARTSWAPBYINVESTWITHREFUND: "0x591b3d08",
    UNISWAPV3SWAPTO: "0x0d5f0e3b",
    SMARTSWAPTO: "0x03b87e5f",
    UNXSWAPTO: "0x08298b5a",
    UNISWAPV3SWAPTOWITHBASEREQUEST: "0x44014e98",
    UNXSWAPTOWITHBASEREQUEST: "0xb8815477",
    SWAPWRAP: "0x01617fab",
    SWAPWRAPTOWITHBASEREQUEST: "0x98d2ac62",
    DAGSWAPBYORDERID: "0xf2c42696",
    DAGSWAPTO: "0x0c307f76"
};

const SELECTOR_TO_FUNCTION = {
    "0xb80c2f09": "smartSwapByOrderId",
    "0x9871efa4": "unxswapByOrderId",
    "0xe99bfa95": "smartSwapByInvest",
    "0x591b3d08": "smartSwapByInvestWithRefund",
    "0x0d5f0e3b": "uniswapV3SwapTo",
    "0x03b87e5f": "smartSwapTo",
    "0x08298b5a": "unxswapTo",
    "0x44014e98": "uniswapV3SwapToWithBaseRequest",
    "0xb8815477": "unxswapToWithBaseRequest",
    "0x01617fab": "swapWrap",
    "0x98d2ac62": "swapWrapToWithBaseRequest",
    "0xf2c42696": "dagSwapByOrderId",
    "0x0c307f76": "dagSwapTo"
};

export {
    DEXROUTER_ABI,
    FUNCTION_SELECTORS,
    SELECTOR_TO_FUNCTION
};
