
export const metadata = {
  title: "AI Lab – Day Zero",
  description: "Pokémon-style single-room AI lab sim"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflow: "hidden", background: "#070a14" }}>
        {children}
      </body>
    </html>
  );
}
