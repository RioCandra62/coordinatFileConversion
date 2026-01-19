import Navbar from "@/app/components/navbar";
import "./globals.css";
import Footer from "@/app/components/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
      <div className="flex flex-col h-screen justify-between">
        <Navbar />
        <main className="flex-1">
        {children}
        </main>
        <Footer />
      </div>
      </body>
    </html>
  );
}
