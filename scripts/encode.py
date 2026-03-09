"""
encode.py — Standalone OKX DEX Router encoder.

Integrates encode_functions.py and encode_fee.py into a single file.
Encodes function calldata, then optionally appends commission and/or trim fee data.

Requires: pip install eth-abi "eth-hash[pycryptodome]"

Public API:
  encode_functions(json_data)                              → calldata hex
  add_commission_to_calldata(calldata, commission_data)   → calldata hex
  add_trim_to_calldata(calldata, trim_data)               → calldata hex
  add_fee_to_calldata(calldata, commission_data, trim_data) → calldata hex
  encode(json_data, commission_data, trim_data)           → calldata hex  (all-in-one)

CLI:
  python encode.py <function_json> [commission_json] [trim_json]
"""

try:
    from eth_abi import encode as _abi_encode
    from eth_hash.auto import keccak as _keccak
except ImportError:
    raise ImportError(
        'Missing dependencies. Run: pip install eth-abi "eth-hash[pycryptodome]"'
    )

# ============================================================================
# Masks (from core/masks.js)
# ============================================================================

_ONE_FOR_ZERO_MASK  = 0x8000000000000000000000000000000000000000000000000000000000000000
_WETH_UNWRAP_MASK   = 0x2000000000000000000000000000000000000000000000000000000000000000
_REVERSE_MASK       = 0x8000000000000000000000000000000000000000000000000000000000000000
_IS_TOKEN0_TAX_MASK = 0x1000000000000000000000000000000000000000000000000000000000000000
_IS_TOKEN1_TAX_MASK = 0x2000000000000000000000000000000000000000000000000000000000000000
_WETH_MASK          = 0x4000000000000000000000000000000000000000000000000000000000000000
_SWAP_AMOUNT_MASK   = 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff

_MODE_NO_TRANSFER = 1 << 251
_MODE_BY_INVEST   = 1 << 250
_MODE_PERMIT2     = 1 << 249

# ============================================================================
# Commission constants (from encode_commission.js)
# ============================================================================

_COMMISSION_BYTE_SIZE = {'FLAG': 12, 'RATE': 12, 'ADDRESS': 40, 'BLOCK': 64}
_PADDING = '00' * 10
_ORDINAL_NAMES = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
_MIN_COMMISSION_COUNT = 1
_MAX_COMMISSION_COUNT = 8

# ============================================================================
# Trim constants (from encode_trim.js)
# ============================================================================

_TRIM_FLAGS = {'SINGLE': '777777771111', 'DUAL': '777777772222'}
_IS_TOB_TRIM = {'TOB': '80', 'TOC': '00'}


# ============================================================================
# Shared utilities
# ============================================================================

def _to_int(x) -> int:
    if isinstance(x, int):
        return x
    s = str(x)
    return int(s, 16) if s.startswith(('0x', '0X')) else int(s)


def _to_bytes(x, size: int = None) -> bytes:
    if isinstance(x, bytes):
        b = x
    elif isinstance(x, str):
        h = x.removeprefix('0x')
        if size:
            h = h.zfill(size * 2)
        b = bytes.fromhex(h)
    else:
        b = bytes(x)
    if size and len(b) < size:
        b = b.rjust(size, b'\x00')
    return b


def _normalize_hex(hex_str: str, length: int) -> str:
    return hex_str.removeprefix('0x').lower().zfill(length)


# ============================================================================
# Packers (from encode_packers.js)
# ============================================================================

def pack_src_token(src_token) -> int:
    if isinstance(src_token, (str, int)):
        return _to_int(src_token)
    return (_to_int(src_token['orderId']) << 160) + _to_int(src_token['address'])


def pack_receiver(receiver) -> int:
    if isinstance(receiver, (str, int)):
        return _to_int(receiver)
    packed = _to_int(receiver['address'])
    order_id = receiver.get('orderId')
    if order_id is not None:
        packed |= _to_int(order_id) << 160
    return packed


