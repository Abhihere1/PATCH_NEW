import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password } = body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.create({ username: username.trim(), email: email.toLowerCase(), password: hashed });

    return NextResponse.json({ message: "Account created successfully." }, { status: 201 });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
