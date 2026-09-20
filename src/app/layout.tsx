import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--fonte-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--fonte-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = DM_Mono({
  subsets: ["latin"],
  variable: "--fonte-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Representei — o talão digital do representante",
    template: "%s · Representei",
  },
  description:
    "Agenda, roteirizador com custo de combustível, carteira de clientes, pedidos e controle de comissão a receber. Feito para quem vive na estrada.",
  manifest: "/manifest.webmanifest",
  applicationName: "Representei",
  appleWebApp: {
    capable: true,
    title: "Representei",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icone.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icone-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1ebdf" },
    { media: "(prefers-color-scheme: dark)", color: "#131419" },
  ],
};

/** Aplica o tema antes da primeira pintura, para nao piscar branco. */
const scriptTema = `
(function(){
  try {
    var salvo = localStorage.getItem('representei-tema') || 'auto';
    var escuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var tema = salvo === 'auto' ? (escuro ? 'estrada' : 'papel') : salvo;
    document.documentElement.setAttribute('data-theme', tema);
    document.documentElement.style.colorScheme = tema === 'estrada' ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'papel');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="papel" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} grao antialiased`}>
        {children}
      </body>
    </html>
  );
}
