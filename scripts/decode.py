"""
decode.py — Decodes OKX DEX Router calldata.
Integrates decode_functions.py and decode_fee.py into a single script.

Usage:
    python decode.py <calldata_hex>

Requires: pip install eth-abi eth-utils "eth-hash[pycryptodome]"
"""

import sys
import json
from eth_abi import decode as abi_decode
from eth_utils import keccak
from eth_utils import to_checksum_address as _eth_checksum

# ============================================================================
# Masks (core/masks.js)
# ============================================================================

ADDRESS_MASK          = 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff
ONE_FOR_ZERO_MASK     = 0x8000000000000000000000000000000000000000000000000000000000000000
WETH_UNWRAP_MASK      = 0x2000000000000000000000000000000000000000000000000000000000000000
ORDER_ID_MASK         = 0x1fffffffffffffffffffffff0000000000000000000000000000000000000000
WEIGHT_MASK           = 0x00000000000000000000ffff0000000000000000000000000000000000000000
REVERSE_MASK          = 0x8000000000000000000000000000000000000000000000000000000000000000
IS_TOKEN0_TAX_MASK    = 0x1000000000000000000000000000000000000000000000000000000000000000
IS_TOKEN1_TAX_MASK    = 0x2000000000000000000000000000000000000000000000000000000000000000
WETH_MASK             = 0x4000000000000000000000000000000000000000000000000000000000000000
NUMERATOR_MASK        = 0x0000000000000000ffffffff0000000000000000000000000000000000000000
SWAP_AMOUNT_MASK      = 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
DAG_INPUT_INDEX_MASK  = 0x0000000000000000ff0000000000000000000000000000000000000000000000
DAG_OUTPUT_INDEX_MASK = 0x000000000000000000ff00000000000000000000000000000000000000000000
MODE_NO_TRANSFER_MASK = 0x0800000000000000000000000000000000000000000000000000000000000000
MODE_BY_INVEST_MASK   = 0x0400000000000000000000000000000000000000000000000000000000000000
MODE_PERMIT2_MASK     = 0x0200000000000000000000000000000000000000000000000000000000000000

# ============================================================================
# ABI Definitions (core/abi.js)
# ============================================================================

_BR = [  # BaseRequest components
    {'type': 'uint256', 'name': 'fromToken'},
    {'type': 'address',  'name': 'toToken'},
    {'type': 'uint256', 'name': 'fromTokenAmount'},
    {'type': 'uint256', 'name': 'minReturnAmount'},
    {'type': 'uint256', 'name': 'deadLine'},
]
_RP = [  # RouterPath components
    {'type': 'address[]', 'name': 'mixAdapters'},
    {'type': 'address[]', 'name': 'assetTo'},
    {'type': 'uint256[]', 'name': 'rawData'},
    {'type': 'bytes[]',   'name': 'extraData'},
    {'type': 'uint256',   'name': 'fromToken'},
]
_ST = [  # Settler (extraData) components
    {'type': 'uint256', 'name': 'fromToken'},
    {'type': 'address',  'name': 'toToken'},
    {'type': 'address',  'name': 'receiver'},
    {'type': 'address',  'name': 'payer'},
    {'type': 'uint256', 'name': 'fromTokenAmount'},
    {'type': 'uint256', 'name': 'minReturnAmount'},
    {'type': 'uint256', 'name': 'deadLine'},
    {'type': 'uint256', 'name': 'orderId'},
    {'type': 'bool',    'name': 'isToB'},
    {'type': 'bytes',   'name': 'settlerData'},
]

def _p(name, typ, components=None):
    d = {'name': name, 'type': typ}
    if components is not None:
        d['components'] = components
    return d

