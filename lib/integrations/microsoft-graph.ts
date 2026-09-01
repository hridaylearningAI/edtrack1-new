type GraphConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  organizerUserObjectId: string
}

function readGraphConfig(): GraphConfig {
  const tenantId = process.env.GRAPH_TENANT_ID?.trim()
  const clientId = process.env.GRAPH_CLIENT_ID?.trim()
  const clientSecret = process.env.GRAPH_CLIENT_SECRET?.trim()
  const organizerUserObjectId = process.env.GRAPH_ORGANIZER_USER_OBJECT_ID?.trim()

  const missing: string[] = []
  if (!tenantId) missing.push("GRAPH_TENANT_ID")
  if (!clientId) missing.push("GRAPH_CLIENT_ID")
  if (!clientSecret) missing.push("GRAPH_CLIENT_SECRET")
  if (!organizerUserObjectId) missing.push("GRAPH_ORGANIZER_USER_OBJECT_ID")

  if (missing.length > 0) {
    throw new Error(
      `Microsoft Graph is not fully configured. Missing or empty: ${missing.join(", ")}. ` +
        "Note: GRAPH_ORGANIZER_USER_OBJECT_ID is the Entra user Object ID (host account for meetings), not the app client secret."
    )
  }

  return { tenantId, clientId, clientSecret, organizerUserObjectId }
}

async function getGraphAccessToken(config: GraphConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
  })

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  const tokenJson = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenJson?.access_token) {
    const msg = tokenJson?.error_description || tokenJson?.error || "Failed to fetch Graph token"
    throw new Error(msg)
  }

  return String(tokenJson.access_token)
}

export async function createTeamsMeeting(params: {
  subject: string
  startDateTimeIso: string
  endDateTimeIso: string
}) {
  const config = readGraphConfig()
  const accessToken = await getGraphAccessToken(config)

  const graphRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.organizerUserObjectId)}/onlineMeetings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: params.subject,
        startDateTime: params.startDateTimeIso,
        endDateTime: params.endDateTimeIso,
      }),
    }
  )

  const graphJson = await graphRes.json().catch(() => ({}))
  if (!graphRes.ok) {
    const msg =
      graphJson?.error?.message || graphJson?.error_description || "Failed to create Teams meeting via Microsoft Graph"
    throw new Error(msg)
  }

  const joinWebUrl = graphJson?.joinWebUrl
  if (!joinWebUrl || typeof joinWebUrl !== "string") {
    throw new Error("Graph response missing joinWebUrl")
  }

  return {
    joinWebUrl,
    graphResponse: graphJson,
  }
}

