const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("🔍 Checking 'clients' table schema...");

    // Attempt to select columns that might not exist
    const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, is_conflictive, notes')
        .limit(1);

    if (error) {
        console.error("❌ Schema check failed (likely missing columns):", error.message);
        console.log("   -> Need to run migration.");
    } else {
        console.log("✅ Schema appears correct. Columns 'is_conflictive' and 'notes' exist.");
    }
}

checkSchema();
