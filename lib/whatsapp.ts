// Central WhatsApp contact config for PAX.
// Number is stored without '+' or spaces for wa.me links.
export const WHATSAPP_NUMBER = '254100581707';
export const WHATSAPP_DISPLAY = '+254 100 581707';

export function waLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Pre-filled messages for different entry points
export const WA_MESSAGES = {
  general: 'Hi PAX! I would like to know more about the Praxis Exchange.',
  join: 'Hi PAX! I would like to join the Praxis Exchange.',
  practitioner: 'Hi PAX! I am a health practitioner and would like to join the Practitioners Hub.',
  innovator: 'Hi PAX! I am an innovator and would like to list my health innovation.',
  investor: 'Hi PAX! I am an investor interested in health innovation opportunities.',
  support: 'Hi PAX! I need some help with the platform.',
};
