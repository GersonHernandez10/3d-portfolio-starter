import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { name, subject, message } = await req.json()

    const trimmedName = (name || '').trim()
    const trimmedMsg  = (message || '').trim()
    if (!trimmedName) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    if (!trimmedMsg)  return NextResponse.json({ error: 'Message is required.' }, { status: 400 })

    const subj = (subject || '').trim() || `New message from ${trimmedName}`
    const toEmail = process.env.TO_EMAIL || 'gersonhernandez950@gmail.com'

    // SMTP transport — set these in your .env.local
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: !!(process.env.SMTP_SECURE === 'true'), // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const now = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    const textBody = [
      `You received a new message from your portfolio:`,
      ``,
      `Name: ${trimmedName}`,
      `Subject: ${subj}`,
      `Time: ${now} (America/New_York)`,
      ``,
      `Message:`,
      trimmedMsg,
      ``,
      `---`,
      `Sender IP (approx): ${req.headers.get('x-forwarded-for') || 'unknown'}`,
      `UA: ${req.headers.get('user-agent') || 'unknown'}`,
    ].join('\n')

    await transporter.sendMail({
      from: `"Portfolio Mailer" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: toEmail,
      subject: subj,
      text: textBody,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('API /api/message error:', err)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }
}
