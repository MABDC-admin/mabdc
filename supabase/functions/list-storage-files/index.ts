import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUCKETS = [
  "employee-documents",
  "contract-documents",
  "company-documents",
  "leave-attachments",
];

async function listAllFiles(supabase: any, bucketId: string, path = ""): Promise<any[]> {
  const files: any[] = [];
  const { data, error } = await supabase.storage.from(bucketId).list(path, { limit: 1000 });
  if (error || !data) return files;

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
      const subFiles = await listAllFiles(supabase, bucketId, fullPath);
      files.push(...subFiles);
    } else {
      const { data: urlData } = supabase.storage.from(bucketId).getPublicUrl(fullPath);
      files.push({
        bucket: bucketId,
        path: fullPath,
        size: item.metadata?.size || null,
        mimetype: item.metadata?.mimetype || null,
        created_at: item.created_at,
        updated_at: item.updated_at,
        public_url: urlData?.publicUrl || null,
      });
    }
  }
  return files;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const allFiles: any[] = [];
    const bucketErrors: Record<string, string> = {};

    for (const bucketId of BUCKETS) {
      try {
        const files = await listAllFiles(supabase, bucketId);
        allFiles.push(...files);
      } catch (err: any) {
        bucketErrors[bucketId] = err.message;
      }
    }

    const result = {
      exported_at: new Date().toISOString(),
      total_files: allFiles.length,
      files_by_bucket: BUCKETS.reduce((acc, b) => {
        acc[b] = allFiles.filter(f => f.bucket === b).length;
        return acc;
      }, {} as Record<string, number>),
      files: allFiles,
      errors: Object.keys(bucketErrors).length > 0 ? bucketErrors : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Storage list error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
