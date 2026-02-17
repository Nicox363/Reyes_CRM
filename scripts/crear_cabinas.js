const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const cabins = [
    { name: 'Cabina 1' },
    { name: 'Cabina 2' },
    { name: 'Cabina 3' },
    { name: 'Cabina 4' }
];

async function seedCabins() {
    console.log("🏗️ Seeding Cabins...");

    // Check if exist
    const { count } = await supabase.from('cabins').select('*', { count: 'exact', head: true });

    if (count > 0) {
        console.log("ℹ️ Cabins already exist. Skipping.");
        return;
    }

    const { error } = await supabase.from('cabins').insert(cabins);

    if (error) {
        console.error("❌ Error seeding cabins:", error.message);
    } else {
        console.log("✅ 4 Cabins created successfully.");
    }
}

seedCabins();
