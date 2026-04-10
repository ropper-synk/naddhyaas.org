const pool = require('./config/database');

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('test-output.txt', msg + '\n');
}

async function testInvoices() {
    log('Testing Invoices Query...');
    const connection = await pool.getConnection();
    try {
        // 1. Check raw counts
        const [feeCount] = await connection.execute('SELECT COUNT(*) as count FROM donation_fee');
        log('donation_fee count: ' + feeCount[0].count);

        const [adminCount] = await connection.execute('SELECT COUNT(*) as count FROM admission_form');
        log('admission_form count: ' + adminCount[0].count);

        // 2. Check join count without filters
        const [joinCount] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM donation_fee df
            JOIN admission_form af ON af.admission_id = df.admission_id
        `);
        log('Join count (df + af): ' + joinCount[0].count);

        // 3. Run the exact query from admin.js (simplified)
        const query = `
            SELECT df.donation_id, df.admission_id, af.full_name, af.branch
            FROM donation_fee df
            JOIN admission_form af ON af.admission_id = df.admission_id
            ORDER BY df.donation_id DESC
            LIMIT 5
        `;
        const [rows] = await connection.execute(query);
        log('Query rows: ' + JSON.stringify(rows, null, 2));

        // 4. List distinct branches to check for mismatch
        const [branches] = await connection.execute('SELECT DISTINCT branch FROM admission_form');
        log('Branches in admission_form: ' + JSON.stringify(branches.map(b => b.branch), null, 2));

        // 5. List all tables with "donation" in the name
        const [tables] = await connection.execute("SHOW TABLES LIKE '%donation%'");
        log('Donation tables: ' + JSON.stringify(tables, null, 2));

        // 6. Check counts of branch tables
        const branchTables = [
            'karad_donation_fee',
            'godoli_satara_donation_fee',
            'karmaveer_nagar_donation_fee',
            'krantismruti_satara_donation_fee'
        ];

        for (const table of branchTables) {
            try {
                const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
                log(`${table} count: ${count[0].count}`);
            } catch (e) {
                log(`${table} error: ${e.message}`);
            }
        }

    } catch (err) {
        log('Error: ' + err);
    } finally {
        connection.release();
        process.exit();
    }
}

testInvoices();
