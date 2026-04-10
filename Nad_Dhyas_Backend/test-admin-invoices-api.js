// Supertest removed as we are testing logic directly 
// OR simpler: Just copy the logic from the route and run it as a script, mocking req/res.

// Let's create a script that connects to DB and runs the EXACT query logic we just wrote, 
// to ensure no syntax errors.

const pool = require('./config/database');

async function testAdminInvoicesLogic() {
    console.log('Testing Admin Invoices Logic...');
    const connection = await pool.getConnection();

    try {
        // Mock inputs
        const testCases = [
            { role: 'ROOT', branch: 'all', desc: 'ROOT Admin - All Branches' },
            { role: 'BRANCH', branch: 'Karad', desc: 'BRANCH Admin - Karad' },
            { role: 'BRANCH', branch: 'Godoli, Satara', desc: 'BRANCH Admin - Godoli' }
        ];

        for (const test of testCases) {
            console.log(`\n--- Running Test: ${test.desc} ---`);
            const { role, branch } = test;

            let donationTable = 'donation_fee';
            let admissionTable = 'admission_form';
            let whereClause = '';
            const params = [];

            // Logic copied from routes/admin.js
            if (role === 'BRANCH' && branch) {
                // Mock helper functions (simplified for test)
                const getBranchTableName = (b) => {
                    const l = b.toLowerCase();
                    if (l.includes('karad')) return 'karad_table';
                    if (l.includes('godoli')) return 'godoli_satara_table';
                    return null;
                };
                const getBranchDonationFeeTable = (b) => {
                    const l = b.toLowerCase();
                    if (l.includes('karad')) return 'karad_donation_fee';
                    if (l.includes('godoli')) return 'godoli_satara_donation_fee';
                    return null;
                };

                const branchDonationFeeTable = getBranchDonationFeeTable(branch);
                const branchTableName = getBranchTableName(branch);

                if (branchTableName && branchDonationFeeTable) {
                    console.log(`Using branch tables: ${branchDonationFeeTable}`);
                    donationTable = branchDonationFeeTable;
                    admissionTable = branchTableName;
                } else {
                    console.log(`Using main tables with filter`);
                    const adminBranchLower = branch.toLowerCase().trim();
                    const branchName = adminBranchLower.split(',')[0].trim();
                    whereClause = ' AND (LOWER(TRIM(af.branch)) = LOWER(TRIM(?)) OR LOWER(TRIM(af.branch)) LIKE ?)';
                    params.push(branch, `%${branchName}%`);
                }
            } else if (role === 'ROOT' && branch && branch !== 'all') {
                whereClause = ' AND af.branch = ?';
                params.push(branch);
            }

            const query = `
                SELECT df.donation_id, af.full_name, af.branch, df.amount_paid
                FROM ${donationTable} df
                JOIN ${admissionTable} af ON af.admission_id = df.admission_id
                WHERE 1=1 ${whereClause}
                ORDER BY df.donation_id DESC
                LIMIT 3
            `;

            console.log(`Query: ${query.replace(/\s+/g, ' ').trim()}`);
            console.log(`Params: ${JSON.stringify(params)}`);

            const [rows] = await connection.execute(query, params);
            console.log(`Result Count: ${rows.length}`);
            if (rows.length > 0) console.log('Sample Row:', rows[0]);
        }

    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        connection.release();
        process.exit();
    }
}

testAdminInvoicesLogic();
