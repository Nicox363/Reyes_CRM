const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsage() {
    const staff = JSON.parse(fs.readFileSync('staff_list.json', 'utf8'));
    const results = [];

    for (const s of staff) {
        const { count: aptCount, error: aptError } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('staff_id', s.id);

        const { count: txnCount, error: txnError } = await supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', s.id);

        results.push({
            id: s.id,
            name: s.name,
            appointments: aptCount || 0,
            transactions: txnCount || 0
        });
    }

    console.log(JSON.stringify(results, null, 2));
    fs.writeFileSync('staff_usage.json', JSON.stringify(results, null, 2));
}

checkUsage();
