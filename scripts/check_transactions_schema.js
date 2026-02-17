const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTransactionsColumns() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
    } else {
        console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data found (or empty table) - attempting to infer from error if schema changes needed');
        if (!data || data.length === 0) {
            // If empty, we can't see columns easily with select *. 
            // But we can try to insert a dummy and fail to see columns? No.
            // Let's assume we need to add them if we don't see them.
            console.log("Table exists but empty. Can't infer columns from data.");
        }
    }
}

checkTransactionsColumns();
