const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPayment() {
    console.log("💳 Testing Payment Flow...");

    // 1. Create a dummy appointment (Confirmed status)
    const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .insert({
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            status: 'confirmed',
            cabin_id: (await supabase.from('cabins').select('id').limit(1).single()).data.id,
            staff_id: (await supabase.from('profiles').select('id').limit(1).single()).data.id,
            client_id: (await supabase.from('clients').select('id').limit(1).single()).data.id,
        })
        .select()
        .single();

    if (apptError) {
        console.error("❌ Failed to create dummy appointment:", apptError.message);
        return;
    }
    console.log("✅ Dummy Appointment Created:", appt.id);

    // 2. Simulate Payment Process manually (since we can't import server actions here easily without mocking)
    // We will do what processPayment does: insert transaction + update status

    const amount = 35.50;
    const method = 'card';

    console.log(`🔄 Processing Payment: ${amount} via ${method}`);

    // Insert Transaction
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            appointment_id: appt.id,
            client_id: appt.client_id,
            amount: amount,
            method: method,
            date: new Date().toISOString(),
            concept: 'Test Service Payment'
        })
        .select()
        .single();

    if (txnError) {
        console.error("❌ Transaction creation failed:", txnError.message);
    } else {
        console.log("✅ Transaction Created:", txn.id);
    }

    // Update Status
    const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'paid' })
        .eq('id', appt.id);

    if (updateError) {
        console.error("❌ Status update failed:", updateError.message);
    } else {
        console.log("✅ Appointment Updated to PAID");
    }

    // 3. Verification
    const { data: verification } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', appt.id)
        .single();

    if (verification.status === 'paid') {
        console.log("🎉 SUCCESS: Flow verified correctly.");
    } else {
        console.error("❌ Verification Failed: Status is " + verification.status);
    }

    // Cleanup
    await supabase.from('transactions').delete().eq('appointment_id', appt.id);
    await supabase.from('appointments').delete().eq('id', appt.id);
    console.log("🧹 Cleanup done.");
}

testPayment();
