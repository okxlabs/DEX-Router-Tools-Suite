/**
 * Utility functions for applying commission and trim data to JSON configurations
 */

/**
 * Apply commission and trim settings to a base JSON configuration
 * @param {Object} baseJson - The base JSON configuration
 * @param {Object} commissionData - Commission configuration data
 * @param {Object} trimData - Trim configuration data
 * @returns {Object} Complete JSON with commission and trim applied
 */
export const applyCommissionAndTrimToJson = (baseJson, commissionData, trimData) => {
    let completeJson = { ...baseJson };

    // Check if this is a function that should NOT have commission/trim
    const functionsWithoutCommissionTrim = ['approve'];
    const functionName = baseJson.function?.name;
    
    if (functionsWithoutCommissionTrim.includes(functionName)) {
        // For ERC20 approve function, remove any existing commission/trim data and return
        delete completeJson.hasCommission;
        delete completeJson.referCount;
        delete completeJson.first;
        delete completeJson.middle;
        delete completeJson.second;
        delete completeJson.third;
        delete completeJson.fourth;
        delete completeJson.fifth;
        delete completeJson.sixth;
        delete completeJson.seventh;
        delete completeJson.eighth;
        delete completeJson.last;
        delete completeJson.hasTrim;
        delete completeJson.trimRate;
        delete completeJson.trimAddress;
        delete completeJson.expectAmountOut;
        delete completeJson.chargeRate;
        delete completeJson.chargeAddress;
        return completeJson;
    }

    // Apply commission data first
    completeJson = applyCommissionData(completeJson, commissionData);
    
    // Apply trim data second
    completeJson = applyTrimData(completeJson, trimData);

    return completeJson;
};

/**
 * Apply commission data to JSON configuration
 * @param {Object} json - JSON configuration
 * @param {Object} commissionData - Commission configuration
 * @returns {Object} JSON with commission data applied
 */
const applyCommissionData = (json, commissionData) => {
    const { 
        commissions = [], 
        commissionToB, 
        commissionTokenAddress 
    } = commissionData;

    // Ordinal names for commission blocks (matching decode_commission.js)
    const ordinalNames = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

    // Collect only valid commissions
    const validCommissions = commissions.filter(c => c.address && c.rate);
    const commissionCount = validCommissions.length;
    
    // Always clean up all commission properties first
    delete json.hasCommission;
    delete json.referCount;
    delete json.first;
    delete json.middle;
    delete json.second;
    delete json.third;
    delete json.fourth;
    delete json.fifth;
    delete json.sixth;
    delete json.seventh;
    delete json.eighth;
    delete json.last; // Also clean up 'last' which was used in dual mode
    
    if (commissionCount > 0) {
        json.hasCommission = true;
        json.referCount = commissionCount;
        
        // Determine flag and commission type based on count
        let flag, commissionType;
        
        if (commissionCount === 1) {
            // Single commission
            flag = (isFromToken) => isFromToken ? "0x3ca20afc2aaa" : "0x3ca20afc2bbb";
            commissionType = (isFromToken) => isFromToken ? "SINGLE_FROM_TOKEN_COMMISSION" : "SINGLE_TO_TOKEN_COMMISSION";
        } else if (commissionCount === 2) {
            // Dual commission
            flag = (isFromToken) => isFromToken ? "0x22220afc2aaa" : "0x22220afc2bbb";
            commissionType = (isFromToken) => isFromToken ? "DUAL_FROM_TOKEN_COMMISSION" : "DUAL_TO_TOKEN_COMMISSION";
        } else if (commissionCount >= 3 && commissionCount <= 8) {
            // Multiple commission (3-8)
            flag = (isFromToken) => isFromToken ? "0x88880afc2aaa" : "0x88880afc2bbb";
            commissionType = (isFromToken) => isFromToken ? "MULTIPLE_FROM_TOKEN_COMMISSION" : "MULTIPLE_TO_TOKEN_COMMISSION";
        } else {
            // Invalid count (more than 8)
            json.hasCommission = false;
            return json;
        }
        
        // For SINGLE: structure is [first, middle]
        // For DUAL: structure is [first, middle, last]
        // For MULTIPLE (3-8): structure is [first, middle, second, third, fourth, ...]
        
        if (commissionCount === 1) {
            // Single commission: first, middle
            json.first = {
                flag: flag(validCommissions[0].isFromToken),
                commissionType: commissionType(validCommissions[0].isFromToken),
                rate: String(validCommissions[0].rate),
                address: validCommissions[0].address
            };
            json.middle = {
                isToB: commissionToB,
                token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            };
        } else if (commissionCount === 2) {
            // Dual commission: first, middle, last
            json.first = {
                flag: flag(validCommissions[0].isFromToken),
                commissionType: commissionType(validCommissions[0].isFromToken),
                rate: String(validCommissions[0].rate),
                address: validCommissions[0].address
            };
            json.middle = {
                isToB: commissionToB,
                token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            };
            json.last = {
                flag: flag(validCommissions[1].isFromToken),
                commissionType: commissionType(validCommissions[1].isFromToken),
                rate: String(validCommissions[1].rate),
                address: validCommissions[1].address
            };
        } else {
            // Multiple commission (3-8): first, middle, second, third, fourth, ...
            // Structure: first commission as "first", middle block, then remaining as "second", "third", etc.
            json.first = {
                flag: flag(validCommissions[0].isFromToken),
                commissionType: commissionType(validCommissions[0].isFromToken),
                rate: String(validCommissions[0].rate),
                address: validCommissions[0].address
            };
            json.middle = {
                isToB: commissionToB,
                token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            };
            
            // Add remaining commissions using ordinal names starting from "second"
            for (let i = 1; i < commissionCount; i++) {
                json[ordinalNames[i]] = {
                    flag: flag(validCommissions[i].isFromToken),
                    commissionType: commissionType(validCommissions[i].isFromToken),
                    rate: String(validCommissions[i].rate),
                    address: validCommissions[i].address
                };
            }
        }
    } else {
        // No commission data - explicitly set hasCommission to false
        json.hasCommission = false;
    }

    return json;
};

