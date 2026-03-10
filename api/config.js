// Config lives in the browser (localStorage).
// This endpoint only returns environment-variable defaults on GET
// and echoes back the payload on PUT so legacy callers don't break.
export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      config: {
        token: process.env.CF_TOKEN || "",
        destinationEmail: process.env.CF_DESTINATION || "",
        defaultPrefix: process.env.CF_DEFAULT_PREFIX || "",
        defaultCount: Number(process.env.CF_DEFAULT_COUNT || 5),
        defaultStart: Number(process.env.CF_DEFAULT_START || 1),
        delayMs: Number(process.env.CF_DELAY_MS || 0),
        selectedZoneIds: [],
      },
    });
  }
  if (req.method === "PUT") {
    return res.status(200).json({ ok: true, config: req.body || {} });
  }
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
