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
            <pre>{JSON.stringify(metricsData, null, 2)}</pre>
        </div>
    );
};

export default Data;