def pack_rawdata(rawdata) -> int:
    if isinstance(rawdata, (str, int)):
        return _to_int(rawdata)
    packed = _to_int(rawdata['amount']) & _SWAP_AMOUNT_MASK
    if rawdata.get('reversed'):
        packed |= _REVERSE_MASK
    return packed


def pack_uniswap_v3_pool(pool) -> int:
    if isinstance(pool, (str, int)):
        return _to_int(pool)
    packed = _to_int(pool['pool'])
    if pool.get('isOneForZero'):
        packed |= _ONE_FOR_ZERO_MASK
    if pool.get('wethUnwrap'):
        packed |= _WETH_UNWRAP_MASK
    return packed


def pack_unxswap_pool(pool) -> bytes:
    if isinstance(pool, (str, bytes)):
        return _to_bytes(pool, 32)
    packed = _to_int(pool['address'])
    if pool.get('isToken0Tax'):
        packed |= _IS_TOKEN0_TAX_MASK
    if pool.get('isToken1Tax'):
        packed |= _IS_TOKEN1_TAX_MASK
    if pool.get('WETH'):
        packed |= _WETH_MASK
    if pool.get('isOneForZero'):
        packed |= _ONE_FOR_ZERO_MASK
    packed |= (_to_int(pool.get('numerator', 0)) & 0xFFFFFFFF) << 160
    return _to_bytes(hex(packed), 32)


def pack_dag_raw_data(raw_data) -> int:
    if isinstance(raw_data, (str, int)):
        return _to_int(raw_data)
    packed = _to_int(raw_data['poolAddress'])
    if raw_data.get('weight') is not None:
        packed |= (_to_int(raw_data['weight']) & 0xFFFF) << 160
    if raw_data.get('outputIndex') is not None:
        packed |= (_to_int(raw_data['outputIndex']) & 0xFF) << 176
    if raw_data.get('inputIndex') is not None:
        packed |= (_to_int(raw_data['inputIndex']) & 0xFF) << 184
    if raw_data.get('reverse'):
        packed |= _REVERSE_MASK
    return packed


def _pack_raw_data_array(raw_data_array: list) -> list:
    if not isinstance(raw_data_array, list):
        return raw_data_array
    result = []
    for rd in raw_data_array:
        if isinstance(rd, (str, int)):
            result.append(_to_int(rd))
        else:
            packed = _to_int(rd['poolAddress'])
            if rd.get('reverse'):
                packed |= _REVERSE_MASK
            if rd.get('weight') is not None:
                packed |= (_to_int(rd['weight']) & 0xFFFF) << 160
            result.append(packed)
    return result


def _pack_dag_raw_data_array(raw_data_array: list) -> list:
    if not isinstance(raw_data_array, list):
        return raw_data_array
    return [pack_dag_raw_data(rd) for rd in raw_data_array]


# ============================================================================
# Helpers (from encode_helpers.js)
# ============================================================================

def _get_mode_by_name(flag_name: str) -> int:
    return {'NO_TRANSFER': _MODE_NO_TRANSFER, 'BY_INVEST': _MODE_BY_INVEST, 'PERMIT2': _MODE_PERMIT2}.get(flag_name, 0)


def _process_from_token_with_mode(from_token) -> int:
    if isinstance(from_token, dict):
        address = from_token.get('address', 0)
        flag = from_token.get('flag', 0)
        if isinstance(flag, str):
            flag = _get_mode_by_name(flag)
        return _to_int(str(address)) | int(flag)
    return _to_int(str(from_token))


def _prepare_base_request_tuple(base_request: dict, function_name: str = None, order_id=None) -> tuple:
    if not base_request:
        raise ValueError('Missing baseRequest parameter')
    from_token = base_request['fromToken']
    if function_name == 'unxswapToWithBaseRequest' and order_id:
        from_token = (_to_int(str(order_id)) << 160) | _to_int(str(from_token))
    else:
        from_token = _to_int(str(from_token))
    return (
        from_token,
        base_request['toToken'],
        _to_int(str(base_request['fromTokenAmount'])),
        _to_int(str(base_request['minReturnAmount'])),
        _to_int(str(base_request['deadLine'])),
    )


