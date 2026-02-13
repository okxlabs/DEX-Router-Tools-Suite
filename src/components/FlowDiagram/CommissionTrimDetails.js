import React from 'react';
import { shortenAddress } from '../../scripts/formatters/flowDiagramGenerator';

const COMMISSION_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/**
 * CommissionTrimDetails - displays commission and trim/charge info in tables
 */
const CommissionTrimDetails = ({ decodedResult }) => {
    if (!decodedResult) return null;

    const hasCommission = decodedResult.hasCommission;
    const hasTrim = decodedResult.hasTrim;

    if (!hasCommission && !hasTrim) return null;

    // Collect commission blocks
    const commissions = [];
    if (hasCommission) {
        const referCount = Math.min(parseInt(decodedResult.referCount, 10) || 0, 8);
        for (let i = 0; i < referCount; i++) {
            const key = COMMISSION_ORDINALS[i];
            const block = decodedResult[key];
            if (block && block.address && block.rate) {
                const type = block.commissionType || '';
                const isFrom = type.includes('FROM_TOKEN');
                const ratePct = ((parseInt(block.rate, 10) || 0) / 10000000).toFixed(4);
                commissions.push({
                    type: isFrom ? 'From Token' : 'To Token',
                    address: block.address,
                    rate: `${ratePct}%`,
                });
            }
        }
    }

    // Collect trim/charge
    const trims = [];
    if (hasTrim) {
        const trimAddress = decodedResult.trimAddress;
        const trimRate = decodedResult.trimRate;
        if (trimAddress && trimRate) {
            const trimRatePct = ((parseInt(trimRate, 10) || 0) / 10000 * 100).toFixed(4);
            trims.push({ type: 'Trim', address: trimAddress, rate: `${trimRatePct}%` });
        }
        const chargeAddress = decodedResult.chargeAddress;
        const chargeRate = decodedResult.chargeRate;
        const chargeRateNum = parseInt(chargeRate, 10) || 0;
        if (chargeRateNum > 0 && chargeAddress && chargeAddress !== '0x0000000000000000000000000000000000000000') {
            const chargeRatePct = (chargeRateNum / 10000 * 100).toFixed(4);
            trims.push({ type: 'Charge', address: chargeAddress, rate: `${chargeRatePct}%` });
        }
    }

    return (
        <div className="commission-trim-details">
            {commissions.length > 0 && (
                <div className="details-section">
                    <div className="details-title">Commission Details</div>
                    <table className="details-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Address</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissions.map((c, idx) => (
                                <tr key={idx}>
                                    <td>{c.type}</td>
                                    <td className="details-address" title={c.address}>
                                        {shortenAddress(c.address)}
                                    </td>
                                    <td>{c.rate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {trims.length > 0 && (
                <div className="details-section">
                    <div className="details-title">Trim / Charge Details</div>
                    <table className="details-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Address</th>
                                <th>Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trims.map((t, idx) => (
                                <tr key={idx}>
                                    <td>{t.type}</td>
                                    <td className="details-address" title={t.address}>
                                        {shortenAddress(t.address)}
                                    </td>
                                    <td>{t.rate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CommissionTrimDetails;
