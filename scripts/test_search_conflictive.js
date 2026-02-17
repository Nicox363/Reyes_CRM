const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSearch() {
    console.log("🔍 Testing Search for Conflictive Client...");

    const { data: clients, error } = await supabase
        .from('clients')
        .select('full_name, is_conflictive, notes')
        .ilike('full_name', '%Conflictivo%')
        .limit(5);

    if (error) {
        console.error("❌ Search failed:", error.message);
        return;
    }

    if (clients.length === 0) {
        console.error("❌ No conflictive client found (Did you run seed script?)");
        return;
    }

    const client = clients[0];
    console.log(`✅ Found: ${client.full_name}`);
    console.log(`   🚩 is_conflictive: ${client.is_conflictive}`);
    console.log(`   📝 Notes: ${client.notes}`);

    if (client.is_conflictive === true) {
        console.log("✅ Red Flag Data Flow Confirmed!");
    } else {
        console.error("❌ Red Flag missing or false!");
    }
}

testSearch();
