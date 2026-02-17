const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Duplicates with details from previous step
const duplicates = [
    { name: 'Alejandra', ids: [{ id: '59795e1c-5ea2-4a7b-a010-91a5e1ac9047', date: '2026-02-09' }, { id: 'c7e2dcd7-2917-48f0-bfff-e613f9f38fbf', date: '2026-02-07' }] },
    { name: 'Elvira', ids: [{ id: '8f0662ed-a7c0-47a7-864b-9a610e7d6b93', date: '2026-02-09' }, { id: 'a8a9b41c-50e0-4e7f-bc6c-6f1a57126042', date: '2026-02-07' }] },
    { name: 'J Motezuma', ids: [{ id: '0961f5ad-28c6-49f3-88e8-96d81bf6ed93', date: '2026-02-09' }, { id: '417d9815-b841-48b9-9b37-38a2d35f1f7f', date: '2026-02-07' }] },
    { name: 'Yessica', ids: [{ id: 'b1f61aaa-b7bd-45f8-86b3-a02b63aced19', date: '2026-02-09' }, { id: '6bef88cb-599e-445d-9ccb-a2d53fbad309', date: '2026-02-07' }] },
    { name: 'Yorka', ids: [{ id: 'fe4f1261-8b9d-4544-8eb5-a4118a89a28f', date: '2026-02-09' }, { id: '6a743e6e-28e2-4876-8339-3a7e989222b8', date: '2026-02-07' }] }
];

async function planDeduplication() {
    const finalPlan = [];

    for (const group of duplicates) {
        let candidates = [];
        for (const item of group.ids) {
            const { count: apps } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('staff_id', item.id);
            const { count: trans } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('created_by', item.id);
            const { count: exps } = await supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('created_by', item.id);
            const { count: scheds } = await supabase.from('staff_schedules').select('*', { count: 'exact', head: true }).eq('staff_id', item.id);

            candidates.push({ ...item, total: (apps || 0) + (trans || 0) + (exps || 0) + (scheds || 0) });
        }

        // sort candidates: more data first, then newer date
        candidates.sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total; // Use one with most data
            return b.date.localeCompare(a.date); // Use newer one
        });

        const keep = candidates[0];
        const drop = candidates.slice(1);

        finalPlan.push({ name: group.name, keep, drop });
    }

    console.log(JSON.stringify(finalPlan, null, 2));
}

planDeduplication();
