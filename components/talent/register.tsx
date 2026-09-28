'use client';
import { RegisterForm } from '@/components/auth/register-form';
/** Legacy entry shares neutral PAX signup; Talent is only a removable preference. */
export function TalentRegister() { return <RegisterForm initialService="talent" />; }