def _prepare_batches_tuples(batches: list) -> list:
    if not isinstance(batches, list):
        raise ValueError('Batches must be an array')
    return [
        [
            (
                list(rp['mixAdapters']),
                list(rp['assetTo']),
                _pack_raw_data_array(rp['rawData']),
                [_to_bytes(ed) for ed in rp.get('extraData', [])],
                _process_from_token_with_mode(rp['fromToken']),
            )
            for rp in batch
        ]
        for batch in batches
    ]


def _prepare_dag_paths_tuples(paths: list) -> list:
    if not isinstance(paths, list):
        raise ValueError('DAG paths must be an array')
    return [
        (
            list(rp['mixAdapters']),
            list(rp['assetTo']),
            _pack_dag_raw_data_array(rp['rawData']),
            [_to_bytes(ed) for ed in rp.get('extraData', [])],
            _process_from_token_with_mode(rp['fromToken']),
        )
        for rp in paths
    ]


# ============================================================================
# Parameter preparation (from encode_parameters.js)
# ============================================================================

def _prep_extra_data(extra_data_list: list) -> list:
    return [
        (
            _to_int(str(ed['fromToken'])),
            ed['toToken'],
            ed['receiver'],
            ed['payer'],
            _to_int(str(ed['fromTokenAmount'])),
            _to_int(str(ed['minReturnAmount'])),
            _to_int(str(ed['deadLine'])),
            _to_int(str(ed['orderId'])),
            bool(ed['isToB']),
            _to_bytes(ed.get('settlerData', '0x')),
        )
        for ed in extra_data_list
    ]


def _prepare_smart_swap_by_order_id_params(d):
    if not all([d.get('orderId'), d.get('baseRequest'), d.get('batchesAmount'), d.get('batches')]):
        raise ValueError('Missing required parameters for smartSwapByOrderId')
    return [_to_int(str(d['orderId'])), _prepare_base_request_tuple(d['baseRequest']), [_to_int(str(x)) for x in d['batchesAmount']], _prepare_batches_tuples(d['batches']), _prep_extra_data(d.get('extraData', []))]


def _prepare_smart_swap_by_invest_params(d):
    if not all([d.get('baseRequest'), d.get('batchesAmount'), d.get('batches'), d.get('to')]):
        raise ValueError('Missing required parameters for smartSwapByInvest')
    return [_prepare_base_request_tuple(d['baseRequest']), [_to_int(str(x)) for x in d['batchesAmount']], _prepare_batches_tuples(d['batches']), _prep_extra_data(d.get('extraData', [])), d['to']]


def _prepare_smart_swap_by_invest_with_refund_params(d):
    if not all([d.get('baseRequest'), d.get('batchesAmount'), d.get('batches'), d.get('to'), d.get('refundTo')]):
        raise ValueError('Missing required parameters for smartSwapByInvestWithRefund')
    return [_prepare_base_request_tuple(d['baseRequest']), [_to_int(str(x)) for x in d['batchesAmount']], _prepare_batches_tuples(d['batches']), _prep_extra_data(d.get('extraData', [])), d['to'], d['refundTo']]


def _prepare_uniswap_v3_swap_to_params(d):
    if not all([d.get('receiver'), d.get('amount'), d.get('minReturn'), d.get('pools')]):
        raise ValueError('Missing required parameters for uniswapV3SwapTo')
    receiver = d['receiver']
    if isinstance(receiver, str):
        receiver_obj = {'orderId': d.get('orderId', '0'), 'address': receiver}
    else:
        receiver_obj = {'orderId': d.get('orderId', receiver.get('orderId', '0')), 'address': receiver['address']}
    return [pack_receiver(receiver_obj), _to_int(str(d['amount'])), _to_int(str(d['minReturn'])), [pack_uniswap_v3_pool(p) for p in d['pools']]]


