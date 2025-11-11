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
    const functionsWithoutCommissionTrim = ['approve', 'swapWrap'];
    const functionName = baseJson.function?.name;
    
    if (functionsWithoutCommissionTrim.includes(functionName)) {
        // For ERC20 and utility functions, remove any existing commission/trim data and return
        delete completeJson.hasCommission;
        delete completeJson.referCount;
        delete completeJson.first;
        delete completeJson.middle;
        delete completeJson.second;
        delete completeJson.third;
        delete completeJson.hasTrim;
        delete completeJson.trimRate;
        delete completeJson.trimAddress;
        delete completeJson.expectAmountOut;
        delete completeJson.chargeRate;
        delete completeJson.chargeAddress;
        return completeJson;
    }

    // Apply commission data
    completeJson = applyCommissionData(completeJson, commissionData);
    
    // Apply trim data
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
        commission1, 
        commission2, 
        commission3, 
        commissionToB, 
        commissionTokenAddress 
    } = commissionData;

    // Generate commission data from inputs - collect only valid commissions
    const validCommissions = [];
    
    if (commission1.address && commission1.rate) {
        validCommissions.push(commission1);
    }
    if (commission2.address && commission2.rate) {
        validCommissions.push(commission2);
    }
    if (commission3.address && commission3.rate) {
        validCommissions.push(commission3);
    }
    
    const commissionCount = validCommissions.length;
    
    // Always clean up all commission properties first
    delete json.hasCommission;
    delete json.referCount;
    delete json.first;
    delete json.middle;
    delete json.second;
    delete json.third;
    
    if (commissionCount > 0) {
        json.hasCommission = true;
        json.referCount = commissionCount;
        
        if (commissionCount === 3) {
            // Triple commission: first, middle, second, third
            json.first = {
                flag: validCommissions[0].isFromToken ? "0x33330afc2aaa" : "0x33330afc2bbb",
                commissionType: validCommissions[0].isFromToken ? "TRIPLE_FROM_TOKEN_COMMISSION" : "TRIPLE_TO_TOKEN_COMMISSION",
                rate: validCommissions[0].rate,
                address: validCommissions[0].address
            };
            json.middle = {
                isToB: commissionToB,
                token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            };
            json.second = {
                flag: validCommissions[1].isFromToken ? "0x33330afc2aaa" : "0x33330afc2bbb", 
                commissionType: validCommissions[1].isFromToken ? "TRIPLE_FROM_TOKEN_COMMISSION" : "TRIPLE_TO_TOKEN_COMMISSION",
                rate: validCommissions[1].rate,
                address: validCommissions[1].address
            };
            json.third = {
                flag: validCommissions[2].isFromToken ? "0x33330afc2aaa" : "0x33330afc2bbb",
                commissionType: validCommissions[2].isFromToken ? "TRIPLE_FROM_TOKEN_COMMISSION" : "TRIPLE_TO_TOKEN_COMMISSION",
                rate: validCommissions[2].rate,
                address: validCommissions[2].address
            };
        } else if (commissionCount === 2) {
            // Dual commission: first, middle, second
            json.first = {
                flag: validCommissions[0].isFromToken ? "0x22220afc2aaa" : "0x22220afc2bbb",
                commissionType: validCommissions[0].isFromToken ? "DUAL_FROM_TOKEN_COMMISSION" : "DUAL_TO_TOKEN_COMMISSION",
                rate: validCommissions[0].rate,
                address: validCommissions[0].address
            };
            json.middle = {
                isToB: commissionToB,
                token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            };
            json.second = {
                flag: validCommissions[1].isFromToken ? "0x22220afc2aaa" : "0x22220afc2bbb", 
                commissionType: validCommissions[1].isFromToken ? "DUAL_FROM_TOKEN_COMMISSION" : "DUAL_TO_TOKEN_COMMISSION",
                rate: validCommissions[1].rate,
                address: validCommissions[1].address
            };
        } else {
            // Single commission: first, middle
            json.first = {
                flag: validCommissions[0].isFromToken ? "0x3ca20afc2aaa" : "0x3ca20afc2bbb",
                commissionType: validCommissions[0].isFromToken ? "SINGLE_FROM_TOKEN_COMMISSION" : "SINGLE_TO_TOKEN_COMMISSION",
                rate: validCommissions[0].rate,
                address: validCommissions[0].address
            };
            json.middle = {
                isToB: commissionToB,
                token: commissionTokenAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            };
        }
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
    
    if (trimCount > 0) {
        json.hasTrim = true;
        
        // Auto-convert: if only trim2 is filled, treat it as trim1
        if (!hasTrim1 && hasTrim2) {
            json.trimRate = trim2.rate;
            json.trimAddress = trim2.address;
        } else if (hasTrim1 && !hasTrim2) {
            // Only trim1 is filled
            json.trimRate = trim1.rate;
            json.trimAddress = trim1.address;
        } else if (hasTrim1 && hasTrim2) {
            // Both are filled
            json.trimRate = trim1.rate;
            json.trimAddress = trim1.address;
            json.chargeRate = trim2.rate;
            json.chargeAddress = trim2.address;
        }
        
        // Always add expectAmountOut and default charge values for single trim
        json.expectAmountOut = expectAmountOut || "100";
        if (trimCount === 1) {
            json.chargeRate = "0";
            json.chargeAddress = "0x0000000000000000000000000000000000000000";
        }
    } else {
        // No trim data - remove all trim-related fields
        json.hasTrim = false;
        delete json.trimRate;
        delete json.trimAddress;
        delete json.expectAmountOut;
        delete json.chargeRate;
        delete json.chargeAddress;
    }

    return json;
};
