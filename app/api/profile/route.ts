export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        tier: true,
        paxId: true,
        organization: true,
        bio: true,
        headline: true,
        location: true,
        linkedinUrl: true,
        healthAreas: true,
        credibilityScore: true,
        practitionerProfile: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, consultationRate, specialty, hospital, bio, headline, location, linkedinUrl, healthAreas, organization } = body ?? {};

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (headline !== undefined) updateData.headline = headline;
    if (location !== undefined) updateData.location = location;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    if (healthAreas !== undefined) updateData.healthAreas = healthAreas;
    if (organization !== undefined) updateData.organization = organization;
    if (bio !== undefined) updateData.bio = bio;

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    if (session.user.role === 'PRACTITIONER' || session.user.role === 'ADMIN') {
      const profileData: any = {};
      if (consultationRate !== undefined) profileData.consultationRate = parseInt(consultationRate, 10);
      if (specialty) profileData.specialty = specialty;
      if (hospital !== undefined) profileData.hospital = hospital;
      if (bio !== undefined) profileData.bio = bio;

      if (Object.keys(profileData ?? {}).length > 0) {
        await prisma.practitionerProfile.updateMany({
          where: { userId: session.user.id },
          data: profileData,
        });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        tier: true,
        paxId: true,
        organization: true,
        bio: true,
        headline: true,
        location: true,
        linkedinUrl: true,
        healthAreas: true,
        credibilityScore: true,
        practitionerProfile: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}