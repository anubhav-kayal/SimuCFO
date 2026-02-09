import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Data = () => {
    const location = useLocation();
    const data = location.state?.data;

    useEffect(() => {
        if (data) {
            console.log("Received JSON Data:", data);
        } else {
            console.log("No data received.");
        }
    }, [data]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold text-blue-600 mb-4">Hello World</h1>
            <p className="text-gray-600">Check the browser console for the JSON data.</p>
            {data && (
                <div className="mt-8 p-4 bg-white rounded shadow-lg max-w-2xl w-full overflow-auto">
                    <h2 className="text-xl font-semibold mb-2">Data Preview:</h2>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default Data;
