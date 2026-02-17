const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const duplicates = [
    { name: 'Alejandra', ids: ['59795e1c-5ea2-4a7b-a010-91a5e1ac9047', 'c7e2dcd7-2917-48f0-bfff-e613f9f38fbf'] },
    { name: 'Elvira', ids: ['8f0662ed-a7c0-47a7-864b-9a610e7d6b93', 'a8a9b41c-50e0-4e7f-bc6c-6f1a57126042'] },
    { name: 'J Motezuma', ids: ['0961f5ad-28c6-49f3-88e8-96d81bf6ed93', '417d9815-b841-48b9-9b37-38a2d35f1f7f'] },
    { name: 'Yessica', ids: ['b1f61aaa-b7bd-45f8-86b3-a02b63aced19', '6bef88cb-599e-445d-9ccb-a2d53fbad309'] },
    { name: 'Yorka', ids: ['fe4f1261-8b9d-4544-8eb5-a4118a89a28f', '6a743e6e-28e2-4876-8339-3a7e989222b8'] }
];

async function checkAndSuggestDelete() {
    const toDelete = [];

    for (const group of duplicates) {
        console.log(`Analyzing ${group.name}...`);
        for (const id of group.ids) {
            const { count: apps } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('staff_id', id);
            const { count: trans } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('created_by', id);
            const { count: exps } = await supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('created_by', id);
            const { count: scheds } = await supabase.from('staff_schedules').select('*', { count: 'exact', head: true }).eq('staff_id', id);

            const total = (apps || 0) + (trans || 0) + (exps || 0) + (scheds || 0);
            console.log(`  ID: ${id} -> Total Records: ${total}`);

            if (total === 0) {
                toDelete.push(id);
            }
        }
    }

    console.log('\n--- CANDIDATES FOR DELETION ---');
    console.log(JSON.stringify(toDelete, null, 2));
}

checkAndSuggestDelete();
