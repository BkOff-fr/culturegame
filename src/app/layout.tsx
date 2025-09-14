import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { GameProvider } from "@/context/GameContext";

export const metadata: Metadata = {
  title: "CultureGame - Jeu de Culture Multijoueur",
  description: "Une application de jeu de culture moderne et minimaliste avec de nombreuses fonctionnalités multijoueurs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthProvider>
          <GameProvider>
            <SocketProvider>
              {children}
            </SocketProvider>
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
