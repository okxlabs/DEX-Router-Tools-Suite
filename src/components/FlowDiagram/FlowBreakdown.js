import React, { useState } from 'react';
import { shortenAddress } from '../../scripts/formatters/flowDiagramGenerator';

/**
 * CopyableAddress — shows shortened address, tooltip with full address on hover,
 * copies to clipboard on click.
 */
const CopyableAddress = ({ address }) => {
    const [copied, setCopied] = useState(false);

    if (!address || address === 'Unknown' || address === '-') {
        return <span className="flow-route-addr-text">{address || '???'}</span>;
    }

    const handleClick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        }).catch(() => {});
    };

    return (
        <span className="flow-addr-copyable" onClick={handleClick} title={address}>
            {copied ? 'Copied!' : shortenAddress(address)}
            <span className="flow-addr-tooltip">{address}</span>
        </span>
    );
};

/**
 * CopyableToken — shows token display name, tooltip with full address on hover,
 * copies the token address to clipboard on click.
 */
const CopyableToken = ({ node, edgeId }) => {
    const [copied, setCopied] = useState(false);
    const displayName = node?.displayName || '???';
    const address = node?.token;
    const label = `[${edgeId}] ${displayName}`;

    if (!address) {
        return <span className="flow-edge-token">{label}</span>;
    }

    const handleClick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        }).catch(() => {});
    };

    return (
        <span className="flow-addr-copyable flow-edge-token-copyable" onClick={handleClick} title={address}>
            {copied ? 'Copied!' : label}
            <span className="flow-addr-tooltip">{address}</span>
        </span>
    );
};

/**
 * Single edge row (collapsible header + route table)
 */
const EdgeRow = ({ edge, fromNode, toNode, edgeKey, isOpen, onToggle }) => (
    <div className="flow-breakdown-edge">
        <div className="flow-breakdown-edge-header" onClick={() => onToggle(edgeKey)}>
            <span className="flow-edge-toggle">{isOpen ? '▼' : '▶'}</span>
            <span className="flow-edge-label">
                <CopyableToken node={fromNode} edgeId={edge.from} />
                <span className="flow-edge-arrow"> → </span>
                <CopyableToken node={toNode} edgeId={edge.to} />
            </span>
            <span className="flow-edge-badge flow-edge-pct">{edge.percentage}%</span>
            <span className="flow-edge-badge flow-edge-count">
                {edge.routes.length} route{edge.routes.length > 1 ? 's' : ''}
            </span>
            <span className="flow-edge-badge flow-edge-weight">wt: {edge.totalWeight}</span>
        </div>

        {isOpen && (
            <div className="flow-breakdown-routes">
                <table className="flow-routes-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Adapter</th>
                            <th>Pool</th>
                            <th>Weight</th>
                            <th>% of Input</th>
                            <th>Direction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {edge.routes.map((route, rIdx) => (
                            <tr key={rIdx}>
                                <td className="flow-route-num">{rIdx + 1}</td>
                                <td className="flow-route-addr">
                                    <CopyableAddress address={route.adapter} />
                                </td>
                                <td className="flow-route-addr">
                                    <CopyableAddress address={route.pool} />
                                </td>
                                <td className="flow-route-weight">{route.weight}</td>
                                <td className="flow-route-pct">
                                    {((route.weight / 10000) * 100).toFixed(2)}%
                                </td>
                                <td className="flow-route-dir">
                                    {route.reverse ? 'Reverse' : 'Forward'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

/**
 * FlowBreakdown — detailed route breakdown for all edges
 */
const FlowBreakdown = ({ flowData, keyPrefix, expandedEdges, onToggleEdge, className }) => {
    if (!flowData) return null;

    return (
        <div className={`flow-breakdown${className ? ` ${className}` : ''}`}>
            <div className="flow-breakdown-title">Detailed Route Breakdown</div>
            {flowData.edges.map((edge, idx) => {
                const fromNode = flowData.nodes.find(n => n.id === edge.from);
                const toNode = flowData.nodes.find(n => n.id === edge.to);
                const edgeKey = `${keyPrefix}-${edge.from}->${edge.to}`;
                return (
                    <EdgeRow
                        key={idx}
                        edge={edge}
                        fromNode={fromNode}
                        toNode={toNode}
                        edgeKey={edgeKey}
                        isOpen={!!expandedEdges[edgeKey]}
                        onToggle={onToggleEdge}
                    />
                );
            })}
        </div>
    );
};

export default FlowBreakdown;
