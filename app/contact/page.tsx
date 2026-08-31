import type { Metadata } from 'next';
import { MarketingShell, PageHero } from '@/components/marketing/marketing-shell';
import { ContactForm } from '@/components/contact/contact-form';
import { Mail, MapPin, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact PAX | Praxis Exchange',
  description: 'Get in touch with the Praxis Exchange (PAX) team. Questions, partnerships, or press — we’d love to hear from you.',
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Contact Us"
        title={<>Let&apos;s <em className="text-[#1F7A74] font-light">talk</em></>}
        subtitle="Whether you’re an innovator, practitioner, institution or investor — or just curious about PAX — we’d love to hear from you."
      />
      <section className="px-6 md:px-12 pb-20">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          <div className="space-y-4">
            <div className="bg-[#FFFFFF] border border-black/5 rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1F7A74]/15 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-[#15908A]" />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#1A2332] mb-1">Email</div>
                <a href="mailto:praxis@thepraxisexchange.com" className="text-[13px] text-[#15908A] no-underline hover:underline">praxis@thepraxisexchange.com</a>
              </div>
            </div>
            <div className="bg-[#FFFFFF] border border-black/5 rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#B26F09]/15 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-[#B26F09]" />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#1A2332] mb-1">Based in</div>
                <div className="text-[13px] text-gray-600">Nairobi, Kenya — serving public health worldwide</div>
              </div>
            </div>
            <div className="bg-[#FFFFFF] border border-black/5 rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#6A5CBF]/15 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-[#6A5CBF]" />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#1A2332] mb-1">Response time</div>
                <div className="text-[13px] text-gray-600">We typically respond within 1–2 business days.</div>
              </div>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </MarketingShell>
  );
}