def _prepare_smart_swap_to_params(d):
    if not all([d.get('orderId'), d.get('receiver'), d.get('baseRequest'), d.get('batchesAmount'), d.get('batches')]):
        raise ValueError('Missing required parameters for smartSwapTo')
    return [_to_int(str(d['orderId'])), d['receiver'], _prepare_base_request_tuple(d['baseRequest']), [_to_int(str(x)) for x in d['batchesAmount']], _prepare_batches_tuples(d['batches']), _prep_extra_data(d.get('extraData', []))]


def _prepare_unxswap_by_order_id_params(d):
    if not all([d.get('srcToken'), d.get('amount'), d.get('minReturn'), d.get('pools')]):
        raise ValueError('Missing required parameters for unxswapByOrderId')
    return [pack_src_token({'orderId': d.get('orderId', '0'), 'address': d['srcToken']}), _to_int(str(d['amount'])), _to_int(str(d['minReturn'])), [pack_unxswap_pool(p) for p in d['pools']]]


def _prepare_unxswap_to_params(d):
    if not all([d.get('srcToken'), d.get('amount'), d.get('minReturn'), d.get('receiver'), d.get('pools')]):
        raise ValueError('Missing required parameters for unxswapTo')
    return [pack_src_token({'orderId': d.get('orderId', '0'), 'address': d['srcToken']}), _to_int(str(d['amount'])), _to_int(str(d['minReturn'])), d['receiver'], [pack_unxswap_pool(p) for p in d['pools']]]


def _prepare_uniswap_v3_swap_to_with_base_request_params(d):
    if not all([d.get('orderId'), d.get('receiver'), d.get('baseRequest'), d.get('pools')]):
        raise ValueError('Missing required parameters for uniswapV3SwapToWithBaseRequest')
    return [_to_int(str(d['orderId'])), d['receiver'], _prepare_base_request_tuple(d['baseRequest'], 'uniswapV3SwapToWithBaseRequest'), [pack_uniswap_v3_pool(p) for p in d['pools']]]


def _prepare_unxswap_to_with_base_request_params(d):
    if not all([d.get('orderId'), d.get('receiver'), d.get('baseRequest'), d.get('pools')]):
        raise ValueError('Missing required parameters for unxswapToWithBaseRequest')
    return [_to_int(str(d['orderId'])), d['receiver'], _prepare_base_request_tuple(d['baseRequest'], 'unxswapToWithBaseRequest', d['orderId']), [pack_unxswap_pool(p) for p in d['pools']]]


def _prepare_swap_wrap_params(d):
    if not all([d.get('orderId'), d.get('rawdata')]):
        raise ValueError('Missing required parameters for swapWrap')
    return [_to_int(str(d['orderId'])), pack_rawdata(d['rawdata'])]


def _prepare_swap_wrap_to_with_base_request_params(d):
    if not all([d.get('orderId'), d.get('receiver'), d.get('baseRequest')]):
        raise ValueError('Missing required parameters for swapWrapToWithBaseRequest')
    return [_to_int(str(d['orderId'])), d['receiver'], _prepare_base_request_tuple(d['baseRequest'])]


def _prepare_dag_swap_by_order_id_params(d):
    if not all([d.get('orderId'), d.get('baseRequest'), d.get('paths')]):
        raise ValueError('Missing required parameters for dagSwapByOrderId')
    return [_to_int(str(d['orderId'])), _prepare_base_request_tuple(d['baseRequest']), _prepare_dag_paths_tuples(d['paths'])]


def _prepare_dag_swap_to_params(d):
    if not all([d.get('orderId'), d.get('receiver'), d.get('baseRequest'), d.get('paths')]):
        raise ValueError('Missing required parameters for dagSwapTo')
    return [_to_int(str(d['orderId'])), d['receiver'], _prepare_base_request_tuple(d['baseRequest']), _prepare_dag_paths_tuples(d['paths'])]


def _prepare_approve_params(d):
    import re
    spender, amount = d.get('spender'), d.get('amount')
    if not all([spender, amount]):
        raise ValueError('Missing required parameters for approve: spender and amount are required')
    if not re.match(r'^0x[a-fA-F0-9]{40}$', spender):
        raise ValueError('Invalid spender address format')
    return [spender, _to_int(str(amount))]


