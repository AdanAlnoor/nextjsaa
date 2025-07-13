import Footer from "@/shared/components/layouts/footer";
import Navbar from "@/shared/components/layouts/navbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />

      <main className="container p-4 sm:p-6 flex-1">{children}</main>

      <Footer />
    </>
  );
}
