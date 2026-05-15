import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export default function Statistics() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Statistics</h2>
            <Card>
                <CardHeader><CardTitle>Learning Statistics</CardTitle></CardHeader>
                <CardContent>
                    <p>View statistical analysis of learning progress here.</p>
                </CardContent>
            </Card>
        </div>
    );
}
