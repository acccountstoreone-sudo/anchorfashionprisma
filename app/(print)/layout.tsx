import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Print Document",
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white text-black antialiased print:bg-white print:m-0 print:p-0 min-h-screen">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
          }
          @media print {
            html, body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            ::-webkit-scrollbar { display: none; }
          }
        `,
        }}
      />
      {children}
    </div>
  );
}
