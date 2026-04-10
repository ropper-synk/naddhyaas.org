async function verifyApi() {
    console.log('Verifying API endpoint...');
    try {
        const response = await fetch('http://localhost:3001/api/admin/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminRole: 'ROOT',
                adminBranch: 'all',
                adminId: 1,
                adminUsername: 'root'
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        if (data.data) {
            console.log('Record Count:', data.data.length);
            if (data.data.length > 0) {
                console.log('Sample Record:', data.data[0]);
            } else {
                console.log('No records found.');
            }
        } else {
            console.log('Error:', data.error);
        }

    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

verifyApi();