/**
 * Apply trim data to JSON configuration
 * @param {Object} json - JSON configuration
 * @param {Object} trimData - Trim configuration
 * @returns {Object} JSON with trim data applied
 */
const applyTrimData = (json, trimData) => {
    const { trim1, trim2, expectAmountOut } = trimData;

    // Generate trim data from inputs (0, 1, or 2)
    const hasTrim1 = trim1.address && trim1.rate;
    const hasTrim2 = trim2.address && trim2.rate;
    const trimCount = (hasTrim1 ? 1 : 0) + (hasTrim2 ? 1 : 0);
    
    // First, remove any existing trim fields to ensure clean state
    delete json.hasTrim;
    delete json.trimRate;
    delete json.trimAddress;
    delete json.expectAmountOut;
    delete json.chargeRate;
    delete json.chargeAddress;
    
    if (trimCount > 0) {
        // Determine trim type based on isToB flag
        // If only trim2 is filled, default to "toC"
        let trimType = 'toC';
        
        // Auto-convert: if only trim2 is filled, treat it as trim1
        if (!hasTrim1 && hasTrim2) {
            json.trimRate = trim2.rate;
            json.trimAddress = trim2.address;
            // trim2 doesn't have isToB, default to toC
            trimType = 'toC';
        } else if (hasTrim1 && !hasTrim2) {
            // Only trim1 is filled
            json.trimRate = trim1.rate;
            json.trimAddress = trim1.address;
            trimType = trim1.isToB ? 'toB' : 'toC';
        } else if (hasTrim1 && hasTrim2) {
            // Both are filled
            json.trimRate = trim1.rate;
            json.trimAddress = trim1.address;
            json.chargeRate = trim2.rate;
            json.chargeAddress = trim2.address;
            trimType = trim1.isToB ? 'toB' : 'toC';
        }
        
        // Always add expectAmountOut and default charge values for single trim
        json.expectAmountOut = expectAmountOut || "100";
        if (trimCount === 1) {
            json.chargeRate = "0";
            json.chargeAddress = "0x0000000000000000000000000000000000000000";
        }
        
        // Set hasTrim to "toB" or "toC" based on isToB flag
        json.hasTrim = trimType;
    } else {
        // No trim data - set hasTrim to false
        json.hasTrim = false;
    }

    return json;
};
