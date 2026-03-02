import { ethers } from 'ethers';
import { DEXROUTER_ABI } from '../core/abi.js';

// Commission flags (12 hex chars = 6 bytes, no 0x prefix, lowercase)
// Matches CommissionLib.sol flag constants
const COMMISSION_FLAGS = [
    '3ca20afc2aaa', // SINGLE from-token
    '3ca20afc2bbb', // SINGLE to-token
    '22220afc2aaa', // DUAL from-token
    '22220afc2bbb', // DUAL to-token
    '88880afc2aaa', // MULTIPLE from-token (3-8 referrers)
    '88880afc2bbb', // MULTIPLE to-token (3-8 referrers)
];

// Trim / positive-slippage flags (12 hex chars = 6 bytes, no 0x prefix, lowercase)
const TRIM_FLAGS = [
    '777777771111', // SINGLE trim
    '777777772222', // DUAL trim
];

// Combined: commission takes priority (searched first, but we take the LAST occurrence)
const ALL_END_FLAGS = [...COMMISSION_FLAGS, ...TRIM_FLAGS];

// Cached selectors: 8-char lowercase hex (no 0x) → function name
let _selectorsCache = null;

function getKnownSelectors() {
    if (_selectorsCache) return _selectorsCache;

    // Exclude ERC20 approve — it has no commission/trim data
    const swapAbi = DEXROUTER_ABI.filter(sig => !sig.includes('function approve'));
    const iface = new ethers.utils.Interface(swapAbi);

    _selectorsCache = new Map();
    for (const fragment of Object.values(iface.functions)) {
        const sighash = iface.getSighash(fragment).slice(2).toLowerCase(); // 8 hex chars
        _selectorsCache.set(sighash, fragment.name);
    }
    return _selectorsCache;
}

/**
 * Split a transaction calldata into individual DexRouter call segments.
 *
 * Algorithm:
 *  1. Find all byte-aligned occurrences of known DexRouter function selectors.
 *  2. For each selector, search for the last commission or trim flag that:
 *     a) Falls between this selector's data start and the next selector (or end of data).
 *     b) Is at a 32-byte block boundary from the selector's data start:
 *        (flag_hex_pos - selector_hex_pos - 8) % 64 === 0
 *     Commission is appended outermost, so its flag will naturally be the last one found.
 *  3. Extracted calldata = selector…(last_valid_flag + 32 bytes).
 *     This guarantees length = 4 + 32*n bytes (4-byte selector + n×32-byte blocks).
 *  4. If no valid end flag is found, the occurrence is skipped — the boundary
 *     cannot be determined without a commission or trim marker.
 *
 * @param {string} calldataInput - Full transaction calldata (hex, with or without 0x)
 * @returns {{ results: Array, skipped: number }}
 *   results: Array of { index, funcName, selector, byteOffset, calldata }
 *   skipped: number of selector occurrences skipped due to missing end flag
 */
export function splitDexRouterCalldata(calldataInput) {
    const hex = calldataInput.trim().replace(/^0x/i, '').toLowerCase();

    if (!hex) throw new Error('Empty calldata');
    if (hex.length % 2 !== 0) throw new Error('Invalid calldata: odd-length hex string');
    if (!/^[0-9a-f]+$/.test(hex)) throw new Error('Invalid calldata: non-hex characters found');

    const selectors = getKnownSelectors();

    // ─── Step 1: Find all byte-aligned selector occurrences ─────────────────
    const selectorMatches = [];
    for (const [selectorHex, funcName] of selectors) {
        let pos = 0;
        while (pos <= hex.length - 8) {
            const idx = hex.indexOf(selectorHex, pos);
            if (idx === -1) break;
            if (idx % 2 === 0) { // byte-aligned only
                selectorMatches.push({ hexPos: idx, selector: '0x' + selectorHex, funcName });
            }
            pos = idx + 1;
        }
    }

    // Sort by position
    selectorMatches.sort((a, b) => a.hexPos - b.hexPos);

    // ─── Step 2: For each selector, find the last valid end flag ────────────
    const results = [];
    let skipped = 0;

    for (let i = 0; i < selectorMatches.length; i++) {
        const { hexPos: start, selector, funcName } = selectorMatches[i];

        // Upper boundary: start of next selector (or end of hex string)
        const boundary = i + 1 < selectorMatches.length
            ? selectorMatches[i + 1].hexPos
            : hex.length;

        // Data starts after the 4-byte selector (start + 8 hex chars).
        // A valid flag must be at the START of a 32-byte block counted from data start:
        //   (idx - start - 8) % 64 === 0
        // Combined with byte-alignment: idx % 2 === 0 (always true since start is even)
        // This guarantees: extracted calldata length = 4 + 32*n bytes
        let lastFlagHexPos = -1;

        for (const flag of ALL_END_FLAGS) {
            let searchPos = start + 8; // skip past the 4-byte selector
            while (searchPos < boundary) {
                const idx = hex.indexOf(flag, searchPos);
                if (idx === -1 || idx >= boundary) break;
                // Accept only flags at 32-byte block boundaries from selector data start
                const relativeOffset = idx - start - 8;
                if (relativeOffset % 64 === 0 && idx > lastFlagHexPos) {
                    lastFlagHexPos = idx;
                }
                searchPos = idx + 1;
            }
        }

        if (lastFlagHexPos === -1) {
            // No valid end marker found — cannot determine calldata boundary
            skipped++;
            continue;
        }

        // End = last flag position + one 32-byte block (64 hex chars)
        // Resulting length: (lastFlagHexPos + 64 - start) / 2 = 4 + 32*n bytes
        const endHexPos = Math.min(lastFlagHexPos + 64, hex.length);
        if (endHexPos <= start + 8) {
            skipped++;
            continue;
        }

        results.push({
            index: results.length + 1,
            funcName,
            selector,
            byteOffset: start / 2,
            calldata: '0x' + hex.slice(start, endHexPos),
        });
    }

    return { results, skipped };
}
