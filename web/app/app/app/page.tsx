import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppHome() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 -z-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-gradient-to-br from-pink-500/20 via-fuchsia-500/15 to-rose-400/10 blur-3xl animate-helios-blob"
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-md bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-600 shadow-lg shadow-pink-500/30"
            aria-hidden
          />
          <span className="text-base font-semibold tracking-tight">Helios</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">Back home</Link>
        </Button>
      </header>

      <main className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 pt-8 pb-20">
        <Card className="w-full border-border shadow-xl shadow-pink-500/5">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-2xl tracking-tight">Welcome to Helios</CardTitle>
            <CardDescription>
              Set up a passkey-backed smart account, or sign in to one already registered on this
              device.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/30 hover:from-pink-500 hover:via-rose-600 hover:to-fuchsia-700"
            >
              <Link href="/app/onboard">
                Set up your wallet
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/app/onboard">Sign in with existing passkey</Link>
            </Button>
          </CardContent>
          <CardFooter className="justify-center">
            <a
              href="https://github.com/heliosproto/heliosproto"
              className="text-xs text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
            >
              Source on GitHub
            </a>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
