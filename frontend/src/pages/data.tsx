import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Data = () => {
    const location = useLocation();
    const [metricsData, setMetricsData] = useState<any>(null);

    useEffect(() => {
        if (location.state?.data?.analysis) {
            console.log("📊 Received Analysis Data:", location.state.data.analysis);
            setMetricsData(location.state.data.analysis);
        } else if (location.state?.data) {
            // Fallback if data is directly passed without 'analysis' wrapper
            console.log("📊 Received Raw Data:", location.state.data);
            setMetricsData(location.state.data);
        }
    }, [location.state]);

    if (!metricsData) return <div>No data available</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Analysis Results</h1>

            {/* Display Bell Curve Image if available */}
            {location.state?.data?.plotImage && (
                <div style={{ marginBottom: '20px' }}>
                    <h2>Monte Carlo Bell Curve</h2>
                    <img
                        src={location.state.data.plotImage}
                        alt="Monte Carlo Bell Curve"
                        style={{ maxWidth: '30%', border: '1px solid #ccc' }}
                    />
                </div>
            )}

            {/* Display Interpretation Text if available */}
            {location.state?.data?.interpretation && (
                <div style={{ marginBottom: '20px' }}>
                    <h2>Financial Analysis Interpretation</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f4f4f4', padding: '15px' }}>
                        {location.state.data.interpretation}
                    </pre>
                </div>
            )}

            <h2>Raw Metrics Data</h2>
            <pre>{JSON.stringify(metricsData, null, 2)}</pre>
        </div>
    );
};

export default Data;
