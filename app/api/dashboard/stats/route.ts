export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const isPractitioner = session.user.role === 'PRACTITIONER' || session.user.role === 'ADMIN';

    const whereClause = isPractitioner
      ? { practitionerId: userId }
      : { patientId: userId };

    const [todayAppointments, totalPatients, monthRevenue, pendingAppointments, recentAppointments] = await Promise.all([
      prisma.appointment.count({
        where: { ...whereClause, dateTime: { gte: startOfDay, lt: endOfDay } },
      }),
      isPractitioner
        ? prisma.appointment.findMany({
            where: { practitionerId: userId },
            select: { patientId: true },
            distinct: ['patientId'],
          }).then((r: any) => r?.length ?? 0)
        : 0,
      prisma.appointment.aggregate({
        where: {
          ...whereClause,
          status: 'COMPLETED',
          dateTime: { gte: startOfMonth, lt: endOfMonth },
        },
        _sum: { fee: true },
      }).then((r: any) => r?._sum?.fee ?? 0),
      prisma.appointment.count({
        where: { ...whereClause, status: 'SCHEDULED' },
      }),
      prisma.appointment.findMany({
        where: whereClause,
        orderBy: { dateTime: 'desc' },
        take: 5,
        include: {
          patient: { select: { name: true } },
          practitioner: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        todayAppointments,
        totalPatients,
        monthRevenue,
        pendingAppointments,
      },
      recentAppointments,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