_ABI = [
    {'name': 'smartSwapByOrderId', 'inputs': [
        _p('orderId', 'uint256'),
        _p('baseRequest', 'tuple', _BR),
        _p('batchesAmount', 'uint256[]'),
        _p('batches', 'tuple[][]', _RP),
        _p('extraData', 'tuple[]', _ST),
    ]},
    {'name': 'unxswapByOrderId', 'inputs': [
        _p('srcToken', 'uint256'),
        _p('amount', 'uint256'),
        _p('minReturn', 'uint256'),
        _p('pools', 'bytes32[]'),
    ]},
    {'name': 'smartSwapByInvest', 'inputs': [
        _p('baseRequest', 'tuple', _BR),
        _p('batchesAmount', 'uint256[]'),
        _p('batches', 'tuple[][]', _RP),
        _p('extraData', 'tuple[]', _ST),
        _p('to', 'address'),
    ]},
    {'name': 'smartSwapByInvestWithRefund', 'inputs': [
        _p('baseRequest', 'tuple', _BR),
        _p('batchesAmount', 'uint256[]'),
        _p('batches', 'tuple[][]', _RP),
        _p('extraData', 'tuple[]', _ST),
        _p('to', 'address'),
        _p('refundTo', 'address'),
    ]},
    {'name': 'uniswapV3SwapTo', 'inputs': [
        _p('receiver', 'uint256'),
        _p('amount', 'uint256'),
        _p('minReturn', 'uint256'),
        _p('pools', 'uint256[]'),
    ]},
    {'name': 'smartSwapTo', 'inputs': [
        _p('orderId', 'uint256'),
        _p('receiver', 'address'),
        _p('baseRequest', 'tuple', _BR),
        _p('batchesAmount', 'uint256[]'),
        _p('batches', 'tuple[][]', _RP),
        _p('extraData', 'tuple[]', _ST),
    ]},
    {'name': 'unxswapTo', 'inputs': [
        _p('srcToken', 'uint256'),
        _p('amount', 'uint256'),
        _p('minReturn', 'uint256'),
        _p('receiver', 'address'),
        _p('pools', 'bytes32[]'),
    ]},
    {'name': 'uniswapV3SwapToWithBaseRequest', 'inputs': [
        _p('orderId', 'uint256'),
        _p('receiver', 'address'),
        _p('baseRequest', 'tuple', _BR),
        _p('pools', 'uint256[]'),
    ]},
    {'name': 'unxswapToWithBaseRequest', 'inputs': [
        _p('orderId', 'uint256'),
        _p('receiver', 'address'),
        _p('baseRequest', 'tuple', _BR),
        _p('pools', 'bytes32[]'),
    ]},
    {'name': 'swapWrap', 'inputs': [
        _p('orderId', 'uint256'),
        _p('rawdata', 'uint256'),
    ]},
    {'name': 'swapWrapToWithBaseRequest', 'inputs': [
        _p('orderId', 'uint256'),
        _p('receiver', 'address'),
        _p('baseRequest', 'tuple', _BR),
    ]},
    {'name': 'dagSwapByOrderId', 'inputs': [
        _p('orderId', 'uint256'),
        _p('baseRequest', 'tuple', _BR),
        _p('paths', 'tuple[]', _RP),
    ]},
    {'name': 'dagSwapTo', 'inputs': [
        _p('orderId', 'uint256'),
        _p('receiver', 'address'),
        _p('baseRequest', 'tuple', _BR),
        _p('paths', 'tuple[]', _RP),
    ]},
    {'name': 'approve', 'inputs': [
        _p('spender', 'address'),
        _p('amount', 'uint256'),
    ]},
]

# ============================================================================
# Selector computation
# ============================================================================

def _canonical_type_str(typ: str, components=None) -> str:
    if 'tuple' in typ:
        suffix = typ[len('tuple'):]
        inner = ','.join(_canonical_type_str(c['type'], c.get('components')) for c in components)
        return f'({inner}){suffix}'
    return typ

def _compute_selector(func_def: dict) -> str:
    parts = [_canonical_type_str(inp['type'], inp.get('components')) for inp in func_def['inputs']]
    sig = f"{func_def['name']}({','.join(parts)})"
    return '0x' + keccak(text=sig).hex()[:8]

_SELECTOR_MAP: dict = {}
for _fn in _ABI:
    _SELECTOR_MAP[_compute_selector(_fn)] = _fn

# ============================================================================
# Low-level helpers (formatters/formatters.js)
# ============================================================================

def to_checksum_address(raw_hex: str) -> str:
    try:
        return _eth_checksum(raw_hex)
    except Exception:
        return raw_hex

def _to_int(value) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, bytes):
        return int.from_bytes(value, 'big')
    if isinstance(value, str):
        return int(value, 16) if value.startswith('0x') else int(value)
    return int(value)

