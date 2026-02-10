import React, { useState, useRef, useCallback, useEffect } from 'react';

const MIN_SCALE = 0.3;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

/**
 * ZoomableSvg — wraps SVG content with mouse-wheel zoom, drag-to-pan, and zoom buttons.
 */
const ZoomableSvg = ({ svgHtml, className }) => {
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Reset when SVG content changes
    useEffect(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, [svgHtml]);

    const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

    // Wheel zoom
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setScale(prev => clampScale(prev + delta));
    }, []);

    // Attach wheel listener with { passive: false } so we can preventDefault
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // Pan: mouse down
    const handleMouseDown = useCallback((e) => {
        if (e.button !== 0) return; // left click only
        setIsPanning(true);
        panStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
    }, [translate]);

    // Pan: mouse move (attached to window for smooth dragging)
    useEffect(() => {
        if (!isPanning) return;
        const handleMouseMove = (e) => {
            setTranslate({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
        };
        const handleMouseUp = () => setIsPanning(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isPanning]);

    const zoomIn = () => setScale(prev => clampScale(prev + ZOOM_STEP * 2));
    const zoomOut = () => setScale(prev => clampScale(prev - ZOOM_STEP * 2));
    const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

    const pct = Math.round(scale * 100);

    return (
        <div className={`zoomable-container ${className || ''}`}>
            <div className="zoom-controls">
                <button className="zoom-btn" onClick={zoomIn} title="Zoom in">+</button>
                <span className="zoom-level">{pct}%</span>
                <button className="zoom-btn" onClick={zoomOut} title="Zoom out">−</button>
                <button className="zoom-btn zoom-reset" onClick={resetZoom} title="Reset zoom">Reset</button>
            </div>
            <div
                ref={containerRef}
                className="zoomable-viewport"
                onMouseDown={handleMouseDown}
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            >
                <div
                    className="zoomable-content"
                    style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}
                    dangerouslySetInnerHTML={{ __html: svgHtml }}
                />
            </div>
        </div>
    );
};

export default ZoomableSvg;
