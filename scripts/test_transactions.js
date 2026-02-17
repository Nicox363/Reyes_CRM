const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testTransaction() {
    console.log("💰 Testing Transactions Table...");

    // 1. Create a dummy transaction
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            amount: 50.00,
            method: 'cash',
            concept: 'Test Transaction',
            date: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Insert failed:", error.message);
        return;
    }

    console.log("✅ Transaction created:", data.id);

    // 2. Cleanup
    const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', data.id);

    if (deleteError) {
        console.error("⚠️ Cleanup failed:", deleteError.message);
    } else {
        console.log("✅ Cleanup successful");
    }
}

testTransaction();
