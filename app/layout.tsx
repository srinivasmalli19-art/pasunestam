import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  Public_Sans,
  Noto_Sans_Telugu,
  Noto_Serif,
} from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const heading = Bricolage_Grotesque({
  variable: '--font-heading',
  subsets: ['latin'],
});

const body = Public_Sans({
  variable: '--font-body',
  subsets: ['latin'],
});

const telugu = Noto_Sans_Telugu({
  variable: '--font-telugu',
  subsets: ['telugu'],
});

const certificate = Noto_Serif({
  variable: '--font-certificate',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Pasunestam | పశు నేస్తం',
  description: 'Certificates and monthly returns for veterinarians in Andhra Pradesh.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} ${telugu.variable} ${certificate.variable}`}
    >
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