# ============================================================================
# ABI type definitions (from core/abi.js)
# ============================================================================

_BR = '(uint256,address,uint256,uint256,uint256)'
_RP = '(address[],address[],uint256[],bytes[],uint256)'
_ED = '(uint256,address,address,address,uint256,uint256,uint256,uint256,bool,bytes)'

_FUNC_SPECS = {
    'smartSwapByOrderId':             {'sig': f'smartSwapByOrderId(uint256,{_BR},uint256[],{_RP}[][],{_ED}[])',              'types': ['uint256', _BR, 'uint256[]', f'{_RP}[][]', f'{_ED}[]']},
    'smartSwapByInvest':              {'sig': f'smartSwapByInvest({_BR},uint256[],{_RP}[][],{_ED}[],address)',               'types': [_BR, 'uint256[]', f'{_RP}[][]', f'{_ED}[]', 'address']},
    'smartSwapByInvestWithRefund':    {'sig': f'smartSwapByInvestWithRefund({_BR},uint256[],{_RP}[][],{_ED}[],address,address)', 'types': [_BR, 'uint256[]', f'{_RP}[][]', f'{_ED}[]', 'address', 'address']},
    'uniswapV3SwapTo':                {'sig': 'uniswapV3SwapTo(uint256,uint256,uint256,uint256[])',                           'types': ['uint256', 'uint256', 'uint256', 'uint256[]']},
    'smartSwapTo':                    {'sig': f'smartSwapTo(uint256,address,{_BR},uint256[],{_RP}[][],{_ED}[])',              'types': ['uint256', 'address', _BR, 'uint256[]', f'{_RP}[][]', f'{_ED}[]']},
    'unxswapByOrderId':               {'sig': 'unxswapByOrderId(uint256,uint256,uint256,bytes32[])',                          'types': ['uint256', 'uint256', 'uint256', 'bytes32[]']},
    'unxswapTo':                      {'sig': 'unxswapTo(uint256,uint256,uint256,address,bytes32[])',                         'types': ['uint256', 'uint256', 'uint256', 'address', 'bytes32[]']},
    'uniswapV3SwapToWithBaseRequest': {'sig': f'uniswapV3SwapToWithBaseRequest(uint256,address,{_BR},uint256[])',             'types': ['uint256', 'address', _BR, 'uint256[]']},
    'unxswapToWithBaseRequest':       {'sig': f'unxswapToWithBaseRequest(uint256,address,{_BR},bytes32[])',                   'types': ['uint256', 'address', _BR, 'bytes32[]']},
    'swapWrap':                       {'sig': 'swapWrap(uint256,uint256)',                                                    'types': ['uint256', 'uint256']},
    'swapWrapToWithBaseRequest':      {'sig': f'swapWrapToWithBaseRequest(uint256,address,{_BR})',                            'types': ['uint256', 'address', _BR]},
    'dagSwapByOrderId':               {'sig': f'dagSwapByOrderId(uint256,{_BR},{_RP}[])',                                    'types': ['uint256', _BR, f'{_RP}[]']},
    'dagSwapTo':                      {'sig': f'dagSwapTo(uint256,address,{_BR},{_RP}[])',                                   'types': ['uint256', 'address', _BR, f'{_RP}[]']},
    'approve':                        {'sig': 'approve(address,uint256)',                                                     'types': ['address', 'uint256']},
}

