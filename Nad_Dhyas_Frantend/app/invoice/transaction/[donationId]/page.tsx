'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface InvoiceData {
    fullName: string;
    doNo: string | null;
    formNo: string | null;
    panCard: string | null;
    aadharCard: string | null;
    phone: string | null;
    diplomaAdmissionYear: string | null;
    createdAt: string;
    branch: string;
    musicType: string;
    instruments: string[];
    vocalStyle: string | null;
    danceStyles: string[];
    amountPaid: number;
    transactionId: string | null;
    paymentType: string | null;
    donationId: number;
}

export default function TransactionInvoicePage() {
    const params = useParams();
    const donationId = params.donationId as string;
    const [data, setData] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [serialNo, setSerialNo] = useState<string>('');

    useEffect(() => {
        async function fetchInvoice() {
            try {
                console.log(`[INVOICE] Fetching transaction invoice for donation ID: ${donationId}`);
                
                const timestamp = new Date().getTime();
                const url = `/api/invoice/transaction/${donationId}?t=${timestamp}`;
                console.log(`[INVOICE] API URL: ${url}`);
                
                const res = await fetch(url, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                console.log(`[INVOICE] Response status: ${res.status}`);
                
                if (res.ok) {
                    const invoiceData = await res.json();
                    console.log('[INVOICE] Received data, amount:', invoiceData.amountPaid);

                    // Build course details
                    let courseDetails = invoiceData.musicType || 'Music Course';
                    const specificItems = [];
                    if (invoiceData.instruments && invoiceData.instruments.length > 0) {
                        specificItems.push(...invoiceData.instruments);
                    }
                    if (invoiceData.vocalStyle) {
                        specificItems.push(invoiceData.vocalStyle);
                    }
                    if (invoiceData.danceStyles && invoiceData.danceStyles.length > 0) {
                        specificItems.push(...invoiceData.danceStyles);
                    }

                    if (specificItems.length > 0) {
                        courseDetails += ` (${specificItems.join(', ')})`;
                    }

                    // Generate unique serial number
                    const generatedSerialNo = `SR-TXN-${donationId}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                    setSerialNo(generatedSerialNo);
                    
                    setData({
                        ...invoiceData,
                        course: courseDetails
                    } as any);
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    console.error('[INVOICE] Fetch failed:', {
                        status: res.status,
                        statusText: res.statusText,
                        error: errorData,
                        donationId
                    });
                    
                    alert(`Invoice not found!\n\nTransaction ID: ${donationId}\nStatus: ${res.status}\nError: ${errorData.error || 'Unknown error'}\n\nPlease check:\n1. Transaction ID is correct\n2. Payment exists in database\n3. Backend server is running\n\nCheck browser console (F12) for details.`);
                }
            } catch (error) {
                console.error('[INVOICE] Error:', error);
                alert(`Failed to fetch invoice!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n1. Backend server is running\n2. Network connection\n3. Browser console (F12) for details`);
            } finally {
                setLoading(false);
            }
        }

        fetchInvoice();
    }, [donationId]);

    if (loading) return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '20px' }}>Loading Transaction Invoice...</div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>Transaction ID: {donationId}</div>
        </div>
    );
    
    if (!data) return (
        <div style={{ padding: '50px', textAlign: 'center', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <div style={{ fontSize: '24px', color: '#ef4444', marginBottom: '10px', fontWeight: 'bold' }}>
                Invoice Not Found
            </div>
            <div style={{ color: '#6b7280', marginBottom: '30px', fontSize: '16px' }}>
                Unable to find invoice for Transaction ID: <strong>{donationId}</strong>
            </div>
            
            <div style={{ 
                background: '#f3f4f6', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '30px',
                textAlign: 'left'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#111827' }}>
                    Please Check:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: '1.8' }}>
                    <li>Transaction ID is correct</li>
                    <li>Payment exists in the database</li>
                    <li>Backend server is running</li>
                    <li>Database connection is working</li>
                </ul>
            </div>

            <div style={{ 
                background: '#fef3c7', 
                padding: '15px', 
                borderRadius: '8px',
                border: '1px solid #fcd34d',
                marginBottom: '20px'
            }}>
                <div style={{ color: '#92400e', fontSize: '14px' }}>
                    <strong>💡 Tip:</strong> Press F12 to open browser console and check for detailed error messages
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                    onClick={() => window.location.reload()} 
                    style={{
                        padding: '12px 24px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                >
                    🔄 Retry
                </button>
                <button 
                    onClick={() => window.history.back()} 
                    style={{
                        padding: '12px 24px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                >
                    ← Go Back
                </button>
            </div>
        </div>
    );

    const courseDetails = data.musicType || 'Music Course';
    const date = new Date(data.createdAt).toLocaleDateString();

    return (
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '40px', background: 'white', color: 'black', fontFamily: 'Arial, sans-serif', border: '1px solid #ccc' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #800000', paddingBottom: '20px', marginBottom: '30px' }}>
                <div style={{ textAlign: 'left' }}>
                    <h1 style={{ color: '#800000', margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold' }}>Nad Dhyas Foundation</h1>
                    <p style={{ margin: '3px 0', fontSize: '14px', color: '#333' }}>At post Deravan</p>
                    <p style={{ margin: '3px 0', fontSize: '14px', color: '#333' }}>Tal : Patan , Dist : Satara</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ color: '#800000', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Payment Receipt</h2>
                    <p style={{ marginTop: '10px', fontSize: '14px', color: '#333' }}><strong>Serial No:</strong> {serialNo}</p>
                    <p style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>Transaction ID: {donationId}</p>
                </div>
            </div>

            {/* Payment Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                <div>
                    <p style={{ margin: '5px 0' }}><strong>Date:</strong> {date}</p>
                    <p style={{ margin: '5px 0' }}><strong>DO No:</strong> {data.doNo || 'N/A'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '5px 0' }}><strong>Branch:</strong> {data.branch}</p>
                    {data.paymentType && (
                        <p style={{ margin: '5px 0' }}><strong>Payment Type:</strong> {data.paymentType}</p>
                    )}
                </div>
            </div>

            {/* Bill To */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#333' }}>Bill To:</h3>
                <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '10px 0' }}>{data.fullName}</p>
                <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                    <p style={{ margin: '5px 0' }}><strong>PAN Card:</strong> {data.panCard || 'N/A'}</p>
                    <p style={{ margin: '5px 0' }}><strong>Aadhar Card:</strong> {data.aadharCard || 'N/A'}</p>
                    <p style={{ margin: '5px 0' }}><strong>Mobile No:</strong> {data.phone || 'N/A'}</p>
                    <p style={{ margin: '5px 0' }}><strong>Diploma Year:</strong> {data.diplomaAdmissionYear || 'N/A'}</p>
                </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <thead>
                    <tr style={{ background: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>
                            <div><strong>Course Fee Payment</strong></div>
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Course: {courseDetails}</div>
                            {data.transactionId && (
                                <div style={{ fontSize: '14px', color: '#666' }}>Transaction ID: {data.transactionId}</div>
                            )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>₹{data.amountPaid.toLocaleString()}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style={{ fontWeight: 'bold', fontSize: '18px' }}>
                        <td style={{ padding: '15px 12px', textAlign: 'right' }}>Total Paid:</td>
                        <td style={{ padding: '15px 12px', textAlign: 'right', color: '#800000' }}>₹{data.amountPaid.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '60px', color: '#777', fontSize: '12px' }}>
                <p>Thank you for joining Nad Dhyas Foundation!</p>
                <p>This is a computer generated receipt and does not require a signature.</p>
            </div>

            {/* Print Button */}
            <div className="no-print" style={{ textAlign: 'center', marginTop: '40px' }}>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '12px 24px',
                        background: '#800000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Print / Download Invoice
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none;
                    }
                    body {
                        background: white;
                    }
                }
            `}</style>
        </div>
    );
}
