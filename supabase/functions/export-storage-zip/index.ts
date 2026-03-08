import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

async function listAllFiles(supabase: any, bucketId: string, path = ""): Promise<string[]> {
  const files: string[] = [];
  const { data, error } = await supabase.storage.from(bucketId).list(path, { limit: 1000 });
  if (error || !data) return files;

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
      const subFiles = await listAllFiles(supabase, bucketId, fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
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

    const zip = new JSZip();
    let totalFiles = 0;
    const errors: Record<string, string[]> = {};

    for (const bucketId of BUCKETS) {
      try {
        const files = await listAllFiles(supabase, bucketId);
        const folder = zip.folder(bucketId)!;

        for (const filePath of files) {
          try {
            const { data, error } = await supabase.storage.from(bucketId).download(filePath);
            if (error || !data) {
              if (!errors[bucketId]) errors[bucketId] = [];
              errors[bucketId].push(`${filePath}: ${error?.message || "no data"}`);
              continue;
            }
            const arrayBuffer = await data.arrayBuffer();
            folder.file(filePath, arrayBuffer);
            totalFiles++;
          } catch (e: any) {
            if (!errors[bucketId]) errors[bucketId] = [];
            errors[bucketId].push(`${filePath}: ${e.message}`);
          }
        }
      } catch (e: any) {
        errors[bucketId] = [`listing failed: ${e.message}`];
      }
    }

    if (totalFiles === 0) {
      return new Response(
        JSON.stringify({ message: "No files found in any bucket", errors }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zipBlob = await zip.generateAsync({ type: "uint8array" });
    const date = new Date().toISOString().split("T")[0];

    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="MABDC-Storage-Backup-${date}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Storage export error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
