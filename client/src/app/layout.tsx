import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = { title: "StudioSpace — Creative spaces, shared", description: "Discover and book inspiring photography, film, podcast, music and art spaces." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>}
