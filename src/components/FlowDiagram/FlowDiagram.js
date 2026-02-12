import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mermaid from 'mermaid';
import {
    supportsFlowDiagram,
    generateFlowData,
    generateMermaidDefinition,
} from '../../scripts/formatters/flowDiagramGenerator';
import FlowBreakdown from './FlowBreakdown';
import ZoomableSvg from './ZoomableSvg';
import './FlowDiagram.css';

// Initialize mermaid once
mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose', fontFamily: 'monospace' });

let renderCounter = 0;

const Legend = () => (
    <div className="flow-legend">
        <span className="flow-legend-item">
            <span className="flow-legend-dot flow-legend-start" /> Input Token
        </span>
        <span className="flow-legend-item">
            <span className="flow-legend-dot flow-legend-intermediate" /> Intermediate
        </span>
        <span className="flow-legend-item">
            <span className="flow-legend-dot flow-legend-end" /> Output Token
        </span>
        <span className="flow-legend-item">
            <span className="flow-legend-dot flow-legend-trimcharge" /> Commission
        </span>
    </div>
);

/**
 * FlowDiagram — renders a Mermaid graph + detailed breakdown from decoded swap calldata.
 */
const FlowDiagram = ({ decodedResult, showToast }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [svgContent, setSvgContent] = useState('');
    const [error, setError] = useState(null);
    const [isRendering, setIsRendering] = useState(false);
    const [expandedEdges, setExpandedEdges] = useState({});
    const svgRef = useRef(null);

    const isSupported = useMemo(() => supportsFlowDiagram(decodedResult), [decodedResult]);

    const flowData = useMemo(() => {
        if (!isSupported) return null;
        return generateFlowData(decodedResult);
    }, [decodedResult, isSupported]);

    const mermaidDef = useMemo(() => flowData ? generateMermaidDefinition(flowData) : null, [flowData]);

    // Render Mermaid SVG
    useEffect(() => {
        if (!mermaidDef) { setSvgContent(''); return; }
        let cancelled = false;
        setIsRendering(true);
        setError(null);

        (async () => {
            try {
                const { svg } = await mermaid.render(`flow-${++renderCounter}`, mermaidDef);
                if (!cancelled) { setSvgContent(svg); setError(null); }
            } catch (err) {
                console.error('Mermaid render error:', err);
                if (!cancelled) setError('Failed to render diagram');
            } finally {
                if (!cancelled) setIsRendering(false);
            }
        })();

        return () => { cancelled = true; };
    }, [mermaidDef]);

    // Reset on new decode
    useEffect(() => { setSvgContent(''); setError(null); setExpandedEdges({}); }, [decodedResult]);

    const toggleEdge = useCallback((key) => setExpandedEdges(p => ({ ...p, [key]: !p[key] })), []);

    const copyMermaid = useCallback(() => {
        if (!mermaidDef) return;
        navigator.clipboard.writeText(mermaidDef)
            .then(() => showToast?.('Mermaid definition copied!', 'success'))
            .catch(() => showToast?.('Failed to copy', 'error'));
    }, [mermaidDef, showToast]);

    // Fullscreen Escape key
    useEffect(() => {
        if (!isFullscreen) return;
        const handler = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isFullscreen]);

    if (!isSupported) return null;

    const diagramReady = svgContent && !isRendering;

    return (
        <div className="flow-diagram-wrapper">
            {/* Inline view */}
            <div className="flow-diagram-container">
                <div className="flow-diagram-header">
                    <span className="flow-diagram-title">Token Flow Graph</span>
                    <div className="flow-diagram-actions">
                        {diagramReady && <button className="flow-expand-btn" onClick={() => setIsFullscreen(true)} title="Expand">Expand</button>}
                        {mermaidDef && <button className="flow-copy-mermaid-btn" onClick={copyMermaid} title="Copy Mermaid definition">Copy Mermaid</button>}
                    </div>
                </div>
                <Legend />
                {isRendering && <div className="flow-diagram-loading"><div className="flow-spinner" /><span>Rendering diagram...</span></div>}
                {error && <div className="flow-diagram-error">{error}</div>}
                {diagramReady && (
                    <div className="flow-diagram-svg-container">
                        <div ref={svgRef} className="flow-diagram-svg" dangerouslySetInnerHTML={{ __html: svgContent }} />
                    </div>
                )}
                <FlowBreakdown flowData={flowData} keyPrefix="inline" expandedEdges={expandedEdges} onToggleEdge={toggleEdge} />
            </div>

            {/* Fullscreen modal */}
            {isFullscreen && svgContent && (
                <div className="flow-fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
                    <div className="flow-fullscreen-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flow-fullscreen-header">
                            <span className="flow-fullscreen-title">Token Flow Graph</span>
                            <div className="flow-fullscreen-actions">
                                <button className="flow-copy-mermaid-btn" onClick={copyMermaid} title="Copy Mermaid">Copy Mermaid</button>
                                <button className="flow-fullscreen-close" onClick={() => setIsFullscreen(false)} title="Close (Esc)">✕</button>
                            </div>
                        </div>
                        <Legend />
                        <ZoomableSvg svgHtml={svgContent} className="flow-fullscreen-svg" />
                        <FlowBreakdown flowData={flowData} keyPrefix="fs" expandedEdges={expandedEdges} onToggleEdge={toggleEdge} className="flow-fullscreen-breakdown" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlowDiagram;