_PREPARE_FN = {
    'smartSwapByOrderId':             _prepare_smart_swap_by_order_id_params,
    'smartSwapByInvest':              _prepare_smart_swap_by_invest_params,
    'smartSwapByInvestWithRefund':    _prepare_smart_swap_by_invest_with_refund_params,
    'uniswapV3SwapTo':                _prepare_uniswap_v3_swap_to_params,
    'smartSwapTo':                    _prepare_smart_swap_to_params,
    'unxswapByOrderId':               _prepare_unxswap_by_order_id_params,
    'unxswapTo':                      _prepare_unxswap_to_params,
    'uniswapV3SwapToWithBaseRequest': _prepare_uniswap_v3_swap_to_with_base_request_params,
    'unxswapToWithBaseRequest':       _prepare_unxswap_to_with_base_request_params,
    'swapWrap':                       _prepare_swap_wrap_params,
    'swapWrapToWithBaseRequest':      _prepare_swap_wrap_to_with_base_request_params,
    'dagSwapByOrderId':               _prepare_dag_swap_by_order_id_params,
    'dagSwapTo':                      _prepare_dag_swap_to_params,
    'approve':                        _prepare_approve_params,
}


# ============================================================================
# Commission encoding (from encode_commission.js)
# ============================================================================

def _get_commission_structure(refer_count: int) -> dict:
    if not (_MIN_COMMISSION_COUNT <= refer_count <= _MAX_COMMISSION_COUNT):
        raise ValueError(f'Invalid referCount: {refer_count}. Must be between {_MIN_COMMISSION_COUNT} and {_MAX_COMMISSION_COUNT}')
    if refer_count == 1:
        return {'blocks': ['middle', 'first'], 'name': 'SINGLE'}
    elif refer_count == 2:
        return {'blocks': ['first', 'middle', 'last'], 'name': 'DUAL'}
    else:
        blocks = [_ORDINAL_NAMES[i] for i in range(refer_count - 1)]
        blocks.append('middle')
        blocks.append(_ORDINAL_NAMES[refer_count - 1])
        return {'blocks': blocks, 'name': 'MULTIPLE'}


def _encode_commission_block(commission: dict) -> str:
    if not commission.get('flag') or commission.get('rate') is None or not commission.get('address'):
        raise ValueError('Commission block missing required fields: flag, rate, address')
    flag = _normalize_hex(commission['flag'], _COMMISSION_BYTE_SIZE['FLAG'])
    rate = _normalize_hex(hex(int(str(commission['rate']), 0 if str(commission['rate']).startswith('0x') else 10)), _COMMISSION_BYTE_SIZE['RATE'])
    address = _normalize_hex(commission['address'], _COMMISSION_BYTE_SIZE['ADDRESS'])
    return flag + rate + address


def _encode_middle_block(middle: dict, refer_count: int) -> str:
    if not middle.get('token'):
        raise ValueError('Middle block missing required field: token')
    is_to_b_hex = '80' if middle.get('isToB', middle.get('toB', False)) else '00'
    referrer_num_hex = format(refer_count, '02x') if 3 <= refer_count <= 8 else '00'
    token = _normalize_hex(middle['token'], _COMMISSION_BYTE_SIZE['ADDRESS'])
    return is_to_b_hex + referrer_num_hex + _PADDING + token


def _validate_commission_block(commission: dict) -> None:
    flag, address = commission.get('flag', ''), commission.get('address', '')
    if not flag or commission.get('rate') is None or not address:
        raise ValueError(f'Commission blocks must have flag, rate, and address. Missing in: {commission}')
    if not flag.startswith('0x') or len(flag) != 14:
        raise ValueError(f'Invalid flag format: {flag}')
    if not address.startswith('0x') or len(address) != 42:
        raise ValueError(f'Invalid address format: {address}')


def validate_commission_data(commission_data: dict) -> bool:
    if not isinstance(commission_data, dict):
        raise ValueError('Commission data must be an object')
    refer_count = commission_data.get('referCount')
    if not refer_count or not (_MIN_COMMISSION_COUNT <= refer_count <= _MAX_COMMISSION_COUNT):
        raise ValueError(f'Commission data must have referCount between {_MIN_COMMISSION_COUNT} and {_MAX_COMMISSION_COUNT}, got: {refer_count}')
    if not commission_data.get('middle') or not commission_data.get('first'):
        raise ValueError('Commission data must have middle and first properties')
    if not commission_data['middle'].get('token'):
        raise ValueError('Middle block must have token property')
    structure = _get_commission_structure(refer_count)
    for block_type in structure['blocks']:
        if block_type == 'middle':
            continue
        if not commission_data.get(block_type):
            raise ValueError(f'Commission data with referCount {refer_count} must have {block_type} property')
        _validate_commission_block(commission_data[block_type])
    return True