def get_value(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return str(value)
    if isinstance(value, bytes):
        return '0x' + value.hex()
    if isinstance(value, str):
        if value.startswith('0x') and len(value) == 42:
            return to_checksum_address(value)
        return value
    if isinstance(value, (list, tuple)):
        return [get_value(item) for item in value]
    return value

def bytes32_to_address(param) -> str:
    if param is None:
        return '0x' + '0' * 40
    try:
        addr = _to_int(param) & ADDRESS_MASK
        return to_checksum_address('0x' + format(addr, '040x'))
    except Exception:
        return '0x' + '0' * 40

# ============================================================================
# Type checkers (core/type_checkers.js)
# ============================================================================

def is_base_request_tuple(inp: dict, value) -> bool:
    if inp.get('type') != 'tuple':
        return False
    comps = inp.get('components', [])
    return (len(comps) == 5 and
            [c['type'] for c in comps] == ['uint256', 'address', 'uint256', 'uint256', 'uint256'] and
            isinstance(value, (list, tuple)) and len(value) == 5)

def is_router_path_array(inp: dict, value) -> bool:
    if inp.get('type') not in ('tuple[][]', 'tuple[]'):
        return False
    comps = inp.get('components', [])
    return (len(comps) == 5 and
            [c['type'] for c in comps] == ['address[]', 'address[]', 'uint256[]', 'bytes[]', 'uint256'] and
            isinstance(value, (list, tuple)))

def is_router_path_tuple(item) -> bool:
    return isinstance(item, (list, tuple)) and len(item) == 5

def is_packed_receiver(inp: dict, param_name: str) -> bool:
    return inp.get('type') == 'uint256' and param_name == 'receiver'

def is_pools_array(inp: dict, param_name: str) -> bool:
    return inp.get('type') in ('uint256[]', 'bytes32[]') and param_name == 'pools'

def is_packed_src_token(inp: dict, param_name: str) -> bool:
    return inp.get('type') == 'uint256' and param_name == 'srcToken'

def is_swap_wrap_rawdata(inp: dict, param_name: str) -> bool:
    return inp.get('type') == 'uint256' and param_name == 'rawdata'

def is_from_token_with_mode(inp: dict, param_name: str, function_name: str) -> bool:
    if inp.get('type') != 'uint256' or param_name != 'fromToken':
        return False
    return bool(function_name) and (
        function_name.startswith('dagSwap') or
        function_name.startswith('smartSwap') or
        function_name in ('smartSwapByInvest', 'smartSwapByInvestWithRefund')
    )

# ============================================================================
# Formatters (formatters/formatters.js)
# ============================================================================

def format_base_request(arr, function_name=None) -> dict:
    from_token, to_token, from_token_amount, min_return_amount, dead_line = arr
    return {
        'fromToken': bytes32_to_address(from_token),
        'toToken': get_value(to_token),
        'fromTokenAmount': get_value(from_token_amount),
        'minReturnAmount': get_value(min_return_amount),
        'deadLine': get_value(dead_line),
    }

def format_router_path_array(arr, function_name=None):
    is_dag = function_name and function_name.startswith('dagSwap')
    if is_dag:
        return [format_router_path(rp, function_name) if is_router_path_tuple(rp) else get_value(rp) for rp in arr]
    return [[format_router_path(rp, function_name) if is_router_path_tuple(rp) else get_value(rp) for rp in batch] for batch in arr]

def format_router_path(arr, function_name=None) -> dict:
    mix_adapters, asset_to, raw_data, extra_data, from_token = arr
    supports_mode = function_name and (
        function_name.startswith('dagSwap') or
        function_name.startswith('smartSwap') or
        function_name in ('smartSwapByInvest', 'smartSwapByInvestWithRefund')
    )
    return {
        'mixAdapters': get_value(mix_adapters),
        'assetTo': get_value(asset_to),
        'rawData': _decode_raw_data_array(raw_data, function_name),
        'extraData': get_value(extra_data),
        'fromToken': unpack_from_token_with_mode(from_token) if supports_mode else get_value(from_token),
    }

def _decode_raw_data_array(arr, function_name=None):
    if not isinstance(arr, (list, tuple)):
        return get_value(arr)
    is_dag = function_name and function_name.startswith('dagSwap')
    return [unpack_dag_raw_data(item) if is_dag else unpack_raw_data(item) for item in arr]

def unpack_raw_data(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'poolAddress': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
            'reverse': bool(n & REVERSE_MASK),
            'weight': str((n & WEIGHT_MASK) >> 160),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack rawData: {e}'}

def unpack_dag_raw_data(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'poolAddress': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
            'reverse': bool(n & REVERSE_MASK),
            'weight': str((n & WEIGHT_MASK) >> 160),
            'inputIndex': str((n & DAG_INPUT_INDEX_MASK) >> 184),
            'outputIndex': str((n & DAG_OUTPUT_INDEX_MASK) >> 176),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack DAG rawData: {e}'}

def unpack_receiver(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'orderId': str((n & ORDER_ID_MASK) >> 160),
            'address': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack receiver: {e}'}

def unpack_pools_array(arr, function_name: str) -> list:
    if not isinstance(arr, (list, tuple)) or len(arr) == 0:
        return get_value(arr)
    is_unxswap = function_name and function_name.startswith('unxswap')
    return [unpack_unxswap_pool(pool) if is_unxswap else unpack_uniswap_v3_pool(pool) for pool in arr]

def unpack_unxswap_pool(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'isToken0Tax': bool(n & IS_TOKEN0_TAX_MASK),
            'isToken1Tax': bool(n & IS_TOKEN1_TAX_MASK),
            'WETH': bool(n & WETH_MASK),
            'isOneForZero': bool(n & ONE_FOR_ZERO_MASK),
            'numerator': str((n & NUMERATOR_MASK) >> 160),
            'address': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack unxswap pool: {e}'}

def unpack_uniswap_v3_pool(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'isOneForZero': bool(n & ONE_FOR_ZERO_MASK),
            'wethUnwrap': bool(n & WETH_UNWRAP_MASK),
            'pool': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack uniswapV3 pool: {e}'}

def unpack_src_token(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'orderId': str(n >> 160),
            'address': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack srcToken: {e}'}

def unpack_swap_rawdata(v) -> dict:
    try:
        n = _to_int(v)
        return {
            'reversed': bool(n & REVERSE_MASK),
            'amount': str(n & SWAP_AMOUNT_MASK),
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack swapWrap rawdata: {e}'}

def unpack_from_token_with_mode(v) -> dict:
    try:
        n = _to_int(v)
        if n & MODE_NO_TRANSFER_MASK:
            flag = 'NO_TRANSFER'
        elif n & MODE_BY_INVEST_MASK:
            flag = 'BY_INVEST'
        elif n & MODE_PERMIT2_MASK:
            flag = 'PERMIT2'
        else:
            flag = 'DEFAULT'
        return {
            'address': to_checksum_address('0x' + format(n & ADDRESS_MASK, '040x')),
            'flag': flag,
        }
    except Exception as e:
        return {'original': get_value(v), 'error': f'Failed to unpack fromToken with mode: {e}'}

# ============================================================================
# decode_functions logic (decode_functions.js)
# ============================================================================

def _create_named_parameters(inputs: list, decoded_params: tuple, function_name: str) -> dict:
    named = {}
    for i, inp in enumerate(inputs):
        param_name = inp.get('name') or f'param{i}'
        value = get_value(decoded_params[i])

        if is_base_request_tuple(inp, value):
            value = format_base_request(value, function_name)
        elif is_router_path_array(inp, value):
            value = format_router_path_array(value, function_name)
        elif is_packed_receiver(inp, param_name):
            value = unpack_receiver(value)
        elif is_pools_array(inp, param_name):
            value = unpack_pools_array(value, function_name)
        elif is_packed_src_token(inp, param_name):
            value = unpack_src_token(value)
        elif is_swap_wrap_rawdata(inp, param_name):
            value = unpack_swap_rawdata(value)
        elif is_from_token_with_mode(inp, param_name, function_name):
            value = unpack_from_token_with_mode(value)

        named[param_name] = value
    return named

def decode_functions(calldata: str) -> dict:
    try:
        if not calldata or not isinstance(calldata, str):
            return {'error': 'Invalid calldata input'}
        if not calldata.startswith('0x'):
            calldata = '0x' + calldata
        if len(calldata) < 10:
            return {'error': 'calldata length is too short'}

        selector = calldata[:10].lower()
        func_def = _SELECTOR_MAP.get(selector)
        if not func_def:
            return {'error': f'Unknown function selector: {selector}', 'selector': selector}

        eth_types = [_canonical_type_str(inp['type'], inp.get('components')) for inp in func_def['inputs']]
        decoded = abi_decode(eth_types, bytes.fromhex(calldata[2:])[4:])
        named = _create_named_parameters(func_def['inputs'], decoded, func_def['name'])

        return {'function': {'name': func_def['name'], 'selector': selector}, **named}

    except Exception as e:
        return {'error': f'Decoding failed: {e}', 'originalError': str(e)}

# ============================================================================
# Commission constants + helpers (decode_fee.py / decode_commission.py)
# ============================================================================

_CBYTE = {'FLAG': 12, 'RATE': 12, 'ADDRESS': 40, 'BLOCK': 64}
_FLAG_PREFIXES = {'SINGLE': '0x3ca2', 'DUAL': '0x2222', 'MULTIPLE': '0x8888'}
_VALID_FLAGS = [
    '0x3ca20afc2aaa', '0x3ca20afc2bbb',
    '0x22220afc2aaa', '0x22220afc2bbb',
    '0x88880afc2aaa', '0x88880afc2bbb',
]
_MIN_REFERRERS = 3
_MAX_REFERRERS = 8
_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']

def _commission_type(flag: str) -> str:
    f = flag.lower()
    for kind, prefix in _FLAG_PREFIXES.items():
        if f.startswith(prefix):
            amount = kind
            break
    else:
        amount = 'UNKNOWN'
    token = 'FROM_TOKEN_COMMISSION' if f.endswith('aaa') else 'TO_TOKEN_COMMISSION'
    return f'{amount}_{token}'

def _parse_commission(hex32: str) -> dict:
    h = hex32.lower().removeprefix('0x')
    flag = '0x' + h[:_CBYTE['FLAG']]
    if not any(f.lower() == flag for f in _VALID_FLAGS):
        raise ValueError(f'Invalid commission flag: {flag}')
    rate = int(h[_CBYTE['FLAG']:_CBYTE['FLAG'] + _CBYTE['RATE']], 16)
    a = _CBYTE['FLAG'] + _CBYTE['RATE']
    return {'flag': flag, 'commissionType': _commission_type(flag), 'rate': str(rate), 'address': '0x' + h[a:a + _CBYTE['ADDRESS']]}

def _parse_middle(hex32: str) -> dict:
    h = hex32.lower().removeprefix('0x')
    return {'isToB': h[:2] == '80', 'token': '0x' + h[24:]}

def _parse_referrer_num(hex32: str) -> int:
    return int(hex32.lower().removeprefix('0x')[2:4], 16)

def _extract_blocks(calldata_hex: str, flag_hex: str, count: int):
    idx = calldata_hex.find(flag_hex)
    if idx == -1 or len(calldata_hex) < idx + _CBYTE['BLOCK'] * count:
        return None
    return {'flagStart': idx, 'blocks': ['0x' + calldata_hex[idx + i * _CBYTE['BLOCK']:idx + (i + 1) * _CBYTE['BLOCK']] for i in range(count)]}

# ============================================================================
# Trim constants + helpers (decode_fee.py / decode_trim.py)
# ============================================================================

_TRIM_FLAGS = {'SINGLE': '777777771111', 'DUAL': '777777772222'}
_BLOCK = 64

def _parse_trim_data(hex32: str) -> dict:
    h = hex32.lower().removeprefix('0x')
    flag = '0x' + h[:12]
    valid = ['0x' + v for v in _TRIM_FLAGS.values()]
    if flag not in valid:
        raise ValueError(f'Invalid trim flag: {flag}')
    return {'flag': flag, 'rate': str(int(h[12:24], 16)), 'address': '0x' + h[24:64]}

def _parse_expect_amount(hex32: str) -> dict:
    h = hex32.lower().removeprefix('0x')
    flag = '0x' + h[:12]
    valid = ['0x' + v for v in _TRIM_FLAGS.values()]
    if flag not in valid:
        raise ValueError(f'Invalid trim flag in expect amount block: {flag}')
    return {'expectAmount': str(int(h[24:64], 16)), 'trimType': 'toB' if h[12:14] == '80' else 'toC'}

# ============================================================================
# Fee extraction (decode_fee.py)
# ============================================================================

def extract_commission_info(calldata_hex: str) -> dict:
    c = calldata_hex.lower().removeprefix('0x')

    for flag in ['0x3ca20afc2aaa', '0x3ca20afc2bbb']:
        idx = c.find(flag[2:])
        if idx != -1 and idx >= _CBYTE['BLOCK']:
            try:
                return {
                    'hasCommission': True, 'referCount': 1,
                    'middle': _parse_middle('0x' + c[idx - _CBYTE['BLOCK']:idx]),
                    'first': _parse_commission('0x' + c[idx:idx + _CBYTE['BLOCK']]),
                }
            except Exception:
                pass

    for flag in ['0x22220afc2aaa', '0x22220afc2bbb']:
        r = _extract_blocks(c, flag[2:], 3)
        if r:
            try:
                first, middle, last = r['blocks']
                return {'hasCommission': True, 'referCount': 2,
                        'first': _parse_commission(first), 'middle': _parse_middle(middle), 'last': _parse_commission(last)}
            except Exception:
                pass

    for flag in ['0x88880afc2aaa', '0x88880afc2bbb']:
        fh = flag[2:]
        if c.find(fh) == -1 or len(c) < _CBYTE['BLOCK'] * 4:
            continue
        try:
            ms = len(c) - _CBYTE['BLOCK'] * 2
            ref_num = _parse_referrer_num('0x' + c[ms:ms + _CBYTE['BLOCK']])
            if not (_MIN_REFERRERS <= ref_num <= _MAX_REFERRERS):
                continue
            total = ref_num + 1
            if len(c) < _CBYTE['BLOCK'] * total:
                continue
            r = _extract_blocks(c, fh, total)
            if not r:
                continue
            mid_i, c1_i = ref_num - 1, ref_num
            ret = {'hasCommission': True, 'referCount': ref_num,
                   _ORDINALS[0]: _parse_commission(r['blocks'][0]),
                   'middle': _parse_middle(r['blocks'][mid_i])}
            for i in range(1, mid_i):
                ret[_ORDINALS[i]] = _parse_commission(r['blocks'][i])
            ret[_ORDINALS[mid_i]] = _parse_commission(r['blocks'][c1_i])
            return ret
        except Exception:
            pass

    return {'hasCommission': False}

def extract_trim_info(calldata_hex: str) -> dict:
    c = calldata_hex.lower().removeprefix('0x')

    single_flag = _TRIM_FLAGS['SINGLE']
    idx = c.find(single_flag)
    if idx != -1:
        last_idx, search = idx, idx + 1
        while True:
            nxt = c.find(single_flag, search)
            if nxt == -1:
                break
            last_idx, search = nxt, nxt + 1
        if last_idx >= _BLOCK:
            try:
                td = _parse_trim_data('0x' + c[last_idx:last_idx + _BLOCK])
                ea = _parse_expect_amount('0x' + c[last_idx - _BLOCK:last_idx])
                return {
                    'hasTrim': ea['trimType'], 'trimRate': td['rate'], 'trimAddress': td['address'],
                    'expectAmountOut': ea['expectAmount'], 'chargeRate': '0',
                    'chargeAddress': '0x0000000000000000000000000000000000000000',
                }
            except Exception:
                pass

    dual_flag = _TRIM_FLAGS['DUAL']
    positions, search = [], 0
    while True:
        pos = c.find(dual_flag, search)
        if pos == -1:
            break
        positions.append(pos)
        search = pos + 1
    if len(positions) >= 3:
        fs = positions[-1]
        if fs >= _BLOCK * 2:
            try:
                td1 = _parse_trim_data('0x' + c[fs:fs + _BLOCK])
                ea  = _parse_expect_amount('0x' + c[fs - _BLOCK:fs])
                td2 = _parse_trim_data('0x' + c[fs - _BLOCK * 2:fs - _BLOCK])
                return {
                    'hasTrim': ea['trimType'], 'trimRate': td1['rate'], 'trimAddress': td1['address'],
                    'expectAmountOut': ea['expectAmount'], 'chargeRate': td2['rate'], 'chargeAddress': td2['address'],
                }
            except Exception:
                pass

    return {'hasTrim': False}

# ============================================================================
# Unified decode entry point
# ============================================================================

def decode(calldata: str) -> dict:
    """
    Decode DEX Router calldata: function parameters + commission + trim fee.

    Returns a dict with:
      - 'function': { name, selector }
      - all named parameters (flattened at top level)
      - commission fields flattened at top level
      - 'hasTrim' and trim fields flattened at top level
    """
    result = decode_functions(calldata)
    result.update(extract_commission_info(calldata))
    result.update(extract_trim_info(calldata))
    return result

# ============================================================================
# CLI
# ============================================================================

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python decode.py <calldata_hex>', file=sys.stderr)
        sys.exit(1)

    print(json.dumps(decode(sys.argv[1]), indent=2, default=str))
