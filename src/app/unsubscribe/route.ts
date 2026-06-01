import { NextRequest, NextResponse } from 'next/server'

import { unsubscribeUserFromEmails } from '@/lib/email-unsubscribe'

function renderPage(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: linear-gradient(135deg, #ecfeff 0%, #f8fafc 100%); color: #0f172a; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { width: min(560px, 100%); background: #ffffff; border: 1px solid #dbeafe; border-radius: 28px; padding: 32px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12); }
      h1 { margin: 0 0 12px; font-size: 32px; }
      p { margin: 0 0 16px; line-height: 1.7; color: #334155; }
      a { color: #0f766e; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>${title}</h1>
        <p>${body}</p>
        <p><a href="https://www.ducksat.com">Return to DuckSAT</a></p>
      </section>
    </main>
  </body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || ''
  const token = searchParams.get('token') || ''

  try {
    const result = await unsubscribeUserFromEmails(userId, token)

    if (result.status === 'unsubscribed') {
      return new NextResponse(
        renderPage('You are unsubscribed', `DuckSAT will stop sending campaign and automation emails to ${result.email}.`),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }

    if (result.status === 'already_unsubscribed') {
      return new NextResponse(
        renderPage('Already unsubscribed', `${result.email} is already removed from DuckSAT campaign and automation emails.`),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }

    return new NextResponse(
      renderPage('Invalid unsubscribe link', 'This unsubscribe link is invalid or has expired.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (error) {
    console.error('[GET /unsubscribe]', error)

    return new NextResponse(
      renderPage('Unable to unsubscribe', 'DuckSAT could not process this unsubscribe request right now.'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}