def add_commission_to_calldata(calldata: str, commission_data: dict) -> str:
    """Append commission encoding to calldata."""
    try:
        validate_commission_data(commission_data)
        calldata_hex = calldata.removeprefix('0x')
        structure = _get_commission_structure(commission_data['referCount'])
        encoded_blocks = []
        for block_type in structure['blocks']:
            if block_type == 'middle':
                encoded_blocks.append(_encode_middle_block(commission_data['middle'], commission_data['referCount']))
            else:
                encoded_blocks.append(_encode_commission_block(commission_data[block_type]))
        return '0x' + calldata_hex + ''.join(encoded_blocks)
    except Exception as e:
        raise ValueError(f'Failed to encode commission data: {e}')


# ============================================================================
# Trim encoding (from encode_trim.js)
# ============================================================================

def _encode_trim_block(rate, address: str, flag: str) -> str:
    if rate is None or not address or not flag:
        raise ValueError('Trim block missing required fields: rate, address, flag')
    return _normalize_hex(flag, 12) + _normalize_hex(hex(int(str(rate))), 12) + _normalize_hex(address, 40)


def _encode_expect_amount_block(expect_amount, flag: str, has_trim: str) -> str:
    if expect_amount is None or not flag:
        raise ValueError('Expect amount block missing required fields: expectAmount, flag')
    is_to_b_hex = _IS_TOB_TRIM['TOB'] if has_trim == 'toB' else _IS_TOB_TRIM['TOC']
    return _normalize_hex(flag, 12) + is_to_b_hex + '00' * 5 + _normalize_hex(hex(int(str(expect_amount))), 40)


def _is_valid_charge_rate(r) -> bool:
    return r is not None and r not in (0, '0')


def _is_valid_charge_address(a) -> bool:
    return a is not None and a not in ('0x0000000000000000000000000000000000000000', '0x', '')


def validate_trim_data(trim_data: dict) -> bool:
    if not isinstance(trim_data, dict):
        raise ValueError('Trim data must be an object')
    if not trim_data.get('trimRate') or not trim_data.get('trimAddress') or not trim_data.get('expectAmountOut'):
        raise ValueError('Trim data must have trimRate, trimAddress, and expectAmountOut properties')
    has_trim = trim_data.get('hasTrim')
    if has_trim is not None and has_trim not in ('toB', 'toC', True, False):
        raise ValueError('hasTrim must be "toB", "toC", true, or false')
    charge_rate = trim_data.get('trimRate2') or trim_data.get('chargeRate')
    charge_address = trim_data.get('trimAddress2') or trim_data.get('chargeAddress')
    is_dual = _is_valid_charge_rate(charge_rate) and _is_valid_charge_address(charge_address)
    if (charge_rate is not None or charge_address is not None) and not is_dual:
        if (charge_rate is not None) != (charge_address is not None):
            raise ValueError('For dual trim, both chargeRate/trimRate2 and chargeAddress/trimAddress2 must be provided')
    if not trim_data['trimAddress'].startswith('0x') or len(trim_data['trimAddress']) != 42:
        raise ValueError(f'Invalid trimAddress format: {trim_data["trimAddress"]}')
    if is_dual and (not charge_address.startswith('0x') or len(charge_address) != 42):
        raise ValueError(f'Invalid chargeAddress/trimAddress2 format: {charge_address}')
    return True


