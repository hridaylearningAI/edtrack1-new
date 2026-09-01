import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/auth"
import { getSupabaseClient, formatAuthError, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"

const COMMISSION_RATE = 0.1

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatAuthError(authResult.error || "Unauthorized", authResult.error_code || "UNAUTHORIZED"), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const email = authResult.user.email
    if (!email) {
      return NextResponse.json(formatResponse(false, null, "User email missing"), { status: 400, headers: corsHeaders })
    }

    const supabase = getSupabaseClient()
    const { data: partner } = await supabase.from("partners").select("id,status,name,partner_code").ilike("email", email).maybeSingle()

    const isAdmin = authResult.user.role === "admin"
    if (!isAdmin && (!partner || partner.status !== "Active")) {
      return NextResponse.json(formatResponse(false, null, "Partner access denied"), { status: 403, headers: corsHeaders })
    }

    const partnerId = partner?.id
    if (!partnerId) {
      return NextResponse.json(
        formatResponse(
          true,
          {
            commissionRate: COMMISSION_RATE,
            totalsByCurrency: {},
            totalCommissionByCurrency: {},
            grandTotalCommission: 0,
            purchases: [],
          },
          isAdmin ? "Link your partner profile to see commissions" : "No partner purchases yet"
        ),
        { headers: corsHeaders }
      )
    }

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select("id, purchase_number, total_amount, currency, completed_at, created_at")
      .eq("partner_id", partnerId)
      .order("completed_at", { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json(formatResponse(false, null, "Failed to fetch partner purchases"), { status: 500, headers: corsHeaders })
    }

    const rows = purchases || []
    const totalsByCurrency: Record<string, number> = {}
    const totalCommissionByCurrency: Record<string, number> = {}

    const mapped = rows.map((p: any) => {
      const amt = typeof p.total_amount === "string" ? parseFloat(p.total_amount) : Number(p.total_amount) || 0
      const cur = (p.currency || "AUD").toString().toUpperCase()
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + amt
      const commission = Math.round(amt * COMMISSION_RATE * 100) / 100
      totalCommissionByCurrency[cur] = (totalCommissionByCurrency[cur] || 0) + commission
      return {
        id: p.id,
        purchase_number: p.purchase_number,
        total_amount: amt,
        currency: cur,
        commission_amount: commission,
        completed_at: p.completed_at || p.created_at,
      }
    })

    // Single-currency common case: one number for display
    const currencies = Object.keys(totalCommissionByCurrency)
    let grandTotalCommission = 0
    if (currencies.length === 1) {
      grandTotalCommission = totalCommissionByCurrency[currencies[0]] || 0
    }

    return NextResponse.json(
      formatResponse(
        true,
        {
          partner: partner ? { id: partner.id, name: partner.name, partner_code: partner.partner_code } : null,
          commissionRate: COMMISSION_RATE,
          totalsByCurrency,
          totalCommissionByCurrency,
          grandTotalCommission,
          purchases: mapped,
        },
        "Partner commissions fetched successfully"
      ),
      { headers: corsHeaders }
    )
  } catch (err: any) {
    return NextResponse.json(formatResponse(false, null, err?.message || "Internal server error"), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 200, headers: corsHeaders })
}
