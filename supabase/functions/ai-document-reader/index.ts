import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedData {
  documentType: string;
  name: string;
  nameArabic?: string;
  documentNumber: string;
  expiryDate?: string;
  issueDate?: string;
  nationality?: string;
  dateOfBirth?: string;
  placeOfIssue?: string;
  jobTitle?: string;
  jobTitleArabic?: string;
  company?: string;
  sponsor?: string;
  policyNumber?: string;
  insuranceCompany?: string;
  contractType?: string;
  basicSalary?: number;
  housingAllowance?: number;
  transportationAllowance?: number;
  totalSalary?: number;
  mohreContractNo?: string;
  startDate?: string;
  endDate?: string;
  workLocation?: string;
  workingHours?: number;
  probationPeriod?: number;
  noticePeriod?: number;
  annualLeaveDays?: number;
  additionalInfo?: Record<string, string>;
}

interface MatchedEmployee {
  id: string;
  full_name: string;
  hrms_no: string;
  department: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileType, fileName, additionalImages } = await req.json();

    if (!fileBase64) {
      throw new Error("No file provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine media type for the AI request
    let mediaType = "image/jpeg";
    if (fileType?.includes("pdf")) {
      mediaType = "application/pdf";
    } else if (fileType?.includes("png")) {
      mediaType = "image/png";
    } else if (fileType?.includes("heic")) {
      mediaType = "image/heic";
    }

    // Check if we have additional pages (for multi-page documents)
    const hasAdditionalPages = Array.isArray(additionalImages) && additionalImages.length > 0;
    console.log(`Processing document with ${hasAdditionalPages ? additionalImages.length + 1 : 1} page(s)`);

    // AI prompt for document analysis - enhanced for multi-page support
    const systemPrompt = `You are an expert document analyzer specializing in UAE employment documents. 
Analyze the provided document image(s) and extract all relevant information.

IMPORTANT FOR MULTI-PAGE DOCUMENTS: 
- Employment contracts often have salary details (Basic Salary, Housing Allowance, Transportation Allowance, Total Salary) on PAGE 2.
- If multiple pages/images are provided, examine ALL pages to extract complete information.
- Page 1 typically contains: Employee name, Contract number, Job title, Start/End dates, Work location
- Page 2 typically contains: Salary breakdown, Working hours, Leave days, Probation period, Notice period

You must identify the document type from these categories:
- Passport
- Emirates ID
- Visa (UAE Residence Visa / Residency Permit - treat ALL residence/residency documents as "Visa" type)
- Work Permit
- Labor Card
- Medical Insurance
- Employment Contract
- ILOE (Immigration Letter of Employment)
- Trade License
- Other

Extract the following information based on document type:

For ALL documents:
- Document Type
- Full Name (English)
- Full Name (Arabic if visible)
- Document/Reference Number
- Expiry Date (format: YYYY-MM-DD)
- Issue Date (format: YYYY-MM-DD, if visible)

For Passport:
- Passport Number
- Nationality
- Date of Birth (format: YYYY-MM-DD)
- Place of Issue

For Emirates ID:
- Emirates ID Number (format: XXX-XXXX-XXXXXXX-X)
- Nationality

For Visa:
- Visa Number
- Sponsor Name
- Entry Permit Number

For Work Permit / Labor Card:
- Permit/Card Number
- Job Title
- Company Name

For Medical Insurance:
- Policy Number
- Insurance Company Name

For Employment Contract (CHECK ALL PAGES FOR COMPLETE DATA):
- MOHRE Contract Number
- Contract Type (Limited/Unlimited)
- Job Title (English)
- Job Title (Arabic)
- Basic Salary (number only - OFTEN ON PAGE 2)
- Housing Allowance (number only - OFTEN ON PAGE 2)
- Transportation Allowance (number only - OFTEN ON PAGE 2)
- Total Salary (number only - OFTEN ON PAGE 2)
- Start Date
- End Date
- Work Location
- Working Hours per day (OFTEN ON PAGE 2)
- Probation Period (in months - OFTEN ON PAGE 2)
- Notice Period (in days - OFTEN ON PAGE 2)
- Annual Leave Days (OFTEN ON PAGE 2)

Respond ONLY with a valid JSON object in this exact format:
{
  "documentType": "string",
  "name": "string",
  "nameArabic": "string or null",
  "documentNumber": "string",
  "expiryDate": "YYYY-MM-DD or null",
  "issueDate": "YYYY-MM-DD or null",
  "nationality": "string or null",
  "dateOfBirth": "YYYY-MM-DD or null",
  "placeOfIssue": "string or null",
  "jobTitle": "string or null",
  "jobTitleArabic": "string or null",
  "company": "string or null",
  "sponsor": "string or null",
  "policyNumber": "string or null",
  "insuranceCompany": "string or null",
  "contractType": "Limited or Unlimited or null",
  "basicSalary": "number or null",
  "housingAllowance": "number or null",
  "transportationAllowance": "number or null",
  "totalSalary": "number or null",
  "mohreContractNo": "string or null",
  "startDate": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "workLocation": "string or null",
  "workingHours": "number or null",
  "probationPeriod": "number or null",
  "noticePeriod": "number or null",
  "annualLeaveDays": "number or null",
  "additionalInfo": {}
}`;

    console.log("Sending document to AI for analysis...");

    // Build user content with all pages
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: "text",
        text: hasAdditionalPages 
          ? `Please analyze this ${fileName || "document"} (${additionalImages.length + 1} pages provided). Extract all information from ALL pages. For contracts, salary details are typically on page 2.`
          : `Please analyze this ${fileName || "document"} and extract all the information.`,
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mediaType};base64,${fileBase64}`,
        },
      },
    ];

    // Add additional pages if provided
    if (hasAdditionalPages) {
      additionalImages.forEach((imgBase64: string, idx: number) => {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imgBase64}`,
          },
        });
        console.log(`Added page ${idx + 2} to AI request`);
      });
    }

    // Call Lovable AI Gateway with vision capabilities
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No response from AI");
    }

    console.log("AI Response:", aiContent);

    // Parse the JSON response from AI
    let extractedData: ExtractedData;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiContent];
      const jsonStr = jsonMatch[1]?.trim() || aiContent.trim();
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse document data. Please try again.");
    }

    // Fetch all employees for name matching
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, hrms_no, department")
      .eq("status", "Active");

    if (empError) {
      console.error("Error fetching employees:", empError);
      throw new Error("Failed to fetch employees for matching");
    }

    // Name matching algorithm
    const matchedEmployees: MatchedEmployee[] = [];
    const extractedName = extractedData.name?.toLowerCase().trim() || "";
    const extractedNameArabic = extractedData.nameArabic?.trim() || "";

    for (const emp of employees || []) {
      const empName = emp.full_name?.toLowerCase().trim() || "";
      let confidence = 0;

      // Exact match
      if (empName === extractedName) {
        confidence = 100;
      }
      // Normalized match (remove extra spaces)
      else if (empName.replace(/\s+/g, " ") === extractedName.replace(/\s+/g, " ")) {
        confidence = 95;
      }
      // Partial match - check if all parts of one name exist in the other
      else {
        const empParts = empName.split(/\s+/).filter(Boolean);
        const extractedParts = extractedName.split(/\s+/).filter(Boolean);
        
        const matchingParts = empParts.filter((part: string) => 
          extractedParts.some((ep: string) => ep.includes(part) || part.includes(ep))
        );
        
        if (matchingParts.length > 0) {
          confidence = Math.round((matchingParts.length / Math.max(empParts.length, extractedParts.length)) * 85);
        }
      }

      // Fuzzy match using Levenshtein-like comparison
      if (confidence < 50) {
        const similarity = calculateSimilarity(empName, extractedName);
        if (similarity > 0.6) {
          confidence = Math.max(confidence, Math.round(similarity * 75));
        }
      }

      if (confidence > 30) {
        matchedEmployees.push({
          id: emp.id,
          full_name: emp.full_name,
          hrms_no: emp.hrms_no,
          department: emp.department,
          confidence,
        });
      }
    }

    // Sort by confidence and take top 5
    matchedEmployees.sort((a, b) => b.confidence - a.confidence);
    const topMatches = matchedEmployees.slice(0, 5);

    console.log("Top matches:", topMatches);

    return new Response(
      JSON.stringify({
        success: true,
        extractedData,
        matchedEmployee: topMatches[0] || null,
        alternativeMatches: topMatches.slice(1),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-document-reader:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Simple string similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];
  
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}