def add_trim_to_calldata(calldata: str, trim_data: dict) -> str:
    """Append trim encoding to calldata."""
    try:
        calldata_hex = calldata.removeprefix('0x')
        if not (trim_data.get('trimRate') and trim_data.get('trimAddress') and trim_data.get('expectAmountOut')):
            raise ValueError('Trim data missing required fields: trimRate, trimAddress, expectAmountOut')
        charge_rate = trim_data.get('trimRate2') or trim_data.get('chargeRate')
        charge_address = trim_data.get('trimAddress2') or trim_data.get('chargeAddress')
        is_dual = _is_valid_charge_rate(charge_rate) and _is_valid_charge_address(charge_address)
        has_trim = trim_data.get('hasTrim') if trim_data.get('hasTrim') in ('toB', 'toC') else 'toC'
        if is_dual:
            calldata_hex += (
                _encode_trim_block(charge_rate, charge_address, '0x' + _TRIM_FLAGS['DUAL']) +
                _encode_expect_amount_block(trim_data['expectAmountOut'], '0x' + _TRIM_FLAGS['DUAL'], has_trim) +
                _encode_trim_block(trim_data['trimRate'], trim_data['trimAddress'], '0x' + _TRIM_FLAGS['DUAL'])
            )
        else:
            calldata_hex += (
                _encode_expect_amount_block(trim_data['expectAmountOut'], '0x' + _TRIM_FLAGS['SINGLE'], has_trim) +
                _encode_trim_block(trim_data['trimRate'], trim_data['trimAddress'], '0x' + _TRIM_FLAGS['SINGLE'])
            )
        return '0x' + calldata_hex
    except Exception as e:
        raise ValueError(f'Failed to encode trim data: {e}')


def add_fee_to_calldata(calldata: str, commission_data: dict = None, trim_data: dict = None) -> str:
    """Append commission and/or trim encoding to calldata."""
    result = calldata
    if commission_data:
        result = add_commission_to_calldata(result, commission_data)
    if trim_data:
        result = add_trim_to_calldata(result, trim_data)
    return result


# ============================================================================
# Main encode function
# ============================================================================

def encode_functions(json_data: dict) -> str:
    """Encode a DEX Router function call to calldata (selector + ABI-encoded params)."""
    if not json_data or not json_data.get('function'):
        raise ValueError('Invalid input: missing function information')
    func_info = json_data['function']
    func_name = func_info.get('name')
    func_selector = func_info.get('selector')
    if not func_name or not func_selector:
        raise ValueError('Invalid function information: missing name or selector')
    if func_name not in _FUNC_SPECS:
        raise ValueError(f'Unsupported function: {func_name}')
    spec = _FUNC_SPECS[func_name]
    params = _PREPARE_FN[func_name](json_data)
    encoded_params = _abi_encode(spec['types'], params)
    return '0x' + _to_bytes(func_selector, 4).hex() + encoded_params.hex()


def encode(json_data: dict, commission_data: dict = None, trim_data: dict = None) -> str:
    """
    All-in-one encoder: encodes the function call then appends commission and/or trim.

    Args:
        json_data:        Function JSON (must include 'function.name' and 'function.selector').
        commission_data:  Commission dict, or None to skip.
        trim_data:        Trim dict, or None to skip.

    Returns:
        0x-prefixed calldata hex string.
    """
    calldata = encode_functions(json_data)
    return add_fee_to_calldata(calldata, commission_data, trim_data)


# ============================================================================
# CLI entry point
# ============================================================================

if __name__ == '__main__':
    import sys
    import json

    def _load(s: str):
        try:
            with open(s) as f:
                return json.load(f)
        except (FileNotFoundError, IsADirectoryError):
            return json.loads(s)

    def _usage():
        print(
            'Usage: python encode.py <function_json> [commission_json] [trim_json]\n'
            '\n'
            '  function_json    — file path or inline JSON with function + params\n'
            '  commission_json  — (optional) file path or inline JSON for commission\n'
            '  trim_json        — (optional) file path or inline JSON for trim',
            file=sys.stderr,
        )
        sys.exit(1)

    if len(sys.argv) < 2:
        _usage()

    func_data       = _load(sys.argv[1])
    commission_data = _load(sys.argv[2]) if len(sys.argv) > 2 else None
    trim_data       = _load(sys.argv[3]) if len(sys.argv) > 3 else None

    print(encode(func_data, commission_data, trim_data))
