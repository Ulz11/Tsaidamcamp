import { NextResponse } from 'next/server';

let userPreferences = {
  primaryColor: '#D97757',
  fontSize: 16,
  density: 'regular',
  dark: false,
};

export async function GET() {
  return NextResponse.json(userPreferences);
}

export async function POST(request) {
  const newPreferences = await request.json();
  userPreferences = { ...userPreferences, ...newPreferences };
  return NextResponse.json({ success: true });
}