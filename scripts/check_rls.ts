
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log("🔍 Checking RLS Policies for 'championships'...");

    const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'championships');

    // Note: accessing pg_policies via standard client might be blocked unless configured.
    // If this fails, we might need a stored procedure or just assume we need to fix it.

    if (error) {
        console.error("❌ Error fetching policies (Expected if no access to system catalogs):", error.message);

        // Alternative: Try to perform an update as an ANON user and see if it fails differently
        console.log("⚠️ Cannot read pg_policies directly. Attempting to deduce permissions via dry-run...");
        return;
    }

    if (!policies || policies.length === 0) {
        console.log("⚠️ No policies found for 'championships' (or table not found in public schema).");
        return;
    }

    console.table(policies.map(p => ({
        name: p.policyname,
        cmd: p.cmd,
        roles: p.roles,
        qual: p.qual,
        with_check: p.with_check
    })));
}

checkPolicies();
