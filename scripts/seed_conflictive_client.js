const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedConflictiveClient() {
    console.log("🚩 Seeding Duplicate/Conflictive Client...");

    // 1. Create a client with is_conflictive = true
    const { data: client, error } = await supabase
        .from('clients')
        .insert({
            full_name: "Cliente Conflictivo Test",
            phone: "+34 666 666 666",
            email: "bad@client.com",
            is_conflictive: true,
            notes: "ESTE CLIENTE ES PROBLEMÁTICO. NO DAR CITA."
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to create conflictive client:", error.message);
    } else {
        console.log(`✅ Created Conflictive Client: ${client.full_name} (${client.id})`);
    }
}

seedConflictiveClient();
