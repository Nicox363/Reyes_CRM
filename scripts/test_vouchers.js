const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testVouchers() {
    console.log("🎟️ Testing Vouchers Schema...");

    // 1. Create a Voucher Definition
    const { data: def, error: defError } = await supabase
        .from('voucher_definitions')
        .insert({
            name: 'Bono Test 5 Sesiones',
            sessions: 5,
            price: 150.00
        })
        .select()
        .single();

    if (defError) {
        console.error("❌ Failed to create voucher definition:", defError.message);
        return;
    }
    console.log("✅ Voucher Definition Created:", def.id);

    // 2. Sell Voucher to a dummy client
    // Get a client first
    const { data: client } = await supabase.from('clients').select('id').limit(1).single();
    if (!client) {
        console.error("❌ No clients found to test with.");
        return;
    }

    const { data: voucher, error: voucherError } = await supabase
        .from('client_vouchers')
        .insert({
            client_id: client.id,
            definition_id: def.id,
            sessions_total: 5,
            sessions_remaining: 5,
            purchase_date: new Date().toISOString()
        })
        .select()
        .single();

    if (voucherError) {
        console.error("❌ Failed to sell voucher:", voucherError.message);
    } else {
        console.log("✅ Client Voucher Created:", voucher.id);
    }

    // Cleanup
    await supabase.from('client_vouchers').delete().eq('id', voucher?.id);
    await supabase.from('voucher_definitions').delete().eq('id', def.id);
    console.log("🧹 Cleanup done.");
}

testVouchers();
